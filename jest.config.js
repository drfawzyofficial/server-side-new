module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  roots: ['<rootDir>'],
  verbose: true,
  transform: {},
  modulePaths: ['<rootDir>'],
};


