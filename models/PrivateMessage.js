const mongoose = require('mongoose');

const privateMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  content: {
    type: String,
    required: function() {
      return this.messageType !== 'audio';
    }
  },
  messageType: {
    type: String,
    enum: ['text', 'audio'],
    default: 'text'
  },
  audioFile: {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    duration: Number
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
privateMessageSchema.index({ conversation: 1, timestamp: -1 });
privateMessageSchema.index({ sender: 1 });
privateMessageSchema.index({ read: 1 });

// Static method to get messages for a conversation
privateMessageSchema.statics.getMessagesForConversation = function(conversationId, limit = 50) {
  return this.find({ conversation: conversationId })
    .populate('sender', 'fullname email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

module.exports = mongoose.model('PrivateMessage', privateMessageSchema);

