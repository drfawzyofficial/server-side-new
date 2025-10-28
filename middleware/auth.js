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
      email: decoded.email,
      role: decoded.role
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

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: 'User not authenticated'
      });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Authorization Error',
        message: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin authorization middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authorization failed'
    });
  }
};

module.exports = {
  authenticateUser,
  requireAdmin
};
