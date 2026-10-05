const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
  sensorId: {
    type: String,
    required: [true, 'Sensor ID is required'],
    unique: true,
    trim: true,
  },
  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: [true, 'Station reference is required'],
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
  },
  type: {
    type: String,
    enum: [
      'TEMPERATURE', 'HUMIDITY', 'PRESSURE', 'WIND_SPEED', 
      'WIND_DIRECTION', 'RAINFALL', 'SOLAR_RADIATION', 
      'UV_INDEX', 'VISIBILITY', 'DEW_POINT'
    ],
    required: true,
  },
  manufacturer: String,
  model: String,
  unit: String,
  accuracy: String,
  status: {
    type: String,
    enum: ['ONLINE', 'OFFLINE', 'WARNING', 'FAULT', 'MAINTENANCE'],
    default: 'OFFLINE',
  },
  installationDate: Date,
  lastReading: Number,
  lastCommunication: Date,
  calibrationStatus: {
    type: String,
    enum: ['VALID', 'EXPIRED', 'PENDING'],
    default: 'VALID'
  },
}, {
  timestamps: true,
});

// Indexes
sensorSchema.index({ station: 1 });
sensorSchema.index({ status: 1 });
sensorSchema.index({ type: 1 });

module.exports = mongoose.model('Sensor', sensorSchema);
