import { DailyWindow, User } from '../types';
import UserPreferencesService from './UserPreferencesService';
import { generateTimeWindow } from '../utils/timeWindow';
import StorageService from './StorageService';
import { getLocalMidnight } from '../utils/dateUtils';

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
      const today = getLocalMidnight();
      const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      console.log('Generating daily window for date:', {
        today: today.toString(),
        todayISO: today.toISOString(),
        dateString
      });
      
      // Generate the time window for today
      const { startTime, endTime } = generateTimeWindow(startHour, endHour, today);
      
      // Create the daily window object
      const dailyWindow: DailyWindow = {
        userId,
        date: dateString,
        windowStart: startTime,
        windowEnd: endTime,
        hasLogged: false,
        notificationSent: false
      };
      
      // Debug the created window
      console.log('Created daily window:', {
        date: dateString,
        windowStart: new Date(startTime).toLocaleString(),
        windowEnd: new Date(endTime).toLocaleString(),
        currentTime: new Date().toLocaleString(),
        isCurrentlyInWindow: startTime <= Date.now() && Date.now() <= endTime
      });
      
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
   * Generate a future time window for today if possible
   * @param userId The user's ID
   * @param preferredStartHour The preferred start hour (0-23)
   * @param preferredEndHour The preferred end hour (0-23)
   * @returns Promise resolving to a new daily window or null if not possible today
   */
  async generateFutureWindowForToday(
    userId: string,
    preferredStartHour: number,
    preferredEndHour: number
  ): Promise<DailyWindow | null> {
    try {
      // Get current hour
      const now = new Date();
      const currentHour = now.getHours();
      
      // Check if there's at least 1 hour left in the preferred range today
      if (preferredEndHour <= currentHour + 1) {
        console.log('No time left in preferred range today');
        return null;
      }
      
      // Calculate available hours left today
      const availableStartHour = Math.max(preferredStartHour, currentHour + 1);
      
      console.log('Generating future window for today:', {
        currentHour,
        preferredStartHour,
        preferredEndHour,
        availableStartHour
      });
      
      // Generate a window within the remaining hours today
      const today = getLocalMidnight();
      const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Calculate the range of available hours
      const availableHours = preferredEndHour - availableStartHour;
      
      let windowStartHour, windowEndHour;
      
      // If there's more than 1 hour available, generate a random window
      if (availableHours > 1) {
        // Generate a random hour within the available range
        const randomOffset = Math.floor(Math.random() * (availableHours - 1));
        windowStartHour = availableStartHour + randomOffset;
        windowEndHour = windowStartHour + 1;
        
        console.log('Generated random window within range:', {
          availableStartHour,
          preferredEndHour,
          availableHours,
          randomOffset,
          windowStartHour,
          windowEndHour
        });
      } else {
        // If only 1 hour available, use that
        windowStartHour = availableStartHour;
        windowEndHour = Math.min(windowStartHour + 1, preferredEndHour);
      }
      
      // Create Date objects for the start and end times
      const start = new Date();
      start.setHours(windowStartHour, 0, 0, 0);
      
      const end = new Date();
      end.setHours(windowEndHour, 0, 0, 0);
      
      console.log('Final window times:', {
        windowStartHour,
        windowEndHour,
        start: start.toLocaleString(),
        end: end.toLocaleString()
      });
      
      console.log('Created future window for today:', {
        windowStartHour,
        windowEndHour,
        start: start.toLocaleString(),
        end: end.toLocaleString()
      });
      
      // Create the daily window object
      const dailyWindow: DailyWindow = {
        userId,
        date: dateString,
        windowStart: start.getTime(),
        windowEnd: end.getTime(),
        hasLogged: false,
        notificationSent: false
      };
      
      // Save the daily window
      await this.saveDailyWindow(dailyWindow);
      
      return dailyWindow;
    } catch (error) {
      console.error('Generate future window error:', error);
      return null;
    }
  }
  
  /**
   * Reset the daily window for a user
   * @param userId The user's ID
   * @returns Promise resolving to the new daily window
   */
  async resetDailyWindow(userId: string): Promise<DailyWindow> {
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
      
      // Try to generate a future window for today first
      const todayWindow = await this.generateFutureWindowForToday(userId, startHour, endHour);
      if (todayWindow) {
        console.log('Successfully generated a new window for today');
        return todayWindow;
      }
      
      // If not possible today, generate for tomorrow
      console.log('Generating window for tomorrow instead');
      return this.generateDailyWindow(userId);
    } catch (error) {
      console.error('Reset daily window error:', error);
      // Fall back to regular generation
      return this.generateDailyWindow(userId);
    }
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