const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  momentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Moment',
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  mood: {
    type: String,
    enum: ['calm', 'excited', 'nostalgic', 'peaceful', 'inspired', 'happy', 'contemplative', 'grateful', 'energetic', 'cozy'],
    required: false
  },
  type: {
    type: String,
    enum: ['text', 'image'],
    default: 'text'
  },
  imageUrl: {
    type: String,
    required: false
  },
  reactions: [{
    userId: String,
    type: {
      type: String,
      enum: ['heart', 'smile', 'thoughtful', 'grateful']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
postSchema.index({ momentId: 1, createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 }); // TTL index

// Virtual for reaction count
postSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Virtual for formatted timestamp
postSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
});

// Method to add reaction
postSchema.methods.addReaction = function(userId, reactionType) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => r.userId !== userId);
  
  // Add new reaction
  this.reactions.push({
    userId,
    type: reactionType,
    createdAt: new Date()
  });
  
  return this.save();
};

// Method to remove reaction
postSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.userId !== userId);
  return this.save();
};

// Static method to get posts for a moment
postSchema.statics.getPostsForMoment = function(momentId, limit = 50, skip = 0) {
  return this.find({ 
    momentId, 
    isVisible: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .lean();
};

// Pre-save middleware to validate content
postSchema.pre('save', function(next) {
  if (this.type === 'image' && !this.imageUrl) {
    return next(new Error('Image URL is required for image posts'));
  }
  
  if (this.content.length === 0) {
    return next(new Error('Post content cannot be empty'));
  }
  
  next();
});

module.exports = mongoose.model('Post', postSchema);