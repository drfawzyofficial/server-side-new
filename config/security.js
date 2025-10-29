/**
 * Security Configuration
 * Central place for all security-related settings
 */

module.exports = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256',
    issuer: 'elproject-api',
    audience: 'elproject-users'
  },

  // Cookie Configuration
  cookie: {
    secret: process.env.COOKIE_SECRET || 'your-cookie-secret',
    options: {
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  },

  // Rate Limiting Configuration
  rateLimit: {
    // General routes
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    },
    // Authentication routes (stricter)
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // Limit each IP to 20 requests per windowMs
      message: 'Too many authentication attempts, please try again later.'
    },
    // File upload routes (very strict)
    upload: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // Limit each IP to 10 uploads per windowMs
      message: 'Too many upload requests, please try again later.'
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3001', 'http://localhost:3000', 'file://'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Response-Time'],
    maxAge: 600 // 10 minutes
  },

  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },

  // Password Requirements
  password: {
    minLength: 6,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false // Optional for better UX
  },

  // File Upload Security
  fileUpload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
    uploadDir: './uploads',
    tempDir: './uploads/temp'
  },

  // Database Security
  database: {
    // NoSQL Injection Prevention
    sanitize: true,
    // Maximum query execution time
    maxTimeMS: 5000, // 5 seconds
    // Connection pool size
    poolSize: 10
  },

  // Session Security
  session: {
    name: 'sessionId', // Don't use default 'connect.sid'
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Brute Force Protection
  bruteForce: {
    freeRetries: 5,
    minWait: 1 * 60 * 1000, // 1 minute
    maxWait: 15 * 60 * 1000, // 15 minutes
    lifetime: 24 * 60 * 60 // 24 hours
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    // Don't log sensitive data
    sanitize: true,
    blacklist: ['password', 'token', 'secret', 'authorization']
  },

  // Security Headers
  headers: {
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'deny'
    },
    xssFilter: true,
    noSniff: true,
    ieNoOpen: true,
    hidePoweredBy: true
  },

  // Email Security
  email: {
    // Rate limit email sending
    maxEmailsPerHour: 10,
    // Email verification code expiry
    verificationCodeExpiry: 15 * 60 * 1000, // 15 minutes
    // Maximum code attempts
    maxCodeAttempts: 5
  }
};

