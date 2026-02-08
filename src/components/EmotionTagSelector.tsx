import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  AccessibilityInfo,
  TextInput
} from 'react-native';
import UserPreferencesService from '../services/UserPreferencesService';

interface EmotionTagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  availableTags?: string[];
  onValidationChange?: (isValid: boolean) => void;
  minSelections?: number;
}

/**
 * A component for selecting emotion tags
 * Allows users to select multiple emotions that describe their current mood
 * Implements requirement 1.6: "WHEN a user adds emotion tags THEN the system SHALL store the tags with the mood entry"
 */
const EmotionTagSelector: React.FC<EmotionTagSelectorProps> = ({
  selectedTags,
  onChange,
  availableTags = [
    'Happy', 'Excited', 'Grateful', 'Relaxed', 'Content', 'Calm',
    'Tired', 'Bored', 'Sad', 'Anxious', 'Stressed', 'Angry',
    'Frustrated', 'Overwhelmed', 'Hopeful', 'Motivated', 'Proud', 'Confident'
  ],
  onValidationChange,
  minSelections = 1,
}) => {
  // Track if screen reader is enabled for enhanced accessibility
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const userId = 'demo-user';
  
  // Check if screen reader is enabled
  useEffect(() => {
    const checkScreenReader = async () => {
      const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setScreenReaderEnabled(isEnabled);
    };
    
    checkScreenReader();
    
    // Subscribe to screen reader changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled
    );
    
    return () => {
      // Clean up subscription
      subscription.remove();
    };
  }, []);

  // Load custom emotion tags
  useEffect(() => {
    (async () => {
      const saved = await UserPreferencesService.getCustomEmotionTags(userId);
      setCustomTags(saved);
    })();
  }, []);

  // Notify parent component about validation state when selected tags change
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(selectedTags.length >= minSelections);
    }
  }, [selectedTags, onValidationChange, minSelections]);

  // Toggle a tag selection
  const toggleTag = (tag: string) => {
    let newSelectedTags: string[];
    
    if (selectedTags.includes(tag)) {
      // Remove tag if already selected
      newSelectedTags = selectedTags.filter(t => t !== tag);
    } else {
      // Add tag if not already selected
      newSelectedTags = [...selectedTags, tag];
    }
    
    // Announce selection for screen readers
    if (screenReaderEnabled) {
      const action = selectedTags.includes(tag) ? 'deselected' : 'selected';
      AccessibilityInfo.announceForAccessibility(
        `${action} emotion ${tag}. ${newSelectedTags.length} emotions selected.`
      );
    }
    
    onChange(newSelectedTags);
  };

  // Group tags by emotional valence for better organization
  const allAvailable = Array.from(new Set([...(availableTags || []), ...customTags]));

  const positiveEmotions = allAvailable.filter(tag => 
    ['Happy', 'Excited', 'Grateful', 'Relaxed', 'Content', 'Calm', 'Hopeful', 'Motivated', 'Proud', 'Confident'].includes(tag)
  );
  
  const negativeEmotions = allAvailable.filter(tag => 
    ['Tired', 'Bored', 'Sad', 'Anxious', 'Stressed', 'Angry', 'Frustrated', 'Overwhelmed'].includes(tag)
  );
  
  const otherEmotions = allAvailable.filter(tag => 
    !positiveEmotions.includes(tag) && !negativeEmotions.includes(tag)
  );

  const addCustomTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    const updated = await UserPreferencesService.addCustomEmotionTag(userId, trimmed);
    setCustomTags(updated);
    setNewTag('');
    if (!selectedTags.includes(trimmed)) {
      onChange([...selectedTags, trimmed]);
    }
  };

  const removeCustomTag = async (tag: string) => {
    const prefs = await UserPreferencesService.getPreferences(userId);
    const updated = (prefs?.customEmotionTags || []).filter(t => t.toLowerCase() !== tag.toLowerCase());
    await UserPreferencesService.savePreferences(userId, { ...(prefs || UserPreferencesService.getDefaultPreferences()), customEmotionTags: updated });
    setCustomTags(updated);
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    }
  };

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityLabel="Emotion tag selector"
      accessibilityHint="Select one or more emotions that describe how you're feeling"
    >
      <Text style={styles.title}>How are you feeling?</Text>
      <Text style={styles.subtitle}>Select all emotions that apply</Text>
      
      {/* Option A: no inner scrolling (avoid Android nested scroll conflicts) */}
      <View style={styles.tagsContainer}>
        {/* Add custom emotion tag */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Add your own emotion"
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={addCustomTag}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={addCustomTag}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        {positiveEmotions.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.sectionTitle}>Positive</Text>
            <View style={styles.tagGroup}>
              {positiveEmotions.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagButton,
                    selectedTags.includes(tag) && styles.selectedTagButton
                  ]}
                  onPress={() => toggleTag(tag)}
                  accessibilityLabel={`Emotion ${tag}`}
                  accessibilityHint={`Double tap to ${selectedTags.includes(tag) ? 'deselect' : 'select'} ${tag} emotion`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selectedTags.includes(tag) }}
                >
                  <Text 
                    style={[
                      styles.tagText,
                      selectedTags.includes(tag) && styles.selectedTagText
                    ]}
                  >
                    {tag}
                  </Text>
                  {customTags.includes(tag) && (
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeCustomTag(tag)}>
                      <Text style={styles.removeText}>×</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {negativeEmotions.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.sectionTitle}>Challenging</Text>
            <View style={styles.tagGroup}>
              {negativeEmotions.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagButton,
                    selectedTags.includes(tag) && styles.selectedTagButton
                  ]}
                  onPress={() => toggleTag(tag)}
                  accessibilityLabel={`Emotion ${tag}`}
                  accessibilityHint={`Double tap to ${selectedTags.includes(tag) ? 'deselect' : 'select'} ${tag} emotion`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selectedTags.includes(tag) }}
                >
                  <Text 
                    style={[
                      styles.tagText,
                      selectedTags.includes(tag) && styles.selectedTagText
                    ]}
                  >
                    {tag}
                  </Text>
                  {customTags.includes(tag) && (
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeCustomTag(tag)}>
                      <Text style={styles.removeText}>×</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {otherEmotions.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.sectionTitle}>Other</Text>
            <View style={styles.tagGroup}>
              {otherEmotions.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagButton,
                    selectedTags.includes(tag) && styles.selectedTagButton
                  ]}
                  onPress={() => toggleTag(tag)}
                  accessibilityLabel={`Emotion ${tag}`}
                  accessibilityHint={`Double tap to ${selectedTags.includes(tag) ? 'deselect' : 'select'} ${tag} emotion`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selectedTags.includes(tag) }}
                >
                  <Text 
                    style={[
                      styles.tagText,
                      selectedTags.includes(tag) && styles.selectedTagText
                    ]}
                  >
                    {tag}
                  </Text>
                  {customTags.includes(tag) && (
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeCustomTag(tag)}>
                      <Text style={styles.removeText}>×</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
      
      {selectedTags.length > 0 && (
        <View style={styles.selectedTagsContainer}>
          <Text style={styles.selectedTagsTitle}>
            Selected emotions ({selectedTags.length}):
          </Text>
          <Text style={styles.selectedTagsList}>
            {selectedTags.join(', ')}
          </Text>
        </View>
      )}
      
      {selectedTags.length < minSelections && (
        <Text style={styles.validationMessage} accessibilityLiveRegion="polite">
          Please select at least {minSelections} emotion tag{minSelections > 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  tagsContainer: {
    paddingBottom: 10,
  },
  tagSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#555',
  },
  tagGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedTagButton: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  tagText: {
    fontSize: 14,
    color: '#333',
  },
  selectedTagText: {
    color: 'white',
    fontWeight: '500',
  },
  removeBtn: {
    marginLeft: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#666',
    fontSize: 14,
    lineHeight: 14,
  },
  selectedTagsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 5,
  },
  selectedTagsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  selectedTagsList: {
    fontSize: 14,
    color: '#333',
  },
  validationMessage: {
    color: '#E53935',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
    padding: 5,
    backgroundColor: '#FFEBEE',
    borderRadius: 5,
  },
});

export default EmotionTagSelector;