const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test Gemini endpoint (will fail without API key)
    console.log('2. Testing Gemini endpoint...');
    try {
      const geminiResponse = await axios.post(`${BASE_URL}/api/gemini`, {
        input: 'Hello, how are you?'
      });
      console.log('✅ Gemini response:', geminiResponse.data.output);
    } catch (error) {
      console.log('❌ Gemini error:', error.response?.data?.error || error.message);
    }
    console.log('');

    // Test DeepSeek endpoint (will fail without API key)
    console.log('3. Testing DeepSeek endpoint...');
    try {
      const deepseekResponse = await axios.post(`${BASE_URL}/api/deepseek`, {
        input: 'Hello, how are you?'
      });
      console.log('✅ DeepSeek response:', deepseekResponse.data.output);
    } catch (error) {
      console.log('❌ DeepSeek error:', error.response?.data?.error || error.message);
    }

  } catch (error) {
    console.log('❌ Server connection failed:', error.message);
    console.log('Make sure your server is running on port 5000');
  }
}

testAPI(); 