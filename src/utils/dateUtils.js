/**
 * Utility functions for handling dates and times consistently
 */

/**
 * Creates a date object set to local midnight for the specified day
 * @param {Date} date - The date to use (defaults to today)
 * @param {number} dayOffset - Days to add (positive) or subtract (negative)
 * @returns {Date} - Date object set to local midnight
 */
export function getLocalMidnight(date = new Date(), dayOffset = 0) {
  const result = new Date(date);
  
  // Add/subtract days if specified
  if (dayOffset !== 0) {
    result.setDate(result.getDate() + dayOffset);
  }
  
  // Set to local midnight (00:00:00.000)
  result.setHours(0, 0, 0, 0);
  
  return result;
}

/**
 * Creates a date object for tomorrow at local midnight
 * @returns {Date} - Tomorrow at local midnight
 */
export function getTomorrowMidnight() {
  return getLocalMidnight(new Date(), 1);
}

/**
 * Sets a date to a specific hour in local time
 * @param {Date} date - The date to modify
 * @param {number} hour - The hour to set (0-23)
 * @returns {Date} - The modified date
 */
export function setLocalHour(date, hour) {
  const result = new Date(date);
  result.setHours(hour, 0, 0, 0);
  return result;
}

/**
 * Gets the time difference in hours and minutes
 * @param {Date|number} futureTime - Future time as Date or timestamp
 * @param {Date|number} currentTime - Current time as Date or timestamp (defaults to now)
 * @returns {Object} - Object with hours and minutes properties
 */
export function getTimeDifference(futureTime, currentTime = new Date()) {
  // Convert to timestamps if needed
  const future = futureTime instanceof Date ? futureTime.getTime() : futureTime;
  const current = currentTime instanceof Date ? currentTime.getTime() : currentTime;
  
  // Calculate difference in milliseconds
  const diffMs = Math.max(0, future - current);
  
  // Convert to hours and minutes
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes };
}