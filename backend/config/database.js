const mongoose = require('mongoose');

/**
 * Database connection configuration
 */
class Database {
  constructor() {
    this.connection = null;
  }

  async connect(uri = null) {
    try {
      const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/kindred-moments';
      
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferMaxEntries: 0, // Disable mongoose buffering
        bufferCommands: false, // Disable mongoose buffering
      };

      this.connection = await mongoose.connect(mongoUri, options);
      
      console.log(`MongoDB connected: ${this.connection.connection.host}`);
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
      }
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  async healthCheck() {
    try {
      if (!this.isConnected()) {
        throw new Error('Database not connected');
      }

      // Simple ping to check database responsiveness
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        readyState: mongoose.connection.readyState,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;