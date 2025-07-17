import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MusicGenerationService from '../MusicGenerationService';
import LocalStorageManager from '../LocalStorageManager';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { MoodEntry, GeneratedMusic } from '../../types';
import { generateUUID } from '../../utils/uuid';

// Mock dependencies
vi.mock('../LocalStorageManager');
vi.mock('expo-av');
vi.mock('expo-file-system');
vi.mock('../../utils/uuid');

describe('MusicGenerationService', () => {
  // Mock mood entry for testing
  const mockMoodEntry: MoodEntry = {
    entryId: 'test-entry-id',
    userId: 'test-user-id',
    timestamp: Date.now(),
    moodRating: 7,
    emotionTags: ['happy', 'relaxed'],
    reflection: 'I had a great day today and feel very relaxed.',
    musicGenerated: false
  };
  
  // Mock generated music for testing
  const mockGeneratedMusic: GeneratedMusic = {
    musicId: 'test-music-id',
    userId: 'test-user-id',
    entryId: 'test-entry-id',
    generatedAt: Date.now(),
    audioUrl: 'file:///mock/directory/music/test-music-id.mp3',
    duration: 120,
    musicParameters: {
      tempo: 104,
      key: 'A major',
      instruments: ['piano', 'guitar', 'bass', 'percussion', 'synth'],
      mood: 'uplifting'
    }
  };
  
  // Mock sound object
  const mockSound = {
    loadAsync: vi.fn().mockResolvedValue({}),
    setOnPlaybackStatusUpdate: vi.fn(),
    playAsync: vi.fn().mockResolvedValue({}),
    pauseAsync: vi.fn().mockResolvedValue({}),
    stopAsync: vi.fn().mockResolvedValue({}),
    unloadAsync: vi.fn().mockResolvedValue({}),
    getStatusAsync: vi.fn().mockResolvedValue({ isLoaded: true, positionMillis: 30000 }),
    setPositionAsync: vi.fn().mockResolvedValue({}),
    setVolumeAsync: vi.fn().mockResolvedValue({})
  };
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mock UUID generation
    vi.mocked(generateUUID).mockReturnValue('test-music-id');
    
    // Mock LocalStorageManager methods
    vi.mocked(LocalStorageManager.updateMoodEntry).mockResolvedValue();
    vi.mocked(LocalStorageManager.storeGeneratedMusic).mockResolvedValue();
    vi.mocked(LocalStorageManager.retrieveGeneratedMusic).mockResolvedValue(mockGeneratedMusic);
    vi.mocked(LocalStorageManager.removeData).mockResolvedValue();
    
    // Mock FileSystem methods
    vi.mocked(FileSystem.getInfoAsync).mockResolvedValue({ exists: true } as any);
    vi.mocked(FileSystem.makeDirectoryAsync).mockResolvedValue();
    vi.mocked(FileSystem.deleteAsync).mockResolvedValue();
    
    // Mock Audio methods
    vi.mocked(Audio.setAudioModeAsync).mockResolvedValue();
    vi.mocked(Audio.Sound).mockImplementation(() => mockSound as any);
  });
  
  describe('initialize', () => {
    it('should create music directory if it does not exist', async () => {
      // Mock directory does not exist
      vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({ exists: false } as any);
      
      await MusicGenerationService.initialize();
      
      // Verify directory was created
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalled();
      
      // Verify audio mode was set
      expect(Audio.setAudioModeAsync).toHaveBeenCalled();
    });
    
    it('should not create music directory if it already exists', async () => {
      // Mock directory exists
      vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({ exists: true } as any);
      
      await MusicGenerationService.initialize();
      
      // Verify directory was not created
      expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
      
      // Verify audio mode was set
      expect(Audio.setAudioModeAsync).toHaveBeenCalled();
    });
    
    it('should handle errors gracefully', async () => {
      // Mock FileSystem.getInfoAsync to throw an error
      vi.mocked(FileSystem.getInfoAsync).mockRejectedValueOnce(new Error('File system error'));
      
      // Should not throw
      await expect(MusicGenerationService.initialize()).resolves.not.toThrow();
    });
  });
  
  describe('generateMusicParameters', () => {
    it('should generate music parameters based on mood rating', () => {
      const parameters = MusicGenerationService.generateMusicParameters(mockMoodEntry);
      
      // Verify parameters were generated
      expect(parameters).toBeDefined();
      expect(parameters.tempo).toBeDefined();
      expect(parameters.keySignature).toBeDefined();
      expect(parameters.scaleType).toBeDefined();
      expect(parameters.instrumentation).toBeDefined();
    });
    
    it('should adjust parameters based on emotion tags', () => {
      // Create a mood entry with specific emotion tags
      const entryWithEmotions: MoodEntry = {
        ...mockMoodEntry,
        emotionTags: ['happy', 'excited']
      };
      
      const parameters = MusicGenerationService.generateMusicParameters(entryWithEmotions);
      
      // Verify parameters were adjusted for emotions
      expect(parameters).toBeDefined();
      // Happy and excited should increase tempo
      expect(parameters.tempo).toBeGreaterThan(100);
    });
    
    it('should adjust parameters based on reflection text', () => {
      // Create a mood entry with specific reflection text
      const entryWithReflection: MoodEntry = {
        ...mockMoodEntry,
        reflection: 'I am feeling very happy and excited today.'
      };
      
      const parameters = MusicGenerationService.generateMusicParameters(entryWithReflection);
      
      // Verify parameters were adjusted for reflection text
      expect(parameters).toBeDefined();
    });
  });
  
  describe('generateMusic', () => {
    it('should generate music successfully', async () => {
      // Spy on internal methods
      const generateMusicParametersSpy = vi.spyOn(MusicGenerationService, 'generateMusicParameters');
      const createMusicGenerationRequestSpy = vi.spyOn(MusicGenerationService as any, 'createMusicGenerationRequest');
      const createGeneratedMusicObjectSpy = vi.spyOn(MusicGenerationService as any, 'createGeneratedMusicObject');
      
      // Call the method
      const result = await MusicGenerationService.generateMusic('test-user-id', mockMoodEntry);
      
      // Verify the internal methods were called
      expect(generateMusicParametersSpy).toHaveBeenCalledWith(mockMoodEntry);
      expect(createMusicGenerationRequestSpy).toHaveBeenCalledWith('test-user-id', mockMoodEntry);
      expect(createGeneratedMusicObjectSpy).toHaveBeenCalled();
      
      // Verify the mood entry was updated
      expect(LocalStorageManager.updateMoodEntry).toHaveBeenCalledWith(
        'test-user-id',
        'test-entry-id',
        expect.objectContaining({
          musicGenerated: true,
          musicId: expect.any(String)
        })
      );
      
      // Verify the generated music was stored
      expect(LocalStorageManager.storeGeneratedMusic).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          musicId: expect.any(String),
          userId: 'test-user-id',
          entryId: 'test-entry-id',
          audioUrl: expect.any(String),
          duration: expect.any(Number)
        })
      );
      
      // Verify the result
      expect(result).toBeDefined();
      expect(result?.userId).toBe('test-user-id');
      expect(result?.entryId).toBe('test-entry-id');
      expect(result?.audioUrl).toBeDefined();
    });
    
    it('should handle errors during music generation', async () => {
      // Mock LocalStorageManager.updateMoodEntry to throw an error
      vi.mocked(LocalStorageManager.updateMoodEntry).mockRejectedValueOnce(new Error('Storage error'));
      
      // Call the method
      const result = await MusicGenerationService.generateMusic('test-user-id', mockMoodEntry);
      
      // Verify the result is null
      expect(result).toBeNull();
    });
    
    it('should queue generation requests when generation is in progress', async () => {
      // Set generationInProgress to true
      Object.defineProperty(MusicGenerationService, 'generationInProgress', { value: true, writable: true });
      
      // Call the method
      const result = await MusicGenerationService.generateMusic('test-user-id', mockMoodEntry);
      
      // Verify the result is null
      expect(result).toBeNull();
      
      // Verify the request was added to the queue
      expect(MusicGenerationService['generationQueue'].length).toBeGreaterThan(0);
      
      // Reset generationInProgress
      Object.defineProperty(MusicGenerationService, 'generationInProgress', { value: false, writable: true });
    });
  });
  
  describe('playMusic', () => {
    it('should play music successfully', async () => {
      // Call the method
      const result = await MusicGenerationService.playMusic('test-music-id', 'test-user-id');
      
      // Verify the music was retrieved
      expect(LocalStorageManager.retrieveGeneratedMusic).toHaveBeenCalledWith(
        'test-user-id',
        'test-music-id'
      );
      
      // Verify the sound was loaded and played
      expect(mockSound.loadAsync).toHaveBeenCalled();
      expect(mockSound.setOnPlaybackStatusUpdate).toHaveBeenCalled();
      expect(mockSound.playAsync).toHaveBeenCalled();
      
      // Verify the result
      expect(result).toBe(true);
      
      // Verify playback status was updated
      expect(MusicGenerationService['isPlaying']).toBe(true);
      expect(MusicGenerationService['currentMusicId']).toBe('test-music-id');
    });
    
    it('should handle errors when music is not found', async () => {
      // Mock LocalStorageManager.retrieveGeneratedMusic to return null
      vi.mocked(LocalStorageManager.retrieveGeneratedMusic).mockResolvedValueOnce(null);
      
      // Call the method
      const result = await MusicGenerationService.playMusic('test-music-id', 'test-user-id');
      
      // Verify the result
      expect(result).toBe(false);
    });
    
    it('should handle errors during playback', async () => {
      // Mock Sound.loadAsync to throw an error
      mockSound.loadAsync.mockRejectedValueOnce(new Error('Playback error'));
      
      // Call the method
      const result = await MusicGenerationService.playMusic('test-music-id', 'test-user-id');
      
      // Verify the result
      expect(result).toBe(false);
    });
  });
  
  describe('pauseMusic', () => {
    it('should pause music successfully', async () => {
      // Set up sound object and playback status
      Object.defineProperty(MusicGenerationService, 'soundObject', { value: mockSound, writable: true });
      Object.defineProperty(MusicGenerationService, 'isPlaying', { value: true, writable: true });
      
      // Call the method
      const result = await MusicGenerationService.pauseMusic();
      
      // Verify the sound was paused
      expect(mockSound.pauseAsync).toHaveBeenCalled();
      
      // Verify the result
      expect(result).toBe(true);
      
      // Verify playback status was updated
      expect(MusicGenerationService['isPlaying']).toBe(false);
    });
    
    it('should return false if no sound is playing', async () => {
      // Set up no sound object
      Object.defineProperty(MusicGenerationService, 'soundObject', { value: null, writable: true });
      
      // Call the method
      const result = await MusicGenerationService.pauseMusic();
      
      // Verify the result
      expect(result).toBe(false);
    });
  });
  
  describe('resumeMusic', () => {
    it('should resume music successfully', async () => {
      // Set up sound object and playback status
      Object.defineProperty(MusicGenerationService, 'soundObject', { value: mockSound, writable: true });
      Object.defineProperty(MusicGenerationService, 'isPlaying', { value: false, writable: true });
      
      // Call the method
      const result = await MusicGenerationService.resumeMusic();
      
      // Verify the sound was played
      expect(mockSound.playAsync).toHaveBeenCalled();
      
      // Verify the result
      expect(result).toBe(true);
      
      // Verify playback status was updated
      expect(MusicGenerationService['isPlaying']).toBe(true);
    });
    
    it('should return false if no sound is loaded', async () => {
      // Set up no sound object
      Object.defineProperty(MusicGenerationService, 'soundObject', { value: null, writable: true });
      
      // Call the method
      const result = await MusicGenerationService.resumeMusic();
      
      // Verify the result
      expect(result).toBe(false);
    });
  });
  
  describe('stopMusic', () => {
    it('should stop music successfully', async () => {
      // Set up sound object and playback status
      Object.defineProperty(MusicGenerationService, 'soundObject', { value: mockSound, writable: true });
      Object.defineProperty(MusicGenerationService, 'isPlaying', { value: true, writable: true });
      Object.defineProperty(MusicGenerationService, 'currentMusicId', { value: 'test-music-id', writable: true });
      
      // Call the method
      const result = await MusicGenerationService.stopMusic();
      
      // Verify the sound was stopped and unloaded
      expect(mockSound.stopAsync).toHaveBeenCalled();
      expect(mockSound.unloadAsync).toHaveBeenCalled();
      
      // Verify the result
      expect(result).toBe(true);
      
      // Verify playback status was updated
      expect(MusicGenerationService['soundObject']).toBeNull();
      expect(MusicGenerationService['isPlaying']).toBe(false);
      expect(MusicGenerationService['currentMusicId']).toBeNull();
    });
    
    it('should return false if no sound is loaded', async () => {
      // Set up no sound object
      Object.defineProperty(MusicGenerationService, 'soundObject', { value: null, writable: true });
      
      // Call the method
      const result = await MusicGenerationService.stopMusic();
      
      // Verify the result
      expect(result).toBe(false);
    });
  });
  
  describe('getPlaybackStatus', () => {
    it('should return current playback status', () => {
      // Set up playback status
      Object.defineProperty(MusicGenerationService, 'isPlaying', { value: true, writable: true });
      Object.defineProperty(MusicGenerationService, 'currentMusicId', { value: 'test-music-id', writable: true });
      Object.defineProperty(MusicGenerationService, 'isRepeatEnabled', { value: false, writable: true });
      Object.defineProperty(MusicGenerationService, 'volume', { value: 0.8, writable: true });
      
      // Call the method
      const status = MusicGenerationService.getPlaybackStatus();
      
      // Verify the status
      expect(status.isPlaying).toBe(true);
      expect(status.currentMusicId).toBe('test-music-id');
      expect(status.isRepeatEnabled).toBe(false);
      expect(status.volume).toBe(0.8);
    });
  });
  
  describe('setRepeatMode', () => {
    it('should set repeat mode', () => {
      // Call the method
      MusicGenerationService.setRepeatMode(true);
      
      // Verify repeat mode was set
      expect(MusicGenerationService['isRepeatEnabled']).toBe(true);
    });
  });
  
  describe('setVolume', () => {
    it('should set volume successfully', async () => {
      // Set up sound object
      Object.defineProperty(MusicGenerationService, 'soundObject', { value: mockSound, writable: true });
      
      // Call the method
      const result = await MusicGenerationService.setVolume(0.5);
      
      // Verify volume was set
      expect(MusicGenerationService['volume']).toBe(0.5);
      
      // Verify volume was applied to sound object
      expect(mockSound.setVolumeAsync).toHaveBeenCalledWith(0.5);
      
      // Verify the result
      expect(result).toBe(true);
    });
    
    it('should clamp volume between 0 and 1', async () => {
      // Call the method with volume > 1
      await MusicGenerationService.setVolume(1.5);
      
      // Verify volume was clamped
      expect(MusicGenerationService['volume']).toBe(1);
      
      // Call the method with volume < 0
      await MusicGenerationService.setVolume(-0.5);
      
      // Verify volume was clamped
      expect(MusicGenerationService['volume']).toBe(0);
    });
  });
  
  describe('getPlaybackPosition', () => {
    it('should return current playback position', async () => {
      // Set up sound object and playback status
      Object.defineProperty(MusicGenerationService, 'soundObject', { value: mockSound, writable: true });
      Object.defineProperty(MusicGenerationService, 'isPlaying', { value: true, writable: true });
      
      // Call the method
      const position = await MusicGenerationService.getPlaybackPosition();
      
      // Verify position was returned (30 seconds)
      expect(position).toBe(30);
    });
    
    it('should return null if no sound is playing', async () => {
      // Set up no sound object
      Object.defineProperty(MusicGenerationService, 'soundObject', { value: null, writable: true });
      
      // Call the method
      const position = await MusicGenerationService.getPlaybackPosition();
      
      // Verify null was returned
      expect(position).toBeNull();
    });
  });
  
  describe('seekToPosition', () => {
    it('should seek to position successfully', async () => {
      // Set up sound object
      Object.defineProperty(MusicGenerationService, 'soundObject', { value: mockSound, writable: true });
      
      // Call the method
      const result = await MusicGenerationService.seekToPosition(45);
      
      // Verify position was set (45 seconds = 45000 milliseconds)
      expect(mockSound.setPositionAsync).toHaveBeenCalledWith(45000);
      
      // Verify the result
      expect(result).toBe(true);
    });
    
    it('should return false if no sound is loaded', async () => {
      // Set up no sound object
      Object.defineProperty(MusicGenerationService, 'soundObject', { value: null, writable: true });
      
      // Call the method
      const result = await MusicGenerationService.seekToPosition(45);
      
      // Verify the result
      expect(result).toBe(false);
    });
  });
  
  describe('deleteMusic', () => {
    it('should delete music successfully', async () => {
      // Call the method
      const result = await MusicGenerationService.deleteMusic('test-user-id', 'test-music-id');
      
      // Verify the music was retrieved
      expect(LocalStorageManager.retrieveGeneratedMusic).toHaveBeenCalledWith(
        'test-user-id',
        'test-music-id'
      );
      
      // Verify the file was checked
      expect(FileSystem.getInfoAsync).toHaveBeenCalled();
      
      // Verify the file was deleted
      expect(FileSystem.deleteAsync).toHaveBeenCalled();
      
      // Verify the storage was cleared
      expect(LocalStorageManager.removeData).toHaveBeenCalledWith(
        expect.stringContaining('test-music-id'),
        true
      );
      
      // Verify the result
      expect(result).toBe(true);
    });
    
    it('should stop playback if the music is currently playing', async () => {
      // Set up current music ID
      Object.defineProperty(MusicGenerationService, 'currentMusicId', { value: 'test-music-id', writable: true });
      
      // Spy on stopMusic method
      const stopMusicSpy = vi.spyOn(MusicGenerationService, 'stopMusic');
      
      // Call the method
      await MusicGenerationService.deleteMusic('test-user-id', 'test-music-id');
      
      // Verify stopMusic was called
      expect(stopMusicSpy).toHaveBeenCalled();
    });
    
    it('should return false if music is not found', async () => {
      // Mock LocalStorageManager.retrieveGeneratedMusic to return null
      vi.mocked(LocalStorageManager.retrieveGeneratedMusic).mockResolvedValueOnce(null);
      
      // Call the method
      const result = await MusicGenerationService.deleteMusic('test-user-id', 'test-music-id');
      
      // Verify the result
      expect(result).toBe(false);
    });
  });
});