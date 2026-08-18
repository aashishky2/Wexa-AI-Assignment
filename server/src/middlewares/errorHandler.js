const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error('Unhandled Exception', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const response = {
    error: true,
    message: err.message,
    details: 'Exposed for debugging Vercel DB connectivity.'
  };

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
