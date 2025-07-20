const axios = require('axios');

// Test ElevenLabs API key
async function testElevenLabsAPI() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY is not set');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
  
  try {
    // Test with a simple request
    const response = await axios.post('https://api.elevenlabs.io/v1/sound-generation', {
      text: 'peaceful ambient soundscape',
      model_id: 'eleven_eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      },
      duration_seconds: 8
    }, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });
    
    console.log('✅ ElevenLabs API test successful!');
    console.log('Response size:', response.data.length, 'bytes');
    
  } catch (error) {
    console.error('❌ ElevenLabs API test failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('🔑 Invalid API key - please check your ElevenLabs API key');
    } else if (error.response?.status === 400) {
      console.error('📝 API request format issue');
    } else if (error.response?.status === 429) {
      console.error('⏰ Rate limit exceeded');
    }
  }
}

testElevenLabsAPI(); 