import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Button, Alert, Modal, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import DataExportModal from '../components/DataExportModal';
import EmailNotificationSettings from '../components/EmailNotificationSettings';
import PushNotificationSettings from '../components/PushNotificationSettings';
import useUserPreferences from '../hooks/useUserPreferences';
import TimeWindowService from '../services/TimeWindowService';
import PushNotificationService from '../services/PushNotificationService';
import MoodEntryService from '../services/MoodEntryService';
import { AntDesign } from '@expo/vector-icons';

const SettingsScreen = () => {
  // State for modals
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [timeRangeModalVisible, setTimeRangeModalVisible] = useState(false);
  const [privacySettingsModalVisible, setPrivacySettingsModalVisible] = useState(false);
  
  // State for time range inputs
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('21:00');
  
  // State for accordion open/close
  const [emailAccordionOpen, setEmailAccordionOpen] = useState(false);
  const [pushAccordionOpen, setPushAccordionOpen] = useState(false);
  
  // Use demo user for web compatibility
  const userId = 'demo-user';
  
  // Get user preferences
  const { 
    preferences, 
    isLoading, 
    error, 
    updatePreference, 
    updatePreferredTimeRange 
  } = useUserPreferences();
  
  // Initialize state from preferences
  useEffect(() => {
    if (preferences) {
      if (preferences.preferredTimeRange) {
        setStartTime(preferences.preferredTimeRange.start);
        setEndTime(preferences.preferredTimeRange.end);
      }
    }
  }, [preferences]);
  
  // Handle reset daily log status
  const handleResetDailyLog = async () => {
    try {
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      
              await TimeWindowService.resetWindow(userId);
      await MoodEntryService.deleteTodaysMoodEntry(userId);
      Alert.alert('Success', 'Daily log status has been reset. You can now log a new mood entry today.');
    } catch (error) {
      console.error('Reset daily log error:', error);
      Alert.alert('Error', 'Failed to reset daily log status');
    }
  };
  
  // Handle notifications toggle
  const handleNotificationsToggle = async (value: boolean) => {
    try {
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      
      // Update the preference
      await updatePreference('notifications', value);
      
      // If enabling notifications, request permissions
      if (value) {
        const permissionsGranted = await PushNotificationService.getInstance().getPermissionsStatus();
        if (!permissionsGranted) {
          Alert.alert(
            'Notification Permission Required',
            'Please enable notifications in your device settings to receive mood logging reminders.',
            [{ text: 'OK' }]
          );
          // Revert the preference if permissions were denied
          await updatePreference('notifications', false);
        }
      } else {
        // If disabling, cancel all scheduled notifications
        await PushNotificationService.getInstance().cancelAllMoodReminders();
      }
    } catch (error) {
      console.error('Notifications toggle error:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };
  
  // Handle theme toggle
  const handleThemeToggle = async (value: boolean) => {
    try {
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      
      // Update the preference
      await updatePreference('theme', value ? 'dark' : 'light');
    } catch (error) {
      console.error('Theme toggle error:', error);
      Alert.alert('Error', 'Failed to update theme settings');
    }
  };
  
  // Handle audio quality toggle
  const handleAudioQualityToggle = async (value: boolean) => {
    try {
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      
      // Update the preference
      await updatePreference('audioQuality', value ? 'high' : 'standard');
    } catch (error) {
      console.error('Audio quality toggle error:', error);
      Alert.alert('Error', 'Failed to update audio quality settings');
    }
  };
  
  // Handle time range update
  const handleTimeRangeUpdate = async () => {
    try {
      // Validate time format
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        Alert.alert('Invalid Time Format', 'Please use the format HH:MM (24-hour)');
        return;
      }
      
      // Validate start time is before end time
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      if (startMinutes >= endMinutes) {
        Alert.alert('Invalid Time Range', 'Start time must be before end time');
        return;
      }
      
      // Must have at least 1 hour difference for the window
      if (endMinutes - startMinutes < 60) {
        Alert.alert('Invalid Time Range', 'Time range must be at least 1 hour');
        return;
      }
      
      // Update the time range
      await updatePreferredTimeRange({ start: startTime, end: endTime });
      
      // Reset the daily window to apply the new time range
      await TimeWindowService.resetWindow(userId);
      
      // Close the modal
      setTimeRangeModalVisible(false);
      
      Alert.alert('Success', 'Time range updated successfully');
    } catch (error) {
      console.error('Time range update error:', error);
      Alert.alert('Error', 'Failed to update time range');
    }
  };
  
  // Handle sign out (demo mode - just show message)
  const handleSignOut = async () => {
    Alert.alert('Demo Mode', 'Sign out is not available in demo mode. In a real app, this would sign you out of your account.');
  };
  
  // Handle delete account (demo mode - just show message)
  const handleDeleteAccount = async (password: string) => {
    Alert.alert('Demo Mode', 'Account deletion is not available in demo mode. In a real app, this would delete your account after password verification.');
  };
  
  // Handle privacy settings update
  const handlePrivacySettingsUpdate = async (dataSharing: boolean, analyticsEnabled: boolean) => {
    try {
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      
      // Update the privacy options
      await updatePreference('settings.privacyOptions', {
        dataSharing,
        analyticsEnabled
      });
      
      // Close the modal
      setPrivacySettingsModalVisible(false);
      
      Alert.alert('Success', 'Privacy settings updated successfully');
    } catch (error) {
      console.error('Privacy settings update error:', error);
      Alert.alert('Error', 'Failed to update privacy settings');
    }
  };
  
  // Handle test notification
  const handleTestNotification = async () => {
    try {
      const sent = await PushNotificationService.getInstance().sendTestNotification('Test', 'This is a test notification');
      if (sent) {
        Alert.alert('Success', 'Test notification sent');
      } else {
        Alert.alert('Error', 'Failed to send test notification');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      {/* Time Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time Preferences</Text>
        <Button 
          title="Change Preferred Time Range" 
          onPress={() => setTimeRangeModalVisible(true)}
        />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Current Range:</Text>
          <Text style={styles.infoValue}>
            {preferences?.preferredTimeRange ? 
              `${preferences.preferredTimeRange.start} - ${preferences.preferredTimeRange.end}` : 
              'Loading...'}
          </Text>
        </View>
      </View>
      
      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingRow}>
          <Text>Enable Notifications</Text>
          <Switch
            value={preferences?.notifications ?? true}
            onValueChange={handleNotificationsToggle}
          />
        </View>
        <View style={styles.spacer} />
        <Button 
          title="Send Test Notification" 
          onPress={handleTestNotification}
          disabled={!(preferences?.notifications ?? true)}
        />
      </View>

      {/* Email Notifications Section (Accordion) */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setEmailAccordionOpen((open) => !open)}
        >
          <Text style={styles.sectionTitle}>Email Notifications</Text>
          <AntDesign name={emailAccordionOpen ? 'up' : 'down'} size={20} color="#333" />
        </TouchableOpacity>
        {emailAccordionOpen && <EmailNotificationSettings />}
      </View>

      {/* Push Notifications Section (Accordion) */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setPushAccordionOpen((open) => !open)}
        >
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <AntDesign name={pushAccordionOpen ? 'up' : 'down'} size={20} color="#333" />
        </TouchableOpacity>
        {pushAccordionOpen && <PushNotificationSettings />}
      </View>
      
      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingRow}>
          <Text>Dark Mode</Text>
          <Switch
            value={preferences?.theme === 'dark'}
            onValueChange={handleThemeToggle}
          />
        </View>
      </View>
      
      {/* Audio Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio</Text>
        <View style={styles.settingRow}>
          <Text>High Quality Audio</Text>
          <Switch
            value={preferences?.audioQuality === 'high'}
            onValueChange={handleAudioQualityToggle}
          />
        </View>
      </View>
      
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Button 
          title="Reset Daily Log Status (For Testing)" 
          onPress={handleResetDailyLog}
        />
        <View style={styles.spacer} />
        <Button 
          title="Privacy Settings" 
          onPress={() => setPrivacySettingsModalVisible(true)}
        />
        <View style={styles.spacer} />
        <Button 
          title="Sign Out" 
          onPress={handleSignOut}
        />
      </View>
      
      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <Button 
          title="Export Data" 
          onPress={() => setExportModalVisible(true)}
        />
        <View style={styles.spacer} />
        <Button 
          title="Account Management (Demo)" 
          onPress={() => Alert.alert('Demo Mode', 'Account management is not available in demo mode. In a real app, this would allow you to change password, delete account, etc.')}
        />
      </View>
      
      {/* Time Range Modal */}
      <Modal
        visible={timeRangeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTimeRangeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Preferred Time Range</Text>
            <Text style={styles.modalDescription}>
              Set the time range during which your daily mood logging window will be randomly selected.
            </Text>
            
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Start Time (24h):</Text>
              <TextInput
                style={styles.timeInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>End Time (24h):</Text>
              <TextInput
                style={styles.timeInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="21:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            
            <Text style={styles.modalNote}>
              Note: The app will select a random 1-hour window within this range each day.
            </Text>
            
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setTimeRangeModalVisible(false)} />
              <View style={styles.buttonSpacer} />
              <Button title="Save" onPress={handleTimeRangeUpdate} />
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Account Management Modal - Disabled in demo mode */}
      
      {/* Privacy Settings Modal */}
      <Modal
        visible={privacySettingsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPrivacySettingsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Privacy Settings</Text>
            
            <PrivacySettingsContent 
              initialSettings={preferences?.settings?.privacyOptions}
              onSave={(dataSharing, analyticsEnabled) => {
                handlePrivacySettingsUpdate(dataSharing, analyticsEnabled);
              }}
              onCancel={() => setPrivacySettingsModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
      
      {/* Data Export Modal */}
      <DataExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        userId={userId}
      />
    </ScrollView>
  );
};

// Privacy Settings Component
const PrivacySettingsContent = ({ 
  initialSettings, 
  onSave, 
  onCancel 
}: { 
  initialSettings?: { dataSharing: boolean; analyticsEnabled: boolean }; 
  onSave: (dataSharing: boolean, analyticsEnabled: boolean) => void; 
  onCancel: () => void;
}) => {
  const [dataSharing, setDataSharing] = useState(initialSettings?.dataSharing ?? false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(initialSettings?.analyticsEnabled ?? true);
  
  return (
    <View>
      <Text style={styles.modalDescription}>
        Control how your data is used and shared.
      </Text>
      
      <View style={styles.settingRow}>
        <Text>Share anonymized data for research</Text>
        <Switch
          value={dataSharing}
          onValueChange={setDataSharing}
        />
      </View>
      
      <View style={styles.settingRow}>
        <Text>Enable analytics to improve the app</Text>
        <Switch
          value={analyticsEnabled}
          onValueChange={setAnalyticsEnabled}
        />
      </View>
      
      <Text style={styles.privacyNote}>
        We value your privacy. Your mood data is stored securely and is never shared with third parties without your explicit consent.
      </Text>
      
      <View style={styles.modalButtons}>
        <Button title="Cancel" onPress={onCancel} />
        <View style={styles.buttonSpacer} />
        <Button title="Save" onPress={() => onSave(dataSharing, analyticsEnabled)} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    marginTop: 5,
  },
  infoLabel: {
    fontWeight: 'bold',
    marginRight: 10,
  },
  infoValue: {
    flex: 1,
  },
  spacer: {
    height: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDescription: {
    marginBottom: 15,
    textAlign: 'center',
  },
  modalNote: {
    fontStyle: 'italic',
    fontSize: 12,
    marginTop: 10,
    marginBottom: 15,
    textAlign: 'center',
  },
  privacyNote: {
    fontStyle: 'italic',
    fontSize: 12,
    marginTop: 15,
    marginBottom: 15,
  },
  inputRow: {
    marginBottom: 15,
  },
  inputLabel: {
    marginBottom: 5,
    fontWeight: 'bold',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonSpacer: {
    width: 20,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
});

export default SettingsScreen;