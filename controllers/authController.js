const User = require('../models/User');
const { generateJWTToken, formatErrorResponse, formatSuccessResponse } = require('../utils/authUtils');

// Validation functions
const validateSignup = (data) => {
  const errors = {};
  
  if (!data.fullname || data.fullname.trim().length < 2) {
    errors.fullname = 'Full name must be at least 2 characters long';
  }
  
  if (!data.email || !data.email.includes('@')) {
    errors.email = 'Valid email is required';
  }
  
  if (!data.password || data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long';
  }
  
  if (data.password !== data.password_conf) {
    errors.password_conf = 'Passwords do not match';
  }
  
  if (Object.keys(errors).length > 0) {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    error.errors = errors;
    error.field = Object.keys(errors)[0];
    error.statusCode = 400;
    throw error;
  }
};

const validateLogin = (data) => {
  const errors = {};
  
  if (!data.email || !data.email.includes('@')) {
    errors.email = 'Valid email is required';
  }
  
  if (!data.password || data.password.length < 6) {
    errors.password = 'Password is required';
  }
  
  if (Object.keys(errors).length > 0) {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    error.errors = errors;
    error.field = Object.keys(errors)[0];
    error.statusCode = 400;
    throw error;
  }
};

// Controller functions
const signup = async (req, res) => {
  try {
    const { fullname, email, password, password_conf } = req.body;
    
    // Basic validation
    if (!fullname || fullname.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Full name must be at least 2 characters long',
        field: 'fullname'
      });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Valid email is required',
        field: 'email'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Password must be at least 6 characters long',
        field: 'password'
      });
    }

    if (password !== password_conf) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Passwords do not match',
        field: 'password_conf'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }
    
    // Create new user with Mongoose validation
    const newUser = new User({
      fullname: fullname.trim(),
      email: email.toLowerCase().trim(),
      password: password
    });

    // Save user to MongoDB (password will be hashed by pre-save middleware)
    const savedUser = await newUser.save();
    
    // Generate JWT token
    const token = generateJWTToken(savedUser._id.toString(), {
      email: savedUser.email,
      role: savedUser.role,
      fullname: savedUser.fullname
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: savedUser._id.toString(),
          fullname: savedUser.fullname,
          email: savedUser.email,
          role: savedUser.role
        },
        token
      }
    });
    
  } catch (error) {
    console.error('Error in signup:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: firstError.message,
        field: firstError.path
      });
    }
    
    // Handle duplicate key error (unique email)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Valid email is required',
        field: 'email'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Password is required',
        field: 'password'
      });
    }
    
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: 'Invalid email or password'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account Disabled',
        message: 'Your account has been disabled. Please contact support.'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: 'Invalid email or password'
      });
    }
    
    // Update last login
    await user.updateLastLogin();
    
    // Generate JWT token
    const token = generateJWTToken(user._id.toString(), {
      email: user.email,
      role: user.role,
      fullname: user.fullname
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id.toString(),
          fullname: user.fullname,
          email: user.email,
          role: user.role
        },
        token
      }
    });
    
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
};

const logout = (req, res) => {
  try {
    // With JWT, logout is handled client-side by removing the token
    // No server-side session to remove
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Logout failed'
    });
  }
};

const getCurrentUser = (req, res) => {
  try {
    // User info is already available from middleware
    res.json({
      success: true,
      data: {
        user: {
          id: req.userId,
          fullname: req.user.fullname,
          email: req.user.email,
          role: req.user.role
        }
      }
    });
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get user info'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullname, email, currentPassword, newPassword } = req.body;
    const userId = req.userId; // Get from middleware
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User Not Found',
        message: 'User not found'
      });
    }
    
    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email Already Exists',
          message: 'An account with this email already exists'
        });
      }
    }
    
    // If password is being changed, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Current password is required to change password'
        });
      }
      
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Authentication Error',
          message: 'Current password is incorrect'
        });
      }
    }
    
    // Update user data
    if (fullname) user.fullname = fullname.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (newPassword) user.password = newPassword; // Will be hashed by pre-save middleware
    
    await user.save();
    
    // Update session
    session.user.fullname = user.fullname;
    session.user.email = user.email;
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id.toString(),
          fullname: user.fullname,
          email: user.email
        }
      }
    });
    
  } catch (error) {
    console.error('Error in updateProfile:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: firstError.message,
        field: firstError.path
      });
    }
    
    // Handle duplicate key error (unique email)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Email Already Exists',
        message: 'An account with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
};

module.exports = {
  signup,
  login,
  logout,
  getCurrentUser,
  updateProfile
};
