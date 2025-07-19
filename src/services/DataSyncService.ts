import { Platform } from 'react-native';
import LocalStorageManager from './LocalStorageManager';
import AuthService from './AuthService';

/**
 * Service for synchronizing data between local storage and server
 */
class DataSyncService {
  private isOnline: boolean = false;
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly API_BASE_URL = 'https://api.generativemoodtracker.com'; // Example API URL
  
  /**
   * Initialize the data sync service
   */
  async initialize(): Promise<void> {
    try {
      // Set up network connectivity listener
      this.setupNetworkListener();
      
      // Start periodic sync
      this.startPeriodicSync();
    } catch (error) {
      console.error('Failed to initialize DataSyncService:', error);
    }
  }
  
  /**
   * Set up network connectivity listener
   */
  private setupNetworkListener(): void {
    // For now, assume we're online
    // In a real app, you would implement proper network detection
    this.isOnline = true;
  }
  
  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    // Attempt to sync every 15 minutes
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncData();
      }
    }, 15 * 60 * 1000); // 15 minutes
  }
  
  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * Sync data with server
   */
  async syncData(): Promise<boolean> {
    // Prevent multiple sync operations at once
    if (this.isSyncing || !this.isOnline) {
      return false;
    }
    
    try {
      this.isSyncing = true;
      
      // Get the sync queue
      const queue = await LocalStorageManager.getSyncQueue();
      
      if (queue.length === 0) {
        this.isSyncing = false;
        return true; // Nothing to sync
      }
      
      // Get authentication token
      const authState = await AuthService.getAuthState();
      const authToken = authState.token;
      
      if (!authToken) {
        this.isSyncing = false;
        return false; // Not authenticated
      }
      
      // Process queue items in order
      for (const item of queue) {
        try {
          const success = await this.processSyncItem(item, authToken);
          
          if (success) {
            // Remove item from queue if successful
            await LocalStorageManager.removeFromSyncQueue(item.id!);
          } else {
            // Increment retry count
            await LocalStorageManager.updateSyncQueueItem(item.id!, {
              retryCount: (item.retryCount || 0) + 1
            });
            
            // If we've retried too many times, remove from queue
            if ((item.retryCount || 0) >= 5) {
              await LocalStorageManager.removeFromSyncQueue(item.id!);
              console.warn(`Removing sync item after too many retries: ${item.id}`);
            }
          }
        } catch (error) {
          console.error(`Error processing sync item ${item.id}:`, error);
          
          // Increment retry count
          await LocalStorageManager.updateSyncQueueItem(item.id!, {
            retryCount: (item.retryCount || 0) + 1
          });
        }
      }
      
      this.isSyncing = false;
      return true;
    } catch (error) {
      console.error('Error during data sync:', error);
      this.isSyncing = false;
      return false;
    }
  }
  
  /**
   * Process a single sync queue item
   * @param item The sync queue item to process
   * @param authToken Authentication token
   * @returns Whether the sync was successful
   */
  private async processSyncItem(item: any, authToken: string): Promise<boolean> {
    try {
      let endpoint = '';
      let method = 'POST';
      
      // Determine endpoint and method based on item type and action
      switch (item.type) {
        case 'mood_entry':
          endpoint = '/mood-entries';
          if (item.action === 'update') method = 'PUT';
          if (item.action === 'delete') method = 'DELETE';
          break;
        case 'daily_window':
          endpoint = '/daily-windows';
          method = 'PUT';
          break;
        case 'generated_music':
          endpoint = '/generated-music';
          if (item.action === 'update') method = 'PUT';
          if (item.action === 'delete') method = 'DELETE';
          break;
        case 'user_preferences':
          endpoint = '/user-preferences';
          method = 'PUT';
          break;
        default:
          console.warn(`Unknown sync item type: ${item.type}`);
          return false;
      }
      
      // Make API request
      const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: method !== 'DELETE' ? JSON.stringify(item.data) : undefined
      });
      
      // Check if request was successful
      if (response.ok) {
        return true;
      } else {
        console.error(`API error: ${response.status} ${response.statusText}`);
        
        // If unauthorized, try to refresh token
        if (response.status === 401) {
          const refreshed = await AuthService.refreshAuthToken();
          if (refreshed) {
            const newAuthState = await AuthService.getAuthState();
            return this.processSyncItem(item, newAuthState.token || '');
          }
          return false;
        }
        
        return false;
      }
    } catch (error) {
      console.error('Error processing sync item:', error);
      return false;
    }
  }
  
  /**
   * Force an immediate sync
   * @returns Whether the sync was successful
   */
  async forceSync(): Promise<boolean> {
    if (!this.isOnline) {
      console.warn('Cannot force sync while offline');
      return false;
    }
    
    return await this.syncData();
  }
  
  /**
   * Check if the device is currently online
   * @returns Whether the device is online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }
  
  /**
   * Check if a sync is currently in progress
   * @returns Whether a sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
  
  /**
   * Get the number of items in the sync queue
   * @returns The number of items in the sync queue
   */
  async getSyncQueueSize(): Promise<number> {
    const queue = await LocalStorageManager.getSyncQueue();
    return queue.length;
  }
}

export default new DataSyncService();