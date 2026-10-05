const mongoose = require('mongoose');

exports.getHealthStatus = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'MeteoTrack API',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
};
