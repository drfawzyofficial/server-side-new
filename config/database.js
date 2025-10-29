/**
 * MongoDB Database Configuration
 * Handles database connection, reconnection logic, and lifecycle management
 */

const mongoose = require('mongoose');

// Configuration
const config = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/elproject_db',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,                    // Maximum number of connections in the pool
    minPoolSize: 5,                     // Minimum number of connections in the pool
    serverSelectionTimeoutMS: 5000,     // Timeout for server selection
    socketTimeoutMS: 45000,             // Close sockets after 45 seconds of inactivity
    family: 4,                          // Use IPv4, skip trying IPv6
    retryWrites: true,                  // Retry failed writes
    w: 'majority'                       // Write concern
  },
  retryAttempts: 5,
  retryDelay: 3000
};

// Connection state tracking
let isConnected = false;
let connectionAttempts = 0;

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async () => {
  // If already connected, return existing connection
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('MongoDB: Using existing connection');
    return mongoose.connection;
  }

  try {
    connectionAttempts++;
    
    console.log(`MongoDB: Attempting connection (${connectionAttempts}/${config.retryAttempts})...`);
    console.log(`MongoDB: Connecting to ${maskConnectionString(config.uri)}`);

    const conn = await mongoose.connect(config.uri, config.options);

    isConnected = true;
    connectionAttempts = 0;

    console.log(`MongoDB: Connected successfully`);
    console.log(`MongoDB: Host: ${conn.connection.host}`);
    console.log(`MongoDB: Database: ${conn.connection.name}`);
    console.log(`MongoDB: Ready state: ${getReadyStateString(conn.connection.readyState)}`);

    // Setup connection event handlers
    setupEventHandlers();

    return conn;
  } catch (error) {
    isConnected = false;
    console.error(`MongoDB: Connection failed (Attempt ${connectionAttempts}/${config.retryAttempts})`);
    console.error(`MongoDB: Error: ${error.message}`);

    // Retry logic
    if (connectionAttempts < config.retryAttempts) {
      console.log(`MongoDB: Retrying in ${config.retryDelay / 1000} seconds...`);
      await delay(config.retryDelay);
      return connectDB();
    } else {
      console.error('MongoDB: Maximum retry attempts reached. Exiting...');
      process.exit(1);
    }
  }
};

/**
 * Setup event handlers for connection lifecycle
 */
const setupEventHandlers = () => {
  // Prevent duplicate event listeners
  mongoose.connection.removeAllListeners();

  // Connection error handler
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB: Runtime connection error:', err.message);
    isConnected = false;
  });

  // Disconnection handler
  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB: Disconnected from database');
    isConnected = false;
  });

  // Reconnection handler
  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB: Reconnected to database');
    isConnected = true;
  });

  // Connection established handler
  mongoose.connection.on('connected', () => {
    console.log('MongoDB: Connection established');
    isConnected = true;
  });

  // Mongoose-specific connection events
  mongoose.connection.on('close', () => {
    console.log('MongoDB: Connection closed');
    isConnected = false;
  });

  // Monitor slow queries (queries taking more than 100ms)
  if (process.env.NODE_ENV !== 'production') {
    mongoose.set('debug', (collectionName, method, query, doc) => {
      console.log(`MongoDB Query: ${collectionName}.${method}`, JSON.stringify(query));
    });
  }
};

/**
 * Gracefully disconnect from MongoDB
 */
const disconnectDB = async () => {
  try {
    if (!isConnected || mongoose.connection.readyState === 0) {
      console.log('MongoDB: Already disconnected');
      return;
    }

    console.log('MongoDB: Closing connection...');
    await mongoose.connection.close();
    isConnected = false;
    console.log('MongoDB: Connection closed successfully');
  } catch (error) {
    console.error('MongoDB: Error closing connection:', error.message);
    throw error;
  }
};

/**
 * Check database connection health
 */
const checkHealth = async () => {
  try {
    if (!isConnected || mongoose.connection.readyState !== 1) {
      return {
        status: 'unhealthy',
        connected: false,
        readyState: getReadyStateString(mongoose.connection.readyState)
      };
    }

    // Ping the database
    await mongoose.connection.db.admin().ping();

    return {
      status: 'healthy',
      connected: true,
      readyState: getReadyStateString(mongoose.connection.readyState),
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      models: Object.keys(mongoose.connection.models).length
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message
    };
  }
};

/**
 * Get current connection state
 */
const getConnectionState = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    readyStateString: getReadyStateString(mongoose.connection.readyState),
    host: mongoose.connection.host,
    name: mongoose.connection.name
  };
};

/**
 * Helper: Convert ready state to string
 */
const getReadyStateString = (state) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
};

/**
 * Helper: Mask connection string for secure logging
 */
const maskConnectionString = (uri) => {
  try {
    const url = new URL(uri);
    if (url.username) {
      url.username = '***';
    }
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    // If URI parsing fails, just mask everything after @
    return uri.replace(/:\/\/([^@]+)@/, '://***:***@');
  }
};

/**
 * Helper: Delay utility for retry logic
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  connectDB,
  disconnectDB,
  checkHealth,
  getConnectionState
};
