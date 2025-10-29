const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PrivateMessage',
    default: null
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

// Ensure only 2 participants in a conversation
conversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Conversation must have exactly 2 participants'));
  }
  next();
});

// Ensure unique conversations between two users
conversationSchema.index({ participants: 1 }, { unique: true });

// Static method to find or create conversation
conversationSchema.statics.findOrCreate = async function(userId1, userId2) {
  const sortedParticipants = [userId1, userId2].sort();
  
  let conversation = await this.findOne({
    participants: { $all: sortedParticipants }
  });

  if (!conversation) {
    conversation = new this({
      participants: sortedParticipants
    });
    await conversation.save();
  }

  return conversation;
};

// Static method to find conversation between two users
conversationSchema.statics.findBetween = function(userId1, userId2) {
  const sortedParticipants = [userId1, userId2].sort();
  return this.findOne({
    participants: { $all: sortedParticipants }
  }).populate('participants', 'fullname email');
};

// Static method to find all conversations for a user
conversationSchema.statics.findForUser = function(userId) {
  return this.find({
    participants: userId
  }).populate('participants', 'fullname email')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });
};

module.exports = mongoose.model('Conversation', conversationSchema);

