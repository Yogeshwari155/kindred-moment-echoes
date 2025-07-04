const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  momentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Moment',
    required: true
  },
  anonymousUserId: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Chat message cannot exceed 500 characters'],
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'emoji', 'system'],
    default: 'text'
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create TTL index for automatic message cleanup
chatMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create index for efficient queries
chatMessageSchema.index({ momentId: 1, createdAt: -1 });

// Virtual for time display
chatMessageSchema.virtual('timeDisplay').get(function() {
  return this.createdAt.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
});

// Instance method to format for real-time transmission
chatMessageSchema.methods.toSocketJSON = function() {
  return {
    id: this._id,
    message: this.message,
    messageType: this.messageType,
    timeDisplay: this.timeDisplay,
    createdAt: this.createdAt
  };
};

// Static method to get recent messages for a moment
chatMessageSchema.statics.getRecentMessages = function(momentId, limit = 50) {
  return this.find({ 
    momentId,
    expiresAt: { $gt: new Date() }
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);