import DataSyncService from '../DataSyncService';
import LocalStorageManager from '../LocalStorageManager';
import AuthService from '../AuthService';
import { Platform, NetInfo } from 'react-native';

// Mock dependencies
jest.mock('../LocalStorageManager');
jest.mock('../AuthService');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  },
  NetInfo: {
    fetch: jest.fn(),
    addEventListener: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('DataSyncService', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock NetInfo.fetch to return online
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    
    // Mock AuthService.getAuthToken to return a token
    (AuthService.getAuthToken as jest.Mock).mockResolvedValue('test-auth-token');
    
    // Mock fetch to return success
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    });
  });
  
  describe('initialize', () => {
    it('should set up network listener and start periodic sync', async () => {
      await DataSyncService.initialize();
      
      expect(NetInfo.fetch).toHaveBeenCalled();
      expect(NetInfo.addEventListener).toHaveBeenCalled();
    });
  });
  
  describe('syncData', () => {
    it('should process sync queue items', async () => {
      const mockQueue = [
        {
          id: 'item1',
          type: 'mood_entry',
          action: 'create',
          data: { id: 'entry1' },
          timestamp: Date.now(),
          retryCount: 0
        },
        {
          id: 'item2',
          type: 'daily_window',
          action: 'update',
          data: { id: 'window1' },
          timestamp: Date.now(),
          retryCount: 0
        }
      ];
      
      // Mock getSyncQueue to return queue
      (LocalStorageManager.getSyncQueue as jest.Mock).mockResolvedValue(mockQueue);
      
      // Mock removeFromSyncQueue
      (LocalStorageManager.removeFromSyncQueue as jest.Mock).mockResolvedValue(undefined);
      
      const result = await DataSyncService.syncData();
      
      expect(result).toBe(true);
      expect(LocalStorageManager.getSyncQueue).toHaveBeenCalled();
      expect(AuthService.getAuthToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(LocalStorageManager.removeFromSyncQueue).toHaveBeenCalledTimes(2);
    });
    
    it('should handle empty queue', async () => {
      // Mock getSyncQueue to return empty queue
      (LocalStorageManager.getSyncQueue as jest.Mock).mockResolvedValue([]);
      
      const result = await DataSyncService.syncData();
      
      expect(result).toBe(true);
      expect(LocalStorageManager.getSyncQueue).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    it('should handle authentication failure', async () => {
      // Mock getAuthToken to return null
      (AuthService.getAuthToken as jest.Mock).mockResolvedValue(null);
      
      const result = await DataSyncService.syncData();
      
      expect(result).toBe(false);
      expect(AuthService.getAuthToken).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    it('should handle API errors', async () => {
      const mockQueue = [
        {
          id: 'item1',
          type: 'mood_entry',
          action: 'create',
          data: { id: 'entry1' },
          timestamp: Date.now(),
          retryCount: 0
        }
      ];
      
      // Mock getSyncQueue to return queue
      (LocalStorageManager.getSyncQueue as jest.Mock).mockResolvedValue(mockQueue);
      
      // Mock fetch to return error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      
      // Mock updateSyncQueueItem
      (LocalStorageManager.updateSyncQueueItem as jest.Mock).mockResolvedValue(undefined);
      
      const result = await DataSyncService.syncData();
      
      expect(result).toBe(true); // Overall sync process completes
      expect(LocalStorageManager.updateSyncQueueItem).toHaveBeenCalledWith('item1', {
        retryCount: 1
      });
    });
    
    it('should handle unauthorized errors and try to refresh token', async () => {
      const mockQueue = [
        {
          id: 'item1',
          type: 'mood_entry',
          action: 'create',
          data: { id: 'entry1' },
          timestamp: Date.now(),
          retryCount: 0
        }
      ];
      
      // Mock getSyncQueue to return queue
      (LocalStorageManager.getSyncQueue as jest.Mock).mockResolvedValue(mockQueue);
      
      // Mock fetch to return unauthorized first, then success
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        });
      
      // Mock refreshToken to succeed
      (AuthService.refreshToken as jest.Mock).mockResolvedValue(true);
      
      // Mock getAuthToken to return new token
      (AuthService.getAuthToken as jest.Mock)
        .mockResolvedValueOnce('old-token')
        .mockResolvedValueOnce('new-token');
      
      const result = await DataSyncService.syncData();
      
      expect(result).toBe(true);
      expect(AuthService.refreshToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(LocalStorageManager.removeFromSyncQueue).toHaveBeenCalledWith('item1');
    });
    
    it('should remove items after too many retries', async () => {
      const mockQueue = [
        {
          id: 'item1',
          type: 'mood_entry',
          action: 'create',
          data: { id: 'entry1' },
          timestamp: Date.now(),
          retryCount: 5 // Max retries
        }
      ];
      
      // Mock getSyncQueue to return queue
      (LocalStorageManager.getSyncQueue as jest.Mock).mockResolvedValue(mockQueue);
      
      // Mock fetch to return error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      
      await DataSyncService.syncData();
      
      // Should remove item after too many retries
      expect(LocalStorageManager.removeFromSyncQueue).toHaveBeenCalledWith('item1');
    });
  });
  
  describe('forceSync', () => {
    it('should force a sync when online', async () => {
      // Set up DataSyncService as online
      Object.defineProperty(DataSyncService, 'isOnline', { value: true });
      
      // Mock syncData to return true
      jest.spyOn(DataSyncService, 'syncData').mockResolvedValueOnce(true);
      
      const result = await DataSyncService.forceSync();
      
      expect(result).toBe(true);
      expect(DataSyncService.syncData).toHaveBeenCalled();
    });
    
    it('should not force a sync when offline', async () => {
      // Set up DataSyncService as offline
      Object.defineProperty(DataSyncService, 'isOnline', { value: false });
      
      // Mock syncData
      jest.spyOn(DataSyncService, 'syncData').mockResolvedValueOnce(true);
      
      const result = await DataSyncService.forceSync();
      
      expect(result).toBe(false);
      expect(DataSyncService.syncData).not.toHaveBeenCalled();
    });
  });
  
  describe('getSyncQueueSize', () => {
    it('should return the number of items in the sync queue', async () => {
      const mockQueue = [
        { id: 'item1' },
        { id: 'item2' },
        { id: 'item3' }
      ];
      
      // Mock getSyncQueue to return queue
      (LocalStorageManager.getSyncQueue as jest.Mock).mockResolvedValue(mockQueue);
      
      const result = await DataSyncService.getSyncQueueSize();
      
      expect(result).toBe(3);
      expect(LocalStorageManager.getSyncQueue).toHaveBeenCalled();
    });
  });
});