import { describe, it, expect, vi, beforeEach } from 'vitest';
import MoodEntryService from '../MoodEntryService';
import LocalStorageManager from '../LocalStorageManager';
import { generateUUID } from '../../utils/uuid';
import { MoodEntry } from '../../types';

// Mock dependencies
vi.mock('../LocalStorageManager');
vi.mock('../../utils/uuid');

describe('MoodEntryService', () => {
  // Mock data
  const mockUserId = 'test-user-123';
  const mockEntryId = 'test-entry-123';
  const mockMoodRating = 7;
  const mockEmotionTags = ['happy', 'relaxed'];
  const mockReflection = 'I had a good day today.';
  
  // Mock mood entries
  const mockMoodEntries: MoodEntry[] = [
    {
      entryId: mockEntryId,
      userId: mockUserId,
      timestamp: Date.now(), // Today
      moodRating: mockMoodRating,
      emotionTags: mockEmotionTags,
      reflection: mockReflection,
      musicGenerated: false
    },
    {
      entryId: 'old-entry-123',
      userId: mockUserId,
      timestamp: Date.now() - 86400000 * 2, // 2 days ago
      moodRating: 5,
      emotionTags: ['neutral'],
      reflection: 'Just an average day.',
      musicGenerated: true,
      musicId: 'music-123'
    }
  ];
  
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock UUID generation
    vi.mocked(generateUUID).mockReturnValue(mockEntryId);
    
    // Mock LocalStorageManager methods
    vi.mocked(LocalStorageManager.storeMoodEntry).mockResolvedValue();
    vi.mocked(LocalStorageManager.retrieveMoodEntries).mockResolvedValue(mockMoodEntries);
  });
  
  describe('saveMoodEntry', () => {
    it('should save a mood entry successfully', async () => {
      const result = await MoodEntryService.saveMoodEntry(
        mockUserId,
        mockMoodRating,
        mockEmotionTags,
        mockReflection
      );
      
      // Verify entry was created with correct data
      expect(result).toBeDefined();
      expect(result.entryId).toBe(mockEntryId);
      expect(result.userId).toBe(mockUserId);
      expect(result.moodRating).toBe(mockMoodRating);
      expect(result.emotionTags).toEqual(mockEmotionTags);
      expect(result.reflection).toBe(mockReflection);
      expect(result.musicGenerated).toBe(false);
      
      // Verify entry was stored
      expect(LocalStorageManager.storeMoodEntry).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          entryId: mockEntryId,
          userId: mockUserId,
          moodRating: mockMoodRating,
          emotionTags: mockEmotionTags,
          reflection: mockReflection
        })
      );
    });
    
    it('should save a mood entry with default values for optional parameters', async () => {
      const result = await MoodEntryService.saveMoodEntry(mockUserId, mockMoodRating);
      
      // Verify entry was created with default values
      expect(result.emotionTags).toEqual([]);
      expect(result.reflection).toBe('');
      
      // Verify entry was stored
      expect(LocalStorageManager.storeMoodEntry).toHaveBeenCalled();
    });
    
    it('should throw an error if mood rating is invalid', async () => {
      // Test with mood rating below minimum
      await expect(MoodEntryService.saveMoodEntry(mockUserId, 0)).rejects.toThrow('Mood rating must be between 1 and 10');
      
      // Test with mood rating above maximum
      await expect(MoodEntryService.saveMoodEntry(mockUserId, 11)).rejects.toThrow('Mood rating must be between 1 and 10');
    });
    
    it('should throw an error if storage fails', async () => {
      // Mock LocalStorageManager.storeMoodEntry to throw an error
      vi.mocked(LocalStorageManager.storeMoodEntry).mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(MoodEntryService.saveMoodEntry(mockUserId, mockMoodRating)).rejects.toThrow('Failed to save mood entry');
    });
  });
  
  describe('getMoodEntries', () => {
    it('should retrieve all mood entries for a user', async () => {
      const result = await MoodEntryService.getMoodEntries(mockUserId);
      
      // Verify entries were retrieved
      expect(result).toEqual(mockMoodEntries);
      expect(LocalStorageManager.retrieveMoodEntries).toHaveBeenCalledWith(mockUserId);
    });
    
    it('should return an empty array if retrieval fails', async () => {
      // Mock LocalStorageManager.retrieveMoodEntries to throw an error
      vi.mocked(LocalStorageManager.retrieveMoodEntries).mockRejectedValueOnce(new Error('Retrieval error'));
      
      const result = await MoodEntryService.getMoodEntries(mockUserId);
      
      // Verify empty array was returned
      expect(result).toEqual([]);
    });
  });
  
  describe('getTodaysMoodEntry', () => {
    it('should retrieve today\'s mood entry if it exists', async () => {
      // Mock Date.now to return a fixed timestamp
      const realDateNow = Date.now;
      const mockNow = mockMoodEntries[0].timestamp;
      global.Date.now = vi.fn(() => mockNow);
      
      const result = await MoodEntryService.getTodaysMoodEntry(mockUserId);
      
      // Verify today's entry was returned
      expect(result).toEqual(mockMoodEntries[0]);
      
      // Restore Date.now
      global.Date.now = realDateNow;
    });
    
    it('should return null if no entry exists for today', async () => {
      // Mock Date.now to return a timestamp for tomorrow
      const realDateNow = Date.now;
      const mockNow = mockMoodEntries[0].timestamp + 86400000; // Tomorrow
      global.Date.now = vi.fn(() => mockNow);
      
      const result = await MoodEntryService.getTodaysMoodEntry(mockUserId);
      
      // Verify null was returned
      expect(result).toBeNull();
      
      // Restore Date.now
      global.Date.now = realDateNow;
    });
    
    it('should return null if retrieval fails', async () => {
      // Mock LocalStorageManager.retrieveMoodEntries to throw an error
      vi.mocked(LocalStorageManager.retrieveMoodEntries).mockRejectedValueOnce(new Error('Retrieval error'));
      
      const result = await MoodEntryService.getTodaysMoodEntry(mockUserId);
      
      // Verify null was returned
      expect(result).toBeNull();
    });
  });
  
  describe('hasLoggedMoodToday', () => {
    it('should return true if user has logged a mood today', async () => {
      // Mock getTodaysMoodEntry to return an entry
      vi.spyOn(MoodEntryService, 'getTodaysMoodEntry').mockResolvedValueOnce(mockMoodEntries[0]);
      
      const result = await MoodEntryService.hasLoggedMoodToday(mockUserId);
      
      // Verify true was returned
      expect(result).toBe(true);
    });
    
    it('should return false if user has not logged a mood today', async () => {
      // Mock getTodaysMoodEntry to return null
      vi.spyOn(MoodEntryService, 'getTodaysMoodEntry').mockResolvedValueOnce(null);
      
      const result = await MoodEntryService.hasLoggedMoodToday(mockUserId);
      
      // Verify false was returned
      expect(result).toBe(false);
    });
  });
});