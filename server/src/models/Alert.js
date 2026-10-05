const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true,
  },
  sensor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor',
  },
  type: {
    type: String,
    required: true,
  },
  parameter: String,
  value: Number,
  threshold: Number,
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'HIGH', 'CRITICAL'],
    required: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'],
    default: 'ACTIVE',
  },
  message: String,
  triggeredAt: {
    type: Date,
    default: Date.now,
  },
  acknowledgedAt: Date,
  resolvedAt: Date,
}, {
  timestamps: true,
});

// Indexes
alertSchema.index({ station: 1 });
alertSchema.index({ sensor: 1 });
alertSchema.index({ status: 1 });
alertSchema.index({ severity: 1 });
alertSchema.index({ triggeredAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
