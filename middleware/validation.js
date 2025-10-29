const { body, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: firstError.msg,
      field: firstError.path
    });
  }
  next();
};

/**
 * Signup validation rules
 */
const validateSignup = [
  body('fullname')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Full name can only contain letters and spaces')
    .escape(), // Prevent XSS

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email is too long'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[0-9]{7,15}$/).withMessage('Please provide a valid phone number')
    .isLength({ min: 7, max: 15 }).withMessage('Phone number must be between 7 and 15 digits'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('password_conf')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Login validation rules
 */
const validateLogin = [
  body('emailOrPhone')
    .trim()
    .notEmpty().withMessage('Email or phone is required')
    .custom((value) => {
      // Check if it's an email or phone
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isPhone = /^\+?[0-9]{7,15}$/.test(value);
      
      if (!isEmail && !isPhone) {
        throw new Error('Please provide a valid email or phone number');
      }
      return true;
    }),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  handleValidationErrors
];

/**
 * Forgot password validation rules
 */
const validateForgotPassword = [
  body('emailOrPhone')
    .trim()
    .notEmpty().withMessage('Email or phone is required')
    .custom((value) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isPhone = /^\+?[0-9]{7,15}$/.test(value);
      
      if (!isEmail && !isPhone) {
        throw new Error('Please provide a valid email or phone number');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Reset password validation rules
 */
const validateResetPassword = [
  body('emailOrPhone')
    .trim()
    .notEmpty().withMessage('Email or phone is required')
    .custom((value) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isPhone = /^\+?[0-9]{7,15}$/.test(value);
      
      if (!isEmail && !isPhone) {
        throw new Error('Please provide a valid email or phone number');
      }
      return true;
    }),

  body('code')
    .trim()
    .notEmpty().withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits')
    .isNumeric().withMessage('Verification code must contain only numbers'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('password_conf')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Verify code validation
 */
const validateVerifyCode = [
  body('emailOrPhone')
    .trim()
    .notEmpty().withMessage('Email or phone is required'),

  body('code')
    .trim()
    .notEmpty().withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits')
    .isNumeric().withMessage('Verification code must contain only numbers'),

  handleValidationErrors
];

/**
 * Update profile validation rules
 */
const validateUpdateProfile = [
  body('fullname')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Full name can only contain letters and spaces')
    .escape(),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email is too long'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9]{7,15}$/).withMessage('Please provide a valid phone number')
    .isLength({ min: 7, max: 15 }).withMessage('Phone number must be between 7 and 15 digits'),

  handleValidationErrors
];

/**
 * Change password validation rules
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Message content validation
 */
const validateMessage = [
  body('content')
    .trim()
    .notEmpty().withMessage('Message content is required')
    .isLength({ min: 1, max: 5000 }).withMessage('Message must be between 1 and 5000 characters')
    .escape(), // Prevent XSS

  handleValidationErrors
];

/**
 * Private message validation
 */
const validatePrivateMessage = [
  body('receiverId')
    .trim()
    .notEmpty().withMessage('Receiver ID is required')
    .isMongoId().withMessage('Invalid receiver ID'),

  body('content')
    .trim()
    .notEmpty().withMessage('Message content is required')
    .isLength({ min: 1, max: 5000 }).withMessage('Message must be between 1 and 5000 characters')
    .escape(),

  handleValidationErrors
];

/**
 * Email verification validation
 */
const validateEmailVerification = [
  body('code')
    .trim()
    .notEmpty().withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits')
    .isNumeric().withMessage('Verification code must contain only numbers'),

  handleValidationErrors
];

module.exports = {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyCode,
  validateUpdateProfile,
  validateChangePassword,
  validateMessage,
  validatePrivateMessage,
  validateEmailVerification,
  handleValidationErrors
};

