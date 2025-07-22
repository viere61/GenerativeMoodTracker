/**
 * Helper functions for time window display and calculations
 */

/**
 * Determines if a timestamp is for today
 * @param {number} timestamp - The timestamp to check
 * @returns {boolean} - True if the timestamp is for today
 */
export function isTimestampToday(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Formats the "next window in" time display
 * @param {number} nextWindowStart - Timestamp for the next window start
 * @returns {string} - Formatted string like "2h 30m" or "24h 0m" for tomorrow
 */
export function formatNextWindowTime(nextWindowStart) {
  const now = Date.now();
  const diffMs = Math.max(0, nextWindowStart - now);
  
  // Calculate hours and minutes
  let hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  // If it's tomorrow, cap at 24 hours for display
  if (!isTimestampToday(nextWindowStart) && hours > 24) {
    hours = 24;
  }
  
  return `${hours}h ${minutes}m`;
}

/**
 * Gets a user-friendly message about the next window
 * @param {number} windowStart - Start timestamp of the window
 * @param {number} windowEnd - End timestamp of the window
 * @returns {string} - User-friendly message
 */
export function getWindowStatusMessage(windowStart, windowEnd) {
  const now = Date.now();
  
  if (now >= windowStart && now <= windowEnd) {
    return "Your mood logging window is open";
  } else if (now < windowStart) {
    return isTimestampToday(windowStart) 
      ? "Your mood logging window opens later today" 
      : "Your mood logging window is closed";
  } else {
    return "Your mood logging window is closed";
  }
}