/**
 * Socket.IO Authentication Middleware
 * Handles JWT authentication for socket connections
 */

const { verifyJWTToken } = require('../utils/authUtils');

/**
 * Socket.IO authentication middleware
 * Verifies JWT token and attaches user info to socket
 */
const socketAuthMiddleware = (socket, next) => {
  try {
    // Extract token from handshake
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    // Verify and decode token
    const decoded = verifyJWTToken(token);
    
    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.user = {
      fullname: decoded.fullname,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    console.error('Socket authentication failed:', error.message);
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = { socketAuthMiddleware };

