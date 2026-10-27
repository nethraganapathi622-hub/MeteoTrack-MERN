const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Station = require('../src/models/Station');

const demoStations = [
  {
    stationId: 'ST-GAMMA-03',
    name: 'Gamma Ridge',
    description: 'High-altitude atmospheric monitoring station at Gamma Ridge.',
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      address: 'Gamma Ridge Observatory, CA'
    },
    region: 'West',
    status: 'ONLINE',
    healthScore: 98
  },
  {
    stationId: 'ST-DELTA-04',
    name: 'Delta Plains',
    description: 'Weather monitoring outpost in the Delta Plains basin.',
    location: {
      latitude: 39.7392,
      longitude: -104.9903,
      address: 'Delta Plains Meteorological Station, CO'
    },
    region: 'Central',
    status: 'ONLINE',
    healthScore: 95
  },
  {
    stationId: 'ST-EPSILON-05',
    name: 'Epsilon Coast',
    description: 'Marine and coastal climate tracking station at Epsilon Coast.',
    location: {
      latitude: 47.6062,
      longitude: -122.3321,
      address: 'Epsilon Coastal Station, WA'
    },
    region: 'Pacific',
    status: 'ONLINE',
    healthScore: 92
  },
  {
    stationId: 'ST-ZETA-06',
    name: 'Zeta Valley',
    description: 'Semi-arid basin weather observatory at Zeta Valley.',
    location: {
      latitude: 33.4484,
      longitude: -112.0740,
      address: 'Zeta Valley Research Center, AZ'
    },
    region: 'Southwest',
    status: 'WARNING',
    healthScore: 78
  },
  {
    stationId: 'ST-ETA-07',
    name: 'Eta Highlands',
    description: 'Elevated terrain meteorological outpost at Eta Highlands.',
    location: {
      latitude: 45.5152,
      longitude: -122.6784,
      address: 'Eta Highlands Outpost, OR'
    },
    region: 'Pacific',
    status: 'ONLINE',
    healthScore: 97
  },
  {
    stationId: 'ST-THETA-08',
    name: 'Theta Bay',
    description: 'Coastal bay meteorological and tidal station at Theta Bay.',
    location: {
      latitude: 32.7157,
      longitude: -117.1611,
      address: 'Theta Bay Marine Station, CA'
    },
    region: 'Southwest',
    status: 'MAINTENANCE',
    healthScore: 84
  },
  {
    stationId: 'ST-IOTA-09',
    name: 'Iota Forest',
    description: 'Dense woodland microclimate research station in Iota Forest.',
    location: {
      latitude: 44.0521,
      longitude: -123.0868,
      address: 'Iota Forest Environmental Post, OR'
    },
    region: 'Pacific',
    status: 'ONLINE',
    healthScore: 96
  },
  {
    stationId: 'ST-KAPPA-10',
    name: 'Kappa Field',
    description: 'Agricultural meteorological monitoring station at Kappa Field.',
    location: {
      latitude: 38.5816,
      longitude: -121.4944,
      address: 'Kappa Agricultural Field Site, CA'
    },
    region: 'West',
    status: 'ONLINE',
    healthScore: 94
  }
];

async function addDemoStations() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('ERROR: MONGO_URI is missing in environment.');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    
    const dbName = mongoose.connection.name;
    console.log(`Connected to database: ${dbName}`);
    if (dbName !== 'MeteoTrack') {
      console.error(`ERROR: Target database name is "${dbName}", expected "MeteoTrack". Aborting.`);
      process.exit(1);
    }

    // Step 1: Pre-insertion verification of existing stations
    const initialStations = await Station.find().lean();
    console.log(`Initial station count: ${initialStations.length}`);

    const alphaBefore = initialStations.find(s => s.stationId === 'ST-ALPHA-01');
    const betaBefore = initialStations.find(s => s.stationId === 'ST-BETA-02');

    if (!alphaBefore || !betaBefore) {
      console.error('ERROR: Original stations (ST-ALPHA-01 / ST-BETA-02) not found. Aborting to preserve safety.');
      process.exit(1);
    }

    console.log('Original stations confirmed present and valid:');
    console.log(`  - ST-ALPHA-01 (ID: ${alphaBefore._id}, createdAt: ${alphaBefore.createdAt})`);
    console.log(`  - ST-BETA-02 (ID: ${betaBefore._id}, createdAt: ${betaBefore.createdAt})`);

    // Step 2: Strictly additive, idempotent upsert using $setOnInsert
    let insertedCount = 0;
    let existingCount = 0;

    for (const stationData of demoStations) {
      const res = await Station.updateOne(
        { stationId: stationData.stationId },
        { $setOnInsert: stationData },
        { upsert: true }
      );

      if (res.upsertedCount > 0) {
        insertedCount++;
        console.log(`+ Inserted new station: ${stationData.stationId} (${stationData.name})`);
      } else {
        existingCount++;
        console.log(`= Already exists (preserved): ${stationData.stationId}`);
      }
    }

    console.log(`\nInsertion summary: ${insertedCount} newly inserted, ${existingCount} already present.`);

    // Step 3: Post-insertion verification
    const finalStations = await Station.find().sort({ stationId: 1 }).lean();
    console.log(`Final station count: ${finalStations.length}`);

    if (finalStations.length !== 10) {
      console.error(`ERROR: Expected exactly 10 stations, but found ${finalStations.length}.`);
      process.exit(1);
    }

    // Check uniqueness of station IDs
    const idSet = new Set(finalStations.map(s => s.stationId));
    if (idSet.size !== 10) {
      console.error(`ERROR: Duplicate station IDs detected: ${finalStations.map(s => s.stationId).join(', ')}`);
      process.exit(1);
    }

    // Check integrity of original stations
    const alphaAfter = finalStations.find(s => s.stationId === 'ST-ALPHA-01');
    const betaAfter = finalStations.find(s => s.stationId === 'ST-BETA-02');

    if (String(alphaBefore._id) !== String(alphaAfter._id) ||
        new Date(alphaBefore.createdAt).getTime() !== new Date(alphaAfter.createdAt).getTime() ||
        alphaBefore.status !== alphaAfter.status) {
      console.error('ERROR: ST-ALPHA-01 was modified!');
      process.exit(1);
    }

    if (String(betaBefore._id) !== String(betaAfter._id) ||
        new Date(betaBefore.createdAt).getTime() !== new Date(betaAfter.createdAt).getTime() ||
        betaBefore.status !== betaAfter.status) {
      console.error('ERROR: ST-BETA-02 was modified!');
      process.exit(1);
    }

    console.log('\nVERIFICATION PASSED:');
    console.log('- Database: MeteoTrack confirmed.');
    console.log('- Total stations: exactly 10.');
    console.log('- All station IDs unique.');
    console.log('- Original stations (ST-ALPHA-01 & ST-BETA-02) completely intact and identical.');

    console.log('\nAll 10 stations in database:');
    finalStations.forEach(s => {
      console.log(`  [${s.stationId}] ${s.name.padEnd(16)} | Region: ${(s.region || '').padEnd(10)} | Status: ${(s.status || '').padEnd(12)} | Coordinates: (${s.location?.latitude}, ${s.location?.longitude})`);
    });

    await mongoose.disconnect();
    console.log('\nDatabase connection closed. Operation finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  }
}

addDemoStations();
