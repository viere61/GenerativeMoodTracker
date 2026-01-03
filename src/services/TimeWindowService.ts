import { DailyWindow } from '../types';
import UserPreferencesService from './UserPreferencesService';
import { generateRandomWindow, generateRandomWindowForDate, isWithinWindow, formatTime, getTimeUntil } from '../utils/timeWindow';
import StorageService from './StorageService';
import MoodEntryService from './MoodEntryService';

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
      // Get user preferences; initialize defaults if missing (fresh install)
      let preferences = await UserPreferencesService.getPreferences(userId);
      if (!preferences) {
        console.log('🛠️ [TimeWindowService] Preferences not found. Initializing defaults...');
        preferences = await UserPreferencesService.initializePreferences(userId);
      }
      
      const { start, end } = preferences.preferredTimeRange;
      
      // Generate random window
      const { windowStart, windowEnd, date } = generateRandomWindow(start, end);
      
      // Check if this is today's window and if user has already logged
      const today = new Date().toISOString().split('T')[0];
      const hasLogged = date === today && await MoodEntryService.hasLoggedMoodToday(userId);
      
      // Create daily window object
      const dailyWindow: DailyWindow = {
        userId,
        date,
        windowStart,
        windowEnd,
        hasLogged,
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
    const today = new Date().toISOString().split('T')[0];
    
    // First check the generic daily window key
    let existingWindow = await this.getDailyWindow(userId);
    
    // If not found or outdated, check the date-specific key for today
    if (!existingWindow || existingWindow.date !== today) {
      console.log('Checking date-specific key for today\'s window...');
      existingWindow = await this.getDailyWindowForDate(userId, today);
    }
    
    // If still no window exists or it's from a previous day, create a new one
    if (!existingWindow || existingWindow.date !== today) {
      console.log('Creating new window (no existing or outdated)');
      return await this.createNewWindow(userId);
    }
    
    console.log('Found existing window for today:', {
      date: existingWindow.date,
      windowStart: new Date(existingWindow.windowStart).toLocaleString(),
      windowEnd: new Date(existingWindow.windowEnd).toLocaleString()
    });
    
    return existingWindow;
  }
  
  /**
   * Reset the window (create a new random window)
   */
  async resetWindow(userId: string): Promise<DailyWindow> {
    console.log('Resetting window for user:', userId);
    
    // Clear all future date-specific windows first to ensure fresh generation
    await this.clearAllFutureDateSpecificWindows(userId);
    
    // Create new window using the main function
    const newWindow = await this.createNewWindow(userId);
    
    // Also save it using the date-specific key to ensure consistency
    // This ensures multi-day functions can find the reset window
    await this.saveDailyWindowForDate(newWindow, newWindow.date);
    
    console.log('✅ Reset window saved with both key formats for consistency');
    
    return newWindow;
  }

  /**
   * Clear all future date-specific windows to force fresh generation
   */
  private async clearAllFutureDateSpecificWindows(userId: string): Promise<void> {
    try {
      console.log('🧹 [clearAllFutureDateSpecificWindows] Clearing all future date-specific windows...');
      
      // Clear windows for the next 30 days to be thorough
      const today = new Date();
      let clearedCount = 0;
      
      for (let i = 0; i <= 30; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dateString = targetDate.toISOString().split('T')[0];
        
        // Check if window exists for this date
        const existingWindow = await this.getDailyWindowForDate(userId, dateString);
        if (existingWindow) {
          await this.deleteDailyWindowForDate(userId, dateString);
          clearedCount++;
          console.log(`🧹 [clearAllFutureDateSpecificWindows] Cleared window for ${dateString}: ${new Date(existingWindow.windowStart).toLocaleString()}`);
        }
      }
      
      console.log(`🧹 [clearAllFutureDateSpecificWindows] Cleared ${clearedCount} date-specific windows`);
    } catch (error) {
      console.error('❌ [clearAllFutureDateSpecificWindows] Error clearing future windows:', error);
      // Don't throw - this is cleanup, shouldn't fail the reset
    }
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
      const prefs = await UserPreferencesService.getPreferences(userId);
      const hour12 = (prefs?.timeFormat ?? '12h') === '12h';
      
      // Check if already logged today - verify against MoodEntryService for accuracy
      // This ensures accuracy even if windows are regenerated after preferences change
      const today = new Date().toISOString().split('T')[0];
      const hasLoggedToday = window.date === today && await MoodEntryService.hasLoggedMoodToday(userId);
      
      // Update window's hasLogged flag if it's out of sync
      if (hasLoggedToday && !window.hasLogged) {
        window.hasLogged = true;
        await this.saveDailyWindow(window);
      }
      
      if (window.hasLogged || hasLoggedToday) {
        return {
          canLog: false,
          message: 'You have already logged your mood today.',
          window: { ...window, hasLogged: true }
        };
      }
      
      // Check if within window
      const withinWindow = isWithinWindow(window.windowStart, window.windowEnd);
      
      if (withinWindow) {
        return {
          canLog: true,
          message: `You can log your mood until ${formatTime(window.windowEnd, hour12)}.`,
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
          message: `Your mood logging window starts in ${hours} hours and ${minutes} minutes at ${formatTime(window.windowStart, hour12)}.`,
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

  /**
   * Get daily window for a specific date
   */
  async getDailyWindowForDate(userId: string, date: string): Promise<DailyWindow | null> {
    try {
      const key = `${DAILY_WINDOW_KEY}_${userId}_${date}`;
      const windowData = await StorageService.getItem(key);
      
      if (!windowData) {
        return null;
      }
      
      return JSON.parse(windowData) as DailyWindow;
    } catch (error) {
      console.error('Error getting daily window for date:', error);
      return null;
    }
  }

  /**
   * Save daily window for a specific date
   */
  async saveDailyWindowForDate(dailyWindow: DailyWindow, date: string): Promise<void> {
    try {
      const key = `${DAILY_WINDOW_KEY}_${dailyWindow.userId}_${date}`;
      await StorageService.setItem(key, JSON.stringify(dailyWindow));
      console.log('Saved daily window for date:', {
        date: date,
        windowStart: new Date(dailyWindow.windowStart).toLocaleString(),
        windowEnd: new Date(dailyWindow.windowEnd).toLocaleString()
      });
    } catch (error) {
      console.error('Error saving daily window for date:', error);
      throw new Error('Failed to save daily window for date');
    }
  }

  /**
   * Create windows for multiple days ahead and schedule notifications
   */
  async createMultiDayWindows(userId: string, daysAhead: number = 7): Promise<DailyWindow[]> {
    try {
      // Get user preferences; initialize defaults if missing
      let preferences = await UserPreferencesService.getPreferences(userId);
      if (!preferences) {
        console.log('🛠️ [TimeWindowService] Preferences not found for multi-day windows. Initializing defaults...');
        preferences = await UserPreferencesService.initializePreferences(userId);
      }

      const { start, end } = preferences.preferredTimeRange;
      const windows: DailyWindow[] = [];
      
      console.log('🗓️ Creating multi-day windows for', daysAhead, 'days ahead');

      for (let i = 0; i < daysAhead; i++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + i);
        const dateString = targetDate.toISOString().split('T')[0];
        
                 // Check if window already exists for this date
         let existingWindow = await this.getDailyWindowForDate(userId, dateString);
         
         // For today, also check the main daily window key in case it was just reset
         if (!existingWindow && i === 0) {
           const todayWindow = await this.getDailyWindow(userId);
           if (todayWindow && todayWindow.date === dateString) {
             existingWindow = todayWindow;
             // Save it with the date-specific key for consistency
             await this.saveDailyWindowForDate(todayWindow, dateString);
             console.log('📅 Found today\'s reset window, saving with date-specific key');
           }
         }
         
         if (existingWindow) {
           // Check if existing window matches current preferences
           const windowMatchesPreferences = this.isWindowWithinTimeRange(existingWindow.windowStart, start, end);
           
           console.log('📅 Window already exists for', dateString, ':', {
             windowStart: new Date(existingWindow.windowStart).toLocaleString(),
             windowEnd: new Date(existingWindow.windowEnd).toLocaleString(),
             matchesCurrentTimeRange: windowMatchesPreferences,
             currentTimeRange: `${start} - ${end}`
           });

           if (windowMatchesPreferences) {
             // Window matches current preferences, keep it
             windows.push(existingWindow);
             continue;
           } else {
             // Window doesn't match current preferences, delete and regenerate
             console.log('🔄 Window doesn\'t match current time range, regenerating...');
             await this.deleteDailyWindowForDate(userId, dateString);
             // Continue to regenerate below
           }
         }

                 // Generate random window for this specific date
         const { windowStart, windowEnd } = generateRandomWindowForDate(start, end, targetDate);
        
        // Check if user has logged today (for today's window only)
        let hasLogged = false;
        if (i === 0) {
          // Today's window - check if user has already logged
          hasLogged = await MoodEntryService.hasLoggedMoodToday(userId);
        }
        
        // Create daily window object
        const dailyWindow: DailyWindow = {
          userId,
          date: dateString,
          windowStart,
          windowEnd,
          hasLogged,
          notificationSent: false
        };

        // Save window for this specific date
        await this.saveDailyWindowForDate(dailyWindow, dateString);
        windows.push(dailyWindow);
        
        console.log('📅 Created window for', dateString, ':', {
          windowStart: new Date(windowStart).toLocaleString(),
          windowEnd: new Date(windowEnd).toLocaleString()
        });
        
        // Verify it was saved correctly
        const savedWindow = await this.getDailyWindowForDate(userId, dateString);
        console.log('📅 Verification - saved window for', dateString, ':', savedWindow ? {
          windowStart: new Date(savedWindow.windowStart).toLocaleString(),
          windowEnd: new Date(savedWindow.windowEnd).toLocaleString()
        } : 'FAILED TO SAVE');
      }

      return windows;
    } catch (error) {
      console.error('Error creating multi-day windows:', error);
      throw new Error('Failed to create multi-day windows');
    }
  }

  /**
   * Get the next window after today (for when user has already logged today)
   */
  async getNextWindowAfterToday(userId: string): Promise<DailyWindow | null> {
    try {
      console.log('🔍 [getNextWindowAfterToday] Looking for tomorrow\'s window or later...');

      // Look for the next available window starting from tomorrow (extend to 30 days)
      for (let i = 1; i <= 30; i++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + i);
        const dateString = targetDate.toISOString().split('T')[0];
        
        const window = await this.getDailyWindowForDate(userId, dateString);
        console.log(`🔍 [getNextWindowAfterToday] ${dateString} window:`, window ? {
          windowStart: new Date(window.windowStart).toLocaleString(),
          windowEnd: new Date(window.windowEnd).toLocaleString(),
          hasLogged: window.hasLogged
        } : 'none');
        
        if (window && !window.hasLogged) {
          console.log(`🔍 [getNextWindowAfterToday] ✅ Returning ${dateString} window`);
          return window;
        }
      }

      console.log('🔍 [getNextWindowAfterToday] ❌ No available windows found');
      return null;
    } catch (error) {
      console.error('Error getting next window after today:', error);
      return null;
    }
  }

  /**
   * Get the next available window (today if not logged, otherwise tomorrow or later)
   */
  async getNextAvailableWindow(userId: string): Promise<DailyWindow | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = Date.now();

      console.log('🔍 [getNextAvailableWindow] Looking for next available window...');

      // Check if today's window is still available (not logged AND window is still open)
      const todayWindow = await this.getDailyWindowForDate(userId, today);
      console.log('🔍 [getNextAvailableWindow] Today\'s window:', todayWindow ? {
        date: todayWindow.date,
        windowStart: new Date(todayWindow.windowStart).toLocaleString(),
        windowEnd: new Date(todayWindow.windowEnd).toLocaleString(),
        hasLogged: todayWindow.hasLogged,
        isStillOpen: now <= todayWindow.windowEnd
      } : 'none');
      
      // Only return today's window if user hasn't logged AND the window is still open
      if (todayWindow && !todayWindow.hasLogged && now <= todayWindow.windowEnd) {
        console.log('🔍 [getNextAvailableWindow] ✅ Returning today\'s window');
        return todayWindow;
      }

      // Look for the next available window in the next 30 days
      for (let i = 1; i <= 30; i++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + i);
        const dateString = targetDate.toISOString().split('T')[0];
        
        const window = await this.getDailyWindowForDate(userId, dateString);
        console.log(`🔍 [getNextAvailableWindow] ${dateString} window:`, window ? {
          windowStart: new Date(window.windowStart).toLocaleString(),
          windowEnd: new Date(window.windowEnd).toLocaleString(),
          hasLogged: window.hasLogged
        } : 'none');
        
        if (window && !window.hasLogged) {
          console.log(`🔍 [getNextAvailableWindow] ✅ Returning ${dateString} window`);
          return window;
        }
      }

      console.log('🔍 [getNextAvailableWindow] ❌ No available windows found');
      return null;
    } catch (error) {
      console.error('Error getting next available window:', error);
      return null;
    }
  }

    /**
   * Check if a window time falls within the specified time range
   */
  private isWindowWithinTimeRange(windowStart: number, preferredStart: string, preferredEnd: string): boolean {
    const windowDate = new Date(windowStart);
    const windowHour = windowDate.getHours();
    const windowMinute = windowDate.getMinutes();
    const windowTotalMinutes = windowHour * 60 + windowMinute;
    
    const [startHour, startMinute] = preferredStart.split(':').map(Number);
    const [endHour, endMinute] = preferredEnd.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    // Window should start within the preferred range (with some tolerance for the 2-hour window)
    // If preference is exactly 2 hours, window should match exactly
    const rangeMinutes = endTotalMinutes - startTotalMinutes;
    if (rangeMinutes === 120) {
      // Exact match: window start must equal preferred start
      return windowTotalMinutes === startTotalMinutes;
    }
    // For larger ranges, window should start within range (accounting for 2-hour window)
    return windowTotalMinutes >= startTotalMinutes && windowTotalMinutes <= (endTotalMinutes - 120);
  }

  /**
   * Delete a daily window for a specific date
   */
  async deleteDailyWindowForDate(userId: string, date: string): Promise<void> {
    try {
      const key = `${DAILY_WINDOW_KEY}_${userId}_${date}`;
      await StorageService.removeItem(key);
      console.log('🗑️ Deleted daily window for date:', date);
    } catch (error) {
      console.error('Error deleting daily window for date:', error);
    }
  }

  /**
   * Ensure tomorrow's window exists
   */
  async ensureTomorrowWindowExists(userId: string): Promise<DailyWindow | null> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDateString = tomorrow.toISOString().split('T')[0];
      
      // Get user preferences first; initialize defaults if missing
      let preferences = await UserPreferencesService.getPreferences(userId);
      if (!preferences) {
        console.log('🛠️ [TimeWindowService] Preferences not found for ensureTomorrowWindowExists. Initializing defaults...');
        preferences = await UserPreferencesService.initializePreferences(userId);
      }

      const { start, end } = preferences.preferredTimeRange;
      
      // Check if tomorrow's window already exists
      const existingWindow = await this.getDailyWindowForDate(userId, tomorrowDateString);
      if (existingWindow) {
        // Check if existing window matches current preferences
        if (this.isWindowWithinTimeRange(existingWindow.windowStart, start, end)) {
          console.log('📅 Tomorrow\'s window already exists and matches current preferences');
          return existingWindow;
        } else {
          console.log('📅 Tomorrow\'s window exists but doesn\'t match current time range - regenerating...');
          await this.deleteDailyWindowForDate(userId, tomorrowDateString);
        }
      }

      console.log('📅 Creating tomorrow\'s window...');
      
      // Generate random window for tomorrow
      const { windowStart, windowEnd } = generateRandomWindowForDate(start, end, tomorrow);
      
      // Create daily window object
      const tomorrowWindow: DailyWindow = {
        userId,
        date: tomorrowDateString,
        windowStart,
        windowEnd,
        hasLogged: false,
        notificationSent: false
      };

      // Save tomorrow's window
      await this.saveDailyWindowForDate(tomorrowWindow, tomorrowDateString);
      
      console.log('📅 ✅ Created tomorrow\'s window:', {
        date: tomorrowDateString,
        windowStart: new Date(windowStart).toLocaleString(),
        windowEnd: new Date(windowEnd).toLocaleString()
      });

      return tomorrowWindow;
    } catch (error) {
      console.error('Error ensuring tomorrow\'s window exists:', error);
      return null;
    }
  }
}

export default new TimeWindowService();