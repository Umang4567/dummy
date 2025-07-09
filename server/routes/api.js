const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Middleware (disabled temporarily for debugging)
// const { validateDeepSeek, validateGemini } = require('../middleware/validation');
// const { getRateLimiters } = require('../middleware/rateLimit');
const logger = require('../utils/logger');

// Rate limiter (disabled)
// const { ai } = getRateLimiters();

// ===============================
// OpenRouter + DeepSeek Setup
// ===============================
const DEEPSEEK_API_KEY = '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';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: DEEPSEEK_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'My AI App',
  },
});

// ===============================
// Gemini Setup
// ===============================
const GEMINI_API_KEY = 'AIzaSyCJg8GByZGMhRrn0bYHs3BBEWcfGjVs6h8';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ===============================
// GET /health - API Health Check
// ===============================
router.get('/health', (req, res) => {
  res.json({
    status: 'API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      gemini: '/api/gemini',
      deepseek: '/api/deepseek',
    },
  });
});

// ===============================
// POST /deepseek
// ===============================
router.post('/deepseek', async (req, res) => {
  const { input } = req.body;
  const startTime = Date.now();

  logger.info('DeepSeek request received', {
    ip: req.ip,
    inputLength: input?.length,
    userAgent: req.get('User-Agent'),
  });

  try {
    console.log("⚙️ Calling OpenRouter...");
    const completion = await openai.chat.completions.create({
      model: 'deepseek/deepseek-r1:free',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: input },
      ],
    });

    const output = completion?.choices?.[0]?.message?.content || 'No response';
    const totalTime = Date.now() - startTime;

    logger.info('✅ DeepSeek response successful', {
      totalTime,
      outputLength: output.length,
    });

    res.json({
      output,
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;

    logger.error('❌ DeepSeek API Error', {
      error: error.message,
      totalTime,
      ip: req.ip,
      stack: error.stack,
    });

    // Ensure response is still valid JSON
    res.status(500).json({
      error: 'DeepSeek API call failed',
      details: error.message,
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// ===============================
// POST /gemini
// ===============================
router.post('/gemini', async (req, res) => {
  const { input } = req.body;
  const startTime = Date.now();

  logger.info('Gemini request received', {
    ip: req.ip,
    inputLength: input?.length,
    userAgent: req.get('User-Agent'),
  });

  try {
    const result = await geminiModel.generateContent(input);
    const output = result.response.text();
    const totalTime = Date.now() - startTime;

    logger.info('✅ Gemini response successful', {
      totalTime,
      outputLength: output.length,
    });

    res.json({
      output,
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;

    logger.error('❌ Gemini API Error', {
      error: error.message,
      totalTime,
      ip: req.ip,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Gemini API call failed',
      details: error.message,
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

module.exports = router;
