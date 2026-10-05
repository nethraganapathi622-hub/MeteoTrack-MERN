const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');
const Station = require('../src/models/Station');
const Sensor = require('../src/models/Sensor');

dotenv.config();

const seedDatabase = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI is not defined. Skipping seed.');
      return;
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Station.deleteMany();
    await Sensor.deleteMany();

    const defaultPassword = process.env.SEED_PASSWORD;
    
    if (!defaultPassword) {
      console.error('Error: SEED_PASSWORD environment variable is required to seed the database.');
      process.exit(1);
    }

    // Users
    const users = await User.create([
      { name: 'Admin User', email: 'admin@meteotrack.com', password: defaultPassword, role: 'ADMIN' },
      { name: 'Operator User', email: 'operator@meteotrack.com', password: defaultPassword, role: 'OPERATOR' },
      { name: 'Analyst User', email: 'analyst@meteotrack.com', password: defaultPassword, role: 'ANALYST' },
      { name: 'Tech User', email: 'tech@meteotrack.com', password: defaultPassword, role: 'TECHNICIAN' },
      { name: 'Viewer User', email: 'viewer@meteotrack.com', password: defaultPassword, role: 'VIEWER' }
    ]);
    console.log('Users seeded successfully');

    // Stations
    const stations = await Station.create([
      { stationId: 'ST-ALPHA-01', name: 'Alpha Prime', location: { latitude: 34.05, longitude: -118.24 }, region: 'West', status: 'ONLINE' },
      { stationId: 'ST-BETA-02', name: 'Beta Sector', location: { latitude: 36.16, longitude: -115.13 }, region: 'West', status: 'ONLINE' }
    ]);
    console.log('Stations seeded successfully');

    // Sensors
    await Sensor.create([
      { sensorId: 'SEN-T-001', station: stations[0]._id, name: 'Main Temp', type: 'TEMPERATURE', status: 'ONLINE', unit: 'C' },
      { sensorId: 'SEN-H-001', station: stations[0]._id, name: 'Main Humidity', type: 'HUMIDITY', status: 'ONLINE', unit: '%' },
      { sensorId: 'SEN-T-002', station: stations[1]._id, name: 'Beta Temp', type: 'TEMPERATURE', status: 'WARNING', unit: 'C' }
    ]);
    console.log('Sensors seeded successfully');

    console.log('Database seeding completed successfully');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedDatabase();
