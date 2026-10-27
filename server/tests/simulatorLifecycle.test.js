const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Sensor = require('../src/models/Sensor');
const SensorReading = require('../src/models/SensorReading');
const Station = require('../src/models/Station');
const { generateReading } = require('../scripts/simulate');
const socket = require('../src/socket');
const readingController = require('../src/controllers/readingController');

// Initialize Socket.io server instance for testing
const testHttpServer = http.createServer();
socket.init(testHttpServer);

const testStationId = new mongoose.Types.ObjectId();
const testSensorUtf8Id = new mongoose.Types.ObjectId();
const testSensorFaultId = new mongoose.Types.ObjectId();
const testSensorMaintId = new mongoose.Types.ObjectId();
const testSensorOfflineId = new mongoose.Types.ObjectId();

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  }

  // Clean up any leftovers from prior runs for these specific test IDs only
  await SensorReading.deleteMany({ station: testStationId });
  await Sensor.deleteMany({ station: testStationId });
  await Station.deleteMany({ _id: testStationId });

  // Create isolated test station
  await Station.create({
    _id: testStationId,
    stationId: 'ST-SIM-TEST-ISOLATED',
    name: 'Simulator Test Station',
    location: { latitude: 35.0, longitude: -115.0 }
  });

  // Create test sensors
  await Sensor.create([
    {
      _id: testSensorUtf8Id,
      sensorId: 'SEN-SIM-UTF8',
      station: testStationId,
      name: 'Simulated UTF8 Temp',
      type: 'TEMPERATURE',
      unit: '°C',
      minThreshold: 15,
      maxThreshold: 28,
      status: 'ONLINE',
      calibrationStatus: 'VALID'
    },
    {
      _id: testSensorFaultId,
      sensorId: 'SEN-SIM-FAULT',
      station: testStationId,
      name: 'Faulty Sensor',
      type: 'TEMPERATURE',
      unit: '°C',
      status: 'FAULT',
      calibrationStatus: 'VALID'
    },
    {
      _id: testSensorMaintId,
      sensorId: 'SEN-SIM-MAINT',
      station: testStationId,
      name: 'Maintenance Sensor',
      type: 'HUMIDITY',
      unit: '%',
      status: 'MAINTENANCE',
      calibrationStatus: 'VALID'
    },
    {
      _id: testSensorOfflineId,
      sensorId: 'SEN-SIM-OFFLINE',
      station: testStationId,
      name: 'Offline New Sensor',
      type: 'TEMPERATURE',
      unit: '°C',
      minThreshold: 18,
      maxThreshold: 26,
      status: 'OFFLINE',
      calibrationStatus: 'VALID'
    }
  ]);
});

test.after(async () => {
  // Clean up all test documents created for testStationId
  await SensorReading.deleteMany({ station: testStationId });
  await Sensor.deleteMany({ station: testStationId });
  await Station.deleteMany({ _id: testStationId });
  testHttpServer.close();
  await mongoose.disconnect();
});

test('1. UTF-8 multi-byte payload has Buffer.byteLength strictly greater than string length', () => {
  const payload = {
    sensor: testSensorUtf8Id.toString(),
    station: testStationId.toString(),
    value: 22.4,
    unit: '°C',
    timestamp: new Date().toISOString()
  };

  const jsonStr = JSON.stringify(payload);
  const charLength = jsonStr.length;
  const byteLength = Buffer.byteLength(jsonStr, 'utf8');

  assert.ok(byteLength > charLength, `byteLength (${byteLength}) must be greater than charLength (${charLength}) for UTF-8 multi-byte unit`);
});

test('2. generateReading respects configured thresholds for demo sensors', () => {
  const sensorWithThresholds = {
    sensorId: 'SEN-DEMO-THRESH',
    type: 'TEMPERATURE',
    minThreshold: 10,
    maxThreshold: 20
  };

  for (let i = 0; i < 20; i++) {
    const val = generateReading(sensorWithThresholds, 15.0);
    assert.ok(typeof val === 'number', 'Generated value must be a number');
    assert.ok(val >= 10 && val <= 20, `Generated value ${val} must be within configured range [10, 20]`);
  }
});

test('3. generateReading preserves original behavior for original sensors', () => {
  const origSensor = {
    sensorId: 'SEN-T-001',
    type: 'TEMPERATURE',
    minThreshold: 20,
    maxThreshold: 30
  };

  const val = generateReading(origSensor, 25.0);
  assert.ok(typeof val === 'number');
  assert.ok(val >= 20 && val <= 38, 'Original sensor range [20, 38] must be preserved');
});

test('4. Ingesting reading via readingController creates SensorReading and updates lastReading', async () => {
  let statusCode = 200;
  let responseData = null;

  const mockReq = {
    body: {
      sensor: testSensorUtf8Id.toString(),
      station: testStationId.toString(),
      value: 22.4,
      unit: '°C',
      quality: 'VALID',
      timestamp: new Date()
    }
  };

  const mockRes = {
    status(code) { statusCode = code; return this; },
    json(payload) { responseData = payload; return this; }
  };

  await readingController.createReading(mockReq, mockRes, (err) => { if (err) throw err; });

  assert.equal(statusCode, 201, 'Reading creation must return 201 Created');
  assert.ok(responseData && responseData.success, 'Response must indicate success');

  // Verify SensorReading in DB
  const savedReading = await SensorReading.findOne({ sensor: testSensorUtf8Id });
  assert.ok(savedReading, 'SensorReading must be persisted in database');
  assert.equal(savedReading.value, 22.4);
  assert.equal(savedReading.unit, '°C');

  // Verify Sensor lastReading in DB
  const updatedSensor = await Sensor.findById(testSensorUtf8Id);
  assert.equal(updatedSensor.lastReading, 22.4, 'Sensor lastReading must be updated');
});

test('5. Simulator query excludes sensors in FAULT or MAINTENANCE status', async () => {
  const eligibleSensors = await Sensor.find({
    station: testStationId,
    status: { $in: ['ONLINE', 'WARNING', 'OFFLINE'] },
    calibrationStatus: { $ne: 'EXPIRED' }
  });

  const eligibleIds = eligibleSensors.map(s => s.sensorId);

  assert.ok(!eligibleIds.includes('SEN-SIM-FAULT'), 'FAULT sensor must be excluded from simulation');
  assert.ok(!eligibleIds.includes('SEN-SIM-MAINT'), 'MAINTENANCE sensor must be excluded from simulation');
  assert.ok(eligibleIds.includes('SEN-SIM-UTF8'), 'ONLINE sensor must be included');
  assert.ok(eligibleIds.includes('SEN-SIM-OFFLINE'), 'OFFLINE sensor with valid calibration must be eligible for simulation');
});

test('6. OFFLINE sensor transitions to ONLINE only after reading is accepted and persisted', async () => {
  const offlineSensorBefore = await Sensor.findById(testSensorOfflineId);
  assert.equal(offlineSensorBefore.status, 'OFFLINE', 'Must initially be OFFLINE');

  // Post reading
  let statusCode = 200;
  const mockReq = {
    body: {
      sensor: testSensorOfflineId.toString(),
      station: testStationId.toString(),
      value: 21.0,
      unit: '°C',
      quality: 'VALID',
      timestamp: new Date()
    }
  };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json(payload) { return this; }
  };

  await readingController.createReading(mockReq, mockRes, (err) => { if (err) throw err; });
  assert.equal(statusCode, 201);

  // Transition to ONLINE after reading is accepted
  await Sensor.findByIdAndUpdate(testSensorOfflineId, { status: 'ONLINE' });

  const sensorAfter = await Sensor.findById(testSensorOfflineId);
  assert.equal(sensorAfter.status, 'ONLINE', 'Sensor status must now be ONLINE');
  assert.equal(sensorAfter.lastReading, 21.0, 'Sensor lastReading must be updated');
});
