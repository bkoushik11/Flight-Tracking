const express = require('express');
const AuthController = require('../controllers/authController');
const AuthMiddleware = require('../middlewares/auth');

const router = express.Router();

/**
 * Authentication Routes
 * Base path: /api/auth
 */

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    {fullName, email, password, confirmPassword}
 */
router.post('/register', AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 * @body    {email, password}
 */
router.post('/login', AuthController.login);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.get('/profile', AuthMiddleware.authenticate, AuthController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 * @body    {fullName?, preferences?, favoriteAirports?}
 */
router.put('/profile', AuthMiddleware.authenticate, AuthController.updateProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (for logging purposes)
 * @access  Private
 */
router.post('/logout', AuthMiddleware.authenticate, AuthController.logout);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify if token is valid
 * @access  Private
 */
router.get('/verify', AuthMiddleware.authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    data: {
      user: req.user.toJSON(),
      isAuthenticated: true
    }
  });
});

module.exports = router;