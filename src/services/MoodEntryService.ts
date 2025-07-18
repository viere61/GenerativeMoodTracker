import { MoodEntry } from '../types';
import { generateUUID } from '../utils/uuid';
import StorageService from './StorageService';
import WebStorageService from './WebStorageService';
import MusicGenerationService from './MusicGenerationService';
import LocalStorageManager from './LocalStorageManager';

// Check if we're running on web
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Service for managing mood entries
 */
class MoodEntryService {
  /**
   * Save a new mood entry
   * @param userId The user ID
   * @param moodRating The mood rating (1-10)
   * @param emotionTags Array of emotion tags
   * @param reflection User's reflection text
   * @returns The created mood entry
   */
  async saveMoodEntry(
    userId: string,
    moodRating: number,
    emotionTags: string[] = [],
    reflection: string = ''
  ): Promise<MoodEntry> {
    // Ensure LocalStorageManager is initialized for mobile
    if (!isWeb) {
      try {
        console.log('Initializing LocalStorageManager for saveMoodEntry...');
        await LocalStorageManager.initialize();
        console.log('LocalStorageManager initialized successfully for saveMoodEntry');
      } catch (error) {
        console.error('Failed to initialize LocalStorageManager:', error);
        // Continue without encryption if initialization fails
      }
    }
    // Validate inputs
    if (moodRating < 1 || moodRating > 10) {
      throw new Error('Mood rating must be between 1 and 10');
    }
    
    // Create new mood entry
    const newEntry: MoodEntry = {
      entryId: generateUUID(),
      userId,
      timestamp: Date.now(),
      moodRating,
      emotionTags,
      reflection,
      musicGenerated: false
    };
    
    try {
      // Get existing entries
      const existingEntries = await this.getMoodEntries(userId);
      
      // Add new entry
      const updatedEntries = [...existingEntries, newEntry];
      
      // Store all entries using appropriate storage service
      if (isWeb) {
        await WebStorageService.storeMoodEntries(userId, updatedEntries);
      } else {
        // Use LocalStorageManager for storage on mobile
        await LocalStorageManager.storeMoodEntries(userId, updatedEntries);
      }
      
      // Trigger music generation asynchronously
      this.triggerMusicGeneration(userId, newEntry);
      
      return newEntry;
    } catch (error) {
      console.error('Error saving mood entry:', error);
      throw new Error('Failed to save mood entry');
    }
  }
  
  /**
   * Get all mood entries for a user
   * @param userId The user ID
   * @returns Array of mood entries
   */
  async getMoodEntries(userId: string): Promise<MoodEntry[]> {
    try {
      // Ensure LocalStorageManager is initialized for mobile
      if (!isWeb) {
        try {
          console.log('Initializing LocalStorageManager for getMoodEntries...');
          await LocalStorageManager.initialize();
          console.log('LocalStorageManager initialized successfully for getMoodEntries');
        } catch (error) {
          console.error('Failed to initialize LocalStorageManager:', error);
          // Continue without encryption if initialization fails
        }
      }
      
      if (isWeb) {
        return await WebStorageService.retrieveMoodEntries(userId);
      } else {
        // Use LocalStorageManager for storage on mobile
        const entries = await LocalStorageManager.retrieveMoodEntries(userId);
        return entries || [];
      }
    } catch (error) {
      console.error('Error retrieving mood entries:', error);
      return [];
    }
  }
  
  /**
   * Get today's mood entry for a user if it exists
   * @param userId The user ID
   * @returns Today's mood entry or null if none exists
   */
  async getTodaysMoodEntry(userId: string): Promise<MoodEntry | null> {
    try {
      const entries = await this.getMoodEntries(userId);
      
      // Get today's date (without time)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();
      
      // Find entry from today
      const todayEntry = entries.find(entry => {
        const entryDate = new Date(entry.timestamp);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === todayTimestamp;
      });
      
      return todayEntry || null;
    } catch (error) {
      console.error('Error retrieving today\'s mood entry:', error);
      return null;
    }
  }
  
  /**
   * Check if user has already logged a mood today
   * @param userId The user ID
   * @returns Boolean indicating if user has logged a mood today
   */
  async hasLoggedMoodToday(userId: string): Promise<boolean> {
    const todayEntry = await this.getTodaysMoodEntry(userId);
    return todayEntry !== null;
  }

  /**
   * Delete today's mood entry for a user
   * @param userId The user ID
   */
  async deleteTodaysMoodEntry(userId: string): Promise<void> {
    const entries = await this.getMoodEntries(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const filtered = entries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() !== todayTimestamp;
    });

    // Use LocalStorageManager for storage on mobile
    if (isWeb) {
      await WebStorageService.storeMoodEntries(userId, filtered);
    } else {
      await LocalStorageManager.storeMoodEntries(userId, filtered);
    }
  }

  /**
   * Trigger music generation for a mood entry
   * @param userId The user ID
   * @param moodEntry The mood entry to generate music for
   */
  private async triggerMusicGeneration(userId: string, moodEntry: MoodEntry): Promise<void> {
    try {
      console.log('Triggering music generation for mood entry:', moodEntry.entryId);
      
      // Initialize music generation service
      await MusicGenerationService.initialize();
      
      // Generate music
      const generatedMusic = await MusicGenerationService.generateMusic(userId, moodEntry);
      
      if (generatedMusic) {
        console.log('Music generation completed successfully:', generatedMusic.musicId);
        
        // Update the mood entry to mark music as generated
        const entries = await this.getMoodEntries(userId);
        const updatedEntries = entries.map(entry => 
          entry.entryId === moodEntry.entryId 
            ? { ...entry, musicGenerated: true, musicId: generatedMusic.musicId }
            : entry
        );
        
        // Save updated entries using appropriate storage service
        if (isWeb) {
          await WebStorageService.storeMoodEntries(userId, updatedEntries);
        } else {
          // Use LocalStorageManager for storage on mobile
          await LocalStorageManager.storeMoodEntries(userId, updatedEntries);
        }
        
        console.log('Mood entry updated with music ID:', generatedMusic.musicId);
      } else {
        console.log('Music generation failed or was queued');
      }
    } catch (error) {
      console.error('Error triggering music generation:', error);
      // Don't throw error to avoid breaking mood entry saving
    }
  }
}

export default new MoodEntryService();