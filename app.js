/**
 * Express Application Entry Point
 * Main application file with organized middleware and route configuration
 */

// Load environment variables first
require('dotenv').config();

// Core dependencies
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

// Configuration
const config = require('./config/app.config');
const { connectDB, disconnectDB, checkHealth: checkDBHealth } = require('./config/database');
const { validateEnv } = require('./utils/validateEnv');

// Performance and security middleware
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const responseTime = require('response-time');
const { sanitize: mongoSanitizeObject } = require('express-mongo-sanitize');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

// Socket.IO setup
const { socketAuthMiddleware } = require('./socket/auth');
const { handleConnection } = require('./socket/handlers');

// Route imports
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const audioRoutes = require('./routes/audio');
const friendRoutes = require('./routes/friends');
const privateMessageRoutes = require('./routes/privateMessages');

// Validate environment variables
validateEnv();

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with configuration
const io = socketIo(server, config.socketIO);

// Connect to MongoDB
connectDB();

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

// Performance: Gzip compression for responses
app.use(compression({
  filter: config.compression.filter,
  level: config.compression.level
}));

// Security: HTTP headers protection
app.use(helmet(config.security.helmet));

// Performance: Response time tracking
app.use(responseTime((req, res, time) => {
  if (config.server.env !== 'production') {
    console.log(`${req.method} ${req.url} - ${time.toFixed(2)}ms`);
  }
}));

// Logging: HTTP request logger
app.use(morgan(config.server.env === 'production' ? 'combined' : 'dev'));

// Security: General rate limiting
const limiter = rateLimit(config.rateLimit.general);
app.use(limiter);

// Security: Stricter rate limit for auth routes
const authLimiter = rateLimit(config.rateLimit.auth);

// CORS: Cross-Origin Resource Sharing
app.use(cors(config.cors));

// Body parsing: JSON and URL-encoded with size limits
app.use(express.json({ 
  limit: config.bodyParser.limit,
  verify: (req, res, buf) => {
    req.rawBody = buf; // Store raw body for webhook verification if needed
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: config.bodyParser.limit 
}));

// Security: Cookie parser for secure cookie handling
app.use(cookieParser(config.cookie.secret));

// Security: NoSQL injection prevention (Express 5 compatible)
app.use((req, res, next) => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = mongoSanitizeObject(req.body, {
        replaceWith: config.mongoSanitize.replaceWith,
        onSanitize: ({ key }) => {
          console.warn(`NoSQL injection attempt blocked in body: ${key} (${req.path})`);
        }
      });
    }
    
    // Sanitize request params
    if (req.params) {
      req.params = mongoSanitizeObject(req.params, {
        replaceWith: config.mongoSanitize.replaceWith,
        onSanitize: ({ key }) => {
          console.warn(`NoSQL injection attempt blocked in params: ${key} (${req.path})`);
        }
      });
    }
    
    // Skip req.query (getter-only in Express 5)
    next();
  } catch (error) {
    next(error);
  }
});

// Security: HTTP Parameter Pollution prevention
app.use(hpp(config.security.hpp));

// Static files: Serve public directory
app.use(express.static('public'));

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDBHealth();
    const serverHealth = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
      server: {
        running: true,
        environment: config.server.env,
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      },
      database: dbHealth,
      timestamp: new Date().toISOString()
    };

    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      success: dbHealth.status === 'healthy',
      ...serverHealth
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/auth', authLimiter, authRoutes);           // Authentication & User management (with strict rate limit)
app.use('/api', chatRoutes);                         // Chat/messaging
app.use('/', audioRoutes);                           // Audio uploads
app.use('/friends', friendRoutes);                   // Friend requests
app.use('/private-messages', privateMessageRoutes);  // Private messaging

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (config.server.env !== 'production') {
    console.error(err.stack);
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const firstError = Object.values(err.errors)[0];
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: firstError.message,
      field: firstError.path
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate Error',
      message: 'A record with this information already exists'
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Invalid or expired token'
    });
  }
  
  // Default error response
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: config.server.env === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// ============================================================================
// SOCKET.IO CONFIGURATION
// ============================================================================

// Apply authentication middleware
io.use(socketAuthMiddleware);

// Handle socket connections
io.on('connection', (socket) => handleConnection(socket, io));

// Make Socket.IO instance available to routes
app.set('io', io);

// ============================================================================
// SERVER STARTUP
// ============================================================================

server.listen(config.server.port, config.server.host, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Server successfully started');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`URL:         http://${config.server.host}:${config.server.port}`);
  console.log(`Environment: ${config.server.env}`);
  console.log(`Started at:  ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('');
  console.log('SIGTERM received. Performing graceful shutdown...');
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      await disconnectDB();
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  });

  // Force close after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', async () => {
  console.log('');
  console.log('SIGINT received. Performing graceful shutdown...');
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      await disconnectDB();
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  });

  // Force close after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});

module.exports = app;