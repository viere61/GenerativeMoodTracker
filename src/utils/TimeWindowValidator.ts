import { DailyWindow } from '../types';
import TimeWindowService from '../services/TimeWindowService';

/**
 * Simple class for validating time windows and providing user feedback
 */
export class TimeWindowValidator {
  /**
   * Check if the current time is within the user's designated window
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
      const result = await TimeWindowService.canLogMood(userId);
      
      const windowInfo = {
        start: result.window.windowStart,
        end: result.window.windowEnd,
        formattedStart: new Date(result.window.windowStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        formattedEnd: new Date(result.window.windowEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      };
      
      return {
        isValid: result.canLog,
        message: result.message,
        windowInfo
      };
    } catch (error) {
      console.error('Time window validation error:', error);
      return {
        isValid: false,
        message: 'Unable to validate time window. Please try again later.'
      };
    }
  }
  
  /**
   * Check if user can log mood today (hasn't already logged)
   */
  static async canLogMoodToday(userId: string): Promise<{
    canLog: boolean;
    message: string;
  }> {
    try {
      const hasLogged = await TimeWindowService.hasLoggedToday(userId);
      
      if (hasLogged) {
        return {
          canLog: false,
          message: 'You have already logged your mood today.'
        };
      }
      
      return {
        canLog: true,
        message: 'You can log your mood.'
      };
    } catch (error) {
      console.error('Error checking mood logging status:', error);
      return {
        canLog: false,
        message: 'Unable to check mood logging status. Please try again later.'
      };
    }
  }
  
  /**
   * Comprehensive validation for mood logging
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
    try {
      const result = await TimeWindowService.canLogMood(userId);
      
      const windowInfo = {
        start: result.window.windowStart,
        end: result.window.windowEnd,
        formattedStart: new Date(result.window.windowStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        formattedEnd: new Date(result.window.windowEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      };
      
      return {
        canLog: result.canLog,
        timeWindowValid: result.canLog || !result.window.hasLogged, // Valid if can log or if just not in window
        notPreviouslyLogged: !result.window.hasLogged,
        message: result.message,
        windowInfo
      };
    } catch (error) {
      console.error('Error validating mood logging:', error);
      return {
        canLog: false,
        timeWindowValid: false,
        notPreviouslyLogged: false,
        message: 'Unable to validate mood logging. Please try again later.'
      };
    }
  }
}