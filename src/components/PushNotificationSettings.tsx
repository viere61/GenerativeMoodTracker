import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import PushNotificationService, { PushNotificationSettings as PushNotificationSettingsType } from '../services/PushNotificationService';
import LocalStorageManager from '../services/LocalStorageManager';

interface PushNotificationSettingsProps {
  onSettingsChange?: (settings: PushNotificationSettingsType) => void;
}

const PushNotificationSettings: React.FC<PushNotificationSettingsProps> = ({
  onSettingsChange,
}) => {
  const [settings, setSettings] = useState<PushNotificationSettingsType>({
    enabled: true,
    reminderEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [permissionsStatus, setPermissionsStatus] = useState<string>('unknown');

  const pushNotificationService = PushNotificationService.getInstance();

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await LocalStorageManager.retrieveData<PushNotificationSettingsType>('pushNotificationSettings');
      if (storedSettings) {
        setSettings(storedSettings);
      } else {
        // If no stored settings, set defaults to ON
        setSettings({ enabled: true, reminderEnabled: true });
        await LocalStorageManager.storeData('pushNotificationSettings', { enabled: true, reminderEnabled: true });
      }
    } catch (error) {
      console.error('Error loading push notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: PushNotificationSettingsType) => {
    try {
      await LocalStorageManager.storeData('pushNotificationSettings', newSettings);
      setSettings(newSettings);
      onSettingsChange?.(newSettings);
    } catch (error) {
      console.error('Error saving push notification settings:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      const status = await pushNotificationService.getPermissionsStatus();
      setPermissionsStatus(status.status);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const initializePushNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await pushNotificationService.initialize();
      if (result.success) {
        console.log('✅ Push notifications initialized');
        await checkPermissions();
        Alert.alert('Success', 'Push notifications enabled successfully!');
      } else {
        console.log('❌ Push notifications initialization failed:', result.error);
        Alert.alert('Error', `Failed to enable push notifications: ${result.error}`);
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      Alert.alert('Error', 'Failed to initialize push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableToggle = async (value: boolean) => {
    if (value) {
      // Enable push notifications
      setIsLoading(true);
      try {
        const result = await pushNotificationService.initialize();
        if (result.success) {
          console.log('✅ Push notifications initialized');
          await checkPermissions();
          const newSettings = { ...settings, enabled: true };
          await saveSettings(newSettings);
          Alert.alert('Success', 'Push notifications enabled successfully!');
        } else {
          console.log('❌ Push notifications initialization failed:', result.error);
          Alert.alert('Error', `Failed to enable push notifications: ${result.error}`);
          // Don't save settings if initialization failed
          return;
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error);
        Alert.alert('Error', 'Failed to initialize push notifications');
        // Don't save settings if initialization failed
        return;
      } finally {
        setIsLoading(false);
      }
    } else {
      // Disable push notifications
      await pushNotificationService.cancelAllMoodReminders();
      const newSettings = { ...settings, enabled: false, reminderEnabled: false };
      await saveSettings(newSettings);
      Alert.alert('Disabled', 'Push notifications have been disabled');
    }
  };

  const handleReminderToggle = async (value: boolean) => {
    if (value && !settings.enabled) {
      Alert.alert('Error', 'Please enable push notifications first');
      return;
    }

    if (value) {
      // Schedule smart reminder based on time window
      try {
        const TimeWindowService = (await import('../services/TimeWindowService')).default;
        const window = await TimeWindowService.getCurrentWindow('demo-user');
        
        // Only schedule if window is in the future
        if (window.windowStart > Date.now()) {
          const result = await pushNotificationService.scheduleWindowNotification(
            window.windowStart,
            window.windowEnd
          );
          if (result.success) {
            const newSettings = { ...settings, reminderEnabled: true };
            await saveSettings(newSettings);
            Alert.alert('Success', 'Smart mood reminder enabled! You\'ll be notified when your daily mood logging window opens.');
          } else {
            Alert.alert('Error', `Failed to schedule reminder: ${result.error}`);
          }
        } else {
          const newSettings = { ...settings, reminderEnabled: true };
          await saveSettings(newSettings);
          Alert.alert('Success', 'Smart mood reminder enabled! You\'ll be notified for tomorrow\'s window.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to schedule reminder');
      }
    } else {
      // Cancel reminders
      await pushNotificationService.cancelAllMoodReminders();
      const newSettings = { ...settings, reminderEnabled: false };
      await saveSettings(newSettings);
      Alert.alert('Cancelled', 'Mood reminders have been cancelled');
    }
  };

  const testNotification = async () => {
    try {
      const result = await pushNotificationService.sendTestNotification(
        'Test Notification',
        'This is a test notification from your mood tracker!'
      );
      if (result.success) {
        Alert.alert('Success', 'Test notification sent!');
      } else {
        Alert.alert('Error', `Failed to send test notification: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionsStatus) {
      case 'granted':
        return '✅ Granted';
      case 'denied':
        return '❌ Denied';
      case 'undetermined':
        return '❓ Not Determined';
      default:
        return '❓ Unknown';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <Text style={styles.description}>
          Receive notifications to remind you to log your mood, even when the app is not running.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Enable Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Allow the app to send you notifications
            </Text>
            <Text style={styles.permissionStatus}>
              Permission Status: {getPermissionStatusText()}
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={handleEnableToggle}
            disabled={isLoading}
          />
        </View>
      </View>

      {settings.enabled && (
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Daily Mood Reminders</Text>
                          <Text style={styles.settingDescription}>
              Get notified when your daily mood logging window opens
            </Text>
            </View>
            <Switch
              value={settings.reminderEnabled}
              onValueChange={handleReminderToggle}
              disabled={isLoading}
            />
          </View>
        </View>
      )}

      {settings.enabled && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={testNotification}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.note}>
          💡 Note: Push notifications work best with development builds. 
          In Expo Go, notifications may have limited functionality.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  permissionStatus: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

export default PushNotificationSettings; 