const express = require('express');
const { getSensors, getSensor, createSensor, updateSensor, deleteSensor } = require('../controllers/sensorController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getSensors)
  .post(protect, authorize('ADMIN', 'TECHNICIAN'), createSensor);

router.route('/:id')
  .get(protect, getSensor)
  .put(protect, authorize('ADMIN', 'TECHNICIAN'), updateSensor)
  .delete(protect, authorize('ADMIN'), deleteSensor);

module.exports = router;
