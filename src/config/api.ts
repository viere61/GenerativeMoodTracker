/**
 * API Configuration for the Generative Mood Tracker app
 * 
 * IMPORTANT: Replace the placeholder values with your actual API keys
 * For security, consider using environment variables in production
 */

export const API_CONFIG = {
  // Backend API Configuration
  BACKEND_URL: 'https://generativemoodtracker-production.up.railway.app', // Railway backend URL
  
  // ElevenLabs API Configuration (Recommended)
  ELEVENLABS: {
    // Get your API key from: https://elevenlabs.io/
    API_KEY: 'YOUR_ELEVENLABS_API_KEY_HERE',
    
    // API request settings
    TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
  },
  
  // OpenAI TTS Configuration (Alternative)
  OPENAI: {
    // Get your API key from: https://platform.openai.com/
    API_KEY: 'YOUR_OPENAI_API_KEY_HERE',
    
    // API request settings
    TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
  },
  
  // Hugging Face API Configuration (Legacy - not working)
  HUGGING_FACE: {
    // Get your token from: https://huggingface.co/settings/tokens
    API_TOKEN: 'YOUR_HUGGINGFACE_TOKEN_HERE',
    
    // API request settings
    TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
  },
  
  // App-specific settings
  APP: {
    MUSIC_GENERATION_ENABLED: true,
    FALLBACK_MUSIC_ENABLED: true,
    DEBUG_MODE: true, // Force enable debug logging to troubleshoot music generation
  }
};

/**
 * Get the API token for Hugging Face
 * @returns The API token or throws an error if not configured
 */
export function getHuggingFaceToken(): string {
  const token = API_CONFIG.HUGGING_FACE.API_TOKEN;
  if (!token || token === 'YOUR_HUGGINGFACE_TOKEN_HERE') {
    throw new Error(
      'Hugging Face API token not configured. Please set your token in src/config/api.ts'
    );
  }
  return token;
}

/**
 * Check if music generation is enabled
 * @returns Whether music generation is enabled
 */
export function isMusicGenerationEnabled(): boolean {
  return API_CONFIG.APP.MUSIC_GENERATION_ENABLED;
}

/**
 * Get debug mode status
 * @returns Whether debug mode is enabled
 */
export function isDebugMode(): boolean {
  return API_CONFIG.APP.DEBUG_MODE;
} 