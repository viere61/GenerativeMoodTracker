import * as Notifications from 'expo-notifications';
import NotificationService from '../NotificationService';
import TimeWindowService from '../TimeWindowService';
import UserPreferencesService from '../UserPreferencesService';
import { formatTimeForDisplay, getNextDayWindowStart, timeRangeToHours } from '../../utils/timeWindow';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('../TimeWindowService');
jest.mock('../UserPreferencesService');
jest.mock('../../utils/timeWindow');

describe('NotificationService', () => {
  // Mock data
  const userId = 'test-user-123';
  const mockWindowStart = new Date().setHours(10, 0, 0, 0);
  const mockWindowEnd = new Date().setHours(11, 0, 0, 0);
  const mockNextDayStart = new Date().setHours(9, 0, 0, 0) + 86400000; // Tomorrow at 9 AM
  
  const mockDailyWindow = {
    userId,
    date: '2025-07-16',
    windowStart: mockWindowStart,
    windowEnd: mockWindowEnd,
    hasLogged: false,
    notificationSent: false,
  };
  
  const mockDailyWindowWithNotification = {
    ...mockDailyWindow,
    notificationSent: true,
  };
  
  const mockUserPreferences = {
    userId,
    preferredTimeRange: {
      start: '09:00',
      end: '21:00',
    },
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (TimeWindowService.getOrCreateDailyWindow as jest.Mock).mockResolvedValue(mockDailyWindow);
    (UserPreferencesService.getPreferences as jest.Mock).mockResolvedValue(mockUserPreferences);
    (formatTimeForDisplay as jest.Mock).mockImplementation((timestamp) => {
      if (timestamp === mockWindowStart) return '10:00 AM';
      if (timestamp === mockWindowEnd) return '11:00 AM';
      if (timestamp === mockNextDayStart) return '9:00 AM';
      return 'Unknown Time';
    });
    (getNextDayWindowStart as jest.Mock).mockReturnValue(mockNextDayStart);
    (timeRangeToHours as jest.Mock).mockReturnValue({ startHour: 9, endHour: 21 });
    
    // Mock Date.now() to return a specific time
    jest.spyOn(Date, 'now').mockImplementation(() => new Date().setHours(8, 0, 0, 0)); // 8 AM
  });
  
  describe('initialize', () => {
    it('should request permissions and set up notification handler', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      
      await NotificationService.initialize();
      
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.setNotificationHandler).toHaveBeenCalled();
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
    });
    
    it('should request permissions if not already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      
      await NotificationService.initialize();
      
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });
  });
  
  describe('requestPermissions', () => {
    it('should return true if permissions are granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      
      const result = await NotificationService.requestPermissions();
      
      expect(result).toBe(true);
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });
    
    it('should request permissions if not already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      
      const result = await NotificationService.requestPermissions();
      
      expect(result).toBe(true);
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });
    
    it('should return false if permissions are denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
      
      const result = await NotificationService.requestPermissions();
      
      expect(result).toBe(false);
    });
    
    it('should handle errors gracefully', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      const result = await NotificationService.requestPermissions();
      
      expect(result).toBe(false);
    });
  });
  
  describe('scheduleTimeWindowNotification', () => {
    it('should schedule a notification when window is in the future', async () => {
      // Set window start to be in the future
      const futureWindow = {
        ...mockDailyWindow,
        windowStart: Date.now() + 3600000, // 1 hour in the future
      };
      (TimeWindowService.getOrCreateDailyWindow as jest.Mock).mockResolvedValue(futureWindow);
      
      const result = await NotificationService.scheduleTimeWindowNotification(userId);
      
      expect(result).toBe(true);
      expect(TimeWindowService.getOrCreateDailyWindow).toHaveBeenCalledWith(userId);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
      expect(TimeWindowService.markNotificationSent).toHaveBeenCalledWith(userId);
    });
    
    it('should not schedule a notification if window has already started', async () => {
      // Set window start to be in the past
      const pastWindow = {
        ...mockDailyWindow,
        windowStart: Date.now() - 3600000, // 1 hour in the past
      };
      (TimeWindowService.getOrCreateDailyWindow as jest.Mock).mockResolvedValue(pastWindow);
      
      const result = await NotificationService.scheduleTimeWindowNotification(userId);
      
      expect(result).toBe(false);
      expect(TimeWindowService.getOrCreateDailyWindow).toHaveBeenCalledWith(userId);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(TimeWindowService.markNotificationSent).toHaveBeenCalledWith(userId);
    });
    
    it('should not schedule a notification if one has already been sent', async () => {
      (TimeWindowService.getOrCreateDailyWindow as jest.Mock).mockResolvedValue(mockDailyWindowWithNotification);
      
      const result = await NotificationService.scheduleTimeWindowNotification(userId);
      
      expect(result).toBe(false);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(TimeWindowService.markNotificationSent).not.toHaveBeenCalled();
    });
    
    it('should handle errors gracefully', async () => {
      (TimeWindowService.getOrCreateDailyWindow as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      const result = await NotificationService.scheduleTimeWindowNotification(userId);
      
      expect(result).toBe(false);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });
  
  describe('scheduleNextDayNotification', () => {
    it('should schedule a notification for the next day', async () => {
      const result = await NotificationService.scheduleNextDayNotification(userId);
      
      expect(result).toBe(true);
      expect(UserPreferencesService.getPreferences).toHaveBeenCalledWith(userId);
      expect(timeRangeToHours).toHaveBeenCalledWith(mockUserPreferences.preferredTimeRange);
      expect(getNextDayWindowStart).toHaveBeenCalledWith(9); // startHour from mock
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });
    
    it('should handle missing user preferences', async () => {
      (UserPreferencesService.getPreferences as jest.Mock).mockResolvedValue(null);
      
      const result = await NotificationService.scheduleNextDayNotification(userId);
      
      expect(result).toBe(false);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
    
    it('should handle errors gracefully', async () => {
      (UserPreferencesService.getPreferences as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      const result = await NotificationService.scheduleNextDayNotification(userId);
      
      expect(result).toBe(false);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });
  
  describe('getAllScheduledNotifications', () => {
    it('should return all scheduled notifications', async () => {
      const mockNotifications = [{ identifier: 'test-notification' }];
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(mockNotifications);
      
      const result = await NotificationService.getAllScheduledNotifications();
      
      expect(result).toEqual(mockNotifications);
      expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
    
    it('should handle errors gracefully', async () => {
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      const result = await NotificationService.getAllScheduledNotifications();
      
      expect(result).toEqual([]);
    });
  });
  
  describe('cancelAllNotifications', () => {
    it('should cancel all scheduled notifications', async () => {
      await NotificationService.cancelAllNotifications();
      
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });
  
  describe('sendTestNotification', () => {
    it('should send a test notification', async () => {
      const result = await NotificationService.sendTestNotification();
      
      expect(result).toBe(true);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });
    
    it('should handle errors gracefully', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      const result = await NotificationService.sendTestNotification();
      
      expect(result).toBe(false);
    });
  });
});