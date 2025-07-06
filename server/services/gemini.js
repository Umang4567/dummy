const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    this.modelName = 'gemini-2.0-flash-exp'; // Gemini 2.5 Pro Experimental
    
    if (!this.apiKey) {
      logger.error('Google Gemini API key not found in environment variables');
      throw new Error('GOOGLE_GEMINI_API_KEY is required');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: this.modelName,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    logger.info('Gemini service initialized', { model: this.modelName });
  }

  async generateResponse(prompt, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info('Generating Gemini response', {
        promptLength: prompt.length,
        model: this.modelName,
        options
      });

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const processingTime = Date.now() - startTime;
      
      logger.info('Gemini response generated successfully', {
        processingTime,
        responseLength: text.length,
        model: this.modelName
      });

      return {
        output: text,
        metadata: {
          model: this.modelName,
          processingTime,
          timestamp: new Date().toISOString(),
          usage: {
            promptTokens: result.usageMetadata?.promptTokenCount || 0,
            responseTokens: result.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: result.usageMetadata?.totalTokenCount || 0
          }
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Gemini API error', {
        error: error.message,
        processingTime,
        model: this.modelName,
        stack: error.stack
      });

      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  async generateStreamingResponse(prompt, onChunk) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting Gemini streaming response', {
        promptLength: prompt.length,
        model: this.modelName
      });

      const result = await this.model.generateContentStream(prompt);
      let fullResponse = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        
        if (onChunk) {
          onChunk(chunkText);
        }
      }

      const processingTime = Date.now() - startTime;
      
      logger.info('Gemini streaming response completed', {
        processingTime,
        responseLength: fullResponse.length,
        model: this.modelName
      });

      return {
        output: fullResponse,
        metadata: {
          model: this.modelName,
          processingTime,
          timestamp: new Date().toISOString(),
          streaming: true
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Gemini streaming API error', {
        error: error.message,
        processingTime,
        model: this.modelName,
        stack: error.stack
      });

      throw new Error(`Gemini streaming API error: ${error.message}`);
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const result = await this.generateResponse('Hello');
      return {
        status: 'healthy',
        model: this.modelName,
        response: result.output.substring(0, 50) + '...'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        model: this.modelName,
        error: error.message
      };
    }
  }
}

module.exports = GeminiService; 