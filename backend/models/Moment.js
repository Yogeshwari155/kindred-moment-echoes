const mongoose = require('mongoose');

const momentSchema = new mongoose.Schema({
  location: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  participants: [{
    userId: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  }],
  moodSummary: {
    totalVotes: {
      type: Number,
      default: 0
    },
    moods: {
      type: Map,
      of: Number,
      default: new Map()
    },
    dominantMoods: [{
      mood: String,
      emoji: String,
      percentage: Number
    }]
  },
  stats: {
    totalPosts: {
      type: Number,
      default: 0
    },
    peakParticipants: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 24 * 60 * 60 // 24 hours in seconds
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
momentSchema.index({ 'location.coordinates.latitude': 1, 'location.coordinates.longitude': 1 });
momentSchema.index({ isActive: 1, createdAt: -1 });
momentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 }); // TTL index

// Virtual for participant count
momentSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for active participants (active in last 10 minutes)
momentSchema.virtual('activeParticipantCount').get(function() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  return this.participants.filter(p => p.lastActive > tenMinutesAgo).length;
});

// Method to add participant
momentSchema.methods.addParticipant = function(userId) {
  const existingParticipant = this.participants.find(p => p.userId === userId);
  
  if (!existingParticipant) {
    this.participants.push({
      userId,
      joinedAt: new Date(),
      lastActive: new Date()
    });
    
    // Update peak participants
    if (this.participants.length > this.stats.peakParticipants) {
      this.stats.peakParticipants = this.participants.length;
    }
  } else {
    // Update last active time
    existingParticipant.lastActive = new Date();
  }
  
  return this.save();
};

// Method to remove participant
momentSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.userId !== userId);
  return this.save();
};

// Method to update mood summary
momentSchema.methods.updateMoodSummary = function() {
  const moodCounts = {};
  let totalVotes = 0;
  
  // Count moods from the Map
  for (const [mood, count] of this.moodSummary.moods) {
    moodCounts[mood] = count;
    totalVotes += count;
  }
  
  // Calculate dominant moods (top 3)
  const sortedMoods = Object.entries(moodCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([mood, count]) => ({
      mood,
      emoji: getMoodEmoji(mood),
      percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
    }));
  
  this.moodSummary.totalVotes = totalVotes;
  this.moodSummary.dominantMoods = sortedMoods;
  
  return this.save();
};

// Helper function to get emoji for mood
function getMoodEmoji(mood) {
  const moodEmojis = {
    calm: '🫶',
    excited: '🤩',
    nostalgic: '💭',
    peaceful: '😌',
    inspired: '✨',
    happy: '😊',
    contemplative: '🤔',
    grateful: '🙏',
    energetic: '⚡',
    cozy: '☕'
  };
  return moodEmojis[mood] || '😊';
}

// Pre-save middleware to update timestamps
momentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Moment', momentSchema);