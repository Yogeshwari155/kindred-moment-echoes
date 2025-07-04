const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Moment = require('../models/Moment');
const Post = require('../models/Post');
const { generateAnonymousId } = require('../utils/auth');
const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

// POST /api/moments - Create or find nearby moment
router.post('/', [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
], handleValidationErrors, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const anonymousId = req.session.anonymousId || generateAnonymousId();
    
    // Save anonymous ID to session
    req.session.anonymousId = anonymousId;

    // First, try to find an existing nearby moment
    const nearbyMoments = await Moment.findNearby(longitude, latitude, 50); // 50 meter radius
    
    let moment;
    
    if (nearbyMoments.length > 0) {
      // Join existing moment
      moment = nearbyMoments[0];
      await moment.addParticipant(anonymousId);
    } else {
      // Create new moment
      moment = new Moment({
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        participants: [{ anonymousId }]
      });
      await moment.save();
    }

    await moment.populate('posts');

    res.status(201).json({
      success: true,
      data: {
        momentId: moment._id,
        isNewMoment: nearbyMoments.length === 0,
        participantCount: moment.participants.length,
        location: {
          latitude: moment.location.coordinates[1],
          longitude: moment.location.coordinates[0]
        },
        timeWindow: moment.timeWindow,
        moodSummary: moment.moodSummary,
        posts: moment.posts.map(post => post.toPublicJSON ? post.toPublicJSON() : post)
      }
    });

  } catch (error) {
    console.error('Error creating/finding moment:', error);
    res.status(500).json({ 
      error: 'Failed to create or find moment',
      message: error.message 
    });
  }
});

// GET /api/moments/:id - Fetch moment details
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid moment ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    
    const moment = await Moment.findById(id)
      .populate({
        path: 'posts',
        options: { sort: { createdAt: -1 } }
      });

    if (!moment) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    // Check if moment is still active
    if (moment.isExpired) {
      return res.status(410).json({ 
        error: 'Moment has expired',
        isExpired: true 
      });
    }

    res.json({
      success: true,
      data: {
        momentId: moment._id,
        participantCount: moment.participants.length,
        location: {
          latitude: moment.location.coordinates[1],
          longitude: moment.location.coordinates[0]
        },
        timeWindow: moment.timeWindow,
        moodSummary: moment.moodSummary,
        posts: moment.posts.map(post => post.toPublicJSON ? post.toPublicJSON() : post),
        isExpired: moment.isExpired,
        isActive: moment.isActive
      }
    });

  } catch (error) {
    console.error('Error fetching moment:', error);
    res.status(500).json({ 
      error: 'Failed to fetch moment',
      message: error.message 
    });
  }
});

// POST /api/moments/:id/posts - Add a post to a moment
router.post('/:id/posts', [
  param('id').isMongoId().withMessage('Invalid moment ID'),
  body('text')
    .isLength({ min: 1, max: 300 })
    .withMessage('Post text must be between 1 and 300 characters'),
  body('mood')
    .isIn(['happy', 'sad', 'excited', 'calm', 'anxious', 'grateful', 'reflective'])
    .withMessage('Invalid mood value'),
  body('mediaUrl')
    .optional()
    .isURL()
    .withMessage('Invalid media URL'),
  body('mediaType')
    .optional()
    .isIn(['photo', 'sketch'])
    .withMessage('Invalid media type')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, mood, mediaUrl, mediaType } = req.body;
    const anonymousId = req.session.anonymousId;

    if (!anonymousId) {
      return res.status(401).json({ error: 'Anonymous session required' });
    }

    // Find the moment
    const moment = await Moment.findById(id);
    if (!moment) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    if (moment.isExpired) {
      return res.status(410).json({ error: 'Cannot post to expired moment' });
    }

    // Create the post
    const post = new Post({
      text,
      mood,
      mediaUrl,
      mediaType,
      anonymousUserId: anonymousId,
      momentId: id
    });

    await post.save();

    // Add post to moment and update mood
    moment.posts.push(post._id);
    await moment.updateMood(mood);

    // Emit real-time update via Socket.IO
    if (req.app.get('io')) {
      req.app.get('io').to(`moment-${id}`).emit('newPost', {
        post: post.toPublicJSON(),
        moodSummary: moment.moodSummary
      });
    }

    res.status(201).json({
      success: true,
      data: {
        post: post.toPublicJSON(),
        moodSummary: moment.moodSummary
      }
    });

  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ 
      error: 'Failed to create post',
      message: error.message 
    });
  }
});

// POST /api/moments/:id/moods - Submit a mood for the moment
router.post('/:id/moods', [
  param('id').isMongoId().withMessage('Invalid moment ID'),
  body('mood')
    .isIn(['happy', 'sad', 'excited', 'calm', 'anxious', 'grateful', 'reflective'])
    .withMessage('Invalid mood value')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { mood } = req.body;
    const anonymousId = req.session.anonymousId;

    if (!anonymousId) {
      return res.status(401).json({ error: 'Anonymous session required' });
    }

    const moment = await Moment.findById(id);
    if (!moment) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    if (moment.isExpired) {
      return res.status(410).json({ error: 'Cannot submit mood to expired moment' });
    }

    // Update mood summary
    await moment.updateMood(mood);

    // Emit real-time mood update
    if (req.app.get('io')) {
      req.app.get('io').to(`moment-${id}`).emit('moodUpdate', {
        moodSummary: moment.moodSummary
      });
    }

    res.json({
      success: true,
      data: {
        moodSummary: moment.moodSummary
      }
    });

  } catch (error) {
    console.error('Error submitting mood:', error);
    res.status(500).json({ 
      error: 'Failed to submit mood',
      message: error.message 
    });
  }
});

module.exports = router;