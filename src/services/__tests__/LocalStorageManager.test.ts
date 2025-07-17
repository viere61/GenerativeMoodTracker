import LocalStorageManager from '../LocalStorageManager';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodEntry, User } from '../../types';

// Mock the SecureStore and AsyncStorage
jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockImplementation(() => Promise.resolve('mocked-hash')),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' }
}));

describe('LocalStorageManager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock SecureStore.getItemAsync for encryption key
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === 'encryption_key') {
        return Promise.resolve('test-encryption-key');
      }
      return Promise.resolve(null);
    });
    
    // Mock btoa and atob for base64 encoding/decoding
    global.btoa = jest.fn().mockImplementation((str) => Buffer.from(str).toString('base64'));
    global.atob = jest.fn().mockImplementation((str) => Buffer.from(str, 'base64').toString());
  });
  
  test('initialize should create encryption key if not exists', async () => {
    // Mock encryption key not existing
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    
    await LocalStorageManager.initialize();
    
    // Should have tried to get the key
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('encryption_key');
    
    // Should have set a new key
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'encryption_key',
      expect.any(String)
    );
  });
  
  test('initialize should not create encryption key if exists', async () => {
    // Mock encryption key existing
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('existing-key');
    
    await LocalStorageManager.initialize();
    
    // Should have tried to get the key
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('encryption_key');
    
    // Should not have set a new key
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
  
  test('storeData should encrypt and store sensitive data in SecureStore', async () => {
    const testData = { test: 'sensitive data' };
    const testKey = 'test-key';
    
    await LocalStorageManager.storeData(testKey, testData, true);
    
    // Should have encrypted and stored in SecureStore
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      testKey,
      expect.any(String) // encrypted data
    );
    
    // Should not have used AsyncStorage
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
  
  test('storeData should store non-sensitive data in AsyncStorage', async () => {
    const testData = { test: 'non-sensitive data' };
    const testKey = 'test-key';
    
    await LocalStorageManager.storeData(testKey, testData, false);
    
    // Should have stored in AsyncStorage
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      testKey,
      JSON.stringify(testData)
    );
    
    // Should not have used SecureStore
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
  
  test('retrieveData should decrypt and retrieve sensitive data from SecureStore', async () => {
    const testKey = 'test-key';
    const encryptedData = 'encrypted-data';
    const decryptedData = '{"test":"sensitive data"}';
    
    // Mock SecureStore.getItemAsync to return encrypted data
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === 'encryption_key') {
        return Promise.resolve('test-encryption-key');
      }
      if (key === testKey) {
        return Promise.resolve(encryptedData);
      }
      return Promise.resolve(null);
    });
    
    // Mock decrypt method
    jest.spyOn(LocalStorageManager as any, 'decrypt').mockResolvedValueOnce(decryptedData);
    
    const result = await LocalStorageManager.retrieveData(testKey, true);
    
    // Should have retrieved from SecureStore
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(testKey);
    
    // Should have decrypted
    expect((LocalStorageManager as any).decrypt).toHaveBeenCalledWith(encryptedData);
    
    // Should return parsed data
    expect(result).toEqual({ test: 'sensitive data' });
  });
  
  test('retrieveData should retrieve non-sensitive data from AsyncStorage', async () => {
    const testKey = 'test-key';
    const jsonData = '{"test":"non-sensitive data"}';
    
    // Mock AsyncStorage.getItem to return JSON data
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(jsonData);
    
    const result = await LocalStorageManager.retrieveData(testKey, false);
    
    // Should have retrieved from AsyncStorage
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(testKey);
    
    // Should not have used SecureStore
    expect(SecureStore.getItemAsync).not.toHaveBeenCalledWith(testKey);
    
    // Should return parsed data
    expect(result).toEqual({ test: 'non-sensitive data' });
  });
  
  test('storeMoodEntry should store entry and add to sync queue', async () => {
    const userId = 'test-user';
    const entry: MoodEntry = {
      entryId: 'test-entry',
      userId,
      timestamp: Date.now(),
      moodRating: 7,
      emotionTags: ['happy', 'relaxed'],
      reflection: 'Test reflection',
      musicGenerated: false
    };
    
    // Mock retrieveMoodEntries to return empty array
    jest.spyOn(LocalStorageManager, 'retrieveMoodEntries').mockResolvedValueOnce([]);
    
    // Mock storeMoodEntries
    jest.spyOn(LocalStorageManager, 'storeMoodEntries').mockResolvedValueOnce();
    
    // Mock addToSyncQueue
    jest.spyOn(LocalStorageManager as any, 'addToSyncQueue').mockResolvedValueOnce();
    
    await LocalStorageManager.storeMoodEntry(userId, entry);
    
    // Should have retrieved existing entries
    expect(LocalStorageManager.retrieveMoodEntries).toHaveBeenCalledWith(userId);
    
    // Should have stored updated entries
    expect(LocalStorageManager.storeMoodEntries).toHaveBeenCalledWith(userId, [entry]);
    
    // Should have added to sync queue
    expect((LocalStorageManager as any).addToSyncQueue).toHaveBeenCalledWith({
      type: 'mood_entry',
      action: 'create',
      data: entry,
      timestamp: expect.any(Number)
    });
  });
  
  test('getSyncQueue should retrieve the sync queue', async () => {
    const mockQueue = [
      {
        type: 'mood_entry',
        action: 'create',
        data: { id: 'test' },
        timestamp: Date.now(),
        id: 'queue-item-1',
        retryCount: 0
      }
    ];
    
    // Mock retrieveData to return queue
    jest.spyOn(LocalStorageManager, 'retrieveData').mockResolvedValueOnce(mockQueue);
    
    const result = await LocalStorageManager.getSyncQueue();
    
    // Should have retrieved data
    expect(LocalStorageManager.retrieveData).toHaveBeenCalledWith('sync_queue', true);
    
    // Should return queue
    expect(result).toEqual(mockQueue);
  });
  
  test('removeFromSyncQueue should remove item from queue', async () => {
    const itemId = 'queue-item-1';
    const mockQueue = [
      {
        type: 'mood_entry',
        action: 'create',
        data: { id: 'test' },
        timestamp: Date.now(),
        id: itemId,
        retryCount: 0
      },
      {
        type: 'mood_entry',
        action: 'update',
        data: { id: 'test2' },
        timestamp: Date.now(),
        id: 'queue-item-2',
        retryCount: 0
      }
    ];
    
    // Mock getSyncQueue to return queue
    jest.spyOn(LocalStorageManager, 'getSyncQueue').mockResolvedValueOnce(mockQueue);
    
    // Mock storeSyncQueue
    jest.spyOn(LocalStorageManager as any, 'storeSyncQueue').mockResolvedValueOnce();
    
    await LocalStorageManager.removeFromSyncQueue(itemId);
    
    // Should have retrieved queue
    expect(LocalStorageManager.getSyncQueue).toHaveBeenCalled();
    
    // Should have stored updated queue without the removed item
    expect((LocalStorageManager as any).storeSyncQueue).toHaveBeenCalledWith([mockQueue[1]]);
  });
  
  test('storeUserData should store user data and add to sync queue', async () => {
    const user: User = {
      userId: 'test-user',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      preferredTimeRange: {
        start: '09:00',
        end: '21:00'
      },
      createdAt: Date.now(),
      lastLogin: Date.now(),
      settings: {
        notifications: true,
        theme: 'light',
        audioQuality: 'high'
      },
      accountStatus: 'active'
    };
    
    // Mock storeData
    jest.spyOn(LocalStorageManager, 'storeData').mockResolvedValueOnce();
    
    // Mock addToSyncQueue
    jest.spyOn(LocalStorageManager as any, 'addToSyncQueue').mockResolvedValueOnce();
    
    await LocalStorageManager.storeUserData(user);
    
    // Should have stored user data
    expect(LocalStorageManager.storeData).toHaveBeenCalledWith(
      'user_data_test-user',
      user,
      true
    );
    
    // Should have added to sync queue
    expect((LocalStorageManager as any).addToSyncQueue).toHaveBeenCalledWith({
      type: 'user_preferences',
      action: 'update',
      data: {
        userId: user.userId,
        preferredTimeRange: user.preferredTimeRange,
        settings: user.settings
      },
      timestamp: expect.any(Number)
    });
  });
  
  test('updateUserData should update user data', async () => {
    const userId = 'test-user';
    const existingUser: User = {
      userId,
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      preferredTimeRange: {
        start: '09:00',
        end: '21:00'
      },
      createdAt: Date.now(),
      lastLogin: Date.now(),
      settings: {
        notifications: true,
        theme: 'light',
        audioQuality: 'high'
      },
      accountStatus: 'active'
    };
    
    const updates = {
      settings: {
        notifications: false,
        theme: 'dark',
        audioQuality: 'high'
      }
    };
    
    // Mock retrieveUserData
    jest.spyOn(LocalStorageManager, 'retrieveUserData').mockResolvedValueOnce(existingUser);
    
    // Mock storeUserData
    jest.spyOn(LocalStorageManager, 'storeUserData').mockResolvedValueOnce();
    
    await LocalStorageManager.updateUserData(userId, updates);
    
    // Should have retrieved user data
    expect(LocalStorageManager.retrieveUserData).toHaveBeenCalledWith(userId);
    
    // Should have stored updated user data
    expect(LocalStorageManager.storeUserData).toHaveBeenCalledWith({
      ...existingUser,
      ...updates
    });
  });
});