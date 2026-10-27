const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Alert = require('../src/models/Alert');
const SensorReading = require('../src/models/SensorReading');
const Station = require('../src/models/Station');
const Sensor = require('../src/models/Sensor');
const alertService = require('../src/services/alertService');
const alertController = require('../src/controllers/alertController');
const http = require('http');
const socket = require('../src/socket');

// Initialize Socket.io server instance for testing
const testHttpServer = http.createServer();
socket.init(testHttpServer);

// Use isolated test ObjectIds so existing database documents are never touched or modified
const testStationId = new mongoose.Types.ObjectId();
const testSensorMaxId = new mongoose.Types.ObjectId();
const testSensorMinId = new mongoose.Types.ObjectId();
const testSensorAckId = new mongoose.Types.ObjectId();
const testSensorManualId = new mongoose.Types.ObjectId();

const sensorWithMax = {
  _id: testSensorMaxId,
  station: testStationId,
  type: 'TEMPERATURE',
  minThreshold: 20,
  maxThreshold: 37
};

const sensorWithMin = {
  _id: testSensorMinId,
  station: testStationId,
  type: 'TEMPERATURE',
  minThreshold: 20,
  maxThreshold: 37
};

const sensorForAck = {
  _id: testSensorAckId,
  station: testStationId,
  type: 'TEMPERATURE',
  minThreshold: 20,
  maxThreshold: 37
};

const sensorForManual = {
  _id: testSensorManualId,
  station: testStationId,
  type: 'TEMPERATURE',
  minThreshold: 20,
  maxThreshold: 37
};

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  }
  // Ensure breach state is reset before test suite
  alertService._resetBreachState();
  // Clean up any leftovers from prior runs for these specific test IDs only
  await Alert.deleteMany({ station: testStationId });
  await SensorReading.deleteMany({ station: testStationId });
  await Sensor.deleteMany({ station: testStationId });
  await Station.deleteMany({ _id: testStationId });

  // Create isolated test station and sensor documents for populate support
  await Station.create({
    _id: testStationId,
    stationId: 'ST-TEST-ISOLATED',
    name: 'Isolated Test Station',
    location: { latitude: 34.05, longitude: -118.24 }
  });

  await Sensor.create([
    { _id: testSensorMaxId, sensorId: 'SEN-TEST-MAX', station: testStationId, name: 'Sensor Max', type: 'TEMPERATURE' },
    { _id: testSensorMinId, sensorId: 'SEN-TEST-MIN', station: testStationId, name: 'Sensor Min', type: 'TEMPERATURE' },
    { _id: testSensorAckId, sensorId: 'SEN-TEST-ACK', station: testStationId, name: 'Sensor Ack', type: 'TEMPERATURE' },
    { _id: testSensorManualId, sensorId: 'SEN-TEST-MAN', station: testStationId, name: 'Sensor Manual', type: 'TEMPERATURE' }
  ]);
});

test.after(async () => {
  // Clean up all test documents created for testStationId
  await Alert.deleteMany({ station: testStationId });
  await SensorReading.deleteMany({ station: testStationId });
  await Sensor.deleteMany({ station: testStationId });
  await Station.deleteMany({ _id: testStationId });
  testHttpServer.close();
  await mongoose.disconnect();
});

test.beforeEach(() => {
  alertService._resetBreachState();
});

test('1. Repeated readings above the maximum create only one unresolved alert', async () => {
  // Reading 1: 38.0 breaches max threshold 37
  const alert1 = await alertService.evaluateThresholds(sensorWithMax, 38.0, new Date('2026-10-17T11:00:00Z'));
  assert.ok(alert1, 'First reading above max should create an alert');
  assert.equal(alert1.status, 'ACTIVE');
  assert.equal(alert1.value, 38.0);
  assert.equal(alert1.threshold, 37);

  // Reading 2: 39.0 continues breach
  const alert2 = await alertService.evaluateThresholds(sensorWithMax, 39.0, new Date('2026-10-17T11:00:05Z'));
  assert.equal(alert2, null, 'Second reading above max should be deduplicated (return null)');

  // Reading 3: 38.5 continues breach
  const alert3 = await alertService.evaluateThresholds(sensorWithMax, 38.5, new Date('2026-10-17T11:00:10Z'));
  assert.equal(alert3, null, 'Third reading above max should be deduplicated (return null)');

  // Verify database contains exactly 1 alert for this sensor and it is ACTIVE
  const alertsInDb = await Alert.find({ sensor: testSensorMaxId });
  assert.equal(alertsInDb.length, 1, 'Only one alert must exist in DB');
  assert.equal(alertsInDb[0].status, 'ACTIVE');
});

test('2. Repeated readings below the minimum create only one unresolved alert', async () => {
  // Reading 1: 18.0 breaches min threshold 20
  const alert1 = await alertService.evaluateThresholds(sensorWithMin, 18.0, new Date('2026-10-17T11:01:00Z'));
  assert.ok(alert1, 'First reading below min should create an alert');
  assert.equal(alert1.status, 'ACTIVE');
  assert.equal(alert1.value, 18.0);
  assert.equal(alert1.threshold, 20);

  // Reading 2: 17.0 continues breach
  const alert2 = await alertService.evaluateThresholds(sensorWithMin, 17.0, new Date('2026-10-17T11:01:05Z'));
  assert.equal(alert2, null, 'Second reading below min should be deduplicated');

  // Reading 3: 15.0 continues breach
  const alert3 = await alertService.evaluateThresholds(sensorWithMin, 15.0, new Date('2026-10-17T11:01:10Z'));
  assert.equal(alert3, null, 'Third reading below min should be deduplicated');

  // Verify database contains exactly 1 alert for this sensor and it is ACTIVE
  const alertsInDb = await Alert.find({ sensor: testSensorMinId });
  assert.equal(alertsInDb.length, 1, 'Only one alert must exist in DB');
  assert.equal(alertsInDb[0].status, 'ACTIVE');
});

test('3. An in-range reading resolves the threshold alert', async () => {
  // Sensor testSensorMaxId currently has 1 ACTIVE alert from Test 1
  const activeBefore = await Alert.findOne({ sensor: testSensorMaxId, status: 'ACTIVE' });
  assert.ok(activeBefore, 'ACTIVE alert must exist prior to in-range reading');

  // Reading: 25.0 is in-range (20 <= 25 <= 37)
  const resolveResult = await alertService.evaluateThresholds(sensorWithMax, 25.0, new Date('2026-10-17T11:02:00Z'));
  assert.ok(Array.isArray(resolveResult), 'Should return array of resolved alerts');
  assert.equal(resolveResult.length, 1);
  assert.equal(resolveResult[0].status, 'RESOLVED');
  assert.ok(resolveResult[0].resolvedAt, 'resolvedAt must be set');

  // Verify DB state
  const activeAfter = await Alert.findOne({ sensor: testSensorMaxId, status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] } });
  assert.equal(activeAfter, null, 'No unresolved alerts should remain in DB');

  const resolvedInDb = await Alert.findById(activeBefore._id);
  assert.equal(resolvedInDb.status, 'RESOLVED');
});

test('4. An acknowledged alert remains unresolved while the breach continues', async () => {
  // Reading 1: 38.0 breaches max threshold
  const alert = await alertService.evaluateThresholds(sensorForAck, 38.0, new Date('2026-10-17T11:03:00Z'));
  assert.ok(alert);
  assert.equal(alert.status, 'ACTIVE');

  // Operator manually acknowledges the alert
  alert.status = 'ACKNOWLEDGED';
  alert.acknowledgedAt = new Date('2026-10-17T11:03:02Z');
  await alert.save();

  // Reading 2: 39.0 arrives while breach continues
  const resultWhileBreached = await alertService.evaluateThresholds(sensorForAck, 39.0, new Date('2026-10-17T11:03:05Z'));
  assert.equal(resultWhileBreached, null, 'Should return null and not create duplicate or resolve');

  // Verify alert in DB is still ACKNOWLEDGED and unresolved
  const alertInDb = await Alert.findById(alert._id);
  assert.equal(alertInDb.status, 'ACKNOWLEDGED', 'Status must remain ACKNOWLEDGED');
  assert.equal(alertInDb.resolvedAt, undefined, 'resolvedAt must not be set');

  // Reading 3: 38.5 arrives while breach continues
  const result3 = await alertService.evaluateThresholds(sensorForAck, 38.5, new Date('2026-10-17T11:03:10Z'));
  assert.equal(result3, null);

  const alertInDb2 = await Alert.findById(alert._id);
  assert.equal(alertInDb2.status, 'ACKNOWLEDGED');
});

test('5. A new breach after genuine recovery creates a new alert', async () => {
  // Sensor sensorForAck has an ACKNOWLEDGED alert from Test 4
  const existingAlert = await Alert.findOne({ sensor: testSensorAckId, status: 'ACKNOWLEDGED' });
  assert.ok(existingAlert);

  // Step 1: Genuine recovery reading (25.0)
  const resolveResult = await alertService.evaluateThresholds(sensorForAck, 25.0, new Date('2026-10-17T11:04:00Z'));
  assert.ok(Array.isArray(resolveResult));
  assert.equal(resolveResult[0].status, 'RESOLVED');

  // Verify first alert is now RESOLVED
  const firstAlertInDb = await Alert.findById(existingAlert._id);
  assert.equal(firstAlertInDb.status, 'RESOLVED');

  // Record recovery reading in SensorReading to reflect full system state
  await SensorReading.create({
    station: testStationId,
    sensor: testSensorAckId,
    value: 25.0,
    quality: 'VALID',
    timestamp: new Date('2026-10-17T11:04:00Z')
  });

  // Step 2: New breach occurs after genuine recovery (39.0)
  const newAlert = await alertService.evaluateThresholds(sensorForAck, 39.0, new Date('2026-10-17T11:04:10Z'));
  assert.ok(newAlert, 'A new alert must be created after recovery');
  assert.notEqual(newAlert._id.toString(), existingAlert._id.toString(), 'Must be a distinct alert document');
  assert.equal(newAlert.status, 'ACTIVE');
  assert.equal(newAlert.value, 39.0);

  // Verify total alerts for sensor is 2 (1 resolved, 1 active)
  const allAlerts = await Alert.find({ sensor: testSensorAckId });
  assert.equal(allAlerts.length, 2);
});

test('6. Manual resolve does not immediately get undone or recreated by the same ongoing breach', async () => {
  // Reading 1: 38.5 creates an alert
  const alert = await alertService.evaluateThresholds(sensorForManual, 38.5, new Date('2026-10-17T11:05:00Z'));
  assert.ok(alert);
  assert.equal(alert.status, 'ACTIVE');

  // Record reading in SensorReading
  await SensorReading.create({
    station: testStationId,
    sensor: testSensorManualId,
    value: 38.5,
    quality: 'VALID',
    timestamp: new Date('2026-10-17T11:05:00Z')
  });

  // Operator manually resolves the alert in the UI/API
  alert.status = 'RESOLVED';
  alert.resolvedAt = new Date('2026-10-17T11:05:02Z');
  await alert.save();

  // Reading 2: 39.0 arrives 3 seconds later (sensor still above max 37, ongoing breach)
  await SensorReading.create({
    station: testStationId,
    sensor: testSensorManualId,
    value: 39.0,
    quality: 'VALID',
    timestamp: new Date('2026-10-17T11:05:05Z')
  });
  const resultDuringBreach = await alertService.evaluateThresholds(sensorForManual, 39.0, new Date('2026-10-17T11:05:05Z'));
  assert.equal(resultDuringBreach, null, 'Must NOT recreate alert while ongoing breach persists');

  // Verify only 1 alert exists and remains RESOLVED
  const alertsAfterBreach = await Alert.find({ sensor: testSensorManualId });
  assert.equal(alertsAfterBreach.length, 1, 'No duplicate alert created');
  assert.equal(alertsAfterBreach[0].status, 'RESOLVED', 'Manual resolve must not be undone');

  // Reading 3: 39.5 arrives (sensor still above max 37)
  const result3 = await alertService.evaluateThresholds(sensorForManual, 39.5, new Date('2026-10-17T11:05:10Z'));
  assert.equal(result3, null, 'Still in ongoing breach; must return null');

  // Reading 4: Sensor recovers with an in-range reading (26.0)
  await SensorReading.create({
    station: testStationId,
    sensor: testSensorManualId,
    value: 26.0,
    quality: 'VALID',
    timestamp: new Date('2026-10-17T11:05:15Z')
  });
  const recoveryResult = await alertService.evaluateThresholds(sensorForManual, 26.0, new Date('2026-10-17T11:05:15Z'));
  assert.equal(recoveryResult, null, 'No active alerts to resolve');

  // Reading 5: Genuinely new breach after recovery (38.8)
  await SensorReading.create({
    station: testStationId,
    sensor: testSensorManualId,
    value: 38.8,
    quality: 'VALID',
    timestamp: new Date('2026-10-17T11:05:20Z')
  });
  const newBreachAlert = await alertService.evaluateThresholds(sensorForManual, 38.8, new Date('2026-10-17T11:05:20Z'));
  assert.ok(newBreachAlert, 'New alert should now be created after genuine recovery');
  assert.equal(newBreachAlert.status, 'ACTIVE');
  assert.notEqual(newBreachAlert._id.toString(), alert._id.toString());
});

test('7. Invalid sensor reading quality does not trigger or resolve alerts', async () => {
  const dummySensor = {
    _id: new mongoose.Types.ObjectId(),
    station: testStationId,
    type: 'TEMPERATURE',
    minThreshold: 20,
    maxThreshold: 37
  };

  // Reading has invalid quality
  const badReadingResult = await alertService.evaluateThresholds(
    dummySensor,
    45.0,
    new Date(),
    { quality: 'INVALID' }
  );
  assert.equal(badReadingResult, null, 'Invalid quality reading must not create an alert');

  const alerts = await Alert.find({ sensor: dummySensor._id });
  assert.equal(alerts.length, 0, 'No alert must be created for INVALID quality');
});

test('8. Alert generation creates ACTIVE alert and does not acknowledge or resolve it', async () => {
  const testSensor = {
    _id: testSensorAckId,
    station: testStationId,
    type: 'TEMPERATURE',
    minThreshold: 20,
    maxThreshold: 35
  };

  // Clean any alerts for this sensor before test
  await Alert.deleteMany({ sensor: testSensor._id });

  // Generate an alert with a reading breaching max threshold (40 > 35)
  const breachTime = new Date('2026-10-25T10:00:00Z');
  const createdAlert = await alertService.evaluateThresholds(testSensor, 40.0, breachTime);

  assert.ok(createdAlert, 'An alert must be generated for breach');
  assert.equal(createdAlert.status, 'ACTIVE', 'Newly generated alert status must be ACTIVE');
  assert.equal(createdAlert.acknowledgedAt, undefined, 'Newly generated alert must NOT have acknowledgedAt set');
  assert.equal(createdAlert.resolvedAt, undefined, 'Newly generated alert must NOT have resolvedAt set');

  // Verify in MongoDB
  const alertInDb = await Alert.findById(createdAlert._id);
  assert.ok(alertInDb);
  assert.equal(alertInDb.status, 'ACTIVE');
  assert.equal(alertInDb.acknowledgedAt, undefined);
  assert.equal(alertInDb.resolvedAt, undefined);
});

test('9. Explicit operator action acknowledges an ACTIVE alert, updating status to ACKNOWLEDGED with timestamp', async () => {
  // Find the active alert created in Test 8
  const activeAlert = await Alert.findOne({ sensor: testSensorAckId, status: 'ACTIVE' });
  assert.ok(activeAlert, 'ACTIVE alert must exist for acknowledge test');

  // Invoke explicit acknowledge controller action
  let statusCode = 200;
  let jsonResponse = null;
  const mockReq = { params: { id: activeAlert._id.toString() } };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json(payload) { jsonResponse = payload; return this; }
  };

  await alertController.acknowledgeAlert(mockReq, mockRes, (err) => { if (err) throw err; });

  assert.equal(statusCode, 200, 'Acknowledge must return HTTP 200');
  assert.ok(jsonResponse && jsonResponse.success, 'Response must indicate success');
  assert.equal(jsonResponse.data.status, 'ACKNOWLEDGED', 'Status must be updated to ACKNOWLEDGED');
  assert.ok(jsonResponse.data.acknowledgedAt, 'acknowledgedAt timestamp must be set');
  assert.equal(jsonResponse.data.resolvedAt, undefined, 'resolvedAt must remain unset');

  // Verify in MongoDB
  const alertInDb = await Alert.findById(activeAlert._id);
  assert.equal(alertInDb.status, 'ACKNOWLEDGED');
  assert.ok(alertInDb.acknowledgedAt);
  assert.equal(alertInDb.resolvedAt, undefined);
});

test('10. Explicit operator action resolves an alert, updating status to RESOLVED with timestamp', async () => {
  // Find the acknowledged alert from Test 9
  const ackAlert = await Alert.findOne({ sensor: testSensorAckId, status: 'ACKNOWLEDGED' });
  assert.ok(ackAlert, 'ACKNOWLEDGED alert must exist for resolve test');

  // Invoke explicit resolve controller action
  let statusCode = 200;
  let jsonResponse = null;
  const mockReq = { params: { id: ackAlert._id.toString() } };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json(payload) { jsonResponse = payload; return this; }
  };

  await alertController.resolveAlert(mockReq, mockRes, (err) => { if (err) throw err; });

  assert.equal(statusCode, 200, 'Resolve must return HTTP 200');
  assert.ok(jsonResponse && jsonResponse.success, 'Response must indicate success');
  assert.equal(jsonResponse.data.status, 'RESOLVED', 'Status must be updated to RESOLVED');
  assert.ok(jsonResponse.data.resolvedAt, 'resolvedAt timestamp must be set');
  assert.ok(jsonResponse.data.acknowledgedAt, 'acknowledgedAt must be preserved');

  // Verify in MongoDB
  const alertInDb = await Alert.findById(ackAlert._id);
  assert.equal(alertInDb.status, 'RESOLVED');
  assert.ok(alertInDb.resolvedAt);
  assert.ok(alertInDb.acknowledgedAt);
});

