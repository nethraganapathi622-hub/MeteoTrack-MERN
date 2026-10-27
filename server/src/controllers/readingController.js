const SensorReading = require('../models/SensorReading');
const Sensor = require('../models/Sensor');
const mongoose = require('mongoose');
const { getIO } = require('../socket');
const { evaluateThresholds } = require('../services/alertService');

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
    
    // Evaluate alerts asynchronously to not block the response
    try {
      const alertResult = await evaluateThresholds(sensorDoc, reading.value, reading.timestamp, { quality: reading.quality });

      if (alertResult) {
        if (Array.isArray(alertResult)) {
          alertResult.forEach(alert => {
            const alertPayload = {
              _id: alert._id,
              station: {
                _id: sensorDoc.station._id,
                name: sensorDoc.station.name || 'Unknown',
                stationId: sensorDoc.station.stationId
              },
              sensor: {
                _id: sensorDoc._id,
                name: sensorDoc.name || 'Unknown',
                type: sensorDoc.type,
                sensorId: sensorDoc.sensorId
              },
              stationId: sensorDoc.station._id,
              stationName: sensorDoc.station.name || 'Unknown',
              sensorId: sensorDoc._id,
              sensorName: sensorDoc.name || 'Unknown',
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
            io.to(`station:${sensorDoc.station._id}`).emit('alert:update', alertPayload);
          });
        } else {
          const alertPayload = {
            _id: alertResult._id,
            station: {
              _id: sensorDoc.station._id,
              name: sensorDoc.station.name || 'Unknown',
              stationId: sensorDoc.station.stationId
            },
            sensor: {
              _id: sensorDoc._id,
              name: sensorDoc.name || 'Unknown',
              type: sensorDoc.type,
              sensorId: sensorDoc.sensorId
            },
            stationId: sensorDoc.station._id,
            stationName: sensorDoc.station.name || 'Unknown',
            sensorId: sensorDoc._id,
            sensorName: sensorDoc.name || 'Unknown',
            type: alertResult.type,
            parameter: alertResult.parameter,
            value: alertResult.value,
            threshold: alertResult.threshold,
            severity: alertResult.severity,
            status: alertResult.status,
            message: alertResult.message,
            triggeredAt: alertResult.triggeredAt,
            acknowledgedAt: alertResult.acknowledgedAt,
            resolvedAt: alertResult.resolvedAt
          };
          io.to('global').emit('alert:new', alertPayload);
          io.to(`station:${sensorDoc.station._id}`).emit('alert:new', alertPayload);
        }
      }
    } catch (alertErr) {
      console.error('[ReadingController] Failed to evaluate alerts:', alertErr);
    }

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
