import { User } from '../types';
import StorageService from './StorageService';

// Keys for secure storage
const USER_PREFERENCES_KEY = 'user_preferences';

/**
 * Interface for user preferences
 */
export interface UserPreferences {
  preferredTimeRange: {
    start: string; // Format: "HH:MM"
    end: string; // Format: "HH:MM"
  };
  notifications: boolean;
  theme: string;
  audioQuality: string;
  [key: string]: any; // Allow for additional preferences
}

/**
 * Service for handling user preferences
 */
class UserPreferencesService {
  /**
   * Get user preferences
   * @param userId The user's ID
   * @returns Promise resolving to the user preferences
   */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const key = `${USER_PREFERENCES_KEY}_${userId}`;
      const preferencesData = await StorageService.getItem(key);
      
      if (!preferencesData) {
        return null;
      }
      
      return JSON.parse(preferencesData) as UserPreferences;
    } catch (error) {
      console.error('Get preferences error:', error);
      return null;
    }
  }
  
  /**
   * Save user preferences
   * @param userId The user's ID
   * @param preferences The preferences to save
   */
  async savePreferences(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      const key = `${USER_PREFERENCES_KEY}_${userId}`;
      await StorageService.setItem(key, JSON.stringify(preferences));
    } catch (error) {
      console.error('Save preferences error:', error);
      throw new Error('Failed to save preferences');
    }
  }
  
  /**
   * Update specific preference
   * @param userId The user's ID
   * @param key The preference key to update
   * @param value The new value
   */
  async updatePreference(userId: string, key: string, value: any): Promise<UserPreferences> {
    try {
      // Get current preferences
      const currentPreferences = await this.getPreferences(userId) || this.getDefaultPreferences();
      
      // Update the specific preference
      const updatedPreferences = {
        ...currentPreferences,
        [key]: value,
      };
      
      // Save the updated preferences
      await this.savePreferences(userId, updatedPreferences);
      
      return updatedPreferences;
    } catch (error) {
      console.error('Update preference error:', error);
      throw new Error('Failed to update preference');
    }
  }
  
  /**
   * Update preferred time range
   * @param userId The user's ID
   * @param timeRange The new time range
   */
  async updatePreferredTimeRange(userId: string, timeRange: { start: string; end: string }): Promise<UserPreferences> {
    return this.updatePreference(userId, 'preferredTimeRange', timeRange);
  }
  
  /**
   * Get default preferences
   * @returns Default user preferences
   */
  getDefaultPreferences(): UserPreferences {
    return {
      preferredTimeRange: {
        start: '09:00',
        end: '21:00',
      },
      notifications: true,
      theme: 'light',
      audioQuality: 'high',
    };
  }
  
  /**
   * Initialize preferences for a new user
   * @param userId The user's ID
   * @param initialPreferences Initial preferences (optional)
   */
  async initializePreferences(userId: string, initialPreferences?: Partial<UserPreferences>): Promise<UserPreferences> {
    const defaultPreferences = this.getDefaultPreferences();
    const preferences = {
      ...defaultPreferences,
      ...initialPreferences,
    };
    
    await this.savePreferences(userId, preferences);
    return preferences;
  }
  
  /**
   * Delete user preferences
   * @param userId The user's ID
   */
  async deletePreferences(userId: string): Promise<void> {
    try {
      const key = `${USER_PREFERENCES_KEY}_${userId}`;
      await StorageService.removeItem(key);
    } catch (error) {
      console.error('Delete preferences error:', error);
      throw new Error('Failed to delete preferences');
    }
  }
  
  /**
   * Validate time range format
   * @param timeRange The time range to validate
   * @returns True if the time range is valid
   */
  validateTimeRange(timeRange: { start: string; end: string }): boolean {
    // Check if start and end are present
    if (!timeRange.start || !timeRange.end) {
      return false;
    }
    
    // Check format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(timeRange.start) || !timeRegex.test(timeRange.end)) {
      return false;
    }
    
    // Check if start is before end
    const [startHour, startMinute] = timeRange.start.split(':').map(Number);
    const [endHour, endMinute] = timeRange.end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    return startMinutes < endMinutes;
  }

  /**
   * Get email notification settings
   * @param userId The user's ID
   * @returns Promise resolving to email notification settings
   */
  async getEmailNotificationSettings(userId: string): Promise<any> {
    try {
      const key = `emailNotificationSettings_${userId}`;
      const settingsData = await StorageService.getItem(key);
      
      if (!settingsData) {
        return null;
      }
      
      return JSON.parse(settingsData);
    } catch (error) {
      console.error('Get email notification settings error:', error);
      return null;
    }
  }
}

export default new UserPreferencesService();