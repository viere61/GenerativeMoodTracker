import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import LocalStorageManager from './LocalStorageManager';

// Fixed notification handler - should work like the test notification now
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const notificationData = notification.request.content.data as any;
    const notificationType = notificationData?.type;
    
    console.log('🔔 [NotificationHandler] Processing notification:', {
      type: notificationType,
      currentTime: new Date().toLocaleString(),
      title: notification.request.content.title
    });

    // Allow test notifications
    if (notificationType === 'test_scheduled' || notificationType === 'test') {
      console.log('🔔 [NotificationHandler] ✅ Test notification - allowing through');
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    }

    // For mood reminders, check if window is open
    if (notificationType === 'mood_reminder') {
      const windowStart = notificationData?.windowStart;
      const windowEnd = notificationData?.windowEnd;
      const now = Date.now();
      
      console.log('🔔 [NotificationHandler] Mood reminder timing check:', {
        windowStart: windowStart ? new Date(windowStart).toLocaleString() : 'unknown',
        windowEnd: windowEnd ? new Date(windowEnd).toLocaleString() : 'unknown',
        currentTime: new Date(now).toLocaleString(),
        isWithinWindow: windowStart && windowEnd && now >= windowStart && now <= windowEnd
      });

      // Only show if the current time is within the logging window
      if (windowStart && windowEnd && now >= windowStart && now <= windowEnd) {
        console.log('🔔 [NotificationHandler] ✅ Window is open - showing mood reminder');
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      } else {
        console.log('🔔 [NotificationHandler] ❌ Window not open - blocking mood reminder');
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
    }
    
    // Allow all other notification types
    console.log('🔔 [NotificationHandler] ✅ Allowing other notification type');
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export interface PushNotificationSettings {
  enabled: boolean;
  reminderEnabled: boolean;
}

/**
 * Simple push notification service that only sends notifications at window start time
 */
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

      console.log('✅ Push notifications initialized successfully');
      return { success: true, token };
    } catch (error) {
      console.error('❌ Push notification initialization error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get push token for the device
   */
  private async getPushToken(): Promise<string | null> {
    try {
      const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId || 
                       (Constants.expoConfig as any)?.projectId ||
                       'your-project-id';

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
   * Schedule a notification for when the logging window starts
   */
  async scheduleWindowNotification(
    windowStartTime: number,
    windowEndTime: number,
    title: string = "Time to Log Your Mood!",
    body?: string
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const now = Date.now();
      const windowStart = new Date(windowStartTime);
      const windowEnd = new Date(windowEndTime);
      const minutesUntilWindow = (windowStartTime - now) / (1000 * 60);
      
      console.log('🔔 [scheduleWindowNotification] === SCHEDULING WINDOW NOTIFICATION ===');
      console.log('🔔 [scheduleWindowNotification] Current time:', new Date(now).toLocaleString());
      console.log('🔔 [scheduleWindowNotification] Window start:', windowStart.toLocaleString());
      console.log('🔔 [scheduleWindowNotification] Window end:', windowEnd.toLocaleString());
      console.log('🔔 [scheduleWindowNotification] Minutes until window:', minutesUntilWindow);

      // Only schedule if the window is in the future (at least 1 minute away)
      if (windowStartTime <= now + 60000) { // 1 minute buffer
        console.log('🔔 [scheduleWindowNotification] ❌ Window start time is too soon or in the past');
        console.log('🔔 [scheduleWindowNotification] ❌ Not scheduling notification');
        return { success: false, error: 'Window start time is not far enough in the future' };
      }

      // Cancel any existing mood reminder notifications FIRST
      console.log('🔔 [scheduleWindowNotification] Cancelling existing notifications...');
      await this.cancelAllMoodReminders();

      // Double-check we cancelled everything
      const remainingNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const remainingMoodReminders = remainingNotifications.filter(n => n.content.data?.type === 'mood_reminder');
      if (remainingMoodReminders.length > 0) {
        console.log('🔔 [scheduleWindowNotification] ⚠️ Warning: Still have remaining mood reminders:', remainingMoodReminders.length);
      }

      // Create the notification body
      const notificationBody = body || 
        `Your mood logging window is now open. You can log your mood until ${windowEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;

      console.log('🔔 [scheduleWindowNotification] Scheduling notification with Expo...');
      console.log('🔔 [scheduleWindowNotification] Title:', title);
      console.log('🔔 [scheduleWindowNotification] Body:', notificationBody);
      console.log('🔔 [scheduleWindowNotification] Trigger date:', windowStart.toISOString());
      console.log('🔔 [scheduleWindowNotification] NOTE: In Expo Go, notifications may fire immediately for testing');

      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: notificationBody,
          data: { 
            type: 'mood_reminder',
            windowStart: windowStartTime,
            windowEnd: windowEndTime,
            scheduledAt: now // Track when this was scheduled
          },
        },
        trigger: {
          type: 'date',
          date: windowStart,
        } as any,
      });

      console.log('🔔 [scheduleWindowNotification] ✅ Notification scheduled successfully!');
      console.log('🔔 [scheduleWindowNotification] ✅ Notification ID:', notificationId);
      console.log('🔔 [scheduleWindowNotification] ✅ Will fire at:', windowStart.toLocaleString());
      console.log('🔔 [scheduleWindowNotification] ✅ Minutes from now:', minutesUntilWindow);
      console.log('🔔 [scheduleWindowNotification] === END SCHEDULING ===');

      return { success: true, notificationId };
    } catch (error) {
      console.error('❌ [scheduleWindowNotification] Error scheduling window notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Cancel all mood reminder notifications
   */
  async cancelAllMoodReminders(): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      console.log('🔔 [cancelAllMoodReminders] Total scheduled notifications:', scheduledNotifications.length);
      
      const moodReminders = scheduledNotifications.filter(
        notification => notification.content.data?.type === 'mood_reminder'
      );

      console.log('🔔 [cancelAllMoodReminders] Mood reminder notifications to cancel:', moodReminders.length);

      for (const notification of moodReminders) {
        const triggerInfo = notification.trigger ? 
          (notification.trigger as any).date ? 
            `scheduled for ${new Date((notification.trigger as any).date).toLocaleString()}` : 
            'immediate trigger' :
          'no trigger';
        
        console.log(`🔔 [cancelAllMoodReminders] Cancelling: ${notification.identifier} (${triggerInfo})`);
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

      console.log(`🔔 [cancelAllMoodReminders] Successfully cancelled ${moodReminders.length} mood reminder notifications`);
    } catch (error) {
      console.error('❌ [cancelAllMoodReminders] Error cancelling mood reminders:', error);
    }
  }

  /**
   * Send immediate test notification
   */
  async sendTestNotification(
    title: string = "Test Notification",
    body: string = "This is a test notification from the mood tracker."
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      console.log('🔔 Sending test notification:', title);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'test' },
        },
        trigger: null, // Send immediately
      });

      console.log('✅ Test notification sent:', notificationId);
      return { success: true, notificationId };
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Test scheduled notification with simple 2-minute delay
   */
  async sendTestScheduledNotification(): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const now = new Date();
      const testTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
      
      console.log('🧪 [TEST] Scheduling simple test notification...');
      console.log('🧪 [TEST] Current time:', now.toLocaleString());
      console.log('🧪 [TEST] Will fire at:', testTime.toLocaleString());

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🧪 Test Scheduled Notification",
          body: `This should appear at ${testTime.toLocaleTimeString()}`,
          data: { 
            type: 'test_scheduled',
            scheduledFor: testTime.getTime()
          },
        },
        trigger: {
          type: 'date',
          date: testTime,
        } as any,
      });

      console.log('🧪 [TEST] ✅ Simple scheduled notification created:', notificationId);
      return { success: true, notificationId };
    } catch (error) {
      console.error('🧪 [TEST] ❌ Error scheduling test notification:', error);
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
   * Get all scheduled notifications with detailed logging
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    
    console.log('🔔 [getScheduledNotifications] Currently scheduled notifications:', notifications.length);
    notifications.forEach((notification, index) => {
      const data = notification.content.data as any;
      const trigger = notification.trigger as any;
      console.log(`🔔 [getScheduledNotifications] ${index + 1}:`, {
        id: notification.identifier,
        title: notification.content.title,
        type: data?.type,
        scheduledFor: trigger?.date ? new Date(trigger.date).toLocaleString() : 'immediate',
        windowStart: data?.windowStart ? new Date(data.windowStart).toLocaleString() : 'N/A',
        windowEnd: data?.windowEnd ? new Date(data.windowEnd).toLocaleString() : 'N/A'
      });
    });
    
    return notifications;
  }

  /**
   * Schedule notifications for multiple windows
   */
  async scheduleMultiDayNotifications(windows: any[]): Promise<{ 
    success: boolean; 
    scheduledCount: number; 
    errors: string[] 
  }> {
    const results = {
      success: true,
      scheduledCount: 0,
      errors: [] as string[]
    };

    console.log('🗓️ [scheduleMultiDayNotifications] Scheduling notifications for', windows.length, 'windows');

    // Cancel all existing notifications ONCE at the beginning
    console.log('🗓️ [scheduleMultiDayNotifications] Cancelling all existing notifications first...');
    await this.cancelAllMoodReminders();

    for (const window of windows) {
      try {
        const now = Date.now();
        const windowStart = window.windowStart;
        
        // Only schedule if window is in the future (at least 1 minute away)
        if (windowStart <= now + 60000) {
          console.log('🗓️ [scheduleMultiDayNotifications] Skipping past/near window:', new Date(windowStart).toLocaleString());
          continue;
        }

        // Schedule WITHOUT cancelling (we already cancelled all at the beginning)
        const result = await this.scheduleWindowNotificationWithoutCancel(
          window.windowStart,
          window.windowEnd,
          "Time to Log Your Mood!",
          `Your mood logging window is now open. You can log your mood until ${new Date(window.windowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        );

        if (result.success) {
          results.scheduledCount++;
          console.log('🗓️ [scheduleMultiDayNotifications] ✅ Scheduled for:', new Date(windowStart).toLocaleString());
        } else {
          results.errors.push(`Failed to schedule for ${new Date(windowStart).toLocaleString()}: ${result.error}`);
        }
      } catch (error) {
        const errorMsg = `Error scheduling for window: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error('🗓️ [scheduleMultiDayNotifications] ❌', errorMsg);
      }
    }

    if (results.errors.length > 0) {
      results.success = false;
    }

    console.log('🗓️ [scheduleMultiDayNotifications] Summary:', {
      scheduled: results.scheduledCount,
      errors: results.errors.length,
      success: results.success
    });

    return results;
  }

  /**
   * Schedule a notification for when the logging window starts (without cancelling existing notifications)
   */
  async scheduleWindowNotificationWithoutCancel(
    windowStartTime: number,
    windowEndTime: number,
    title: string = "Time to Log Your Mood!",
    body?: string
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const now = Date.now();
      const windowStart = new Date(windowStartTime);
      const windowEnd = new Date(windowEndTime);
      const minutesUntilWindow = (windowStartTime - now) / (1000 * 60);
      
      console.log('🔔 [scheduleWindowNotificationWithoutCancel] Scheduling for:', windowStart.toLocaleString());

      // Only schedule if the window is in the future (at least 1 minute away)
      if (windowStartTime <= now + 60000) { // 1 minute buffer
        console.log('🔔 [scheduleWindowNotificationWithoutCancel] ❌ Window start time is too soon or in the past');
        return { success: false, error: 'Window start time is not far enough in the future' };
      }

      // Create the notification body
      const notificationBody = body || 
        `Your mood logging window is now open. You can log your mood until ${windowEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;

      // Schedule the notification (WITHOUT cancelling existing ones)
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: notificationBody,
          data: { 
            type: 'mood_reminder',
            windowStart: windowStartTime,
            windowEnd: windowEndTime,
            scheduledAt: now // Track when this was scheduled
          },
        },
        trigger: {
          type: 'date',
          date: windowStart,
        } as any,
      });

      console.log('🔔 [scheduleWindowNotificationWithoutCancel] ✅ Scheduled for:', windowStart.toLocaleString(), '(ID:', notificationId, ')');

      return { success: true, notificationId };
    } catch (error) {
      console.error('❌ [scheduleWindowNotificationWithoutCancel] Error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Handle mood reminder notifications and ensure future windows exist
   */
  private async handleEarlyMoodReminder(notification: any) {
    const notificationData = notification.request.content.data;
    const windowStart = notificationData?.windowStart;
    const windowEnd = notificationData?.windowEnd;
    const now = Date.now();
    
    console.log('🔔 [handleEarlyMoodReminder] Mood reminder received:', {
      windowStart: windowStart ? new Date(windowStart).toLocaleString() : 'unknown',
      windowEnd: windowEnd ? new Date(windowEnd).toLocaleString() : 'unknown',
      currentTime: new Date(now).toLocaleString(),
      isWithinWindow: windowStart && windowEnd && now >= windowStart && now <= windowEnd
    });

    // Smart listener: Ensure tomorrow's window exists when user gets notification
    if (windowStart && windowEnd && now >= windowStart && now <= windowEnd) {
      console.log('🔔 [handleEarlyMoodReminder] Window is open - ensuring tomorrow\'s window exists...');
      try {
        const TimeWindowService = (await import('./TimeWindowService')).default;
        const tomorrowWindow = await TimeWindowService.ensureTomorrowWindowExists('demo-user');
        
        if (tomorrowWindow) {
          // Schedule notification for tomorrow's window
          const result = await this.scheduleWindowNotification(
            tomorrowWindow.windowStart,
            tomorrowWindow.windowEnd,
            "Time to Log Your Mood!",
            `Your mood logging window is now open. You can log your mood until ${new Date(tomorrowWindow.windowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
          );
          
          if (result.success) {
            console.log('🔔 [handleEarlyMoodReminder] ✅ Scheduled notification for tomorrow\'s window');
          } else {
            console.log('🔔 [handleEarlyMoodReminder] ❌ Failed to schedule tomorrow\'s notification:', result.error);
          }
        }
      } catch (error) {
        console.error('🔔 [handleEarlyMoodReminder] Error ensuring tomorrow\'s window:', error);
      }
    }
  }



  /**
   * Set up notification listeners
   */
  setupNotificationListeners(): (() => void) {
    // Handle notification received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 [NotificationListener] Notification received:', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data
      });

      const notificationData = notification.request.content.data;
      const notificationType = notificationData?.type;

      // Handle mood reminder notifications that fire early in Expo Go
      if (notificationType === 'mood_reminder') {
        this.handleEarlyMoodReminder(notification);
      }
    });

    // Handle notification response (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 [NotificationResponse] Notification tapped:', {
        title: response.notification.request.content.title,
        data: response.notification.request.content.data
      });
      
      // Navigate to mood entry if it's a mood reminder
      const notificationType = response.notification.request.content.data?.type;
      if (notificationType === 'mood_reminder' || notificationType === 'window_open') {
        console.log('🔔 [NotificationResponse] User tapped mood reminder, should navigate to mood entry');
        // Navigation logic would go here
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