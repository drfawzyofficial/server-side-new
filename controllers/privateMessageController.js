const Conversation = require('../models/Conversation');
const PrivateMessage = require('../models/PrivateMessage');
const FriendRequest = require('../models/FriendRequest');

// Send private message
const sendPrivateMessage = async (req, res) => {
  try {
    const senderId = req.userId;
    const { receiverId, content, messageType = 'text' } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Receiver ID is required'
      });
    }

    if (!content && messageType === 'text') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Message content is required'
      });
    }

    // Check if users are friends
    const friendship = await FriendRequest.getExistingRelationship(senderId, receiverId);
    if (!friendship || friendship.status !== 'accepted') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only message your friends'
      });
    }

    // Find or create conversation
    const conversation = await Conversation.findOrCreate(senderId, receiverId);

    // Create message
    const message = new PrivateMessage({
      sender: senderId,
      conversation: conversation._id,
      content,
      messageType
    });

    await message.save();

    // Update conversation's last message
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Populate for response
    await message.populate('sender', 'fullname email');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });

  } catch (error) {
    console.error('Error sending private message:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to send message'
    });
  }
};

// Get conversation messages
const getConversationMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { otherUserId } = req.params;

    // Check if users are friends
    const friendship = await FriendRequest.getExistingRelationship(userId, otherUserId);
    if (!friendship || friendship.status !== 'accepted') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only view messages with your friends'
      });
    }

    // Find conversation
    const conversation = await Conversation.findBetween(userId, otherUserId);
    
    if (!conversation) {
      return res.json({
        success: true,
        data: { messages: [] }
      });
    }

    // Get messages
    const limit = parseInt(req.query.limit) || 50;
    const messages = await PrivateMessage.getMessagesForConversation(conversation._id, limit);

    res.json({
      success: true,
      data: { messages: messages.reverse() }
    });

  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch messages'
    });
  }
};

// Get all conversations for user
const getConversations = async (req, res) => {
  try {
    const userId = req.userId;

    const conversations = await Conversation.findForUser(userId);

    res.json({
      success: true,
      data: { conversations }
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch conversations'
    });
  }
};

module.exports = {
  sendPrivateMessage,
  getConversationMessages,
  getConversations
};

