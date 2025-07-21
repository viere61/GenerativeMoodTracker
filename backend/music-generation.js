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

// AI Music Generation Services
const musicServices = {
  // ElevenLabs Sound Effects - Fast and good quality
  async generateWithElevenLabs(prompt) {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    console.log('🎵 Generating sound effects with ElevenLabs...');
    
    // Try sound effects API first
    try {
      const response = await axios.post('https://api.elevenlabs.io/v1/sound-effects', {
        text: prompt,
        duration_seconds: 8,
        prompt_influence: 0.3
      }, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      });
      
      return Buffer.from(response.data);
    } catch (soundError) {
      console.log('Sound effects API failed, trying text-to-speech fallback...');
      
      // Fallback to text-to-speech with ambient description
      const response = await axios.post('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        text: `Create peaceful ambient sounds representing: ${prompt}. Gentle, atmospheric, calming tones that evoke this mood and setting.`,
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
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      return Buffer.from(response.data);
    }
  },

  // Replicate MusicGen - Great for actual music generation
  async generateWithReplicate(prompt) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN not configured');
    }

    console.log('🎵 Generating music with Replicate MusicGen...');
    
    // Create prediction
    const prediction = await axios.post('https://api.replicate.com/v1/predictions', {
      version: "7a76a8258b23fae65c5a22debb8841d1d7e816b75c2f24218cd2bd8573787906", // MusicGen model
      input: {
        prompt: `${prompt}, ambient, peaceful, instrumental, 8 seconds`,
        model_version: "stereo-large",
        output_format: "mp3",
        normalization_strategy: "peak"
      }
    }, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    // Poll for completion
    let result = prediction.data;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max wait time
    
    while ((result.status === 'starting' || result.status === 'processing') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await axios.get(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });
      result = statusResponse.data;
      attempts++;
    }

    if (result.status === 'succeeded' && result.output) {
      // Download the audio file
      const audioResponse = await axios.get(result.output, {
        responseType: 'arraybuffer'
      });
      return Buffer.from(audioResponse.data);
    } else {
      throw new Error(`Replicate generation failed: ${result.error || 'Timeout or unknown error'}`);
    }
  },

  // Hugging Face Inference API - Free tier available
  async generateWithHuggingFace(prompt) {
    if (!process.env.HUGGINGFACE_API_TOKEN) {
      throw new Error('HUGGINGFACE_API_TOKEN not configured');
    }

    console.log('🎵 Generating music with Hugging Face...');
    
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/facebook/musicgen-small',
      {
        inputs: `${prompt}, peaceful, ambient, instrumental music, 8 seconds`
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      }
    );

    return Buffer.from(response.data);
  },

  // Suno AI - Alternative music generation
  async generateWithSuno(prompt) {
    if (!process.env.SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    console.log('🎵 Generating music with Suno AI...');
    
    // Note: This is a placeholder - you'd need to implement actual Suno API calls
    // Suno's API might have different endpoints and parameters
    const response = await axios.post('https://api.suno.ai/v1/generate', {
      prompt: `${prompt}, ambient instrumental music`,
      duration: 8,
      style: 'ambient'
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
  },

  // Fallback: Generate a simple tone-based audio description
  async generateFallbackAudio(prompt) {
    console.log('🎵 Generating fallback audio description...');
    
    // Analyze prompt for mood and generate appropriate tone parameters
    const moodMapping = {
      happy: { frequency: 440, type: 'major', tempo: 'upbeat' },
      joy: { frequency: 440, type: 'major', tempo: 'upbeat' },
      sad: { frequency: 220, type: 'minor', tempo: 'slow' },
      melancholy: { frequency: 220, type: 'minor', tempo: 'slow' },
      calm: { frequency: 330, type: 'ambient', tempo: 'slow' },
      peaceful: { frequency: 330, type: 'ambient', tempo: 'slow' },
      energetic: { frequency: 550, type: 'major', tempo: 'fast' },
      excited: { frequency: 550, type: 'major', tempo: 'fast' },
      anxious: { frequency: 400, type: 'dissonant', tempo: 'irregular' },
      stressed: { frequency: 400, type: 'dissonant', tempo: 'irregular' },
      default: { frequency: 380, type: 'neutral', tempo: 'medium' }
    };

    // Find matching mood in prompt
    const promptLower = prompt.toLowerCase();
    const mood = Object.keys(moodMapping).find(key => 
      promptLower.includes(key)
    ) || 'default';

    return {
      type: 'tone_description',
      mood: mood,
      ...moodMapping[mood],
      duration: 8,
      prompt: prompt,
      description: `A ${moodMapping[mood].tempo} ${moodMapping[mood].type} tone representing: ${prompt}`
    };
  }
};

// Music generation endpoint with multiple service fallbacks
router.post('/generate', musicGenerationLimiter, async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`🎵 Generating music for prompt: "${prompt}"`);
    
    let audioData = null;
    let audioFormat = 'mp3';
    let generationMethod = 'unknown';
    let errors = [];

    // Try different services in order of preference
    
    // 1. Try ElevenLabs first (fastest, good for sound effects)
    if (process.env.ELEVENLABS_API_KEY && !audioData) {
      try {
        audioData = await musicServices.generateWithElevenLabs(prompt);
        generationMethod = 'elevenlabs';
        console.log('✅ Sound effects generated successfully with ElevenLabs');
      } catch (elevenLabsError) {
        console.log('❌ ElevenLabs failed:', elevenLabsError.message);
        errors.push(`ElevenLabs: ${elevenLabsError.message}`);
      }
    }

    // 2. Try Replicate as fallback (best quality for music)
    if (process.env.REPLICATE_API_TOKEN && !audioData) {
      try {
        audioData = await musicServices.generateWithReplicate(prompt);
        generationMethod = 'replicate';
        console.log('✅ Music generated successfully with Replicate');
      } catch (replicateError) {
        console.log('❌ Replicate failed:', replicateError.message);
        errors.push(`Replicate: ${replicateError.message}`);
      }
    }

    // 3. Try Hugging Face as another fallback
    if (process.env.HUGGINGFACE_API_TOKEN && !audioData) {
      try {
        audioData = await musicServices.generateWithHuggingFace(prompt);
        generationMethod = 'huggingface';
        console.log('✅ Music generated successfully with Hugging Face');
      } catch (hfError) {
        console.log('❌ Hugging Face failed:', hfError.message);
        errors.push(`Hugging Face: ${hfError.message}`);
      }
    }

    // 4. Try Suno AI as another fallback
    if (process.env.SUNO_API_KEY && !audioData) {
      try {
        audioData = await musicServices.generateWithSuno(prompt);
        generationMethod = 'suno';
        console.log('✅ Music generated successfully with Suno AI');
      } catch (sunoError) {
        console.log('❌ Suno AI failed:', sunoError.message);
        errors.push(`Suno: ${sunoError.message}`);
      }
    }

    // 5. Use local fallback if all services fail
    if (!audioData) {
      audioData = await musicServices.generateFallbackAudio(prompt);
      generationMethod = 'fallback';
      audioFormat = 'tone_description';
      console.log('✅ Generated fallback audio description');
    }

    // Log usage for analytics
    console.log(`🎵 Music generated for user ${userId} using ${generationMethod} at ${new Date().toISOString()}`);
    
    // Handle different response types
    if (audioFormat === 'tone_description') {
      // Return tone data for client-side generation or display
      res.json({
        success: true,
        audioData: audioData,
        format: 'tone_description',
        method: generationMethod,
        duration: audioData.duration,
        errors: errors.length > 0 ? errors : undefined
      });
    } else {
      // Return base64 encoded audio
      const audioBase64 = audioData.toString('base64');
      res.json({
        success: true,
        audioData: audioBase64,
        format: audioFormat,
        method: generationMethod,
        duration: 8,
        errors: errors.length > 0 ? errors : undefined
      });
    }

  } catch (error) {
    console.error('❌ Music generation error:', error.message);
    
    res.status(500).json({ 
      error: 'Music generation failed',
      details: error.message,
      availableServices: {
        replicate: !!process.env.REPLICATE_API_TOKEN,
        huggingface: !!process.env.HUGGINGFACE_API_TOKEN,
        suno: !!process.env.SUNO_API_KEY
      }
    });
  }
});

// Test available music generation services
router.get('/test-services', async (req, res) => {
  const services = {
    elevenlabs: {
      available: !!process.env.ELEVENLABS_API_KEY,
      status: 'unknown'
    },
    replicate: {
      available: !!process.env.REPLICATE_API_TOKEN,
      status: 'unknown'
    },
    huggingface: {
      available: !!process.env.HUGGINGFACE_API_TOKEN,
      status: 'unknown'
    },
    suno: {
      available: !!process.env.SUNO_API_KEY,
      status: 'unknown'
    },
    fallback: {
      available: true,
      status: 'working'
    }
  };

  // Test ElevenLabs
  if (services.elevenlabs.available) {
    try {
      await axios.get('https://api.elevenlabs.io/v1/user', {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        }
      });
      services.elevenlabs.status = 'working';
    } catch (error) {
      services.elevenlabs.status = 'error';
      services.elevenlabs.error = error.message;
    }
  }

  // Test Replicate
  if (services.replicate.available) {
    try {
      await axios.get('https://api.replicate.com/v1/models', {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });
      services.replicate.status = 'working';
    } catch (error) {
      services.replicate.status = 'error';
      services.replicate.error = error.message;
    }
  }

  // Test Hugging Face
  if (services.huggingface.available) {
    try {
      await axios.get('https://api-inference.huggingface.co/models/facebook/musicgen-small', {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`
        }
      });
      services.huggingface.status = 'working';
    } catch (error) {
      services.huggingface.status = 'error';
      services.huggingface.error = error.message;
    }
  }

  res.json({
    success: true,
    services: services,
    recommendation: services.elevenlabs.status === 'working' ? 'elevenlabs' :
                   services.replicate.status === 'working' ? 'replicate' : 
                   services.huggingface.status === 'working' ? 'huggingface' :
                   services.suno.status === 'working' ? 'suno' : 'fallback'
  });
});

// Get usage statistics
router.get('/usage', async (req, res) => {
  try {
    res.json({
      totalRequests: 0, // Would be from database
      availableServices: {
        replicate: !!process.env.REPLICATE_API_TOKEN,
        huggingface: !!process.env.HUGGINGFACE_API_TOKEN,
        suno: !!process.env.SUNO_API_KEY,
        fallback: true
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

module.exports = router;