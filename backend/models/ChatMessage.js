const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  momentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Moment',
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['message', 'join', 'leave', 'system'],
    default: 'message'
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 24 * 60 * 60 // 24 hours in seconds
  }
}, {
  timestamps: true
});

// Indexes for performance
chatMessageSchema.index({ momentId: 1, createdAt: -1 });
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 }); // TTL index

// Static method to get recent messages for a moment
chatMessageSchema.statics.getRecentMessages = function(momentId, limit = 50) {
  return this.find({ 
    momentId, 
    isVisible: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .lean();
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);