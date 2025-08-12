import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { formatTime } from '../utils/timeWindow';

interface TimeWindowCountdownProps {
  nextWindowTime: number;
  onCountdownComplete?: () => void;
  windowEndTime?: number;
  hour12?: boolean;
}

/**
 * Component for displaying a countdown to the next time window
 */
const TimeWindowCountdown: React.FC<TimeWindowCountdownProps> = ({ 
  nextWindowTime,
  onCountdownComplete,
  windowEndTime,
  hour12 = true
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
      
      // Check if the window has expired (passed windowEndTime)
      if (windowEndTime && currentTime > windowEndTime) {
        // Window has completely passed - show expired state
        setIsComplete(false);
        setTimeRemaining({ hours: 0, minutes: 0 });
        return;
      }
      
      if (currentTime >= nextWindowTime && (!windowEndTime || currentTime <= windowEndTime)) {
        // Window is currently open
        setIsComplete(true);
        setTimeRemaining({ hours: 0, minutes: 0 });
        
        // Only trigger the countdown completion callback once
        if (onCountdownComplete && !isComplete) {
          console.log('TimeWindowCountdown: Window opened, triggering callback');
          onCountdownComplete();
        }
        
        return;
      }
      
      // Calculate time remaining until window opens
      const diffMs = Math.max(0, nextWindowTime - currentTime);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      // Log the actual time calculation
      console.log('Time remaining calculation:', {
        currentTime: new Date(currentTime).toLocaleString(),
        nextWindowTime: new Date(nextWindowTime).toLocaleString(),
        windowEndTime: windowEndTime ? new Date(windowEndTime).toLocaleString() : 'none',
        diffMs,
        hours,
        minutes,
        windowExpired: windowEndTime && currentTime > windowEndTime
      });
      
      setTimeRemaining({ hours, minutes });
      setIsComplete(false);
    };
    
    // Initial update
    updateCountdown();
    
    // Set up interval for updates
    const intervalId = setInterval(updateCountdown, 60000); // Update every minute
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [nextWindowTime, windowEndTime, onCountdownComplete, isComplete]);
  
  // Format the countdown text
  const formatCountdown = () => {
    const currentTime = Date.now();
    
    // Check if window has completely expired
    if (windowEndTime && currentTime > windowEndTime) {
      return 'Window has closed';
    }
    
    // Check if window is currently open
    if (isComplete && currentTime >= nextWindowTime && (!windowEndTime || currentTime <= windowEndTime)) {
      return 'Your time window is now open!';
    }
    
    const { hours, minutes } = timeRemaining;
    
    // Calculate the actual hours until the next window
    const actualHours = Math.floor((nextWindowTime - Date.now()) / (1000 * 60 * 60));
    
    if (actualHours > 24) {
      // If it's more than 24 hours away, show the actual hours
      return `${actualHours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return 'Opening soon...';
    }
  };
  
  // Get the background color based on time remaining
  const getBackgroundColor = () => {
    const currentTime = Date.now();
    
    // Check if window has completely expired
    if (windowEndTime && currentTime > windowEndTime) {
      return '#f5f5f5'; // Light gray when window has passed
    }
    
    // Check if window is currently open
    if (isComplete && currentTime >= nextWindowTime && (!windowEndTime || currentTime <= windowEndTime)) {
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
    const currentTime = Date.now();
    
    // Check if window has completely expired
    if (windowEndTime && currentTime > windowEndTime) {
      // Check if the next window is today or tomorrow
      const isToday = new Date(nextWindowTime).toDateString() === new Date().toDateString();
      const isTomorrow = new Date(nextWindowTime).toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
      
      if (isToday) {
       return `Next window opens at ${formatTime(nextWindowTime, hour12)} today`;
      } else if (isTomorrow) {
       return `Next window opens at ${formatTime(nextWindowTime, hour12)} tomorrow`;
      } else {
        const nextDate = new Date(nextWindowTime);
        return `Next window opens ${nextDate.toLocaleDateString()} at ${formatTime(nextWindowTime, hour12)}`;
      }
    }
    
    // Check if window is currently open
    if (isComplete && currentTime >= nextWindowTime && (!windowEndTime || currentTime <= windowEndTime)) {
      return windowEndTime ? `Available until ${formatTime(windowEndTime, hour12)}` : 'Available now';
    } else if (!isComplete) {
      // Check if the next window is today or tomorrow
      const isToday = new Date(nextWindowTime).toDateString() === new Date().toDateString();
      const isTomorrow = new Date(nextWindowTime).toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
      
      if (isToday) {
        return `Opens at ${formatTime(nextWindowTime, hour12)} today`;
      } else if (isTomorrow) {
        return `Opens at ${formatTime(nextWindowTime, hour12)} tomorrow`;
      } else {
        const nextDate = new Date(nextWindowTime);
        return `Opens ${nextDate.toLocaleDateString()} at ${formatTime(nextWindowTime, hour12)}`;
      }
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
        {(() => {
          const currentTime = Date.now();
          if (windowEndTime && currentTime > windowEndTime) {
            return 'Next window:';
          } else if (isComplete && currentTime >= nextWindowTime && (!windowEndTime || currentTime <= windowEndTime)) {
            return 'Time Window Status:';
          } else {
            return 'Next window in:';
          }
        })()}
      </Text>
      <Text style={[
        styles.countdown, 
        (() => {
          const currentTime = Date.now();
          if (windowEndTime && currentTime > windowEndTime) {
            return styles.expiredText;
          } else if (isComplete && currentTime >= nextWindowTime && (!windowEndTime || currentTime <= windowEndTime)) {
            return styles.openText;
          } else if (timeRemaining.hours === 0 && timeRemaining.minutes < 10) {
            return styles.urgentText;
          } else {
            return styles.normalText;
          }
        })()
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
  },
  expiredText: {
    color: '#666',
  }
});

export default TimeWindowCountdown;