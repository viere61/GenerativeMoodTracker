import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  ScrollView
} from 'react-native';
import { MoodEntry } from '../types';
import { format } from 'date-fns';

interface MoodEntryListProps {
  entries: MoodEntry[];
  isLoading: boolean;
  onEntryPress?: (entry: MoodEntry) => void;
}

// Emotion color mapping for visual representation
const emotionColors: Record<string, string> = {
  'Happy': '#FFD700',
  'Calm': '#90EE90',
  'Excited': '#FF6347',
  'Anxious': '#6495ED',
  'Sad': '#9370DB',
  'Angry': '#FF4500',
  'Tired': '#D3D3D3',
  'Grateful': '#98FB98',
  'Stressed': '#FF69B4',
  'Content': '#87CEEB',
  // Default color for any other emotions
  'default': '#F0F0F0'
};

const MoodEntryList: React.FC<MoodEntryListProps> = ({ 
  entries, 
  isLoading,
  onEntryPress 
}) => {
  const [sortedEntries, setSortedEntries] = useState<MoodEntry[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [moodRangeFilter, setMoodRangeFilter] = useState<[number, number]>([1, 10]);
  
  // Determine the most recent entry (soft-locked)
  const mostRecentEntryId = entries.length > 0
    ? entries.reduce((latest, e) => (e.timestamp > latest.timestamp ? e : latest), entries[0]).entryId
    : null;
  
  // Get unique emotions from all entries
  const allEmotions = Array.from(
    new Set(entries.flatMap(entry => entry.emotionTags))
  ).sort();

  // Apply sorting and filtering
  useEffect(() => {
    let filtered = [...entries];
    
    // Apply emotion filter if any emotions are selected
    if (selectedEmotions.length > 0) {
      filtered = filtered.filter(entry => 
        entry.emotionTags.some(emotion => selectedEmotions.includes(emotion))
      );
    }
    
    // Apply mood range filter
    filtered = filtered.filter(entry => 
      entry.moodRating >= moodRangeFilter[0] && 
      entry.moodRating <= moodRangeFilter[1]
    );
    
    // Apply sorting
    const sorted = filtered.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.timestamp - a.timestamp;
      } else {
        return a.timestamp - b.timestamp;
      }
    });
    
    setSortedEntries(sorted);
  }, [entries, sortOrder, selectedEmotions, moodRangeFilter]);

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  // Toggle emotion selection
  const toggleEmotion = (emotion: string) => {
    if (selectedEmotions.includes(emotion)) {
      setSelectedEmotions(selectedEmotions.filter(e => e !== emotion));
    } else {
      setSelectedEmotions([...selectedEmotions, emotion]);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedEmotions([]);
    setMoodRangeFilter([1, 10]);
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

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
  };

  // Render each mood entry
  const renderItem = ({ item }: { item: MoodEntry }) => (
    <TouchableOpacity 
      style={styles.entryCard}
      onPress={() => onEntryPress && onEntryPress(item)}
    >
      <Text style={styles.entryDate}>{formatDate(item.timestamp)}</Text>
      <View style={styles.entryDetails}>
        <View style={styles.ratingContainer}>
          {/* Hide explicit 1-10 scale from users */}
          <Text style={styles.entryRating}>Mood: {getMoodLabel(item.moodRating)}</Text>
          <View 
            style={[
              styles.ratingIndicator, 
              { backgroundColor: getMoodColor(item.moodRating) }
            ]} 
          />
        </View>
        <View style={styles.emotionContainer}>
          {item.emotionTags.map((emotion, index) => (
            <Text 
              key={index} 
              style={[
                styles.emotionTag,
                { backgroundColor: emotionColors[emotion] || emotionColors.default }
              ]}
            >
              {emotion}
            </Text>
          ))}
        </View>
        {item.influences && item.influences.length > 0 && (
          <View style={styles.influenceContainer}>
            <Text style={styles.influenceLabel}>Influences:</Text>
            {item.influences.map((influence, index) => (
              <Text 
                key={index} 
                style={styles.influenceTag}
              >
                {influence}
              </Text>
            ))}
          </View>
        )}
        {item.promptLabel && (
          <View style={styles.influenceContainer}>
            <Text style={styles.influenceLabel}>AI Sound Label:</Text>
            <Text style={styles.influenceTag}>{item.promptLabel}</Text>
          </View>
        )}
        <Text 
          style={styles.entryReflection}
          numberOfLines={2}
        >
          {item.reflection}
        </Text>
        {(item.musicGenerated || item.musicId) && item.entryId !== mostRecentEntryId && (
          <View style={styles.musicIndicator}>
            <TouchableOpacity 
              style={styles.musicButton}
              onPress={() => onEntryPress && onEntryPress(item)}
              accessibilityLabel="Play generated music"
              accessibilityHint="Opens the music player for this mood entry"
            >
              <Text style={styles.musicText}>♪ Play Audio</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.entryId === mostRecentEntryId && (
          <View style={styles.musicIndicator}>
            <Text style={styles.lockText}>🔒 AI sound available after your next log</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Get color based on mood rating
  const getMoodColor = (rating: number) => {
    if (rating >= 8) return '#4CAF50'; // Green for high mood
    if (rating >= 5) return '#FFC107'; // Yellow for medium mood
    return '#F44336'; // Red for low mood
  };

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter Entries</Text>
          
          <Text style={styles.filterSectionTitle}>Emotions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.emotionFilterContainer}>
              {allEmotions.map((emotion) => (
                <TouchableOpacity
                  key={emotion}
                  style={[
                    styles.emotionFilterTag,
                    selectedEmotions.includes(emotion) && styles.emotionFilterTagSelected
                  ]}
                  onPress={() => toggleEmotion(emotion)}
                >
                  <Text style={selectedEmotions.includes(emotion) ? styles.emotionFilterTextSelected : styles.emotionFilterText}>
                    {emotion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          <Text style={styles.filterSectionTitle}>Mood Rating Range</Text>
          <View style={styles.moodRangeContainer}>
            <TouchableOpacity
              style={[styles.moodRangeButton, moodRangeFilter[0] === 1 && moodRangeFilter[1] === 10 ? styles.moodRangeButtonSelected : null]}
              onPress={() => setMoodRangeFilter([1, 10])}
            >
              <Text>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.moodRangeButton, moodRangeFilter[0] === 1 && moodRangeFilter[1] === 3 ? styles.moodRangeButtonSelected : null]}
              onPress={() => setMoodRangeFilter([1, 3])}
            >
              <Text>Low (1-3)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.moodRangeButton, moodRangeFilter[0] === 4 && moodRangeFilter[1] === 7 ? styles.moodRangeButtonSelected : null]}
              onPress={() => setMoodRangeFilter([4, 7])}
            >
              <Text>Medium (4-7)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.moodRangeButton, moodRangeFilter[0] === 8 && moodRangeFilter[1] === 10 ? styles.moodRangeButtonSelected : null]}
              onPress={() => setMoodRangeFilter([8, 10])}
            >
              <Text>High (8-10)</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.resetButton]}
              onPress={resetFilters}
            >
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.applyButton]}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.buttonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading mood entries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={toggleSortOrder}
        >
          <Text style={styles.sortButtonText}>
            Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {sortedEntries.length > 0 ? (
        <FlatList
          data={sortedEntries}
          keyExtractor={(item) => item.entryId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No mood entries found</Text>
          <Text style={styles.emptySubtext}>
            {entries.length > 0 
              ? 'Try adjusting your filters' 
              : 'Start tracking your mood to see entries here'}
          </Text>
        </View>
      )}
      
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
  },
  filterButtonText: {
    fontWeight: '500',
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
  },
  sortButtonText: {
    fontWeight: '500',
  },
  listContainer: {
    padding: 15,
  },
  entryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  entryDetails: {
    marginLeft: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  entryRating: {
    fontSize: 16,
    marginRight: 10,
  },
  ratingIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  emotionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  emotionTag: {
    padding: 5,
    borderRadius: 10,
    marginRight: 5,
    marginBottom: 5,
    fontSize: 12,
  },
  influenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    alignItems: 'center',
  },
  influenceLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 8,
  },
  influenceTag: {
    padding: 4,
    borderRadius: 8,
    marginRight: 5,
    marginBottom: 5,
    fontSize: 11,
    backgroundColor: '#f0f0f0',
    color: '#555',
  },
  entryReflection: {
    fontSize: 14,
    color: '#555',
  },
  musicIndicator: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  musicButton: {
    backgroundColor: '#e6f2ff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  musicText: {
    fontSize: 12,
    color: '#4a90e2',
    fontStyle: 'italic',
  },
  lockText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  emotionFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  emotionFilterTag: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  emotionFilterTagSelected: {
    backgroundColor: '#4a90e2',
  },
  emotionFilterText: {
    color: '#333',
  },
  emotionFilterTextSelected: {
    color: 'white',
  },
  moodRangeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  moodRangeButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  moodRangeButtonSelected: {
    backgroundColor: '#4a90e2',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
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

export default MoodEntryList;