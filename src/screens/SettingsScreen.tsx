import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Button, Alert, ScrollView, TouchableOpacity } from 'react-native';
import DataExportModal from '../components/DataExportModal';
import useUserPreferences from '../hooks/useUserPreferences';
import TimeWindowService from '../services/TimeWindowService';
import MoodEntryService from '../services/MoodEntryService';
import PushNotificationService from '../services/PushNotificationService';

const SettingsScreen = () => {
  // State for modals
  const [exportModalVisible, setExportModalVisible] = useState(false);
  
  // Use demo user for web compatibility
  const userId = 'demo-user';
  
  // Get user preferences
  const { 
    preferences, 
    isLoading, 
    error, 
    updatePreference
  } = useUserPreferences();

  // Local UI state for time range editor
  const [showTimeRangeSelector, setShowTimeRangeSelector] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('21:00');
  const hour12 = (preferences?.timeFormat ?? '12h') === '12h';

  const pushNotificationService = PushNotificationService.getInstance();

  useEffect(() => {
    if (preferences?.preferredTimeRange) {
      setStartTime(preferences.preferredTimeRange.start);
      setEndTime(preferences.preferredTimeRange.end);
    }
  }, [preferences?.preferredTimeRange?.start, preferences?.preferredTimeRange?.end]);

  const formatTime = (hhmm: string, use12h: boolean): string => {
    if (!hhmm) return '';
    const [hStr, mStr] = hhmm.split(':');
    const hour = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10) || 0;
    if (!use12h) {
      return `${hStr}:${mStr.padStart(2, '0')}`;
    }
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12val = hour % 12 === 0 ? 12 : hour % 12;
    const minuteStr = mStr.padStart(2, '0');
    return `${hour12val}:${minuteStr} ${period}`;
  };

  const updateTimeRange = async (newStartTime: string, newEndTime: string) => {
    try {
      // Validate: start < end and at least 2 hours apart
      const [sH, sM] = newStartTime.split(':').map(Number);
      const [eH, eM] = newEndTime.split(':').map(Number);
      const startMinutes = sH * 60 + (sM || 0);
      const endMinutes = eH * 60 + (eM || 0);

      if (isNaN(startMinutes) || isNaN(endMinutes)) {
        Alert.alert('Invalid Time Range', 'Please select valid start and end times.');
        return;
      }

      if (startMinutes >= endMinutes) {
        Alert.alert('Invalid Time Range', 'Start time must be before end time.');
        return;
      }

      if (endMinutes - startMinutes < 120) {
        Alert.alert('Invalid Time Range', 'Time range must be at least 2 hours (e.g., 09:00 - 11:00).');
        return;
      }

      // Persist preference immediately
      await updatePreference('preferredTimeRange', { start: newStartTime, end: newEndTime });

      // Close editor and notify user immediately (heavy work moves to background)
      setShowTimeRangeSelector(false);
      Alert.alert('Update', 'Time range saved');

      // Run heavy work in the background without blocking UI
      const user = 'demo-user';
      setTimeout(async () => {
        try {
          // Single cancel-all occurs inside scheduleMultiDayNotifications
          await TimeWindowService.resetWindow(user);
          const multiDayWindows = await TimeWindowService.createMultiDayWindows(user, 30);
          await pushNotificationService.scheduleMultiDayNotifications(multiDayWindows, 5);
        } catch (bgErr) {
          console.error('Background scheduling error after time range update:', bgErr);
        }
      }, 0);
    } catch (error) {
      console.error('Error updating time range:', error);
      Alert.alert('Error', 'Failed to update time range. Please try again.');
    }
  };
  
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
  
  // Time format toggle handler
  const handleTimeFormatToggle = async (value: boolean) => {
    try {
      const format = value ? '12h' : '24h';
      await updatePreference('timeFormat', format);
    } catch (error) {
      console.error('Time format toggle error:', error);
      Alert.alert('Error', 'Failed to update time format');
    }
  };
  
  // Time range settings removed
  
  // Handle sign out (demo mode - just show message)
  // Sign out removed in simplified settings
  
  // Handle delete account (demo mode - just show message)
  // Account deletion removed in simplified settings
  
  // Handle privacy settings update
  // Privacy settings removed
  
  // Test notification removed
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      {/* Time Range Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time Range</Text>
        <View style={styles.settingRow}>
          <Text>Current Time Range</Text>
          <Text style={{ fontWeight: '600' }}>{formatTime(startTime, hour12)} - {formatTime(endTime, hour12)}</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setShowTimeRangeSelector(!showTimeRangeSelector)}>
          <Text style={styles.primaryButtonText}>{showTimeRangeSelector ? 'Cancel' : 'Edit Time Range'}</Text>
        </TouchableOpacity>

        {showTimeRangeSelector && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ textAlign: 'center', color: '#666', marginBottom: 10 }}>
              Choose when you're typically available. We'll randomly select a 1-hour window within this range each day.
            </Text>
            <Text style={styles.timeLabel}>Start Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50 }}>
              <View style={{ flexDirection: 'row', paddingHorizontal: 10 }}>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  const time = `${hour}:00`;
                  const selected = startTime === time;
                  return (
                    <TouchableOpacity
                      key={`start-${time}`}
                      style={[styles.timeButton, selected && styles.timeButtonSelected]}
                      onPress={() => setStartTime(time)}
                    >
                      <Text style={[styles.timeButtonText, selected && styles.timeButtonTextSelected]}>
                        {formatTime(time, hour12)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={styles.timeLabel}>End Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50 }}>
              <View style={{ flexDirection: 'row', paddingHorizontal: 10 }}>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  const time = `${hour}:00`;
                  const selected = endTime === time;
                  return (
                    <TouchableOpacity
                      key={`end-${time}`}
                      style={[styles.timeButton, selected && styles.timeButtonSelected]}
                      onPress={() => setEndTime(time)}
                    >
                      <Text style={[styles.timeButtonText, selected && styles.timeButtonTextSelected]}>
                        {formatTime(time, hour12)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.primaryButton, { marginTop: 12 }]} onPress={() => updateTimeRange(startTime, endTime)}>
              <Text style={styles.primaryButtonText}>Save Time Range</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Time Format Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time Format</Text>
        <View style={styles.settingRow}>
          <Text>Use 12-hour format</Text>
          <Switch
            value={(preferences?.timeFormat ?? '12h') === '12h'}
            onValueChange={handleTimeFormatToggle}
          />
        </View>
        <Text style={{ marginTop: 8, color: '#666' }}>
          Currently displaying times in {(preferences?.timeFormat ?? '12h') === '12h' ? '12-hour' : '24-hour'} format.
        </Text>
      </View>

      {/* AI Sound Prompt (Randomized) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Sound Prompt</Text>
        <Text style={{ marginBottom: 10, color: '#444' }}>
          A musical label is chosen at random for each AI sound generation. Examples:
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[
            'No label',
            'Ambient soundscape',
            'Piano solo',
            'Orchestral',
            'Jazz music',
            'Acoustic guitar',
          ].map((label, idx) => (
            <View key={idx} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={{ marginTop: 8, color: '#666' }}>
          You don’t need to choose anything here — it’s automatic.
        </Text>
      </View>

      {/* Email notifications removed */}

      {/* Push notifications advanced settings removed */}
      
      {/* Appearance removed */}
      
      {/* Audio Section removed */}
      
      {/* Account: keep only reset for testing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Button 
          title="Reset Daily Log Status (For Testing)" 
          onPress={handleResetDailyLog}
        />
      </View>
      
      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <Button 
          title="Export Data" 
          onPress={() => setExportModalVisible(true)}
        />
        
      </View>
      
      {/* Time Range Modal removed */}
      
      {/* Account Management Modal - Disabled in demo mode */}
      
      {/* Privacy settings removed */}
      
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
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
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
  timeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeButtonText: {
    fontSize: 12,
    color: '#333',
  },
  timeButtonTextSelected: {
    color: 'white',
  },
  pill: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 10,
    marginBottom: 10,
  },
  pillText: {
    color: '#1f2937',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default SettingsScreen;