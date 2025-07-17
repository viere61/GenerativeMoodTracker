import { MoodEntry } from '../types';
import { generateUUID } from '../utils/uuid';
import StorageService from './StorageService';

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
      
      // Store all entries
      const key = `mood_entries_${userId}`;
      await StorageService.setItem(key, JSON.stringify(updatedEntries));
      
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
      const key = `mood_entries_${userId}`;
      const entriesData = await StorageService.getItem(key);
      
      if (!entriesData) {
        return [];
      }
      
      return JSON.parse(entriesData) as MoodEntry[];
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

    const key = `mood_entries_${userId}`;
    await StorageService.setItem(key, JSON.stringify(filtered));
  }
}

export default new MoodEntryService();