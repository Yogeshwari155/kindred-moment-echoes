const cron = require('node-cron');
const Moment = require('../models/Moment');
const Post = require('../models/Post');
const ChatMessage = require('../models/ChatMessage');
const { cleanupExpiredMessages } = require('../sockets/chatHandler');

/**
 * Clean up expired moments and related data
 */
const cleanupExpiredMoments = async () => {
  try {
    console.log('Starting cleanup of expired moments...');
    
    const now = new Date();
    
    // Find expired moments that haven't been archived yet
    const expiredMoments = await Moment.find({
      'timeWindow.end': { $lte: now },
      isArchived: false
    });

    console.log(`Found ${expiredMoments.length} expired moments to process`);

    for (const moment of expiredMoments) {
      // Archive the moment instead of deleting for historical purposes
      moment.isArchived = true;
      moment.isActive = false;
      await moment.save();
      
      console.log(`Archived moment ${moment._id}`);
    }

    // Optional: Delete very old archived moments (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldMoments = await Moment.find({
      'timeWindow.end': { $lte: thirtyDaysAgo },
      isArchived: true
    });

    if (oldMoments.length > 0) {
      // Delete associated posts first
      const momentIds = oldMoments.map(m => m._id);
      const deletedPosts = await Post.deleteMany({ momentId: { $in: momentIds } });
      
      // Delete old moments
      const deletedMoments = await Moment.deleteMany({ _id: { $in: momentIds } });
      
      console.log(`Deleted ${deletedMoments.deletedCount} old moments and ${deletedPosts.deletedCount} associated posts`);
    }

    console.log('Cleanup of expired moments completed');
    
  } catch (error) {
    console.error('Error during moment cleanup:', error);
  }
};

/**
 * Clean up orphaned posts (posts without valid moments)
 */
const cleanupOrphanedPosts = async () => {
  try {
    console.log('Starting cleanup of orphaned posts...');
    
    // Find posts that reference non-existent moments
    const orphanedPosts = await Post.aggregate([
      {
        $lookup: {
          from: 'moments',
          localField: 'momentId',
          foreignField: '_id',
          as: 'moment'
        }
      },
      {
        $match: {
          moment: { $size: 0 }
        }
      }
    ]);

    if (orphanedPosts.length > 0) {
      const orphanedPostIds = orphanedPosts.map(p => p._id);
      const result = await Post.deleteMany({ _id: { $in: orphanedPostIds } });
      console.log(`Deleted ${result.deletedCount} orphaned posts`);
    } else {
      console.log('No orphaned posts found');
    }
    
  } catch (error) {
    console.error('Error during orphaned posts cleanup:', error);
  }
};

/**
 * Generate cleanup summary report
 */
const generateCleanupReport = async () => {
  try {
    const activeMoments = await Moment.countDocuments({ isActive: true });
    const archivedMoments = await Moment.countDocuments({ isArchived: true });
    const totalPosts = await Post.countDocuments();
    const activeChatMessages = await ChatMessage.countDocuments({ expiresAt: { $gt: new Date() } });
    
    console.log('=== Cleanup Report ===');
    console.log(`Active moments: ${activeMoments}`);
    console.log(`Archived moments: ${archivedMoments}`);
    console.log(`Total posts: ${totalPosts}`);
    console.log(`Active chat messages: ${activeChatMessages}`);
    console.log('=====================');
    
  } catch (error) {
    console.error('Error generating cleanup report:', error);
  }
};

/**
 * Run all cleanup tasks
 */
const runAllCleanupTasks = async () => {
  console.log('Starting scheduled cleanup tasks...');
  
  await cleanupExpiredMoments();
  await cleanupOrphanedPosts();
  await cleanupExpiredMessages();
  await generateCleanupReport();
  
  console.log('All cleanup tasks completed');
};

/**
 * Initialize cron jobs
 */
const initializeCleanupJobs = () => {
  console.log('Initializing cleanup cron jobs...');
  
  // Run cleanup every hour
  cron.schedule('0 * * * *', () => {
    console.log('Running hourly cleanup...');
    runAllCleanupTasks();
  });
  
  // Run full cleanup daily at 2 AM
  cron.schedule('0 2 * * *', () => {
    console.log('Running daily cleanup...');
    runAllCleanupTasks();
  });
  
  console.log('Cleanup cron jobs initialized');
};

/**
 * Manual cleanup function for testing
 */
const runManualCleanup = async () => {
  console.log('Running manual cleanup...');
  await runAllCleanupTasks();
};

module.exports = {
  initializeCleanupJobs,
  runManualCleanup,
  cleanupExpiredMoments,
  cleanupOrphanedPosts,
  generateCleanupReport
};