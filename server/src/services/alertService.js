const Alert = require('../models/Alert');

// Tracks active breach episodes per sensor and parameter
// key: `${sensorId}_${sensorType}`
// value: { breached: true, breachType: 'minimum' | 'maximum' }
const activeBreaches = new Map();

/**
 * Reset in-memory breach tracking (used for test isolation)
 */
exports._resetBreachState = () => {
  activeBreaches.clear();
};

/**
 * Evaluates a sensor reading against configured thresholds and manages alerts.
 * 
 * @param {Object} sensor - The sensor document (must contain minThreshold, maxThreshold, _id, station, type).
 * @param {Number} readingValue - The numeric value of the current reading.
 * @param {Date} [timestamp] - Optional timestamp for the reading.
 * @param {Object} [options] - Optional options such as quality.
 * @returns {Promise<Object|Array|null>} - The newly created alert, an array of resolved alerts, or null if no action taken.
 */
exports.evaluateThresholds = async (sensor, readingValue, timestamp = new Date(), options = {}) => {
  try {
    const numValue = Number(readingValue);
    if (readingValue === undefined || readingValue === null || isNaN(numValue) || !Number.isFinite(numValue)) {
      return null;
    }

    if (options && options.quality && options.quality !== 'VALID') {
      return null;
    }

    const { minThreshold, maxThreshold, _id: sensorId, station, type: sensorType } = sensor;

    // Check if thresholds are actually configured
    if (minThreshold == null && maxThreshold == null) {
      return null;
    }

    const breachKey = `${sensorId}_${sensorType}`;

    let isBreached = false;
    let breachType = null;
    let breachThreshold = null;
    
    // Evaluate thresholds
    if (minThreshold != null && numValue < minThreshold) {
      isBreached = true;
      breachType = 'minimum';
      breachThreshold = minThreshold;
    } else if (maxThreshold != null && numValue > maxThreshold) {
      isBreached = true;
      breachType = 'maximum';
      breachThreshold = maxThreshold;
    }

    // Determine station ID whether it's populated or not
    const stationId = station && station._id ? station._id : station;

    if (isBreached) {
      // 1. Check for an existing ACTIVE or ACKNOWLEDGED alert in the database
      const existingAlert = await Alert.findOne({
        sensor: sensorId,
        status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
        type: 'THRESHOLD_BREACH',
        parameter: sensorType
      });

      if (existingAlert) {
        // Ongoing breach with an existing unresolved alert. Maintain single alert (deduplicate).
        activeBreaches.set(breachKey, { breached: true, breachType });
        return null;
      }

      // 2. Check if this breach episode is already active in memory
      // (e.g. alert was manually resolved, but the sensor has not recovered yet).
      if (activeBreaches.has(breachKey)) {
        return null;
      }

      // 3. Fallback check against DB history (for process restarts or cold starts)
      const latestAlert = await Alert.findOne({
        sensor: sensorId,
        type: 'THRESHOLD_BREACH',
        parameter: sensorType
      }).sort({ triggeredAt: -1 });

      if (latestAlert && latestAlert.status === 'RESOLVED') {
        try {
          const SensorReading = require('../models/SensorReading');
          const readingsCount = await SensorReading.countDocuments({
            sensor: sensorId,
            timestamp: { $gte: latestAlert.triggeredAt, $lte: timestamp }
          });

          if (readingsCount > 0) {
            const valFilter = {};
            if (minThreshold != null) valFilter.$gte = minThreshold;
            if (maxThreshold != null) valFilter.$lte = maxThreshold;

            const recoveryReading = await SensorReading.findOne({
              sensor: sensorId,
              timestamp: { $gte: latestAlert.triggeredAt, $lte: timestamp },
              quality: { $ne: 'INVALID' },
              ...(Object.keys(valFilter).length > 0 ? { value: valFilter } : {})
            });

            if (!recoveryReading) {
              // Sensor never recovered since this alert; maintain unresolved/resolved episode state
              activeBreaches.set(breachKey, { breached: true, breachType });
              return null;
            }
          }
        } catch (dbErr) {
          // If SensorReading query fails, proceed normally
        }
      }

      // 4. Create genuinely new alert
      const newAlert = new Alert({
        station: stationId,
        sensor: sensorId,
        type: 'THRESHOLD_BREACH',
        parameter: sensorType,
        value: numValue,
        threshold: breachThreshold,
        severity: 'HIGH',
        status: 'ACTIVE',
        message: `Sensor reading (${numValue}) breached ${breachType} threshold (${breachThreshold}).`,
        triggeredAt: timestamp
      });
      
      await newAlert.save();
      activeBreaches.set(breachKey, { breached: true, breachType });
      return newAlert;
      
    } else {
      // Reading is within normal limits; clear breach tracking (genuine recovery)
      activeBreaches.delete(breachKey);

      // Resolve any active or acknowledged threshold alerts for this sensor
      const existingAlerts = await Alert.find({
        sensor: sensorId,
        status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
        type: 'THRESHOLD_BREACH',
        parameter: sensorType
      });

      if (existingAlerts && existingAlerts.length > 0) {
        const updatePromises = existingAlerts.map(alert => {
          alert.status = 'RESOLVED';
          alert.resolvedAt = timestamp;
          return alert.save();
        });
        
        const resolvedAlerts = await Promise.all(updatePromises);
        return resolvedAlerts;
      }
      
      return null;
    }
  } catch (error) {
    console.error(`[AlertService] Error evaluating thresholds for sensor ${sensor && sensor._id}:`, error);
    throw error;
  }
};

