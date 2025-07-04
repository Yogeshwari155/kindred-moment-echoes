# Kindred Moments Backend

A Node.js/Express/MongoDB backend for the Kindred Moments app - an anonymous, location-based social journaling platform.

## Features

- 🔐 **Anonymous Authentication**: UUID-based user identification without personal data
- 📍 **Location-based Moments**: Create and join moments based on geographic proximity
- 💬 **Real-time Chat**: Socket.IO powered ephemeral messaging
- 🎭 **Mood Tracking**: Vote on and track collective moods
- 📝 **Social Posts**: Share thoughts and experiences within moments
- 🧹 **Auto-cleanup**: Automatic data expiration after 24 hours
- 🛡️ **Security**: Rate limiting, CORS, Helmet, input validation
- 📊 **Analytics**: Mood trends and moment statistics

## Quick Start

### Prerequisites

- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### Installation

1. **Clone and setup**
```bash
git clone <repository-url>
cd backend
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start MongoDB**
```bash
# Using MongoDB service
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

4. **Run the server**
```bash
# Development
npm run dev

# Production
npm start
```

The server will start on `http://localhost:3001`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/kindred-moments` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:8080` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `MOMENT_EXPIRY_HOURS` | Hours before moments expire | `24` |
| `CLEANUP_INTERVAL_HOURS` | Cleanup job interval | `1` |

## API Documentation

### Authentication

All requests require an anonymous user ID. The server automatically generates one if not provided.

**Headers:**
```
X-User-ID: anon_uuid-here
```

### Endpoints

#### Moments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/moments` | Get active moments |
| `POST` | `/api/moments` | Create/join moment |
| `GET` | `/api/moments/:id` | Get specific moment |
| `PUT` | `/api/moments/:id/join` | Join moment |
| `PUT` | `/api/moments/:id/leave` | Leave moment |
| `GET` | `/api/moments/:id/posts` | Get moment posts |
| `GET` | `/api/moments/archived` | Get user's archived moments |

#### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/posts` | Create post |
| `GET` | `/api/posts/:id` | Get specific post |
| `PUT` | `/api/posts/:id/react` | Add reaction |
| `DELETE` | `/api/posts/:id/react` | Remove reaction |
| `DELETE` | `/api/posts/:id` | Delete post |
| `GET` | `/api/posts/user/my-posts` | Get user's posts |

#### Moods

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/moods/vote` | Submit mood vote |
| `GET` | `/api/moods/moment/:id` | Get moment mood summary |
| `GET` | `/api/moods/user/:id` | Get user's mood vote |
| `DELETE` | `/api/moods/vote/:id` | Remove mood vote |
| `GET` | `/api/moods/trending` | Get trending moods |

### Request Examples

#### Create a Moment
```javascript
const response = await fetch('http://localhost:3001/api/moments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-ID': 'anon_your-uuid-here'
  },
  body: JSON.stringify({
    location: {
      name: "Coffee shop on 5th Ave",
      coordinates: {
        latitude: 40.7128,
        longitude: -74.0060
      },
      address: "123 5th Avenue, New York, NY"
    }
  })
});

const data = await response.json();
```

#### Create a Post
```javascript
const response = await fetch('http://localhost:3001/api/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-ID': 'anon_your-uuid-here'
  },
  body: JSON.stringify({
    momentId: "moment-id-here",
    content: "The way the afternoon light hits this coffee cup feels like a warm hug.",
    mood: "calm",
    type: "text"
  })
});

const data = await response.json();
```

#### Vote on Mood
```javascript
const response = await fetch('http://localhost:3001/api/moods/vote', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-ID': 'anon_your-uuid-here'
  },
  body: JSON.stringify({
    momentId: "moment-id-here",
    mood: "calm",
    intensity: 4
  })
});

const data = await response.json();
```

## Real-time Features (Socket.IO)

### Client Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  withCredentials: true
});

// Authenticate
socket.emit('authenticate', { userId: 'anon_your-uuid-here' });

// Join a moment
socket.emit('join_moment', { momentId: 'moment-id-here' });

// Send chat message
socket.emit('send_message', { 
  momentId: 'moment-id-here', 
  message: 'Hello everyone!' 
});
```

### Events

#### Client → Server
- `authenticate` - Authenticate user
- `join_moment` - Join moment room
- `leave_moment` - Leave moment room
- `send_message` - Send chat message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

#### Server → Client
- `authenticated` - Authentication successful
- `new_message` - New chat message
- `new_post` - New post in moment
- `mood_updated` - Mood summary updated
- `user_typing` - User typing indicator
- `participant_joined` - User joined moment
- `participant_left` - User left moment

## Data Models

### Moment
```javascript
{
  location: {
    name: String,
    coordinates: { latitude: Number, longitude: Number },
    address: String
  },
  isActive: Boolean,
  participants: [{ userId: String, joinedAt: Date, lastActive: Date }],
  moodSummary: {
    totalVotes: Number,
    moods: Map,
    dominantMoods: [{ mood: String, emoji: String, percentage: Number }]
  },
  stats: { totalPosts: Number, peakParticipants: Number },
  createdAt: Date (expires after 24h)
}
```

### Post
```javascript
{
  momentId: ObjectId,
  userId: String,
  content: String,
  mood: String,
  type: 'text' | 'image',
  imageUrl: String,
  reactions: [{ userId: String, type: String, createdAt: Date }],
  isVisible: Boolean,
  createdAt: Date (expires after 24h)
}
```

### Mood
```javascript
{
  momentId: ObjectId,
  userId: String,
  mood: String,
  intensity: Number (1-5),
  createdAt: Date (expires after 24h)
}
```

## Security Features

- **Rate Limiting**: Configurable limits per endpoint
- **CORS**: Restricted to frontend domain
- **Helmet**: Security headers
- **Input Validation**: Express-validator for all inputs
- **Anonymous Auth**: No personal data storage
- **Data Expiration**: Automatic cleanup after 24 hours

## Deployment

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
MONGODB_URI=mongodb://your-mongo-host:27017/kindred-moments
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com
```

## Monitoring & Maintenance

### Health Check
```bash
curl http://localhost:3001/health
```

### Manual Cleanup
```bash
npm run cleanup
```

### Database Indexes
The app automatically creates necessary indexes for:
- Location-based queries
- Time-based queries  
- User-based queries
- TTL (Time To Live) for auto-expiration

## Development

### Project Structure
```
backend/
├── models/          # Mongoose schemas
├── routes/          # Express route handlers  
├── middleware/      # Custom middleware
├── socket/          # Socket.IO handlers
├── jobs/            # Background jobs
├── config/          # Configuration files
├── server.js        # Main server file
└── package.json
```

### Scripts
```bash
npm run dev          # Development with nodemon
npm start            # Production server
npm run cleanup      # Manual data cleanup
npm test             # Run tests
npm run lint         # Code linting
```

### Testing
```bash
# Install test dependencies
npm install --save-dev jest supertest

# Run tests
npm test
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MongoDB is running
   - Verify connection string in `.env`
   - Check network connectivity

2. **CORS Errors**
   - Verify `FRONTEND_URL` in `.env`
   - Check frontend is running on correct port

3. **Socket.IO Connection Issues**
   - Verify WebSocket support
   - Check firewall settings
   - Ensure CORS is properly configured

4. **Rate Limiting**
   - Adjust limits in `.env`
   - Check if IP is being blocked

### Logs
```bash
# View server logs
tail -f logs/server.log

# View error logs  
tail -f logs/error.log
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.