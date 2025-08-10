import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, AccessibilityInfo } from 'react-native';

interface MoodRatingSelectorProps {
  value: number | null;
  onChange: (rating: number) => void;
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
  onValidationChange,
}) => {
  // Animation value for the selection indicator
  const [scaleAnim] = useState(new Animated.Value(1));
  // Track if screen reader is enabled for enhanced accessibility
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  
  // Continuous slider scale mapped to 1-7 descriptive anchors
  const anchors = [
    'Very unpleasant',
    'Unpleasant',
    'Slightly unpleasant',
    'Neutral',
    'Slightly pleasant',
    'Pleasant',
    'Very pleasant'
  ];

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

  // Default to neutral center if value is null
  useEffect(() => {
    if (value === null) {
      onChange(50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent component about validation state when value changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(value !== null);
    }
  }, [value, onValidationChange]);

  // Get description based on rating
  const getRatingDescription = (rating: number | null): string => {
    if (rating === null) return 'Slide to rate your mood';
    // Map 1..100 to anchors
    const idx = Math.min(6, Math.max(0, Math.round(((rating - 1) / 99) * 6)));
    return anchors[idx];
  };

  // Get color based on rating
  const getRatingColor = (rating: number): string => {
    // Gradient from red to green across 1..100
    const t = Math.max(0, Math.min(1, (rating - 1) / 99));
    const r = Math.round(227 + (67 - 227) * t);
    const g = Math.round(57 + (160 - 57) * t);
    const b = Math.round(53 + (71 - 53) * t);
    return `rgb(${r},${g},${b})`;
  };
  
  // Get emoji based on rating
  const getRatingEmoji = (rating: number): string => {
    const t = (rating - 1) / 99;
    if (t < 0.15) return '😢';
    if (t < 0.35) return '😕';
    if (t < 0.5) return '😐';
    if (t < 0.75) return '🙂';
    return '😄';
  };
  
  // Get detailed description for accessibility
  const getDetailedDescription = (rating: number): string => getRatingDescription(rating);
  
  // Handle rating selection with animation and haptic feedback
  const handleRatingSelect = (rating: number) => {
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
      accessibilityHint="Slide to rate your current mood"
      accessibilityRole="adjustable"
    >
      <Text style={styles.title}>Mood Rating</Text>
      
      <Animated.View style={[
        styles.descriptionContainer,
        { transform: [{ scale: value !== null ? scaleAnim : 1 }] }
      ]}>
        <Text style={styles.description}>
          {getRatingDescription(value)}
          {value !== null && ` ${getRatingEmoji(value)}`}
        </Text>
      </Animated.View>
      
      <View style={[styles.sliderTrack, { height: 22 }]}
        onLayout={(e) => {
          // store width in ref via state closure using invisible state
          (styles as any)._trackWidth = e.nativeEvent.layout.width;
        }}
      >
        <View style={[styles.sliderFill, { width: Math.max(0, ((((value ?? 1) - 1) / 99) * ((styles as any)._trackWidth || 0))), backgroundColor: getRatingColor(value ?? 1) }]} />
        <View style={[styles.sliderThumb, { transform: [{ translateX: Math.max(0, (((value ?? 1) - 1) / 99) * ((styles as any)._trackWidth || 0)) - 14 }], borderColor: getRatingColor(value ?? 1) }]} />
        {/* Rounded ends are provided by borderRadius; no extra caps */}
        <View style={styles.touchOverlay}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            const x = e.nativeEvent.locationX; const trackWidth = (styles as any)._trackWidth || 1; const pct = Math.max(0, Math.min(1, x / trackWidth)); const rating = Math.round(1 + pct * 99); handleRatingSelect(rating);
          }}
          onResponderMove={(e) => {
            const x = e.nativeEvent.locationX; const trackWidth = (styles as any)._trackWidth || 1; const pct = Math.max(0, Math.min(1, x / trackWidth)); const rating = Math.round(1 + pct * 99); handleRatingSelect(rating);
          }}
          onResponderRelease={() => {}}
          onResponderTerminate={() => {}}
        />
      </View>
      
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabel}>Very unpleasant</Text>
        <Text style={styles.scaleLabel}>Very pleasant</Text>
      </View>
      
      {value === null && (
        <Text style={styles.validationMessage} accessibilityLiveRegion="polite">
          Please select a mood rating
        </Text>
      )}
      
      {value !== null && (
        <Text style={styles.selectionFeedback} accessibilityLiveRegion="polite">
          You selected: {getRatingDescription(value ?? 1)}
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
    display: 'none',
  },
  sliderTrack: {
    position: 'relative',
    height: 16,
    borderRadius: 11,
    backgroundColor: '#eee',
    overflow: 'visible', // allow thumb shadow to render
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
    borderTopLeftRadius: 11,
    borderBottomLeftRadius: 11,
  },
  sliderThumb: {
    position: 'absolute',
    top: -3,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    backgroundColor: '#fff',
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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