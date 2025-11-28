import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MoodEntryService from '../services/MoodEntryService';
import MoodEntryList from '../components/MoodEntryList';
// Charts UI removed from rendering (implementation kept in its own file)
import MusicPlayer from '../components/MusicPlayer';
// Data export UI removed from rendering
import { MoodEntry } from '../types';
// Date range calendar UI removed from rendering
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import WeeklySoundService from '../services/WeeklySoundService';

const HistoryScreen = ({ route }: any) => {
  // Use demo user for web compatibility
  const user = { userId: 'demo-user' };
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedEntry, setSelectedEntry] = useState<MoodEntry | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  
  // Tabs removed from UI; keep list view only
  

  // Load mood entries when component mounts
  useEffect(() => {
    loadMoodEntries();
  }, []);

  // Refresh when user navigates back to this screen (e.g., after adding a mood entry)
  useFocusEffect(
    useCallback(() => {
      console.log('📱 [HistoryScreen] Screen focused, refreshing entries');
      loadMoodEntries();
      // Backfill any missing labels
      (async () => {
        try {
          await MoodEntryService.backfillPromptLabels(user.userId);
          // Reload to reflect any changes
          await loadMoodEntries();
        } catch {}
      })();
    }, [])
  );

  // Smart refresh system: only refresh once when there are entries with pending music generation
  useEffect(() => {
    // Check if there are any recent entries (within last 2 minutes) with music generation in progress
    const now = Date.now();
    const twoMinutesAgo = now - (2 * 60 * 1000);
    
    const hasRecentGeneratingEntries = moodEntries.some(entry => 
      entry.timestamp > twoMinutesAgo && // Recent entry
      !entry.musicGenerated && // Music not generated yet
      entry.musicId === undefined // No music ID assigned
    );
    
    if (hasRecentGeneratingEntries) {
      // Set up a single delayed refresh to catch music generation completion
      // Music generation typically takes 10-30 seconds, so we refresh once after 45 seconds
      const refreshTimer = setTimeout(() => {
        console.log('📱 [HistoryScreen] Single refresh to check for music generation completion');
        loadMoodEntries();
      }, 45000); // Single refresh after 45 seconds

      return () => clearTimeout(refreshTimer);
    }
  }, [moodEntries]);

  // Load mood entries from the service
  const loadMoodEntries = async () => {
    setIsLoading(true);
    try {
      const entries = await MoodEntryService.getMoodEntries(user.userId);
      setMoodEntries(entries);
    } catch (error) {
      console.error('Error loading mood entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle entry press to show details
  const handleEntryPress = (entry: MoodEntry) => {
    setSelectedEntry(entry);
    setDetailModalVisible(true);
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
  };

  // Map numeric mood rating to user-facing label (hide 1-10)
  const getMoodLabel = (rating: number): string => {
    if (rating >= 9) return 'Very Pleasant';
    if (rating >= 7) return 'Pleasant';
    if (rating === 6) return 'Slightly Pleasant';
    if (rating === 5) return 'Neutral';
    if (rating === 4) return 'Slightly Unpleasant';
    if (rating >= 2) return 'Unpleasant';
    return 'Very Unpleasant';
  };

  // Date range filtering removed from UI (implementation kept for future use)

  // Render the detail modal
  const [reactionSheetVisible, setReactionSheetVisible] = useState(false);
  const [pendingReaction, setPendingReaction] = useState<-2 | -1 | 0 | 1 | 2 | null>(0);
  const [sliderValue, setSliderValue] = useState<number>(0.5);

  const getReactionLabel = (value: -2 | -1 | 0 | 1 | 2): string => {
    switch (value) {
      case -2: return 'Very discordant';
      case -1: return 'Discordant';
      case 0: return 'Neutral';
      case 1: return 'Concordant';
      case 2: return 'Very concordant';
      default: return '';
    }
  };

  const renderDetailModal = () => {
    if (!selectedEntry) return null;
    // Determine if the selected entry is the most recent (locked sound)
    const latest = moodEntries.reduce((acc, e) => (e.timestamp > acc.timestamp ? e : acc), moodEntries[0] || selectedEntry);
    const isMostRecent = selectedEntry.entryId === latest.entryId;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.detailDate}>{formatDate(selectedEntry.timestamp)}</Text>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Mood:</Text>
              <View style={styles.ratingContainer}>
                <Text style={styles.detailText}>{getMoodLabel(selectedEntry.moodRating)}</Text>
              </View>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Emotions:</Text>
              <View style={styles.emotionContainer}>
                {selectedEntry.emotionTags.map((emotion, index) => (
                  <Text key={index} style={styles.emotionTag}>{emotion}</Text>
                ))}
              </View>
            </View>
            {selectedEntry.influences && selectedEntry.influences.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Influences:</Text>
                <View style={styles.emotionContainer}>
                  {selectedEntry.influences.map((inf, index) => (
                    <Text key={index} style={styles.emotionTag}>{inf}</Text>
                  ))}
                </View>
              </View>
            )}
            
            {selectedEntry.reflectionPrompt && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Prompt Asked:</Text>
                <Text style={styles.detailText}>{selectedEntry.reflectionPrompt}</Text>
              </View>
            )}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Response:</Text>
              <Text style={styles.detailText}>{selectedEntry.reflection}</Text>
            </View>
            {(selectedEntry.promptLabel || selectedEntry.promptPrefix) && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>AI Sound Label:</Text>
                <Text style={styles.detailText}>
                  {selectedEntry.promptLabel || (selectedEntry.promptPrefix || 'No label')}
                </Text>
              </View>
            )}
            
            {selectedEntry.musicId && !isMostRecent && (
              <View style={styles.detailSection}>
                <MusicPlayer 
                  musicId={selectedEntry.musicId as string}
                  userId={user.userId}
                  onError={(message) => console.error(`Music player error: ${message}`)}
                />
              </View>
            )}
            {isMostRecent && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Generated Sound:</Text>
                <Text style={styles.lockInfo}>🔒 Locked until your next successful daily log</Text>
              </View>
            )}

            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                if (selectedEntry?.musicId && !selectedEntry?.soundReaction && !isMostRecent) {
                  // Close the detail modal first, then open the bottom sheet
                  setDetailModalVisible(false);
                  setTimeout(() => setReactionSheetVisible(true), 150);
                } else {
                  setDetailModalVisible(false);
                }
              }}
            >
              <Text style={styles.closeButtonText}>{selectedEntry?.musicId && !selectedEntry?.soundReaction && !isMostRecent ? 'React to sound' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Calendar modal removed from UI

  // Helper function to get all dates in a range
  const getDatesInRange = (startDate: string, endDate: string) => {
    const dates = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    // Add all dates between start and end (exclusive)
    while (currentDate < end) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate < end) {
        dates.push(format(currentDate, 'yyyy-MM-dd'));
      }
    }
    
    return dates;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mood History</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadMoodEntries}
          >
            <Ionicons name="refresh" size={20} color="#555" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Show info when music generation might be in progress */}
      {/* Removed: generation status visual, as the most recent entry is soft-locked */}
      
      {/* Tabs removed: always show list view */}
      <MoodEntryList
        entries={moodEntries}
        isLoading={isLoading}
        onEntryPress={handleEntryPress}
      />
      
      {renderDetailModal()}

      {/* Reaction bottom sheet */}
      <Modal
        animationType="slide"
        transparent
        visible={reactionSheetVisible}
        onRequestClose={() => setReactionSheetVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetContainer}>
            <Text style={styles.sheetTitle}>How well did this sound match your response?</Text>
            <Text style={styles.selectedCaption}>{getReactionLabel(Math.max(-2, Math.min(2, Math.round(sliderValue * 4) - 2)) as -2 | -1 | 0 | 1 | 2)}</Text>
            <View style={styles.reactionSliderWrap}>
              <ReactionSlider
                value={sliderValue}
                onChange={(val) => {
                  setSliderValue(val);
                }}
                onRelease={(val) => {
                  const mapped = Math.max(-2, Math.min(2, Math.round(val * 4) - 2)) as -2 | -1 | 0 | 1 | 2;
                  setPendingReaction(mapped);
                  setSliderValue((mapped + 2) / 4);
                }}
              />
              <View style={styles.reactionExtremesRow}>
                <Text style={styles.extremeText}>Very discordant</Text>
                <Text style={styles.extremeText}>Very concordant</Text>
              </View>
            </View>
            <View style={styles.sheetButtonsRow}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => { setPendingReaction(null); setReactionSheetVisible(false); }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetSave, { opacity: pendingReaction === null ? 0.5 : 1 }]} disabled={pendingReaction === null} onPress={async () => {
                try {
                  if (!selectedEntry || pendingReaction === null) return;
                  await MoodEntryService.updateSoundReaction(user.userId, selectedEntry.entryId, pendingReaction);
                  setReactionSheetVisible(false);
                  setDetailModalVisible(false);
                  await loadMoodEntries();
                } catch (e) {
                  Alert.alert('Error', 'Failed to save reaction');
                }
              }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Data Export UI removed */}
    </View>
  );
};

// Minimal custom slider for reaction (0..1)
const ReactionSlider = ({ value, onChange, onRelease }: { value: number; onChange: (v: number) => void; onRelease?: (v: number) => void }) => {
  const clamped = Math.max(0, Math.min(1, value || 0));
  const [trackWidth, setTrackWidth] = React.useState(0);
  const startPageXRef = React.useRef(0);
  const startValueRef = React.useRef(clamped);

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const computeValueFromDelta = (pageX: number) => {
    if (trackWidth <= 0) return clamped;
    const dx = pageX - startPageXRef.current;
    const next = startValueRef.current + dx / trackWidth;
    return Math.max(0, Math.min(1, next));
  };

  return (
    <View
      style={{ paddingVertical: 14 }}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        startPageXRef.current = e.nativeEvent.pageX;
        startValueRef.current = clamped;
      }}
      onResponderMove={(e) => onChange(computeValueFromDelta(e.nativeEvent.pageX))}
      onResponderRelease={(e) => {
        const v = computeValueFromDelta(e.nativeEvent.pageX);
        onChange(v);
        onRelease && onRelease(v);
      }}
    >
      <View style={styles.sliderTrack} onLayout={handleLayout}>
        <View style={[styles.sliderFill, { width: trackWidth > 0 ? Math.round(clamped * trackWidth) : `${clamped * 100}%` }]} />
        {trackWidth > 0 && (
          <View style={[
            styles.sliderThumb,
            { left: Math.round(clamped * trackWidth), transform: [{ translateX: -10 }] },
          ]} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#e0e0e0',
    padding: 8,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: '#e0e0e0',
    padding: 8,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateFilterButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  dateFilterText: {
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTabButton: {
    backgroundColor: '#4a90e2',
  },
  tabText: {
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Removed modalTitle usage to keep header compact
  detailDate: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detailSection: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 15,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIndicator: {
    // removed colored indicator from detail view
    width: 0,
    height: 0,
    marginLeft: 0,
  },
  emotionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emotionTag: {
    backgroundColor: '#f0f0f0',
    padding: 5,
    borderRadius: 10,
    marginRight: 5,
    marginBottom: 5,
    fontSize: 14,
  },
  musicText: {
    fontSize: 14,
    color: '#4a90e2',
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reactionPill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
  },
  reactionPillSelected: {
    backgroundColor: '#4a90e2',
  },
  reactionPillText: {
    fontSize: 12,
    color: '#333',
  },
  reactionPillTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  reactionInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  calendarButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  calendarButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
  },
  applyButton: {
    backgroundColor: '#4a90e2',
  },
  buttonText: {
    fontWeight: 'bold',
    color: 'white',
  },
  musicGenerationInfo: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  musicGenerationText: {
    fontSize: 14,
    color: '#1565C0',
    textAlign: 'center',
  },
  lockInfo: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
    marginTop: 6,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  sheetContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  sheetPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  sheetPillSelected: {
    backgroundColor: '#4a90e2',
  },
  sheetPillText: {
    fontSize: 12,
    color: '#333',
  },
  sheetPillTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  sheetButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  reactionSliderWrap: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 2,
  },
  reactionExtremesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  extremeText: {
    color: '#6B7280',
    fontSize: 12,
  },
  selectedCaption: {
    marginTop: 10,
    textAlign: 'center',
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  sheetCancel: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  sheetSave: {
    backgroundColor: '#4a90e2',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'visible',
  },
  sliderFill: {
    height: 8,
    backgroundColor: '#4a90e2',
    borderRadius: 999,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4a90e2',
  },
});

export default HistoryScreen;
// Weekly Sound Tab Component
const WeeklySoundTab = ({ userId, weeklySelections, onSelectionMade }: { userId: string; weeklySelections: any[]; onSelectionMade: () => void }) => {
  const [targetWeekStart, setTargetWeekStart] = useState<number>(WeeklySoundService.getLastWeekStart());
  const [sounds, setSounds] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [entryReflectionsById, setEntryReflectionsById] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const s = await WeeklySoundService.getSoundsForWeek(userId, targetWeekStart);
      setSounds(s);
      // Build reflections map for this week
      try {
        const { weekStart, weekEnd } = WeeklySoundService.getWeekRange(targetWeekStart);
        const entries = await MoodEntryService.getMoodEntries(userId);
        const weekEntries = entries.filter(e => e.timestamp >= weekStart && e.timestamp <= weekEnd);
        const map: Record<string, string> = {};
        weekEntries.forEach(e => { map[e.entryId] = e.reflection; });
        setEntryReflectionsById(map);
      } catch (e) {
        setEntryReflectionsById({});
      }
      setLoading(false);
    })();
  }, [userId, targetWeekStart]);

  const weekLabel = WeeklySoundService.formatWeekRange(targetWeekStart);
  const isWindowOpen = WeeklySoundService.isSelectionWindowOpen(targetWeekStart);
  const currentSelection = weeklySelections.find((w: any) => w.weekStart === targetWeekStart);
  const selectedSound = currentSelection ? sounds.find((s: any) => s.musicId === currentSelection.selectedMusicId) : null;

  const handleSelect = (musicId: string) => {
    if (!isWindowOpen) {
      Alert.alert('Selection Window Closed', 'You can select a Sound of the Week only during the week after it ends.');
      return;
    }
    Alert.alert('Confirm Selection', `Set this as your Sound of Week ${weekLabel}?`, [
      { text: 'Cancel' },
      { text: 'Confirm', onPress: async () => { await WeeklySoundService.saveWeeklySelection(userId, targetWeekStart, musicId); onSelectionMade(); } }
    ]);
  };

  const navigateWeeks = (delta: number) => {
    setTargetWeekStart(prev => prev + delta * 7 * 24 * 60 * 60 * 1000);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <TouchableOpacity onPress={() => navigateWeeks(-1)}><Text>{'<'}</Text></TouchableOpacity>
        <Text style={{ fontWeight: '600' }}>{weekLabel}</Text>
        <TouchableOpacity onPress={() => navigateWeeks(1)}><Text>{'>'}</Text></TouchableOpacity>
      </View>
      {!currentSelection && (
        <Text style={{ marginBottom: 8, color: isWindowOpen ? '#2E7D32' : '#777' }}>
          {isWindowOpen ? 'Selection window is open' : 'Selection window is closed'}
        </Text>
      )}
      {currentSelection && selectedSound && (
        <View style={{ padding: 10, marginBottom: 8, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
          <Text style={{ fontWeight: '500', marginBottom: 6 }}>Your Sound of the Week</Text>
          {entryReflectionsById[selectedSound.entryId] ? (
            <Text style={{ marginBottom: 8, color: '#555' }}>Response: {entryReflectionsById[selectedSound.entryId]}</Text>
          ) : null}
          <MusicPlayer musicId={selectedSound.musicId} userId={userId} onError={() => {}} />
        </View>
      )}
      {loading ? (
        <Text>Loading sounds...</Text>
      ) : sounds.length === 0 ? (
        <Text>No sounds generated in this week.</Text>
      ) : (!currentSelection) ? (
        <View>
          {sounds.map((sound: any) => (
            <View key={sound.musicId} style={{ padding: 10, marginBottom: 8, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
              <Text style={{ fontWeight: '500', marginBottom: 6 }}>Generated: {new Date(sound.generatedAt).toLocaleString()}</Text>
              {entryReflectionsById[sound.entryId] ? (
                <Text style={{ marginBottom: 8, color: '#555' }}>Response: {entryReflectionsById[sound.entryId]}</Text>
              ) : null}
              <MusicPlayer musicId={sound.musicId} userId={userId} onError={() => {}} />
              <TouchableOpacity style={{ backgroundColor: '#4a90e2', padding: 10, borderRadius: 6, marginTop: 6, alignItems: 'center' }} onPress={() => handleSelect(sound.musicId)}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Select as Sound of the Week</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
      {/* Selections Overview removed per design */}
    </ScrollView>
  );
};