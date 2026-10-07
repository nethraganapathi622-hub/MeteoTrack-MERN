const Station = require('../models/Station');

exports.getStations = async (req, res, next) => {
  try {
    const stations = await Station.find();
    res.status(200).json({ success: true, data: stations });
  } catch (err) {
    next(err);
  }
};

exports.getStation = async (req, res, next) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }
    res.status(200).json({ success: true, data: station });
  } catch (err) {
    next(err);
  }
};

exports.createStation = async (req, res, next) => {
  try {
    const station = await Station.create(req.body);
    res.status(201).json({ success: true, data: station });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate field value entered' });
    }
    next(err);
  }
};

exports.updateStation = async (req, res, next) => {
  try {
    const station = await Station.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }
    res.status(200).json({ success: true, data: station });
  } catch (err) {
    next(err);
  }
};

exports.deleteStation = async (req, res, next) => {
  try {
    // Check if any sensors are associated with this station
    const Sensor = require('../models/Sensor');
    const sensorCount = await Sensor.countDocuments({ station: req.params.id });
    if (sensorCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete station. There are ${sensorCount} sensors associated with it.` 
      });
    }

    const station = await Station.findByIdAndDelete(req.params.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
