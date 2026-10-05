const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  stationId: {
    type: String,
    required: [true, 'Station ID is required'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  description: String,
  location: {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required']
    },
    address: String
  },
  region: String,
  status: {
    type: String,
    enum: ['ONLINE', 'OFFLINE', 'WARNING', 'CRITICAL', 'MAINTENANCE'],
    default: 'OFFLINE',
  },
  installationDate: Date,
  lastCommunication: Date,
  healthScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
}, {
  timestamps: true,
});

// Indexes
stationSchema.index({ status: 1 });
stationSchema.index({ region: 1 });

module.exports = mongoose.model('Station', stationSchema);
