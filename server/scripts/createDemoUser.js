const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');

const DEMO_EMAIL = 'demo@meteotrack.com';
const DEMO_PASSWORD = 'DemoViewer2025!';
const DEMO_NAME = 'Demo Viewer';
const DEMO_ROLE = 'VIEWER';

async function createOrUpdateDemoUser() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('Error: MONGO_URI is not set in server/.env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully.');

    let user = await User.findOne({ email: DEMO_EMAIL }).select('+password');

    if (user) {
      console.log(`Demo user ${DEMO_EMAIL} already exists. Updating attributes...`);
      user.name = DEMO_NAME;
      user.role = DEMO_ROLE;
      user.isActive = true;
      user.password = DEMO_PASSWORD; // Will be hashed by pre('save') hook
      await user.save();
      console.log(`Demo user ${DEMO_EMAIL} successfully updated.`);
    } else {
      console.log(`Creating demo user ${DEMO_EMAIL}...`);
      user = await User.create({
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        role: DEMO_ROLE,
        isActive: true,
      });
      console.log(`Demo user ${DEMO_EMAIL} created successfully.`);
    }

    // Verify login password match
    const verifyUser = await User.findOne({ email: DEMO_EMAIL }).select('+password');
    const isMatch = await verifyUser.matchPassword(DEMO_PASSWORD);
    if (!isMatch) {
      throw new Error('Password verification check failed for demo user!');
    }
    console.log(`Demo user verification: Account active, role is ${verifyUser.role}, password match verified.`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Error in createOrUpdateDemoUser:', error);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

createOrUpdateDemoUser();

