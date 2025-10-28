// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const { connectDB } = require('./config/database');

// Import individual route files
const authRoutes = require('./routes/auth');
const sentimentRoutes = require('./routes/sentiment');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const audioRoutes = require('./routes/audio');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000', 'file://'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'file://'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount routes
app.use('/auth', authRoutes);
app.use('/', sentimentRoutes); // Sentiment routes (analyze, analyze-batch)
app.use('/', userRoutes); // User routes (users)
app.use('/api', chatRoutes); // Chat routes (messages, users/online)
app.use('/', audioRoutes); // Audio routes (upload-audio, uploads/audio)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
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
  
  // Default error response
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Socket.IO authentication middleware
const { verifyJWTToken } = require('./utils/authUtils');

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  try {
    const decoded = verifyJWTToken(token);
    socket.userId = decoded.userId;
    socket.user = {
      fullname: decoded.fullname,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.user.fullname} connected with socket ID: ${socket.id}`);
  
  // Join user to a general chat room
  socket.join('general');
  
  // Handle new message
  socket.on('sendMessage', async (data) => {
    try {
      console.log('Received message from', socket.user.fullname, ':', data.content);
      const Message = require('./models/Message');
      const User = require('./models/User');
      
      // Create new message
      const message = new Message({
        sender: socket.userId,
        senderName: socket.user.fullname,
        content: data.content
      });
      
      await message.save();
      console.log('Message saved to database:', message._id);
      
      // Broadcast message to all connected users
      io.to('general').emit('receiveMessage', {
        id: message._id,
        sender: socket.userId,
        senderName: socket.user.fullname,
        content: message.content,
        messageType: message.messageType,
        timestamp: message.timestamp
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.fullname} disconnected`);
  });
});

// Make io available to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📚 Error handling examples available at:`);
  console.log(`   - http://${HOST}:${PORT}/error`);
  console.log(`   - http://${HOST}:${PORT}/async-error`);
  
  // Display environment variables (masked)
  console.log(`🔧 Environment Configuration:`);
  console.log(`==================================================`);
  console.log(`📡 Server Configuration:`);
  console.log(`   PORT: ${PORT}`);
  console.log(`   HOST: ${HOST}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Security Variables:`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '***' + process.env.JWT_SECRET.slice(-4) : 'Not set'}`);
  console.log(`   JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN || 'Not set'}`);
  console.log(`🗄️  Database Configuration:`);
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'Not set'}`);
  console.log(`🤖 Flask AI Server:`);
  console.log(`   FLASK_SERVER_URL: ${process.env.FLASK_SERVER_URL || 'Not set'}`);
  console.log(`==================================================`);
  console.log(`✅ Server initialized successfully!`);
});

module.exports = app;