import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import TimeWindowService from './TimeWindowService';
import UserPreferencesService from './UserPreferencesService';
import { formatTimeForDisplay, timeRangeToHours, getNextDayWindowStart } from '../utils/timeWindow';

/**
 * Service for managing notifications
 */
class NotificationService {
  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    // Skip initialization on web
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web platform');
      return;
    }

    try {
      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }
  
  /**
   * Request notification permissions
   * @returns Promise resolving to a boolean indicating if permissions were granted
   */
  async requestPermissions(): Promise<boolean> {
    // Skip on web
    if (Platform.OS === 'web') {
      console.log('Notification permissions not available on web');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // Only ask if permissions have not already been determined
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      // Return true if permissions were granted
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }
  
  /**
   * Handle notification response
   * @param response The notification response
   */
  handleNotificationResponse = (response: Notifications.NotificationResponse): void => {
    // Extract data from the notification
    const data = response.notification.request.content.data;
    
    // Handle different notification types
    if (data.type === 'timeWindowOpen') {
      // Handle time window open notification
      console.log('User tapped on time window notification');
      // Navigation would be handled by the app's navigation system
    } else if (data.type === 'musicReady') {
      // Handle music ready notification
      console.log('User tapped on music ready notification');
      // In a real app, this would navigate to the music player screen
      // with the specific music ID
    }
  };
  
  /**
   * Schedule a notification for when the time window opens
   * @param userId The user's ID
   * @returns Promise resolving to a boolean indicating if the notification was scheduled
   */
  async scheduleTimeWindowNotification(userId: string): Promise<boolean> {
    // Skip on web
    if (Platform.OS === 'web') {
      console.log('Time window notifications not available on web');
      return false;
    }

    try {
      // Get the daily window
      const dailyWindow = await TimeWindowService.getOrCreateDailyWindow(userId);
      
      // Check if a notification has already been sent
      if (dailyWindow.notificationSent) {
        return false;
      }
      
      // Format the time for display
      const formattedStart = formatTimeForDisplay(dailyWindow.windowStart);
      const formattedEnd = formatTimeForDisplay(dailyWindow.windowEnd);
      
      // Calculate trigger time (at window start)
      const triggerTime = new Date(dailyWindow.windowStart);
      
      // Only schedule if the window hasn't started yet
      if (triggerTime.getTime() > Date.now()) {
        // Schedule the notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Time to Log Your Mood',
            body: `Your mood logging window is now open until ${formattedEnd}. Take a moment to reflect on how you're feeling.`,
            data: {
              type: 'timeWindowOpen',
              userId,
              windowStart: dailyWindow.windowStart,
              windowEnd: dailyWindow.windowEnd,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerTime,
          },
        });
        
        // Mark notification as sent
        await TimeWindowService.markNotificationSent(userId);
        
        return true;
      } else {
        // Window has already started, mark as sent but don't schedule
        await TimeWindowService.markNotificationSent(userId);
        return false;
      }
    } catch (error) {
      console.error('Error scheduling time window notification:', error);
      return false;
    }
  }
  
  /**
   * Schedule a notification for the next day's time window
   * @param userId The user's ID
   * @returns Promise resolving to a boolean indicating if the notification was scheduled
   */
  async scheduleNextDayNotification(userId: string): Promise<boolean> {
    // Skip on web
    if (Platform.OS === 'web') {
      console.log('Next day notifications not available on web');
      return false;
    }

    try {
      // Get user preferences
      const preferences = await UserPreferencesService.getPreferences(userId);
      
      if (!preferences) {
        console.error('User preferences not found');
        return false;
      }
      
      // Get the preferred time range
      const { startHour } = timeRangeToHours(preferences.preferredTimeRange);
      
      // Calculate the earliest possible start time for tomorrow
      const nextDayEarliestStart = getNextDayWindowStart(startHour);
      
      // Schedule a reminder for tomorrow
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Mood Tracker Reminder',
          body: `Your mood logging window will open sometime after ${formatTimeForDisplay(nextDayEarliestStart)} today. Keep an eye out for the notification!`,
          data: {
            type: 'nextDayReminder',
            userId,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(nextDayEarliestStart),
        },
      });
      
      return true;
    } catch (error) {
      console.error('Error scheduling next day notification:', error);
      return false;
    }
  }
  
  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    // Skip on web
    if (Platform.OS === 'web') {
      console.log('Cancel notifications not available on web');
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  
  /**
   * Get all scheduled notifications
   * @returns Promise resolving to an array of scheduled notifications
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    // Skip on web
    if (Platform.OS === 'web') {
      console.log('Get scheduled notifications not available on web');
      return [];
    }

    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
  
  /**
   * Send an immediate test notification
   * @returns Promise resolving to a boolean indicating if the notification was sent
   */
  async sendTestNotification(): Promise<boolean> {
    // Skip on web
    if (Platform.OS === 'web') {
      console.log('Test notifications not available on web');
      return false;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification from the Generative Mood Tracker app.',
          data: { type: 'test' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
        },
      });
      
      return true;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }
  
  /**
   * Send a notification when music generation is complete
   * @param userId The user's ID
   * @param entryId The mood entry ID
   * @param musicId The generated music ID
   * @returns Promise resolving to a boolean indicating if the notification was sent
   */
  async sendMusicReadyNotification(userId: string, entryId: string, musicId: string): Promise<boolean> {
    // Skip on web
    if (Platform.OS === 'web') {
      console.log('Music ready notifications not available on web');
      return false;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Your Mood Music is Ready',
          body: 'Your personalized music based on your mood entry has been generated. Tap to listen.',
          data: {
            type: 'musicReady',
            userId,
            entryId,
            musicId,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
        },
      });
      
      return true;
    } catch (error) {
      console.error('Error sending music ready notification:', error);
      return false;
    }
  }
}

export default new NotificationService();