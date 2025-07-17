import { TimeWindowValidator } from '../TimeWindowValidator';
import TimeWindowService from '../../services/TimeWindowService';
import UserPreferencesService from '../../services/UserPreferencesService';
import * as timeWindowUtils from '../timeWindow';

// Mock dependencies
jest.mock('../../services/TimeWindowService');
jest.mock('../../services/UserPreferencesService');
jest.mock('../timeWindow');

describe('TimeWindowValidator', () => {
  // Mock data
  const userId = 'test-user-123';
  const mockWindowStart = new Date().setHours(10, 0, 0, 0);
  const mockWindowEnd = new Date().setHours(11, 0, 0, 0);
  
  const mockDailyWindow = {
    userId,
    date: '2025-07-16',
    windowStart: mockWindowStart,
    windowEnd: mockWindowEnd,
    hasLogged: false,
    notificationSent: false,
  };
  
  const mockPreferences = {
    preferredTimeRange: {
      start: '09:00',
      end: '21:00',
    },
    notifications: true,
    theme: 'light',
    audioQuality: 'high',
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (TimeWindowService.getOrCreateDailyWindow as jest.Mock).mockResolvedValue(mockDailyWindow);
    (UserPreferencesService.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);
    (timeWindowUtils.isWithinTimeWindow as jest.Mock).mockReturnValue(true);
    (timeWindowUtils.formatTimeForDisplay as jest.Mock).mockImplementation((timestamp) => {
      return timestamp === mockWindowStart ? '10:00 AM' : '11:00 AM';
    });
    (timeWindowUtils.getTimeUntilNextWindow as jest.Mock).mockReturnValue({ hours: 2, minutes: 30 });
    (timeWindowUtils.getNextDayWindowStart as jest.Mock).mockReturnValue(new Date().setHours(9, 0, 0, 0) + 86400000);
    (timeWindowUtils.timeRangeToHours as jest.Mock).mockReturnValue({ startHour: 9, endHour: 21 });
  });
  
  describe('isWithinUserWindow', () => {
    it('should return valid when current time is within window', async () => {
      const result = await TimeWindowValidator.isWithinUserWindow(userId);
      
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('You can log your mood now');
      expect(result.windowInfo).toBeDefined();
      expect(result.windowInfo?.formattedStart).toBe('10:00 AM');
      expect(result.windowInfo?.formattedEnd).toBe('11:00 AM');
    });
    
    it('should return invalid when current time is before window', async () => {
      (timeWindowUtils.isWithinTimeWindow as jest.Mock).mockReturnValue(false);
      
      // Mock current time to be before window start
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => mockWindowStart - 3600000); // 1 hour before
      
      const result = await TimeWindowValidator.isWithinUserWindow(userId);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Your time window for today starts in');
      expect(result.windowInfo).toBeDefined();
      
      // Restore original Date.now
      Date.now = originalDateNow;
    });
    
    it('should return invalid when current time is after window', async () => {
      (timeWindowUtils.isWithinTimeWindow as jest.Mock).mockReturnValue(false);
      
      // Mock current time to be after window end
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => mockWindowEnd + 3600000); // 1 hour after
      
      const result = await TimeWindowValidator.isWithinUserWindow(userId);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Your time window for today has passed');
      expect(result.windowInfo).toBeDefined();
      
      // Restore original Date.now
      Date.now = originalDateNow;
    });
    
    it('should handle errors gracefully', async () => {
      (TimeWindowService.getOrCreateDailyWindow as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      const result = await TimeWindowValidator.isWithinUserWindow(userId);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Unable to validate time window');
      expect(result.windowInfo).toBeUndefined();
    });
  });
  
  describe('canLogMoodToday', () => {
    it('should return true when user has not logged today', async () => {
      (TimeWindowService.hasLoggedToday as jest.Mock).mockResolvedValue(false);
      
      const result = await TimeWindowValidator.canLogMoodToday(userId);
      
      expect(result.canLog).toBe(true);
      expect(result.message).toContain('You can log your mood for today');
    });
    
    it('should return false when user has already logged today', async () => {
      (TimeWindowService.hasLoggedToday as jest.Mock).mockResolvedValue(true);
      
      const result = await TimeWindowValidator.canLogMoodToday(userId);
      
      expect(result.canLog).toBe(false);
      expect(result.message).toContain('You have already logged your mood for today');
    });
    
    it('should handle errors gracefully', async () => {
      (TimeWindowService.hasLoggedToday as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      const result = await TimeWindowValidator.canLogMoodToday(userId);
      
      expect(result.canLog).toBe(false);
      expect(result.message).toContain('Unable to validate mood logging status');
    });
  });
  
  describe('validateMoodLogging', () => {
    it('should allow logging when time window is valid and user has not logged', async () => {
      (timeWindowUtils.isWithinTimeWindow as jest.Mock).mockReturnValue(true);
      (TimeWindowService.hasLoggedToday as jest.Mock).mockResolvedValue(false);
      
      const result = await TimeWindowValidator.validateMoodLogging(userId);
      
      expect(result.canLog).toBe(true);
      expect(result.timeWindowValid).toBe(true);
      expect(result.notPreviouslyLogged).toBe(true);
      expect(result.message).toContain('You can log your mood now');
      expect(result.windowInfo).toBeDefined();
    });
    
    it('should prevent logging when time window is invalid', async () => {
      (timeWindowUtils.isWithinTimeWindow as jest.Mock).mockReturnValue(false);
      (TimeWindowService.hasLoggedToday as jest.Mock).mockResolvedValue(false);
      
      // Mock current time to be before window start
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => mockWindowStart - 3600000); // 1 hour before
      
      const result = await TimeWindowValidator.validateMoodLogging(userId);
      
      expect(result.canLog).toBe(false);
      expect(result.timeWindowValid).toBe(false);
      expect(result.notPreviouslyLogged).toBe(true);
      expect(result.message).toContain('Your time window for today starts in');
      expect(result.windowInfo).toBeDefined();
      
      // Restore original Date.now
      Date.now = originalDateNow;
    });
    
    it('should prevent logging when user has already logged', async () => {
      (timeWindowUtils.isWithinTimeWindow as jest.Mock).mockReturnValue(true);
      (TimeWindowService.hasLoggedToday as jest.Mock).mockResolvedValue(true);
      
      const result = await TimeWindowValidator.validateMoodLogging(userId);
      
      expect(result.canLog).toBe(false);
      expect(result.timeWindowValid).toBe(true);
      expect(result.notPreviouslyLogged).toBe(false);
      expect(result.message).toContain('You have already logged your mood for today');
      expect(result.windowInfo).toBeDefined();
    });
    
    it('should prioritize time window message when both validations fail', async () => {
      (timeWindowUtils.isWithinTimeWindow as jest.Mock).mockReturnValue(false);
      (TimeWindowService.hasLoggedToday as jest.Mock).mockResolvedValue(true);
      
      // Mock current time to be after window end
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => mockWindowEnd + 3600000); // 1 hour after
      
      const result = await TimeWindowValidator.validateMoodLogging(userId);
      
      expect(result.canLog).toBe(false);
      expect(result.timeWindowValid).toBe(false);
      expect(result.notPreviouslyLogged).toBe(false);
      expect(result.message).toContain('Your time window for today has passed');
      expect(result.windowInfo).toBeDefined();
      
      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });
});