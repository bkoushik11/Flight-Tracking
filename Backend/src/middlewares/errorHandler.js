// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Default error
  let statusCode = 500;
  let message = "Internal Server Error";
  let details = null;

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    details = err.message;
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  } else if (err.status) {
    statusCode = err.status;
    message = err.message;
  } else if (err.message) {
    message = err.message;
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    details = null;
  }

  res.status(statusCode).json({
    error: true,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
    path: req.path
  });
};

module.exports = errorHandler;
