import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import emailNotificationService, { 
  EmailNotificationSettings as EmailSettings 
} from '../services/EmailNotificationService';
import LocalStorageManager from '../services/LocalStorageManager';

interface EmailNotificationSettingsProps {
  onSettingsChange?: (settings: EmailSettings) => void;
}

const EmailNotificationSettings: React.FC<EmailNotificationSettingsProps> = ({
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<EmailSettings>({
    enabled: false,
    userEmail: '',
    userName: '',
    reminderFrequency: 'daily',
    reminderTime: '09:00',
    weeklyReportEnabled: false,
    weeklyReportDay: 'monday'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isTestEmailLoading, setIsTestEmailLoading] = useState(false);
  const [serviceHealth, setServiceHealth] = useState<boolean | null>(null);

  useEffect(() => {
    loadSettings();
    checkServiceHealth();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await LocalStorageManager.retrieveData<EmailSettings>('emailNotificationSettings');
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Error loading email notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: EmailSettings) => {
    try {
      await LocalStorageManager.storeData('emailNotificationSettings', newSettings);
      setSettings(newSettings);
      onSettingsChange?.(newSettings);
      console.log('📧 Email notification settings saved');
    } catch (error) {
      console.error('Error saving email notification settings:', error);
      Alert.alert('Error', 'Failed to save email notification settings');
    }
  };

  const checkServiceHealth = async () => {
    setIsLoading(true);
    try {
      const health = await emailNotificationService.checkServiceHealth();
      setServiceHealth(health);
    } catch (error) {
      console.error('Error checking service health:', error);
      setServiceHealth(false);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!settings.userEmail) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    setIsTestEmailLoading(true);
    try {
      const result = await emailNotificationService.sendTestEmail(settings.userEmail);
      
      if (result.success) {
        Alert.alert(
          'Test Email Sent!',
          'Check your email inbox for a test message from Generative Mood Tracker.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', `Failed to send test email: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send test email. Please check your connection and try again.');
    } finally {
      setIsTestEmailLoading(false);
    }
  };

  const handleSettingChange = (key: keyof EmailSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const getServiceStatusColor = () => {
    if (serviceHealth === null) return '#999';
    return serviceHealth ? '#4CAF50' : '#F44336';
  };

  const getServiceStatusText = () => {
    if (serviceHealth === null) return 'Checking...';
    return serviceHealth ? 'Connected' : 'Not Available';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📧 Email Notifications</Text>
        
        {/* Service Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Service Status:</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusIndicator, { backgroundColor: getServiceStatusColor() }]} />
            <Text style={styles.statusText}>{getServiceStatusText()}</Text>
            {isLoading && <ActivityIndicator size="small" style={styles.loadingIndicator} />}
          </View>
          <TouchableOpacity onPress={checkServiceHealth} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Enable/Disable Switch */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Email Notifications</Text>
          <Switch
            value={settings.enabled}
            onValueChange={(value) => handleSettingChange('enabled', value)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings.enabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        {settings.enabled && (
          <>
            {/* User Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.textInput}
                value={settings.userEmail}
                onChangeText={(value) => handleSettingChange('userEmail', value)}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* User Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <TextInput
                style={styles.textInput}
                value={settings.userName}
                onChangeText={(value) => handleSettingChange('userName', value)}
                placeholder="Enter your name"
                autoCapitalize="words"
              />
            </View>

            {/* Reminder Frequency */}
            <View style={styles.pickerContainer}>
              <Text style={styles.inputLabel}>Reminder Frequency</Text>
              <View style={styles.pickerWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={settings.reminderFrequency}
                  onChangeText={(value: string) => handleSettingChange('reminderFrequency', value as 'daily' | 'weekly' | 'never')}
                  placeholder="daily, weekly, or never"
                />
              </View>
            </View>

            {/* Reminder Time */}
            {settings.reminderFrequency !== 'never' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Reminder Time</Text>
                <TextInput
                  style={styles.textInput}
                  value={settings.reminderTime}
                  onChangeText={(value) => handleSettingChange('reminderTime', value)}
                  placeholder="HH:MM (e.g., 09:00)"
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Weekly Report Settings */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Weekly Mood Report</Text>
              <Switch
                value={settings.weeklyReportEnabled}
                onValueChange={(value) => handleSettingChange('weeklyReportEnabled', value)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={settings.weeklyReportEnabled ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>

            {settings.weeklyReportEnabled && (
              <View style={styles.pickerContainer}>
                <Text style={styles.inputLabel}>Report Day</Text>
                <View style={styles.pickerWrapper}>
                  <TextInput
                    style={styles.textInput}
                    value={settings.weeklyReportDay}
                    onChangeText={(value: string) => handleSettingChange('weeklyReportDay', value as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')}
                    placeholder="monday, tuesday, etc."
                  />
                </View>
              </View>
            )}

            {/* Test Email Button */}
            <TouchableOpacity
              onPress={sendTestEmail}
              disabled={isTestEmailLoading || !settings.userEmail}
              style={[
                styles.testButton,
                (!settings.userEmail || isTestEmailLoading) && styles.testButtonDisabled
              ]}
            >
              {isTestEmailLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.testButtonText}>Send Test Email</Text>
              )}
            </TouchableOpacity>

            {/* Info Text */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                💡 Email notifications will remind you to log your mood and send you weekly reports with your mood statistics.
              </Text>
              <Text style={styles.infoText}>
                📧 Make sure to check your spam folder if you don't receive emails.
              </Text>
            </View>
          </>
        )}
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
    backgroundColor: '#fff',
    margin: 16,
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
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  testButtonDisabled: {
    backgroundColor: '#ccc',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default EmailNotificationSettings; 