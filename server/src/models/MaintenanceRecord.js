const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema({
  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true
  },
  sensor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor',
    required: false // Optional, might be station-level maintenance
  },
  type: {
    type: String,
    required: true,
    enum: ['CALIBRATION', 'REPAIR', 'INSPECTION', 'REPLACEMENT', 'CLEANING', 'OTHER']
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  },
  status: {
    type: String,
    required: true,
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'SCHEDULED'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  completionDate: {
    type: Date
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String
  }
}, { timestamps: true });

// Add index for fast querying
maintenanceRecordSchema.index({ station: 1, status: 1 });
maintenanceRecordSchema.index({ scheduledDate: -1 });

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
