/**
 * Global error handling middleware for Express.js
 * Centralizes error processing and provides consistent error responses
 * 
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error Details:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Initialize default error response
  let statusCode = 500;
  let message = "Internal Server Error";
  let details = null;

  // Map specific error types to appropriate HTTP status codes
  const errorMappings = {
    'ValidationError': { code: 400, message: 'Validation Error' },
    'CastError': { code: 400, message: 'Invalid ID format' },
    'MongoError': { code: 400, message: 'Database error' },
    'JsonWebTokenError': { code: 401, message: 'Invalid token' },
    'TokenExpiredError': { code: 401, message: 'Token expired' }
  };

  // Handle known error types
  if (errorMappings[err.name]) {
    const mapping = errorMappings[err.name];
    statusCode = mapping.code;
    message = mapping.message;
    details = err.message;
  } else if (err.status) {
    // Handle custom status codes
    statusCode = err.status;
    message = err.message;
  } else if (err.message) {
    // Use error message if available
    message = err.message;
  }

  // Security: Don't expose internal error details in production
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    details = null;
    message = "Internal Server Error";
  }

  // Send standardized error response
  res.status(statusCode).json({
    error: true,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
};

module.exports = errorHandler;
