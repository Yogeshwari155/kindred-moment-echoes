const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  momentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Moment',
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  mood: {
    type: String,
    enum: ['calm', 'excited', 'nostalgic', 'peaceful', 'inspired', 'happy', 'contemplative', 'grateful', 'energetic', 'cozy'],
    required: true
  },
  intensity: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
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
moodSchema.index({ momentId: 1, userId: 1 }, { unique: true }); // One mood per user per moment
moodSchema.index({ momentId: 1, createdAt: -1 });
moodSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 }); // TTL index

// Static method to get mood summary for a moment
moodSchema.statics.getMoodSummary = async function(momentId) {
  const pipeline = [
    { $match: { momentId: mongoose.Types.ObjectId(momentId) } },
    {
      $group: {
        _id: '$mood',
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' }
      }
    },
    { $sort: { count: -1 } }
  ];
  
  const results = await this.aggregate(pipeline);
  
  const totalVotes = results.reduce((sum, item) => sum + item.count, 0);
  
  const moodSummary = {
    totalVotes,
    moods: new Map(),
    dominantMoods: results.slice(0, 3).map(item => ({
      mood: item._id,
      emoji: getMoodEmoji(item._id),
      count: item.count,
      percentage: totalVotes > 0 ? Math.round((item.count / totalVotes) * 100) : 0,
      avgIntensity: Math.round(item.avgIntensity * 10) / 10
    }))
  };
  
  // Populate moods Map
  results.forEach(item => {
    moodSummary.moods.set(item._id, item.count);
  });
  
  return moodSummary;
};

// Static method to update or create mood vote
moodSchema.statics.updateMoodVote = async function(momentId, userId, mood, intensity = 3) {
  const existingMood = await this.findOne({ momentId, userId });
  
  if (existingMood) {
    existingMood.mood = mood;
    existingMood.intensity = intensity;
    existingMood.createdAt = new Date(); // Update timestamp
    return await existingMood.save();
  } else {
    return await this.create({
      momentId,
      userId,
      mood,
      intensity
    });
  }
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

module.exports = mongoose.model('Mood', moodSchema);