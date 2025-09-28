import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Button, Alert, ScrollView } from 'react-native';
import DataExportModal from '../components/DataExportModal';
import useUserPreferences from '../hooks/useUserPreferences';
import TimeWindowService from '../services/TimeWindowService';
import MoodEntryService from '../services/MoodEntryService';

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

      {/* Prompt Prefix Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Sound Prompt</Text>
        <Text style={{ marginBottom: 8, color: '#666' }}>Choose a label to prepend to your reflection for AI sound generation.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', opacity: 0.5 }}>
          {[
            { key: 'none', label: 'No label' },
            { key: 'ambient', label: 'Ambient soundscape' },
            { key: 'piano', label: 'Piano solo' },
            { key: 'orchestral', label: 'Orchestral' },
            { key: 'jazz', label: 'Jazz music' },
            { key: 'acoustic', label: 'Acoustic guitar' },
          ].map(opt => (
            <View key={opt.key} style={{ marginRight: 10, marginBottom: 10 }}>
              <Button
                title={opt.label}
                disabled={true}
                onPress={() => {}}
              />
            </View>
          ))}
        </View>
        <Text style={{ marginTop: 6, color: '#666' }}>
          A random label will be chosen automatically for each generation.
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
});

export default SettingsScreen;