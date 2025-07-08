const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Middleware
const { validateDeepSeek, validateGemini } = require('../middleware/validation');
const { getRateLimiters } = require('../middleware/rateLimit');
const logger = require('../utils/logger');

// Rate limiter
const { ai } = getRateLimiters();

// ===============================
// OpenRouter + DeepSeek Setup
// ===============================
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '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', // 🔁 Paste your OpenRouter API key here
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000', // 🔁 Replace with your frontend domain if needed
    'X-Title': 'My AI App',
  },
});

// ===============================
// Gemini Setup
// ===============================
const genAI = new GoogleGenerativeAI('AIzaSyCJg8GByZGMhRrn0bYHs3BBEWcfGjVs6h8'); // 🔁 Paste your Gemini API key here
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// ===============================
// POST /deepseek
// ===============================
router.post('/deepseek', ai, validateDeepSeek, async (req, res) => {
  const { input } = req.body;
  const startTime = Date.now();

  logger.info('DeepSeek (via OpenRouter) request received', {
    ip: req.ip,
    inputLength: input.length,
    userAgent: req.get('User-Agent'),
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'deepseek/deepseek-r1:free',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: input },
      ],
    });

    const output = completion.choices?.[0]?.message?.content || 'No response';
    const totalTime = Date.now() - startTime;

    logger.info('DeepSeek (via OpenRouter) response successful', {
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

    logger.error('DeepSeek API (via OpenRouter) Error', {
      error: error.message,
      totalTime,
      ip: req.ip,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'DeepSeek API call via OpenRouter failed',
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
router.post('/gemini', ai, validateGemini, async (req, res) => {
  const { input } = req.body;
  const startTime = Date.now();

  logger.info('Gemini request received', {
    ip: req.ip,
    inputLength: input.length,
    userAgent: req.get('User-Agent'),
  });

  try {
    const result = await geminiModel.generateContent(input);
    const output = result.response.text();
    const totalTime = Date.now() - startTime;

    logger.info('Gemini response successful', {
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

    logger.error('Gemini API Error', {
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