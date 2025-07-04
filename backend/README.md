# Kindred Moments Backend

A Node.js backend for the Kindred Moments social journaling app that enables anonymous users to share short journal entries, moods, and ephemeral chats tied to the same real-world moment (location + time).

## Features

- **Anonymous Authentication**: No personal data storage, uses temporary session IDs
- **Location-based Moments**: Users can create or join moments when co-located
- **Real-time Chat**: Ephemeral chat messages that auto-expire after 24 hours
- **Post Sharing**: Short text posts (max 300 chars) with optional media and mood
- **Mood Tracking**: Collective mood summaries for each moment
- **Auto-cleanup**: Automatic archival/deletion of expired content
- **Privacy-first**: No personal data retention, anonymous-only interactions

## Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator
- **Scheduling**: Node-cron for cleanup jobs

## Quick Start

### Prerequisites

- Node.js 16 or higher
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository and navigate to backend:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kindred-moments
NODE_ENV=development
SESSION_SECRET=your-super-secret-session-key-here
CORS_ORIGIN=http://localhost:3000
```

5. Start MongoDB (if running locally):
```bash
mongod
```

6. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Endpoints

### Moments

#### Create or Join Moment
```http
POST /api/moments
Content-Type: application/json

{
  "latitude": 37.7749,
  "longitude": -122.4194
}
```

#### Get Moment Details
```http
GET /api/moments/:id
```

#### Add Post to Moment
```http
POST /api/moments/:id/posts
Content-Type: application/json

{
  "text": "Beautiful sunset here!",
  "mood": "happy",
  "mediaUrl": "https://example.com/photo.jpg",
  "mediaType": "photo"
}
```

#### Submit Mood
```http
POST /api/moments/:id/moods
Content-Type: application/json

{
  "mood": "grateful"
}
```

### Archive

#### Get Archived Moments
```http
GET /api/archived-moments?page=1&limit=20&latitude=37.7749&longitude=-122.4194&radius=1000
```

#### Get Specific Archived Moment
```http
GET /api/archived-moments/:id
```

### Health Check
```http
GET /health
```

## WebSocket Events

### Client to Server Events

- `joinMoment` - Join a moment's chat room
- `sendMessage` - Send chat message
- `typing` - Typing indicator
- `leaveMoment` - Leave moment

### Server to Client Events

- `chatHistory` - Recent chat messages
- `newMessage` - New chat message received
- `userJoined` - Someone joined the moment
- `userLeft` - Someone left the moment
- `userTyping` - Typing indicator
- `newPost` - New post added to moment
- `moodUpdate` - Mood summary updated
- `systemMessage` - System notifications
- `error` - Error messages

## Data Models

### Moment Schema
```javascript
{
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  timeWindow: {
    start: Date,
    end: Date  // 24 hours from start
  },
  participants: [{
    anonymousId: String,
    joinedAt: Date
  }],
  posts: [ObjectId],  // References to Post documents
  moodSummary: {
    happy: Number,
    sad: Number,
    excited: Number,
    calm: Number,
    anxious: Number,
    grateful: Number,
    reflective: Number,
    total: Number
  },
  isActive: Boolean,
  isArchived: Boolean
}
```

### Post Schema
```javascript
{
  text: String,  // max 300 characters
  mediaUrl: String,  // optional
  mediaType: String,  // 'photo' or 'sketch'
  mood: String,  // required mood
  anonymousUserId: String,
  momentId: ObjectId,
  isVisible: Boolean
}
```

### ChatMessage Schema
```javascript
{
  momentId: ObjectId,
  anonymousUserId: String,
  message: String,  // max 500 characters
  messageType: String,  // 'text', 'emoji', 'system'
  expiresAt: Date  // 24 hours from creation
}
```

## Security Features

- **Rate Limiting**: API and chat message limits
- **CORS Protection**: Configured allowed origins
- **Helmet Security**: Security headers
- **Session Security**: Secure session configuration
- **Input Validation**: Request validation middleware
- **Anonymous Sessions**: No personal data storage
- **TTL Indexes**: Automatic data expiration

## Background Jobs

The application includes automatic cleanup jobs:

- **Hourly**: Clean up expired chat messages
- **Daily**: Archive expired moments and clean orphaned data
- **Configurable**: TTL indexes for automatic MongoDB cleanup

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (when implemented)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/kindred-moments` |
| `NODE_ENV` | Environment mode | `development` |
| `SESSION_SECRET` | Session encryption key | `fallback-secret-change-in-production` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Production Deployment

1. Set environment to production:
```env
NODE_ENV=production
```

2. Use a strong session secret:
```env
SESSION_SECRET=your-super-secure-random-string
```

3. Configure MongoDB Atlas or production database:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kindred-moments
```

4. Set production CORS origin:
```env
CORS_ORIGIN=https://your-production-domain.com
```

5. Start with PM2 or similar process manager:
```bash
pm2 start server.js --name "kindred-moments"
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all linting passes
5. Test with real mobile devices for location features

## License

MIT License - see LICENSE file for details