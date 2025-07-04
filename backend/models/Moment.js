const mongoose = require('mongoose');

const momentSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates format'
      }
    }
  },
  timeWindow: {
    start: {
      type: Date,
      required: true,
      default: Date.now
    },
    end: {
      type: Date,
      required: true,
      default: function() {
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      }
    }
  },
  participants: [{
    anonymousId: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  moodSummary: {
    happy: { type: Number, default: 0 },
    sad: { type: Number, default: 0 },
    excited: { type: Number, default: 0 },
    calm: { type: Number, default: 0 },
    anxious: { type: Number, default: 0 },
    grateful: { type: Number, default: 0 },
    reflective: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create geospatial index for location-based queries
momentSchema.index({ location: '2dsphere' });

// Create TTL index for automatic cleanup after 24 hours
momentSchema.index({ 'timeWindow.end': 1 }, { expireAfterSeconds: 0 });

// Virtual for checking if moment is expired
momentSchema.virtual('isExpired').get(function() {
  return new Date() > this.timeWindow.end;
});

// Instance method to add participant
momentSchema.methods.addParticipant = function(anonymousId) {
  const existingParticipant = this.participants.find(p => p.anonymousId === anonymousId);
  if (!existingParticipant) {
    this.participants.push({ anonymousId });
  }
  return this.save();
};

// Instance method to update mood
momentSchema.methods.updateMood = function(mood) {
  if (this.moodSummary[mood] !== undefined) {
    this.moodSummary[mood]++;
    this.moodSummary.total++;
  }
  return this.save();
};

// Static method to find nearby moments
momentSchema.statics.findNearby = function(longitude, latitude, radiusInMeters = 50) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radiusInMeters
      }
    },
    isActive: true,
    'timeWindow.end': { $gt: new Date() }
  });
};

module.exports = mongoose.model('Moment', momentSchema);