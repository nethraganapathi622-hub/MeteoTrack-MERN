const express = require('express');
const { getStations, getStation, createStation, updateStation, deleteStation } = require('../controllers/stationController');
const { getSensorsByStation } = require('../controllers/sensorController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getStations)
  .post(protect, authorize('ADMIN', 'OPERATOR'), createStation);

router.route('/:id')
  .get(protect, getStation)
  .put(protect, authorize('ADMIN', 'OPERATOR', 'TECHNICIAN'), updateStation)
  .delete(protect, authorize('ADMIN'), deleteStation);

// Get sensors for a specific station
router.get('/:stationId/sensors', protect, getSensorsByStation);

module.exports = router;
