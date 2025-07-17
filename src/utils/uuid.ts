/**
 * Generate a UUID v4 string
 * @returns A UUID v4 string
 */
export function generateUUID(): string {
  // This is a simple implementation and not cryptographically secure
  // In a production app, consider using a library like uuid
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}