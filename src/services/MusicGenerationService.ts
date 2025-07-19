import { MoodEntry, GeneratedMusic } from '../types';
import { generateUUID } from '../utils/uuid';
import LocalStorageManager from './LocalStorageManager';
import WebStorageService from './WebStorageService';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { API_CONFIG, getHuggingFaceToken, isDebugMode } from '../config/api';

// Check if we're running on web
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
const isReactNative = typeof global !== 'undefined' && (global as any).navigator && (global as any).navigator.product === 'ReactNative';
const isExpoGo = typeof global !== 'undefined' && (global as any).__EXPO_DEVTOOLS_GLOBAL_HOOK__;

/**
 * Service for generating music based on mood entries using AI-powered music generation
 * Falls back to sophisticated procedural music generation when external APIs are unavailable
 */
class MusicGenerationService {
  // Alternative AI music generation services
  private readonly AI_SERVICES = {
    // ElevenLabs - Sound Effects API (available on free tier)
    ELEVENLABS: {
      endpoint: 'https://api.elevenlabs.io/v1/sound-generation',
      enabled: true,
      apiKey: API_CONFIG.ELEVENLABS.API_KEY,
    },
    // Hugging Face (disabled due to API limitations)
    HUGGING_FACE: {
      enabled: false,
    },
    // Alternative: Mubert API (requires separate setup)
    MUBERT: {
      endpoint: 'https://api.mubert.com/v2/GenerateMusic',
      enabled: false, // Requires API key setup
    },
    // Alternative: AIVA API (requires separate setup)
    AIVA: {
      endpoint: 'https://api.aiva.ai/v1/generate',
      enabled: false, // Requires API key setup
    }
  };
  
  // Maximum number of retry attempts for music generation
  private readonly MAX_RETRIES = 3;
  
  // Local directory for storing generated music files
  private readonly MUSIC_DIRECTORY = `${FileSystem.documentDirectory}music/`;
  
  // Sound object for playback
  private soundObject: Audio.Sound | null = null;
  
  // Track current playback status
  private isPlaying = false;
  private currentMusicId: string | null = null;
  private isRepeatEnabled = false;
  private volume = 1.0;
  
  // Track generation status
  private generationInProgress = false;
  private generationQueue: Array<{userId: string, moodEntry: MoodEntry}> = [];
  
  // Enhanced mapping of mood ratings to musical parameters
  private moodToMusicMap: Record<number, {
    tempo: number;
    keySignature: string;
    scaleType: string;
    density: number;
    dynamics: number;
    instrumentation: string[];
    reverb: number;
    complexity: number;
    harmony: string;
  }> = {
    // Very negative moods (1-2): Slow, minor keys, sparse instrumentation
    1: {
      tempo: 60,
      keySignature: 'C minor',
      scaleType: 'minor',
      density: 0.3,
      dynamics: 0.4,
      instrumentation: ['piano', 'strings'],
      reverb: 0.8,
      complexity: 0.3,
      harmony: 'dissonant',
    },
    2: {
      tempo: 65,
      keySignature: 'G minor',
      scaleType: 'minor',
      density: 0.4,
      dynamics: 0.5,
      instrumentation: ['piano', 'cello'],
      reverb: 0.7,
      complexity: 0.4,
      harmony: 'minor',
    },
    // Somewhat negative moods (3-4): Slow-medium, minor keys with occasional major chords
    3: {
      tempo: 72,
      keySignature: 'D minor',
      scaleType: 'minor',
      density: 0.5,
      dynamics: 0.5,
      instrumentation: ['piano', 'guitar', 'strings'],
      reverb: 0.6,
      complexity: 0.5,
      harmony: 'minor_major',
    },
    4: {
      tempo: 80,
      keySignature: 'A minor',
      scaleType: 'dorian',
      density: 0.5,
      dynamics: 0.6,
      instrumentation: ['piano', 'guitar', 'bass'],
      reverb: 0.5,
      complexity: 0.5,
      harmony: 'dorian',
    },
    // Neutral moods (5-6): Medium tempo, mix of minor and major
    5: {
      tempo: 88,
      keySignature: 'F major',
      scaleType: 'mixolydian',
      density: 0.6,
      dynamics: 0.6,
      instrumentation: ['piano', 'guitar', 'bass', 'light percussion'],
      reverb: 0.5,
      complexity: 0.6,
      harmony: 'mixolydian',
    },
    6: {
      tempo: 96,
      keySignature: 'D major',
      scaleType: 'major',
      density: 0.6,
      dynamics: 0.7,
      instrumentation: ['piano', 'guitar', 'bass', 'percussion'],
      reverb: 0.4,
      complexity: 0.6,
      harmony: 'major',
    },
    // Positive moods (7-8): Medium-fast, major keys
    7: {
      tempo: 104,
      keySignature: 'A major',
      scaleType: 'major',
      density: 0.7,
      dynamics: 0.7,
      instrumentation: ['piano', 'guitar', 'bass', 'percussion', 'synth'],
      reverb: 0.4,
      complexity: 0.7,
      harmony: 'major',
    },
    8: {
      tempo: 112,
      keySignature: 'E major',
      scaleType: 'lydian',
      density: 0.7,
      dynamics: 0.8,
      instrumentation: ['piano', 'guitar', 'bass', 'percussion', 'synth'],
      reverb: 0.3,
      complexity: 0.7,
      harmony: 'lydian',
    },
    // Very positive moods (9-10): Fast, bright major keys
    9: {
      tempo: 120,
      keySignature: 'B major',
      scaleType: 'lydian',
      density: 0.8,
      dynamics: 0.8,
      instrumentation: ['piano', 'guitar', 'bass', 'full percussion', 'synth', 'brass'],
      reverb: 0.3,
      complexity: 0.8,
      harmony: 'lydian',
    },
    10: {
      tempo: 132,
      keySignature: 'E major',
      scaleType: 'lydian',
      density: 0.9,
      dynamics: 0.9,
      instrumentation: ['piano', 'guitar', 'bass', 'full percussion', 'synth', 'brass', 'strings'],
      reverb: 0.2,
      complexity: 0.9,
      harmony: 'lydian',
    },
  };

  // Enhanced emotion tags and their musical influences
  private emotionToMusicMap: Record<string, any> = {
    // Negative emotions
    'sad': {
      scaleModifier: 'minor',
      tempoModifier: -10,
      instrumentAdd: ['cello'],
      reverbModifier: 0.1,
      harmonyModifier: 'dissonant',
    },
    'anxious': {
      scaleModifier: 'diminished',
      tempoModifier: 5,
      instrumentAdd: ['tremolo strings'],
      rhythmComplexity: 0.7,
      harmonyModifier: 'chromatic',
    },
    'angry': {
      scaleModifier: 'phrygian',
      tempoModifier: 10,
      instrumentAdd: ['distorted guitar', 'heavy percussion'],
      dynamics: 0.8,
      harmonyModifier: 'power_chords',
    },
    'frustrated': {
      scaleModifier: 'minor',
      tempoModifier: 5,
      instrumentAdd: ['distorted bass'],
      rhythmComplexity: 0.6,
      harmonyModifier: 'minor',
    },
    'tired': {
      scaleModifier: 'minor',
      tempoModifier: -15,
      instrumentAdd: ['soft pad'],
      density: 0.4,
      harmonyModifier: 'ambient',
    },
    
    // Neutral emotions
    'calm': {
      scaleModifier: 'major',
      tempoModifier: -10,
      instrumentAdd: ['acoustic guitar', 'soft pad'],
      reverbModifier: 0.1,
      harmonyModifier: 'open_chords',
    },
    'focused': {
      scaleModifier: 'major',
      tempoModifier: 0,
      instrumentAdd: ['piano', 'minimal percussion'],
      rhythmComplexity: 0.4,
      harmonyModifier: 'minimal',
    },
    'reflective': {
      scaleModifier: 'dorian',
      tempoModifier: -5,
      instrumentAdd: ['piano', 'ambient pad'],
      reverbModifier: 0.1,
      harmonyModifier: 'modal',
    },
    
    // Positive emotions
    'happy': {
      scaleModifier: 'major',
      tempoModifier: 10,
      instrumentAdd: ['bright synth'],
      dynamics: 0.8,
      harmonyModifier: 'major',
    },
    'excited': {
      scaleModifier: 'lydian',
      tempoModifier: 15,
      instrumentAdd: ['bright synth', 'full percussion'],
      dynamics: 0.9,
      harmonyModifier: 'lydian',
    },
    'grateful': {
      scaleModifier: 'major',
      tempoModifier: 0,
      instrumentAdd: ['acoustic guitar', 'warm pad'],
      reverbModifier: 0.05,
      harmonyModifier: 'warm',
    },
    'peaceful': {
      scaleModifier: 'major',
      tempoModifier: -5,
      instrumentAdd: ['flute', 'soft strings'],
      reverbModifier: 0.1,
      harmonyModifier: 'peaceful',
    },
    'energetic': {
      scaleModifier: 'major',
      tempoModifier: 15,
      instrumentAdd: ['electric guitar', 'drums'],
      dynamics: 0.9,
      harmonyModifier: 'energetic',
    },
    'creative': {
      scaleModifier: 'mixolydian',
      tempoModifier: 5,
      instrumentAdd: ['synth', 'experimental sounds'],
      complexity: 0.8,
      harmonyModifier: 'experimental',
    },
  };

  // Text sentiment analysis keywords and their musical influences
  private sentimentKeywords: Record<string, any> = {
    // Negative sentiment keywords
    'struggle': { tempoModifier: -5, scalePreference: 'minor' },
    'difficult': { tempoModifier: -5, scalePreference: 'minor' },
    'challenge': { tempoModifier: 0, scalePreference: 'minor' },
    'stress': { tempoModifier: 5, scalePreference: 'diminished' },
    'worry': { tempoModifier: 0, scalePreference: 'minor' },
    'fear': { tempoModifier: 0, scalePreference: 'diminished' },
    'sad': { tempoModifier: -10, scalePreference: 'minor' },
    'lonely': { tempoModifier: -10, scalePreference: 'minor' },
    'tired': { tempoModifier: -15, scalePreference: 'minor' },
    'exhausted': { tempoModifier: -15, scalePreference: 'minor' },
    
    // Positive sentiment keywords
    'happy': { tempoModifier: 10, scalePreference: 'major' },
    'joy': { tempoModifier: 15, scalePreference: 'lydian' },
    'excited': { tempoModifier: 15, scalePreference: 'lydian' },
    'grateful': { tempoModifier: 5, scalePreference: 'major' },
    'thankful': { tempoModifier: 5, scalePreference: 'major' },
    'peaceful': { tempoModifier: -5, scalePreference: 'major' },
    'calm': { tempoModifier: -10, scalePreference: 'major' },
    'love': { tempoModifier: 0, scalePreference: 'major' },
    'hope': { tempoModifier: 5, scalePreference: 'major' },
    'inspired': { tempoModifier: 10, scalePreference: 'lydian' },
    
    // Intensity modifiers
    'very': { intensityModifier: 0.2 },
    'extremely': { intensityModifier: 0.3 },
    'somewhat': { intensityModifier: -0.1 },
    'slightly': { intensityModifier: -0.2 },
  };

  /**
   * Generate music parameters based on a mood entry
   * @param moodEntry The mood entry to generate music for
   * @returns Music generation parameters
   */
  generateMusicParameters(moodEntry: MoodEntry): any {
    // Start with base parameters from mood rating
    const moodRating = Math.min(Math.max(Math.round(moodEntry.moodRating), 1), 10);
    const baseParameters = { ...this.moodToMusicMap[moodRating] };
    
    // Adjust parameters based on emotion tags
    const adjustedParameters = this.applyEmotionTagModifiers(baseParameters, moodEntry.emotionTags);
    
    // Further adjust based on text analysis of reflection
    const finalParameters = this.applyTextAnalysisModifiers(adjustedParameters, moodEntry.reflection);
    
    return finalParameters;
  }

  /**
   * Apply modifiers based on emotion tags
   * @param baseParameters Base music parameters
   * @param emotionTags Array of emotion tags
   * @returns Adjusted music parameters
   */
  private applyEmotionTagModifiers(baseParameters: any, emotionTags: string[]): any {
    const params = { ...baseParameters };
    
    // Apply modifiers from each emotion tag
    emotionTags.forEach(tag => {
      const emotion = tag.toLowerCase();
      if (this.emotionToMusicMap[emotion]) {
        const modifiers = this.emotionToMusicMap[emotion];
        
        // Apply tempo modifier
        if (modifiers.tempoModifier) {
          params.tempo += modifiers.tempoModifier;
        }
        
        // Apply scale modifier if present
        if (modifiers.scaleModifier) {
          params.scaleType = modifiers.scaleModifier;
        }
        
        // Add instruments
        if (modifiers.instrumentAdd) {
          params.instrumentation = [
            ...new Set([...params.instrumentation, ...modifiers.instrumentAdd])
          ];
        }
        
        // Apply reverb modifier
        if (modifiers.reverbModifier) {
          params.reverb = Math.min(Math.max(params.reverb + modifiers.reverbModifier, 0), 1);
        }
        
        // Apply dynamics modifier
        if (modifiers.dynamics) {
          params.dynamics = modifiers.dynamics;
        }
        
        // Apply density modifier
        if (modifiers.density) {
          params.density = modifiers.density;
        }
        
        // Apply rhythm complexity
        if (modifiers.rhythmComplexity) {
          params.rhythmComplexity = modifiers.rhythmComplexity;
        }

        // Apply harmony modifier
        if (modifiers.harmonyModifier) {
          params.harmony = modifiers.harmonyModifier;
        }

        // Apply complexity modifier
        if (modifiers.complexity) {
          params.complexity = modifiers.complexity;
        }
      }
    });
    
    // Ensure tempo stays within reasonable bounds
    params.tempo = Math.min(Math.max(params.tempo, 40), 200);
    
    return params;
  }

  /**
   * Apply modifiers based on text analysis of reflection
   * @param baseParameters Base music parameters
   * @param reflectionText Reflection text to analyze
   * @returns Adjusted music parameters
   */
  private applyTextAnalysisModifiers(baseParameters: any, reflectionText: string): any {
    const params = { ...baseParameters };
    
    // Simple keyword-based sentiment analysis
    const words = reflectionText.toLowerCase().split(/\s+/);
    let tempoModifier = 0;
    let scalePreference = '';
    let intensityModifier = 0;
    
    // Count keyword occurrences and their influence
    words.forEach((word, index) => {
      // Clean the word of punctuation
      const cleanWord = word.replace(/[.,!?;:'"()]/g, '');
      
      if (this.sentimentKeywords[cleanWord]) {
        const keywordEffect = this.sentimentKeywords[cleanWord];
        
        // Apply tempo modifier
        if (keywordEffect.tempoModifier) {
          tempoModifier += keywordEffect.tempoModifier;
        }
        
        // Track scale preference
        if (keywordEffect.scalePreference && !scalePreference) {
          scalePreference = keywordEffect.scalePreference;
        }
        
        // Apply intensity modifier
        if (keywordEffect.intensityModifier) {
          // Check if this modifier applies to the previous or next word
          const prevWord = words[index - 1]?.replace(/[.,!?;:'"()]/g, '');
          const nextWord = words[index + 1]?.replace(/[.,!?;:'"()]/g, '');
          
          if (this.sentimentKeywords[prevWord] || this.sentimentKeywords[nextWord]) {
            intensityModifier += keywordEffect.intensityModifier;
          }
        }
      }
    });
    
    // Apply the accumulated modifiers
    params.tempo += tempoModifier;
    
    // Apply scale preference if strong enough
    if (scalePreference && Math.random() < 0.7) {
      params.scaleType = scalePreference;
    }
    
    // Apply intensity modifier to dynamics and density
    if (intensityModifier !== 0) {
      params.dynamics = Math.min(Math.max(params.dynamics + intensityModifier, 0.1), 1.0);
      params.density = Math.min(Math.max(params.density + intensityModifier, 0.1), 1.0);
    }
    
    // Ensure tempo stays within reasonable bounds
    params.tempo = Math.min(Math.max(params.tempo, 40), 200);
    
    return params;
  }

  /**
   * Create a music generation request object
   * @param userId User ID
   * @param moodEntry Mood entry to generate music for
   * @returns Music generation request object
   */
  createMusicGenerationRequest(userId: string, moodEntry: MoodEntry): any {
    const musicParameters = this.generateMusicParameters(moodEntry);
    
    return {
      userId,
      entryId: moodEntry.entryId,
      timestamp: Date.now(),
      parameters: musicParameters,
      reflection: moodEntry.reflection,
      moodRating: moodEntry.moodRating,
      emotionTags: moodEntry.emotionTags,
      moodEntry: moodEntry // Include the full mood entry object
    };
  }

  /**
   * Create a GeneratedMusic object (placeholder until actual generation is implemented)
   * @param userId User ID
   * @param moodEntry Mood entry to generate music for
   * @returns Generated music object
   */
  createGeneratedMusicObject(userId: string, moodEntry: MoodEntry, parameters: any): GeneratedMusic {
    // Extract key parameters for the music object
    const { tempo, keySignature, instrumentation } = parameters;
    
    // Determine mood description based on mood rating
    let moodDescription = 'neutral';
    if (moodEntry.moodRating <= 3) moodDescription = 'melancholic';
    else if (moodEntry.moodRating <= 5) moodDescription = 'contemplative';
    else if (moodEntry.moodRating <= 7) moodDescription = 'uplifting';
    else moodDescription = 'joyful';
    
    // Create the music object
    const generatedMusic: GeneratedMusic = {
      musicId: generateUUID(),
      userId,
      entryId: moodEntry.entryId,
      generatedAt: Date.now(),
      audioUrl: '', // Will be populated by actual generation service
      duration: 0,  // Will be populated by actual generation service
      musicParameters: {
        tempo,
        key: keySignature,
        instruments: instrumentation,
        mood: moodDescription
      }
    };
    
    return generatedMusic;
  }

  /**
   * Initialize the music service
   * Creates the local music directory if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      if (isWeb) {
        // On web, we don't need to create directories
        console.log('MusicGenerationService initialized for web');
      } else {
        // On native platforms, ensure music directory exists
        const dirInfo = await FileSystem.getInfoAsync(this.MUSIC_DIRECTORY);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(this.MUSIC_DIRECTORY, { intermediates: true });
        }
        
        // Initialize audio
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (error) {
      console.error('Failed to initialize MusicGenerationService:', error);
    }
  }

  /**
   * Generate music for a mood entry
   * @param userId User ID
   * @param moodEntry Mood entry to generate music for
   * @returns Promise resolving to the generated music object or null if generation failed
   */
  async generateMusic(userId: string, moodEntry: MoodEntry): Promise<GeneratedMusic | null> {
    try {
      // Check if music generation is already in progress
      if (this.generationInProgress) {
        // Add to queue and return null
        this.generationQueue.push({ userId, moodEntry });
        return null;
      }
      
      this.generationInProgress = true;
      
      // Generate music parameters
      const parameters = this.generateMusicParameters(moodEntry);
      
      // Create music generation request
      const request = this.createMusicGenerationRequest(userId, moodEntry);
      
      // Create music object
      const musicObject = this.createGeneratedMusicObject(userId, moodEntry, parameters);
      
      // Generate the actual music
      const generatedMusic = await this.generateMusicFromAPI(request, musicObject, 0);
      
      // Store the generated music (mood entry update is handled by MoodEntryService)
      if (isWeb) {
        await WebStorageService.storeGeneratedMusic(userId, generatedMusic);
      } else {
        await LocalStorageManager.storeGeneratedMusic(userId, generatedMusic);
      }
      
      this.generationInProgress = false;
      
      // Process next item in queue if any
      this.processNextInQueue();
      
      return generatedMusic;
    } catch (error) {
      console.error('Failed to generate music:', error);
      this.generationInProgress = false;
      
      // Process next item in queue if any
      this.processNextInQueue();
      
      return null;
    }
  }

  /**
   * Process the next item in the generation queue
   */
  private async processNextInQueue(): Promise<void> {
    if (this.generationQueue.length > 0) {
      const nextItem = this.generationQueue.shift();
      if (nextItem) {
        await this.generateMusic(nextItem.userId, nextItem.moodEntry);
      }
    }
  }

  /**
   * Convert mood entry to a text prompt for sound effects generation
   * @param moodEntry The mood entry to convert
   * @returns Text prompt for sound generation
   */
  private createMusicPrompt(moodEntry: MoodEntry): string {
    const { reflection } = moodEntry;
    
    // Use only the reflection text as the prompt
    if (reflection && reflection.trim()) {
      return reflection.trim();
    } else {
      // Fallback if no reflection text
      return "peaceful ambient soundscape";
    }
  }

  /**
   * Generate music using available AI services or fallback to procedural generation
   * @param request Music generation request
   * @param musicObject Music object to update
   * @param retryCount Current retry count
   * @returns Updated music object
   */
  private async generateMusicFromAPI(
    request: any,
    musicObject: GeneratedMusic,
    retryCount: number
  ): Promise<GeneratedMusic> {
    try {
      if (isDebugMode()) {
        console.log('Starting AI-powered music generation...');
        console.log('Mood entry:', request.moodEntry);
      }
      
      // Create text prompt from mood entry
      if (!request.moodEntry) {
        console.error('Mood entry is undefined in request:', request);
        throw new Error('Mood entry is required for music generation');
      }
      
      const prompt = this.createMusicPrompt(request.moodEntry);
      if (isDebugMode()) {
        console.log('Generated prompt:', prompt);
      }
      
      // Try ElevenLabs AI generation first
      if (this.AI_SERVICES.ELEVENLABS.enabled) {
        try {
          return await this.tryElevenLabsGeneration(prompt, musicObject);
        } catch (error) {
          if (isDebugMode()) {
            console.log('ElevenLabs generation failed, trying alternatives...');
          }
        }
      }
      

      
      // Try other AI services if available
      if (this.AI_SERVICES.MUBERT.enabled) {
        try {
          return await this.tryMubertGeneration(prompt, musicObject);
        } catch (error) {
          if (isDebugMode()) {
            console.log('Mubert generation failed, trying alternatives...');
          }
        }
      }
      
      // Use enhanced procedural generation (AI models not available on free tier)
      if (isDebugMode()) {
        console.log('🎵 Using enhanced procedural music generation...');
        console.log('🎵 This creates sophisticated, mood-appropriate music using advanced algorithms');
      }
      
      return await this.generateProceduralMusic(musicObject, request.moodEntry);
      
    } catch (error) {
      console.error('Music generation error:', error);
      
      // If this is not the last retry attempt, try again
      if (retryCount < this.MAX_RETRIES - 1) {
        console.log(`Retrying music generation (attempt ${retryCount + 1}/${this.MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return this.generateMusicFromAPI(request, musicObject, retryCount + 1);
      }
      
      // If all retries failed, use fallback
      console.log('All retry attempts failed, using fallback');
      return await this.generateProceduralMusic(musicObject, request.moodEntry);
    }
  }

  /**
   * Try to generate music using Hugging Face MusicGen API
   */
  private async tryElevenLabsGeneration(prompt: string, musicObject: GeneratedMusic): Promise<GeneratedMusic> {
    const apiKey = this.AI_SERVICES.ELEVENLABS.apiKey;
    
    if (apiKey === 'YOUR_ELEVENLABS_API_KEY_HERE') {
      throw new Error('ElevenLabs API key not configured');
    }
    
    if (isDebugMode()) {
      console.log('🎵 Trying ElevenLabs Sound Effects API...');
      console.log('🎵 Prompt:', prompt);
    }
    
    try {
      // Convert mood prompt to a sound effects description
      const soundDescription = this.convertMoodToSoundDescription(prompt);
      
      const response = await fetch(this.AI_SERVICES.ELEVENLABS.endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg, audio/mp4, audio/wav, */*',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: soundDescription,
          model_id: 'eleven_sound_effects_v1',
          output_format: 'mp3',
        }),
      });
      
      if (isDebugMode()) {
        console.log('🎵 ElevenLabs response status:', response.status);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🎵 ElevenLabs API Error:', response.status, errorText);
        console.error('🎵 Request body:', JSON.stringify({
          text: soundDescription,
          model_id: 'eleven_sound_effects_v1',
          output_format: 'mp3',
        }));
        throw new Error(`ElevenLabs API failed: ${response.status} ${errorText}`);
      }
      
      // Get the audio data as array buffer (can only read response body once)
      const arrayBuffer = await response.arrayBuffer();
      console.log('🎵 Got array buffer, size:', arrayBuffer.byteLength);
      
      // In React Native, we can't create Blob from ArrayBuffer, so we'll work directly with the array buffer
      // Create a mock blob object with the _data property that React Native expects
      const audioBlob = {
        _data: arrayBuffer,
        size: arrayBuffer.byteLength,
        type: 'audio/mpeg'
      } as any;
      
      if (isDebugMode()) {
        console.log('🎵 ElevenLabs audio received, size:', audioBlob.size, 'bytes');
        console.log('🎵 Audio blob type:', audioBlob.type);
        console.log('🎵 Audio blob methods:', Object.getOwnPropertyNames(audioBlob));
      }
      
      const audioUrl = await this.saveAudioFile(audioBlob, musicObject.musicId);
      musicObject.audioUrl = audioUrl;
      musicObject.duration = 8;
      
      // Update music parameters to reflect AI generation instead of procedural
      musicObject.musicParameters = {
        tempo: 120, // Default tempo for AI-generated ambient sounds
        key: 'Ambient',
        instruments: ['AI Generated Sound Effects'],
        mood: 'AI Generated'
      };
      
      console.log('🎵 Successfully generated AI audio with ElevenLabs!');
      return musicObject;
      
    } catch (error) {
      console.error('🎵 ElevenLabs API call failed:', error);
      throw error;
    }
  }
  

  
  private convertMoodToSoundDescription(prompt: string): string {
    // The prompt is now just the reflection text - return it directly
    const reflectionText = prompt.trim();
    
    if (reflectionText) {
      return reflectionText;
    } else {
      // Fallback if no reflection text
      return "peaceful ambient soundscape";
    }
  }
  


  /**
   * Try to generate music using Mubert API (placeholder for future implementation)
   */
  private async tryMubertGeneration(prompt: string, musicObject: GeneratedMusic): Promise<GeneratedMusic> {
    // This is a placeholder for Mubert API integration
    // Would require API key and different request format
    throw new Error('Mubert API not yet implemented');
  }

  /**
   * Generate sophisticated procedural music using Web Audio API
   */
  private async generateProceduralMusic(musicObject: GeneratedMusic, moodEntry: MoodEntry): Promise<GeneratedMusic> {
    if (isDebugMode()) {
      console.log('Generating enhanced procedural music...');
      console.log('Platform:', isWeb ? 'Web' : 'Mobile');
    }
    
    try {
      // Generate music parameters based on mood
      const parameters = this.generateMusicParameters(moodEntry);
      console.log('Generated music parameters:', parameters);
      
      // Add explicit platform detection debugging
      console.log('isWeb value:', isWeb);
      console.log('isReactNative value:', isReactNative);
      console.log('isExpoGo value:', isExpoGo);
      console.log('Platform detection:', typeof window !== 'undefined' ? 'Web detected' : 'Mobile detected');
      
      // More reliable platform detection
      const isActuallyWeb = isWeb && !isReactNative && !isExpoGo;
      console.log('isActuallyWeb value:', isActuallyWeb);
      
      if (isActuallyWeb) {
        // Use Web Audio API for sophisticated procedural generation
        console.log('Using Web Audio API for generation...');
        const audioUrl = await this.generateWebAudio(musicObject, 8);
        musicObject.audioUrl = audioUrl;
        musicObject.duration = 8;
        
        if (isDebugMode()) {
          console.log('Enhanced procedural audio generated for web');
        }
      } else {
        // For mobile, create a mood-appropriate audio file
        console.log('Using mobile audio generation...');
        const audioUrl = await this.createSimpleAudioFile(musicObject, parameters);
        musicObject.audioUrl = audioUrl;
        musicObject.duration = 8;
        
        if (isDebugMode()) {
          console.log('Mood-appropriate audio file created for mobile:', audioUrl);
        }
      }
      
      return musicObject;
    } catch (error) {
      console.error('Error in generateProceduralMusic:', error);
      throw error;
    }
  }

  /**
   * Custom base64 encoding function that works on React Native
   */
  private encodeBase64(uint8Array: Uint8Array): string {
    console.log('encodeBase64 called with array length:', uint8Array.length);
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let base64String = '';
    
    for (let i = 0; i < uint8Array.length; i += 3) {
      const byte1 = uint8Array[i] || 0;
      const byte2 = uint8Array[i + 1] || 0;
      const byte3 = uint8Array[i + 2] || 0;
      
      const chunk = (byte1 << 16) | (byte2 << 8) | byte3;
      
      base64String += base64Chars[(chunk >> 18) & 63] +
                     base64Chars[(chunk >> 12) & 63] +
                     base64Chars[(chunk >> 6) & 63] +
                     base64Chars[chunk & 63];
    }
    
    // Handle padding
    const padding = 3 - (uint8Array.length % 3);
    if (padding < 3) {
      base64String = base64String.slice(0, -padding) + '='.repeat(padding);
    }
    
    console.log('encodeBase64 completed, result length:', base64String.length);
    return base64String;
  }

  /**
   * Save audio blob to file system or create blob URL for web
   */
  private async saveAudioFile(audioBlob: Blob, musicId: string): Promise<string> {
    // More reliable platform detection
    const isActuallyWeb = isWeb && !isReactNative && !isExpoGo;
    
    try {
      if (isActuallyWeb) {
        // On web, store the blob data in localStorage and create a persistent URL
        let audioArrayBuffer: ArrayBuffer;
        
        // Handle different blob types and methods
        if (audioBlob.arrayBuffer) {
          audioArrayBuffer = await audioBlob.arrayBuffer();
        } else if (audioBlob instanceof ArrayBuffer) {
          audioArrayBuffer = audioBlob as ArrayBuffer;
        } else if ((audioBlob as any)._data) {
          // React Native specific: response has _data property
          audioArrayBuffer = (audioBlob as any)._data;
        } else {
          // Fallback: try to read as text and convert
          const text = await audioBlob.text();
          const encoder = new TextEncoder();
          audioArrayBuffer = encoder.encode(text).buffer as ArrayBuffer;
        }
        
        const audioBase64 = this.encodeBase64(new Uint8Array(audioArrayBuffer));
        
        // Store the base64 data in localStorage
        const storageKey = `audio_data_${musicId}`;
        localStorage.setItem(storageKey, audioBase64);
        
        // Create a blob URL for immediate use
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (isDebugMode()) {
          console.log('Audio data stored with key:', storageKey);
          console.log('Audio blob URL created for web:', audioUrl);
        }
        
        return audioUrl;
      } else {
        // On native platforms, save to file system
        const dirInfo = await FileSystem.getInfoAsync(this.MUSIC_DIRECTORY);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(this.MUSIC_DIRECTORY, { intermediates: true });
        }
        
        // Use .mp3 extension for MP3 files from ElevenLabs
        const localFilePath = `${this.MUSIC_DIRECTORY}${musicId}.mp3`;
        
        let audioArrayBuffer: ArrayBuffer;
        
        // Handle different blob types and methods
        if ((audioBlob as any)._data) {
          // Our mock blob object from ElevenLabs or React Native response
          audioArrayBuffer = (audioBlob as any)._data;
          console.log('🎵 Using _data property, size:', audioArrayBuffer.byteLength);
        } else if (audioBlob.arrayBuffer) {
          audioArrayBuffer = await audioBlob.arrayBuffer();
        } else if (audioBlob instanceof ArrayBuffer) {
          audioArrayBuffer = audioBlob as ArrayBuffer;
        } else {
          // Fallback: try to read as text and convert
          const text = await audioBlob.text();
          const encoder = new TextEncoder();
          audioArrayBuffer = encoder.encode(text).buffer as ArrayBuffer;
        }
        
        // For ElevenLabs MP3 data, try different approaches
        const audioData = new Uint8Array(audioArrayBuffer);
        console.log('🎵 Audio data length:', audioData.length);
        console.log('🎵 Audio data first 10 bytes:', Array.from(audioData.slice(0, 10)));
        
        // Try writing as base64 first
        try {
          const audioBase64 = this.encodeBase64(audioData);
          console.log('🎵 Base64 result length:', audioBase64.length);
          await FileSystem.writeAsStringAsync(localFilePath, audioBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log('🎵 MP3 file saved successfully using base64 encoding');
        } catch (error) {
          console.error('🎵 Base64 encoding failed, trying alternative method:', error);
          // Fallback: try writing as raw binary string
          const binaryString = String.fromCharCode.apply(null, Array.from(audioData));
          await FileSystem.writeAsStringAsync(localFilePath, binaryString);
          console.log('🎵 MP3 file saved using binary string method');
        }
        
        if (isDebugMode()) {
          console.log('Audio file saved to:', localFilePath);
        }
        
        return localFilePath;
      }
    } catch (error) {
      console.error('Error saving audio file:', error);
      console.error('AudioBlob type:', typeof audioBlob);
      console.error('AudioBlob methods:', Object.getOwnPropertyNames(audioBlob));
      throw error;
    }
  }

    /**
   * Create a mood-appropriate audio file for mobile platforms
   */
  private async createSimpleAudioFile(musicObject: GeneratedMusic, parameters: any): Promise<string> {
    try {
      console.log('Starting mobile audio file creation...');
      console.log('Music object:', musicObject);
      console.log('Parameters:', parameters);
      console.log('Step 1: Creating WAV file buffer...');
      
      // Create a simple WAV file with mood-appropriate music
      const sampleRate = 44100;
      const duration = 8; // 8 seconds
      const numSamples = sampleRate * duration;
      
      console.log('Step 2: Extracting mood parameters...');
      // Extract mood parameters with safe defaults
      const { tempo = 120, keySignature = 'A major', dynamics = 0.7 } = parameters || {};
      const mood = musicObject.musicParameters?.mood || 'neutral';
      const baseFreq = this.getBaseFrequency(keySignature);
      
      console.log('Step 3: Generating melody notes...');
      // Generate melody notes based on mood
      const notes = this.generateMelody(mood, tempo, duration);
      
      console.log('Step 4: Creating WAV file buffer...');
      // Create WAV file buffer
      const buffer = new ArrayBuffer(44 + numSamples * 2); // 44 bytes header + 16-bit samples
      const view = new DataView(buffer);
      
      // Write WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, numSamples * 2, true);
      
      // Generate audio data with melody
      for (let i = 0; i < numSamples; i++) {
        const time = i / sampleRate;
        let sample = 0;
        
        // Add melody notes
        notes.forEach(note => {
          if (time >= note.start && time < note.end) {
            const freq = baseFreq * Math.pow(2, note.pitch / 12);
            const amplitude = note.velocity * dynamics * 0.4;
            sample += amplitude * Math.sin(2 * Math.PI * freq * time);
          }
        });
        
        // Add harmonics for richer sound
        sample += 0.15 * Math.sin(2 * Math.PI * baseFreq * 2 * time);
        sample += 0.1 * Math.sin(2 * Math.PI * baseFreq * 3 * time);
        
        // Add bass line
        sample += 0.2 * Math.sin(2 * Math.PI * baseFreq * 0.5 * time);
        
        // Apply envelope
        const envelope = this.getEnvelope(time, duration);
        sample *= envelope;
        
        // Clamp to prevent distortion
        sample = Math.max(-0.8, Math.min(0.8, sample));
        
        // Convert to 16-bit integer
        const sample16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
        view.setInt16(44 + i * 2, sample16, true);
      }
      
      console.log('Step 5: Saving to file system...');
      // Save to file system
      const dirInfo = await FileSystem.getInfoAsync(this.MUSIC_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.MUSIC_DIRECTORY, { intermediates: true });
      }
      
      const localFilePath = `${this.MUSIC_DIRECTORY}${musicObject.musicId}.wav`;
      
      console.log('Step 6: Converting buffer to base64...');
      // Convert buffer to base64 string using custom function
      const uint8Array = new Uint8Array(buffer);
      // Write the WAV file as base64-encoded binary
      const base64String = this.encodeBase64(uint8Array);
      await FileSystem.writeAsStringAsync(localFilePath, base64String, {
        encoding: FileSystem.EncodingType.Base64,
      });
      // Do NOT store audio data in LocalStorageManager for mobile
      if (isDebugMode()) {
        console.log('Mood-appropriate audio file created for mobile:', localFilePath);
        console.log('Music parameters:', { tempo, keySignature, mood, dynamics, baseFreq });
        console.log('File size:', uint8Array.length, 'bytes');
      }
      return localFilePath;
    } catch (error) {
      console.error('Error creating mobile audio file:', error);
      throw error;
    }
  }

  /**
   * Generate fallback music when API generation fails
   * @param musicObject Original music object
   * @returns Updated music object with fallback audio
   */
  private async generateFallbackMusic(musicObject: GeneratedMusic): Promise<GeneratedMusic> {
    try {
      console.log('Generating fallback music due to API failure...');
      
      let localFilePath: string;
      const duration = 8; // 8 seconds of generated music
      
      // More reliable platform detection
      const isActuallyWeb = isWeb && !isReactNative && !isExpoGo;
      
      if (isActuallyWeb) {
        // On web, generate a more sophisticated audio using Web Audio API
        localFilePath = await this.generateWebAudio(musicObject, duration);
        console.log('Fallback audio blob URL created for web:', localFilePath);
      } else {
        // On native platforms, create mood-appropriate fallback music
        // We need to create a mock mood entry since GeneratedMusic doesn't have moodEntry
        const mockMoodEntry: MoodEntry = {
          entryId: musicObject.entryId,
          userId: musicObject.userId,
          timestamp: musicObject.generatedAt,
          moodRating: 5, // Default mood rating
          emotionTags: ['neutral'],
          reflection: 'Generated music',
          musicGenerated: false,
        };
        
        const parameters = this.generateMusicParameters(mockMoodEntry);
        localFilePath = await this.createSimpleAudioFile(musicObject, parameters);
        console.log('Fallback mood-appropriate audio created for mobile:', localFilePath);
      }
      
      // Update the music object with fallback information
      const updatedMusicObject: GeneratedMusic = {
        ...musicObject,
        audioUrl: localFilePath,
        duration: duration,
      };
      
      return updatedMusicObject;
    } catch (error) {
      console.error('Fallback music generation failed:', error);
      
      // If even the fallback fails, return the original object with an empty audio URL
      return {
        ...musicObject,
        audioUrl: '',
        duration: 0,
      };
    }
  }

  /**
   * Generate audio using Web Audio API for web fallback
   * @param musicObject Music object with parameters
   * @param duration Duration in seconds
   * @returns Blob URL of generated audio
   */
  private async generateWebAudio(musicObject: GeneratedMusic, duration: number): Promise<string> {
    return new Promise((resolve) => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume audio context if it's suspended (required for web browsers)
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log('Audio context resumed');
          }).catch(error => {
            console.error('Failed to resume audio context:', error);
          });
        }
        
        const sampleRate = audioContext.sampleRate;
        const numSamples = sampleRate * duration;
        
        // Create audio buffer
        const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Generate music based on mood parameters with safe defaults
        const { tempo = 120, key = 'A major', instruments = [], mood = 'neutral' } = musicObject.musicParameters || {};
        
        // Create a simple melody based on mood
        const baseFreq = this.getBaseFrequency(key);
        const notes = this.generateMelody(mood, tempo, duration);
        
        // Generate audio samples
        for (let i = 0; i < numSamples; i++) {
          const time = i / sampleRate;
          let sample = 0;
          
          // Add melody notes
          notes.forEach(note => {
            if (time >= note.start && time < note.end) {
              const freq = baseFreq * Math.pow(2, note.pitch / 12);
              const amplitude = note.velocity * 0.5; // Increased amplitude
              sample += amplitude * Math.sin(2 * Math.PI * freq * time);
            }
          });
          
          // Add some harmonics for richer sound
          sample += 0.2 * Math.sin(2 * Math.PI * baseFreq * 2 * time);
          sample += 0.1 * Math.sin(2 * Math.PI * baseFreq * 3 * time);
          
          // Add a bass line for more presence
          sample += 0.15 * Math.sin(2 * Math.PI * baseFreq * 0.5 * time);
          
          // Apply envelope
          const envelope = this.getEnvelope(time, duration);
          sample *= envelope;
          
          // Clamp to prevent distortion but allow more volume
          channelData[i] = Math.max(-0.9, Math.min(0.9, sample));
        }
        
        // Convert to WAV
        const wavBuffer = this.audioBufferToWav(audioBuffer);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        // Store the audio data in localStorage for later retrieval
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = reader.result as string;
          const audioData = base64Data.split(',')[1]; // Remove data URL prefix
          const storageKey = `audio_data_${musicObject.musicId}`;
          localStorage.setItem(storageKey, audioData);
          console.log('Stored audio data for music ID:', musicObject.musicId);
        };
        reader.readAsDataURL(blob);
        
        resolve(url);
      } catch (error) {
        console.error('Web Audio generation failed:', error);
        // Fallback to simple tone generation
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const sampleRate = audioContext.sampleRate;
          const numSamples = sampleRate * duration;
          
          // Create audio buffer for fallback
          const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
          const channelData = audioBuffer.getChannelData(0);
          
          // Generate a simple sine wave
          const frequency = 440; // A4 note
          const amplitude = 0.3;
          
          for (let i = 0; i < numSamples; i++) {
            const time = i / sampleRate;
            const sample = amplitude * Math.sin(2 * Math.PI * frequency * time);
            
            // Apply envelope
            const envelope = this.getEnvelope(time, duration);
            channelData[i] = sample * envelope;
          }
          
          // Convert to WAV
          const wavBuffer = this.audioBufferToWav(audioBuffer);
          const blob = new Blob([wavBuffer], { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          
          // Store the fallback audio data
          const reader = new FileReader();
          reader.onload = () => {
            const base64Data = reader.result as string;
            const audioData = base64Data.split(',')[1]; // Remove data URL prefix
            const storageKey = `audio_data_${musicObject.musicId}`;
            localStorage.setItem(storageKey, audioData);
            console.log('Stored fallback audio data for music ID:', musicObject.musicId);
          };
          reader.readAsDataURL(blob);
          
          resolve(url);
        } catch (fallbackError) {
          console.error('Fallback audio generation also failed:', fallbackError);
          // Create a minimal silent audio file as last resort
          const silentBuffer = new ArrayBuffer(44 + 44100 * duration * 2);
          const view = new DataView(silentBuffer);
          
          // Write minimal WAV header
          const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
              view.setUint8(offset + i, string.charCodeAt(i));
            }
          };
          
          writeString(0, 'RIFF');
          view.setUint32(4, 36 + 44100 * duration * 2, true);
          writeString(8, 'WAVE');
          writeString(12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, 1, true);
          view.setUint32(24, 44100, true);
          view.setUint32(28, 44100 * 2, true);
          view.setUint16(32, 2, true);
          view.setUint16(34, 16, true);
          writeString(36, 'data');
          view.setUint32(40, 44100 * duration * 2, true);
          
          const blob = new Blob([silentBuffer], { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          
          // Store the silent audio data
          const reader = new FileReader();
          reader.onload = () => {
            const base64Data = reader.result as string;
            const audioData = base64Data.split(',')[1];
            const storageKey = `audio_data_${musicObject.musicId}`;
            localStorage.setItem(storageKey, audioData);
            console.log('Stored silent audio data for music ID:', musicObject.musicId);
          };
          reader.readAsDataURL(blob);
          
          resolve(url);
        }
      }
    });
  }

  /**
   * Get base frequency for a musical key
   */
  private getBaseFrequency(key: string | undefined): number {
    const keyMap: { [key: string]: number } = {
      'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
      'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
      'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
    };
    
    // Ensure key is a string and has a default value
    const safeKey = (key || 'A major').toString();
    const keyName = safeKey.split(' ')[0];
    return keyMap[keyName] || 440;
  }

  /**
   * Generate melody notes based on mood
   */
  private generateMelody(mood: string | undefined, tempo: number, duration: number): Array<{
    start: number;
    end: number;
    pitch: number;
    velocity: number;
  }> {
    const notes = [];
    const beatDuration = 60 / tempo;
    const numBeats = Math.floor(duration / beatDuration);
    
    // Ensure mood is a string and has a default value
    const safeMood = (mood || 'neutral').toString().toLowerCase();
    
    for (let i = 0; i < numBeats; i++) {
      const start = i * beatDuration;
      const end = start + beatDuration * 0.8;
      
      // Generate pitch based on mood
      let pitch = 0;
      if (safeMood.includes('joyful') || safeMood.includes('uplifting') || safeMood.includes('happy')) {
        pitch = [0, 4, 7, 12][i % 4]; // Major scale
      } else if (safeMood.includes('melancholic') || safeMood.includes('sad') || safeMood.includes('sadness')) {
        pitch = [0, 3, 7, 10][i % 4]; // Minor scale
      } else {
        pitch = [0, 5, 7, 12][i % 4]; // Pentatonic scale (neutral)
      }
      
      notes.push({
        start,
        end,
        pitch,
        velocity: 0.5 + Math.random() * 0.3
      });
    }
    
    return notes;
  }

  /**
   * Get envelope for audio shaping
   */
  private getEnvelope(time: number, duration: number): number {
    const attack = 0.1;
    const release = 0.3;
    
    if (time < attack) {
      return time / attack;
    } else if (time > duration - release) {
      return (duration - time) / release;
    }
    return 1;
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const channels = buffer.numberOfChannels;
    const arrayBuffer = new ArrayBuffer(44 + length * channels * 2);
    const view = new DataView(arrayBuffer);
    
    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * channels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * channels * 2, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }

  /**
   * Play generated music
   * @param musicId ID of the music to play
   * @param userId User ID
   * @returns Whether playback started successfully
   */
  async playMusic(musicId: string, userId: string): Promise<boolean> {
    try {
      console.log('playMusic called with musicId:', musicId, 'userId:', userId);
      
      // Stop any currently playing music
      await this.stopMusic();
      
      // Retrieve the music object using appropriate storage service
      let musicObject;
      if (isWeb) {
        musicObject = await WebStorageService.retrieveGeneratedMusic(userId, musicId);
      } else {
        musicObject = await LocalStorageManager.retrieveGeneratedMusic(userId, musicId);
      }
      
      console.log('Retrieved music object:', musicObject);
      
      if (!musicObject || !musicObject.audioUrl) {
        console.error('Music not found or has no audio URL');
        return false;
      }
      
      console.log('Audio URL:', musicObject.audioUrl);
      
      // For mobile, verify the file exists
      if (!isWeb) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(musicObject.audioUrl);
          console.log('File info:', fileInfo);
          if (!fileInfo.exists) {
            console.error('Audio file does not exist at path:', musicObject.audioUrl);
            console.log('Attempting to regenerate audio file...');
            const regenerated = await this.regenerateAudioFile(musicId, userId);
            if (regenerated) {
              // Retrieve the updated music object
              if (isWeb) {
                musicObject = await WebStorageService.retrieveGeneratedMusic(userId, musicId);
              } else {
                musicObject = await LocalStorageManager.retrieveGeneratedMusic(userId, musicId);
              }
              console.log('Retrieved updated music object after regeneration:', musicObject);
              
              // Check if musicObject is still null after regeneration
              if (!musicObject || !musicObject.audioUrl) {
                console.error('Music object still null after regeneration');
                return false;
              }
            } else {
              return false;
            }
          }
        } catch (fileError) {
          console.error('Error checking file existence:', fileError);
          return false;
        }
      }
      
      // Create and load the sound object
      this.soundObject = new Audio.Sound();
      console.log('Created Audio.Sound object');
      
      // For web, handle blob URLs specially
      if (isWeb && musicObject.audioUrl.startsWith('blob:')) {
        console.log('Handling blob URL for web');
        
        // Try to get the audio data from localStorage and regenerate blob URL
        const storageKey = `audio_data_${musicId}`;
        const storedAudioData = localStorage.getItem(storageKey);
        
        console.log('Stored audio data found:', !!storedAudioData);
        
        if (storedAudioData) {
          // Convert base64 back to blob and create new URL
          const audioBytes = atob(storedAudioData);
          const audioArray = new Uint8Array(audioBytes.length);
          for (let i = 0; i < audioBytes.length; i++) {
            audioArray[i] = audioBytes.charCodeAt(i);
          }
          const audioBlob = new Blob([audioArray], { type: 'audio/wav' });
          const newBlobUrl = URL.createObjectURL(audioBlob);
          
          console.log('Regenerated blob URL:', newBlobUrl);
          await this.soundObject.loadAsync({ uri: newBlobUrl });
        } else {
          console.log('No stored audio data found, trying original URL');
          await this.soundObject.loadAsync({ uri: musicObject.audioUrl });
        }
      } else {
        console.log('Loading audio with URL:', musicObject.audioUrl);
        await this.soundObject.loadAsync({ uri: musicObject.audioUrl });
      }
      
      console.log('Audio loaded successfully');
      
      // Set up playback status update callback
      this.soundObject.setOnPlaybackStatusUpdate(async status => {
        console.log('Playback status update:', status);
        if (status.isLoaded && status.didJustFinish) {
          if (this.isRepeatEnabled && this.currentMusicId && this.soundObject) {
            // If repeat is enabled, restart the track
            await this.soundObject.setPositionAsync(0);
            await this.soundObject.playAsync();
          } else {
            // Otherwise, stop playback
            this.isPlaying = false;
            this.currentMusicId = null;
          }
        }
      });
      
      // Start playback
      console.log('Starting playback...');
      try {
        // For web, ensure audio context is resumed
        if (isWeb && typeof window !== 'undefined' && window.AudioContext) {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            console.log('Resuming audio context for playback...');
            await audioContext.resume();
          }
        }
        
        // For mobile, ensure audio mode is set correctly
        if (!isWeb) {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
        }
        
        await this.soundObject.playAsync();
        this.isPlaying = true;
        this.currentMusicId = musicId;
        console.log('Playback started successfully');
        
        // Get initial status to verify playback
        const status = await this.soundObject.getStatusAsync();
        console.log('Initial playback status:', status);
      } catch (playError) {
        console.error('Failed to start playback:', playError);
        this.isPlaying = false;
        this.currentMusicId = null;
        throw playError;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to play music:', error);
      this.isPlaying = false;
      this.currentMusicId = null;
      return false;
    }
  }

  /**
   * Pause currently playing music
   * @returns Whether pause was successful
   */
  async pauseMusic(): Promise<boolean> {
    try {
      if (this.soundObject && this.isPlaying) {
        await this.soundObject.pauseAsync();
        this.isPlaying = false;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to pause music:', error);
      return false;
    }
  }

  /**
   * Resume paused music
   * @returns Whether resume was successful
   */
  async resumeMusic(): Promise<boolean> {
    try {
      if (this.soundObject && !this.isPlaying) {
        await this.soundObject.playAsync();
        this.isPlaying = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to resume music:', error);
      return false;
    }
  }

  /**
   * Stop currently playing music
   * @returns Whether stop was successful
   */
  async stopMusic(): Promise<boolean> {
    try {
      if (this.soundObject) {
        await this.soundObject.stopAsync();
        await this.soundObject.unloadAsync();
        this.soundObject = null;
        this.isPlaying = false;
        this.currentMusicId = null;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to stop music:', error);
      this.soundObject = null;
      this.isPlaying = false;
      this.currentMusicId = null;
      return false;
    }
  }

  /**
   * Get playback status
   * @returns Object containing playback status information
   */
  getPlaybackStatus(): { isPlaying: boolean; currentMusicId: string | null; isRepeatEnabled: boolean; volume: number } {
    return {
      isPlaying: this.isPlaying,
      currentMusicId: this.currentMusicId,
      isRepeatEnabled: this.isRepeatEnabled,
      volume: this.volume
    };
  }
  
  /**
   * Set repeat mode
   * @param enabled Whether repeat mode should be enabled
   */
  setRepeatMode(enabled: boolean): void {
    this.isRepeatEnabled = enabled;
  }
  
  /**
   * Set volume level
   * @param volume Volume level (0.0 to 1.0)
   * @returns Whether volume was set successfully
   */
  async setVolume(volume: number): Promise<boolean> {
    try {
      // Ensure volume is between 0 and 1
      this.volume = Math.min(Math.max(volume, 0), 1);
      
      // Apply volume to current sound object if it exists
      if (this.soundObject) {
        await this.soundObject.setVolumeAsync(this.volume);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to set volume:', error);
      return false;
    }
  }
  
  /**
   * Get current playback position in seconds
   * @returns Current position in seconds or null if not playing
   */
  async getPlaybackPosition(): Promise<number | null> {
    try {
      if (!this.soundObject || !this.isPlaying) {
        return null;
      }
      
      const status = await this.soundObject.getStatusAsync();
      if (status.isLoaded) {
        // Convert milliseconds to seconds
        return status.positionMillis / 1000;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get playback position:', error);
      return null;
    }
  }
  
  /**
   * Seek to a specific position in the audio
   * @param position Position in seconds to seek to
   * @returns Whether seek was successful
   */
  async seekToPosition(position: number): Promise<boolean> {
    try {
      if (!this.soundObject) {
        return false;
      }
      
      // Convert seconds to milliseconds
      const positionMillis = position * 1000;
      await this.soundObject.setPositionAsync(positionMillis);
      return true;
    } catch (error) {
      console.error('Failed to seek to position:', error);
      return false;
    }
  }

  /**
   * Check if music generation is in progress
   * @returns Whether music generation is in progress
   */
  isGenerating(): boolean {
    return this.generationInProgress;
  }

  /**
   * Get the number of items in the generation queue
   * @returns Number of items in the queue
   */
  getQueueLength(): number {
    return this.generationQueue.length;
  }

  /**
   * Retrieve generated music from storage
   * @param userId User ID
   * @param musicId Music ID to retrieve
   * @returns Promise resolving to the generated music object or null if not found
   */
  async retrieveGeneratedMusic(userId: string, musicId: string): Promise<GeneratedMusic | null> {
    try {
      if (isWeb) {
        return await WebStorageService.retrieveGeneratedMusic(userId, musicId);
      } else {
        return await LocalStorageManager.retrieveGeneratedMusic(userId, musicId);
      }
    } catch (error) {
      console.error('Failed to retrieve music:', error);
      return null;
    }
  }

  /**
   * Delete generated music
   * @param userId User ID
   * @param musicId Music ID to delete
   * @returns Whether deletion was successful
   */
  async deleteMusic(userId: string, musicId: string): Promise<boolean> {
    try {
      // Stop playback if this music is currently playing
      if (this.currentMusicId === musicId) {
        await this.stopMusic();
      }
      
      // Get the music object using appropriate storage service
      let musicObject;
      if (isWeb) {
        musicObject = await WebStorageService.retrieveGeneratedMusic(userId, musicId);
      } else {
        musicObject = await LocalStorageManager.retrieveGeneratedMusic(userId, musicId);
      }
      
      if (!musicObject) {
        return false;
      }
      
      // Delete the audio file if it exists
      if (musicObject.audioUrl) {
        const fileInfo = await FileSystem.getInfoAsync(musicObject.audioUrl);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(musicObject.audioUrl);
        }
      }
      
      // Remove from storage using appropriate storage service
      if (isWeb) {
        // For web, remove from localStorage
        localStorage.removeItem(`generated_music_${userId}_${musicId}`);
        localStorage.removeItem(`audio_data_${musicId}`);
      } else {
        // For native, use LocalStorageManager
        await LocalStorageManager.removeData(`generated_music_${userId}_${musicId}`);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete music:', error);
      return false;
    }
  }

  /**
   * Debug method to test music generation
   * @param userId User ID
   * @returns Promise resolving to the generated music object or null
   */
  async debugMusicGeneration(userId: string): Promise<GeneratedMusic | null> {
    try {
      console.log('=== DEBUG: Testing Music Generation ===');
      
      // Create a test mood entry
      const testMoodEntry: MoodEntry = {
        entryId: generateUUID(),
        userId,
        timestamp: Date.now(),
        moodRating: 7,
        emotionTags: ['happy', 'excited'],
        reflection: 'This is a test mood entry for debugging music generation',
        musicGenerated: false
      };
      
      console.log('Test mood entry created:', testMoodEntry);
      
      // Initialize the service
      await this.initialize();
      console.log('Music generation service initialized');
      
      // Generate music
      const result = await this.generateMusic(userId, testMoodEntry);
      
      if (result) {
        console.log('Music generation successful:', result);
        return result;
      } else {
        console.log('Music generation failed or was queued');
        return null;
      }
    } catch (error) {
      console.error('Debug music generation failed:', error);
      return null;
    }
  }

  /**
   * Get the latest generated music ID for a user
   * @param userId User ID
   * @returns Latest music ID or null if none found
   */
  getLatestMusicId(userId: string): string | null {
    if (isWeb) {
      const keys = Object.keys(localStorage);
      const audioKeys = keys.filter(key => key.startsWith('audio_data_'));
      if (audioKeys.length > 0) {
        // Get the most recent one
        const latestKey = audioKeys[audioKeys.length - 1];
        return latestKey.replace('audio_data_', '');
      }
    }
    return null;
  }

  /**
   * Regenerate audio file if it's missing or corrupted
   * @param musicId The music ID
   * @param userId The user ID
   * @returns Whether regeneration was successful
   */
  async regenerateAudioFile(musicId: string, userId: string): Promise<boolean> {
    try {
      console.log('Regenerating audio file for musicId:', musicId);
      
      // Retrieve the music object
      let musicObject;
      if (isWeb) {
        musicObject = await WebStorageService.retrieveGeneratedMusic(userId, musicId);
      } else {
        musicObject = await LocalStorageManager.retrieveGeneratedMusic(userId, musicId);
      }
      
      if (!musicObject) {
        console.error('Music object not found for regeneration');
        return false;
      }
      
      // Create a mock mood entry for regeneration
      const mockMoodEntry: MoodEntry = {
        entryId: musicObject.entryId,
        userId: musicObject.userId,
        timestamp: musicObject.generatedAt,
        moodRating: 5, // Default mood rating
        emotionTags: ['neutral'],
        reflection: 'Regenerated music',
        musicGenerated: false,
      };
      
      // Generate new audio file
      const parameters = this.generateMusicParameters(mockMoodEntry);
      const audioUrl = await this.createSimpleAudioFile(musicObject, parameters);
      
      // Update the music object with the new audio URL
      musicObject.audioUrl = audioUrl;
      
      // Store the updated music object
      if (isWeb) {
        await WebStorageService.storeGeneratedMusic(userId, musicObject);
      } else {
        await LocalStorageManager.storeGeneratedMusic(userId, musicObject);
      }
      
      console.log('Audio file regenerated successfully:', audioUrl);
      return true;
    } catch (error) {
      console.error('Failed to regenerate audio file:', error);
      return false;
    }
  }
}

export default new MusicGenerationService();