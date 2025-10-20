import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { TimeWindowValidator } from '../utils/TimeWindowValidator';
import TimeWindowService from '../services/TimeWindowService';
import PushNotificationService from '../services/PushNotificationService';
import TimeWindowCountdown from '../components/TimeWindowCountdown';
import WeeklySoundService from '../services/WeeklySoundService';
import UserPreferencesService from '../services/UserPreferencesService';
// import MusicDebugPanel from '../components/MusicDebugPanel';
import MoodEntryService from '../services/MoodEntryService';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  // Time range UI moved to Settings
  const [timeWindowStatus, setTimeWindowStatus] = useState<{
    canLog: boolean;
    message: string;
    windowStart?: number;
    windowEnd?: number;
  }>({
    canLog: false,
    message: 'Set your preferred time range to get started',
  });
  const [hour12, setHour12] = useState<boolean>(true);

  // formatTime no longer needed on Home; kept in Settings

  const pushNotificationService = PushNotificationService.getInstance();

  // Initialize user preferences and check notification permissions on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);

        // Check notification permissions
        const result = await pushNotificationService.initialize();
        setNotificationsEnabled(result.success);

        // Always use demo user for now
        const demoUserId = 'demo-user';

        // Try to load existing preferences
        let preferences = await UserPreferencesService.getPreferences(demoUserId);

        if (!preferences) {
          // Initialize default preferences if none exist
          preferences = await UserPreferencesService.initializePreferences(demoUserId, {
            preferredTimeRange: { start: '09:00', end: '21:00' },
            notifications: true,
            theme: 'light',
            audioQuality: 'high'
          });
        }

        // Update time format only (time range UI is in Settings)
        setHour12((preferences.timeFormat ?? '12h') === '12h');

        // Check time window status
        await checkTimeWindow();

      } catch (error) {
        console.error('Error initializing app:', error);
        setTimeWindowStatus({
          canLog: false,
          message: 'Error initializing app. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Time range update moved to Settings

  // Function to check the current time window status
  const checkTimeWindow = useCallback(async () => {
    try {
      const userId = 'demo-user';
      const result = await TimeWindowService.canLogMood(userId);
      
      // If user has already logged today, show that message and tomorrow's window time
      if (result.window.hasLogged) {
        // Get tomorrow's window (or later) since user has already logged today
        const nextWindow = await TimeWindowService.getNextWindowAfterToday(userId);
        
        setTimeWindowStatus({
          canLog: false,
          message: result.message,
          windowStart: nextWindow?.windowStart,
          windowEnd: nextWindow?.windowEnd,
        });
        return;
      }
      
      // If current window has passed AND user hasn't logged, get the next available window for display
      let displayWindow = result.window;
      if (!result.canLog && !result.window.hasLogged && Date.now() > result.window.windowEnd) {
        const nextWindow = await TimeWindowService.getNextAvailableWindow(userId);
        if (nextWindow) {
          displayWindow = nextWindow;
        }
      }
      
      setTimeWindowStatus({
        canLog: result.canLog,
        message: result.message,
        windowStart: displayWindow.windowStart,
        windowEnd: displayWindow.windowEnd,
      });
    } catch (error) {
      console.error('Error checking time window:', error);
      setTimeWindowStatus({
        canLog: false,
        message: 'Error checking time window. Please try again.',
      });
    }
  }, []);

  // Check time window when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Refresh preferences to reflect time format toggles made in Settings
      (async () => {
        const prefs = await UserPreferencesService.getPreferences('demo-user');
        if (prefs) {
          setHour12((prefs.timeFormat ?? '12h') === '12h');
        }
      })();

      // Just check the time window status without sending any notifications
      checkTimeWindow();
    }, [checkTimeWindow])
  );

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await checkTimeWindow();
    setRefreshing(false);
  };

  // Sound of the Week shortcut removed per request

  // Handle countdown completion
  const handleCountdownComplete = async () => {
    // Just check the time window status without sending any notifications
    await checkTimeWindow();

    // No fallback notification - we only want the scheduled notification at window start
  };

  // Request notification permissions
  const handleEnableNotifications = async () => {
    const result = await pushNotificationService.initialize();
    setNotificationsEnabled(result.success);

    if (result.success) {
      await checkTimeWindow();
    }
  };

  // Reset time window for testing (moved out with Developer Controls)
  const handleResetTimeWindow = async () => {
    const userId = 'demo-user';

    try {
      setLoading(true);
      console.log('🏠 [handleResetTimeWindow] Starting time window reset with multi-day scheduling...');
      
      // Cancel ALL existing notifications (more aggressive)
      await pushNotificationService.cancelAllNotifications();
      
      // Reset the time window (creates today's window)
      const newWindow = await TimeWindowService.resetWindow(userId);
      console.log('🏠 [handleResetTimeWindow] ✅ Reset today\'s window');

      // Create multi-day windows (7 days including today)
      const multiDayWindows = await TimeWindowService.createMultiDayWindows(userId, 30);
      console.log('🏠 [handleResetTimeWindow] ✅ Created', multiDayWindows.length, 'multi-day windows');

      // Log today's window details to verify it's correct
      const todayWindow = multiDayWindows.find(w => w.date === new Date().toISOString().split('T')[0]);
      if (todayWindow) {
        console.log('🏠 [handleResetTimeWindow] Today\'s window details:', {
          date: todayWindow.date,
          windowStart: new Date(todayWindow.windowStart).toLocaleString(),
          windowEnd: new Date(todayWindow.windowEnd).toLocaleString(),
          minutesFromNow: (todayWindow.windowStart - Date.now()) / 1000 / 60
        });
      }

      // Schedule notifications for all future windows
      const scheduleResult = await pushNotificationService.scheduleMultiDayNotifications(multiDayWindows);
      
      if (scheduleResult.success) {
        console.log('🏠 [handleResetTimeWindow] ✅ Multi-day notifications scheduled successfully:', scheduleResult.scheduledCount, 'notifications');
      } else {
        console.log('🏠 [handleResetTimeWindow] ⚠️ Some notifications failed to schedule:', scheduleResult.errors);
      }

      // Add a small delay to ensure all storage operations are complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await checkTimeWindow();
      
      console.log('🏠 [handleResetTimeWindow] ✅ UI refreshed with new window data');
    } catch (error) {
      console.error('Error resetting time window:', error);
    } finally {
      setLoading(false);
    }
  };

  // Developer test helpers removed from UI

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Time range UI moved to Settings */}

      {!notificationsEnabled && (
        <TouchableOpacity
          style={styles.notificationBanner}
          onPress={handleEnableNotifications}
        >
          <Text style={styles.notificationText}>
            Enable notifications to be alerted when your mood logging window opens
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Checking your time window...</Text>
        </View>
      ) : timeWindowStatus.canLog ? (
        <View style={styles.windowOpen}>
          <Text style={styles.windowText}>Your mood logging window is open</Text>
          <Text style={styles.windowTimeText}>
              Available until {timeWindowStatus.windowEnd ? new Date(timeWindowStatus.windowEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12 }) : ''}
            </Text>
          <Button
            title="Log Your Mood"
            onPress={() => navigation.navigate('MoodEntry')}
          />
          
        </View>
      ) : (
        <View style={styles.windowClosed}>
          <Text style={styles.windowText}>Your mood logging window is closed</Text>
          <Text style={styles.messageText}>{timeWindowStatus.message}</Text>

          {timeWindowStatus.windowStart && timeWindowStatus.windowEnd && (
            <TimeWindowCountdown
              nextWindowTime={timeWindowStatus.windowStart}
              windowEndTime={timeWindowStatus.windowEnd}
              onCountdownComplete={handleCountdownComplete}
              hour12={hour12}
            />
          )}

          {/* Next window info removed per request */}
          
        </View>
      )}

      {/* Developer controls removed */}

      {/* Music Generation Debug Panel removed to prevent automatic tests */}
      {/* <MusicDebugPanel userId="demo-user" /> */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  // Title removed for a cleaner headerless look
  timeRangeDisplay: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  timeRangeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timeRangeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  editTimeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editTimeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  timeRangeSelector: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  selectorDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  timePickerRow: {
    marginBottom: 20,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  timeScrollView: {
    maxHeight: 50,
  },
  timeButtons: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
  },
  selectedTimeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeButtonText: {
    fontSize: 12,
    color: '#333',
  },
  selectedTimeButtonText: {
    color: 'white',
  },
  selectedRange: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
    color: '#666',
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationBanner: {
    backgroundColor: '#ffe8cc',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  notificationText: {
    color: '#663c00',
    textAlign: 'center',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  windowOpen: {
    padding: 20,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  windowClosed: {
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  windowText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  windowTimeText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Developer control styles removed
  nextWindowInfo: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  nextWindowText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default HomeScreen;