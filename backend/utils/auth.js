const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique anonymous ID for users
 * Uses UUID v4 for uniqueness without personal identification
 */
const generateAnonymousId = () => {
  return `anon_${uuidv4()}`;
};

/**
 * Validate anonymous ID format
 */
const isValidAnonymousId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^anon_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

/**
 * Extract session info safely without exposing sensitive data
 */
const getSessionInfo = (req) => {
  return {
    anonymousId: req.session.anonymousId || null,
    sessionAge: req.session.cookie.maxAge,
    isAuthenticated: Boolean(req.session.anonymousId)
  };
};

/**
 * Middleware to require anonymous authentication
 */
const requireAnonymousAuth = (req, res, next) => {
  if (!req.session.anonymousId) {
    return res.status(401).json({
      error: 'Anonymous session required',
      message: 'Please create or join a moment first to establish an anonymous session'
    });
  }
  next();
};

/**
 * Clean expired sessions data
 * This is mainly for cleanup purposes
 */
const cleanExpiredSessions = () => {
  // This would typically integrate with your session store
  // For now, it's a placeholder for future implementation
  console.log('Session cleanup triggered');
};

/**
 * Generate a temporary room ID for real-time features
 */
const generateRoomId = (momentId, type = 'chat') => {
  return `${type}-${momentId}`;
};

/**
 * Validate user permission for moment access
 */
const canAccessMoment = async (momentId, anonymousId, Moment) => {
  try {
    const moment = await Moment.findById(momentId);
    if (!moment) return false;
    
    // Check if user is a participant
    const isParticipant = moment.participants.some(p => p.anonymousId === anonymousId);
    
    // Allow access if user is participant or moment is archived (read-only)
    return isParticipant || moment.isArchived || moment.isExpired;
  } catch (error) {
    console.error('Error checking moment access:', error);
    return false;
  }
};

/**
 * Rate limiting key generator for anonymous users
 */
const generateRateLimitKey = (req) => {
  // Use anonymous ID if available, fallback to IP
  return req.session.anonymousId || `ip_${req.ip}`;
};

module.exports = {
  generateAnonymousId,
  isValidAnonymousId,
  getSessionInfo,
  requireAnonymousAuth,
  cleanExpiredSessions,
  generateRoomId,
  canAccessMoment,
  generateRateLimitKey
};