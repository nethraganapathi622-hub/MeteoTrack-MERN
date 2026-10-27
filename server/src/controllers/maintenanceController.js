const MaintenanceRecord = require('../models/MaintenanceRecord');

exports.getRecords = async (req, res, next) => {
  try {
    const { station, sensor, status, priority, startDate, endDate, limit = 50, page = 1 } = req.query;
    
    let query = {};
    if (station) query.station = station;
    if (sensor) query.sensor = sensor;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }
    
    const limitNum = Math.min(Number(limit) || 50, 200);
    const skip = (Number(page) - 1) * limitNum;
    
    const [records, total] = await Promise.all([
      MaintenanceRecord.find(query)
        .populate('station', 'name stationId')
        .populate('sensor', 'name sensorId type')
        .populate('assignedTo', 'name email')
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(limitNum),
      MaintenanceRecord.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      count: records.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: Number(page),
      data: records
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecord = async (req, res, next) => {
  try {
    const record = await MaintenanceRecord.findById(req.params.id)
      .populate('station')
      .populate('sensor')
      .populate('assignedTo', 'name email');
      
    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }
    
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

exports.createRecord = async (req, res, next) => {
  try {
    const record = await MaintenanceRecord.create(req.body);
    
    const populated = await MaintenanceRecord.findById(record._id)
      .populate('station', 'name stationId')
      .populate('sensor', 'name sensorId type')
      .populate('assignedTo', 'name email');
      
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

exports.updateRecord = async (req, res, next) => {
  try {
    const record = await MaintenanceRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('station', 'name stationId')
      .populate('sensor', 'name sensorId type')
      .populate('assignedTo', 'name email');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }
    
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

exports.deleteRecord = async (req, res, next) => {
  try {
    const record = await MaintenanceRecord.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

exports.getSummary = async (req, res, next) => {
  try {
    const [scheduled, inProgress, completed] = await Promise.all([
      MaintenanceRecord.countDocuments({ status: 'SCHEDULED' }),
      MaintenanceRecord.countDocuments({ status: 'IN_PROGRESS' }),
      MaintenanceRecord.countDocuments({ status: 'COMPLETED' })
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        scheduled,
        inProgress,
        completed,
        total: scheduled + inProgress + completed
      }
    });
  } catch (error) {
    next(error);
  }
};
