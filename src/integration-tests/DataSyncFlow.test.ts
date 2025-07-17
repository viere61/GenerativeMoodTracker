import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DataSyncService from '../services/DataSyncService';
import LocalStorageManager from '../services/LocalStorageManager';
import AuthService from '../services/AuthService';
import { Platform, NetInfo } from 'react-native';

// Mock dependencies
vi.mock('../services/LocalStorageManager');
vi.mock('../services/AuthService');
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  },
  NetInfo: {
    fetch: vi.fn(),
    addEventListener: vi.fn()
  }
}));

// Mock fetch
global.fetch = vi.fn();

describe('Data Synchronization Flow Integration', () => {
  const mockUserId = 'test-user-123';
  const mockAuthToken = 'test-auth-token';
  
  // Mock sync queue items
  const mockSyncQueue = [
    {
      id: 'sync-item-1',
      type: 'mood_entry',
      action: 'create',
      data: {
        entryId: 'entry-1',
        userId: mockUserId,
        timestamp: Date.now(),
        moodRating: 7,
        emotionTags: ['happy', 'relaxed'],
        reflection: 'Test reflection',
        musicGenerated: false
      },
      timestamp: Date.now(),
      retryCount: 0
    },
    {
      id: 'sync-item-2',
      type: 'user_preferences',
      action: 'update',
      data: {
        userId: mockUserId,
        preferredTimeRange: {
          start: '09:00',
          end: '21:00'
        },
        settings: {
          notifications: true,
          theme: 'dark'
        }
      },
      timestamp: Date.now(),
      retryCount: 0
    }
  ];
  
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock NetInfo.fetch to return online
    vi.mocked(NetInfo.fetch).mockResolvedValue({ isConnected: true } as any);
    
    // Mock AuthService
    vi.mocked(AuthService.getAuthToken).mockResolvedValue(mockAuthToken);
    vi.mocked(AuthService.refreshToken).mockResolvedValue(true);
    
    // Mock LocalStorageManager
    vi.mocked(LocalStorageManager.getSyncQueue).mockResolvedValue(mockSyncQueue);
    vi.mocked(LocalStorageManager.removeFromSyncQueue).mockResolvedValue();
    vi.mocked(LocalStorageManager.updateSyncQueueItem).mockResolvedValue();
    
    // Mock fetch to return success
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as any);
    
    // Set DataSyncService as online
    Object.defineProperty(DataSyncService, 'isOnline', { value: true, writable: true });
  });
  
  describe('Data synchronization process', () => {
    it('should successfully sync data when online', async () => {
      // Initialize the service
      await DataSyncService.initialize();
      
      // Verify network listener was set up
      expect(NetInfo.fetch).toHaveBeenCalled();
      expect(NetInfo.addEventListener).toHaveBeenCalled();
      
      // Sync data
      const result = await DataSyncService.syncData();
      
      // Verify sync was successful
      expect(result).toBe(true);
      
      // Verify sync queue was processed
      expect(LocalStorageManager.getSyncQueue).toHaveBeenCalled();
      
      // Verify auth token was retrieved
      expect(AuthService.getAuthToken).toHaveBeenCalled();
      
      // Verify API calls were made for each queue item
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // Verify items were removed from queue after successful sync
      expect(LocalStorageManager.removeFromSyncQueue).toHaveBeenCalledTimes(2);
      expect(LocalStorageManager.removeFromSyncQueue).toHaveBeenCalledWith('sync-item-1');
      expect(LocalStorageManager.removeFromSyncQueue).toHaveBeenCalledWith('sync-item-2');
    });
    
    it('should handle API errors and retry', async () => {
      // Mock fetch to return error for first item, success for second
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as any);
      
      // Sync data
      const result = await DataSyncService.syncData();
      
      // Verify sync was successful overall
      expect(result).toBe(true);
      
      // Verify first item was updated with retry count
      expect(LocalStorageManager.updateSyncQueueItem).toHaveBeenCalledWith('sync-item-1', {
        retryCount: 1
      });
      
      // Verify second item was removed from queue
      expect(LocalStorageManager.removeFromSyncQueue).toHaveBeenCalledWith('sync-item-2');
    });
    
    it('should handle authentication errors and refresh token', async () => {
      // Mock fetch to return unauthorized for first call, then success
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized'
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as any);
      
      // Sync data
      const result = await DataSyncService.syncData();
      
      // Verify sync was successful
      expect(result).toBe(true);
      
      // Verify token was refreshed
      expect(AuthService.refreshToken).toHaveBeenCalled();
      
      // Verify API calls were retried after token refresh
      expect(global.fetch).toHaveBeenCalledTimes(3); // 1 failed + 2 successful
      
      // Verify items were removed from queue
      expect(LocalStorageManager.removeFromSyncQueue).toHaveBeenCalledTimes(2);
    });
    
    it('should not sync when offline', async () => {
      // Set DataSyncService as offline
      Object.defineProperty(DataSyncService, 'isOnline', { value: false, writable: true });
      
      // Attempt to force sync
      const result = await DataSyncService.forceSync();
      
      // Verify sync was not attempted
      expect(result).toBe(false);
      expect(LocalStorageManager.getSyncQueue).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    it('should remove items after too many retries', async () => {
      // Mock sync queue with an item that has reached max retries
      const queueWithMaxRetries = [
        {
          id: 'sync-item-max-retries',
          type: 'mood_entry',
          action: 'create',
          data: { entryId: 'entry-max-retries' },
          timestamp: Date.now(),
          retryCount: 5 // Max retries
        }
      ];
      
      vi.mocked(LocalStorageManager.getSyncQueue).mockResolvedValueOnce(queueWithMaxRetries);
      
      // Mock fetch to return error
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any);
      
      // Sync data
      await DataSyncService.syncData();
      
      // Verify item was removed after too many retries
      expect(LocalStorageManager.removeFromSyncQueue).toHaveBeenCalledWith('sync-item-max-retries');
    });
  });
  
  describe('Queue management', () => {
    it('should return the correct queue size', async () => {
      const queueSize = await DataSyncService.getSyncQueueSize();
      
      // Verify queue size matches mock data
      expect(queueSize).toBe(2);
      expect(LocalStorageManager.getSyncQueue).toHaveBeenCalled();
    });
  });
});