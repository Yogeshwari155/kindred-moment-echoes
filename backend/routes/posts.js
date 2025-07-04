const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Moment = require('../models/Moment');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { postLimiter } = require('../middleware/rateLimit');
const { 
  validateCreatePost, 
  validateObjectId 
} = require('../middleware/validation');

/**
 * POST /api/posts
 * Create a new post in a moment
 */
router.post('/', [requireAuth, postLimiter, validateCreatePost], asyncHandler(async (req, res) => {
  const { momentId, content, mood, type = 'text', imageUrl } = req.body;

  // Verify moment exists and is active
  const moment = await Moment.findById(momentId);
  if (!moment) {
    throw new AppError('Moment not found', 404);
  }

  if (!moment.isActive) {
    throw new AppError('Cannot post to inactive moment', 400);
  }

  // Verify user is a participant in the moment
  const isParticipant = moment.participants.some(p => p.userId === req.userId);
  if (!isParticipant) {
    throw new AppError('Must join moment before posting', 403);
  }

  // Create the post
  const post = new Post({
    momentId,
    userId: req.userId,
    content,
    mood,
    type,
    imageUrl
  });

  await post.save();

  // Update moment stats
  moment.stats.totalPosts += 1;
  await moment.save();

  // Update participant's last active time
  const participant = moment.participants.find(p => p.userId === req.userId);
  if (participant) {
    participant.lastActive = new Date();
    await moment.save();
  }

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.to(`moment_${momentId}`).emit('new_post', {
    post: {
      ...post.toObject(),
      timeAgo: post.timeAgo
    },
    momentId
  });

  res.status(201).json({
    success: true,
    data: { 
      post: {
        ...post.toObject(),
        timeAgo: post.timeAgo
      }
    },
    message: 'Post created successfully'
  });
}));

/**
 * GET /api/posts/:id
 * Get a specific post by ID
 */
router.get('/:id', validateObjectId('id'), asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  
  if (!post || !post.isVisible) {
    throw new AppError('Post not found', 404);
  }

  res.json({
    success: true,
    data: { 
      post: {
        ...post.toObject(),
        timeAgo: post.timeAgo
      }
    }
  });
}));

/**
 * PUT /api/posts/:id/react
 * Add or update reaction to a post
 */
router.put('/:id/react', [requireAuth, validateObjectId('id')], asyncHandler(async (req, res) => {
  const { reactionType } = req.body;
  
  // Validate reaction type
  const validReactions = ['heart', 'smile', 'thoughtful', 'grateful'];
  if (!validReactions.includes(reactionType)) {
    throw new AppError('Invalid reaction type', 400);
  }

  const post = await Post.findById(req.params.id);
  if (!post || !post.isVisible) {
    throw new AppError('Post not found', 404);
  }

  // Verify moment is still active
  const moment = await Moment.findById(post.momentId);
  if (!moment || !moment.isActive) {
    throw new AppError('Cannot react to posts in inactive moments', 400);
  }

  // Verify user is a participant
  const isParticipant = moment.participants.some(p => p.userId === req.userId);
  if (!isParticipant) {
    throw new AppError('Must be a participant to react to posts', 403);
  }

  await post.addReaction(req.userId, reactionType);

  // Emit socket event
  const io = req.app.get('io');
  io.to(`moment_${post.momentId}`).emit('post_reaction', {
    postId: post._id,
    userId: req.userId,
    reactionType,
    reactionCount: post.reactionCount
  });

  res.json({
    success: true,
    data: { 
      post: {
        ...post.toObject(),
        timeAgo: post.timeAgo
      }
    },
    message: 'Reaction added successfully'
  });
}));

/**
 * DELETE /api/posts/:id/react
 * Remove reaction from a post
 */
router.delete('/:id/react', [requireAuth, validateObjectId('id')], asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post || !post.isVisible) {
    throw new AppError('Post not found', 404);
  }

  await post.removeReaction(req.userId);

  // Emit socket event
  const io = req.app.get('io');
  io.to(`moment_${post.momentId}`).emit('post_reaction_removed', {
    postId: post._id,
    userId: req.userId,
    reactionCount: post.reactionCount
  });

  res.json({
    success: true,
    data: { 
      post: {
        ...post.toObject(),
        timeAgo: post.timeAgo
      }
    },
    message: 'Reaction removed successfully'
  });
}));

/**
 * DELETE /api/posts/:id
 * Delete a post (only by the author)
 */
router.delete('/:id', [requireAuth, validateObjectId('id')], asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  
  if (!post || !post.isVisible) {
    throw new AppError('Post not found', 404);
  }

  // Only the author can delete their post
  if (post.userId !== req.userId) {
    throw new AppError('Not authorized to delete this post', 403);
  }

  // Soft delete by marking as invisible
  post.isVisible = false;
  await post.save();

  // Update moment stats
  const moment = await Moment.findById(post.momentId);
  if (moment) {
    moment.stats.totalPosts = Math.max(0, moment.stats.totalPosts - 1);
    await moment.save();
  }

  // Emit socket event
  const io = req.app.get('io');
  io.to(`moment_${post.momentId}`).emit('post_deleted', {
    postId: post._id,
    momentId: post.momentId
  });

  res.json({
    success: true,
    message: 'Post deleted successfully'
  });
}));

/**
 * GET /api/posts/user/my-posts
 * Get current user's posts across all moments
 */
router.get('/user/my-posts', [requireAuth], asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const posts = await Post.find({ 
    userId: req.userId, 
    isVisible: true 
  })
    .populate('momentId', 'location.name isActive createdAt')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

  const total = await Post.countDocuments({ 
    userId: req.userId, 
    isVisible: true 
  });

  // Add timeAgo to each post
  const postsWithTimeAgo = posts.map(post => ({
    ...post,
    timeAgo: getTimeAgo(post.createdAt)
  }));

  res.json({
    success: true,
    data: {
      posts: postsWithTimeAgo,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

module.exports = router;