# Kindred Moments Backend Setup Guide

## 📁 Folder Structure

The complete backend has been generated with the following structure:

```
backend/
├── package.json              # Dependencies and scripts
├── server.js                 # Main application entry point
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore patterns
├── README.md                # Detailed documentation
│
├── config/
│   └── database.js          # MongoDB connection configuration
│
├── models/
│   ├── Moment.js            # Moment schema (location + time + participants)
│   ├── Post.js              # Post schema (text + mood + media)
│   └── ChatMessage.js       # Ephemeral chat message schema
│
├── routes/
│   ├── moments.js           # Moment CRUD and post/mood operations
│   └── archive.js           # Archived moments for read-only access
│
├── middleware/
│   └── security.js          # Rate limiting, CORS, sessions, privacy
│
├── utils/
│   └── auth.js              # Anonymous authentication utilities
│
├── sockets/
│   └── chatHandler.js       # Real-time chat via Socket.IO
│
└── jobs/
    └── cleanup.js           # Cron jobs for data cleanup and archival
```

## 🚀 Quick Installation

1. **Navigate to the backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Setup environment:**
```bash
cp .env.example .env
```

4. **Configure your `.env` file:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kindred-moments
NODE_ENV=development
SESSION_SECRET=your-super-secret-session-key-here
CORS_ORIGIN=http://localhost:3000
```

5. **Start MongoDB (if local):**
```bash
# macOS with Homebrew
brew services start mongodb-community

# Or run directly
mongod
```

6. **Start the development server:**
```bash
npm run dev
```

## 📦 NPM Packages Included

### Core Dependencies
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **socket.io** - Real-time communication
- **cors** - Cross-origin resource sharing
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-session** - Session management
- **uuid** - Anonymous ID generation
- **node-cron** - Scheduled cleanup jobs
- **dotenv** - Environment variable management
- **express-validator** - Input validation
- **multer** - File upload handling
- **compression** - Response compression
- **morgan** - HTTP request logging

### Dev Dependencies
- **nodemon** - Development auto-restart
- **jest** - Testing framework
- **supertest** - HTTP testing

## 🔧 Key Features Implemented

### 1. Anonymous Authentication System
- Generates unique anonymous IDs using UUID v4
- Session-based authentication without personal data
- Automatic session cleanup

### 2. Location-Based Moments
- GeoJSON Point coordinates for precise location
- 50-meter radius for co-location detection
- Automatic moment joining when nearby

### 3. Real-Time Features
- Socket.IO for instant chat messages
- Real-time post and mood updates
- Typing indicators and user presence

### 4. Data Expiration & Privacy
- TTL indexes for automatic MongoDB cleanup
- 24-hour expiration for moments and chat
- Cron jobs for data archival
- No personal data retention

### 5. Security & Rate Limiting
- Comprehensive rate limiting (API + chat)
- CORS protection with configurable origins
- Helmet security headers
- Input validation on all endpoints

## 🌐 API Endpoints Overview

### Moments
- `POST /api/moments` - Create/join moment by location
- `GET /api/moments/:id` - Get moment details with posts
- `POST /api/moments/:id/posts` - Add post to moment
- `POST /api/moments/:id/moods` - Submit mood vote

### Archive
- `GET /api/archived-moments` - Browse past moments (read-only)
- `GET /api/archived-moments/:id` - Get specific archived moment

### Utility
- `GET /health` - Health check and system status
- `GET /` - API documentation

## 🔌 WebSocket Events

### Client → Server
- `joinMoment` - Join moment chat room
- `sendMessage` - Send chat message
- `typing` - Typing indicator
- `leaveMoment` - Leave moment

### Server → Client
- `chatHistory` - Recent messages on join
- `newMessage` - Real-time message broadcast
- `userJoined/userLeft` - Presence updates
- `newPost` - Real-time post notifications
- `moodUpdate` - Live mood summary updates

## 📊 Database Models

### Moment Schema
- Location (GeoJSON Point)
- Time window (24-hour lifespan)
- Anonymous participants array
- Referenced posts array
- Mood summary counters
- Active/archived status

### Post Schema
- Text content (max 300 chars)
- Optional media URL and type
- Required mood selection
- Anonymous user ID
- Moment reference

### ChatMessage Schema
- Message content (max 500 chars)
- Auto-expiring timestamp
- Message type (text/emoji/system)
- Moment and user references

## ⚡ Performance Features

- Database indexing for geospatial queries
- Connection pooling for MongoDB
- Response compression
- Efficient TTL-based cleanup
- Optimized real-time event handling

## 🛡️ Privacy & Security

- **Zero personal data** - Only anonymous IDs
- **Automatic expiration** - All data deleted after 24h
- **Rate limiting** - Prevents abuse
- **CORS protection** - Controlled access
- **Input validation** - Prevents injection attacks
- **Session security** - HTTPOnly cookies

## 🚀 Production Ready

The backend includes production considerations:
- Error handling and logging
- Graceful shutdown procedures
- Health check endpoints
- Environment-based configuration
- Process management compatibility (PM2)
- Database connection resilience

## 📝 Next Steps

1. Start the backend server
2. Test API endpoints with Postman/curl
3. Integrate with your frontend
4. Configure production MongoDB
5. Deploy to your hosting platform

Your Kindred Moments backend is now ready to power anonymous, location-based social journaling experiences! 🎉