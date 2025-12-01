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
  const [selectedMoodLabels, setSelectedMoodLabels] = useState<string[]>([]);
  const [selectedInfluences, setSelectedInfluences] = useState<string[]>([]);
  
  // Determine the most recent entry (soft-locked)
  const mostRecentEntryId = entries.length > 0
    ? entries.reduce((latest, e) => (e.timestamp > latest.timestamp ? e : latest), entries[0]).entryId
    : null;
  
  // Build frequency maps and sorted lists
  const emotionCounts: Record<string, number> = React.useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(entry => {
      entry.emotionTags.forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; });
    });
    return counts;
  }, [entries]);

  const allEmotions = React.useMemo(() => Object.keys(emotionCounts).sort((a,b) => (emotionCounts[b]||0)-(emotionCounts[a]||0)), [emotionCounts]);

  const influenceCounts: Record<string, number> = React.useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(entry => {
      (entry.influences || []).forEach(inf => { counts[inf] = (counts[inf] || 0) + 1; });
    });
    return counts;
  }, [entries]);

  const allInfluences = React.useMemo(() => Object.keys(influenceCounts).sort((a,b) => (influenceCounts[b]||0)-(influenceCounts[a]||0)), [influenceCounts]);

  const moodCounts: Record<string, number> = React.useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(entry => {
      const label = getMoodLabel(entry.moodRating);
      counts[label] = (counts[label] || 0) + 1;
    });
    return counts;
  }, [entries]);

  // Apply sorting and filtering
  useEffect(() => {
    let filtered = [...entries];
    
    // Apply emotion filter if any emotions are selected
    if (selectedEmotions.length > 0) {
      filtered = filtered.filter(entry => 
        entry.emotionTags.some(emotion => selectedEmotions.includes(emotion))
      );
    }
    
    // Apply mood label filter
    if (selectedMoodLabels.length > 0) {
      filtered = filtered.filter(entry => selectedMoodLabels.includes(getMoodLabel(entry.moodRating)));
    }

    // Apply influence filter
    if (selectedInfluences.length > 0) {
      filtered = filtered.filter(entry => (entry.influences || []).some(inf => selectedInfluences.includes(inf)));
    }
    
    // Apply sorting
    const sorted = filtered.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.timestamp - a.timestamp;
      } else {
        return a.timestamp - b.timestamp;
      }
    });
    
    setSortedEntries(sorted);
  }, [entries, sortOrder, selectedEmotions, selectedMoodLabels, selectedInfluences]);

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
    setSelectedMoodLabels([]);
    setSelectedInfluences([]);
  };

  // Map numeric mood rating to user-facing label (hide 1-10)
  function getMoodLabel(rating: number): string {
    if (rating >= 9) return 'Very Pleasant';
    if (rating >= 7) return 'Pleasant';
    if (rating === 6) return 'Slightly Pleasant';
    if (rating === 5) return 'Neutral';
    if (rating === 4) return 'Slightly Unpleasant';
    if (rating >= 2) return 'Unpleasant';
    return 'Very Unpleasant';
  }

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
        {item.reflectionPrompt ? (
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Prompt Asked:</Text>
            <Text style={styles.fieldText}>{item.reflectionPrompt}</Text>
          </View>
        ) : null}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Response:</Text>
          <Text style={styles.fieldText} numberOfLines={3}>{item.reflection}</Text>
          </View>
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
          {/* Mood first */}
          <Text style={styles.filterSectionTitle}>Mood</Text>
          <View style={styles.moodRangeContainer}>
            <TouchableOpacity
              style={[styles.moodRangeButton, selectedMoodLabels.length === 0 ? styles.moodRangeButtonSelected : null]}
              onPress={() => setSelectedMoodLabels([])}
            >
              <Text style={selectedMoodLabels.length === 0 ? { color: 'white', fontWeight: '600' } : undefined}>All</Text>
            </TouchableOpacity>
            {['Very Pleasant','Pleasant','Slightly Pleasant','Neutral','Slightly Unpleasant','Unpleasant','Very Unpleasant'].map(label => (
              <TouchableOpacity
                key={label}
                style={[styles.moodRangeButton, selectedMoodLabels.includes(label) ? styles.moodRangeButtonSelected : null]}
                onPress={() => setSelectedMoodLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])}
              >
                <Text style={selectedMoodLabels.includes(label) ? { color: 'white', fontWeight: '600' } : undefined}>{label} ({moodCounts[label] || 0})</Text>
              </TouchableOpacity>
            ))}
          </View>
          
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
                  <Text style={selectedEmotions.includes(emotion) ? styles.emotionFilterTextSelected : styles.emotionFilterText}>{emotion} ({emotionCounts[emotion] || 0})</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          <Text style={styles.filterSectionTitle}>Influences</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.emotionFilterContainer}>
              {allInfluences.map((inf) => (
            <TouchableOpacity
                  key={inf}
                  style={[styles.emotionFilterTag, selectedInfluences.includes(inf) && styles.emotionFilterTagSelected]}
                  onPress={() => setSelectedInfluences(prev => prev.includes(inf) ? prev.filter(i => i !== inf) : [...prev, inf])}
            >
                  <Text style={selectedInfluences.includes(inf) ? styles.emotionFilterTextSelected : styles.emotionFilterText}>{inf} ({influenceCounts[inf] || 0})</Text>
            </TouchableOpacity>
              ))}
          </View>
          </ScrollView>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.resetButton]}
              onPress={resetFilters}
            >
              <Text style={[styles.buttonText, styles.resetButtonText]}>Reset</Text>
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
    backgroundColor: 'transparent',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#e6f2ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  filterButtonText: {
    fontWeight: '600',
    color: '#1e3a8a',
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#e6f2ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sortButtonText: {
    fontWeight: '600',
    color: '#1e3a8a',
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
  fieldBlock: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111',
  },
  fieldText: {
    fontSize: 15,
    color: '#222',
    lineHeight: 20,
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
  resetButtonText: {
    color: '#111',
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