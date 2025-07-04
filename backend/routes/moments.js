const express = require('express');
const router = express.Router();
const Moment = require('../models/Moment');
const Post = require('../models/Post');
const Mood = require('../models/Mood');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { 
  validateCreateMoment, 
  validateObjectId, 
  validatePagination,
  validateLocationQuery 
} = require('../middleware/validation');

/**
 * GET /api/moments
 * Get all active moments with optional location filtering
 */
router.get('/', [validatePagination, validateLocationQuery], asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, latitude, longitude, radius = 5 } = req.query;
  const skip = (page - 1) * limit;

  let query = { isActive: true };

  // Add location-based filtering if coordinates provided
  if (latitude && longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusInKm = parseFloat(radius);
    
    // Simple bounding box calculation (for more precise results, use MongoDB's geospatial queries)
    const latDelta = radiusInKm / 111; // Rough conversion: 1 degree ≈ 111 km
    const lngDelta = radiusInKm / (111 * Math.cos(lat * Math.PI / 180));
    
    query['location.coordinates.latitude'] = {
      $gte: lat - latDelta,
      $lte: lat + latDelta
    };
    query['location.coordinates.longitude'] = {
      $gte: lng - lngDelta,
      $lte: lng + lngDelta
    };
  }

  const moments = await Moment.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

  const total = await Moment.countDocuments(query);

  res.json({
    success: true,
    data: {
      moments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

/**
 * GET /api/moments/archived
 * Get archived (inactive) moments for the user
 */
router.get('/archived', [requireAuth, validatePagination], asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  // Find moments where the user was a participant
  const moments = await Moment.find({
    isActive: false,
    'participants.userId': req.userId
  })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

  const total = await Moment.countDocuments({
    isActive: false,
    'participants.userId': req.userId
  });

  res.json({
    success: true,
    data: {
      moments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

/**
 * GET /api/moments/:id
 * Get a specific moment by ID
 */
router.get('/:id', validateObjectId('id'), asyncHandler(async (req, res) => {
  const moment = await Moment.findById(req.params.id);
  
  if (!moment) {
    throw new AppError('Moment not found', 404);
  }

  res.json({
    success: true,
    data: { moment }
  });
}));

/**
 * POST /api/moments
 * Create a new moment or join existing one at the same location
 */
router.post('/', [requireAuth, validateCreateMoment], asyncHandler(async (req, res) => {
  const { location } = req.body;
  const { latitude, longitude } = location.coordinates;

  // Check for existing active moment at similar location (within 100 meters)
  const latDelta = 0.001; // Roughly 100 meters
  const lngDelta = 0.001;

  const existingMoment = await Moment.findOne({
    isActive: true,
    'location.coordinates.latitude': {
      $gte: latitude - latDelta,
      $lte: latitude + latDelta
    },
    'location.coordinates.longitude': {
      $gte: longitude - lngDelta,
      $lte: longitude + lngDelta
    }
  });

  let moment;

  if (existingMoment) {
    // Join existing moment
    await existingMoment.addParticipant(req.userId);
    moment = existingMoment;
  } else {
    // Create new moment
    moment = new Moment({
      location,
      participants: [{
        userId: req.userId,
        joinedAt: new Date(),
        lastActive: new Date()
      }],
      stats: {
        totalPosts: 0,
        peakParticipants: 1
      }
    });
    await moment.save();
  }

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.to(`moment_${moment._id}`).emit('participant_joined', {
    momentId: moment._id,
    participantCount: moment.participantCount,
    userId: req.userId
  });

  res.status(201).json({
    success: true,
    data: { moment },
    message: existingMoment ? 'Joined existing moment' : 'Created new moment'
  });
}));

/**
 * PUT /api/moments/:id/join
 * Join an existing moment
 */
router.put('/:id/join', [requireAuth, validateObjectId('id')], asyncHandler(async (req, res) => {
  const moment = await Moment.findById(req.params.id);
  
  if (!moment) {
    throw new AppError('Moment not found', 404);
  }

  if (!moment.isActive) {
    throw new AppError('Cannot join inactive moment', 400);
  }

  await moment.addParticipant(req.userId);

  // Emit socket event
  const io = req.app.get('io');
  io.to(`moment_${moment._id}`).emit('participant_joined', {
    momentId: moment._id,
    participantCount: moment.participantCount,
    userId: req.userId
  });

  res.json({
    success: true,
    data: { moment },
    message: 'Successfully joined moment'
  });
}));

/**
 * PUT /api/moments/:id/leave
 * Leave a moment
 */
router.put('/:id/leave', [requireAuth, validateObjectId('id')], asyncHandler(async (req, res) => {
  const moment = await Moment.findById(req.params.id);
  
  if (!moment) {
    throw new AppError('Moment not found', 404);
  }

  await moment.removeParticipant(req.userId);

  // If no participants left, mark moment as inactive
  if (moment.participants.length === 0) {
    moment.isActive = false;
    await moment.save();
  }

  // Emit socket event
  const io = req.app.get('io');
  io.to(`moment_${moment._id}`).emit('participant_left', {
    momentId: moment._id,
    participantCount: moment.participantCount,
    userId: req.userId
  });

  res.json({
    success: true,
    data: { moment },
    message: 'Successfully left moment'
  });
}));

/**
 * GET /api/moments/:id/posts
 * Get posts for a specific moment
 */
router.get('/:id/posts', [validateObjectId('id'), validatePagination], asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  const moment = await Moment.findById(req.params.id);
  if (!moment) {
    throw new AppError('Moment not found', 404);
  }

  const posts = await Post.getPostsForMoment(req.params.id, parseInt(limit), skip);
  const total = await Post.countDocuments({ 
    momentId: req.params.id, 
    isVisible: true 
  });

  res.json({
    success: true,
    data: {
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

/**
 * GET /api/moments/:id/mood-summary
 * Get mood summary for a specific moment
 */
router.get('/:id/mood-summary', validateObjectId('id'), asyncHandler(async (req, res) => {
  const moment = await Moment.findById(req.params.id);
  if (!moment) {
    throw new AppError('Moment not found', 404);
  }

  const moodSummary = await Mood.getMoodSummary(req.params.id);

  res.json({
    success: true,
    data: { moodSummary }
  });
}));

/**
 * DELETE /api/moments/:id
 * Delete a moment (only if user is the creator and no other participants)
 */
router.delete('/:id', [requireAuth, validateObjectId('id')], asyncHandler(async (req, res) => {
  const moment = await Moment.findById(req.params.id);
  
  if (!moment) {
    throw new AppError('Moment not found', 404);
  }

  // Check if user is a participant
  const isParticipant = moment.participants.some(p => p.userId === req.userId);
  if (!isParticipant) {
    throw new AppError('Not authorized to delete this moment', 403);
  }

  // Only allow deletion if user is the only participant
  if (moment.participants.length > 1) {
    throw new AppError('Cannot delete moment with other participants', 400);
  }

  await Moment.findByIdAndDelete(req.params.id);

  // Clean up related data
  await Post.deleteMany({ momentId: req.params.id });
  await Mood.deleteMany({ momentId: req.params.id });

  res.json({
    success: true,
    message: 'Moment deleted successfully'
  });
}));

module.exports = router;