import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  Share,
} from 'react-native';
// Using a custom Slider component since @react-native-community/slider is not installed
// In a real app, we would install @react-native-community/slider for better performance and features

// Create a simple Slider component if the import fails
const SliderComponent = ({ 
  style, 
  value, 
  minimumTrackTintColor, 
  maximumTrackTintColor, 
  thumbTintColor, 
  onValueChange 
}: {
  style: any;
  minimumValue?: number; // Not used but kept for API compatibility
  maximumValue?: number; // Not used but kept for API compatibility
  value: number;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
  onValueChange: (value: number) => void;
}) => {
  // Calculate the width of the container for touch position calculation
  const [containerWidth, setContainerWidth] = useState<number>(0);
  
  const handleLayout = (event: any) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };
  
  const handleTouch = (event: any) => {
    if (containerWidth === 0) return;
    
    // Calculate the new value based on touch position
    const touchX = event.nativeEvent.locationX;
    let newValue = (touchX / containerWidth);
    
    // Clamp the value between 0 and 1
    newValue = Math.max(0, Math.min(1, newValue));
    
    // Call the onValueChange callback
    onValueChange(newValue);
  };
  
  return (
    <View 
      style={[style, { height: 40, justifyContent: 'center' }]}
      onLayout={handleLayout}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
    >
      <View style={{ height: 2, backgroundColor: maximumTrackTintColor, width: '100%' }} />
      <View 
        style={{ 
          position: 'absolute', 
          height: 2, 
          backgroundColor: minimumTrackTintColor, 
          width: `${value * 100}%` 
        }} 
      />
      <View
        style={{
          position: 'absolute',
            left: `${value * 100}%`,
            marginLeft: value <= 0 ? 0 : -10,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: thumbTintColor,
        }}
      />
    </View>
  );
};
import { Ionicons } from '@expo/vector-icons';
import MusicGenerationService from '../services/MusicGenerationService';
import WaveformView from './WaveformView';
import MoodEntryService from '../services/MoodEntryService';
import { GeneratedMusic } from '../types';
import * as FileSystem from 'expo-file-system';

interface MusicPlayerProps {
  musicId: string;
  userId: string;
  onError?: (message: string) => void;
}

/**
 * Music Player component for playing generated music
 * Implements requirements:
 * - 6.3: "WHEN music generation is complete THEN the system SHALL notify the user that their mood music is ready"
 * - 6.4: "WHEN a user views their mood entry THEN the system SHALL provide controls to play, pause, and save the generated music"
 * - 6.5: "WHEN a user accesses their mood history THEN the system SHALL allow replaying previously generated music pieces"
 */
const MusicPlayer: React.FC<MusicPlayerProps> = ({ musicId, userId, onError }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [musicDetails, setMusicDetails] = useState<GeneratedMusic | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(1.0); // Default to full volume
  
  
  // Animation for the equalizer effect
  const [animation] = useState(new Animated.Value(0));
  
  // State for playback status message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  
  // Load music details when component mounts
  useEffect(() => {
    loadMusicDetails();
    
    // Start the animation loop for the equalizer effect
    startAnimation();
  }, [musicId, userId]);
  
  // Set up progress update interval
  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (isPlaying) {
        updateProgress();
      }
    }, 1000);
    
    // Clean up interval on unmount or when isPlaying changes
    return () => {
      clearInterval(progressInterval);
    };
  }, [isPlaying, musicId]);
  
  // Clean up music on unmount
  useEffect(() => {
    return () => {
      MusicGenerationService.stopMusic();
    };
  }, []);

  // Ensure repeat mode is enabled by default
  useEffect(() => {
    MusicGenerationService.setRepeatMode(true);
  }, []);
  
  // Update status message when playback state changes
  useEffect(() => {
    if (isLoading) {
      setStatusMessage('Loading music...');
    } else if (isPlaying) {
      setStatusMessage('Playing');
    } else if (currentTime > 0) {
      setStatusMessage('Paused');
    } else {
      setStatusMessage(null);
    }
  }, [isLoading, isPlaying, currentTime]);
  
  // Start the animation loop for the equalizer effect
  const startAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false, // FIX: height animation not supported by native driver
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false, // FIX: height animation not supported by native driver
        }),
      ])
    ).start();
  };
  
  // Load music details from the service
  const loadMusicDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get music details from local storage
      const music = await MusicGenerationService.retrieveGeneratedMusic(userId, musicId);
      
      if (!music) {
        throw new Error('Music not found');
      }
      
      setMusicDetails(music);
      setDuration(music.duration);

      // Determine if this music is locked (most recent entry)
      try {
        const entries = await MoodEntryService.getMoodEntries(userId);
        const latest = [...entries].reduce((acc, e) => (e.timestamp > acc.timestamp ? e : acc), entries[0]);
        const locked = latest && latest.entryId === music.entryId;
        setIsLocked(!!locked);
      } catch (lockErr) {
        // If we cannot determine, default to not locked to avoid blocking unexpectedly
        setIsLocked(false);
      }
      
      // Check if this music is currently playing
      const playbackStatus = MusicGenerationService.getPlaybackStatus();
      setIsPlaying(playbackStatus.isPlaying && playbackStatus.currentMusicId === musicId);
      
      // Note: Music ready notification is now sent only when music generation completes,
      // not when the music player loads. This prevents unnecessary notifications
      // when users open existing mood entries.
      
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load music';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  };
  
  // Update progress based on current playback
  const updateProgress = async () => {
    try {
      const playbackStatus = MusicGenerationService.getPlaybackStatus();
      console.log('Progress update - playbackStatus:', playbackStatus, 'musicId:', musicId, 'isPlaying:', isPlaying);
      
      // If this music is playing, update the progress
      if (playbackStatus.isPlaying && playbackStatus.currentMusicId === musicId) {
        console.log('This music is playing, updating progress...');
        
        // Get the current playback position from the service
        const position = await MusicGenerationService.getPlaybackPosition();
        console.log('Current position from service:', position);
        
        if (position !== null) {
          setCurrentTime(position);
          
          // Update progress percentage
          if (duration > 0) {
            const newProgress = position / duration;
            setProgress(newProgress);
            console.log('Updated progress:', newProgress, 'position:', position, 'duration:', duration);
          }
          
          // Check if we've reached the end of the track
          if (position >= duration) {
            console.log('Reached end of track, stopping...');
            handleStop();
          }
        } else {
          console.log('Position is null, using fallback...');
          // Fallback if we can't get the actual position
          setCurrentTime(prev => {
            const newTime = prev + 1;
            if (newTime >= duration) {
              // Stop playback when we reach the end
              handleStop();
              return 0;
            }
            return newTime;
          });
          
          // Update progress percentage
          if (duration > 0) {
            setProgress(currentTime / duration);
          }
        }
      } else {
        console.log('This music is not playing or not the current music');
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Handle play button press
  const handlePlay = async () => {
    try {
      console.log('Play button pressed for music ID:', musicId);
      console.log('Current music details:', musicDetails);
      if (isLocked) {
        Alert.alert('Locked', '🔒 This AI sound will be available after your next successful daily log.');
        return;
      }
      
      if (isPlaying) {
        // If already playing, pause
        console.log('Pausing current music...');
        const success = await MusicGenerationService.pauseMusic();
        if (success) {
          setIsPlaying(false);
          console.log('Music paused successfully');
        }
      } else {
        // If not playing, start or resume
        const playbackStatus = MusicGenerationService.getPlaybackStatus();
        console.log('Current playback status:', playbackStatus);
        console.log('Comparing musicId:', musicId, 'with currentMusicId:', playbackStatus.currentMusicId);
        
        let success;
        if (playbackStatus.currentMusicId === musicId && playbackStatus.isPlaying === false) {
          // Resume if it's the same music but paused
          console.log('Resuming music...');
          success = await MusicGenerationService.resumeMusic();
        } else {
          // Start playing if it's different music or not currently playing
          console.log('Starting new music playback...');
          success = await MusicGenerationService.playMusic(musicId, userId);
          
          // Set the repeat mode and volume
          await MusicGenerationService.setRepeatMode(isRepeatEnabled);
          await MusicGenerationService.setVolume(volume);
        }
        
        if (success) {
          setIsPlaying(true);
          setCurrentTime(0);
          setProgress(0);
          console.log('Music playback started successfully');
        } else {
          console.log('Music playback failed');
          setError('Failed to start music playback');
        }
      }
    } catch (error) {
      console.error('Error playing/pausing music:', error);
      setError('Failed to play music');
    }
  };
  
  // Handle repeat button press
  const handleRepeatToggle = async () => {
    const newRepeatState = !isRepeatEnabled;
    setIsRepeatEnabled(newRepeatState);
    MusicGenerationService.setRepeatMode(newRepeatState);
  };
  
  // Handle volume change
  
  
  // Toggle detailed music information display
  
  
  // Handle stop button press
  const handleStop = async () => {
    try {
      const success = await MusicGenerationService.stopMusic();
      if (success) {
        setIsPlaying(false);
        setCurrentTime(0);
        setProgress(0);
      }
    } catch (error) {
      console.error('Error stopping music:', error);
    }
  };
  
  // Handle slider change
  const handleSliderChange = async (value: number) => {
    // Update the UI immediately for responsiveness
    setProgress(value);
    const newTime = value * duration;
    setCurrentTime(newTime);
    
    // Seek to the new position in the audio
    try {
      await MusicGenerationService.seekToPosition(newTime);
    } catch (error) {
      console.error('Error seeking to position:', error);
    }
  };
  
  // Handle download button press
  const handleDownload = async () => {
    try {
      if (!musicDetails || !musicDetails.audioUrl) {
        setError('No music file available to download');
        return;
      }
      
      // Create a directory in the documents directory to save the music
      const downloadDir = `${FileSystem.documentDirectory}downloads/`;
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }
      
      // Generate a filename for the downloaded file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `mood_music_${timestamp}.mp3`;
      const destinationUri = `${downloadDir}${fileName}`;
      
      // Copy the file to the downloads directory
      await FileSystem.copyAsync({
        from: musicDetails.audioUrl,
        to: destinationUri
      });
      
      // Show success message
      Alert.alert(
        'Download Complete',
        `Music saved to your downloads folder as "${fileName}"`,
        [{ text: 'OK' }]
      );
      
      // Share the file
      await Share.share({
        title: 'Share your mood music',
        message: 'Check out this music generated from my mood!',
        url: destinationUri
      });
      
    } catch (error) {
      console.error('Error downloading music:', error);
      setError('Failed to download music');
    }
  };
  
  // If there's an error, show error message
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadMusicDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // If loading, show loading indicator
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4a90e2" />
        <Text style={styles.loadingText}>Loading music...</Text>
      </View>
    );
  }
  
  // If no music details, show error
  if (!musicDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Music not found</Text>
      </View>
    );
  }
  
  // Create animated values for equalizer bars
  const bar1Height = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 15],
  });
  
  const bar2Height = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [5, 20],
  });
  
  const bar3Height = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [7, 12],
  });
  
  return (
    <View style={styles.container}>
      <View style={styles.musicInfoContainer}>
        <View style={styles.musicDetails}>
          <Text style={styles.musicTitle}>Generated Sound</Text>
          {statusMessage && (
            <Text style={styles.statusMessage}>{statusMessage}</Text>
          )}
        </View>
        
        {isPlaying && (
          <View style={styles.equalizerContainer}>
            <Animated.View style={[styles.equalizerBar, { height: bar1Height }]} />
            <Animated.View style={[styles.equalizerBar, { height: bar2Height }]} />
            <Animated.View style={[styles.equalizerBar, { height: bar3Height }]} />
          </View>
        )}
      </View>
      
      <View style={styles.progressContainer}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        {musicDetails?.waveformPeaks && musicDetails.waveformPeaks.length > 0 ? (
          <WaveformView peaks={musicDetails.waveformPeaks} progress={progress} />
        ) : (
          <SliderComponent
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={1}
            value={progress}
            minimumTrackTintColor="#4a90e2"
            maximumTrackTintColor="#d3d3d3"
            thumbTintColor="#4a90e2"
            onValueChange={handleSliderChange}
          />
        )}
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
      
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={handleStop}>
          <Ionicons name="stop" size={24} color="#4a90e2" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={32}
            color="white"
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, isRepeatEnabled && styles.activeControlButton]} 
          onPress={handleRepeatToggle}
        >
          <Ionicons name="repeat" size={24} color={isRepeatEnabled ? "white" : "#4a90e2"} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={handleDownload}>
          <Ionicons name="download-outline" size={24} color="#4a90e2" />
        </TouchableOpacity>
      </View>
      
      
      
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    borderRadius: 12,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  musicInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  musicDetails: {
    flex: 1,
  },
  musicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  musicSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statusMessage: {
    fontSize: 12,
    color: '#4a90e2',
    marginTop: 3,
    fontStyle: 'italic',
  },
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    width: 30,
  },
  equalizerBar: {
    width: 4,
    backgroundColor: '#4a90e2',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressSlider: {
    flex: 1,
    height: 40,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 15,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  activeControlButton: {
    backgroundColor: '#4a90e2',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4a90e2',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  instrumentsContainer: {
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  instrumentsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailsToggle: {
    fontSize: 12,
    color: '#4a90e2',
    textDecorationLine: 'underline',
  },
  instrumentsText: {
    fontSize: 14,
    color: '#666',
  },
  detailsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
  },
});

export default MusicPlayer;