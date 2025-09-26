const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT Authentication Middleware
 */
class AuthMiddleware {
  /**
   * Generate JWT token
   * @param {Object} payload - Data to encode in token
   * @param {string} expiresIn - Token expiration time
   * @returns {string} JWT token
   */
  static generateToken(payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  /**
   * Extract token from request headers
   * @param {Object} req - Express request object
   * @returns {string|null} JWT token or null
   */
  static extractToken(req) {
    // Support token via query param for media elements that cannot set headers
    if (req.query && typeof req.query.token === 'string' && req.query.token.length > 0) {
      return req.query.token;
    }
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    
    // Also check for token in cookies (optional)
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }
    
    return null;
  }

  /**
   * Middleware to protect routes - requires valid JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async authenticate(req, res, next) {
    try {
      const token = AuthMiddleware.extractToken(req);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No token provided.',
          code: 'NO_TOKEN'
        });
      }

      // Verify token
      const decoded = AuthMiddleware.verifyToken(token);
      
      // Get user from database
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. User not found.',
          code: 'USER_NOT_FOUND'
        });
      }

      // Add user to request object
      req.user = user;
      req.userId = user._id;
      
      next();
    } catch (error) {
      console.error('Authentication error:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Invalid token.',
          code: 'INVALID_TOKEN'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Token expired.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.',
        code: 'AUTH_ERROR'
      });
    }
  }

  /**
   * Optional authentication middleware - doesn't fail if no token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async optionalAuth(req, res, next) {
    try {
      const token = AuthMiddleware.extractToken(req);
      
      if (token) {
        const decoded = AuthMiddleware.verifyToken(token);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user) {
          req.user = user;
          req.userId = user._id;
        }
      }
      
      next();
    } catch (error) {
      // Don't fail, just continue without user
      console.warn('Optional auth failed:', error.message);
      next();
    }
  }

  /**
   * Middleware to refresh token if it's close to expiring
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async refreshTokenIfNeeded(req, res, next) {
    try {
      if (!req.user) {
        return next();
      }

      const token = AuthMiddleware.extractToken(req);
      if (!token) {
        return next();
      }

      const decoded = jwt.decode(token);
      const now = Date.now() / 1000;
      const timeUntilExpiry = decoded.exp - now;
      
      // If token expires in less than 1 day, provide a new one
      if (timeUntilExpiry < 86400) { // 24 hours
        const newToken = AuthMiddleware.generateToken({
          userId: req.user._id,
          email: req.user.email
        });
        
        res.setHeader('X-New-Token', newToken);
      }
      
      next();
    } catch (error) {
      console.error('Token refresh error:', error.message);
      next(); // Don't fail the request
    }
  }
}

module.exports = AuthMiddleware;