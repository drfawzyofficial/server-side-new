const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT secret key (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'ccecf8308c32c0cf0680c6d741af1c651984ffc9ffd94672b45aa43e9634';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateJWTToken = (userId, userData) => {
  const payload = {
    userId: userId,
    email: userData.email,
    role: userData.role,
    fullname: userData.fullname
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token
const verifyJWTToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Generate a random ID
const generateId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitize input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// Format error response
const formatErrorResponse = (error, message = 'An error occurred') => {
  return {
    success: false,
    error: error.name || 'Error',
    message: error.message || message,
    ...(error.field && { field: error.field }),
    ...(error.statusCode && { statusCode: error.statusCode })
  };
};

// Format success response
const formatSuccessResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};

module.exports = {
  generateJWTToken,
  verifyJWTToken,
  generateId,
  isValidEmail,
  sanitizeInput,
  formatErrorResponse,
  formatSuccessResponse
};
