/**
 * Utility functions for handling base64 encoding/decoding
 * with better compatibility across platforms
 */

/**
 * Safely decode a base64 string, handling URL-safe base64 variants
 * @param {string} base64String - The base64 string to decode
 * @returns {Uint8Array} - The decoded data as a Uint8Array
 */
export function safeBase64Decode(base64String) {
  try {
    // First, restore standard base64 format if URL-safe format was used
    const standardBase64 = base64String
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    const paddedBase64 = standardBase64.padEnd(
      standardBase64.length + (4 - (standardBase64.length % 4)) % 4, 
      '='
    );
    
    // Use atob for decoding
    const binaryString = atob(paddedBase64);
    
    // Convert to Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  } catch (error) {
    console.error('Base64 decoding error:', error);
    throw new Error(`Failed to decode base64 string: ${error.message}`);
  }
}

/**
 * Create a blob URL from a base64 string
 * @param {string} base64String - The base64 string
 * @param {string} mimeType - The MIME type of the data
 * @returns {string} - A blob URL
 */
export function base64ToUrl(base64String, mimeType = 'audio/mpeg') {
  try {
    const bytes = safeBase64Decode(base64String);
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to convert base64 to URL:', error);
    throw error;
  }
}