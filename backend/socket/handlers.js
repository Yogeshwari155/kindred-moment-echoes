const ChatMessage = require('../models/ChatMessage');
const Moment = require('../models/Moment');
const { isValidUserId } = require('../middleware/auth');

/**
 * Socket.IO event handlers for real-time functionality
 */
function socketHandlers(socket, io) {
  console.log(`Socket connected: ${socket.id}`);

  // Handle user authentication
  socket.on('authenticate', async (data) => {
    try {
      const { userId } = data;
      
      if (!userId || !isValidUserId(userId)) {
        socket.emit('auth_error', { message: 'Invalid user ID' });
        return;
      }
      
      socket.userId = userId;
      socket.emit('authenticated', { userId });
      console.log(`Socket ${socket.id} authenticated as ${userId}`);
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });

  // Join a moment room
  socket.on('join_moment', async (data) => {
    try {
      const { momentId } = data;
      
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      // Verify moment exists
      const moment = await Moment.findById(momentId);
      if (!moment) {
        socket.emit('error', { message: 'Moment not found' });
        return;
      }

      // Join the room
      socket.join(`moment_${momentId}`);
      socket.currentMoment = momentId;
      
      // Update user's last active time
      const participant = moment.participants.find(p => p.userId === socket.userId);
      if (participant) {
        participant.lastActive = new Date();
        await moment.save();
      }

      // Notify others in the room
      socket.to(`moment_${momentId}`).emit('user_joined_chat', {
        userId: socket.userId,
        momentId
      });

      // Send recent chat messages to the user
      const recentMessages = await ChatMessage.getRecentMessages(momentId, 20);
      socket.emit('chat_history', {
        messages: recentMessages.reverse(), // Reverse to show oldest first
        momentId
      });

      console.log(`User ${socket.userId} joined moment ${momentId}`);
    } catch (error) {
      console.error('Join moment error:', error);
      socket.emit('error', { message: 'Failed to join moment' });
    }
  });

  // Leave a moment room
  socket.on('leave_moment', async (data) => {
    try {
      const { momentId } = data;
      
      if (socket.currentMoment === momentId) {
        socket.leave(`moment_${momentId}`);
        socket.currentMoment = null;
        
        // Notify others in the room
        socket.to(`moment_${momentId}`).emit('user_left_chat', {
          userId: socket.userId,
          momentId
        });
        
        console.log(`User ${socket.userId} left moment ${momentId}`);
      }
    } catch (error) {
      console.error('Leave moment error:', error);
    }
  });

  // Handle chat messages
  socket.on('send_message', async (data) => {
    try {
      const { momentId, message } = data;
      
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      if (!message || message.trim().length === 0) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }

      if (message.length > 200) {
        socket.emit('error', { message: 'Message too long' });
        return;
      }

      // Verify moment exists and is active
      const moment = await Moment.findById(momentId);
      if (!moment || !moment.isActive) {
        socket.emit('error', { message: 'Cannot send message to inactive moment' });
        return;
      }

      // Verify user is a participant
      const isParticipant = moment.participants.some(p => p.userId === socket.userId);
      if (!isParticipant) {
        socket.emit('error', { message: 'Must join moment to send messages' });
        return;
      }

      // Save message to database
      const chatMessage = new ChatMessage({
        momentId,
        userId: socket.userId,
        message: message.trim(),
        type: 'message'
      });
      
      await chatMessage.save();

      // Broadcast message to all users in the moment
      io.to(`moment_${momentId}`).emit('new_message', {
        id: chatMessage._id,
        userId: socket.userId,
        message: chatMessage.message,
        type: chatMessage.type,
        createdAt: chatMessage.createdAt,
        momentId
      });

      console.log(`Message sent in moment ${momentId} by ${socket.userId}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { momentId } = data;
    if (socket.userId && socket.currentMoment === momentId) {
      socket.to(`moment_${momentId}`).emit('user_typing', {
        userId: socket.userId,
        momentId
      });
    }
  });

  socket.on('typing_stop', (data) => {
    const { momentId } = data;
    if (socket.userId && socket.currentMoment === momentId) {
      socket.to(`moment_${momentId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        momentId
      });
    }
  });

  // Handle presence updates
  socket.on('update_presence', async (data) => {
    try {
      const { momentId } = data;
      
      if (!socket.userId || !momentId) return;

      // Update user's last active time
      const moment = await Moment.findById(momentId);
      if (moment) {
        const participant = moment.participants.find(p => p.userId === socket.userId);
        if (participant) {
          participant.lastActive = new Date();
          await moment.save();
          
          // Broadcast presence update
          socket.to(`moment_${momentId}`).emit('presence_updated', {
            userId: socket.userId,
            lastActive: participant.lastActive,
            momentId
          });
        }
      }
    } catch (error) {
      console.error('Presence update error:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      console.log(`Socket disconnected: ${socket.id}`);
      
      if (socket.currentMoment && socket.userId) {
        // Notify others in the room
        socket.to(`moment_${socket.currentMoment}`).emit('user_left_chat', {
          userId: socket.userId,
          momentId: socket.currentMoment
        });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
}

module.exports = socketHandlers;