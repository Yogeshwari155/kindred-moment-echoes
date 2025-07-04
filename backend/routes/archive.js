const express = require('express');
const { query, validationResult } = require('express-validator');
const Moment = require('../models/Moment');
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

// GET /api/archived-moments - Fetch past (expired) moments for read-only viewing
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('radius')
    .optional()
    .isInt({ min: 100, max: 10000 })
    .withMessage('Radius must be between 100 and 10000 meters')
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { latitude, longitude, radius } = req.query;

    // Build query for archived/expired moments
    let query = {
      $or: [
        { isArchived: true },
        { 'timeWindow.end': { $lte: new Date() } }
      ]
    };

    // Add location-based filtering if coordinates provided
    if (latitude && longitude) {
      const radiusInMeters = parseInt(radius) || 1000; // Default 1km radius
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radiusInMeters
        }
      };
    }

    // Execute query with pagination
    const [moments, totalCount] = await Promise.all([
      Moment.find(query)
        .populate({
          path: 'posts',
          options: { sort: { createdAt: -1 } }
        })
        .sort({ 'timeWindow.end': -1 }) // Most recently ended first
        .skip(skip)
        .limit(limit),
      Moment.countDocuments(query)
    ]);

    // Format moments for read-only view
    const formattedMoments = moments.map(moment => ({
      momentId: moment._id,
      location: {
        latitude: moment.location.coordinates[1],
        longitude: moment.location.coordinates[0]
      },
      timeWindow: moment.timeWindow,
      participantCount: moment.participants.length,
      postCount: moment.posts.length,
      moodSummary: moment.moodSummary,
      posts: moment.posts.map(post => {
        if (post.toPublicJSON) {
          return post.toPublicJSON();
        }
        return {
          id: post._id,
          text: post.text,
          mediaUrl: post.mediaUrl,
          mediaType: post.mediaType,
          mood: post.mood,
          createdAt: post.createdAt
        };
      }),
      isArchived: moment.isArchived,
      endedAt: moment.timeWindow.end
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.json({
      success: true,
      data: {
        moments: formattedMoments,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPreviousPage,
          limit
        },
        filters: {
          location: latitude && longitude ? {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            radius: parseInt(radius) || 1000
          } : null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching archived moments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch archived moments',
      message: error.message 
    });
  }
});

// GET /api/archived-moments/:id - Get specific archived moment details
router.get('/:id', async (req, res) => {
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

    // Verify moment is actually archived/expired
    if (!moment.isArchived && !moment.isExpired) {
      return res.status(400).json({ 
        error: 'Moment is still active',
        suggestion: 'Use /api/moments/:id for active moments'
      });
    }

    const formattedMoment = {
      momentId: moment._id,
      location: {
        latitude: moment.location.coordinates[1],
        longitude: moment.location.coordinates[0]
      },
      timeWindow: moment.timeWindow,
      participantCount: moment.participants.length,
      moodSummary: moment.moodSummary,
      posts: moment.posts.map(post => {
        if (post.toPublicJSON) {
          return post.toPublicJSON();
        }
        return {
          id: post._id,
          text: post.text,
          mediaUrl: post.mediaUrl,
          mediaType: post.mediaType,
          mood: post.mood,
          createdAt: post.createdAt
        };
      }),
      isArchived: moment.isArchived,
      isExpired: moment.isExpired,
      endedAt: moment.timeWindow.end
    };

    res.json({
      success: true,
      data: formattedMoment
    });

  } catch (error) {
    console.error('Error fetching archived moment:', error);
    res.status(500).json({ 
      error: 'Failed to fetch archived moment',
      message: error.message 
    });
  }
});

module.exports = router;