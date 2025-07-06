const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General rate limiter for all API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Stricter rate limiter for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 AI requests per windowMs
  message: {
    error: 'Too many AI requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('AI rate limit exceeded', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many AI requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Very strict rate limiter for chain endpoint (most resource-intensive)
const chainLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 chain requests per windowMs
  message: {
    error: 'Too many chain requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Chain rate limit exceeded', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many chain requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Development rate limiter (more lenient for testing)
const devLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Much higher limit for development
  message: {
    error: 'Development rate limit exceeded.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Development rate limit exceeded', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Development rate limit exceeded.',
      retryAfter: '15 minutes'
    });
  }
});

// Export appropriate limiter based on environment
const getRateLimiters = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      general: devLimiter,
      ai: devLimiter,
      chain: devLimiter
    };
  }
  
  return {
    general: generalLimiter,
    ai: aiLimiter,
    chain: chainLimiter
  };
};

module.exports = {
  generalLimiter,
  aiLimiter,
  chainLimiter,
  devLimiter,
  getRateLimiters
}; 