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
    influences: string[] = [],
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
      influences,
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
      console.log('🎵 [saveMoodEntry] About to trigger music generation for entry:', newEntry.entryId);
      this.triggerMusicGeneration(userId, newEntry).catch(error => {
        console.error('🎵 [saveMoodEntry] Music generation failed:', error);
      });
      
      // Ensure 7 days of windows ahead exist after successful mood save
      try {
        const TimeWindowService = (await import('./TimeWindowService')).default;
        const PushNotificationService = (await import('./PushNotificationService')).default;
        
        console.log('🔄 [MoodEntryService] Ensuring 7 days of windows ahead after mood save...');
        
        // Create multi-day windows
        const windows = await TimeWindowService.createMultiDayWindows(userId, 7);
        console.log('🔄 [MoodEntryService] Created', windows.length, 'windows ahead');
        
        // Schedule notifications for the new windows
        const pushNotificationService = PushNotificationService.getInstance();
        const notificationResult = await pushNotificationService.scheduleMultiDayNotifications(windows);
        
        if (notificationResult.success) {
          console.log('✅ [MoodEntryService] Successfully scheduled', notificationResult.scheduledCount, 'notifications for future windows');
        } else {
          console.warn('⚠️ [MoodEntryService] Some notifications failed to schedule:', notificationResult.errors);
        }
      } catch (error) {
        console.error('❌ [MoodEntryService] Error ensuring multi-day windows after mood save:', error);
        // Don't throw error - mood save was successful, this is just a maintenance task
      }
      
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
        console.log('📱 Retrieved mood entries:', entries?.length || 0, 'entries');
        if (entries && entries.length > 0) {
          entries.forEach(entry => {
            console.log('📱 Entry:', entry.entryId, 'musicGenerated:', entry.musicGenerated, 'musicId:', entry.musicId);
          });
        }
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
      
      // Run diagnostics to check configuration
      await MusicGenerationService.diagnoseConfiguration();
      
      // Initialize music generation service
      await MusicGenerationService.initialize();
      
      // Generate music
      const generatedMusic = await MusicGenerationService.generateMusic(userId, moodEntry);
      
      if (generatedMusic) {
        console.log('Music generation completed successfully:', generatedMusic.musicId);
        
        // Update the mood entry to mark music as generated
        const entries = await this.getMoodEntries(userId);
        console.log('🔄 Before update - entries count:', entries.length);
        
        const updatedEntries = entries.map(entry => 
          entry.entryId === moodEntry.entryId 
            ? { ...entry, musicGenerated: true, musicId: generatedMusic.musicId }
            : entry
        );
        
        console.log('🔄 After update - entries count:', updatedEntries.length);
        const updatedEntry = updatedEntries.find(entry => entry.entryId === moodEntry.entryId);
        console.log('🔄 Updated entry:', updatedEntry?.entryId, 'musicGenerated:', updatedEntry?.musicGenerated, 'musicId:', updatedEntry?.musicId);
        
        // Save updated entries using appropriate storage service
        if (isWeb) {
          await WebStorageService.storeMoodEntries(userId, updatedEntries);
        } else {
          // Use LocalStorageManager for storage on mobile
          await LocalStorageManager.storeMoodEntries(userId, updatedEntries);
        }
        
        console.log('✅ Mood entry updated with music ID:', generatedMusic.musicId);
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