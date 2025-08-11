import { MoodEntry, GeneratedMusic, User } from '../types';
import LocalStorageManager from './LocalStorageManager';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Supported export formats
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv'
}

/**
 * Export options interface
 */
export interface ExportOptions {
  format: ExportFormat;
  includeMusic: boolean;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Service for exporting user data
 */
class DataExportService {
  // Directory for storing export files
  private readonly EXPORT_DIRECTORY = `${FileSystem.documentDirectory}exports/`;
  
  /**
   * Initialize the export service
   * Creates the export directory if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      // Ensure export directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.EXPORT_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.EXPORT_DIRECTORY, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to initialize DataExportService:', error);
      throw new Error('Export service initialization failed');
    }
  }
  
  /**
   * Export user data
   * @param userId User ID
   * @param options Export options
   * @returns Path to the exported file
   */
  async exportUserData(userId: string, options: ExportOptions): Promise<string> {
    try {
      // Initialize if not already initialized
      await this.initialize();
      
      // Collect user data
      const userData = await this.collectUserData(userId, options);
      
      // Generate export file
      const filePath = await this.generateExportFile(userId, userData, options);
      
      return filePath;
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw new Error('Data export failed');
    }
  }
  
  /**
   * Collect user data for export
   * @param userId User ID
   * @param options Export options
   * @returns Collected user data
   */
  private async collectUserData(userId: string, options: ExportOptions): Promise<any> {
    // Get user data
    const user = await LocalStorageManager.retrieveUserData(userId);
    
    // Get mood entries
    let moodEntries = await LocalStorageManager.retrieveMoodEntries(userId);
    
    // Filter by date range if specified
    if (options.startDate || options.endDate) {
      moodEntries = this.filterEntriesByDateRange(moodEntries, options.startDate, options.endDate);
    }
    
    // Collect music data if requested
    let musicData: GeneratedMusic[] = [];
    if (options.includeMusic) {
      // Get all music for entries in the filtered list
      const musicIds = moodEntries
        .filter(entry => entry.musicGenerated && entry.musicId)
        .map(entry => entry.musicId as string);
      
      // Get music data for each ID
      const musicPromises = musicIds.map(musicId => 
        LocalStorageManager.retrieveGeneratedMusic(userId, musicId)
      );
      
      // Wait for all music data to be retrieved
      const musicResults = await Promise.all(musicPromises);
      
      // Filter out null results
      musicData = musicResults.filter((item): item is GeneratedMusic => item !== null);
    }
    
    // Create the export data object
    const exportData = {
      user: user ? this.sanitizeUserData(user) : { userId },
      moodEntries,
      music: options.includeMusic ? musicData : undefined
    };
    
    return exportData;
  }
  
  /**
   * Filter entries by date range
   * @param entries Entries to filter
   * @param startDate Optional start date
   * @param endDate Optional end date
   * @returns Filtered entries
   */
  private filterEntriesByDateRange(
    entries: MoodEntry[],
    startDate?: Date,
    endDate?: Date
  ): MoodEntry[] {
    return entries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      
      // Check if entry is after start date (if specified)
      if (startDate && entryDate < startDate) {
        return false;
      }
      
      // Check if entry is before end date (if specified)
      if (endDate) {
        // Set end date to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        if (entryDate > endOfDay) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Sanitize user data for export
   * Removes sensitive information
   * @param user User data
   * @returns Sanitized user data
   */
  private sanitizeUserData(user: User): Partial<User> {
    // Create a copy without sensitive fields
    const { 
      passwordHash, 
      securityInfo,
      ...sanitizedUser 
    } = user;
    
    return sanitizedUser;
  }
  
  /**
   * Generate export file
   * @param userId User ID
   * @param data Data to export
   * @param options Export options
   * @returns Path to the generated file
   */
  private async generateExportFile(userId: string, data: any, options: ExportOptions): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mood_data_${timestamp}`;
    
    let filePath: string;
    let fileContent: string;
    
    // Generate file based on format
    if (options.format === ExportFormat.CSV) {
      filePath = `${this.EXPORT_DIRECTORY}${filename}.csv`;
      fileContent = this.convertToCSV(data);
    } else {
      // Default to JSON
      filePath = `${this.EXPORT_DIRECTORY}${filename}.json`;
      fileContent = JSON.stringify(data, null, 2);
    }
    
    // Write the file
    await FileSystem.writeAsStringAsync(filePath, fileContent);
    
    return filePath;
  }
  
  /**
   * Convert data to CSV format
   * @param data Data to convert
   * @returns CSV string
   */
  private convertToCSV(data: any): string {
    // Start with user info as metadata
    let csv = '# User Export\n';
    csv += `# User ID: ${data.user.userId}\n`;
    csv += `# Export Date: ${new Date().toISOString()}\n\n`;
    
    // Add mood entries as CSV
    if (data.moodEntries && data.moodEntries.length > 0) {
      // Create headers
      const headers = [
        'Entry ID',
        'Date',
        'Mood Rating',
        'Emotion Tags',
        'Reflection',
        'Music Generated',
        'Music ID'
      ];
      
      csv += headers.join(',') + '\n';
      
      // Add each entry
      data.moodEntries.forEach((entry: MoodEntry) => {
        const row = [
          entry.entryId,
          new Date(entry.timestamp).toISOString(),
          entry.moodRating,
          `"${entry.emotionTags.join(';')}"`,
          `"${entry.reflection.replace(/"/g, '""')}"`,
          entry.musicGenerated ? 'Yes' : 'No',
          entry.musicId || ''
        ];
        
        csv += row.join(',') + '\n';
      });
    } else {
      csv += 'No mood entries found.\n';
    }
    
    return csv;
  }
  
  /**
   * Share exported file
   * @param filePath Path to the file to share
   * @returns Whether sharing was successful
   */
  async shareExportedFile(filePath: string): Promise<boolean> {
    try {
      // Check if sharing is available
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (!isSharingAvailable) {
        console.error('Sharing is not available on this device');
        return false;
      }
      
      // Share the file
      await Sharing.shareAsync(filePath);
      return true;
    } catch (error) {
      console.error('Failed to share exported file:', error);
      return false;
    }
  }
  
  /**
   * Delete exported file
   * @param filePath Path to the file to delete
   * @returns Whether deletion was successful
   */
  async deleteExportedFile(filePath: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete exported file:', error);
      return false;
    }
  }
  
  /**
   * Get all exported files
   * @returns List of exported file paths
   */
  async getExportedFiles(): Promise<string[]> {
    try {
      // Ensure directory exists
      await this.initialize();
      
      // Read directory contents
      const files = await FileSystem.readDirectoryAsync(this.EXPORT_DIRECTORY);
      
      // Return full paths
      return files.map(file => `${this.EXPORT_DIRECTORY}${file}`);
    } catch (error) {
      console.error('Failed to get exported files:', error);
      return [];
    }
  }
  
  /**
   * Check if user has any data to export
   * @param userId User ID
   * @returns Whether user has data to export
   */
  async hasDataToExport(userId: string): Promise<boolean> {
    try {
      // Check if user has any mood entries (user profile optional)
      const entries = await LocalStorageManager.retrieveMoodEntries(userId);
      return entries.length > 0;
    } catch (error) {
      console.error('Failed to check if user has data to export:', error);
      return false;
    }
  }
}

export default new DataExportService();