import { DailyWindow } from '../types';
import UserPreferencesService from './UserPreferencesService';
import { generateRandomWindow, isWithinWindow, formatTime, getTimeUntil } from '../utils/timeWindow';
import StorageService from './StorageService';

const DAILY_WINDOW_KEY = 'daily_window';

/**
 * Simple service for managing daily time windows
 */
class TimeWindowService {
  
  /**
   * Get the stored daily window for a user
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
      console.error('Error getting daily window:', error);
      return null;
    }
  }
  
  /**
   * Save a daily window for a user
   */
  async saveDailyWindow(dailyWindow: DailyWindow): Promise<void> {
    try {
      const key = `${DAILY_WINDOW_KEY}_${dailyWindow.userId}`;
      await StorageService.setItem(key, JSON.stringify(dailyWindow));
      console.log('Saved daily window:', {
        date: dailyWindow.date,
        windowStart: new Date(dailyWindow.windowStart).toLocaleString(),
        windowEnd: new Date(dailyWindow.windowEnd).toLocaleString()
      });
    } catch (error) {
      console.error('Error saving daily window:', error);
      throw new Error('Failed to save daily window');
    }
  }
  
  /**
   * Create a new random window for today or tomorrow
   */
  async createNewWindow(userId: string): Promise<DailyWindow> {
    try {
      // Get user preferences
      const preferences = await UserPreferencesService.getPreferences(userId);
      if (!preferences) {
        throw new Error('User preferences not found');
      }
      
      const { start, end } = preferences.preferredTimeRange;
      
      // Generate random window
      const { windowStart, windowEnd, date } = generateRandomWindow(start, end);
      
      // Create daily window object
      const dailyWindow: DailyWindow = {
        userId,
        date,
        windowStart,
        windowEnd,
        hasLogged: false,
        notificationSent: false
      };
      
      // Save it
      await this.saveDailyWindow(dailyWindow);
      
      return dailyWindow;
    } catch (error) {
      console.error('Error creating new window:', error);
      throw new Error('Failed to create new window');
    }
  }
  
  /**
   * Get current daily window (create if needed)
   */
  async getCurrentWindow(userId: string): Promise<DailyWindow> {
    const existingWindow = await this.getDailyWindow(userId);
    const today = new Date().toISOString().split('T')[0];
    
    // If no window exists or it's from a previous day, create a new one
    if (!existingWindow || existingWindow.date !== today) {
      console.log('Creating new window (no existing or outdated)');
      return await this.createNewWindow(userId);
    }
    
    return existingWindow;
  }
  
  /**
   * Reset the window (create a new random window)
   */
  async resetWindow(userId: string): Promise<DailyWindow> {
    console.log('Resetting window for user:', userId);
    return await this.createNewWindow(userId);
  }
  
  /**
   * Check if user can log mood right now
   */
  async canLogMood(userId: string): Promise<{
    canLog: boolean;
    message: string;
    window: DailyWindow;
  }> {
    try {
      const window = await this.getCurrentWindow(userId);
      
      // Check if already logged today
      if (window.hasLogged) {
        return {
          canLog: false,
          message: 'You have already logged your mood today.',
          window
        };
      }
      
      // Check if within window
      const withinWindow = isWithinWindow(window.windowStart, window.windowEnd);
      
      if (withinWindow) {
        return {
          canLog: true,
          message: `You can log your mood until ${formatTime(window.windowEnd)}.`,
          window
        };
      }
      
      // Not within window - determine message
      const now = Date.now();
      
      if (now < window.windowStart) {
        // Window hasn't started yet
        const { hours, minutes } = getTimeUntil(window.windowStart);
        return {
          canLog: false,
          message: `Your mood logging window starts in ${hours} hours and ${minutes} minutes at ${formatTime(window.windowStart)}.`,
          window
        };
      } else {
        // Window has passed
        return {
          canLog: false,
          message: 'Your mood logging window for today has passed. Your next window will be available tomorrow.',
          window
        };
      }
      
    } catch (error) {
      console.error('Error checking mood logging status:', error);
      // Return a safe fallback
      const fallbackWindow = await this.createNewWindow(userId);
      return {
        canLog: false,
        message: 'Error checking window status. Please try again.',
        window: fallbackWindow
      };
    }
  }
  
  /**
   * Mark that user has logged mood today
   */
  async markMoodLogged(userId: string): Promise<void> {
    try {
      const window = await this.getCurrentWindow(userId);
      window.hasLogged = true;
      await this.saveDailyWindow(window);
      console.log('Marked mood as logged for:', userId);
    } catch (error) {
      console.error('Error marking mood as logged:', error);
      throw new Error('Failed to mark mood as logged');
    }
  }
  
  /**
   * Mark that notification has been sent
   */
  async markNotificationSent(userId: string): Promise<void> {
    try {
      const window = await this.getCurrentWindow(userId);
      window.notificationSent = true;
      await this.saveDailyWindow(window);
      console.log('Marked notification as sent for:', userId);
    } catch (error) {
      console.error('Error marking notification as sent:', error);
      throw new Error('Failed to mark notification as sent');
    }
  }
  
  /**
   * Check if user has logged today
   */
  async hasLoggedToday(userId: string): Promise<boolean> {
    try {
      const window = await this.getDailyWindow(userId);
      const today = new Date().toISOString().split('T')[0];
      
      return window?.date === today && window?.hasLogged === true;
    } catch (error) {
      console.error('Error checking if logged today:', error);
      return false;
    }
  }
}

export default new TimeWindowService();