/**
 * Environment Variable Validation
 * Validates required environment variables at application startup
 */

/**
 * Validate that all required environment variables are set
 * @throws {Error} If any required variable is missing
 */
const validateEnv = () => {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET'
  ];

  const missing = [];
  const warnings = [];

  // Check required variables
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check optional but recommended variables
  const recommended = [
    'COOKIE_SECRET',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'NODE_ENV'
  ];

  for (const varName of recommended) {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  }

  // Report results
  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (warnings.length > 0) {
    console.warn('Missing recommended environment variables:');
    warnings.forEach(v => console.warn(`   - ${v}`));
  }

  console.log('Environment variables validated');
};

module.exports = { validateEnv };

