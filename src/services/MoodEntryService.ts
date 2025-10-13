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
    reflection: string = '',
    reflectionPrompt?: string
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
    // Normalize mood rating: accept continuous input (1..100) and map to 1..10
    let normalizedRating = moodRating;
    if (moodRating > 10) {
      const capped = Math.min(Math.max(moodRating, 1), 100);
      // Map 1..100 slider to 1..10 with stable mid and extremes
      const t = (capped - 1) / 99; // 0..1
      const mapped = 1 + t * 9; // 1..10
      // Use bankers rounding to reduce bias and ensure 50->5, 100->10, 1->1
      normalizedRating = Math.max(1, Math.min(10, Math.round(mapped)));
    } else if (moodRating < 1) {
      normalizedRating = 1;
    }
    
    // Create new mood entry
    const newEntry: MoodEntry = {
      entryId: generateUUID(),
      userId,
      timestamp: Date.now(),
      moodRating: normalizedRating,
      emotionTags,
      influences,
      reflection,
      musicGenerated: false
    };
    if (reflectionPrompt) {
      (newEntry as any).reflectionPrompt = reflectionPrompt;
    }
    
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
      
      // Trigger music generation asynchronously once, and ensure no duplicates are queued
      console.log('🎵 [saveMoodEntry] About to trigger music generation for entry:', newEntry.entryId);
      this.triggerMusicGeneration(userId, newEntry).catch(error => {
        console.error('🎵 [saveMoodEntry] Music generation failed:', error);
      });
      
      // Ensure 30 days of windows ahead exist after successful mood save
      try {
        const TimeWindowService = (await import('./TimeWindowService')).default;
        const PushNotificationService = (await import('./PushNotificationService')).default;
        
        console.log('🔄 [MoodEntryService] Ensuring 30 days of windows ahead after mood save...');
        
        // Create multi-day windows
        const windows = await TimeWindowService.createMultiDayWindows(userId, 30);
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

        // Reconcile entries with any generated music stored separately (failsafe)
        try {
          const generatedMusicList = await LocalStorageManager.retrieveAllGeneratedMusic(userId);
          if (generatedMusicList && generatedMusicList.length > 0) {
            const musicByEntryId = new Map(generatedMusicList.map(m => [m.entryId, m.musicId]));
            let hasChanges = false;
            const reconciled = (entries || []).map(e => {
              const musicId = musicByEntryId.get(e.entryId);
              if (musicId && (!e.musicGenerated || !e.musicId)) {
                hasChanges = true;
                return { ...e, musicGenerated: true, musicId };
              }
              return e;
            });
            if (hasChanges) {
              console.log('🔧 [MoodEntryService] Reconciled mood entries with generated music. Persisting updates...');
              await LocalStorageManager.storeMoodEntries(userId, reconciled);
              entries.splice(0, entries.length, ...reconciled);
            }
          }
        } catch (reconcileError) {
          console.error('⚠️ [MoodEntryService] Failed to reconcile generated music with mood entries:', reconcileError);
        }

        // Removed backfill auto-generation to prevent duplicate generations
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
   * Save a simple sound reaction rating for an entry
   */
  async updateSoundReaction(userId: string, entryId: string, rating: -2 | -1 | 0 | 1 | 2): Promise<void> {
    try {
      const entries = await this.getMoodEntries(userId);
      const updated = entries.map(e => e.entryId === entryId ? { ...e, soundReaction: { rating, ratedAt: Date.now() } } : e);
      if (isWeb) {
        await WebStorageService.storeMoodEntries(userId, updated);
      } else {
        await LocalStorageManager.storeMoodEntries(userId, updated);
      }
    } catch (error) {
      console.error('Failed to save sound reaction:', error);
      throw new Error('Failed to save sound reaction');
    }
  }

  // (Removed) updateSoundReaction

  /**
   * Backfill prompt labels for existing entries and generated music
   * Sets missing labels to "No label" and prefix to 'none'
   */
  async backfillPromptLabels(userId: string): Promise<void> {
    try {
      // Backfill mood entries
      const entries = await this.getMoodEntries(userId);
      let entriesChanged = false;
      const updatedEntries = entries.map(e => {
        if (e.musicId && (!e.promptLabel || !e.promptPrefix)) {
          entriesChanged = true;
          return { ...e, promptLabel: e.promptLabel || 'No label', promptPrefix: e.promptPrefix || 'none' } as MoodEntry;
        }
        return e;
      });

      if (entriesChanged) {
        if (isWeb) {
          await WebStorageService.storeMoodEntries(userId, updatedEntries);
        } else {
          await LocalStorageManager.storeMoodEntries(userId, updatedEntries);
        }
      }

      // Backfill generated music objects
      if (isWeb) {
        const allMusic = await WebStorageService.retrieveAllGeneratedMusic(userId);
        for (const m of allMusic) {
          if (!m.promptLabelUsed || !m.promptPrefixUsed) {
            m.promptLabelUsed = m.promptLabelUsed || 'No label';
            m.promptPrefixUsed = m.promptPrefixUsed || 'none';
            await WebStorageService.storeGeneratedMusic(userId, m);
          }
        }
      } else {
        const allMusic = await LocalStorageManager.retrieveAllGeneratedMusic(userId);
        let musicChanged = false;
        const updatedMusic = allMusic.map(m => {
          if (!m.promptLabelUsed || !m.promptPrefixUsed) {
            musicChanged = true;
            return { ...m, promptLabelUsed: m.promptLabelUsed || 'No label', promptPrefixUsed: m.promptPrefixUsed || 'none' } as any;
          }
          return m;
        });
        if (musicChanged) {
          // Re-store each music item via storeGeneratedMusic to keep API consistent
          for (const m of updatedMusic) {
            await LocalStorageManager.storeGeneratedMusic(userId, m);
          }
        }
      }
    } catch (error) {
      console.error('Failed to backfill prompt labels:', error);
    }
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