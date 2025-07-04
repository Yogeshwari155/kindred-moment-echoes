const rateLimit = require('express-rate-limit');

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Stricter rate limiting for POST requests
const postLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 POST requests per 5 minutes
  message: {
    error: 'Too many posts',
    message: 'Too many posts created, please slow down.',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Very strict rate limiting for mood votes
const moodLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 mood votes per minute
  message: {
    error: 'Too many mood votes',
    message: 'Please wait before voting on moods again.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Chat message rate limiting
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 chat messages per minute
  message: {
    error: 'Too many messages',
    message: 'Please slow down your messaging.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  generalLimiter,
  postLimiter,
  moodLimiter,
  chatLimiter
};