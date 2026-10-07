const SensorReading = require('../models/SensorReading');
const Sensor = require('../models/Sensor');
const mongoose = require('mongoose');
const { getIO } = require('../socket');

exports.createReading = async (req, res, next) => {
  try {
    const { sensor, station, value, unit, quality, timestamp } = req.body;
    
    if (!sensor || !station || value === undefined) {
      return res.status(400).json({ success: false, message: 'Sensor, station, and value are required' });
    }
    if (isNaN(value)) {
      return res.status(400).json({ success: false, message: 'Value must be numeric' });
    }
    
    const sensorDoc = await Sensor.findById(sensor).populate('station', 'name stationId');
    if (!sensorDoc) {
      return res.status(404).json({ success: false, message: 'Sensor not found' });
    }
    
    if (sensorDoc.station._id.toString() !== station && sensorDoc.station.toString() !== station) {
      return res.status(400).json({ success: false, message: 'Sensor does not belong to the provided station' });
    }
    
    const reading = await SensorReading.create({
      sensor,
      station,
      value: Number(value),
      unit: unit || sensorDoc.unit,
      quality: quality || 'VALID',
      timestamp: timestamp ? new Date(timestamp) : Date.now()
    });
    
    sensorDoc.lastReading = Number(value);
    await sensorDoc.save();
    
    // Broadcast event
    const io = getIO();
    const payload = {
      sensorId: sensorDoc.sensorId,
      sensorDbId: sensorDoc._id,
      stationId: sensorDoc.station._id,
      stationName: sensorDoc.station.name || 'Unknown',
      type: sensorDoc.type,
      value: reading.value,
      unit: reading.unit,
      timestamp: reading.timestamp,
      quality: reading.quality
    };
    
    io.to('global').emit('sensor:reading', payload);
    io.to(`station:${sensorDoc.station._id}`).emit('sensor:reading', payload);
    
    res.status(201).json({ success: true, data: reading });
  } catch (err) {
    next(err);
  }
};

exports.getReadings = async (req, res, next) => {
  try {
    const { sensor, station, startDate, endDate, limit = 100 } = req.query;
    let query = {};
    
    if (sensor) query.sensor = sensor;
    if (station) query.station = station;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const limitNum = Math.min(Number(limit) || 100, 1000); // cap at 1000 to prevent overload
    
    const readings = await SensorReading.find(query)
      .sort({ timestamp: -1 })
      .limit(limitNum);
      
    res.status(200).json({ success: true, data: readings });
  } catch (err) {
    next(err);
  }
};

exports.getLatestReadings = async (req, res, next) => {
  try {
    const { sensor, station } = req.query;
    
    let matchStage = {};
    if (sensor) {
      matchStage.sensor = new mongoose.Types.ObjectId(sensor);
    }
    if (station) {
      matchStage.station = new mongoose.Types.ObjectId(station);
    }
    
    const latestReadings = await SensorReading.aggregate([
      { $match: matchStage },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$sensor",
          latestReading: { $first: "$$ROOT" }
        }
      },
      {
        $replaceRoot: { newRoot: "$latestReading" }
      }
    ]);
    
    res.status(200).json({ success: true, data: latestReadings });
  } catch (err) {
    next(err);
  }
};
