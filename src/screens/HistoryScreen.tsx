import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import MoodEntryService from '../services/MoodEntryService';
import MoodEntryList from '../components/MoodEntryList';
import MoodTrendCharts from '../components/MoodTrendCharts';
import MusicPlayer from '../components/MusicPlayer';
import DataExportModal from '../components/DataExportModal';
import { MoodEntry } from '../types';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const HistoryScreen = () => {
  // Use demo user for web compatibility
  const user = { userId: 'demo-user' };
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedEntry, setSelectedEntry] = useState<MoodEntry | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [calendarVisible, setCalendarVisible] = useState<boolean>(false);
  const [exportModalVisible, setExportModalVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'list' | 'charts'>('list');
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

  // Set up periodic refresh to catch music generation updates
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      loadMoodEntries();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(refreshInterval);
  }, []);

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
            
            {selectedEntry.musicGenerated && selectedEntry.musicId && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Generated Music:</Text>
                <MusicPlayer 
                  musicId={selectedEntry.musicId} 
                  userId={user.userId}
                  onError={(message) => console.error(`Music player error: ${message}`)}
                />
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
      </View>
      
      {activeTab === 'list' ? (
        <MoodEntryList
          entries={moodEntries}
          isLoading={isLoading}
          onEntryPress={handleEntryPress}
        />
      ) : (
        <MoodTrendCharts
          entries={moodEntries}
          isLoading={isLoading}
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
});

export default HistoryScreen;