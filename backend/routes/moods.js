const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const Moment = require('../models/Moment');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { moodLimiter } = require('../middleware/rateLimit');
const { 
  validateMoodVote, 
  validateObjectId 
} = require('../middleware/validation');

/**
 * POST /api/moods/vote
 * Submit or update a mood vote for a moment
 */
router.post('/vote', [requireAuth, moodLimiter, validateMoodVote], asyncHandler(async (req, res) => {
  const { momentId, mood, intensity = 3 } = req.body;

  // Verify moment exists and is active
  const moment = await Moment.findById(momentId);
  if (!moment) {
    throw new AppError('Moment not found', 404);
  }

  if (!moment.isActive) {
    throw new AppError('Cannot vote on moods for inactive moments', 400);
  }

  // Verify user is a participant in the moment
  const isParticipant = moment.participants.some(p => p.userId === req.userId);
  if (!isParticipant) {
    throw new AppError('Must join moment before voting on moods', 403);
  }

  // Update or create mood vote
  const moodVote = await Mood.updateMoodVote(momentId, req.userId, mood, intensity);

  // Update moment's mood summary
  const moodSummary = await Mood.getMoodSummary(momentId);
  
  // Update the moment with new mood summary
  moment.moodSummary = moodSummary;
  await moment.save();

  // Update participant's last active time
  const participant = moment.participants.find(p => p.userId === req.userId);
  if (participant) {
    participant.lastActive = new Date();
    await moment.save();
  }

  // Emit socket event for real-time mood updates
  const io = req.app.get('io');
  io.to(`moment_${momentId}`).emit('mood_updated', {
    momentId,
    moodSummary,
    userVote: {
      userId: req.userId,
      mood,
      intensity
    }
  });

  res.status(201).json({
    success: true,
    data: { 
      moodVote,
      moodSummary 
    },
    message: 'Mood vote submitted successfully'
  });
}));

/**
 * GET /api/moods/moment/:momentId
 * Get mood summary for a specific moment
 */
router.get('/moment/:momentId', validateObjectId('momentId'), asyncHandler(async (req, res) => {
  const moment = await Moment.findById(req.params.momentId);
  if (!moment) {
    throw new AppError('Moment not found', 404);
  }

  const moodSummary = await Mood.getMoodSummary(req.params.momentId);

  res.json({
    success: true,
    data: { moodSummary }
  });
}));

/**
 * GET /api/moods/user/:momentId
 * Get current user's mood vote for a specific moment
 */
router.get('/user/:momentId', [requireAuth, validateObjectId('momentId')], asyncHandler(async (req, res) => {
  const userMood = await Mood.findOne({
    momentId: req.params.momentId,
    userId: req.userId
  });

  res.json({
    success: true,
    data: { userMood }
  });
}));

/**
 * DELETE /api/moods/vote/:momentId
 * Remove user's mood vote for a moment
 */
router.delete('/vote/:momentId', [requireAuth, validateObjectId('momentId')], asyncHandler(async (req, res) => {
  const moment = await Moment.findById(req.params.momentId);
  if (!moment) {
    throw new AppError('Moment not found', 404);
  }

  // Remove the mood vote
  const deletedMood = await Mood.findOneAndDelete({
    momentId: req.params.momentId,
    userId: req.userId
  });

  if (!deletedMood) {
    throw new AppError('No mood vote found to delete', 404);
  }

  // Update moment's mood summary
  const moodSummary = await Mood.getMoodSummary(req.params.momentId);
  moment.moodSummary = moodSummary;
  await moment.save();

  // Emit socket event
  const io = req.app.get('io');
  io.to(`moment_${req.params.momentId}`).emit('mood_updated', {
    momentId: req.params.momentId,
    moodSummary,
    userVoteRemoved: req.userId
  });

  res.json({
    success: true,
    data: { moodSummary },
    message: 'Mood vote removed successfully'
  });
}));

/**
 * GET /api/moods/stats/:momentId
 * Get detailed mood statistics for a moment
 */
router.get('/stats/:momentId', validateObjectId('momentId'), asyncHandler(async (req, res) => {
  const moment = await Moment.findById(req.params.momentId);
  if (!moment) {
    throw new AppError('Moment not found', 404);
  }

  // Get mood distribution over time
  const moodStats = await Mood.aggregate([
    { $match: { momentId: mongoose.Types.ObjectId(req.params.momentId) } },
    {
      $group: {
        _id: {
          mood: '$mood',
          hour: { $hour: '$createdAt' }
        },
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' }
      }
    },
    {
      $group: {
        _id: '$_id.mood',
        hourlyData: {
          $push: {
            hour: '$_id.hour',
            count: '$count',
            avgIntensity: '$avgIntensity'
          }
        },
        totalCount: { $sum: '$count' },
        overallAvgIntensity: { $avg: '$avgIntensity' }
      }
    },
    { $sort: { totalCount: -1 } }
  ]);

  const moodSummary = await Mood.getMoodSummary(req.params.momentId);

  res.json({
    success: true,
    data: {
      moodSummary,
      detailedStats: moodStats,
      participantCount: moment.participantCount
    }
  });
}));

/**
 * GET /api/moods/trending
 * Get trending moods across all active moments
 */
router.get('/trending', asyncHandler(async (req, res) => {
  const { timeframe = '24h' } = req.query;
  
  // Calculate time threshold
  let timeThreshold = new Date();
  switch (timeframe) {
    case '1h':
      timeThreshold.setHours(timeThreshold.getHours() - 1);
      break;
    case '6h':
      timeThreshold.setHours(timeThreshold.getHours() - 6);
      break;
    case '24h':
    default:
      timeThreshold.setHours(timeThreshold.getHours() - 24);
      break;
  }

  const trendingMoods = await Mood.aggregate([
    { 
      $match: { 
        createdAt: { $gte: timeThreshold }
      }
    },
    {
      $group: {
        _id: '$mood',
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        mood: '$_id',
        count: 1,
        avgIntensity: { $round: ['$avgIntensity', 1] },
        uniqueUserCount: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // Add emojis to trending moods
  const trendingWithEmojis = trendingMoods.map(mood => ({
    ...mood,
    emoji: getMoodEmoji(mood.mood)
  }));

  res.json({
    success: true,
    data: {
      trendingMoods: trendingWithEmojis,
      timeframe,
      generatedAt: new Date()
    }
  });
}));

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

module.exports = router;