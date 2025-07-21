/**
 * ElevenLabs Sound Effects API service
 * Optimized for paid subscription tiers
 */
const axios = require('axios');

/**
 * Generate sound effects using ElevenLabs API
 * @param {string} prompt - Text prompt for sound generation
 * @returns {Promise<Buffer>} - Audio data as Buffer
 */
async function generateSoundEffects(prompt) {
    if (!process.env.ELEVENLABS_API_KEY) {
        throw new Error('ELEVENLABS_API_KEY not configured');
    }

    console.log('🎵 Generating sound effects with ElevenLabs...');

    // First, verify the API key works by checking user info
    try {
        const userResponse = await axios.get('https://api.elevenlabs.io/v1/user', {
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY
            },
            timeout: 5000
        });

        // Check subscription tier
        const tier = userResponse.data.subscription?.tier || 'free';
        const isPaidTier = tier.toLowerCase() !== 'free';

        console.log('✅ ElevenLabs API key verified, subscription tier:', tier,
            isPaidTier ? '(Paid subscription)' : '(Free tier)');

        if (!isPaidTier) {
            console.warn('⚠️ Using ElevenLabs free tier - Sound Effects API may not be available');
        }
    } catch (authError) {
        // If we can't even verify the API key, don't try the other endpoints
        console.error('❌ ElevenLabs API key verification failed:',
            authError.response?.status, authError.message);

        if (authError.response?.status === 401) {
            throw new Error('ElevenLabs API key is invalid or account has been restricted');
        } else {
            throw new Error(`ElevenLabs API key verification failed: ${authError.message}`);
        }
    }

    // Use Sound Effects API (available on paid plans)
    try {
        console.log('Using ElevenLabs Sound Effects API...');
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

        // Verify we got actual audio data
        if (response.data && response.data.length > 1000) {
            console.log('✅ Sound effects generated successfully, size:', response.data.length);
            return Buffer.from(response.data);
        } else {
            console.warn('⚠️ Sound effects API returned suspiciously small data:', response.data.length);
            throw new Error('Sound effects API returned invalid data');
        }
    } catch (soundError) {
        console.error('❌ Sound effects API failed:', soundError.message);

        // Check if this is a 404 error (endpoint doesn't exist)
        if (soundError.response?.status === 404) {
            throw new Error('Sound effects API not available (404) - verify your subscription includes this feature');
        } else if (soundError.response?.status === 401) {
            throw new Error('Unauthorized access to Sound Effects API - verify your subscription and API key');
        } else {
            throw new Error(`Sound effects generation failed: ${soundError.message}`);
        }
    }
}

module.exports = { generateSoundEffects };