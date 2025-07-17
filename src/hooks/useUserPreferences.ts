import { useState, useEffect, useCallback } from 'react';
import UserPreferencesService, { UserPreferences } from '../services/UserPreferencesService';

/**
 * Hook for accessing and managing user preferences
 */
export const useUserPreferences = () => {
  // Use demo user for web compatibility
  const userId = 'demo-user';
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const userPreferences = await UserPreferencesService.getPreferences(userId);
        
        if (!userPreferences) {
          // Initialize with default preferences if none exist
          const defaultPreferences = await UserPreferencesService.initializePreferences(
            userId,
            {
              preferredTimeRange: { start: '09:00', end: '21:00' }
            }
          );
          setPreferences(defaultPreferences);
        } else {
          setPreferences(userPreferences);
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
        setError('Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Update a specific preference
  const updatePreference = useCallback(async (key: string, value: any): Promise<boolean> => {
    try {
      setError(null);
      const updatedPreferences = await UserPreferencesService.updatePreference(
        userId,
        key,
        value
      );
      setPreferences(updatedPreferences);
      return true;
    } catch (err) {
      console.error('Error updating preference:', err);
      setError('Failed to update preference');
      return false;
    }
  }, []);

  // Update preferred time range
  const updatePreferredTimeRange = useCallback(async (timeRange: { start: string; end: string }): Promise<boolean> => {
    // Validate time range format
    if (!UserPreferencesService.validateTimeRange(timeRange)) {
      setError('Invalid time range format');
      return false;
    }
    
    return updatePreference('preferredTimeRange', timeRange);
  }, [updatePreference]);

  // Reset preferences to defaults
  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const defaultPreferences = UserPreferencesService.getDefaultPreferences();
      await UserPreferencesService.savePreferences(userId, defaultPreferences);
      setPreferences(defaultPreferences);
      return true;
    } catch (err) {
      console.error('Error resetting preferences:', err);
      setError('Failed to reset preferences');
      return false;
    }
  }, []);

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
    updatePreferredTimeRange,
    resetToDefaults
  };
};

export default useUserPreferences;