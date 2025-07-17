import { MoodEntry, GeneratedMusic } from '../types';
import { generateUUID } from '../utils/uuid';
import LocalStorageManager from './LocalStorageManager';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

/**
 * Service for generating music based on mood entries
 */
class MusicGenerationService {
  // API endpoint for music generation
  private readonly API_ENDPOINT = 'https://api.generativemoodtracker.com/generate-music';
  
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
  // Mapping of mood ratings to musical parameters
  private moodToMusicMap: Record<number, {
    tempo: number;
    keySignature: string;
    scaleType: string;
    density: number;
    dynamics: number;
    instrumentation: string[];
    reverb: number;
  }> = {
    // Very negative moods (1-2): Slow, minor keys, sparse instrumentation
    1: {
      tempo: 60, // Very slow
      keySignature: 'C minor',
      scaleType: 'minor',
      density: 0.3, // Sparse notes
      dynamics: 0.4, // Quiet
      instrumentation: ['piano', 'strings'],
      reverb: 0.8, // High reverb for melancholy feel
    },
    2: {
      tempo: 65,
      keySignature: 'G minor',
      scaleType: 'minor',
      density: 0.4,
      dynamics: 0.5,
      instrumentation: ['piano', 'cello'],
      reverb: 0.7,
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
    },
    4: {
      tempo: 80,
      keySignature: 'A minor',
      scaleType: 'dorian', // Minor with a brighter 6th
      density: 0.5,
      dynamics: 0.6,
      instrumentation: ['piano', 'guitar', 'bass'],
      reverb: 0.5,
    },
    // Neutral moods (5-6): Medium tempo, mix of minor and major
    5: {
      tempo: 88,
      keySignature: 'F major',
      scaleType: 'mixolydian', // Major with a flat 7th
      density: 0.6,
      dynamics: 0.6,
      instrumentation: ['piano', 'guitar', 'bass', 'light percussion'],
      reverb: 0.5,
    },
    6: {
      tempo: 96,
      keySignature: 'D major',
      scaleType: 'major',
      density: 0.6,
      dynamics: 0.7,
      instrumentation: ['piano', 'guitar', 'bass', 'percussion'],
      reverb: 0.4,
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
    },
    8: {
      tempo: 112,
      keySignature: 'E major',
      scaleType: 'lydian', // Major with a raised 4th - bright sound
      density: 0.7,
      dynamics: 0.8,
      instrumentation: ['piano', 'guitar', 'bass', 'percussion', 'synth'],
      reverb: 0.3,
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
    },
    10: {
      tempo: 132,
      keySignature: 'E major',
      scaleType: 'lydian',
      density: 0.9,
      dynamics: 0.9,
      instrumentation: ['piano', 'guitar', 'bass', 'full percussion', 'synth', 'brass', 'strings'],
      reverb: 0.2, // Less reverb for a clearer, more energetic sound
    },
  };

  // Emotion tags and their musical influences
  private emotionToMusicMap: Record<string, any> = {
    // Negative emotions
    'sad': {
      scaleModifier: 'minor',
      tempoModifier: -10,
      instrumentAdd: ['cello'],
      reverbModifier: 0.1,
    },
    'anxious': {
      scaleModifier: 'diminished',
      tempoModifier: 5,
      instrumentAdd: ['tremolo strings'],
      rhythmComplexity: 0.7,
    },
    'angry': {
      scaleModifier: 'phrygian', // Minor with a flat 2nd - tense sound
      tempoModifier: 10,
      instrumentAdd: ['distorted guitar', 'heavy percussion'],
      dynamics: 0.8,
    },
    'frustrated': {
      scaleModifier: 'minor',
      tempoModifier: 5,
      instrumentAdd: ['distorted bass'],
      rhythmComplexity: 0.6,
    },
    'tired': {
      scaleModifier: 'minor',
      tempoModifier: -15,
      instrumentAdd: ['soft pad'],
      density: 0.4,
    },
    
    // Neutral emotions
    'calm': {
      scaleModifier: 'major',
      tempoModifier: -10,
      instrumentAdd: ['acoustic guitar', 'soft pad'],
      reverbModifier: 0.1,
    },
    'focused': {
      scaleModifier: 'major',
      tempoModifier: 0,
      instrumentAdd: ['piano', 'minimal percussion'],
      rhythmComplexity: 0.4,
    },
    'reflective': {
      scaleModifier: 'dorian',
      tempoModifier: -5,
      instrumentAdd: ['piano', 'ambient pad'],
      reverbModifier: 0.1,
    },
    
    // Positive emotions
    'happy': {
      scaleModifier: 'major',
      tempoModifier: 10,
      instrumentAdd: ['bright synth'],
      dynamics: 0.8,
    },
    'excited': {
      scaleModifier: 'lydian',
      tempoModifier: 15,
      instrumentAdd: ['bright synth', 'full percussion'],
      dynamics: 0.9,
    },
    'grateful': {
      scaleModifier: 'major',
      tempoModifier: 0,
      instrumentAdd: ['acoustic guitar', 'warm pad'],
      reverbModifier: 0.05,
    },
    'inspired': {
      scaleModifier: 'lydian',
      tempoModifier: 5,
      instrumentAdd: ['strings', 'choir'],
      reverbModifier: 0.1,
    },
    'peaceful': {
      scaleModifier: 'major',
      tempoModifier: -15,
      instrumentAdd: ['soft pad', 'gentle piano'],
      reverbModifier: 0.15,
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
      emotionTags: moodEntry.emotionTags
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
      // Ensure music directory exists
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
      
      // Update the mood entry to link it to the generated music
      await LocalStorageManager.updateMoodEntry(userId, moodEntry.entryId, {
        musicGenerated: true,
        musicId: generatedMusic.musicId
      });
      
      // Store the generated music
      await LocalStorageManager.storeGeneratedMusic(userId, generatedMusic);
      
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
   * Generate music using the API
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
      // In a real implementation, this would make an API call to a music generation service
      // For this implementation, we'll simulate the API call and use a placeholder audio file
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, we would download the generated audio file
      // For this implementation, we'll use a placeholder file path
      const localFilePath = `${this.MUSIC_DIRECTORY}${musicObject.musicId}.mp3`;
      
      // Simulate successful generation with a placeholder duration
      const updatedMusicObject: GeneratedMusic = {
        ...musicObject,
        audioUrl: localFilePath,
        duration: 60 + Math.random() * 120, // Random duration between 60-180 seconds
      };
      
      return updatedMusicObject;
    } catch (error) {
      console.error('Music generation API error:', error);
      
      // Retry if we haven't exceeded the maximum retry count
      if (retryCount < this.MAX_RETRIES) {
        console.log(`Retrying music generation (attempt ${retryCount + 1}/${this.MAX_RETRIES})...`);
        return this.generateMusicFromAPI(request, musicObject, retryCount + 1);
      }
      
      // If we've exceeded the retry count, return a fallback music object
      return this.generateFallbackMusic(musicObject);
    }
  }

  /**
   * Generate fallback music when API generation fails
   * @param musicObject Original music object
   * @returns Updated music object with fallback audio
   */
  private async generateFallbackMusic(musicObject: GeneratedMusic): Promise<GeneratedMusic> {
    try {
      // In a real implementation, this would generate a simple fallback audio file
      // For this implementation, we'll use a placeholder file path
      const localFilePath = `${this.MUSIC_DIRECTORY}fallback_${musicObject.musicId}.mp3`;
      
      // Update the music object with fallback information
      const updatedMusicObject: GeneratedMusic = {
        ...musicObject,
        audioUrl: localFilePath,
        duration: 30, // Short fallback duration
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
   * Play generated music
   * @param musicId ID of the music to play
   * @param userId User ID
   * @returns Whether playback started successfully
   */
  async playMusic(musicId: string, userId: string): Promise<boolean> {
    try {
      // Stop any currently playing music
      await this.stopMusic();
      
      // Retrieve the music object
      const musicObject = await LocalStorageManager.retrieveGeneratedMusic(userId, musicId);
      
      if (!musicObject || !musicObject.audioUrl) {
        console.error('Music not found or has no audio URL');
        return false;
      }
      
      // Create and load the sound object
      this.soundObject = new Audio.Sound();
      await this.soundObject.loadAsync({ uri: musicObject.audioUrl });
      
      // Set up playback status update callback
      this.soundObject.setOnPlaybackStatusUpdate(async status => {
        if (status.isLoaded && status.didJustFinish) {
          if (this.isRepeatEnabled && this.currentMusicId) {
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
      await this.soundObject.playAsync();
      this.isPlaying = true;
      this.currentMusicId = musicId;
      
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
      const key = `generated_music_${userId}_${musicId}`;
      return await LocalStorageManager.retrieveGeneratedMusic(userId, musicId);
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
      
      // Get the music object
      const musicObject = await LocalStorageManager.retrieveGeneratedMusic(userId, musicId);
      
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
      
      // Remove from storage
      const key = `generated_music_${userId}_${musicId}`;
      await LocalStorageManager.removeData(key, true);
      
      return true;
    } catch (error) {
      console.error('Failed to delete music:', error);
      return false;
    }
  }
}

export default new MusicGenerationService();