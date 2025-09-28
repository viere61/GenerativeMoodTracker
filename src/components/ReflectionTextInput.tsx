import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  AccessibilityInfo,
  Platform
} from 'react-native';

interface ReflectionTextInputProps {
  value: string;
  onChange: (text: string) => void;
  minLength?: number;
  maxLength?: number;
  onValidationChange?: (isValid: boolean) => void;
  showSubtitle?: boolean;
}

/**
 * A component for entering mood reflection text
 * Allows users to write about their current emotional state
 * Updated: reflection length restriction removed; provides day-of-week prompts
 */
const ReflectionTextInput: React.FC<ReflectionTextInputProps> = ({
  value,
  onChange,
  // No minimum length restriction
  minLength = 0,
  maxLength = 1000,
  onValidationChange,
  showSubtitle = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [weeklyPrompt, setWeeklyPrompt] = useState('');
  
  // Check if screen reader is enabled
  useEffect(() => {
    const checkScreenReader = async () => {
      const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setScreenReaderEnabled(isEnabled);
    };
    
    checkScreenReader();
    
    // Subscribe to screen reader changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled
    );
    
    return () => {
      // Clean up subscription
      subscription.remove();
    };
  }, []);

  // Compute weekly prompt and notify parent that input is valid (no min length)
  useEffect(() => {
    const day = new Date().getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    let prompt = '';
    switch (day) {
      case 1:
        prompt = 'Monday: Share one object that encapsulates your feeling.';
        break;
      case 2:
        prompt = 'Tuesday: Share three words that capture your day.';
        break;
      case 3:
        prompt = 'Wednesday: What environment matches your current state of mind?';
        break;
      case 4:
        prompt = 'Thursday: How does your mood feel in your body right now?';
        break;
      case 5:
        prompt = 'Friday: If your mood were weather, what would it be?';
        break;
      case 6:
        prompt = 'Saturday: Journal whatever you want!';
        break;
      case 0:
      default:
        prompt = 'Sunday: Journal whatever you want!';
        break;
    }
    setWeeklyPrompt(prompt);
  }, []);

  useEffect(() => {
    onValidationChange?.(true);
  }, [value, onValidationChange]);

  // Get border color based on validation and focus state
  const getBorderColor = () => {
    if (isFocused) return '#2196F3';
    return '#CCCCCC';
  };

  // Get placeholder text (no min length requirement)
  const getPlaceholder = () => {
    return weeklyPrompt || "Start journaling your reflection here...";
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reflection</Text>
      {showSubtitle && (
        <Text style={styles.subtitle}>{weeklyPrompt}</Text>
      )}
      
      <TextInput
        style={[
          styles.textInput,
          { borderColor: getBorderColor() }
        ]}
        multiline
        placeholder={getPlaceholder()}
        value={value}
        onChangeText={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        maxLength={maxLength}
        textAlignVertical="top"
        accessibilityLabel="Mood reflection text input"
        accessibilityHint="Write anything that reflects your current mood"
        accessibilityRole="text"
        accessibilityState={{ 
          disabled: false,
          selected: isFocused,
          checked: true
        }}
      />

      {Platform.OS === 'ios' && (
        <View style={styles.infoContainer}>
          <Text style={styles.iosKeyboardTip}>
            Tap outside the text area to dismiss keyboard
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  textInput: {
    height: 150,
    borderWidth: 2,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  iosKeyboardTip: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default ReflectionTextInput;