const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  senderName: {
    type: String,
    required: [true, 'Sender name is required'],
    trim: true
  },
  content: {
    type: String,
    trim: true,
    maxlength: [1000, 'Message content cannot exceed 1000 characters'],
    // Content is optional if it's an audio message
    validate: {
      validator: function(v) {
        // Either content or audioFile must be provided
        return v || this.audioFile;
      },
      message: 'Either content or audio file must be provided'
    }
  },
  messageType: {
    type: String,
    enum: ['text', 'audio'],
    default: 'text'
  },
  audioFile: {
    filename: {
      type: String,
      trim: true
    },
    originalName: {
      type: String,
      trim: true
    },
    mimeType: {
      type: String,
      trim: true
    },
    size: {
      type: Number
    },
    duration: {
      type: Number, // Duration in seconds
      min: 0
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for better query performance
messageSchema.index({ timestamp: -1 });
messageSchema.index({ sender: 1, timestamp: -1 });

// Static method to get recent messages
messageSchema.statics.getRecentMessages = function(limit = 50) {
  return this.find()
    .populate('sender', 'fullname email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get messages by user
messageSchema.statics.getMessagesByUser = function(userId, limit = 50) {
  return this.find({ sender: userId })
    .populate('sender', 'fullname email')
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('Message', messageSchema);
