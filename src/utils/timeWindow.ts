/**
 * Clean utility functions for managing daily time windows
 */

/**
 * Generates a random 2-hour logging window within the user's preferred time range
 * If the preference is exactly 2 hours, uses the exact time range
 * @param preferredStart Start time in "HH:MM" format (e.g., "09:00")
 * @param preferredEnd End time in "HH:MM" format (e.g., "11:00")
 * @returns Object containing window start and end timestamps, and the date
 */
export const generateRandomWindow = (preferredStart: string, preferredEnd: string) => {
  // Parse the preferred time range
  const [startHour, startMinute] = preferredStart.split(':').map(Number);
  const [endHour, endMinute] = preferredEnd.split(':').map(Number);
  
  // Convert to minutes for easier calculation
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const rangeMinutes = endMinutes - startMinutes;
  
  // If preference is exactly 2 hours, use exact match
  if (rangeMinutes === 120) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    // If the window time has already passed today, use tomorrow
    const useToday = startMinutes > currentTotalMinutes;
    
    const windowDate = new Date();
    if (!useToday) {
      windowDate.setDate(windowDate.getDate() + 1);
    }
    windowDate.setHours(startHour, startMinute, 0, 0);
    
    const windowEndDate = new Date(windowDate);
    windowEndDate.setHours(endHour, endMinute, 0, 0);
    
    const dateString = windowDate.toISOString().split('T')[0];
    
    console.log('Generated exact 2-hour window:', {
      preferredRange: `${preferredStart} - ${preferredEnd}`,
      currentTime: now.toLocaleTimeString(),
      windowStart: windowDate.toLocaleString(),
      windowEnd: windowEndDate.toLocaleString(),
      useToday,
      dateString
    });
    
    return {
      windowStart: windowDate.getTime(),
      windowEnd: windowEndDate.getTime(),
      date: dateString
    };
  }
  
  // Calculate available range (subtract 120 minutes for the 2-hour window)
  const availableRange = rangeMinutes - 120;
  
  if (availableRange <= 0) {
    throw new Error('Time range too small for 2-hour window');
  }
  
  // Generate random offset within available range
  const randomOffset = Math.floor(Math.random() * availableRange);
  const windowStartMinutes = startMinutes + randomOffset;
  
  // Convert back to hours and minutes
  const windowStartHour = Math.floor(windowStartMinutes / 60);
  const windowStartMinute = windowStartMinutes % 60;
  
  // Determine if we should use today or tomorrow
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  
  // If the random window time has already passed today, use tomorrow
  const useToday = windowStartMinutes > currentTotalMinutes;
  
  // Create the window start date
  const windowDate = new Date();
  if (!useToday) {
    windowDate.setDate(windowDate.getDate() + 1);
  }
  windowDate.setHours(windowStartHour, windowStartMinute, 0, 0);
  
  // Create window end date (2 hours later)
  const windowEndDate = new Date(windowDate);
  windowEndDate.setHours(windowEndDate.getHours() + 2);
  
  const dateString = windowDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  console.log('Generated random window:', {
    preferredRange: `${preferredStart} - ${preferredEnd}`,
    currentTime: now.toLocaleTimeString(),
    windowStart: windowDate.toLocaleString(),
    windowEnd: windowEndDate.toLocaleString(),
    useToday,
    dateString
  });
  
  return {
    windowStart: windowDate.getTime(),
    windowEnd: windowEndDate.getTime(),
    date: dateString
  };
};

/**
 * Generates a random 2-hour logging window for a specific date
 * If the preference is exactly 2 hours, uses the exact time range
 * @param preferredStart Start time in "HH:MM" format (e.g., "09:00")
 * @param preferredEnd End time in "HH:MM" format (e.g., "11:00")
 * @param targetDate The specific date to generate the window for
 * @returns Object containing window start and end timestamps, and the date
 */
export const generateRandomWindowForDate = (preferredStart: string, preferredEnd: string, targetDate: Date) => {
  // Parse the preferred time range
  const [startHour, startMinute] = preferredStart.split(':').map(Number);
  const [endHour, endMinute] = preferredEnd.split(':').map(Number);
  
  // Convert to minutes for easier calculation
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const rangeMinutes = endMinutes - startMinutes;
  
  // If preference is exactly 2 hours, use exact match
  if (rangeMinutes === 120) {
    const windowDate = new Date(targetDate);
    windowDate.setHours(startHour, startMinute, 0, 0);
    
    const windowEndDate = new Date(targetDate);
    windowEndDate.setHours(endHour, endMinute, 0, 0);
    
    const dateString = windowDate.toISOString().split('T')[0];
    
    console.log('Generated exact 2-hour window for date:', {
      targetDate: targetDate.toDateString(),
      preferredRange: `${preferredStart} - ${preferredEnd}`,
      windowStart: windowDate.toLocaleString(),
      windowEnd: windowEndDate.toLocaleString(),
      dateString
    });
    
    return {
      windowStart: windowDate.getTime(),
      windowEnd: windowEndDate.getTime(),
      date: dateString
    };
  }
  
  // Calculate available range (subtract 120 minutes for the 2-hour window)
  const availableRange = rangeMinutes - 120;
  
  if (availableRange <= 0) {
    throw new Error('Time range too small for 2-hour window');
  }
  
  // Generate random offset within available range
  const randomOffset = Math.floor(Math.random() * availableRange);
  const windowStartMinutes = startMinutes + randomOffset;
  
  // Convert back to hours and minutes
  const windowStartHour = Math.floor(windowStartMinutes / 60);
  const windowStartMinute = windowStartMinutes % 60;
  
  // Create the window start date for the specific target date
  const windowDate = new Date(targetDate);
  windowDate.setHours(windowStartHour, windowStartMinute, 0, 0);
  
  // Create window end date (2 hours later)
  const windowEndDate = new Date(windowDate);
  windowEndDate.setHours(windowEndDate.getHours() + 2);
  
  const dateString = windowDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  console.log('Generated random window for date:', {
    targetDate: targetDate.toDateString(),
    preferredRange: `${preferredStart} - ${preferredEnd}`,
    windowStart: windowDate.toLocaleString(),
    windowEnd: windowEndDate.toLocaleString(),
    dateString
  });
  
  return {
    windowStart: windowDate.getTime(),
    windowEnd: windowEndDate.getTime(),
    date: dateString
  };
};

/**
 * Checks if the current time is within the logging window
 * @param windowStart Window start timestamp
 * @param windowEnd Window end timestamp
 * @returns Boolean indicating if current time is within the window
 */
export const isWithinWindow = (windowStart: number, windowEnd: number): boolean => {
  const now = Date.now();
  return now >= windowStart && now <= windowEnd;
};

/**
 * Formats a timestamp for display
 * @param timestamp The timestamp to format
 * @returns Formatted time string (e.g., "9:00 AM")
 */
export const formatTime = (timestamp: number, hour12: boolean = true): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12 });
};

/**
 * Calculates time until a target timestamp
 * @param targetTime Target timestamp
 * @returns Object with hours and minutes until target
 */
export const getTimeUntil = (targetTime: number) => {
  const now = Date.now();
  const diff = Math.max(0, targetTime - now);
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes };
};

/**
 * Validates time range format
 * @param start Start time in "HH:MM" format
 * @param end End time in "HH:MM" format
 * @returns Boolean indicating if the range is valid
 */
export const validateTimeRange = (start: string, end: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  
  if (!timeRegex.test(start) || !timeRegex.test(end)) {
    return false;
  }
  
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  // Must have at least 2 hours difference
  return endMinutes - startMinutes >= 120;
};