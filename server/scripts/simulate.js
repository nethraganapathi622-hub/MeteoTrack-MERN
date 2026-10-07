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
const generateReading = (type, previousValue) => {
  let min, max, change;
  switch(type) {
    case 'TEMPERATURE': min = 20; max = 38; change = 0.5; break;
    case 'HUMIDITY': min = 35; max = 95; change = 2; break;
    case 'PRESSURE': min = 980; max = 1035; change = 1; break;
    case 'WIND_SPEED': min = 0; max = 25; change = 1.5; break;
    case 'RAINFALL': return Math.random() > 0.9 ? (Math.random() * 5).toFixed(1) : 0;
    default: return Math.random() * 100;
  }
  
  if (previousValue === undefined || previousValue === null || isNaN(previousValue)) {
    return (min + (max - min) / 2).toFixed(1);
  }
  
  let val = Number(previousValue) + (Math.random() * change * 2 - change);
  if (val < min) val = min;
  if (val > max) val = max;
  return val.toFixed(1);
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
        'Content-Length': data.length,
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseBody));
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
      const sensors = await Sensor.find({ status: { $in: ['ONLINE', 'WARNING'] } });
      for (const sensor of sensors) {
        const val = generateReading(sensor.type, sensor.lastReading);
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

runSimulator();

process.on('SIGINT', () => {
  console.log('\nStopping simulator...');
  clearInterval(simulationInterval);
  mongoose.disconnect().then(() => process.exit(0));
});
