import { DailyWindow, User } from '../types';
import UserPreferencesService from './UserPreferencesService';
import { generateTimeWindow } from '../utils/timeWindow';
import StorageService from './StorageService';

// Keys for secure storage
const DAILY_WINDOW_KEY = 'daily_window';

/**
 * Service for managing the daily time window
 */
class TimeWindowService {
  /**
   * Get the daily window for a user
   * @param userId The user's ID
   * @returns Promise resolving to the daily window or null if not set
   */
  async getDailyWindow(userId: string): Promise<DailyWindow | null> {
    try {
      const key = `${DAILY_WINDOW_KEY}_${userId}`;
      const windowData = await StorageService.getItem(key);
      
      if (!windowData) {
        return null;
      }
      
      return JSON.parse(windowData) as DailyWindow;
    } catch (error) {
      console.error('Get daily window error:', error);
      return null;
    }
  }
  
  /**
   * Save the daily window for a user
   * @param dailyWindow The daily window to save
   */
  async saveDailyWindow(dailyWindow: DailyWindow): Promise<void> {
    try {
      const key = `${DAILY_WINDOW_KEY}_${dailyWindow.userId}`;
      await StorageService.setItem(key, JSON.stringify(dailyWindow));
    } catch (error) {
      console.error('Save daily window error:', error);
      throw new Error('Failed to save daily window');
    }
  }
  
  /**
   * Generate a new daily window for a user
   * @param userId The user's ID
   * @returns Promise resolving to the new daily window
   */
  async generateDailyWindow(userId: string): Promise<DailyWindow> {
    try {
      // Get user preferences
      const preferences = await UserPreferencesService.getPreferences(userId);
      
      if (!preferences) {
        throw new Error('User preferences not found');
      }
      
      // Parse time range
      const { start, end } = preferences.preferredTimeRange;
      const [startHour] = start.split(':').map(Number);
      const [endHour] = end.split(':').map(Number);
      
      // Generate a random window within the preferred range
      const today = new Date();
      const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Generate the time window for today
      const { startTime, endTime } = generateTimeWindow(startHour, endHour);
      
      // Create the daily window object
      const dailyWindow: DailyWindow = {
        userId,
        date: dateString,
        windowStart: startTime,
        windowEnd: endTime,
        hasLogged: false,
        notificationSent: false
      };
      
      // Save the daily window
      await this.saveDailyWindow(dailyWindow);
      
      return dailyWindow;
    } catch (error) {
      console.error('Generate daily window error:', error);
      throw new Error('Failed to generate daily window');
    }
  }
  
  /**
   * Get or create the daily window for a user
   * @param userId The user's ID
   * @returns Promise resolving to the daily window
   */
  async getOrCreateDailyWindow(userId: string): Promise<DailyWindow> {
    // Try to get the existing daily window
    const existingWindow = await this.getDailyWindow(userId);
    
    // Check if we need to create a new window
    if (!existingWindow) {
      // No window exists, create a new one
      return this.generateDailyWindow(userId);
    }
    
    // Check if the window is for today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (existingWindow.date !== today) {
      // Window is for a previous day, create a new one
      return this.generateDailyWindow(userId);
    }
    
    // Return the existing window
    return existingWindow;
  }
  
  /**
   * Reset the daily window for a user
   * @param userId The user's ID
   * @returns Promise resolving to the new daily window
   */
  async resetDailyWindow(userId: string): Promise<DailyWindow> {
    // Generate a new daily window
    return this.generateDailyWindow(userId);
  }
  
  /**
   * Mark that the user has logged a mood for today
   * @param userId The user's ID
   */
  async markMoodLogged(userId: string): Promise<void> {
    try {
      // Get the daily window
      const dailyWindow = await this.getOrCreateDailyWindow(userId);
      
      // Update the hasLogged flag
      dailyWindow.hasLogged = true;
      
      // Save the updated window
      await this.saveDailyWindow(dailyWindow);
    } catch (error) {
      console.error('Mark mood logged error:', error);
      throw new Error('Failed to mark mood as logged');
    }
  }
  
  /**
   * Mark that a notification has been sent for today's window
   * @param userId The user's ID
   */
  async markNotificationSent(userId: string): Promise<void> {
    try {
      // Get the daily window
      const dailyWindow = await this.getOrCreateDailyWindow(userId);
      
      // Update the notificationSent flag
      dailyWindow.notificationSent = true;
      
      // Save the updated window
      await this.saveDailyWindow(dailyWindow);
    } catch (error) {
      console.error('Mark notification sent error:', error);
      throw new Error('Failed to mark notification as sent');
    }
  }
  
  /**
   * Check if the user has already logged a mood today
   * @param userId The user's ID
   * @returns Promise resolving to a boolean indicating if the user has logged a mood today
   */
  async hasLoggedToday(userId: string): Promise<boolean> {
    try {
      // Get the daily window
      const dailyWindow = await this.getDailyWindow(userId);
      
      // If no window exists or it's not for today, the user hasn't logged
      if (!dailyWindow) {
        return false;
      }
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (dailyWindow.date !== today) {
        return false;
      }
      
      // Return the hasLogged flag
      return dailyWindow.hasLogged;
    } catch (error) {
      console.error('Has logged today error:', error);
      return false;
    }
  }
}

export default new TimeWindowService();