const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema({
  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true,
  },
  sensor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor',
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
  unit: String,
  quality: {
    type: String,
    enum: ['VALID', 'SUSPICIOUS', 'INVALID'],
    default: 'VALID',
  }
});

// Indexes optimized for time-series querying
sensorReadingSchema.index({ station: 1, timestamp: -1 });
sensorReadingSchema.index({ sensor: 1, timestamp: -1 });
sensorReadingSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
