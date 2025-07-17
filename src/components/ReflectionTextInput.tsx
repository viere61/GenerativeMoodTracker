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
}

/**
 * A component for entering mood reflection text
 * Allows users to write about their current emotional state
 * Implements requirement 1.7: "WHEN a user submits a mood entry THEN the system SHALL require a descriptive reflection text (minimum 20 characters)"
 */
const ReflectionTextInput: React.FC<ReflectionTextInputProps> = ({
  value,
  onChange,
  minLength = 20,
  maxLength = 1000,
  onValidationChange,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  
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

  // Notify parent component about validation state when text changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(value.length >= minLength);
    }
    
    // Announce character count for screen readers when approaching minimum length
    if (screenReaderEnabled && value.length > 0 && value.length < minLength) {
      const remaining = minLength - value.length;
      if (remaining === 5 || remaining === 10 || remaining === 1) {
        AccessibilityInfo.announceForAccessibility(
          `${remaining} character${remaining !== 1 ? 's' : ''} remaining to meet minimum length`
        );
      }
    }
  }, [value, minLength, onValidationChange, screenReaderEnabled]);

  // Get border color based on validation and focus state
  const getBorderColor = () => {
    if (isFocused) return '#2196F3';
    if (value.length > 0 && value.length < minLength) return '#E53935';
    if (value.length >= minLength) return '#4CAF50';
    return '#CCCCCC';
  };

  // Get character count color based on validation
  const getCharCountColor = () => {
    if (value.length === 0) return '#666';
    if (value.length < minLength) return '#E53935';
    if (value.length >= maxLength * 0.9) return '#FB8C00';
    return '#4CAF50';
  };

  // Get placeholder text with minimum length requirement
  const getPlaceholder = () => {
    return `Write about how you're feeling today... (minimum ${minLength} characters)`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reflection</Text>
      <Text style={styles.subtitle}>
        Take a moment to describe how you're feeling and why
      </Text>
      
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
        accessibilityHint={`Write at least ${minLength} characters describing how you feel`}
        accessibilityRole="text"
        accessibilityState={{ 
          disabled: false,
          selected: isFocused,
          checked: value.length >= minLength
        }}
      />
      
      <View style={styles.infoContainer}>
        <Text 
          style={[styles.characterCount, { color: getCharCountColor() }]}
          accessibilityLiveRegion="polite"
        >
          {value.length}/{minLength} characters
          {value.length < minLength ? ` (${minLength - value.length} more needed)` : ''}
        </Text>
        
        {Platform.OS === 'ios' && (
          <Text style={styles.iosKeyboardTip}>
            Tap outside the text area to dismiss keyboard
          </Text>
        )}
      </View>
      
      {value.length > 0 && value.length < minLength && (
        <Text style={styles.validationMessage} accessibilityLiveRegion="polite">
          Please enter at least {minLength} characters
        </Text>
      )}
      
      {value.length >= minLength && (
        <View style={styles.promptContainer}>
          <Text style={styles.promptTitle}>Reflection Prompts:</Text>
          <Text style={styles.promptText}>• What triggered these emotions?</Text>
          <Text style={styles.promptText}>• How has this affected your day?</Text>
          <Text style={styles.promptText}>• What might help you feel better?</Text>
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
  characterCount: {
    fontSize: 14,
  },
  iosKeyboardTip: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  validationMessage: {
    color: '#E53935',
    fontSize: 14,
    marginTop: 10,
    fontWeight: 'bold',
    padding: 5,
    backgroundColor: '#FFEBEE',
    borderRadius: 5,
  },
  promptContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 5,
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#2E7D32',
  },
  promptText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
  },
});

export default ReflectionTextInput;