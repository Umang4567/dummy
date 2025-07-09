// server/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Middleware
const { validateDeepSeek, validateGemini } = require('./middleware/validation');
const { getRateLimiters } = require('./middleware/rateLimit');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiter
const { ai } = getRateLimiters();

// Basic middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});

// ===============================
// OpenRouter + DeepSeek Setup
// ===============================
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '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', // Using your existing DeepSeek API key
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000', // Frontend domain
    'X-Title': 'My AI App',
  },
});

// ===============================
// Gemini Setup
// ===============================
const genAI = new GoogleGenerativeAI('AIzaSyCJg8GByZGMhRrn0bYHs3BBEWcfGjVs6h8'); // Using your existing Gemini API key
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ===============================
// POST /api/deepseek
// ===============================
app.post('/api/deepseek', ai, validateDeepSeek, async (req, res) => {
  const { input } = req.body;
  const startTime = Date.now();

  logger.info('DeepSeek (via OpenRouter) request received', {
    ip: req.ip,
    inputLength: input.length,
    userAgent: req.get('User-Agent'),
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'deepseek/deepseek-r1-0528:free',
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
// POST /api/gemini
// ===============================
app.post('/api/gemini', ai, validateGemini, async (req, res) => {
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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
