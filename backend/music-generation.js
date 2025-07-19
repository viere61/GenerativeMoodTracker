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
    
    console.log('Calling ElevenLabs API with prompt:', prompt);
    console.log('API Key present:', !!process.env.ELEVENLABS_API_KEY);
    
    // Call ElevenLabs API
    const response = await axios.post('https://api.elevenlabs.io/v1/sound-generation', {
      text: prompt,
      model_id: 'eleven_eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      },
      duration_seconds: 8
    }, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });

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
    
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded for ElevenLabs API' });
    }
    
    // Handle ElevenLabs unusual activity detection
    if (error.response?.status === 400) {
      const errorData = error.response.data;
      if (typeof errorData === 'object' && errorData.detail?.status === 'detected_unusual_activity') {
        console.error('ElevenLabs detected unusual activity - this might be due to new account or API key issues');
        return res.status(400).json({ 
          error: 'ElevenLabs API detected unusual activity. Please check your API key and account status.',
          details: 'This usually happens with new accounts or invalid API keys'
        });
      }
    }
    
    res.status(500).json({ error: 'Music generation failed' });
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