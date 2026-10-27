const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const Sensor = require('../src/models/Sensor');
const User = require('../src/models/User');

let simulationInterval;
let token;

// ranges for simulation
const generateReading = (sensorOrType, previousValue) => {
  const sensor = (typeof sensorOrType === 'object' && sensorOrType !== null) ? sensorOrType : { type: sensorOrType };
  const type = sensor.type;

  let min, max, change;
  switch(type) {
    case 'TEMPERATURE': min = 20; max = 38; change = 0.5; break;
    case 'HUMIDITY': min = 35; max = 95; change = 2; break;
    case 'PRESSURE': min = 980; max = 1035; change = 1; break;
    case 'WIND_SPEED': min = 0; max = 25; change = 1.5; break;
    case 'RAINFALL': return Math.random() > 0.9 ? Number((Math.random() * 5).toFixed(1)) : 0;
    default: min = 0; max = 100; change = 1; break;
  }

  // Preserve exact original range for original demo sensors
  const isOriginalSensor = ['SEN-T-001', 'SEN-H-001', 'SEN-T-002'].includes(sensor.sensorId);

  if (!isOriginalSensor) {
    if (sensor.minThreshold != null && sensor.maxThreshold != null && sensor.maxThreshold > sensor.minThreshold) {
      const range = sensor.maxThreshold - sensor.minThreshold;
      min = sensor.minThreshold + range * 0.2;
      max = sensor.maxThreshold - range * 0.2;
      change = Math.min(change, range * 0.1);
    } else if (sensor.maxThreshold != null && max > sensor.maxThreshold) {
      max = sensor.maxThreshold * 0.95;
      if (min >= max) min = max * 0.5;
    } else if (sensor.minThreshold != null && min < sensor.minThreshold) {
      min = sensor.minThreshold * 1.05;
      if (max <= min) max = min * 1.5;
    }
  }

  if (previousValue === undefined || previousValue === null || isNaN(previousValue)) {
    return Number((min + (max - min) / 2).toFixed(1));
  }

  let val = Number(previousValue) + (Math.random() * change * 2 - change);
  if (val < min) val = min;
  if (val > max) val = max;
  return Number(val.toFixed(1));
};

const postReading = (payload) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 5000,
      path: '/api/readings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseBody));
          } catch (e) {
            resolve(responseBody);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
};

const runSimulator = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI not defined. Exiting.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas for Simulation');

    const adminUser = await User.findOne({ email: 'admin@meteotrack.com' });
    if (!adminUser) {
      console.error('Admin user not found for authentication');
      process.exit(1);
    }
    token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log('Simulator started. Press Ctrl+C to stop.');

    const generateAndPost = async () => {
      // Find all eligible sensors: exclude FAULT, MAINTENANCE, or EXPIRED calibration
      const sensors = await Sensor.find({
        status: { $in: ['ONLINE', 'WARNING', 'OFFLINE'] },
        calibrationStatus: { $ne: 'EXPIRED' }
      });

      const processedSensors = new Set();

      for (const sensor of sensors) {
        if (processedSensors.has(sensor._id.toString())) continue;
        processedSensors.add(sensor._id.toString());

        const val = generateReading(sensor, sensor.lastReading);
        const payload = {
          sensor: sensor._id,
          station: sensor.station,
          value: Number(val),
          unit: sensor.unit,
          timestamp: new Date()
        };

        try {
          await postReading(payload);
          console.log(`[SIM] Posted: ${sensor.sensorId} | ${sensor.type} = ${val} ${sensor.unit || ''}`);

          // Update sensor status to ONLINE only after reading is successfully accepted and persisted
          if (sensor.status === 'OFFLINE') {
            await Sensor.findByIdAndUpdate(sensor._id, { status: 'ONLINE' });
            sensor.status = 'ONLINE';
          }
        } catch (err) {
          console.error(`[SIM] Failed to post reading for ${sensor.sensorId}:`, err.message);
        }
      }
    };

    // run initially
    await generateAndPost();

    // run every 5 seconds
    simulationInterval = setInterval(generateAndPost, 5000);
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  runSimulator();
}

module.exports = {
  generateReading,
  postReading
};

process.on('SIGINT', () => {
  console.log('\nStopping simulator...');
  if (simulationInterval) clearInterval(simulationInterval);
  mongoose.disconnect().then(() => process.exit(0));
});
