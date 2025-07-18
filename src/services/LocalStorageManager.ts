import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodEntry, User, DailyWindow, GeneratedMusic } from '../types';

/**
 * Interface for sync queue items
 */
interface SyncQueueItem {
  type: 'mood_entry' | 'daily_window' | 'generated_music' | 'user_preferences';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  id?: string;
  retryCount?: number;
}

/**
 * LocalStorageManager handles storage operations for the application
 * It provides basic data protection and manages local storage
 */
class LocalStorageManager {
  private static instance: LocalStorageManager | null = null;
  
  // Storage keys
  private static readonly MOOD_ENTRIES_KEY = 'mood_entries';
  private static readonly USER_DATA_KEY = 'user_data';
  private static readonly DAILY_WINDOW_KEY = 'daily_window';
  private static readonly GENERATED_MUSIC_KEY = 'generated_music';
  private static readonly SYNC_QUEUE_KEY = 'sync_queue';
  private static readonly AUDIO_DATA_KEY = 'audio_data';
  
  private initialized = false;

  private constructor() {}

  static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }
  
  /**
   * Initialize the storage manager
   * This should be called when the app starts
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('LocalStorageManager already initialized, skipping...');
      return;
    }
    
    try {
      console.log('Initializing LocalStorageManager...');
      
      // Emergency clear if we're hitting storage limits
      try {
        await AsyncStorage.getAllKeys();
      } catch (storageError) {
        if (storageError instanceof Error && storageError.message.includes('196607')) {
          console.log('🚨 Storage limit exceeded, performing emergency clear...');
          await this.emergencyClear();
        }
      }
      
      // Check if we need to migrate existing data
      console.log('Checking for existing data migration...');
      await this.migrateExistingData();
      
      this.initialized = true;
      console.log('LocalStorageManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LocalStorageManager:', error);
      // Don't throw error, continue without encryption
      this.initialized = true;
    }
  }

  /**
   * Migrate existing data if needed
   */
  private async migrateExistingData(): Promise<void> {
    try {
      // Clear any old encrypted data that might cause issues
      await this.clearOldEncryptedData();
      
      // Check for existing mood entries in different formats
      const existingMoodEntries = await AsyncStorage.getItem(LocalStorageManager.MOOD_ENTRIES_KEY);
      if (existingMoodEntries) {
        console.log('Found existing mood entries, migrating...');
        
        try {
          // Parse the existing data
          const entries = JSON.parse(existingMoodEntries);
          
          // Store in new format
          await this.storeData(LocalStorageManager.MOOD_ENTRIES_KEY, entries, false);
          
          console.log('Successfully migrated existing mood entries');
        } catch (parseError) {
          console.log('Failed to parse existing mood entries - likely old encrypted data, clearing...');
          await this.removeData(LocalStorageManager.MOOD_ENTRIES_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to migrate existing data:', error);
      // Don't throw here, as this is not critical for app functionality
    }
  }

  /**
   * Clear any old encrypted data that might cause issues
   */
  private async clearOldEncryptedData(): Promise<void> {
    try {
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      
      // Look for keys that might contain old encrypted data
      const keysToClear = keys.filter(key => 
        key.includes('mood_entries') || 
        key.includes('user_data') || 
        key.includes('generated_music') ||
        key.includes('daily_window')
      );
      
      if (keysToClear.length > 0) {
        console.log('Clearing potentially corrupted old data...');
        
        for (const key of keysToClear) {
          try {
            const data = await AsyncStorage.getItem(key);
            if (data) {
              // Try to parse as JSON
              JSON.parse(data);
              // If it parses successfully, keep it
              console.log('Keeping valid data for key:', key);
            } else {
              // If it's null or empty, remove it
              await AsyncStorage.removeItem(key);
              console.log('Removed empty data for key:', key);
            }
          } catch (parseError) {
            // If parsing fails, it's likely old encrypted data, so remove it
            await AsyncStorage.removeItem(key);
            console.log('Removed old encrypted data for key:', key);
          }
        }
      }
      
      // Clear excessive data to prevent storage overflow
      await this.clearExcessiveData();
    } catch (error) {
      console.error('Failed to clear old encrypted data:', error);
      // Don't throw here, as this is not critical
    }
  }

  /**
   * Clear excessive data to prevent storage overflow
   */
  private async clearExcessiveData(): Promise<void> {
    try {
      console.log('Clearing potentially corrupted old data...');
      
      // Clear all AsyncStorage to reset the property count
      await AsyncStorage.clear();
      console.log('Cleared all AsyncStorage data to prevent overflow');
      
    } catch (error) {
      console.error('Failed to clear excessive data:', error);
      // Don't throw here, as this is not critical
    }
  }

  /**
   * Force clear all storage data (emergency cleanup)
   */
  async emergencyClear(): Promise<void> {
    try {
      console.log('🚨 Emergency clearing all storage data...');
      await AsyncStorage.clear();
      this.initialized = false;
      console.log('✅ Emergency clear completed');
    } catch (error) {
      console.error('❌ Emergency clear failed:', error);
    }
  }
  
  /**
   * Simple data obfuscation for basic protection
   * @param data The data to obfuscate
   * @returns The obfuscated data
   */
  private obfuscateData(data: string): string {
    // Simple XOR with a fixed key for basic obfuscation
    const key = 'moodtracker2024';
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }
  
  /**
   * De-obfuscate data
   * @param obfuscatedData The obfuscated data
   * @returns The original data
   */
  private deobfuscateData(obfuscatedData: string): string {
    // XOR with the same key to de-obfuscate
    const key = 'moodtracker2024';
    let result = '';
    for (let i = 0; i < obfuscatedData.length; i++) {
      result += String.fromCharCode(obfuscatedData.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }

  /**
   * Store data with optional obfuscation
   * @param key The storage key
   * @param data The data to store
   * @param useObfuscation Whether to obfuscate the data
   */
  async storeData(key: string, data: any, useObfuscation: boolean = false): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      const dataToStore = useObfuscation ? this.obfuscateData(jsonData) : jsonData;
      
      await AsyncStorage.setItem(key, dataToStore);
    } catch (error) {
      console.error('Failed to store data for key', key, ':', error);
      throw new Error('Data storage failed');
    }
  }

  /**
   * Retrieve data with optional de-obfuscation
   * @param key The storage key
   * @param useObfuscation Whether the data was obfuscated
   * @returns The retrieved data
   */
  async retrieveData<T>(key: string, useObfuscation: boolean = false): Promise<T | null> {
    try {
      const storedData = await AsyncStorage.getItem(key);
      if (!storedData) {
        return null;
      }
      
      // Try to parse as JSON first (for new format)
      try {
        const jsonData = useObfuscation ? this.deobfuscateData(storedData) : storedData;
        return JSON.parse(jsonData);
      } catch (parseError) {
        // If parsing fails, it might be old encrypted data, so return null
        console.log('Failed to parse data for key', key, '- likely old encrypted data, clearing...');
        await this.removeData(key);
        return null;
      }
    } catch (error) {
      console.error('Failed to retrieve data for key', key, ':', error);
      return null;
    }
  }

  /**
   * Remove data from storage
   * @param key The storage key
   */
  async removeData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove data for key', key, ':', error);
      throw new Error('Data removal failed');
    }
  }

  /**
   * Store user data
   * @param user The user data to store
   */
  async storeUserData(user: User): Promise<void> {
    await this.storeData(`${LocalStorageManager.USER_DATA_KEY}_${user.userId}`, user, false);
  }

  /**
   * Retrieve user data
   * @param userId The user ID
   * @returns The user data
   */
  async retrieveUserData(userId: string): Promise<User | null> {
    return await this.retrieveData<User>(`${LocalStorageManager.USER_DATA_KEY}_${userId}`, false);
  }

  /**
   * Update user data
   * @param userId The user ID
   * @param updates The updates to apply
   */
  async updateUserData(userId: string, updates: Partial<User>): Promise<void> {
    const existingUser = await this.retrieveUserData(userId);
    if (existingUser) {
      const updatedUser = { ...existingUser, ...updates };
      await this.storeUserData(updatedUser);
    }
  }

  /**
   * Store mood entries for a user
   * @param userId The user ID
   * @param entries The mood entries to store
   */
  async storeMoodEntries(userId: string, entries: MoodEntry[]): Promise<void> {
    await this.storeData(`${LocalStorageManager.MOOD_ENTRIES_KEY}_${userId}`, entries, false);
  }

  /**
   * Retrieve mood entries for a user
   * @param userId The user ID
   * @returns The mood entries
   */
  async retrieveMoodEntries(userId: string): Promise<MoodEntry[]> {
    const entries = await this.retrieveData<MoodEntry[]>(`${LocalStorageManager.MOOD_ENTRIES_KEY}_${userId}`, false);
    return entries || [];
  }

  /**
   * Store a single mood entry
   * @param userId The user ID
   * @param entry The mood entry to store
   */
  async storeMoodEntry(userId: string, entry: MoodEntry): Promise<void> {
    const entries = await this.retrieveMoodEntries(userId);
    const existingIndex = entries.findIndex(e => e.entryId === entry.entryId);
    
    if (existingIndex >= 0) {
      entries[existingIndex] = entry;
    } else {
      entries.push(entry);
    }
    
    await this.storeMoodEntries(userId, entries);
  }

  /**
   * Update a mood entry
   * @param userId The user ID
   * @param entryId The entry ID
   * @param updatedEntry The updated entry data
   */
  async updateMoodEntry(userId: string, entryId: string, updatedEntry: Partial<MoodEntry>): Promise<void> {
    const entries = await this.retrieveMoodEntries(userId);
    const entryIndex = entries.findIndex(e => e.entryId === entryId);
    
    if (entryIndex >= 0) {
      entries[entryIndex] = { ...entries[entryIndex], ...updatedEntry };
      await this.storeMoodEntries(userId, entries);
    }
  }

  /**
   * Delete a mood entry
   * @param userId The user ID
   * @param entryId The entry ID
   */
  async deleteMoodEntry(userId: string, entryId: string): Promise<void> {
    const entries = await this.retrieveMoodEntries(userId);
    const filteredEntries = entries.filter(e => e.entryId !== entryId);
    await this.storeMoodEntries(userId, filteredEntries);
  }

  /**
   * Store daily window data
   * @param userId The user ID
   * @param window The daily window data
   */
  async storeDailyWindow(userId: string, window: DailyWindow): Promise<void> {
    await this.storeData(`${LocalStorageManager.DAILY_WINDOW_KEY}_${userId}`, window, false);
  }

  /**
   * Retrieve daily window data
   * @param userId The user ID
   * @returns The daily window data
   */
  async retrieveDailyWindow(userId: string): Promise<DailyWindow | null> {
    return await this.retrieveData<DailyWindow>(`${LocalStorageManager.DAILY_WINDOW_KEY}_${userId}`, false);
  }

  /**
   * Store generated music
   * @param userId The user ID
   * @param music The generated music data
   */
  async storeGeneratedMusic(userId: string, music: GeneratedMusic): Promise<void> {
    const allMusic = await this.retrieveAllGeneratedMusic(userId);
    const existingIndex = allMusic.findIndex(m => m.musicId === music.musicId);
    
    if (existingIndex >= 0) {
      allMusic[existingIndex] = music;
    } else {
      allMusic.push(music);
    }
    
    await this.storeData(`${LocalStorageManager.GENERATED_MUSIC_KEY}_${userId}`, allMusic, false);
  }

  /**
   * Retrieve generated music by ID
   * @param userId The user ID
   * @param musicId The music ID
   * @returns The generated music data
   */
  async retrieveGeneratedMusic(userId: string, musicId: string): Promise<GeneratedMusic | null> {
    const allMusic = await this.retrieveAllGeneratedMusic(userId);
    return allMusic.find(m => m.musicId === musicId) || null;
  }

  /**
   * Retrieve all generated music for a user
   * @param userId The user ID
   * @returns Array of generated music
   */
  async retrieveAllGeneratedMusic(userId: string): Promise<GeneratedMusic[]> {
    const music = await this.retrieveData<GeneratedMusic[]>(`${LocalStorageManager.GENERATED_MUSIC_KEY}_${userId}`, false);
    return music || [];
  }

  /**
   * Store audio data (base64 encoded)
   * @param musicId The music ID
   * @param audioData The base64 audio data
   */
  async storeAudioData(musicId: string, audioData: string): Promise<void> {
    await this.storeData(`${LocalStorageManager.AUDIO_DATA_KEY}_${musicId}`, audioData, false);
  }

  /**
   * Retrieve audio data
   * @param musicId The music ID
   * @returns The base64 audio data
   */
  async retrieveAudioData(musicId: string): Promise<string | null> {
    return await this.retrieveData<string>(`${LocalStorageManager.AUDIO_DATA_KEY}_${musicId}`, false);
  }

  /**
   * Add item to sync queue
   * @param item The sync queue item
   */
  private async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    const queue = await this.getSyncQueue();
    queue.push(item);
    await this.storeSyncQueue(queue);
  }

  /**
   * Get sync queue
   * @returns Array of sync queue items
   */
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const queue = await this.retrieveData<SyncQueueItem[]>(LocalStorageManager.SYNC_QUEUE_KEY, false);
    return queue || [];
  }

  /**
   * Store sync queue
   * @param queue The sync queue to store
   */
  private async storeSyncQueue(queue: SyncQueueItem[]): Promise<void> {
    await this.storeData(LocalStorageManager.SYNC_QUEUE_KEY, queue, false);
  }

  /**
   * Remove item from sync queue
   * @param itemId The item ID to remove
   */
  async removeFromSyncQueue(itemId: string): Promise<void> {
    const queue = await this.getSyncQueue();
    const filteredQueue = queue.filter(item => item.id !== itemId);
    await this.storeSyncQueue(filteredQueue);
  }

  /**
   * Update sync queue item
   * @param itemId The item ID
   * @param updates The updates to apply
   */
  async updateSyncQueueItem(itemId: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const queue = await this.getSyncQueue();
    const itemIndex = queue.findIndex(item => item.id === itemId);
    
    if (itemIndex >= 0) {
      queue[itemIndex] = { ...queue[itemIndex], ...updates };
      await this.storeSyncQueue(queue);
    }
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue(): Promise<void> {
    await this.removeData(LocalStorageManager.SYNC_QUEUE_KEY);
  }
}

export default LocalStorageManager.getInstance();