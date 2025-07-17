import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MusicGenerationService from '../services/MusicGenerationService';

interface MusicDebugPanelProps {
  userId: string;
}

const MusicDebugPanel: React.FC<MusicDebugPanelProps> = ({ userId }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string>('Ready');
  const [lastGeneratedMusicId, setLastGeneratedMusicId] = useState<string | null>(null);

  const testMusicGeneration = async () => {
    setIsGenerating(true);
    setStatus('Testing music generation...');
    
    try {
      const generatedMusic = await MusicGenerationService.debugMusicGeneration(userId);
      
      if (generatedMusic) {
        setLastGeneratedMusicId(generatedMusic.musicId);
        setStatus(`Music generation successful! Music ID: ${generatedMusic.musicId}`);
        Alert.alert('Success', `Music generation completed successfully!\nMusic ID: ${generatedMusic.musicId}\nDuration: ${generatedMusic.duration}s`);
      } else {
        setStatus('Music generation failed or was queued.');
        Alert.alert('Info', 'Music generation failed or was queued. Check the console for details.');
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Error', `Music generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const checkServiceStatus = () => {
    const isGenerating = MusicGenerationService.isGenerating();
    const queueLength = MusicGenerationService.getQueueLength();
    const playbackStatus = MusicGenerationService.getPlaybackStatus();
    
    const statusInfo = `
Service Status:
- Generating: ${isGenerating}
- Queue Length: ${queueLength}
- Currently Playing: ${playbackStatus.isPlaying}
- Current Music ID: ${playbackStatus.currentMusicId || 'None'}
- Volume: ${playbackStatus.volume}
- Repeat Mode: ${playbackStatus.isRepeatEnabled}
    `.trim();
    
    setStatus(statusInfo);
    Alert.alert('Service Status', statusInfo);
  };

  const testPlayback = async () => {
    try {
      if (!lastGeneratedMusicId) {
        setStatus('No music generated yet. Generate music first.');
        return;
      }
      
      // Try to play the most recent generated music
      const success = await MusicGenerationService.playMusic(lastGeneratedMusicId, userId);
      if (success) {
        setStatus('Playback started successfully!');
      } else {
        setStatus('No music available for playback. Try generating music first.');
      }
    } catch (error) {
      setStatus(`Playback error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎵 Music Generation Debug Panel</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isGenerating && styles.buttonDisabled]}
          onPress={testMusicGeneration}
          disabled={isGenerating}
        >
          <Text style={styles.buttonText}>
            {isGenerating ? 'Generating...' : 'Test Music Generation'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={checkServiceStatus}
        >
          <Text style={styles.buttonText}>Check Service Status</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={testPlayback}
        >
          <Text style={styles.buttonText}>Test Playback</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={styles.statusText}>{status}</Text>
        {lastGeneratedMusicId && (
          <Text style={styles.statusText}>
            Last Music ID: {lastGeneratedMusicId}
          </Text>
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          💡 This panel helps debug music generation. The system will:
        </Text>
        <Text style={styles.infoText}>
          • Try Hugging Face MusicGen API first
        </Text>
        <Text style={styles.infoText}>
          • Fall back to enhanced procedural generation
        </Text>
        <Text style={styles.infoText}>
          • Generate 8-second mood-based music
        </Text>
        <Text style={styles.infoText}>
          • Check console for detailed logs
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  statusContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  statusText: {
    color: '#666',
    fontSize: 14,
  },
  infoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e8f4fd',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#b3d9f2',
  },
  infoText: {
    color: '#2c5aa0',
    fontSize: 14,
    marginBottom: 2,
  },
});

export default MusicDebugPanel; 