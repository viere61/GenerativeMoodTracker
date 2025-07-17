import UserPreferencesService from '../UserPreferencesService';
import AuthService from '../AuthService';
import * as SecureStore from 'expo-secure-store';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock AuthService
jest.mock('../AuthService', () => ({
  updatePreferredTimeRange: jest.fn(() => Promise.resolve()),
}));

describe('UserPreferencesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return null if no preferences exist', async () => {
      // Setup
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      // Execute
      const result = await UserPreferencesService.getPreferences('test-user-id');

      // Verify
      expect(result).toBeNull();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('user_preferences_test-user-id');
    });

    it('should return preferences if they exist', async () => {
      // Setup
      const mockPreferences = {
        preferredTimeRange: { start: '09:00', end: '21:00' },
        notifications: true,
        theme: 'dark',
        audioQuality: 'high',
      };
      
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockPreferences));

      // Execute
      const result = await UserPreferencesService.getPreferences('test-user-id');

      // Verify
      expect(result).toEqual(mockPreferences);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('user_preferences_test-user-id');
    });
  });

  describe('savePreferences', () => {
    it('should save preferences successfully', async () => {
      // Setup
      const mockPreferences = {
        preferredTimeRange: { start: '09:00', end: '21:00' },
        notifications: true,
        theme: 'dark',
        audioQuality: 'high',
      };

      // Execute
      await UserPreferencesService.savePreferences('test-user-id', mockPreferences);

      // Verify
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_preferences_test-user-id',
        JSON.stringify(mockPreferences)
      );
    });
  });

  describe('updatePreference', () => {
    it('should update a specific preference', async () => {
      // Setup
      const mockPreferences = {
        preferredTimeRange: { start: '09:00', end: '21:00' },
        notifications: true,
        theme: 'light',
        audioQuality: 'high',
      };
      
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockPreferences));

      // Execute
      const result = await UserPreferencesService.updatePreference('test-user-id', 'theme', 'dark');

      // Verify
      expect(result).toEqual({
        ...mockPreferences,
        theme: 'dark',
      });
      
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_preferences_test-user-id',
        JSON.stringify({
          ...mockPreferences,
          theme: 'dark',
        })
      );
    });

    it('should update preferred time range and call AuthService', async () => {
      // Setup
      const mockPreferences = {
        preferredTimeRange: { start: '09:00', end: '21:00' },
        notifications: true,
        theme: 'light',
        audioQuality: 'high',
      };
      
      const newTimeRange = { start: '10:00', end: '22:00' };
      
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockPreferences));

      // Execute
      const result = await UserPreferencesService.updatePreference('test-user-id', 'preferredTimeRange', newTimeRange);

      // Verify
      expect(result).toEqual({
        ...mockPreferences,
        preferredTimeRange: newTimeRange,
      });
      
      expect(AuthService.updatePreferredTimeRange).toHaveBeenCalledWith('test-user-id', newTimeRange);
    });
  });

  describe('validateTimeRange', () => {
    it('should validate a correct time range', () => {
      // Execute & Verify
      expect(UserPreferencesService.validateTimeRange({ start: '09:00', end: '21:00' })).toBe(true);
    });

    it('should reject an invalid time format', () => {
      // Execute & Verify
      expect(UserPreferencesService.validateTimeRange({ start: '9:00', end: '21:00' })).toBe(false);
      expect(UserPreferencesService.validateTimeRange({ start: '09:00', end: '25:00' })).toBe(false);
    });

    it('should reject when end time is before start time', () => {
      // Execute & Verify
      expect(UserPreferencesService.validateTimeRange({ start: '21:00', end: '09:00' })).toBe(false);
    });
  });

  describe('initializePreferences', () => {
    it('should initialize with default preferences', async () => {
      // Setup
      const defaultPreferences = UserPreferencesService.getDefaultPreferences();

      // Execute
      const result = await UserPreferencesService.initializePreferences('test-user-id');

      // Verify
      expect(result).toEqual(defaultPreferences);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_preferences_test-user-id',
        JSON.stringify(defaultPreferences)
      );
    });

    it('should initialize with custom preferences', async () => {
      // Setup
      const defaultPreferences = UserPreferencesService.getDefaultPreferences();
      const customPreferences = {
        theme: 'dark',
        notifications: false,
      };

      // Execute
      const result = await UserPreferencesService.initializePreferences('test-user-id', customPreferences);

      // Verify
      expect(result).toEqual({
        ...defaultPreferences,
        ...customPreferences,
      });
    });
  });

  describe('deletePreferences', () => {
    it('should delete user preferences', async () => {
      // Execute
      await UserPreferencesService.deletePreferences('test-user-id');

      // Verify
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_preferences_test-user-id');
    });
  });
});