const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

dotenv.config();

const logger = require('./utils/logger');
const connectDB = require('./config/database');
const { validateUserRegister, validateUserLogin } = require('./middleware/validation');

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const apiRoutes = require('./routes/api');

// Security middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    metadata: {
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to auth routes
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes with enhanced password handling
app.use('/api', (req, res, next) => {
  // Enhanced password validation and hashing for registration
  if (req.path === '/users/register' && req.method === 'POST') {
    // Apply validation middleware
    validateUserRegister(req, res, async (validationError) => {
      if (validationError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationError.details,
          metadata: {
            timestamp: new Date().toISOString()
          }
        });
      }

      try {
        const { username, email, password } = req.body;

        // Additional password strength validation
        const passwordStrength = validatePasswordStrength(password);
        if (!passwordStrength.isValid) {
          return res.status(400).json({
            error: 'Password does not meet security requirements',
            details: passwordStrength.errors,
            metadata: {
              timestamp: new Date().toISOString()
            }
          });
        }

        // Hash password with salt rounds
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Replace plain password with hashed password
        req.body.password = hashedPassword;

        logger.info('Password hashed successfully for registration', {
          username,
          email,
          hashed: true
        });

        next();
      } catch (error) {
        logger.error('Password hashing failed', {
          error: error.message,
          username: req.body.username,
          email: req.body.email
        });

        return res.status(500).json({
          error: 'Failed to process registration',
          metadata: {
            timestamp: new Date().toISOString()
          }
        });
      }
    });
  }
  // Enhanced password validation for login
  else if (req.path === '/users/login' && req.method === 'POST') {
    validateUserLogin(req, res, (validationError) => {
      if (validationError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationError.details,
          metadata: {
            timestamp: new Date().toISOString()
          }
        });
      }
      next();
    });
  }
  else {
    next();
  }
});

// Password strength validation function
function validatePasswordStrength(password) {
  const errors = [];
  const checks = {
    length: password.length >= 6 && password.length <= 128,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  if (!checks.length) {
    errors.push('Password must be between 6 and 128 characters');
  }
  if (!checks.lowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!checks.uppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!checks.number) {
    errors.push('Password must contain at least one number');
  }
  if (!checks.special) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }

  return {
    isValid: Object.values(checks).every(check => check),
    errors,
    strength: Object.values(checks).filter(check => check).length
  };
}

// Use API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
      
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
  
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
