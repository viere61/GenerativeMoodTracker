/**
 * API Configuration for the Generative Mood Tracker app
 * 
 * IMPORTANT: Replace the placeholder values with your actual API keys
 * For security, consider using environment variables in production
 */

export const API_CONFIG = {
  // ElevenLabs API Configuration (Recommended)
  ELEVENLABS: {
    // Get your API key from: https://elevenlabs.io/
    API_KEY: 'sk_a8dc817712d334c201220401a0a947f55894775f41882d28',
    
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
    API_TOKEN: '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',
    
    // API request settings
    TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
  },
  
  // App-specific settings
  APP: {
    MUSIC_GENERATION_ENABLED: true,
    FALLBACK_MUSIC_ENABLED: true,
    DEBUG_MODE: __DEV__, // Enable debug logging in development
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