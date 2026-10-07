const express = require('express');
const { createReading, getReadings, getLatestReadings } = require('../controllers/readingController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/latest')
  .get(protect, getLatestReadings);

router.route('/')
  .get(protect, getReadings)
  .post(protect, authorize('ADMIN', 'TECHNICIAN', 'OPERATOR'), createReading);

module.exports = router;
