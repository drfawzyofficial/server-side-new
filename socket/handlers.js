/**
 * Socket.IO Event Handlers
 * Centralized socket event handling for real-time communication
 */

const Message = require('../models/Message');
const PrivateMessage = require('../models/PrivateMessage');
const Conversation = require('../models/Conversation');
const FriendRequest = require('../models/FriendRequest');

/**
 * Handle user connection
 */
const handleConnection = (socket, io) => {
  console.log(`User ${socket.user.fullname} connected (Socket ID: ${socket.id})`);
  
  // Join user to general chat room
  socket.join('general');
  
  // Join user to their own private room for direct messaging
  socket.join(socket.userId);
  
  // Register event handlers
  handleSendMessage(socket, io);
  handleSendPrivateMessage(socket, io);
  handleDisconnect(socket);
};

/**
 * Handle sending messages to general chat
 */
const handleSendMessage = (socket, io) => {
  socket.on('sendMessage', async (data) => {
    try {
      console.log(`Message from ${socket.user.fullname}:`, data.content?.substring(0, 50) || '[no content]');
      
      // Validate message data
      if (!data.content || typeof data.content !== 'string') {
        socket.emit('error', { message: 'Invalid message content' });
        return;
      }
      
      // Create new message
      const message = new Message({
        sender: socket.userId,
        senderName: socket.user.fullname,
        content: data.content
      });
      
      await message.save();
      console.log(`Message saved (ID: ${message._id})`);
      
      // Broadcast message to all connected users in general chat
      io.to('general').emit('receiveMessage', {
        id: message._id,
        sender: socket.userId,
        senderName: socket.user.fullname,
        content: message.content,
        messageType: message.messageType,
        timestamp: message.timestamp
      });
      
    } catch (error) {
      console.error('Error sending message:', error.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
};

/**
 * Handle sending private messages between friends
 */
const handleSendPrivateMessage = (socket, io) => {
  socket.on('sendPrivateMessage', async (data) => {
    try {
      const { receiverId, content } = data;
      
      // Validate input
      if (!receiverId || !content || typeof content !== 'string') {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }
      
      console.log(`Private message from ${socket.user.fullname} to ${receiverId}`);
      
      // Check if users are friends
      const friendship = await FriendRequest.getExistingRelationship(socket.userId, receiverId);
      if (!friendship || friendship.status !== 'accepted') {
        socket.emit('error', { message: 'You can only message your friends' });
        return;
      }
      
      // Find or create conversation
      const conversation = await Conversation.findOrCreate(socket.userId, receiverId);
      
      // Create private message
      const message = new PrivateMessage({
        sender: socket.userId,
        conversation: conversation._id,
        content,
        messageType: 'text'
      });
      
      await message.save();
      
      // Update conversation with latest message
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();
      await conversation.save();
      
      // Prepare message data for emission
      const messageData = {
        id: message._id,
        conversation: conversation._id,
        sender: socket.userId,
        senderName: socket.user.fullname,
        receiver: receiverId,
        content: message.content,
        timestamp: message.timestamp
      };
      
      // Send to sender (confirmation)
      socket.emit('receivePrivateMessage', messageData);
      
      // Send to receiver
      io.to(receiverId).emit('receivePrivateMessage', messageData);
      
      console.log(`Private message sent (ID: ${message._id})`);
      
    } catch (error) {
      console.error('Error sending private message:', error.message);
      socket.emit('error', { message: 'Failed to send private message' });
    }
  });
};

/**
 * Handle user disconnection
 */
const handleDisconnect = (socket) => {
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.fullname} disconnected (Socket ID: ${socket.id})`);
  });
};

module.exports = {
  handleConnection
};

