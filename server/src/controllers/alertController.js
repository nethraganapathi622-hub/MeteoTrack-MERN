const Alert = require('../models/Alert');
const mongoose = require('mongoose');
const { getIO } = require('../socket');

// 1. List alerts with pagination and filters
exports.getAlerts = async (req, res, next) => {
  try {
    const { status, severity, station, sensor, type, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (station) query.station = station;
    if (sensor) query.sensor = sensor;
    if (type) query.type = type;

    // Validate ObjectIds if passed
    if (station && !mongoose.Types.ObjectId.isValid(station)) {
      return res.status(400).json({ success: false, message: 'Invalid station ID' });
    }
    if (sensor && !mongoose.Types.ObjectId.isValid(sensor)) {
      return res.status(400).json({ success: false, message: 'Invalid sensor ID' });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const alerts = await Alert.find(query)
      .sort({ triggeredAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('station', 'name stationId')
      .populate('sensor', 'name sensorId type');

    const total = await Alert.countDocuments(query);

    res.status(200).json({
      success: true,
      count: alerts.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: alerts
    });
  } catch (err) {
    next(err);
  }
};

// 2. Return useful counts for alert summary cards
exports.getAlertSummary = async (req, res, next) => {
  try {
    const { station } = req.query;
    let matchStage = {};
    
    if (station) {
      if (!mongoose.Types.ObjectId.isValid(station)) {
        return res.status(400).json({ success: false, message: 'Invalid station ID' });
      }
      matchStage.station = new mongoose.Types.ObjectId(station);
    }

    const summary = await Alert.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } },
          acknowledged: { $sum: { $cond: [{ $eq: ["$status", "ACKNOWLEDGED"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ["$severity", "CRITICAL"] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ["$severity", "HIGH"] }, 1, 0] } },
          warning: { $sum: { $cond: [{ $eq: ["$severity", "WARNING"] }, 1, 0] } },
          info: { $sum: { $cond: [{ $eq: ["$severity", "INFO"] }, 1, 0] } }
        }
      },
      {
        $project: {
          _id: 0
        }
      }
    ]);

    const stats = summary.length > 0 ? summary[0] : {
      total: 0, active: 0, acknowledged: 0, resolved: 0,
      critical: 0, high: 0, warning: 0, info: 0
    };

    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

// 3. Retrieve a single alert by ID
exports.getAlert = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid alert ID' });
    }

    const alert = await Alert.findById(req.params.id)
      .populate('station', 'name stationId')
      .populate('sensor', 'name sensorId type');
      
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.status(200).json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
};

// 4. Acknowledge an active alert
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid alert ID' });
    }

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    if (alert.status !== 'ACTIVE') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot acknowledge alert with status ${alert.status}. Only ACTIVE alerts can be acknowledged.` 
      });
    }

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = new Date();
    await alert.save();
    
    await alert.populate('station', 'name stationId');
    await alert.populate('sensor', 'name sensorId type');

    const io = getIO();
    const alertPayload = {
      _id: alert._id,
      station: alert.station,
      sensor: alert.sensor,
      stationId: alert.station._id,
      stationName: alert.station.name || 'Unknown',
      sensorId: alert.sensor._id,
      sensorName: alert.sensor.name || 'Unknown',
      type: alert.type,
      parameter: alert.parameter,
      value: alert.value,
      threshold: alert.threshold,
      severity: alert.severity,
      status: alert.status,
      message: alert.message,
      triggeredAt: alert.triggeredAt,
      acknowledgedAt: alert.acknowledgedAt,
      resolvedAt: alert.resolvedAt
    };
    io.to('global').emit('alert:update', alertPayload);
    io.to(`station:${alert.station._id}`).emit('alert:update', alertPayload);

    res.status(200).json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
};

// 5. Resolve an active or acknowledged alert
exports.resolveAlert = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid alert ID' });
    }

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    if (alert.status === 'RESOLVED') {
      return res.status(409).json({ 
        success: false, 
        message: 'Alert is already resolved.',
        data: alert
      });
    }

    if (alert.status !== 'ACTIVE' && alert.status !== 'ACKNOWLEDGED') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot resolve alert with status ${alert.status}. Only ACTIVE or ACKNOWLEDGED alerts can be resolved.` 
      });
    }

    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    await alert.save();

    await alert.populate('station', 'name stationId');
    await alert.populate('sensor', 'name sensorId type');

    const io = getIO();
    const alertPayload = {
      _id: alert._id,
      station: alert.station,
      sensor: alert.sensor,
      stationId: alert.station._id,
      stationName: alert.station.name || 'Unknown',
      sensorId: alert.sensor._id,
      sensorName: alert.sensor.name || 'Unknown',
      type: alert.type,
      parameter: alert.parameter,
      value: alert.value,
      threshold: alert.threshold,
      severity: alert.severity,
      status: alert.status,
      message: alert.message,
      triggeredAt: alert.triggeredAt,
      acknowledgedAt: alert.acknowledgedAt,
      resolvedAt: alert.resolvedAt
    };
    io.to('global').emit('alert:update', alertPayload);
    io.to(`station:${alert.station._id}`).emit('alert:update', alertPayload);

    res.status(200).json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
};
