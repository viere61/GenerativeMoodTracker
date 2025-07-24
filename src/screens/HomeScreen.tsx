import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { TimeWindowValidator } from '../utils/TimeWindowValidator';
import TimeWindowService from '../services/TimeWindowService';
import PushNotificationService from '../services/PushNotificationService';
import TimeWindowCountdown from '../components/TimeWindowCountdown';
import UserPreferencesService from '../services/UserPreferencesService';
// import MusicDebugPanel from '../components/MusicDebugPanel';
import MoodEntryService from '../services/MoodEntryService';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showTimeRangeSelector, setShowTimeRangeSelector] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('21:00');
  const [timeWindowStatus, setTimeWindowStatus] = useState<{
    canLog: boolean;
    message: string;
    windowStart?: number;
    windowEnd?: number;
  }>({
    canLog: false,
    message: 'Set your preferred time range to get started',
  });

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

        // Set times from preferences
        setStartTime(preferences.preferredTimeRange.start);
        setEndTime(preferences.preferredTimeRange.end);

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

  // Function to update time range preferences
  const updateTimeRange = async (newStartTime: string, newEndTime: string) => {
    try {
      setLoading(true);
      const userId = 'demo-user';

      // Update preferences
      await UserPreferencesService.updatePreferredTimeRange(userId, {
        start: newStartTime,
        end: newEndTime
      });

      // Update local state
      setStartTime(newStartTime);
      setEndTime(newEndTime);

      // Cancel any existing notifications
      await pushNotificationService.cancelAllMoodReminders();
      
      // Reset time window for today
      const newWindow = await TimeWindowService.resetWindow(userId);

      // Schedule notification for the new window if it's in the future
      const now = Date.now();
      const timeUntilWindow = newWindow.windowStart - now;

      console.log('Time until new window start:', {
        now: new Date(now).toLocaleString(),
        windowStart: new Date(newWindow.windowStart).toLocaleString(),
        timeUntilWindow: timeUntilWindow / 1000 / 60 + ' minutes'
      });

      if (timeUntilWindow > 5 * 60 * 1000) { // 5 minutes in milliseconds
        console.log('Scheduling notification for new window');
        await pushNotificationService.scheduleWindowNotification(
          newWindow.windowStart,
          newWindow.windowEnd
        );
      } else {
        console.log('New window is too soon, not scheduling notification');
      }

      // Check new time window
      await checkTimeWindow();

      setShowTimeRangeSelector(false);
    } catch (error) {
      console.error('Error updating time range:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to check the current time window status
  const checkTimeWindow = useCallback(async () => {
    try {
      const userId = 'demo-user';
      const result = await TimeWindowService.canLogMood(userId);
      
      setTimeWindowStatus({
        canLog: result.canLog,
        message: result.message,
        windowStart: result.window.windowStart,
        windowEnd: result.window.windowEnd,
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

  // Reset time window for testing (would be in settings in real app)
  const handleResetTimeWindow = async () => {
    const userId = 'demo-user';

    try {
      setLoading(true);
      // Cancel any existing notifications
      await pushNotificationService.cancelAllMoodReminders();
      // Reset the time window
      const newWindow = await TimeWindowService.resetWindow(userId);

      // Only schedule a notification if the window is at least 5 minutes in the future
      // This prevents immediate notifications when resetting the window
      const now = Date.now();
      const windowStart = newWindow.windowStart;
      const timeUntilWindow = windowStart - now;

      console.log('Time until window start:', {
        now: new Date(now).toLocaleString(),
        windowStart: new Date(windowStart).toLocaleString(),
        timeUntilWindow: timeUntilWindow / 1000 / 60 + ' minutes'
      });

      // Always try to schedule notification if window is in the future
      // The PushNotificationService will handle the validation
      console.log('🏠 [handleResetTimeWindow] Attempting to schedule notification...');
      const scheduleResult = await pushNotificationService.scheduleWindowNotification(
        newWindow.windowStart,
        newWindow.windowEnd
      );
      
      if (scheduleResult.success) {
        console.log('🏠 [handleResetTimeWindow] ✅ Notification scheduled successfully');
      } else {
        console.log('🏠 [handleResetTimeWindow] ❌ Failed to schedule notification:', scheduleResult.error);
      }

      await checkTimeWindow();
    } catch (error) {
      console.error('Error resetting time window:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send a test notification
  const handleTestNotification = async () => {
    // Send a test notification
    await pushNotificationService.sendTestNotification(
      'Test Notification',
      'This is a test notification to verify push notifications are working.'
    );
  };

  // Send a test scheduled notification (for debugging)
  const handleTestScheduledNotification = async () => {
    const result = await pushNotificationService.sendTestScheduledNotification();
    if (result.success) {
      alert('Test scheduled notification created! It should appear in 2 minutes.');
    } else {
      alert('Failed to create test notification: ' + result.error);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.title}>Generative Mood Tracker</Text>

      {/* Current Time Range Display */}
      <View style={styles.timeRangeDisplay}>
        <Text style={styles.timeRangeLabel}>Current Time Range:</Text>
        <Text style={styles.timeRangeText}>{startTime} - {endTime}</Text>
        <TouchableOpacity
          style={styles.editTimeButton}
          onPress={() => setShowTimeRangeSelector(!showTimeRangeSelector)}
        >
          <Text style={styles.editTimeButtonText}>
            {showTimeRangeSelector ? 'Cancel' : 'Edit Time Range'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Time Range Selector */}
      {showTimeRangeSelector && (
        <View style={styles.timeRangeSelector}>
          <Text style={styles.selectorTitle}>Select Your Preferred Time Range</Text>
          <Text style={styles.selectorDescription}>
            Choose when you're typically available. We'll randomly select a 1-hour window within this range each day.
          </Text>

          <View style={styles.timePickerRow}>
            <Text style={styles.timeLabel}>Start Time:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScrollView}>
              <View style={styles.timeButtons}>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  const time = `${hour}:00`;
                  return (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeButton,
                        startTime === time && styles.selectedTimeButton
                      ]}
                      onPress={() => setStartTime(time)}
                    >
                      <Text style={[
                        styles.timeButtonText,
                        startTime === time && styles.selectedTimeButtonText
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={styles.timePickerRow}>
            <Text style={styles.timeLabel}>End Time:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScrollView}>
              <View style={styles.timeButtons}>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  const time = `${hour}:00`;
                  return (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeButton,
                        endTime === time && styles.selectedTimeButton
                      ]}
                      onPress={() => setEndTime(time)}
                    >
                      <Text style={[
                        styles.timeButtonText,
                        endTime === time && styles.selectedTimeButtonText
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <Text style={styles.selectedRange}>
            Your window will be between {startTime} and {endTime}
          </Text>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => updateTimeRange(startTime, endTime)}
          >
            <Text style={styles.saveButtonText}>Save Time Range</Text>
          </TouchableOpacity>
        </View>
      )}

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
          <Text style={styles.windowText}>Your mood logging window is open!</Text>
                      <Text style={styles.windowTimeText}>
              Available until {timeWindowStatus.windowEnd ? new Date(timeWindowStatus.windowEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
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
            />
          )}

                      {/* Show next window info when current window has passed */}
            {timeWindowStatus.windowStart && timeWindowStatus.windowEnd && Date.now() > timeWindowStatus.windowEnd && (
              <View style={styles.nextWindowInfo}>
                <Text style={styles.nextWindowText}>
                  Next window opens at {new Date(timeWindowStatus.windowStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  {new Date(timeWindowStatus.windowStart).toDateString() !== new Date().toDateString() ? ' tomorrow' : ' today'}
                </Text>
              </View>
            )}
        </View>
      )}

      {/* This button would be in settings in the real app */}
      <View style={styles.devControls}>
        <Text style={styles.devTitle}>Developer Controls</Text>
        <View style={styles.buttonRow}>
          <Button
            title="Reset Time Window"
            onPress={handleResetTimeWindow}
          />
        </View>
        <View style={styles.buttonRow}>
          <Button
            title="Test Notification"
            onPress={handleTestNotification}
          />
        </View>
        <View style={styles.buttonRow}>
          <Button
            title="🧪 Test Scheduled Notification (2 min)"
            onPress={handleTestScheduledNotification}
          />
        </View>
      </View>

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
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
    backgroundColor: '#e6f7ff',
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  windowClosed: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  windowText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  windowTimeText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  devControls: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#ffe6e6',
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  devTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonRow: {
    marginVertical: 5,
    width: '100%',
  },
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