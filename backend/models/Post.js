const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    maxlength: [300, 'Post text cannot exceed 300 characters'],
    trim: true
  },
  mediaUrl: {
    type: String,
    validate: {
      validator: function(url) {
        if (!url) return true; // Optional field
        // Basic URL validation
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
      },
      message: 'Invalid image URL format'
    }
  },
  mediaType: {
    type: String,
    enum: ['photo', 'sketch', null],
    default: null
  },
  mood: {
    type: String,
    required: true,
    enum: ['happy', 'sad', 'excited', 'calm', 'anxious', 'grateful', 'reflective']
  },
  anonymousUserId: {
    type: String,
    required: true
  },
  momentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Moment',
    required: true
  },
  isVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create index for efficient queries
postSchema.index({ momentId: 1, createdAt: -1 });
postSchema.index({ anonymousUserId: 1 });

// Virtual for time ago display
postSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInMs = now - this.createdAt;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
});

// Instance method to sanitize post for public view
postSchema.methods.toPublicJSON = function() {
  const postObject = this.toObject();
  
  // Remove sensitive fields
  delete postObject.__v;
  
  return {
    id: postObject._id,
    text: postObject.text,
    mediaUrl: postObject.mediaUrl,
    mediaType: postObject.mediaType,
    mood: postObject.mood,
    timeAgo: this.timeAgo,
    createdAt: postObject.createdAt
  };
};

// Pre-save middleware to validate post content
postSchema.pre('save', function(next) {
  // Ensure text is not empty after trimming
  if (!this.text || this.text.trim().length === 0) {
    return next(new Error('Post text cannot be empty'));
  }
  
  // If mediaUrl is provided, mediaType should be set
  if (this.mediaUrl && !this.mediaType) {
    this.mediaType = 'photo'; // Default to photo
  }
  
  next();
});

module.exports = mongoose.model('Post', postSchema);