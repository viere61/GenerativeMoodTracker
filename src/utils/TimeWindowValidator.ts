import { DailyWindow } from '../types';
import { isWithinTimeWindow, getTimeUntilNextWindow, formatTimeForDisplay, getNextDayWindowStart, timeRangeToHours, generateTimeWindow } from './timeWindow';
import TimeWindowService from '../services/TimeWindowService';
import UserPreferencesService from '../services/UserPreferencesService';

/**
 * Class for validating time windows and providing user feedback
 */
export class TimeWindowValidator {
  /**
   * Check if the current time is within the user's designated window
   * @param userId The user's ID
   * @returns Promise resolving to an object with validation result and message
   */
  static async isWithinUserWindow(userId: string): Promise<{
    isValid: boolean;
    message: string;
    windowInfo?: {
      start: number;
      end: number;
      formattedStart: string;
      formattedEnd: string;
    };
  }> {
    try {
      // Get the daily window
      const dailyWindow = await TimeWindowService.getOrCreateDailyWindow(userId);
      
      // Check if the current time is within the window
      const isValid = isWithinTimeWindow(dailyWindow.windowStart, dailyWindow.windowEnd);
      
      // Format times for display
      const formattedStart = formatTimeForDisplay(dailyWindow.windowStart);
      const formattedEnd = formatTimeForDisplay(dailyWindow.windowEnd);
      
      // Create window info
      const windowInfo = {
        start: dailyWindow.windowStart,
        end: dailyWindow.windowEnd,
        formattedStart,
        formattedEnd
      };
      
      if (isValid) {
        return {
          isValid: true,
          message: `You can log your mood now until ${formattedEnd}.`,
          windowInfo
        };
      } else {
        // Check if the window has passed for today
        const currentTime = Date.now();
        
        if (currentTime > dailyWindow.windowEnd) {
          // Window has passed, calculate next day's window
          const preferences = await UserPreferencesService.getPreferences(userId);
          if (!preferences) {
            return {
              isValid: false,
              message: 'Your time window for today has passed. Check back tomorrow.'
            };
          }
          
          // Generate a new window for tomorrow
          const { startHour, endHour } = timeRangeToHours(preferences.preferredTimeRange);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          
          // Generate a random window for tomorrow
          const { startTime: nextStartTime, endTime: nextEndTime } = generateTimeWindow(startHour, endHour);
          const nextDayStart = tomorrow.getTime() + (nextStartTime - new Date().setHours(0, 0, 0, 0));
          const nextDayEnd = tomorrow.getTime() + (nextEndTime - new Date().setHours(0, 0, 0, 0));
          
          const { hours, minutes } = getTimeUntilNextWindow(nextDayStart);
          
          return {
            isValid: false,
            message: `Your time window for today has passed. Check back in ${hours} hours and ${minutes} minutes.`,
            windowInfo: {
              start: nextDayStart,
              end: nextDayEnd,
              formattedStart: formatTimeForDisplay(nextDayStart),
              formattedEnd: formatTimeForDisplay(nextDayEnd)
            }
          };
        } else {
          // Window hasn't started yet
          const { hours, minutes } = getTimeUntilNextWindow(dailyWindow.windowStart);
          
          return {
            isValid: false,
            message: `Your time window for today starts in ${hours} hours and ${minutes} minutes at ${formattedStart}.`,
            windowInfo
          };
        }
      }
    } catch (error) {
      console.error('Time window validation error:', error);
      return {
        isValid: false,
        message: 'Unable to validate time window. Please try again later.'
      };
    }
  }
  
  /**
   * Check if the user has already logged a mood today
   * @param userId The user's ID
   * @returns Promise resolving to an object with validation result and message
   */
  static async canLogMoodToday(userId: string): Promise<{
    canLog: boolean;
    message: string;
  }> {
    try {
      // Check if the user has already logged a mood today
      const hasLogged = await TimeWindowService.hasLoggedToday(userId);
      
      if (hasLogged) {
        return {
          canLog: false,
          message: 'You have already logged your mood for today. Come back tomorrow for a new entry.'
        };
      }
      
      return {
        canLog: true,
        message: 'You can log your mood for today.'
      };
    } catch (error) {
      console.error('Mood logging validation error:', error);
      return {
        canLog: false,
        message: 'Unable to validate mood logging status. Please try again later.'
      };
    }
  }
  
  /**
   * Comprehensive validation for mood logging
   * @param userId The user's ID
   * @returns Promise resolving to an object with validation results and messages
   */
  static async validateMoodLogging(userId: string): Promise<{
    canLog: boolean;
    timeWindowValid: boolean;
    notPreviouslyLogged: boolean;
    message: string;
    windowInfo?: {
      start: number;
      end: number;
      formattedStart: string;
      formattedEnd: string;
    };
  }> {
    // Check time window
    const timeWindowResult = await this.isWithinUserWindow(userId);
    
    // Check previous logging
    const loggingResult = await this.canLogMoodToday(userId);
    
    // Determine if the user can log a mood
    const canLog = timeWindowResult.isValid && loggingResult.canLog;
    
    // Determine the message to show
    let message = '';
    
    if (!timeWindowResult.isValid) {
      // Time window is the primary issue
      message = timeWindowResult.message;
    } else if (!loggingResult.canLog) {
      // Already logged is the issue
      message = loggingResult.message;
    } else {
      // All good
      message = 'You can log your mood now.';
    }
    
    return {
      canLog,
      timeWindowValid: timeWindowResult.isValid,
      notPreviouslyLogged: loggingResult.canLog,
      message,
      windowInfo: timeWindowResult.windowInfo
    };
  }
}

export default TimeWindowValidator;