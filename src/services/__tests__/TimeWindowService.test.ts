import * as SecureStore from 'expo-secure-store';
import TimeWindowService from '../TimeWindowService';
import UserPreferencesService from '../UserPreferencesService';
import { generateTimeWindow } from '../../utils/timeWindow';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('../UserPreferencesService');
jest.mock('../../utils/timeWindow');

describe('TimeWindowService', () => {
  // Mock data
  const userId = 'test-user-123';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]; // Yesterday's date
  
  const mockPreferences = {
    preferredTimeRange: {
      start: '09:00',
      end: '21:00',
    },
    notifications: true,
    theme: 'light',
    audioQuality: 'high',
  };
  
  const mockTimeWindow = {
    startTime: new Date().setHours(10, 0, 0, 0),
    endTime: new Date().setHours(11, 0, 0, 0),
  };
  
  const mockDailyWindow = {
    userId,
    date: today,
    windowStart: mockTimeWindow.startTime,
    windowEnd: mockTimeWindow.endTime,
    hasLogged: false,
    notificationSent: false,
  };
  
  const mockYesterdayWindow = {
    ...mockDailyWindow,
    date: yesterday,
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (UserPreferencesService.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);
    (generateTimeWindow as jest.Mock).mockReturnValue(mockTimeWindow);
  });
  
  describe('getDailyWindow', () => {
    it('should return null if no window exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      
      const result = await TimeWindowService.getDailyWindow(userId);
      
      expect(result).toBeNull();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(`daily_window_${userId}`);
    });
    
    it('should return the daily window if it exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockDailyWindow));
      
      const result = await TimeWindowService.getDailyWindow(userId);
      
      expect(result).toEqual(mockDailyWindow);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(`daily_window_${userId}`);
    });
    
    it('should handle errors and return null', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      const result = await TimeWindowService.getDailyWindow(userId);
      
      expect(result).toBeNull();
    });
  });
  
  describe('saveDailyWindow', () => {
    it('should save the daily window', async () => {
      await TimeWindowService.saveDailyWindow(mockDailyWindow);
      
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        `daily_window_${userId}`,
        JSON.stringify(mockDailyWindow)
      );
    });
    
    it('should throw an error if saving fails', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      await expect(TimeWindowService.saveDailyWindow(mockDailyWindow)).rejects.toThrow('Failed to save daily window');
    });
  });
  
  describe('generateDailyWindow', () => {
    it('should generate a new daily window', async () => {
      const result = await TimeWindowService.generateDailyWindow(userId);
      
      expect(result).toEqual(mockDailyWindow);
      expect(UserPreferencesService.getPreferences).toHaveBeenCalledWith(userId);
      expect(generateTimeWindow).toHaveBeenCalledWith(9, 21);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        `daily_window_${userId}`,
        JSON.stringify(mockDailyWindow)
      );
    });
    
    it('should throw an error if user preferences are not found', async () => {
      (UserPreferencesService.getPreferences as jest.Mock).mockResolvedValue(null);
      
      await expect(TimeWindowService.generateDailyWindow(userId)).rejects.toThrow('User preferences not found');
    });
  });
  
  describe('getOrCreateDailyWindow', () => {
    it('should create a new window if none exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      
      const result = await TimeWindowService.getOrCreateDailyWindow(userId);
      
      expect(result).toEqual(mockDailyWindow);
      expect(UserPreferencesService.getPreferences).toHaveBeenCalledWith(userId);
    });
    
    it('should return the existing window if it is for today', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockDailyWindow));
      
      const result = await TimeWindowService.getOrCreateDailyWindow(userId);
      
      expect(result).toEqual(mockDailyWindow);
      expect(UserPreferencesService.getPreferences).not.toHaveBeenCalled();
    });
    
    it('should create a new window if the existing one is for a previous day', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockYesterdayWindow));
      
      const result = await TimeWindowService.getOrCreateDailyWindow(userId);
      
      expect(result).toEqual(mockDailyWindow);
      expect(UserPreferencesService.getPreferences).toHaveBeenCalledWith(userId);
    });
  });
  
  describe('resetDailyWindow', () => {
    it('should generate a new daily window', async () => {
      const result = await TimeWindowService.resetDailyWindow(userId);
      
      expect(result).toEqual(mockDailyWindow);
      expect(UserPreferencesService.getPreferences).toHaveBeenCalledWith(userId);
    });
  });
  
  describe('markMoodLogged', () => {
    it('should mark the mood as logged', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockDailyWindow));
      
      await TimeWindowService.markMoodLogged(userId);
      
      const expectedWindow = { ...mockDailyWindow, hasLogged: true };
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        `daily_window_${userId}`,
        JSON.stringify(expectedWindow)
      );
    });
  });
  
  describe('markNotificationSent', () => {
    it('should mark the notification as sent', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockDailyWindow));
      
      await TimeWindowService.markNotificationSent(userId);
      
      const expectedWindow = { ...mockDailyWindow, notificationSent: true };
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        `daily_window_${userId}`,
        JSON.stringify(expectedWindow)
      );
    });
  });
  
  describe('hasLoggedToday', () => {
    it('should return false if no window exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      
      const result = await TimeWindowService.hasLoggedToday(userId);
      
      expect(result).toBe(false);
    });
    
    it('should return false if the window is for a previous day', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockYesterdayWindow));
      
      const result = await TimeWindowService.hasLoggedToday(userId);
      
      expect(result).toBe(false);
    });
    
    it('should return the hasLogged value if the window is for today', async () => {
      const loggedWindow = { ...mockDailyWindow, hasLogged: true };
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(loggedWindow));
      
      const result = await TimeWindowService.hasLoggedToday(userId);
      
      expect(result).toBe(true);
    });
  });
});