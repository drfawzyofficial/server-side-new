const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['password_reset', 'email_verification'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries and auto-cleanup
verificationCodeSchema.index({ email: 1, type: 1 });
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate a random code
verificationCodeSchema.statics.generateCode = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to verify code and delete it after successful verification
verificationCodeSchema.statics.verifyCode = async function(email, code, type, deleteAfterVerify = true) {
  const verification = await this.findOne({
    email: email.toLowerCase(),
    code,
    type,
    expiresAt: { $gt: new Date() }
  });

  if (verification) {
    if (deleteAfterVerify) {
      // Delete the verification code document after successful verification
      await this.deleteOne({ _id: verification._id });
    }
    return true;
  }

  return false;
};

// Static method to get latest code
verificationCodeSchema.statics.getLatestCode = async function(email, type) {
  return this.findOne({
    email: email.toLowerCase(),
    type,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);

