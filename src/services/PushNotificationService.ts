import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import LocalStorageManager from './LocalStorageManager';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationSettings {
  enabled: boolean;
  reminderEnabled: boolean;
  preferredTimeRange?: { start: string; end: string };
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private expoPushToken: string | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      console.log('🔔 Initializing push notifications...');

      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('🔔 Not a physical device, push notifications not available');
        return { success: false, error: 'Not a physical device' };
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('🔔 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('🔔 Notification permissions denied');
        return { success: false, error: 'Permissions denied' };
      }

      // Get push token
      const token = await this.getPushToken();
      if (!token) {
        console.log('🔔 Failed to get push token');
        return { success: false, error: 'Failed to get push token' };
      }

      // Check if smart reminders are enabled and schedule them
      await this.checkAndScheduleSmartReminders();

      console.log('✅ Push notifications initialized successfully');
      return { success: true, token };
    } catch (error) {
      console.error('❌ Push notification initialization error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Check if smart reminders are enabled and schedule them
   */
  private async checkAndScheduleSmartReminders(): Promise<void> {
    try {
      const settings = await LocalStorageManager.retrieveData<PushNotificationSettings>('pushNotificationSettings');
      
      if (settings && settings.enabled && settings.reminderEnabled) {
        console.log('🔔 Smart reminders enabled, scheduling...');
        await this.scheduleSmartMoodReminder();
      }
    } catch (error) {
      console.error('❌ Error checking smart reminders:', error);
    }
  }

  /**
   * Get push token for the device
   */
  private async getPushToken(): Promise<string | null> {
    try {
      // Get the project ID from app.json or constants
      const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId || 
                       (Constants.expoConfig as any)?.projectId ||
                       'your-project-id'; // You'll need to set this

      console.log('🔔 Getting push token for project:', projectId);

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      this.expoPushToken = token.data;
      console.log('🔔 Push token received:', this.expoPushToken);
      return this.expoPushToken;
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      return null;
    }
  }

  /**
   * Schedule a smart mood reminder based on time window
   */
  async scheduleSmartMoodReminder(
    title: string = "Time to Log Your Mood!",
    body: string = "Your mood logging window is now open. Take a moment to reflect on your day."
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      console.log('🔔 Scheduling smart mood reminder based on time window');

      // Cancel any existing mood reminders
      await this.cancelMoodReminders();

      // Get the current time window from TimeWindowService
      const TimeWindowService = require('./TimeWindowService').default;
      const MoodEntryService = require('./MoodEntryService').default;
      const userId = 'demo-user'; // You might want to make this configurable
      
      const currentWindow = await TimeWindowService.getOrCreateDailyWindow(userId);
      if (!currentWindow) {
        console.log('🔔 No time window available, cannot schedule reminder');
        return { success: false, error: 'No time window available' };
      }

      // Check if user has already logged mood today using the same method as email service
      const moodEntries = await MoodEntryService.getMoodEntries(userId);
      const today = new Date().toDateString();
      const hasLoggedToday = moodEntries.some((entry: any) => 
        new Date(entry.timestamp).toDateString() === today
      );

      if (hasLoggedToday) {
        console.log('🔔 User has already logged mood today, no reminder needed');
        return { success: false, error: 'Already logged today' };
      }

      // Calculate when the window starts and ends
      const now = new Date();
      let windowStart = new Date(currentWindow.windowStart);
      let windowEnd = new Date(currentWindow.windowEnd);
      
      console.log('🔔 Time window debug:', {
        now: now.toISOString(),
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        hasLoggedToday,
        isWindowOpen: now >= windowStart && now <= windowEnd
      });
      
      // Check if the window is currently open
      const isWindowOpen = now >= windowStart && now <= windowEnd;

      if (isWindowOpen) {
        // If the window is currently open, send immediate notification
        console.log('🔔 Time window is currently open, sending immediate reminder');
        return await this.sendImmediateNotification(title, body, { 
          type: 'mood_reminder', 
          date: currentWindow.date 
        });
      } else if (windowStart > now) {
        // If the window is in the future, schedule for today
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: 'mood_reminder', date: currentWindow.date },
          },
          trigger: {
            date: windowStart,
          } as any,
        });
        console.log('✅ Smart mood reminder scheduled for window start:', windowStart);
        return { success: true, notificationId };
      } else {
        // Window has already passed, schedule for tomorrow's window
        windowStart.setDate(windowStart.getDate() + 1);
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: 'mood_reminder', date: currentWindow.date },
          },
          trigger: {
            date: windowStart,
          } as any,
        });
        console.log('✅ Smart mood reminder scheduled for tomorrow window start:', windowStart);
        return { success: true, notificationId };
      }
    } catch (error) {
      console.error('❌ Error scheduling smart mood reminder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Schedule a local notification for mood reminder (legacy method)
   */
  async scheduleMoodReminder(
    hour: number,
    minute: number,
    title: string = "Time to Log Your Mood!",
    body: string = "Take a moment to reflect on your day and log your mood."
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      console.log(`🔔 Scheduling mood reminder for ${hour}:${minute}`);

      // Cancel any existing mood reminders
      await this.cancelMoodReminders();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'mood_reminder' },
        },
        trigger: {
          hour,
          minute,
          repeats: true, // Repeat daily
        } as any,
      });

      console.log('✅ Mood reminder scheduled:', notificationId);
      return { success: true, notificationId };
    } catch (error) {
      console.error('❌ Error scheduling mood reminder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Cancel all mood reminder notifications
   */
  async cancelMoodReminders(): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const moodReminders = scheduledNotifications.filter(
        notification => notification.content.data?.type === 'mood_reminder'
      );

      for (const notification of moodReminders) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log('🔔 Cancelled mood reminder:', notification.identifier);
      }
    } catch (error) {
      console.error('❌ Error cancelling mood reminders:', error);
    }
  }

  /**
   * Send immediate notification (for testing)
   */
  async sendImmediateNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      console.log('🔔 Sending immediate notification:', title);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
        },
        trigger: null, // Send immediately
      });

      console.log('✅ Immediate notification sent:', notificationId);
      return { success: true, notificationId };
    } catch (error) {
      console.error('❌ Error sending immediate notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get current notification permissions status
   */
  async getPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(): (() => void) {
    // Handle notification received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received:', notification);
    });

    // Handle notification response (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Notification response:', response);
      // You can navigate to specific screens here based on notification type
      const notificationType = response.notification.request.content.data?.type;
      if (notificationType === 'mood_reminder') {
        // Navigate to mood entry screen
        console.log('🔔 User tapped mood reminder, should navigate to mood entry');
      }
    });

    // Return cleanup function
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }
}

export default PushNotificationService; 