import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MoodEntryService from '../services/MoodEntryService';
import MoodEntryList from '../components/MoodEntryList';
import MoodTrendCharts from '../components/MoodTrendCharts';
import MusicPlayer from '../components/MusicPlayer';
import DataExportModal from '../components/DataExportModal';
import { MoodEntry } from '../types';
import { Calendar } from 'react-native-calendars';
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
  const [calendarVisible, setCalendarVisible] = useState<boolean>(false);
  const [exportModalVisible, setExportModalVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'list' | 'charts' | 'weekly'>(route?.params?.initialHistoryTab || 'list');
  const [weeklySelections, setWeeklySelections] = useState<any[]>([]);
  const [selectedDates, setSelectedDates] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });

  // Load mood entries when component mounts
  useEffect(() => {
    loadMoodEntries();
  }, []);

  // Refresh when user navigates back to this screen (e.g., after adding a mood entry)
  useFocusEffect(
    useCallback(() => {
      console.log('📱 [HistoryScreen] Screen focused, refreshing entries');
      loadMoodEntries();
      (async () => {
        const selections = await WeeklySoundService.getWeeklySelections(user.userId);
        setWeeklySelections(selections);
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

  // Apply date range filter
  const applyDateFilter = () => {
    setCalendarVisible(false);
    loadMoodEntriesWithDateFilter();
  };

  // Load mood entries with date filter
  const loadMoodEntriesWithDateFilter = async () => {
    setIsLoading(true);
    try {
      let entries = await MoodEntryService.getMoodEntries(user.userId);
      
      // Apply date range filter if both dates are selected
      if (selectedDates.startDate && selectedDates.endDate) {
        const startTimestamp = new Date(selectedDates.startDate).setHours(0, 0, 0, 0);
        const endTimestamp = new Date(selectedDates.endDate).setHours(23, 59, 59, 999);
        
        entries = entries.filter(entry => 
          entry.timestamp >= startTimestamp && entry.timestamp <= endTimestamp
        );
      }
      
      setMoodEntries(entries);
    } catch (error) {
      console.error('Error loading mood entries with date filter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset date filter
  const resetDateFilter = () => {
    setSelectedDates({
      startDate: null,
      endDate: null,
    });
    loadMoodEntries();
    setCalendarVisible(false);
  };

  // Render the detail modal
  const renderDetailModal = () => {
    if (!selectedEntry) return null;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mood Entry Details</Text>
            <Text style={styles.detailDate}>{formatDate(selectedEntry.timestamp)}</Text>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Mood Rating:</Text>
              <View style={styles.ratingContainer}>
                <Text style={styles.detailText}>{selectedEntry.moodRating}/10</Text>
                <View 
                  style={[
                    styles.ratingIndicator, 
                    { 
                      backgroundColor: selectedEntry.moodRating >= 8 ? '#4CAF50' : 
                                      selectedEntry.moodRating >= 5 ? '#FFC107' : '#F44336' 
                    }
                  ]} 
                />
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
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Reflection:</Text>
              <Text style={styles.detailText}>{selectedEntry.reflection}</Text>
            </View>
            
            {(() => {
              // Determine most recent by timestamp
              const latest = moodEntries.reduce((acc, e) => (e.timestamp > acc.timestamp ? e : acc), moodEntries[0] || selectedEntry);
              const isMostRecent = selectedEntry.entryId === latest.entryId;
              return selectedEntry.musicId && !isMostRecent;
            })() && (
              <View style={styles.detailSection}>
                <MusicPlayer 
                  musicId={selectedEntry.musicId as string}
                  userId={user.userId}
                  onError={(message) => console.error(`Music player error: ${message}`)}
                />
              </View>
            )}
            {(() => {
              const latest = moodEntries.reduce((acc, e) => (e.timestamp > acc.timestamp ? e : acc), moodEntries[0] || selectedEntry);
              return selectedEntry.entryId === latest.entryId;
            })() && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Generated Sound:</Text>
                <Text style={styles.lockInfo}>🔒 Locked until your next successful daily log</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Render the calendar modal for date range selection
  const renderCalendarModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={calendarVisible}
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            
            <Calendar
              markingType={'period'}
              markedDates={
                selectedDates.startDate && selectedDates.endDate
                  ? {
                      [selectedDates.startDate]: { 
                        startingDay: true, 
                        color: '#4a90e2' 
                      },
                      [selectedDates.endDate]: { 
                        endingDay: true, 
                        color: '#4a90e2' 
                      },
                      ...(getDatesInRange(selectedDates.startDate, selectedDates.endDate).reduce(
                        (acc, date) => ({
                          ...acc,
                          [date]: { color: '#4a90e2', textColor: 'white' },
                        }),
                        {}
                      )),
                    }
                  : selectedDates.startDate
                  ? { [selectedDates.startDate]: { selected: true, color: '#4a90e2' } }
                  : {}
              }
              onDayPress={(day) => {
                if (!selectedDates.startDate || (selectedDates.startDate && selectedDates.endDate)) {
                  // Start new selection
                  setSelectedDates({
                    startDate: day.dateString,
                    endDate: null,
                  });
                } else {
                  // Complete the selection
                  if (new Date(day.dateString) >= new Date(selectedDates.startDate)) {
                    setSelectedDates({
                      ...selectedDates,
                      endDate: day.dateString,
                    });
                  } else {
                    // If end date is before start date, swap them
                    setSelectedDates({
                      startDate: day.dateString,
                      endDate: selectedDates.startDate,
                    });
                  }
                }
              }}
            />
            
            <View style={styles.calendarButtonContainer}>
              <TouchableOpacity
                style={[styles.calendarButton, styles.resetButton]}
                onPress={resetDateFilter}
              >
                <Text style={styles.buttonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarButton, styles.applyButton]}
                onPress={applyDateFilter}
              >
                <Text style={styles.buttonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

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
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => setExportModalVisible(true)}
          >
            <Ionicons name="download-outline" size={20} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateFilterButton}
            onPress={() => setCalendarVisible(true)}
          >
            <Text style={styles.dateFilterText}>
              {selectedDates.startDate && selectedDates.endDate
                ? `${format(new Date(selectedDates.startDate), 'MMM d')} - ${format(new Date(selectedDates.endDate), 'MMM d')}`
                : 'Date Range'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Show info when music generation might be in progress */}
      {/* Removed: generation status visual, as the most recent entry is soft-locked */}
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'list' && styles.activeTabButton]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'charts' && styles.activeTabButton]}
          onPress={() => setActiveTab('charts')}
        >
          <Text style={[styles.tabText, activeTab === 'charts' && styles.activeTabText]}>Charts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'weekly' && styles.activeTabButton]}
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>Sound of Week</Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'list' ? (
        <MoodEntryList
          entries={moodEntries}
          isLoading={isLoading}
          onEntryPress={handleEntryPress}
        />
      ) : activeTab === 'charts' ? (
        <MoodTrendCharts
          entries={moodEntries}
          isLoading={isLoading}
        />
      ) : (
        <WeeklySoundTab
          userId={user.userId}
          weeklySelections={weeklySelections}
          onSelectionMade={async () => {
            const selections = await WeeklySoundService.getWeeklySelections(user.userId);
            setWeeklySelections(selections);
          }}
        />
      )}
      
      {renderDetailModal()}
      {renderCalendarModal()}
      
      {/* Data Export Modal */}
      <DataExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        userId={user.userId}
      />
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
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailDate: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  detailSection: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 10,
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
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
            <Text style={{ marginBottom: 8, color: '#555' }}>Reflection: {entryReflectionsById[selectedSound.entryId]}</Text>
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
                <Text style={{ marginBottom: 8, color: '#555' }}>Reflection: {entryReflectionsById[sound.entryId]}</Text>
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