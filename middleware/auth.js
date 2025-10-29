const { verifyJWTToken } = require('../utils/authUtils');

// Authentication middleware
const authenticateUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: 'No token provided'
      });
    }
    
    // Verify JWT token
    const decoded = verifyJWTToken(token);
    
    // Add user info to request object
    req.user = {
      fullname: decoded.fullname,
      email: decoded.email
    };
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }
};

module.exports = {
  authenticateUser
};
