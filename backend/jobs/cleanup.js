const Moment = require('../models/Moment');
const Post = require('../models/Post');
const Mood = require('../models/Mood');
const ChatMessage = require('../models/ChatMessage');

/**
 * Cleanup expired data (moments, posts, moods, chat messages older than 24 hours)
 */
async function cleanupExpiredData() {
  try {
    const expiryTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    console.log(`Starting cleanup for data older than ${expiryTime.toISOString()}`);

    // Mark old moments as inactive
    const expiredMomentsResult = await Moment.updateMany(
      { 
        createdAt: { $lt: expiryTime },
        isActive: true 
      },
      { 
        isActive: false 
      }
    );

    // Clean up old posts (soft delete by marking invisible)
    const expiredPostsResult = await Post.updateMany(
      { 
        createdAt: { $lt: expiryTime },
        isVisible: true 
      },
      { 
        isVisible: false 
      }
    );

    // Delete old mood votes
    const expiredMoodsResult = await Mood.deleteMany({
      createdAt: { $lt: expiryTime }
    });

    // Delete old chat messages
    const expiredMessagesResult = await ChatMessage.deleteMany({
      createdAt: { $lt: expiryTime }
    });

    // Clean up very old data (7 days) - hard delete
    const hardDeleteTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    const hardDeleteMomentsResult = await Moment.deleteMany({
      createdAt: { $lt: hardDeleteTime }
    });

    const hardDeletePostsResult = await Post.deleteMany({
      createdAt: { $lt: hardDeleteTime }
    });

    console.log('Cleanup completed:', {
      expiredMoments: expiredMomentsResult.modifiedCount,
      expiredPosts: expiredPostsResult.modifiedCount,
      deletedMoods: expiredMoodsResult.deletedCount,
      deletedMessages: expiredMessagesResult.deletedCount,
      hardDeletedMoments: hardDeleteMomentsResult.deletedCount,
      hardDeletedPosts: hardDeletePostsResult.deletedCount,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      stats: {
        expiredMoments: expiredMomentsResult.modifiedCount,
        expiredPosts: expiredPostsResult.modifiedCount,
        deletedMoods: expiredMoodsResult.deletedCount,
        deletedMessages: expiredMessagesResult.deletedCount,
        hardDeletedMoments: hardDeleteMomentsResult.deletedCount,
        hardDeletedPosts: hardDeletePostsResult.deletedCount
      }
    };

  } catch (error) {
    console.error('Cleanup job failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean up inactive participants (haven't been active in 30 minutes)
 */
async function cleanupInactiveParticipants() {
  try {
    const inactiveThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    
    const moments = await Moment.find({ isActive: true });
    let totalRemoved = 0;

    for (const moment of moments) {
      const activeParticipants = moment.participants.filter(
        p => p.lastActive > inactiveThreshold
      );
      
      const removedCount = moment.participants.length - activeParticipants.length;
      
      if (removedCount > 0) {
        moment.participants = activeParticipants;
        
        // If no active participants, mark moment as inactive
        if (activeParticipants.length === 0) {
          moment.isActive = false;
        }
        
        await moment.save();
        totalRemoved += removedCount;
      }
    }

    console.log(`Removed ${totalRemoved} inactive participants`);
    return { success: true, removedParticipants: totalRemoved };

  } catch (error) {
    console.error('Inactive participants cleanup failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get cleanup statistics
 */
async function getCleanupStats() {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      activeMoments: await Moment.countDocuments({ isActive: true }),
      inactiveMoments: await Moment.countDocuments({ isActive: false }),
      totalMoments: await Moment.countDocuments(),
      
      visiblePosts: await Post.countDocuments({ isVisible: true }),
      hiddenPosts: await Post.countDocuments({ isVisible: false }),
      totalPosts: await Post.countDocuments(),
      
      totalMoods: await Mood.countDocuments(),
      totalChatMessages: await ChatMessage.countDocuments(),
      
      dataOlderThan24h: {
        moments: await Moment.countDocuments({ createdAt: { $lt: oneDayAgo } }),
        posts: await Post.countDocuments({ createdAt: { $lt: oneDayAgo } }),
        moods: await Mood.countDocuments({ createdAt: { $lt: oneDayAgo } }),
        messages: await ChatMessage.countDocuments({ createdAt: { $lt: oneDayAgo } })
      },
      
      dataOlderThan7d: {
        moments: await Moment.countDocuments({ createdAt: { $lt: oneWeekAgo } }),
        posts: await Post.countDocuments({ createdAt: { $lt: oneWeekAgo } }),
        moods: await Mood.countDocuments({ createdAt: { $lt: oneWeekAgo } }),
        messages: await ChatMessage.countDocuments({ createdAt: { $lt: oneWeekAgo } })
      }
    };

    return stats;
  } catch (error) {
    console.error('Failed to get cleanup stats:', error);
    throw error;
  }
}

// If running directly (not as a module)
if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kindred-moments')
    .then(async () => {
      console.log('Connected to MongoDB for cleanup');
      const result = await cleanupExpiredData();
      const participantResult = await cleanupInactiveParticipants();
      console.log('Cleanup results:', { ...result, ...participantResult });
      process.exit(0);
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    });
}

module.exports = {
  cleanupExpiredData,
  cleanupInactiveParticipants,
  getCleanupStats
};