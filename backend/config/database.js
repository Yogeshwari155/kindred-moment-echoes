const mongoose = require('mongoose');

/**
 * Database connection configuration
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kindred-moments';
    
    const options = {
      // Recommended options for production
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };

    // Connect to MongoDB
    await mongoose.connect(mongoURI, options);
    
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
    console.log(`Database: ${mongoose.connection.name}`);
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

/**
 * Check if database is connected
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get database connection info
 */
const getConnectionInfo = () => {
  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
};

/**
 * Create database indexes for optimal performance
 */
const createIndexes = async () => {
  try {
    console.log('Creating database indexes...');
    
    // Ensure all schema indexes are created
    const models = mongoose.models;
    
    for (const modelName in models) {
      await models[modelName].createIndexes();
      console.log(`Indexes created for ${modelName}`);
    }
    
    console.log('All database indexes created successfully');
    
  } catch (error) {
    console.error('Error creating database indexes:', error);
  }
};

module.exports = {
  connectDB,
  isConnected,
  getConnectionInfo,
  createIndexes
};