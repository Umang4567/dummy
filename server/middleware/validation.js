const Joi = require('joi');
const logger = require('../utils/logger');

// Validation schemas
const schemas = {
  // DeepSeek request validation
  deepseek: Joi.object({
    input: Joi.string()
      .min(1)
      .max(10000)
      .required()
      .messages({
        'string.empty': 'Input cannot be empty',
        'string.min': 'Input must be at least 1 character long',
        'string.max': 'Input cannot exceed 10,000 characters',
        'any.required': 'Input is required'
      })
  }),

  // Gemini request validation
  gemini: Joi.object({
    input: Joi.string()
      .min(1)
      .max(10000)
      .required()
      .messages({
        'string.empty': 'Input cannot be empty',
        'string.min': 'Input must be at least 1 character long',
        'string.max': 'Input cannot exceed 10,000 characters',
        'any.required': 'Input is required'
      })
  }),

  // User registration validation
  userRegister: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .required()
      .messages({
        'string.empty': 'Username cannot be empty',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
        'any.required': 'Username is required'
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'string.empty': 'Email cannot be empty',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(6)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.empty': 'Password cannot be empty',
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'Password is required'
      })
  }),

  // User login validation
  userLogin: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'string.empty': 'Email cannot be empty',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'string.empty': 'Password cannot be empty',
        'any.required': 'Password is required'
      })
  })
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      logger.error(`Validation schema '${schemaName}' not found`);
      return res.status(500).json({ error: 'Validation configuration error' });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation failed', {
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
        errors: errorDetails
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errorDetails
      });
    }

    // Replace req.body with validated data
    req.body = value;
    next();
  };
};

// Export validation functions
module.exports = {
  validateDeepSeek: validate('deepseek'),
  validateGemini: validate('gemini'),
  schemas
}; 