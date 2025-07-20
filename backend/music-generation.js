const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiting: 10 requests per hour per user
const musicGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each user to 10 requests per hour
  message: 'Too many music generation requests, please try again later',
  keyGenerator: (req) => req.user?.id || req.ip, // Use user ID if authenticated, otherwise IP
  trustProxy: true, // Trust proxy for Railway deployment
});

// Music generation endpoint
router.post('/generate', musicGenerationLimiter, async (req, res) => {
  try {
    const { prompt, userId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Debug: Check if API key is set
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    // Validate API key format (ElevenLabs keys should start with 'sk_')
    if (!process.env.ELEVENLABS_API_KEY.startsWith('sk_')) {
      console.error('Invalid ElevenLabs API key format - should start with sk_');
      return res.status(500).json({ error: 'Invalid ElevenLabs API key format' });
    }

    console.log('Calling ElevenLabs Sound Effects API with prompt:', prompt);
    console.log('API Key present:', !!process.env.ELEVENLABS_API_KEY);
    console.log('API Key length:', process.env.ELEVENLABS_API_KEY?.length || 0);
    console.log('API Key starts with:', process.env.ELEVENLABS_API_KEY?.substring(0, 10) || 'N/A');

    let response;

    // Try sound effects API first
    try {
      console.log('Trying ElevenLabs Sound Effects API...');
      response = await axios.post('https://api.elevenlabs.io/v1/sound-effects', {
        text: prompt,
        duration_seconds: 8,
        prompt_influence: 0.3
      }, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });
    } catch (soundError) {
      console.log('Sound effects API failed, trying text-to-speech fallback...');

      // Fallback to text-to-speech with a nature-focused voice
      response = await axios.post('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        text: `Imagine peaceful ambient sounds representing: ${prompt}. Soft, calming, atmospheric tones that evoke this mood and setting.`,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.8,
          similarity_boost: 0.3,
          style: 0.2,
          use_speaker_boost: false
        }
      }, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });
    }

    // Convert to base64 for client
    const audioBase64 = Buffer.from(response.data).toString('base64');

    // Log usage for analytics
    console.log(`Music generated for user ${userId} at ${new Date().toISOString()}`);

    res.json({
      success: true,
      audioData: audioBase64,
      format: 'mp3',
      duration: 8
    });

  } catch (error) {
    console.error('Music generation error:', error.response?.data || error.message);
    console.error('Error status:', error.response?.status);
    console.error('Error details:', error.response?.data);

    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded for ElevenLabs API' });
    }



    // Handle ElevenLabs unusual activity detection
    if (error.response?.status === 401) {
      let errorMessage = 'Invalid ElevenLabs API key';

      // Try to parse the error response
      try {
        const errorData = error.response.data;
        if (Buffer.isBuffer(errorData)) {
          const errorString = errorData.toString();
          const errorObj = JSON.parse(errorString);
          if (errorObj.detail?.status === 'detected_unusual_activity') {
            errorMessage = 'ElevenLabs detected unusual activity. This usually happens with new accounts, invalid API keys, or when the account needs verification.';
            console.error('ElevenLabs unusual activity detected:', errorObj.detail);
          }
        }
      } catch (parseError) {
        console.error('Could not parse ElevenLabs error response:', parseError);
      }

      return res.status(401).json({ error: errorMessage });
    }

    // Return more specific error information
    res.status(500).json({
      error: 'Music generation failed',
      details: error.message,
      status: error.response?.status
    });
  }
});

// Test ElevenLabs API key endpoint
router.get('/test-api', async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    // Basic validation
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'ELEVENLABS_API_KEY not found in environment variables'
      });
    }

    if (!apiKey.startsWith('sk_')) {
      return res.status(500).json({
        success: false,
        error: 'Invalid API key format - should start with sk_'
      });
    }

    console.log('Testing ElevenLabs API key...');

    // Test 1: Get user info
    const userResponse = await axios.get('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': apiKey
      }
    });

    // Test 2: Get available voices
    const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey
      }
    });

    // Test 3: Try different endpoints to see what's available
    const testResults = {
      userInfo: true,
      voices: true,
      soundEffects: false,
      textToSpeech: false
    };

    // Try sound effects endpoint
    try {
      await axios.post('https://api.elevenlabs.io/v1/sound-effects', {
        text: 'test',
        duration_seconds: 2
      }, {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });
      testResults.soundEffects = true;
    } catch (soundError) {
      console.log('Sound effects endpoint not available:', soundError.response?.status);
    }

    // Try text-to-speech with first available voice
    try {
      const firstVoice = voicesResponse.data.voices[0];
      await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${firstVoice.voice_id}`, {
        text: 'Test',
        model_id: 'eleven_monolingual_v1'
      }, {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });
      testResults.textToSpeech = true;
    } catch (ttsError) {
      console.log('Text-to-speech test failed:', ttsError.response?.status);
    }

    res.json({
      success: true,
      message: 'ElevenLabs API key is working!',
      userInfo: {
        tier: userResponse.data.subscription?.tier || 'Free',
        charactersRemaining: userResponse.data.subscription?.character_count || 'N/A',
        characterLimit: userResponse.data.subscription?.character_limit || 'N/A'
      },
      availableVoices: voicesResponse.data.voices.length,
      endpointTests: testResults
    });

  } catch (error) {
    console.error('ElevenLabs API test failed:', error.response?.status, error.response?.data);

    let errorMessage = 'API test failed';
    let errorDetails = error.message;

    if (error.response?.data) {
      try {
        // Handle buffer response
        if (Buffer.isBuffer(error.response.data)) {
          const errorString = error.response.data.toString();
          const errorObj = JSON.parse(errorString);
          errorMessage = errorObj.detail || errorMessage;
        } else if (typeof error.response.data === 'object') {
          errorMessage = error.response.data.detail || error.response.data.message || errorMessage;
        }
      } catch (parseError) {
        // Ignore parse errors
      }
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      details: errorDetails,
      status: error.response?.status
    });
  }
});

// Get usage statistics (for admin dashboard)
router.get('/usage', async (req, res) => {
  try {
    // This would typically query a database for usage stats
    // For now, return basic info
    res.json({
      totalRequests: 0, // Would be from database
      dailyLimit: 1000, // Your ElevenLabs plan limit
      remainingRequests: 1000 // Would calculate from usage
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

module.exports = router; 