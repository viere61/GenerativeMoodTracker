import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, AccessibilityInfo } from 'react-native';

interface MoodRatingSelectorProps {
  value: number | null;
  onChange: (rating: number) => void;
  minRating?: number;
  maxRating?: number;
  onValidationChange?: (isValid: boolean) => void;
}

/**
 * A component for selecting a mood rating on a scale from 1-10
 * Allows users to rate their current mood and provides visual feedback
 * Implements requirement 1.5: "WHEN a user selects a mood rating (1-10 scale) THEN the system SHALL record the mood with timestamp"
 */
const MoodRatingSelector: React.FC<MoodRatingSelectorProps> = ({
  value,
  onChange,
  minRating = 1,
  maxRating = 10,
  onValidationChange,
}) => {
  // Animation value for the selection indicator
  const [scaleAnim] = useState(new Animated.Value(1));
  // Track if screen reader is enabled for enhanced accessibility
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  
  // Generate array of ratings from min to max
  const ratings = Array.from(
    { length: maxRating - minRating + 1 },
    (_, i) => i + minRating
  );

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

  // Notify parent component about validation state when value changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(value !== null);
    }
  }, [value, onValidationChange]);

  // Get description based on rating
  const getRatingDescription = (rating: number | null): string => {
    if (rating === null) return 'Select your mood';
    
    if (rating <= 2) return 'Very negative';
    if (rating <= 4) return 'Negative';
    if (rating <= 6) return 'Neutral';
    if (rating <= 8) return 'Positive';
    return 'Very positive';
  };

  // Get color based on rating
  const getRatingColor = (rating: number): string => {
    if (rating <= 2) return '#E53935'; // Red
    if (rating <= 4) return '#FB8C00'; // Orange
    if (rating <= 6) return '#FDD835'; // Yellow
    if (rating <= 8) return '#7CB342'; // Light Green
    return '#43A047'; // Green
  };
  
  // Get emoji based on rating
  const getRatingEmoji = (rating: number): string => {
    if (rating <= 2) return '😢';
    if (rating <= 4) return '😕';
    if (rating <= 6) return '😐';
    if (rating <= 8) return '🙂';
    return '😄';
  };
  
  // Get detailed description for accessibility
  const getDetailedDescription = (rating: number): string => {
    if (rating <= 2) return 'Very negative mood, feeling sad or upset';
    if (rating <= 4) return 'Negative mood, feeling down or troubled';
    if (rating <= 6) return 'Neutral mood, feeling okay or balanced';
    if (rating <= 8) return 'Positive mood, feeling good or content';
    return 'Very positive mood, feeling great or excited';
  };
  
  // Handle rating selection with animation and haptic feedback
  const handleRatingSelect = (rating: number) => {
    // Provide haptic feedback if not using screen reader
    if (!screenReaderEnabled) {
      Vibration.vibrate(10);
    }
    
    // Animate the scale
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Announce selection for screen readers
    if (screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(
        `Selected mood rating ${rating}. ${getDetailedDescription(rating)}`
      );
    }
    
    // Call the onChange handler
    onChange(rating);
  };

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityLabel="Mood rating selector"
      accessibilityHint="Select a number from 1 to 10 to rate your current mood"
      accessibilityRole="radiogroup"
    >
      <Text style={styles.title}>Mood Rating ({minRating}-{maxRating})</Text>
      
      <Animated.View style={[
        styles.descriptionContainer,
        { transform: [{ scale: value !== null ? scaleAnim : 1 }] }
      ]}>
        <Text style={styles.description}>
          {getRatingDescription(value)}
          {value !== null && ` ${getRatingEmoji(value)}`}
        </Text>
      </Animated.View>
      
      <View style={styles.ratingContainer}>
        {ratings.map((rating) => (
          <TouchableOpacity
            key={rating}
            style={[
              styles.ratingButton,
              value === rating && { 
                backgroundColor: getRatingColor(rating),
                transform: [{ scale: 1.1 }]
              }
            ]}
            onPress={() => handleRatingSelect(rating)}
            accessibilityLabel={`Rate your mood ${rating} out of ${maxRating}`}
            accessibilityHint={`Selecting ${rating} indicates ${getDetailedDescription(rating)}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === rating }}
          >
            <Text 
              style={[
                styles.ratingText, 
                value === rating && styles.selectedRatingText
              ]}
            >
              {rating}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabel}>Negative</Text>
        <Text style={styles.scaleLabel}>Positive</Text>
      </View>
      
      {value === null && (
        <Text style={styles.validationMessage} accessibilityLiveRegion="polite">
          Please select a mood rating
        </Text>
      )}
      
      {value !== null && (
        <Text style={styles.selectionFeedback} accessibilityLiveRegion="polite">
          You selected: {value} - {getRatingDescription(value)}
        </Text>
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
    marginBottom: 10,
  },
  descriptionContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    flexWrap: 'wrap',
    paddingHorizontal: 5,
  },
  ratingButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedRatingText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  scaleLabel: {
    fontSize: 12,
    color: '#666',
  },
  validationMessage: {
    color: '#E53935',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
    padding: 5,
    backgroundColor: '#FFEBEE',
    borderRadius: 5,
  },
  selectionFeedback: {
    color: '#43A047',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
});

export default MoodRatingSelector;