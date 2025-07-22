import { DailyWindow } from '../types';
import { isWithinTimeWindow, getTimeUntilNextWindow, formatTimeForDisplay, getNextDayWindowStart, timeRangeToHours, generateTimeWindow } from './timeWindow';
import TimeWindowService from '../services/TimeWindowService';
import UserPreferencesService from '../services/UserPreferencesService';
import { getTomorrowMidnight, getTimeDifference } from './dateUtils';
import { isTimestampToday, getWindowStatusMessage } from './windowHelpers';

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
        // Check if the window has passed for today or hasn't started yet
        const currentTime = Date.now();
        
        // Debug current time vs window times
        console.log('Time comparison:', {
          currentTime: new Date(currentTime).toLocaleString(),
          windowStart: new Date(dailyWindow.windowStart).toLocaleString(),
          windowEnd: new Date(dailyWindow.windowEnd).toLocaleString(),
          isPastEnd: currentTime > dailyWindow.windowEnd,
          isBeforeStart: currentTime < dailyWindow.windowStart
        });
        
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
          // Create tomorrow at local midnight using our utility function
          const tomorrow = getTomorrowMidnight();
          
          // Debug the actual tomorrow date
          console.log('Tomorrow date check:', {
            tomorrowDate: tomorrow.toISOString(),
            tomorrowLocal: tomorrow.toString(),
            tomorrowTimestamp: tomorrow.getTime(),
            tomorrowHours: tomorrow.getHours()
          });
          
          // Generate a random window directly for tomorrow
          // This ensures proper date handling without needing to transfer time components
          const { startTime: nextDayStartTime, endTime: nextDayEndTime } = generateTimeWindow(startHour, endHour, tomorrow);
          
          // Create proper Date objects for logging
          const nextDayStart = new Date(nextDayStartTime);
          const nextDayEnd = new Date(nextDayEndTime);
          
          // Debug log to help diagnose time calculation issues
          console.log('Time window debug:', {
            now: new Date().toISOString(),
            tomorrow: tomorrow.toISOString(),
            nextDayStart: nextDayStart.toISOString(),
            nextDayEnd: nextDayEnd.toISOString(),
            millisUntilNextWindow: nextDayStart.getTime() - Date.now(),
            hoursUntilNextWindow: (nextDayStart.getTime() - Date.now()) / (1000 * 60 * 60),
            startHour,
            endHour
          });
          
          const { hours, minutes } = getTimeDifference(nextDayStart);
          
          // Calculate the actual hours until the next window
          const actualHours = Math.floor((nextDayStart.getTime() - Date.now()) / (1000 * 60 * 60));
          
          // Create a more user-friendly message based on the time
          let timeMessage;
          if (actualHours >= 24) {
            const days = Math.floor(actualHours / 24);
            timeMessage = days > 1 ? `Check back in ${days} days.` : "Check back tomorrow.";
          } else {
            timeMessage = `Check back in ${hours} hours and ${minutes} minutes.`;
          }
          
          // Check if the next window is actually tomorrow's window
          const isTomorrowWindow = !isTimestampToday(nextDayStart);
          
          // Get a more accurate status message
          const statusMessage = getWindowStatusMessage(nextDayStart.getTime(), nextDayEnd.getTime());
          
          // Log the actual time calculation
          console.log('Next window time calculation:', {
            now: new Date().toLocaleString(),
            nextDayStart: nextDayStart.toLocaleString(),
            actualHours,
            isTomorrowWindow
          });
          
          const messagePrefix = isTomorrowWindow 
            ? "Your time window for today has passed." 
            : "Your next time window is coming up.";
          
          return {
            isValid: false,
            message: `${statusMessage}. ${timeMessage}`,
            windowInfo: {
              start: nextDayStart.getTime(),
              end: nextDayEnd.getTime(),
              formattedStart: formatTimeForDisplay(nextDayStart.getTime()),
              formattedEnd: formatTimeForDisplay(nextDayEnd.getTime())
            }
          };
        } else if (currentTime < dailyWindow.windowStart) {
          // Window hasn't started yet
          const { hours, minutes } = getTimeDifference(dailyWindow.windowStart);
          
          // Check if the window is today
          const windowDate = new Date(dailyWindow.windowStart).toDateString();
          const todayDate = new Date().toDateString();
          const isToday = windowDate === todayDate;
          
          const message = isToday
            ? `Your time window for today starts in ${hours} hours and ${minutes} minutes at ${formattedStart}.`
            : `Your next time window starts in ${hours} hours and ${minutes} minutes at ${formattedStart}.`;
          
          return {
            isValid: false,
            message: message,
            windowInfo
          };
        } else {
          // This should never happen if isWithinTimeWindow is working correctly
          console.error('Logic error: Time is not within window but also not before/after window');
          return {
            isValid: false,
            message: `There was an error determining your time window. Please try again.`,
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