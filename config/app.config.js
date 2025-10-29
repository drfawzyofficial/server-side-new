/**
 * Application Configuration
 * Centralized configuration for the entire application
 */

const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  'file://'
];

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // CORS Configuration
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },

  // Socket.IO Configuration
  socketIO: {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  },

  // Rate Limiting Configuration
  rateLimit: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: {
        success: false,
        error: 'Too Many Requests',
        message: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // 20 requests per window
      message: {
        success: false,
        error: 'Too Many Requests',
        message: 'Too many authentication attempts, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    }
  },

  // Security Configuration
  security: {
    helmet: {
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true
    },
    hpp: {
      whitelist: ['sort', 'filter', 'fields'],
      checkQuery: false,
      checkBody: true,
      checkParams: true
    }
  },

  // Compression Configuration
  compression: {
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return true;
    },
    level: 6 // 0-9, higher = better compression but slower
  },

  // Body Parser Configuration
  bodyParser: {
    limit: '10mb'
  },

  // Cookie Configuration
  cookie: {
    secret: process.env.COOKIE_SECRET || 'your-secret-key-change-in-production'
  },

  // MongoDB Sanitization Configuration
  mongoSanitize: {
    replaceWith: '_'
  }
};

