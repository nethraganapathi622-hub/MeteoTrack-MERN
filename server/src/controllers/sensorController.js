const Sensor = require('../models/Sensor');

exports.getSensors = async (req, res, next) => {
  try {
    const sensors = await Sensor.find().populate('station', 'name stationId');
    res.status(200).json({ success: true, data: sensors });
  } catch (err) {
    next(err);
  }
};

exports.getSensor = async (req, res, next) => {
  try {
    const sensor = await Sensor.findById(req.params.id).populate('station', 'name stationId');
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found' });
    }
    res.status(200).json({ success: true, data: sensor });
  } catch (err) {
    next(err);
  }
};

exports.getSensorsByStation = async (req, res, next) => {
  try {
    const sensors = await Sensor.find({ station: req.params.stationId });
    res.status(200).json({ success: true, data: sensors });
  } catch (err) {
    next(err);
  }
};

exports.createSensor = async (req, res, next) => {
  try {
    const sensor = await Sensor.create(req.body);
    res.status(201).json({ success: true, data: sensor });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate field value entered' });
    }
    next(err);
  }
};

exports.updateSensor = async (req, res, next) => {
  try {
    const sensor = await Sensor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found' });
    }
    res.status(200).json({ success: true, data: sensor });
  } catch (err) {
    next(err);
  }
};

exports.deleteSensor = async (req, res, next) => {
  try {
    const sensor = await Sensor.findByIdAndDelete(req.params.id);
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
