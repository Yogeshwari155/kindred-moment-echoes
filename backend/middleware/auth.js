const { v4: uuidv4 } = require('uuid');

/**
 * Anonymous authentication middleware
 * Generates and manages anonymous user IDs
 */
const authMiddleware = (req, res, next) => {
  try {
    // Check for existing user ID in headers, cookies, or generate new one
    let userId = req.headers['x-user-id'] || 
                 req.cookies['kindred-user-id'] || 
                 req.body.userId;
    
    // If no user ID exists, generate a new anonymous one
    if (!userId) {
      userId = `anon_${uuidv4()}`;
      
      // Set cookie for future requests (expires in 30 days)
      res.cookie('kindred-user-id', userId, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
    
    // Validate user ID format
    if (!isValidUserId(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID format',
        message: 'User ID must be a valid anonymous identifier'
      });
    }
    
    // Attach user ID to request object
    req.userId = userId;
    
    // Set user ID in response headers for client reference
    res.set('X-User-ID', userId);
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Failed to process user authentication'
    });
  }
};

/**
 * Validate anonymous user ID format
 */
function isValidUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    return false;
  }
  
  // Check if it's a valid anonymous ID format
  const anonPattern = /^anon_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return anonPattern.test(userId);
}

/**
 * Middleware to require authentication
 */
const requireAuth = (req, res, next) => {
  if (!req.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Valid user ID is required for this operation'
    });
  }
  next();
};

/**
 * Generate a new anonymous user ID
 */
const generateAnonymousId = () => {
  return `anon_${uuidv4()}`;
};

module.exports = {
  authMiddleware,
  requireAuth,
  generateAnonymousId,
  isValidUserId
};