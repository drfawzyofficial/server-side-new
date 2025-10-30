/**
 * Authentication Controller
 * Handles user authentication, authorization, and account management
 * @module controllers/authController
 */

const User = require('../models/User');
const { generateJWTToken, formatErrorResponse, formatSuccessResponse } = require('../utils/authUtils');
const { sendVerificationCode, verifyCode } = require('../utils/emailService');
const VerificationCode = require('../models/VerificationCode');

// ============================================================================
// CONSTANTS
// ============================================================================

const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support.',
  VALIDATION_ERROR: 'Validation Error',
  INTERNAL_ERROR: 'Internal Server Error',
  EMAIL_EXISTS: 'An account with this email already exists',
  PHONE_EXISTS: 'An account with this phone already exists',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  INVALID_EMAIL_OR_PHONE: 'Please enter a valid email address or phone number'
};

const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MIN_PASSWORD_LENGTH: 6,
  MIN_PHONE_LENGTH: 7,
  MAX_PHONE_LENGTH: 15
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect if input is email or phone number
 * @param {string} input - Input string to detect
 * @returns {{type: string|null, value: string|null}} Detection result
 */
const detectEmailOrPhone = (input) => {
  if (!input || typeof input !== 'string') {
    return { type: null, value: null };
  }
  
  const trimmed = input.trim();
  
  // Check if it's an email (contains @ and matches email pattern)
  if (trimmed.includes('@')) {
    return { type: 'email', value: trimmed.toLowerCase() };
  }
  
  // Check if it's a phone number (contains only digits, +, -, spaces, parentheses)
  const phonePattern = /^[\d\s\+\-\(\)]+$/;
  if (phonePattern.test(trimmed)) {
    // Remove spaces, dashes, and parentheses for storage
    const cleanedPhone = trimmed.replace(/[\s\-\(\)]/g, '');
    return { type: 'phone', value: cleanedPhone };
  }
  
  return { type: null, value: null };
};

/**
 * Format user data for API response
 * @param {Object} user - User document from database
 * @returns {Object} Formatted user data
 */
const formatUserResponse = (user) => {
  return {
    id: user._id.toString(),
    fullname: user.fullname,
    email: user.email,
    phone: user.phone || null,
    avatar: user.avatar ? `/auth/uploads/avatars/${user.avatar}` : null,
    emailVerified: user.emailVerified || false,
    isActive: user.isActive
  };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, message: string}} Validation result
 */
const validatePassword = (password) => {
  if (!password || password.length < VALIDATION.MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters long`
    };
  }
  return { valid: true, message: '' };
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {{valid: boolean, message: string}} Validation result
 */
const validatePhoneNumber = (phone) => {
  const phoneRegex = new RegExp(`^\\+?[0-9]{${VALIDATION.MIN_PHONE_LENGTH},${VALIDATION.MAX_PHONE_LENGTH}}$`);
  if (!phoneRegex.test(phone.trim())) {
    return {
      valid: false,
      message: 'Please enter a valid phone number'
    };
  }
  return { valid: true, message: '' };
};

// ============================================================================
// AUTHENTICATION CONTROLLERS
// ============================================================================

/**
 * Register a new user account
 * @route POST /auth/signup
 * @access Public
 */
const signup = async (req, res) => {
  try {
    const { fullname, email, phone, password, password_conf } = req.body;
    
    // Validate fullname
    if (!fullname || fullname.trim().length < VALIDATION.MIN_NAME_LENGTH) {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: `Full name must be at least ${VALIDATION.MIN_NAME_LENGTH} characters long`,
        field: 'fullname'
      });
    }

    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: 'Valid email is required',
        field: 'email'
      });
    }

    // Validate phone
    if (!phone || phone.trim() === '') {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: 'Phone number is required',
        field: 'phone'
      });
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: phoneValidation.message,
        field: 'phone'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: passwordValidation.message,
        field: 'password'
      });
    }

    // Validate password confirmation
    if (password !== password_conf) {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.PASSWORDS_DONT_MATCH,
        field: 'password_conf'
      });
    }
    
    // Normalize and check email uniqueness
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
        message: ERROR_MESSAGES.EMAIL_EXISTS
      });
    }
    
    // Check phone uniqueness
    const existingPhone = await User.findOne({ phone: phone.trim() });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        error: 'Phone Already Exists',
        message: ERROR_MESSAGES.PHONE_EXISTS
      });
    }

    // Create and save new user
    const newUser = new User({
      fullname: fullname.trim(),
      email: normalizedEmail,
      password: password,
      phone: phone.trim()
    });

    const savedUser = await newUser.save();
    
    // Send verification code (non-blocking)
    try {
      const code = VerificationCode.generateCode();
      await sendVerificationCode(savedUser.email, code, 'email_verification');
    } catch (emailError) {
      console.error('Error sending verification code during signup:', emailError);
    }
    
    // Generate JWT token
    const token = generateJWTToken(savedUser._id.toString(), {
      email: savedUser.email,
      fullname: savedUser.fullname
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Verification code sent to your email.',
      data: {
        user: formatUserResponse(savedUser),
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
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: firstError.message,
        field: firstError.path
      });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
        message: ERROR_MESSAGES.EMAIL_EXISTS
      });
    }
    
    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Failed to register user'
    });
  }
};

/**
 * Login user with email or phone
 * @route POST /auth/login
 * @access Public
 */
const login = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    
    // Validate email or phone
    if (!emailOrPhone || emailOrPhone.trim() === '') {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: 'Email or phone is required',
        field: 'emailOrPhone'
      });
    }

    // Detect input type
    const { type, value } = detectEmailOrPhone(emailOrPhone);
    if (!type) {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.INVALID_EMAIL_OR_PHONE,
        field: 'emailOrPhone'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: 'Password is required',
        field: 'password'
      });
    }
    
    // Find user
    const user = type === 'email' 
      ? await User.findByEmail(value)
      : await User.findOne({ phone: value });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: ERROR_MESSAGES.INVALID_CREDENTIALS
      });
    }
    
    // Check account status
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account Disabled',
        message: ERROR_MESSAGES.ACCOUNT_DISABLED
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: ERROR_MESSAGES.INVALID_CREDENTIALS
      });
    }
    
    // Update last login timestamp
    await user.updateLastLogin();
    
    // Generate JWT token
    const token = generateJWTToken(user._id.toString(), {
      email: user.email,
      fullname: user.fullname
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserResponse(user),
        token
      }
    });
    
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Login failed'
    });
  }
};

/**
 * Logout user (client-side token removal)
 * @route POST /auth/logout
 * @access Private
 */
const logout = (req, res) => {
  try {
    // With JWT, logout is handled client-side by removing the token
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Logout failed'
    });
  }
};

/**
 * Get current authenticated user profile
 * @route GET /auth/me
 * @access Private
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User Not Found',
        message: ERROR_MESSAGES.USER_NOT_FOUND
      });
    }
    
    res.json({
      success: true,
      data: {
        user: formatUserResponse(user)
      }
    });
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Failed to get user info'
    });
  }
};

// ============================================================================
// PROFILE MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * Update user profile information
 * @route PUT /auth/profile
 * @access Private
 */
const updateProfile = async (req, res) => {
  try {
    const { fullname, email, phone } = req.body;
    const userId = req.userId;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User Not Found',
        message: 'User not found'
      });
    }
    
    // Check if email is being changed: directly update and send verification code
    if (email && email !== user.email) {
      const normalized = email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: normalized });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email Already Exists',
          message: 'An account with this email already exists'
        });
      }
      // Directly update email and set emailVerified to false
      user.email = normalized;
      user.emailVerified = false;
      // Send verification code to new email
      const code = VerificationCode.generateCode();
      await sendVerificationCode(normalized, code, 'email_verification');
    }
    
    // Phone uniqueness and update
    if (phone && phone !== user.phone) {
      const phoneTaken = await User.findOne({ phone: phone.trim() });
      if (phoneTaken) {
        return res.status(400).json({
          success: false,
          error: 'Phone Already Exists',
          message: 'An account with this phone already exists'
        });
      }
      user.phone = phone.trim();
    }

    // Update user data
    if (fullname) user.fullname = fullname.trim();
    
    await user.save();
    
    const emailChanged = email && email.toLowerCase().trim() !== user.email;
    
    res.json({
      success: true,
      message: emailChanged
        ? 'Profile updated. Verification code sent to your new email.'
        : 'Profile updated successfully',
      data: {
        user: {
          id: user._id.toString(),
          fullname: user.fullname,
          email: user.email,
          phone: user.phone || null,
          avatar: user.avatar ? `/auth/uploads/avatars/${user.avatar}` : null,
          emailVerified: !!user.emailVerified
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

/**
 * Change user password
 * @route PUT /auth/change-password
 * @access Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId; // Get from middleware
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Current password and new password are required'
      });
    }
    
    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Password must be at least 6 characters long'
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User Not Found',
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Authentication Error',
        message: 'Current password is incorrect'
      });
    }
    
    // Check if new password is different from current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'New password must be different from current password'
      });
    }
    
    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Error in changePassword:', error);
    
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
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
};

/**
 * Upload or update user avatar
 * @route POST /auth/avatar
 * @access Private
 */
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'No avatar file provided'
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User Not Found',
        message: 'User not found'
      });
    }
    
    // Delete old avatar if exists
    if (user.avatar) {
      const { deleteAvatarFile } = require('../config/avatarStorage');
      deleteAvatarFile(user.avatar);
    }
    
    // Update user with new avatar filename
    user.avatar = req.file.filename;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: `/auth/uploads/avatars/${req.file.filename}`
      }
    });
    
  } catch (error) {
    console.error('Error uploading avatar:', error);
    
    // Delete uploaded file if user update fails
    if (req.file) {
      const { deleteAvatarFile } = require('../config/avatarStorage');
      deleteAvatarFile(req.file.filename);
    }
    
    if (error.message && error.message.includes('Only image files')) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message
      });
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'File size too large. Maximum size is 5MB'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to upload avatar'
    });
  }
};

// ============================================================================
// PASSWORD RESET CONTROLLERS
// ============================================================================

/**
 * Request password reset (send verification code)
 * @route POST /auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { emailOrPhone } = req.body;

    if (!emailOrPhone || emailOrPhone.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Email or phone is required'
      });
    }

    // Detect if input is email or phone
    const { type, value } = detectEmailOrPhone(emailOrPhone);
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Please enter a valid email address or phone number'
      });
    }

    // Find user by email or phone
    let user;
    if (type === 'email') {
      user = await User.findByEmail(value);
    } else {
      user = await User.findOne({ phone: value });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'No account found with this email or phone'
      });
    }

    const code = VerificationCode.generateCode();
    // Send code to user's email
    await sendVerificationCode(user.email, code, 'password_reset');

    res.json({
      success: true,
      message: 'Password reset code sent to your email'
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to send reset code'
    });
  }
};

/**
 * Verify password reset code
 * @route POST /auth/verify-reset-code
 * @access Public
 */
const verifyResetCode = async (req, res) => {
  try {
    const { emailOrPhone, code } = req.body;

    if (!emailOrPhone || !code) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Email or phone and code are required'
      });
    }

    // Detect if input is email or phone
    const { type, value } = detectEmailOrPhone(emailOrPhone);
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Please enter a valid email address or phone number'
      });
    }

    // Find user and get email for code verification
    let user;
    if (type === 'email') {
      user = await User.findByEmail(value);
    } else {
      user = await User.findOne({ phone: value });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'No account found with this email or phone'
      });
    }
    
    const isValidCode = await verifyCode(user.email, code, 'password_reset', false);
    if (!isValidCode) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Code',
        message: 'Reset code is invalid or expired'
      });
    }

    res.json({
      success: true,
      message: 'Code verified successfully'
    });
  } catch (error) {
    console.error('Error verifying reset code:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to verify code'
    });
  }
};

/**
 * Reset password with verification code
 * @route POST /auth/reset-password
 * @access Public
 */
const resetPassword = async (req, res) => {
  try {
    const { emailOrPhone, code, newPassword, password_conf } = req.body; 

    // Validate all required fields
    if (!emailOrPhone || !code || !newPassword || !password_conf) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Email or phone, code, new password, and password confirmation are required'
      });
    }

    // Detect if input is email or phone
    const { type, value } = detectEmailOrPhone(emailOrPhone);
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Please enter a valid email address or phone number'
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Validate password and confirmation match
    if (newPassword !== password_conf) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Password and password confirmation do not match'
      });
    }

    // Find user by email or phone
    let user;
    if (type === 'email') {
      user = await User.findByEmail(value);
    } else {
      user = await User.findOne({ phone: value });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Verify the reset code using user's email
    const isValidCode = await verifyCode(user.email, code, 'password_reset', false);
    if (!isValidCode) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Code',
        message: 'Reset code is invalid or expired'
      });
    }

    // Update the password in MongoDB
    user.password = newPassword;
    await user.save();
    
    // Delete the verification code after successful password reset
    const VerificationCode = require('../models/VerificationCode');
    await VerificationCode.deleteOne({
      email: user.email.toLowerCase(),
      code,
      type: 'password_reset'
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to reset password'
    });
  }
};

// ============================================================================
// ACCOUNT MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * Delete user account and all associated data
 * @route DELETE /auth/account
 * @access Private
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Import all necessary models
    const Message = require('../models/Message');
    const PrivateMessage = require('../models/PrivateMessage');
    const Conversation = require('../models/Conversation');
    const FriendRequest = require('../models/FriendRequest');
    const VerificationCode = require('../models/VerificationCode');
    const { deleteAvatarFile } = require('../config/avatarStorage');
    const { deleteAudioFile } = require('../config/audioStorage');

    // Delete all messages sent by user
    const userMessages = await Message.find({ sender: userId });
    for (const message of userMessages) {
      // Delete audio files if message has audio
      if (message.messageType === 'audio' && message.audioFile?.filename) {
        deleteAudioFile(message.audioFile.filename);
      }
    }
    await Message.deleteMany({ sender: userId });

      // Delete all private messages where user is a participant (sent or received)
    const userConversations = await Conversation.find({ participants: userId }).select('_id');
    const conversationIds = userConversations.map(c => c._id);
    if (conversationIds.length) {
      const allPrivateMessages = await PrivateMessage.find({ conversation: { $in: conversationIds } });
      for (const pm of allPrivateMessages) {
        // Delete audio files if message has audio
        if (pm.messageType === 'audio' && pm.audioFile?.filename) {
          deleteAudioFile(pm.audioFile.filename);
        }
      }
      await PrivateMessage.deleteMany({ conversation: { $in: conversationIds } });
    }

    // Delete conversations where user is a participant
    await Conversation.deleteMany({ participants: userId });

    // Delete friend requests where user is sender or receiver
    await FriendRequest.deleteMany({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    });

    // Delete avatar file if exists
    if (user.avatar) {
      deleteAvatarFile(user.avatar);
    }

    // Delete verification codes for user's email
    await VerificationCode.deleteMany({
      email: user.email.toLowerCase()
    });

    // Finally, delete the user account
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete account'
    });
  }
};

// ============================================================================
// EMAIL VERIFICATION CONTROLLERS
// ============================================================================

/**
 * Send email verification code to user
 * @route POST /auth/send-email-verification
 * @access Private
 */
const sendEmailVerification = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User Not Found', message: 'User not found' });
    }
    const code = VerificationCode.generateCode();
    await sendVerificationCode(user.email, code, 'email_verification');
    res.json({ success: true, message: `Verification code sent to ${user.email}` });
  } catch (error) {
    console.error('Error sending email verification:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to send verification code' });
  }
};

/**
 * Verify email address with verification code
 * @route POST /auth/verify-email
 * @access Private
 */
const verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User Not Found', message: 'User not found' });
    }
    if (!user.email) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'No email to verify' });
    }
    const isValidCode = await verifyCode(user.email, code, 'email_verification', true);
    if (!isValidCode) {
      return res.status(400).json({ success: false, error: 'Invalid Code', message: 'Verification code is invalid or expired' });
    }
    // Set emailVerified to true (code is already deleted by verifyCode)
    user.emailVerified = true;
    await user.save();
    res.json({ success: true, message: 'Email verified successfully', data: { email: user.email } });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to verify email' });
  }
};

// ============================================================================
// FILE SERVING CONTROLLERS
// ============================================================================

/**
 * Securely serve avatar files
 * @route GET /auth/uploads/avatars/:filename
 * @access Private
 */
const serveAvatar = (req, res) => {
  try {
    const { filename } = req.params;
    const path = require('path');
    const fs = require('fs');

    // Whitelist filename characters to prevent traversal
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid filename'
      });
    }

    // Enforce image extensions only
    if (!/\.(png|jpe?g|gif|webp)$/i.test(filename)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Unsupported file type'
      });
    }

    const AVATAR_DIR = path.resolve(__dirname, '..', 'uploads', 'avatars');
    const finalPath = path.resolve(AVATAR_DIR, filename);

    // Ensure the resolved path stays within the avatars directory
    if (!finalPath.startsWith(AVATAR_DIR + path.sep)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid path'
      });
    }

    if (!fs.existsSync(finalPath)) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Avatar file not found'
      });
    }

    res.set('Cache-Control', 'private, max-age=86400'); // 1 day, private since it's behind auth
    res.type(path.extname(finalPath));
    res.sendFile(finalPath, (err) => {
      if (err) {
        console.error('Error serving avatar file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to serve avatar'
          });
        }
      }
    });
  } catch (error) {
    console.error('Error in serveAvatar:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to serve avatar'
      });
    }
  }
};

// ============================================================================
// USER MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * Get all users except the current user
 * @route GET /auth/users
 * @access Private
 */
const getUsers = async (req, res) => {
  try {
    // Fetch all users except the currently authenticated user
    const users = await User.find(
      { _id: { $ne: req.userId } }, 
      'fullname email phone avatar isActive createdAt lastLogin emailVerified'
    ).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user._id.toString(),
          fullname: user.fullname,
          email: user.email,
          phone: user.phone || null,
          avatar: user.avatar ? `/auth/uploads/avatars/${user.avatar}` : null,
          isActive: user.isActive,
          emailVerified: user.emailVerified || false,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        })),
        total: users.length
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch users'
    });
  }
};

module.exports = {
  signup,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
  uploadAvatar,
  serveAvatar,
  sendEmailVerification,
  verifyEmail,
  deleteAccount,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  getUsers
};
