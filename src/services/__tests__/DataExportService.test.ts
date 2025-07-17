import DataExportService, { ExportFormat, ExportOptions } from '../DataExportService';
import LocalStorageManager from '../LocalStorageManager';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Mock dependencies
jest.mock('../LocalStorageManager');
jest.mock('expo-file-system');
jest.mock('expo-sharing');

describe('DataExportService', () => {
  // Mock data
  const mockUserId = 'test-user-123';
  const mockUser = {
    userId: mockUserId,
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    preferredTimeRange: {
      start: '09:00',
      end: '21:00'
    },
    createdAt: Date.now(),
    lastLogin: Date.now(),
    settings: {
      notifications: true,
      theme: 'light',
      audioQuality: 'high'
    },
    accountStatus: 'active' as const
  };
  
  const mockMoodEntries = [
    {
      entryId: 'entry-1',
      userId: mockUserId,
      timestamp: Date.now() - 86400000, // 1 day ago
      moodRating: 7,
      emotionTags: ['happy', 'relaxed'],
      reflection: 'I had a good day today.',
      musicGenerated: true,
      musicId: 'music-1'
    },
    {
      entryId: 'entry-2',
      userId: mockUserId,
      timestamp: Date.now(),
      moodRating: 5,
      emotionTags: ['neutral'],
      reflection: 'Just an average day.',
      musicGenerated: false
    }
  ];
  
  const mockMusic = {
    musicId: 'music-1',
    userId: mockUserId,
    entryId: 'entry-1',
    generatedAt: Date.now() - 86400000,
    audioUrl: 'file:///path/to/music.mp3',
    duration: 120,
    musicParameters: {
      tempo: 100,
      key: 'C major',
      instruments: ['piano', 'guitar'],
      mood: 'uplifting'
    }
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock LocalStorageManager methods
    (LocalStorageManager.retrieveUserData as jest.Mock).mockResolvedValue(mockUser);
    (LocalStorageManager.retrieveMoodEntries as jest.Mock).mockResolvedValue(mockMoodEntries);
    (LocalStorageManager.retrieveGeneratedMusic as jest.Mock).mockResolvedValue(mockMusic);
    
    // Mock FileSystem methods
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(['export1.json', 'export2.csv']);
    
    // Mock Sharing methods
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
  });
  
  describe('initialize', () => {
    it('should create export directory if it does not exist', async () => {
      // Mock directory does not exist
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });
      
      await DataExportService.initialize();
      
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalled();
    });
    
    it('should not create export directory if it already exists', async () => {
      // Mock directory exists
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });
      
      await DataExportService.initialize();
      
      expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
    });
    
    it('should throw error if initialization fails', async () => {
      // Mock error
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      
      await expect(DataExportService.initialize()).rejects.toThrow('Export service initialization failed');
    });
  });
  
  describe('exportUserData', () => {
    it('should export user data in JSON format', async () => {
      const options: ExportOptions = {
        format: ExportFormat.JSON,
        includeMusic: false
      };
      
      const filePath = await DataExportService.exportUserData(mockUserId, options);
      
      expect(filePath).toBeDefined();
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(LocalStorageManager.retrieveUserData).toHaveBeenCalledWith(mockUserId);
      expect(LocalStorageManager.retrieveMoodEntries).toHaveBeenCalledWith(mockUserId);
    });
    
    it('should export user data in CSV format', async () => {
      const options: ExportOptions = {
        format: ExportFormat.CSV,
        includeMusic: false
      };
      
      const filePath = await DataExportService.exportUserData(mockUserId, options);
      
      expect(filePath).toBeDefined();
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    });
    
    it('should include music data when requested', async () => {
      const options: ExportOptions = {
        format: ExportFormat.JSON,
        includeMusic: true
      };
      
      await DataExportService.exportUserData(mockUserId, options);
      
      expect(LocalStorageManager.retrieveGeneratedMusic).toHaveBeenCalled();
    });
    
    it('should filter entries by date range when specified', async () => {
      const startDate = new Date(Date.now() - 172800000); // 2 days ago
      const endDate = new Date();
      
      const options: ExportOptions = {
        format: ExportFormat.JSON,
        includeMusic: false,
        startDate,
        endDate
      };
      
      await DataExportService.exportUserData(mockUserId, options);
      
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    });
    
    it('should throw error if user data is not found', async () => {
      // Mock user not found
      (LocalStorageManager.retrieveUserData as jest.Mock).mockResolvedValueOnce(null);
      
      const options: ExportOptions = {
        format: ExportFormat.JSON,
        includeMusic: false
      };
      
      await expect(DataExportService.exportUserData(mockUserId, options)).rejects.toThrow('User data not found');
    });
  });
  
  describe('shareExportedFile', () => {
    it('should share file if sharing is available', async () => {
      const filePath = '/path/to/export.json';
      
      const result = await DataExportService.shareExportedFile(filePath);
      
      expect(result).toBe(true);
      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith(filePath);
    });
    
    it('should return false if sharing is not available', async () => {
      // Mock sharing not available
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
      
      const filePath = '/path/to/export.json';
      
      const result = await DataExportService.shareExportedFile(filePath);
      
      expect(result).toBe(false);
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });
    
    it('should return false if sharing fails', async () => {
      // Mock sharing error
      (Sharing.shareAsync as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      
      const filePath = '/path/to/export.json';
      
      const result = await DataExportService.shareExportedFile(filePath);
      
      expect(result).toBe(false);
    });
  });
  
  describe('deleteExportedFile', () => {
    it('should delete file if it exists', async () => {
      const filePath = '/path/to/export.json';
      
      const result = await DataExportService.deleteExportedFile(filePath);
      
      expect(result).toBe(true);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(filePath);
    });
    
    it('should return false if file does not exist', async () => {
      // Mock file does not exist
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });
      
      const filePath = '/path/to/export.json';
      
      const result = await DataExportService.deleteExportedFile(filePath);
      
      expect(result).toBe(false);
      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
    });
  });
  
  describe('getExportedFiles', () => {
    it('should return list of exported files', async () => {
      const files = await DataExportService.getExportedFiles();
      
      expect(files).toHaveLength(2);
      expect(FileSystem.readDirectoryAsync).toHaveBeenCalled();
    });
    
    it('should return empty array if getting files fails', async () => {
      // Mock error
      (FileSystem.readDirectoryAsync as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      
      const files = await DataExportService.getExportedFiles();
      
      expect(files).toEqual([]);
    });
  });
  
  describe('hasDataToExport', () => {
    it('should return true if user has mood entries', async () => {
      const result = await DataExportService.hasDataToExport(mockUserId);
      
      expect(result).toBe(true);
    });
    
    it('should return false if user has no mood entries', async () => {
      // Mock empty entries
      (LocalStorageManager.retrieveMoodEntries as jest.Mock).mockResolvedValueOnce([]);
      
      const result = await DataExportService.hasDataToExport(mockUserId);
      
      expect(result).toBe(false);
    });
    
    it('should return false if user does not exist', async () => {
      // Mock user not found
      (LocalStorageManager.retrieveUserData as jest.Mock).mockResolvedValueOnce(null);
      
      const result = await DataExportService.hasDataToExport(mockUserId);
      
      expect(result).toBe(false);
    });
  });
});