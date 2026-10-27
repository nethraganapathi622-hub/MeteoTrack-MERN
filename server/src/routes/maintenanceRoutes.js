const express = require('express');
const { getRecords, getRecord, createRecord, updateRecord, deleteRecord, getSummary } = require('../controllers/maintenanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/summary')
  .get(protect, getSummary);

router.route('/')
  .get(protect, getRecords)
  .post(protect, authorize('ADMIN', 'TECHNICIAN'), createRecord);

router.route('/:id')
  .get(protect, getRecord)
  .put(protect, authorize('ADMIN', 'TECHNICIAN'), updateRecord)
  .delete(protect, authorize('ADMIN'), deleteRecord);

module.exports = router;
