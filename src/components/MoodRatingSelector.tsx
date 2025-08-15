import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, AccessibilityInfo, PanResponder, LayoutChangeEvent } from 'react-native';

interface MoodRatingSelectorProps {
  value: number | null;
  onChange: (rating: number) => void;
  onValidationChange?: (isValid: boolean) => void;
  onSlidingChange?: (isSliding: boolean) => void;
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
  onSlidingChange,
}) => {
  // Animation value for the selection indicator
  const [scaleAnim] = useState(new Animated.Value(1));
  // Animated thumb translateX for smoother movement
  const thumbTranslateX = useRef(new Animated.Value(0)).current;
  const trackRef = useRef<View | null>(null);
  const trackXRef = useRef(0);
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const isSlidingRef = useRef(false);
  const touchOffsetRef = useRef(0);
  const currentValueRef = useRef<number>(value ?? 50);
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

  // Update thumb position whenever value or trackWidth changes (but not while sliding)
  useEffect(() => {
    if (isSlidingRef.current) return;
    currentValueRef.current = value ?? currentValueRef.current;
    const width = trackWidthRef.current || trackWidth;
    const ratio = Math.max(0, Math.min(1, ((value ?? 1) - 1) / 99));
    const x = ratio * width - 14; // center the 28px thumb
    const clampedX = Math.max(-14, Math.min((width || 0) - 14, isNaN(x) ? 0 : x));
    thumbTranslateX.setValue(clampedX);
  }, [value, thumbTranslateX, trackWidth]);

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
  
  // Handle rating selection with animation (no haptics)
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

  const handleTrackLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    trackWidthRef.current = width;
    setTrackWidth(width);
    // Also measure absolute X for pageX to local conversion
    if (trackRef.current && trackRef.current.measureInWindow) {
      trackRef.current.measureInWindow((x: number) => {
        trackXRef.current = x;
      });
    }
  };

  const computeRatingFromLocalX = (localX: number): number => {
    const width = Math.max(1, trackWidthRef.current);
    const clamped = Math.max(0, Math.min(width, localX));
    const pct = clamped / width;
    return Math.round(1 + pct * 99);
  };

  const startRatingRef = useRef<number>(value ?? 50);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (evt) => {
      isSlidingRef.current = true;
      onSlidingChange?.(true);
      // Start from current value, but preserve finger offset to avoid jump
      const width = Math.max(1, trackWidthRef.current);
      const currentVal = Math.max(1, Math.min(100, (value ?? 50)));
      startRatingRef.current = currentVal;
      const currentX = ((currentVal - 1) / 99) * width;
      const pageX = evt.nativeEvent.pageX;
      touchOffsetRef.current = pageX - (trackXRef.current + currentX);
    },
    onPanResponderMove: (evt) => {
      // Track based on local finger X minus preserved offset
      const width = Math.max(1, trackWidthRef.current);
      const localX = evt.nativeEvent.pageX - trackXRef.current - touchOffsetRef.current;
      const clampedX = Math.max(0, Math.min(width, localX));
      const pct = clampedX / width;
      const rating = Math.round(1 + pct * 99);
      // Drive thumb directly for smoothness
      thumbTranslateX.setValue(clampedX - 14);
      // Only propagate when rating actually changes to minimize re-renders (prevents wobble)
      if (rating !== currentValueRef.current) {
        currentValueRef.current = rating;
        onChange(rating);
      }
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (evt) => {
      isSlidingRef.current = false;
      onSlidingChange?.(false);
      const width = Math.max(1, trackWidthRef.current);
      const localX = evt.nativeEvent.pageX - trackXRef.current - touchOffsetRef.current;
      const clampedX = Math.max(0, Math.min(width, localX));
      const pct = clampedX / width;
      const rating = Math.round(1 + pct * 99);
      // finalize selection with subtle bounce
      handleRatingSelect(rating);
    },
    onPanResponderTerminate: () => {
      isSlidingRef.current = false;
      onSlidingChange?.(false);
    },
  }), [onChange, onSlidingChange, value]);

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
      
      <View
        ref={trackRef}
        style={[styles.sliderTrack, { height: 22 }]}
        onLayout={handleTrackLayout}
        {...panResponder.panHandlers}
      >
        <View style={[styles.sliderFill, { width: Math.max(0, (((value ?? 1) - 1) / 99) * (trackWidth || 0)), backgroundColor: getRatingColor(value ?? 1) }]} />
        <Animated.View style={[styles.sliderThumb, { transform: [{ translateX: thumbTranslateX }], borderColor: getRatingColor(value ?? 1) }]} />
        {/* Rounded ends are provided by borderRadius; no extra caps */}
        <View style={styles.touchOverlay} pointerEvents="none" />
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