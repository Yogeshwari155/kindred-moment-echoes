const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// Import configurations and middleware
const { connectDB, createIndexes } = require('./config/database');
const { 
  generalLimiter, 
  creationLimiter, 
  cors, 
  helmet, 
  session,
  privacyMiddleware,
  anonymousSessionMiddleware
} = require('./middleware/security');

// Import routes
const momentsRoutes = require('./routes/moments');
const archiveRoutes = require('./routes/archive');

// Import Socket.IO handler
const { handleChatConnection } = require('./sockets/chatHandler');

// Import cleanup jobs
const { initializeCleanupJobs } = require('./jobs/cleanup');

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Store io instance in app for access in routes
app.set('io', io);

// Basic middleware
app.use(compression()); // Compress responses
app.use(helmet); // Security headers
app.use(privacyMiddleware); // Privacy headers
app.use(cors); // CORS handling

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Session middleware (must be before Socket.IO session sharing)
app.use(session);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Anonymous session middleware
app.use(anonymousSessionMiddleware);

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  const { getConnectionInfo, isConnected } = require('./config/database');
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      connected: isConnected(),
      info: getConnectionInfo()
    },
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/moments', creationLimiter, momentsRoutes);
app.use('/api/archived-moments', archiveRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Kindred Moments API',
    version: '1.0.0',
    description: 'Backend for anonymous co-located social journaling',
    endpoints: [
      'GET /health - Health check',
      'POST /api/moments - Create or join moment',
      'GET /api/moments/:id - Get moment details',
      'POST /api/moments/:id/posts - Add post to moment',
      'POST /api/moments/:id/moods - Submit mood',
      'GET /api/archived-moments - Get archived moments'
    ],
    websocket: {
      namespace: '/',
      events: ['joinMoment', 'sendMessage', 'typing', 'leaveMoment']
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found on this server',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// Socket.IO session sharing middleware
const sessionMiddleware = session;
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  handleChatConnection(io, socket);
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Create database indexes
    await createIndexes();
    
    // Initialize cleanup jobs
    if (process.env.NODE_ENV !== 'test') {
      initializeCleanupJobs();
    }
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Kindred Moments server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/kindred-moments'}`);
      console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
      console.log(`📊 API Docs: http://localhost:${PORT}/`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed. Exiting process.');
    process.exit(0);
  });
});

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };