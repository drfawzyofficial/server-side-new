const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending'
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
friendRequestSchema.index({ sender: 1, receiver: 1 });
friendRequestSchema.index({ status: 1 });

// Prevent duplicate friend requests
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

// Static method to check if users are already friends
friendRequestSchema.statics.getExistingRelationship = async function(senderId, receiverId) {
  return this.findOne({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId }
    ]
  });
};

// Static method to find pending requests for a user
friendRequestSchema.statics.findPendingForUser = function(userId) {
  return this.find({
    receiver: userId,
    status: 'pending'
  }).populate('sender', 'fullname email').sort({ createdAt: -1 });
};

// Static method to find friends for a user
friendRequestSchema.statics.findFriends = function(userId) {
  return this.find({
    $or: [
      { sender: userId, status: 'accepted' },
      { receiver: userId, status: 'accepted' }
    ]
  }).populate('sender', 'fullname email').populate('receiver', 'fullname email').sort({ updatedAt: -1 });
};

module.exports = mongoose.model('FriendRequest', friendRequestSchema);

