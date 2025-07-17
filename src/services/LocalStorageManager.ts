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
 * LocalStorageManager handles secure storage operations for the application
 * It provides encryption for sensitive data and manages local storage
 */
class LocalStorageManager {
  // Storage keys
  private static readonly ENCRYPTION_KEY = 'encryption_key';
  private static readonly MOOD_ENTRIES_KEY = 'mood_entries';
  private static readonly USER_DATA_KEY = 'user_data';
  private static readonly DAILY_WINDOW_KEY = 'daily_window';
  private static readonly GENERATED_MUSIC_KEY = 'generated_music';
  private static readonly SYNC_QUEUE_KEY = 'sync_queue';
  
  /**
   * Initialize the storage manager
   * This should be called when the app starts
   */
  async initialize(): Promise<void> {
    try {
      // Check if encryption key exists, if not create one
      const encryptionKey = await SecureStore.getItemAsync(LocalStorageManager.ENCRYPTION_KEY);
      if (!encryptionKey) {
        await this.generateAndStoreEncryptionKey();
      }
    } catch (error) {
      console.error('Failed to initialize LocalStorageManager:', error);
      throw new Error('Storage initialization failed');
    }
  }
  
  /**
   * Generate and store a new encryption key
   * @returns The generated encryption key
   */
  private async generateAndStoreEncryptionKey(): Promise<string> {
    try {
      // Generate a random encryption key
      const randomBytes = Array.from(new Uint8Array(32))
        .map(() => Math.floor(Math.random() * 256));
      
      const encryptionKey = randomBytes
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
      
      // Store the encryption key securely
      await SecureStore.setItemAsync(LocalStorageManager.ENCRYPTION_KEY, encryptionKey);
      
      return encryptionKey;
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      throw new Error('Encryption key generation failed');
    }
  }
  
  /**
   * Get the stored encryption key
   * @returns The encryption key
   */
  private async getEncryptionKey(): Promise<string> {
    const key = await SecureStore.getItemAsync(LocalStorageManager.ENCRYPTION_KEY);
    if (!key) {
      throw new Error('Encryption key not found');
    }
    return key;
  }
  
  /**
   * Encrypt data using the stored encryption key
   * @param data The data to encrypt
   * @returns The encrypted data
   */
  private async encrypt(data: string): Promise<string> {
    try {
      const encryptionKey = await this.getEncryptionKey();
      
      // In a real app, we would use a proper encryption algorithm
      // For this implementation, we'll use a simple XOR encryption with the key
      // combined with a hash for integrity
      
      // Create a hash of the original data for integrity checking
      const dataHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
      );
      
      // Prepare data with hash
      const dataWithHash = `${data}|${dataHash}`;
      
      // XOR encrypt the data with the key
      const encrypted = this.xorEncrypt(dataWithHash, encryptionKey);
      
      // Return base64 encoded encrypted data
      return btoa(encrypted);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }
  
  /**
   * Decrypt data using the stored encryption key
   * @param encryptedData The encrypted data
   * @returns The decrypted data
   */
  private async decrypt(encryptedData: string): Promise<string> {
    try {
      const encryptionKey = await this.getEncryptionKey();
      
      // Decode from base64
      const encrypted = atob(encryptedData);
      
      // XOR decrypt
      const decrypted = this.xorEncrypt(encrypted, encryptionKey);
      
      // Split data and hash
      const [data, storedHash] = decrypted.split('|');
      
      // Verify integrity
      const calculatedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
      );
      
      if (calculatedHash !== storedHash) {
        throw new Error('Data integrity check failed');
      }
      
      return data;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }
  
  /**
   * Simple XOR encryption/decryption
   * @param text Text to encrypt/decrypt
   * @param key Encryption key
   * @returns Encrypted/decrypted text
   */
  private xorEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  }
  
  /**
   * Store data securely
   * @param key Storage key
   * @param data Data to store
   * @param useEncryption Whether to encrypt the data
   */
  async storeData(key: string, data: any, useEncryption: boolean = true): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      
      if (useEncryption) {
        // Encrypt and store in SecureStore for sensitive data
        const encryptedData = await this.encrypt(jsonData);
        await SecureStore.setItemAsync(key, encryptedData);
      } else {
        // Store in AsyncStorage for non-sensitive data
        await AsyncStorage.setItem(key, jsonData);
      }
    } catch (error) {
      console.error(`Failed to store data for key ${key}:`, error);
      throw new Error('Data storage failed');
    }
  }
  
  /**
   * Retrieve stored data
   * @param key Storage key
   * @param useEncryption Whether the data is encrypted
   * @returns The retrieved data
   */
  async retrieveData<T>(key: string, useEncryption: boolean = true): Promise<T | null> {
    try {
      let jsonData: string | null;
      
      if (useEncryption) {
        // Retrieve from SecureStore and decrypt
        const encryptedData = await SecureStore.getItemAsync(key);
        if (!encryptedData) {
          return null;
        }
        jsonData = await this.decrypt(encryptedData);
      } else {
        // Retrieve from AsyncStorage
        jsonData = await AsyncStorage.getItem(key);
        if (!jsonData) {
          return null;
        }
      }
      
      return JSON.parse(jsonData) as T;
    } catch (error) {
      console.error(`Failed to retrieve data for key ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Remove stored data
   * @param key Storage key
   * @param useEncryption Whether the data is encrypted
   */
  async removeData(key: string, useEncryption: boolean = true): Promise<void> {
    try {
      if (useEncryption) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Failed to remove data for key ${key}:`, error);
      throw new Error('Data removal failed');
    }
  }
  
  // User data specific methods
  
  /**
   * Store user data
   * @param user User data to store
   */
  async storeUserData(user: User): Promise<void> {
    const key = `${LocalStorageManager.USER_DATA_KEY}_${user.userId}`;
    await this.storeData(key, user, true);
    
    // Add to sync queue
    await this.addToSyncQueue({
      type: 'user_preferences',
      action: 'update',
      data: {
        userId: user.userId,
        preferredTimeRange: user.preferredTimeRange,
        settings: user.settings
      },
      timestamp: Date.now()
    });
  }
  
  /**
   * Retrieve user data
   * @param userId User ID
   * @returns The user data
   */
  async retrieveUserData(userId: string): Promise<User | null> {
    const key = `${LocalStorageManager.USER_DATA_KEY}_${userId}`;
    return await this.retrieveData<User>(key, true);
  }
  
  /**
   * Update user data
   * @param userId User ID
   * @param updates Updates to apply
   */
  async updateUserData(userId: string, updates: Partial<User>): Promise<void> {
    try {
      // Get existing user data
      const userData = await this.retrieveUserData(userId);
      
      if (!userData) {
        throw new Error('User data not found');
      }
      
      // Update user data
      const updatedUserData = { ...userData, ...updates };
      
      // Store updated user data
      await this.storeUserData(updatedUserData);
    } catch (error) {
      console.error('Failed to update user data:', error);
      throw new Error('User data update failed');
    }
  }
  
  // Mood Entry specific methods
  
  /**
   * Store mood entries for a user
   * @param userId User ID
   * @param entries Mood entries to store
   */
  async storeMoodEntries(userId: string, entries: MoodEntry[]): Promise<void> {
    const key = `${LocalStorageManager.MOOD_ENTRIES_KEY}_${userId}`;
    await this.storeData(key, entries, true);
  }
  
  /**
   * Retrieve mood entries for a user
   * @param userId User ID
   * @returns The user's mood entries
   */
  async retrieveMoodEntries(userId: string): Promise<MoodEntry[]> {
    const key = `${LocalStorageManager.MOOD_ENTRIES_KEY}_${userId}`;
    return await this.retrieveData<MoodEntry[]>(key, true) || [];
  }
  
  /**
   * Store a single mood entry for a user
   * @param userId User ID
   * @param entry Mood entry to store
   */
  async storeMoodEntry(userId: string, entry: MoodEntry): Promise<void> {
    try {
      // Get existing entries
      const entries = await this.retrieveMoodEntries(userId);
      
      // Add new entry
      const updatedEntries = [...entries, entry];
      
      // Store updated entries
      await this.storeMoodEntries(userId, updatedEntries);
      
      // Add to sync queue
      await this.addToSyncQueue({
        type: 'mood_entry',
        action: 'create',
        data: entry,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to store mood entry:', error);
      throw new Error('Mood entry storage failed');
    }
  }
  
  /**
   * Update a mood entry
   * @param userId User ID
   * @param entryId Entry ID to update
   * @param updatedEntry Updated entry data
   */
  async updateMoodEntry(userId: string, entryId: string, updatedEntry: Partial<MoodEntry>): Promise<void> {
    try {
      // Get existing entries
      const entries = await this.retrieveMoodEntries(userId);
      
      // Find and update the entry
      const updatedEntries = entries.map(entry => 
        entry.entryId === entryId ? { ...entry, ...updatedEntry } : entry
      );
      
      // Store updated entries
      await this.storeMoodEntries(userId, updatedEntries);
      
      // Add to sync queue
      await this.addToSyncQueue({
        type: 'mood_entry',
        action: 'update',
        data: { entryId, ...updatedEntry },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to update mood entry:', error);
      throw new Error('Mood entry update failed');
    }
  }
  
  /**
   * Delete a mood entry
   * @param userId User ID
   * @param entryId Entry ID to delete
   */
  async deleteMoodEntry(userId: string, entryId: string): Promise<void> {
    try {
      // Get existing entries
      const entries = await this.retrieveMoodEntries(userId);
      
      // Filter out the entry to delete
      const updatedEntries = entries.filter(entry => entry.entryId !== entryId);
      
      // Store updated entries
      await this.storeMoodEntries(userId, updatedEntries);
      
      // Add to sync queue
      await this.addToSyncQueue({
        type: 'mood_entry',
        action: 'delete',
        data: { entryId },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to delete mood entry:', error);
      throw new Error('Mood entry deletion failed');
    }
  }
  
  // Daily window specific methods
  
  /**
   * Store daily window for a user
   * @param userId User ID
   * @param window Daily window to store
   */
  async storeDailyWindow(userId: string, window: DailyWindow): Promise<void> {
    const key = `${LocalStorageManager.DAILY_WINDOW_KEY}_${userId}`;
    await this.storeData(key, window, true);
    
    // Add to sync queue
    await this.addToSyncQueue({
      type: 'daily_window',
      action: 'update',
      data: window,
      timestamp: Date.now()
    });
  }
  
  /**
   * Retrieve daily window for a user
   * @param userId User ID
   * @returns The user's daily window
   */
  async retrieveDailyWindow(userId: string): Promise<DailyWindow | null> {
    const key = `${LocalStorageManager.DAILY_WINDOW_KEY}_${userId}`;
    return await this.retrieveData<DailyWindow>(key, true);
  }
  
  // Generated music specific methods
  
  /**
   * Store generated music
   * @param userId User ID
   * @param music Generated music to store
   */
  async storeGeneratedMusic(userId: string, music: GeneratedMusic): Promise<void> {
    const key = `${LocalStorageManager.GENERATED_MUSIC_KEY}_${userId}_${music.musicId}`;
    await this.storeData(key, music, true);
    
    // Add to sync queue
    await this.addToSyncQueue({
      type: 'generated_music',
      action: 'create',
      data: music,
      timestamp: Date.now()
    });
  }
  
  /**
   * Retrieve generated music
   * @param userId User ID
   * @param musicId Music ID
   * @returns The generated music
   */
  async retrieveGeneratedMusic(userId: string, musicId: string): Promise<GeneratedMusic | null> {
    const key = `${LocalStorageManager.GENERATED_MUSIC_KEY}_${userId}_${musicId}`;
    return await this.retrieveData<GeneratedMusic>(key, true);
  }
  
  /**
   * Retrieve all generated music for a user
   * @param userId User ID
   * @returns All generated music for the user
   */
  async retrieveAllGeneratedMusic(userId: string): Promise<GeneratedMusic[]> {
    try {
      // Note: SecureStore doesn't support getAllKeys(), so we need to maintain an index
      // For now, we'll return an empty array since we don't have a proper index
      // In a real implementation, we would maintain a separate index of music IDs
      console.warn('retrieveAllGeneratedMusic: Not fully implemented - SecureStore limitation');
      return [];
    } catch (error) {
      console.error('Failed to retrieve all generated music:', error);
      return [];
    }
  }
  
  // Sync queue methods
  
  /**
   * Add an item to the sync queue
   * @param item Item to add to the queue
   */
  private async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    try {
      // Generate a unique ID for the queue item
      const queueItem = {
        ...item,
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        retryCount: 0
      };
      
      // Get current queue
      const queue = await this.getSyncQueue();
      
      // Add item to queue
      queue.push(queueItem);
      
      // Store updated queue
      await this.storeSyncQueue(queue);
    } catch (error) {
      console.error('Failed to add item to sync queue:', error);
    }
  }
  
  /**
   * Get the current sync queue
   * @returns The sync queue
   */
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return await this.retrieveData<SyncQueueItem[]>(LocalStorageManager.SYNC_QUEUE_KEY, true) || [];
  }
  
  /**
   * Store the sync queue
   * @param queue Queue to store
   */
  private async storeSyncQueue(queue: SyncQueueItem[]): Promise<void> {
    await this.storeData(LocalStorageManager.SYNC_QUEUE_KEY, queue, true);
  }
  
  /**
   * Remove an item from the sync queue
   * @param itemId ID of the item to remove
   */
  async removeFromSyncQueue(itemId: string): Promise<void> {
    try {
      // Get current queue
      const queue = await this.getSyncQueue();
      
      // Remove item
      const updatedQueue = queue.filter(item => item.id !== itemId);
      
      // Store updated queue
      await this.storeSyncQueue(updatedQueue);
    } catch (error) {
      console.error('Failed to remove item from sync queue:', error);
    }
  }
  
  /**
   * Update an item in the sync queue
   * @param itemId ID of the item to update
   * @param updates Updates to apply
   */
  async updateSyncQueueItem(itemId: string, updates: Partial<SyncQueueItem>): Promise<void> {
    try {
      // Get current queue
      const queue = await this.getSyncQueue();
      
      // Update item
      const updatedQueue = queue.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      );
      
      // Store updated queue
      await this.storeSyncQueue(updatedQueue);
    } catch (error) {
      console.error('Failed to update sync queue item:', error);
    }
  }
  
  /**
   * Clear the entire sync queue
   */
  async clearSyncQueue(): Promise<void> {
    await this.storeSyncQueue([]);
  }
}

export default new LocalStorageManager();