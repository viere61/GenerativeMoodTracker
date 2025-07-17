import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { getTimeUntilNextWindow, formatTimeForDisplay } from '../utils/timeWindow';

interface TimeWindowCountdownProps {
  nextWindowTime: number;
  onCountdownComplete?: () => void;
  windowEndTime?: number;
}

/**
 * Component for displaying a countdown to the next time window
 */
const TimeWindowCountdown: React.FC<TimeWindowCountdownProps> = ({ 
  nextWindowTime,
  onCountdownComplete,
  windowEndTime
}) => {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [pulseAnimation] = useState(new Animated.Value(1));
  
  // Start the pulse animation
  useEffect(() => {
    const startPulseAnimation = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ]).start(() => {
        // Only continue pulsing if the countdown is almost complete (less than 10 minutes)
        if (timeRemaining.hours === 0 && timeRemaining.minutes < 10) {
          startPulseAnimation();
        }
      });
    };
    
    // Start pulsing if less than 10 minutes remaining
    if (timeRemaining.hours === 0 && timeRemaining.minutes < 10) {
      startPulseAnimation();
    }
  }, [pulseAnimation, timeRemaining]);
  
  useEffect(() => {
    // Update the countdown every minute
    const updateCountdown = () => {
      const currentTime = Date.now();
      
      if (currentTime >= nextWindowTime) {
        // Countdown is complete
        setIsComplete(true);
        setTimeRemaining({ hours: 0, minutes: 0 });
        
        if (onCountdownComplete) {
          onCountdownComplete();
        }
        
        return;
      }
      
      // Calculate time remaining
      const remaining = getTimeUntilNextWindow(nextWindowTime);
      setTimeRemaining(remaining);
    };
    
    // Initial update
    updateCountdown();
    
    // Set up interval for updates
    const intervalId = setInterval(updateCountdown, 60000); // Update every minute
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [nextWindowTime, onCountdownComplete]);
  
  // Format the countdown text
  const formatCountdown = () => {
    if (isComplete) {
      return 'Your time window is now open!';
    }
    
    const { hours, minutes } = timeRemaining;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };
  
  // Get the background color based on time remaining
  const getBackgroundColor = () => {
    if (isComplete) {
      return '#e6f7ff'; // Light blue when window is open
    }
    
    const { hours, minutes } = timeRemaining;
    
    if (hours === 0 && minutes < 10) {
      return '#fff0f0'; // Light red when less than 10 minutes
    } else if (hours === 0) {
      return '#fff8e6'; // Light yellow when less than 1 hour
    } else {
      return '#f0f0f0'; // Default gray
    }
  };
  
  // Get the formatted time string
  const getFormattedTime = () => {
    if (isComplete && windowEndTime) {
      return `Available until ${formatTimeForDisplay(windowEndTime)}`;
    } else if (!isComplete) {
      return `Opens at ${formatTimeForDisplay(nextWindowTime)}`;
    }
    return '';
  };
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: getBackgroundColor() },
        { transform: [{ scale: isComplete ? 1 : pulseAnimation }] }
      ]}
    >
      <Text style={styles.label}>
        {isComplete ? 'Time Window Status:' : 'Next window in:'}
      </Text>
      <Text style={[
        styles.countdown, 
        isComplete ? styles.openText : (
          timeRemaining.hours === 0 && timeRemaining.minutes < 10 
            ? styles.urgentText 
            : styles.normalText
        )
      ]}>
        {formatCountdown()}
      </Text>
      <Text style={styles.timeInfo}>{getFormattedTime()}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  countdown: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timeInfo: {
    fontSize: 14,
    color: '#666',
  },
  openText: {
    color: '#0066cc',
  },
  urgentText: {
    color: '#cc0000',
  },
  normalText: {
    color: '#333',
  }
});

export default TimeWindowCountdown;