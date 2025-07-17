import React from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import UserPreferencesService from '../services/UserPreferencesService';

type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const { register } = useAuth();
  const [step, setStep] = React.useState(1);
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('21:00');
  
  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Complete onboarding and set up user preferences
      try {
        // Create a default user
        const defaultUser = {
          email: 'demo@example.com',
          password: 'demo123',
          preferredTimeRange: {
            start: startTime,
            end: endTime
          }
        };
        
        await register(defaultUser);
        
        // Set up user preferences
        const userId = 'demo-user'; // In a real app, this would come from registration
        await UserPreferencesService.initializePreferences(userId, {
          preferredTimeRange: {
            start: startTime,
            end: endTime
          },
          notifications: true,
          theme: 'light',
          audioQuality: 'high'
        });
        
        // Navigate to main app
        navigation.replace('Main');
      } catch (error) {
        console.error('Error completing onboarding:', error);
        // Still navigate even if there's an error
        navigation.replace('Main');
      }
    }
  };
  
  return (
    <View style={styles.container}>
      {step === 1 && (
        <View style={styles.step}>
          <Text style={styles.title}>Welcome to Generative Mood Tracker</Text>
          <Text style={styles.description}>
            A mindful approach to tracking your emotions and generating unique music based on your mood.
          </Text>
        </View>
      )}
      
      {step === 2 && (
        <View style={styles.step}>
          <Text style={styles.title}>How It Works</Text>
          <Text style={styles.description}>
            Each day, you'll have a random 1-hour window to log your mood. This encourages intentional reflection rather than habitual tracking.
          </Text>
        </View>
      )}
      
      {step === 3 && (
        <View style={styles.step}>
          <Text style={styles.title}>Set Your Preferred Time Range</Text>
          <Text style={styles.description}>
            Choose a time range when you're typically available. We'll randomly select a 1-hour window within this range each day.
          </Text>
          
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerRow}>
              <Text style={styles.timeLabel}>Start Time:</Text>
              <View style={styles.timeButtons}>
                {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00'].map((time) => (
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
                ))}
              </View>
            </View>
            
            <View style={styles.timePickerRow}>
              <Text style={styles.timeLabel}>End Time:</Text>
              <View style={styles.timeButtons}>
                {['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map((time) => (
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
                ))}
              </View>
            </View>
            
            <Text style={styles.selectedRange}>
              Your window will be between {startTime} and {endTime}
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.stepIndicator}>Step {step} of 3</Text>
        <Button
          title={step === 3 ? "Get Started" : "Next"}
          onPress={handleNext}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  step: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  footer: {
    marginTop: 20,
  },
  stepIndicator: {
    textAlign: 'center',
    marginBottom: 10,
  },
  timePickerContainer: {
    width: '100%',
    marginTop: 20,
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
  timeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  timeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedTimeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeButtonText: {
    fontSize: 14,
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
});

export default OnboardingScreen;