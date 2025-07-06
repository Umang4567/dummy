const express = require('express');
const axios = require('axios');
const router = express.Router();

// Import middleware
const { validateChain, validateScira, validateDeepSeek, validateGemini } = require('../middleware/validation');
const { getRateLimiters } = require('../middleware/rateLimit');
const logger = require('../utils/logger');

// Import models
const User = require('../models/User');
const ChatHistory = require('../models/ChatHistory');

// Import services
const GeminiService = require('../services/gemini');

// Get rate limiters based on environment
const { general, ai, chain } = getRateLimiters();

// Initialize Gemini service
let geminiService;
try {
  geminiService = new GeminiService();
} catch (error) {
  logger.error('Failed to initialize Gemini service', { error: error.message });
}

// Chain endpoint - combines Scira and DeepSeek
router.post("/chain", 
  chain, // Rate limiting
  validateChain, // Validation
  async (req, res) => {
    const { input } = req.body;
    const startTime = Date.now();

    logger.info('Chain request received', {
      ip: req.ip,
      inputLength: input.length,
      userAgent: req.get('User-Agent')
    });

    try {
      // Step 1: Call Scira API
      logger.info('Calling Scira API');
      const sciraRes = await axios.post("https://api.scira.ai/infer", {
        prompt: input
      }, {
        headers: {
          Authorization: `Bearer ${process.env.SCIRA_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000 // 30 second timeout
      });

      const sciraOutput = sciraRes.data.output || sciraRes.data.result;
      logger.info('Scira API response received', { 
        outputLength: sciraOutput.length,
        responseTime: Date.now() - startTime
      });

      // Step 2: Call DeepSeek API with Scira's output
      logger.info('Calling DeepSeek API');
      const deepSeekRes = await axios.post("https://api.deepseek.com/generate", {
        prompt: sciraOutput
      }, {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000 // 30 second timeout
      });

      const deepSeekOutput = deepSeekRes.data.output || deepSeekRes.data.result;
      const totalTime = Date.now() - startTime;

      logger.info('Chain request completed successfully', {
        totalTime,
        sciraOutputLength: sciraOutput.length,
        deepSeekOutputLength: deepSeekOutput.length
      });

      // Step 3: Send DeepSeek output to frontend
      res.json({ 
        output: deepSeekOutput,
        chain: {
          scira: sciraOutput,
          deepseek: deepSeekOutput
        },
        metadata: {
          processingTime: totalTime,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      logger.error('Chain request failed', {
        error: error.message,
        totalTime,
        ip: req.ip,
        stack: error.stack
      });
      
      if (error.response) {
        logger.error('API Error Details', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
        
        return res.status(error.response.status).json({ 
          error: "API service error", 
          details: error.response.data,
          metadata: {
            processingTime: totalTime,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.status(500).json({ 
        error: "Chaining failed. Please check logs.",
        metadata: {
          processingTime: totalTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

// Individual API endpoints
router.post("/scira", 
  ai, // Rate limiting
  validateScira, // Validation
  async (req, res) => {
    const { input } = req.body;
    const startTime = Date.now();

    logger.info('Scira request received', {
      ip: req.ip,
      inputLength: input.length,
      userAgent: req.get('User-Agent')
    });

    try {
      const response = await axios.post("https://api.scira.ai/infer", {
        prompt: input
      }, {
        headers: {
          Authorization: `Bearer ${process.env.SCIRA_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000 // 30 second timeout
      });

      const output = response.data.output || response.data.result;
      const totalTime = Date.now() - startTime;

      logger.info('Scira request completed successfully', {
        totalTime,
        outputLength: output.length
      });

      res.json({ 
        output,
        metadata: {
          processingTime: totalTime,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      logger.error('Scira API Error', {
        error: error.message,
        totalTime,
        ip: req.ip,
        stack: error.stack
      });
      
      res.status(500).json({ 
        error: "Scira API call failed",
        metadata: {
          processingTime: totalTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

router.post("/deepseek", 
  ai, // Rate limiting
  validateDeepSeek, // Validation
  async (req, res) => {
    const { input } = req.body;
    const startTime = Date.now();

    logger.info('DeepSeek request received', {
      ip: req.ip,
      inputLength: input.length,
      userAgent: req.get('User-Agent')
    });

    try {
      const response = await axios.post("https://api.deepseek.com/generate", {
        prompt: input
      }, {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000 // 30 second timeout
      });

      const output = response.data.output || response.data.result;
      const totalTime = Date.now() - startTime;

      logger.info('DeepSeek request completed successfully', {
        totalTime,
        outputLength: output.length
      });

      res.json({ 
        output,
        metadata: {
          processingTime: totalTime,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      logger.error('DeepSeek API Error', {
        error: error.message,
        totalTime,
        ip: req.ip,
        stack: error.stack
      });
      
      res.status(500).json({ 
        error: "DeepSeek API call failed",
        metadata: {
          processingTime: totalTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

// Gemini endpoint
router.post("/gemini", 
  ai, // Rate limiting
  validateGemini, // Validation
  async (req, res) => {
    const { input } = req.body;
    const startTime = Date.now();

    if (!geminiService) {
      return res.status(503).json({ 
        error: "Gemini service is not available. Please check API key configuration.",
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    logger.info('Gemini request received', {
      ip: req.ip,
      inputLength: input.length,
      userAgent: req.get('User-Agent')
    });

    try {
      const result = await geminiService.generateResponse(input);
      const totalTime = Date.now() - startTime;

      logger.info('Gemini request completed successfully', {
        totalTime,
        outputLength: result.output.length,
        model: result.metadata.model
      });

      res.json({
        output: result.output,
        metadata: {
          ...result.metadata,
          processingTime: totalTime
        }
      });

    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      logger.error('Gemini API Error', {
        error: error.message,
        totalTime,
        ip: req.ip,
        stack: error.stack
      });
      
      res.status(500).json({ 
        error: "Gemini API call failed",
        details: error.message,
        metadata: {
          processingTime: totalTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

// User management endpoints
router.post('/users/login', async (req, res) => {
  const { email, password } = req.body;
  const startTime = Date.now();

  logger.info('User login request received', {
    ip: req.ip,
    email
  });

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check password using bcrypt for hashed passwords
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password',
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();
    const totalTime = Date.now() - startTime;

    logger.info('User logged in successfully', {
      userId: user._id,
      totalTime
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    logger.error('User login failed', {
      error: error.message,
      totalTime,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Failed to login',
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

router.post('/users/register', async (req, res) => {
  const { username, email, password } = req.body;
  const startTime = Date.now();

  logger.info('User registration request received', {
    ip: req.ip,
    username,
    email
  });

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email or username already exists',
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create new user (password is already hashed by middleware)
    const user = new User({
      username,
      email,
      password
    });

    await user.save();
    const totalTime = Date.now() - startTime;

    logger.info('User registered successfully', {
      userId: user._id,
      totalTime
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      },
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    logger.error('User registration failed', {
      error: error.message,
      totalTime,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Failed to register user',
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Save chat history
router.post('/chat/save', async (req, res) => {
  const { userId, messages, model = 'gemini' } = req.body;
  const startTime = Date.now();

  logger.info('Chat history save request received', {
    ip: req.ip,
    userId,
    messageCount: messages?.length || 0,
    model
  });

  try {
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create or update chat history
    let chatHistory = await ChatHistory.findOne({ userId });
    
    if (chatHistory) {
      // Update existing chat history
      chatHistory.messages = messages;
      chatHistory.model = model;
      chatHistory.updatedAt = new Date();
    } else {
      // Create new chat history
      chatHistory = new ChatHistory({
        userId,
        messages,
        model
      });
    }

    await chatHistory.save();
    const totalTime = Date.now() - startTime;

    logger.info('Chat history saved successfully', {
      userId,
      chatHistoryId: chatHistory._id,
      totalTime
    });

    res.json({
      message: 'Chat history saved successfully',
      chatHistory: {
        id: chatHistory._id,
        messageCount: chatHistory.messages.length,
        model: chatHistory.model,
        updatedAt: chatHistory.updatedAt
      },
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    logger.error('Chat history save failed', {
      error: error.message,
      totalTime,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Failed to save chat history',
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get chat history
router.get('/chat/:userId', async (req, res) => {
  const { userId } = req.params;
  const startTime = Date.now();

  logger.info('Chat history retrieval request received', {
    ip: req.ip,
    userId
  });

  try {
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get chat history
    const chatHistory = await ChatHistory.findOne({ userId });
    const totalTime = Date.now() - startTime;

    logger.info('Chat history retrieved successfully', {
      userId,
      hasHistory: !!chatHistory,
      totalTime
    });

    res.json({
      chatHistory: chatHistory ? {
        id: chatHistory._id,
        messages: chatHistory.messages,
        model: chatHistory.model,
        createdAt: chatHistory.createdAt,
        updatedAt: chatHistory.updatedAt
      } : null,
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    logger.error('Chat history retrieval failed', {
      error: error.message,
      totalTime,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Failed to retrieve chat history',
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router; 