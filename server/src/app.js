const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const stationRoutes = require('./routes/stationRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const readingRoutes = require('./routes/readingRoutes');
const alertRoutes = require('./routes/alertRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security Middleware
app.use(helmet());

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // General API limit for normal platform activity
  skip: (req) => req.originalUrl?.startsWith('/api/readings') || req.path?.startsWith('/readings')
});
app.use('/api', limiter);

// Login Rate Limiting (Brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth/login', loginLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
