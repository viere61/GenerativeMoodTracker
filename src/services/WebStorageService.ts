/**
 * Web-compatible storage service for the Generative Mood Tracker app
 * This service uses localStorage and browser APIs instead of Expo native modules
 */

import { MoodEntry, User, DailyWindow, GeneratedMusic } from '../types';

class WebStorageService {
  private static readonly MOOD_ENTRIES_KEY = 'mood_entries';
  private static readonly USER_DATA_KEY = 'user_data';
  private static readonly DAILY_WINDOW_KEY = 'daily_window';
  private static readonly GENERATED_MUSIC_KEY = 'generated_music';

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    // No initialization needed for web storage
    console.log('WebStorageService initialized');
  }

  /**
   * Store data in localStorage
   */
  private async storeData(key: string, data: any): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      localStorage.setItem(key, jsonData);
    } catch (error) {
      console.error(`Failed to store data for key ${key}:`, error);
      throw new Error('Data storage failed');
    }
  }

  /**
   * Retrieve data from localStorage
   */
  private async retrieveData<T>(key: string): Promise<T | null> {
    try {
      const jsonData = localStorage.getItem(key);
      if (!jsonData) {
        return null;
      }
      return JSON.parse(jsonData) as T;
    } catch (error) {
      console.error(`Failed to retrieve data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove data from localStorage
   */
  private async removeData(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove data for key ${key}:`, error);
    }
  }

  // Mood entries methods
  async storeMoodEntries(userId: string, entries: MoodEntry[]): Promise<void> {
    const key = `${WebStorageService.MOOD_ENTRIES_KEY}_${userId}`;
    await this.storeData(key, entries);
  }

  async retrieveMoodEntries(userId: string): Promise<MoodEntry[]> {
    const key = `${WebStorageService.MOOD_ENTRIES_KEY}_${userId}`;
    const entries = await this.retrieveData<MoodEntry[]>(key);
    return entries || [];
  }

  async updateMoodEntry(userId: string, entryId: string, updates: Partial<MoodEntry>): Promise<void> {
    try {
      const entries = await this.retrieveMoodEntries(userId);
      const updatedEntries = entries.map(entry => 
        entry.entryId === entryId ? { ...entry, ...updates } : entry
      );
      await this.storeMoodEntries(userId, updatedEntries);
    } catch (error) {
      console.error('Failed to update mood entry:', error);
      throw new Error('Mood entry update failed');
    }
  }

  // Generated music methods
  async storeGeneratedMusic(userId: string, music: GeneratedMusic): Promise<void> {
    const key = `${WebStorageService.GENERATED_MUSIC_KEY}_${userId}_${music.musicId}`;
    await this.storeData(key, music);
  }

  async retrieveGeneratedMusic(userId: string, musicId: string): Promise<GeneratedMusic | null> {
    const key = `${WebStorageService.GENERATED_MUSIC_KEY}_${userId}_${musicId}`;
    return await this.retrieveData<GeneratedMusic>(key);
  }

  async retrieveAllGeneratedMusic(userId: string): Promise<GeneratedMusic[]> {
    try {
      const music: GeneratedMusic[] = [];
      
      // Get all keys from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${WebStorageService.GENERATED_MUSIC_KEY}_${userId}_`)) {
          const musicData = await this.retrieveData<GeneratedMusic>(key);
          if (musicData) {
            music.push(musicData);
          }
        }
      }
      
      return music;
    } catch (error) {
      console.error('Failed to retrieve all generated music:', error);
      return [];
    }
  }

  // User data methods
  async storeUserData(user: User): Promise<void> {
    const key = `${WebStorageService.USER_DATA_KEY}_${user.userId}`;
    await this.storeData(key, user);
  }

  async retrieveUserData(userId: string): Promise<User | null> {
    const key = `${WebStorageService.USER_DATA_KEY}_${userId}`;
    return await this.retrieveData<User>(key);
  }

  // Daily window methods
  async storeDailyWindow(userId: string, window: DailyWindow): Promise<void> {
    const key = `${WebStorageService.DAILY_WINDOW_KEY}_${userId}`;
    await this.storeData(key, window);
  }

  async retrieveDailyWindow(userId: string): Promise<DailyWindow | null> {
    const key = `${WebStorageService.DAILY_WINDOW_KEY}_${userId}`;
    return await this.retrieveData<DailyWindow>(key);
  }

  // Generic data methods for compatibility
  async storeDataGeneric(key: string, data: any, useEncryption: boolean = false): Promise<void> {
    // Ignore useEncryption parameter for web storage
    await this.storeData(key, data);
  }

  async retrieveDataGeneric<T>(key: string, useEncryption: boolean = false): Promise<T | null> {
    // Ignore useEncryption parameter for web storage
    return await this.retrieveData<T>(key);
  }

  async removeDataGeneric(key: string, useEncryption: boolean = false): Promise<void> {
    // Ignore useEncryption parameter for web storage
    await this.removeData(key);
  }
}

export default new WebStorageService(); 