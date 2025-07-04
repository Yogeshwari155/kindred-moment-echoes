const ChatMessage = require('../models/ChatMessage');
const Moment = require('../models/Moment');
const { canAccessMoment, generateRoomId } = require('../utils/auth');

/**
 * Handle Socket.IO connections for real-time chat
 */
const handleChatConnection = (io, socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join moment chat room
  socket.on('joinMoment', async (data) => {
    try {
      const { momentId } = data;
      const anonymousId = socket.request.session?.anonymousId;

      if (!anonymousId) {
        socket.emit('error', { message: 'Anonymous session required' });
        return;
      }

      // Verify user can access this moment
      const hasAccess = await canAccessMoment(momentId, anonymousId, Moment);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to this moment' });
        return;
      }

      const roomId = generateRoomId(momentId, 'moment');
      socket.join(roomId);
      socket.currentMomentId = momentId;
      socket.anonymousId = anonymousId;

      // Send recent chat messages
      const recentMessages = await ChatMessage.getRecentMessages(momentId, 20);
      socket.emit('chatHistory', {
        messages: recentMessages.reverse().map(msg => msg.toSocketJSON())
      });

      // Notify others that someone joined
      socket.to(roomId).emit('userJoined', {
        message: 'Someone joined the moment',
        participantCount: await getParticipantCount(momentId)
      });

      socket.emit('joinedMoment', { 
        momentId, 
        roomId,
        message: 'Successfully joined moment' 
      });

    } catch (error) {
      console.error('Error joining moment:', error);
      socket.emit('error', { message: 'Failed to join moment' });
    }
  });

  // Handle chat messages
  socket.on('sendMessage', async (data) => {
    try {
      const { message, messageType = 'text' } = data;
      const momentId = socket.currentMomentId;
      const anonymousId = socket.anonymousId;

      if (!momentId || !anonymousId) {
        socket.emit('error', { message: 'Must join a moment first' });
        return;
      }

      // Validate message
      if (!message || message.trim().length === 0) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }

      if (message.length > 500) {
        socket.emit('error', { message: 'Message too long (max 500 characters)' });
        return;
      }

      // Check if moment is still active
      const moment = await Moment.findById(momentId);
      if (!moment || moment.isExpired) {
        socket.emit('error', { message: 'Cannot send message to expired moment' });
        return;
      }

      // Create chat message
      const chatMessage = new ChatMessage({
        momentId,
        anonymousId,
        message: message.trim(),
        messageType
      });

      await chatMessage.save();

      // Broadcast message to all users in the moment
      const roomId = generateRoomId(momentId, 'moment');
      io.to(roomId).emit('newMessage', chatMessage.toSocketJSON());

      // Send confirmation to sender
      socket.emit('messageSent', { success: true });

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    if (socket.currentMomentId) {
      const roomId = generateRoomId(socket.currentMomentId, 'moment');
      socket.to(roomId).emit('userTyping', {
        isTyping: data.isTyping
      });
    }
  });

  // Leave moment
  socket.on('leaveMoment', async () => {
    try {
      if (socket.currentMomentId) {
        const roomId = generateRoomId(socket.currentMomentId, 'moment');
        socket.leave(roomId);
        
        // Notify others that someone left
        socket.to(roomId).emit('userLeft', {
          message: 'Someone left the moment',
          participantCount: await getParticipantCount(socket.currentMomentId)
        });

        socket.currentMomentId = null;
        socket.anonymousId = null;
        socket.emit('leftMoment', { message: 'Left moment successfully' });
      }
    } catch (error) {
      console.error('Error leaving moment:', error);
      socket.emit('error', { message: 'Failed to leave moment' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);
    
    if (socket.currentMomentId) {
      const roomId = generateRoomId(socket.currentMomentId, 'moment');
      socket.to(roomId).emit('userLeft', {
        message: 'Someone left the moment',
        participantCount: await getParticipantCount(socket.currentMomentId)
      });
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
};

/**
 * Get current participant count for a moment
 */
const getParticipantCount = async (momentId) => {
  try {
    const moment = await Moment.findById(momentId);
    return moment ? moment.participants.length : 0;
  } catch (error) {
    console.error('Error getting participant count:', error);
    return 0;
  }
};

/**
 * Broadcast system message to all users in a moment
 */
const broadcastSystemMessage = (io, momentId, message) => {
  const roomId = generateRoomId(momentId, 'moment');
  io.to(roomId).emit('systemMessage', {
    message,
    timestamp: new Date(),
    type: 'system'
  });
};

/**
 * Clean up expired chat messages (called by cron job)
 */
const cleanupExpiredMessages = async () => {
  try {
    const result = await ChatMessage.deleteMany({
      expiresAt: { $lte: new Date() }
    });
    console.log(`Cleaned up ${result.deletedCount} expired chat messages`);
  } catch (error) {
    console.error('Error cleaning up expired messages:', error);
  }
};

module.exports = {
  handleChatConnection,
  broadcastSystemMessage,
  cleanupExpiredMessages,
  getParticipantCount
};