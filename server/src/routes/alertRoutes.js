const express = require('express');
const { 
  getAlerts, 
  getAlertSummary, 
  getAlert, 
  acknowledgeAlert, 
  resolveAlert 
} = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Order is important here: /summary must come before /:id
router.route('/summary')
  .get(protect, getAlertSummary);

router.route('/')
  .get(protect, getAlerts);

router.route('/:id')
  .get(protect, getAlert);

router.route('/:id/acknowledge')
  .patch(protect, authorize('ADMIN', 'TECHNICIAN', 'OPERATOR'), acknowledgeAlert);

router.route('/:id/resolve')
  .patch(protect, authorize('ADMIN', 'TECHNICIAN', 'OPERATOR'), resolveAlert);

module.exports = router;
