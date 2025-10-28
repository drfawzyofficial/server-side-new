const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// GET /api/messages - Get all messages (requires JWT)
router.get('/messages', authenticateUser, async (req, res) => {
  try {
    console.log('Fetching messages for user:', req.user.fullname);
    const limit = parseInt(req.query.limit) || 50;
    const messages = await Message.getRecentMessages(limit);
    
    console.log('Found messages:', messages.length);
    
    // Add audio URLs to messages and convert to plain objects
    const messagesWithUrls = messages.map(message => {
      const messageObj = message.toObject ? message.toObject() : message;
      if (messageObj.messageType === 'audio' && messageObj.audioFile) {
        messageObj.audioFile.url = `/uploads/audio/${messageObj.audioFile.filename}`;
      }
      return messageObj;
    });
    
    res.json({
      success: true,
      data: messagesWithUrls.reverse(), // Reverse to show oldest first
      count: messagesWithUrls.length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch messages'
    });
  }
});

// POST /api/messages - Create a new message (requires JWT)
router.post('/messages', authenticateUser, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Message content is required'
      });
    }
    
    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Message content cannot exceed 1000 characters'
      });
    }
    
    // Create new message
    const message = new Message({
      sender: req.userId,
      senderName: req.user.fullname,
      content: content.trim()
    });
    
    await message.save();
    
    // Emit to Socket.IO clients
    const io = req.app.get('io');
    if (io) {
      io.to('general').emit('receiveMessage', {
        id: message._id,
        sender: req.userId,
        senderName: req.user.fullname,
        content: message.content,
        timestamp: message.timestamp
      });
    }
    
    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to send message'
    });
  }
});

// GET /api/users/online - Get online users (requires JWT)
router.get('/users/online', authenticateUser, async (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Socket.IO not available'
      });
    }
    
    // Get connected sockets
    const connectedSockets = await io.fetchSockets();
    const onlineUsers = connectedSockets.map(socket => ({
      id: socket.userId,
      fullname: socket.user.fullname,
      email: socket.user.email,
      socketId: socket.id
    }));
    
    res.json({
      success: true,
      data: onlineUsers,
      count: onlineUsers.length
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch online users'
    });
  }
});

module.exports = router;
