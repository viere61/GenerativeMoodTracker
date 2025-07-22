/**
 * Utility functions for managing the daily time window
 */

/**
 * Generates a random time window within the user's preferred range
 * @param startHour The start hour of the preferred range (0-23)
 * @param endHour The end hour of the preferred range (0-23)
 * @param targetDate Optional date to use (defaults to today)
 * @returns Object containing the start and end times of the window
 */
export const generateTimeWindow = (startHour: number, endHour: number, targetDate?: Date) => {
  // Use provided date or today
  const baseDate = targetDate ? new Date(targetDate) : new Date();
  
  // Log the input date for debugging
  console.log('generateTimeWindow input:', {
    targetDate: targetDate ? targetDate.toString() : 'none provided',
    baseDate: baseDate.toString(),
    baseDateISO: baseDate.toISOString()
  });
  
  // Reset time to midnight for consistent calculations
  baseDate.setHours(0, 0, 0, 0);
  
  // Log after setting to midnight
  console.log('baseDate after setting to midnight:', {
    baseDate: baseDate.toString(),
    baseDateISO: baseDate.toISOString(),
    hours: baseDate.getHours()
  });
  
  // Ensure valid hour range
  const validStartHour = Math.max(0, Math.min(23, startHour));
  const validEndHour = Math.max(0, Math.min(23, endHour));
  
  // Calculate the range in hours
  const rangeHours = validEndHour > validStartHour 
    ? validEndHour - validStartHour 
    : (24 - validStartHour) + validEndHour;
  
  // If range is less than 1 hour, return the start hour
  if (rangeHours <= 1) {
    const start = new Date(baseDate);
    start.setHours(validStartHour, 0, 0, 0);
    
    const end = new Date(baseDate);
    end.setHours(validStartHour + 1, 0, 0, 0);
    
    return {
      startTime: start.getTime(),
      endTime: end.getTime(),
    };
  }
  
  // Generate a random hour within the range
  const randomHoursOffset = Math.floor(Math.random() * (rangeHours - 1));
  const windowStartHour = (validStartHour + randomHoursOffset) % 24;
  
  // Create Date objects for the start and end times
  const start = new Date(baseDate);
  start.setHours(windowStartHour, 0, 0, 0);
  
  const end = new Date(baseDate);
  end.setHours(windowStartHour + 1, 0, 0, 0);
  
  // Log the created window for debugging
  console.log('Generated time window:', {
    windowStartHour,
    start: start.toString(),
    startISO: start.toISOString(),
    end: end.toString(),
    endISO: end.toISOString(),
    startHours: start.getHours(),
    endHours: end.getHours()
  });
  
  return { 
    startTime: start.getTime(), 
    endTime: end.getTime() 
  };
};

/**
 * Checks if the current time is within the designated window
 * @param startTime The start time of the window
 * @param endTime The end time of the window
 * @returns Boolean indicating if current time is within the window
 */
export const isWithinTimeWindow = (startTime: number, endTime: number) => {
  const currentTime = Date.now();
  
  // Debug time comparison
  console.log('isWithinTimeWindow check:', {
    currentTime: new Date(currentTime).toLocaleString(),
    startTime: new Date(startTime).toLocaleString(),
    endTime: new Date(endTime).toLocaleString(),
    isAfterStart: currentTime >= startTime,
    isBeforeEnd: currentTime <= endTime,
    isWithin: currentTime >= startTime && currentTime <= endTime
  });
  
  return currentTime >= startTime && currentTime <= endTime;
};

/**
 * Calculates the time remaining until the next window
 * @param nextWindowStartTime The start time of the next window
 * @returns Object containing hours and minutes until the next window
 */
export const getTimeUntilNextWindow = (nextWindowStartTime: number) => {
  const currentTime = Date.now();
  const timeRemaining = Math.max(0, nextWindowStartTime - currentTime);
  
  // Convert to hours and minutes
  let hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  let minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  // Ensure hours doesn't exceed 24 (for display purposes)
  if (hours >= 24) {
    // If more than 24 hours, just say "check back tomorrow"
    hours = 24;
    minutes = 0;
  }
  
  return { hours, minutes };
};

/**
 * Formats a time window for display
 * @param timestamp The timestamp to format
 * @returns Formatted time string (e.g., "9:00 AM")
 */
export const formatTimeForDisplay = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/**
 * Calculates the next day's window start time
 * @param preferredStartHour The preferred start hour (0-23)
 * @returns Timestamp for the start of the next day's earliest possible window
 */
export const getNextDayWindowStart = (preferredStartHour: number): number => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(preferredStartHour, 0, 0, 0);
  return tomorrow.getTime();
};

/**
 * Parses a time string in HH:MM format to hours and minutes
 * @param timeString Time string in HH:MM format
 * @returns Object with hours and minutes as numbers
 */
export const parseTimeString = (timeString: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
};

/**
 * Converts a time range in HH:MM format to hour values
 * @param timeRange Time range object with start and end in HH:MM format
 * @returns Object with startHour and endHour as numbers
 */
export const timeRangeToHours = (timeRange: { start: string; end: string }): { startHour: number; endHour: number } => {
  const { hours: startHour } = parseTimeString(timeRange.start);
  const { hours: endHour } = parseTimeString(timeRange.end);
  return { startHour, endHour };
};