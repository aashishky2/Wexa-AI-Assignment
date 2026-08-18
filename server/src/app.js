const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');
const logger = require('./utils/logger');
const { verifyConnectivity } = require('./config/db');

const app = express();

// Security and Logging Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://d3js.org"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  }
}));
app.use(cors());
app.use(express.json());

// Morgan logger piped to Winston
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate Limiting on API routes
app.use('/api/', apiLimiter);

// API Routes
app.use('/api', apiRoutes);


// Serve Frontend SPA
app.use(express.static(path.join(__dirname, '../../public')));
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
