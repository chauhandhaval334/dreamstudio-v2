const logger = require('../utils/logger.util');

/**
 * Centralized Express Error Handling Middleware.
 */
function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  logger.error(`[HTTP ${statusCode}] ${req.method} ${req.originalUrl} - ${message}`, err.stack);

  const responseBody = {
    message
  };

  // Expose error detail / stack trace only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    responseBody.stack = err.stack;
    if (err.error) {
      responseBody.error = err.error;
    }
  }

  res.status(statusCode).json(responseBody);
}

module.exports = errorMiddleware;
