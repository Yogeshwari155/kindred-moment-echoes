const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: false,
    // Custom key generator for anonymous users
    keyGenerator: (req) => {
      return req.session.anonymousId || req.ip;
    }
  });
};

// General API rate limiter
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP/session to 100 requests per windowMs
  'Too many requests from this session, please try again later.'
);

// Stricter rate limiter for creating moments and posts
const creationLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  5, // limit each IP/session to 5 creation requests per minute
  'Too many creation requests, please wait before creating more content.'
);

// Chat message rate limiter
const chatLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  30, // limit each session to 30 chat messages per minute
  'Too many chat messages, please slow down.'
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:5173', // Vite dev server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    if (process.env.NODE_ENV === 'production') {
      // Add production origins here
      allowedOrigins.push('https://your-production-domain.com');
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  name: 'kindred.sid' // Custom session name
};

// Helmet security configuration
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false // Allow embedding for development
};

// Privacy middleware to ensure no personal data leakage
const privacyMiddleware = (req, res, next) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add privacy headers
  res.setHeader('X-Privacy-Policy', 'anonymous-only');
  res.setHeader('X-Data-Retention', '24-hours');
  
  next();
};

// Anonymous session middleware
const anonymousSessionMiddleware = (req, res, next) => {
  if (!req.session.anonymousId) {
    // Generate anonymous ID if not exists
    req.session.anonymousId = require('../utils/auth').generateAnonymousId();
  }
  next();
};

module.exports = {
  generalLimiter,
  creationLimiter,
  chatLimiter,
  corsOptions,
  sessionConfig,
  helmetConfig,
  privacyMiddleware,
  anonymousSessionMiddleware,
  cors: cors(corsOptions),
  helmet: helmet(helmetConfig),
  session: session(sessionConfig)
};