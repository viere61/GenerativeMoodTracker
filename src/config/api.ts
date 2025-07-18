/**
 * API Configuration for the Generative Mood Tracker app
 * 
 * IMPORTANT: Replace the placeholder values with your actual API keys
 * For security, consider using environment variables in production
 */

export const API_CONFIG = {
  // Hugging Face API Configuration
  HUGGING_FACE: {
    // Get your token from: https://huggingface.co/settings/tokens
    API_TOKEN: 'YOUR_HUGGINGFACE_TOKEN_HERE',
    
    // MusicGen model endpoints (these may not be available through inference API)
    MUSICGEN_SMALL: 'https://api-inference.huggingface.co/models/facebook/musicgen-small',
    MUSICGEN_MEDIUM: 'https://api-inference.huggingface.co/models/facebook/musicgen-medium',
    MUSICGEN_MELODY: 'https://api-inference.huggingface.co/models/facebook/musicgen-melody',
    MUSICGEN_STABLE: 'https://api-inference.huggingface.co/models/facebook/musicgen-stereo-small',
    
    // Alternative working endpoints
    AUDIOGEN: 'https://api-inference.huggingface.co/models/facebook/audiogen-medium',
    TTS: 'https://api-inference.huggingface.co/models/facebook/fastspeech2-en-ljspeech',
    
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