const mongoose = require('mongoose');

// Use in-memory MongoDB
let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, {
      dbName: 'jest',
    });
  } catch (err) {
    // If mongodb-memory-server isn't installed, fail fast with a helpful message.
    throw new Error('mongodb-memory-server is required for tests. Please install dev dependencies.');
  }
});

afterEach(async () => {
  // Clean all collections
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});


