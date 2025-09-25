const User = require('../models/User');
const AuthMiddleware = require('../middlewares/auth');
const { z } = require('zod');

/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 */
class AuthController {
  /**
   * Validation schemas using Zod
   */
  static schemas = {
    register: z.object({
      fullName: z.string()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name cannot exceed 100 characters')
        .trim(),
      email: z.string()
        .email('Please provide a valid email address')
        .toLowerCase()
        .trim(),
      password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
      confirmPassword: z.string()
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"]
    }),

    login: z.object({
      email: z.string()
        .email('Please provide a valid email address')
        .toLowerCase()
        .trim(),
      password: z.string()
        .min(1, 'Password is required')
    })
  };

  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async register(req, res) {
    try {
      console.log('📝 Registration attempt:', { email: req.body.email, fullName: req.body.fullName });

      // Validate input
      const validatedData = AuthController.schemas.register.parse(req.body);

      // Check if user already exists
      const existingUser = await User.findOne({ 
        email: validatedData.email 
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
          code: 'EMAIL_EXISTS'
        });
      }

      // Create new user
      const userData = {
        fullName: validatedData.fullName,
        email: validatedData.email,
        password: validatedData.password
      };

      const user = new User(userData);
      await user.save();

      console.log('✅ User registered successfully:', user.email);

      // Generate JWT token
      const token = AuthMiddleware.generateToken({
        userId: user._id,
        email: user.email,
        role: user.role
      });

      // Update login info
      await user.updateLoginInfo();

      // Return success response (password is automatically excluded by schema)
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          token,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      });

    } catch (error) {
      console.error('❌ Registration error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Email address is already registered',
          code: 'DUPLICATE_EMAIL'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error during registration',
        code: 'REGISTRATION_ERROR'
      });
    }
  }

  /**
   * Login user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async login(req, res) {
    try {
      console.log('🔐 Login attempt:', { email: req.body.email });

      // Validate input
      const validatedData = AuthController.schemas.login.parse(req.body);

      // Find user and include password for comparison
      const user = await User.findOne({ 
        email: validatedData.email
      }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(validatedData.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      console.log('✅ User logged in successfully:', user.email);

      // Generate JWT token
      const token = AuthMiddleware.generateToken({
        userId: user._id,
        email: user.email
      });

      // Update login info
      await user.updateLoginInfo();

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          token,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      });

    } catch (error) {
      console.error('❌ Login error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error during login',
        code: 'LOGIN_ERROR'
      });
    }
  }

  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getProfile(req, res) {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: req.user.toJSON()
        }
      });
    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user profile',
        code: 'PROFILE_ERROR'
      });
    }
  }

  /**
   * Update user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateProfile(req, res) {
    try {
      const allowedUpdates = ['fullName'];
      const updates = {};

      // Filter allowed updates
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid updates provided',
          allowedFields: allowedUpdates
        });
      }

      const user = await User.findByIdAndUpdate(
        req.userId,
        updates,
        { new: true, runValidators: true }
      );

      console.log('✅ Profile updated for user:', user.email);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.toJSON()
        }
      });

    } catch (error) {
      console.error('❌ Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating profile',
        code: 'UPDATE_ERROR'
      });
    }
  }

  /**
   * Logout user (client-side token removal)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async logout(req, res) {
    try {
      console.log('👋 User logged out:', req.user.email);
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during logout',
        code: 'LOGOUT_ERROR'
      });
    }
  }


}

module.exports = AuthController;