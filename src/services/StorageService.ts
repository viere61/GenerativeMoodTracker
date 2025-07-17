import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Cross-platform storage service that works on both web and native
 */
class StorageService {
  /**
   * Get item from storage
   * @param key The storage key
   * @returns Promise resolving to the stored value or null
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        return localStorage.getItem(key);
      } else {
        // Use SecureStore for native
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  /**
   * Set item in storage
   * @param key The storage key
   * @param value The value to store
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        localStorage.setItem(key, value);
      } else {
        // Use SecureStore for native
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw new Error('Failed to save to storage');
    }
  }

  /**
   * Remove item from storage
   * @param key The storage key
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        localStorage.removeItem(key);
      } else {
        // Use SecureStore for native
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
      throw new Error('Failed to remove from storage');
    }
  }
}

export default new StorageService(); 