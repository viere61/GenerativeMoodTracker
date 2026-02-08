import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput } from 'react-native';
import UserPreferencesService from '../services/UserPreferencesService';

interface InfluenceSelectorProps {
  selectedInfluences: string[];
  onInfluencesChange: (influences: string[]) => void;
  onValidationChange?: (isValid: boolean) => void;
}

/**
 * A component for selecting what influenced the user's mood
 * Allows users to select multiple influences that affected their emotional state
 */
const InfluenceSelector: React.FC<InfluenceSelectorProps> = ({
  selectedInfluences,
  onInfluencesChange,
  onValidationChange,
}) => {
  type InfluenceItem = { id: string; label: string; isCustom?: boolean };

  // Predefined influence categories
  const defaultInfluences: InfluenceItem[] = [
    // Relationships
    { id: 'family', label: 'Family' },
    { id: 'friends', label: 'Friends' },
    { id: 'partner', label: 'Partner' },
    { id: 'colleagues', label: 'Colleagues' },
    
    // Activities
    { id: 'work', label: 'Work' },
    { id: 'exercise', label: 'Exercise' },
    { id: 'travel', label: 'Travel' },
    { id: 'hobbies', label: 'Hobbies' },
    { id: 'self-care', label: 'Self-care' },
    
    // Environment
    { id: 'weather', label: 'Weather' },
    { id: 'home', label: 'Home' },
    { id: 'work-environment', label: 'Work Environment' },
    
    // Health
    { id: 'physical-health', label: 'Physical Health' },
    { id: 'mental-health', label: 'Mental Health' },
    { id: 'sleep', label: 'Sleep' },
    
    // Life Events
    { id: 'special-occasion', label: 'Special Occasion' },
    { id: 'challenge', label: 'Challenge' },
    { id: 'achievement', label: 'Achievement' },
    { id: 'food', label: 'Food' },
    { id: 'music', label: 'Music' },
  ];

  const [customInfluences, setCustomInfluences] = useState<string[]>([]);
  const [newInfluence, setNewInfluence] = useState('');
  const userId = 'demo-user';

  useEffect(() => {
    (async () => {
      const saved = await UserPreferencesService.getCustomInfluenceTags(userId);
      setCustomInfluences(saved);
    })();
  }, []);

  const availableInfluences: InfluenceItem[] = [
    ...defaultInfluences,
    ...customInfluences.map(label => ({ id: label.toLowerCase().replace(/\s+/g, '-'), label, isCustom: true }))
  ];

  // Handle influence selection/deselection
  const handleInfluenceToggle = (influenceId: string) => {
    const newInfluences = selectedInfluences.includes(influenceId)
      ? selectedInfluences.filter(id => id !== influenceId)
      : [...selectedInfluences, influenceId];
    
    onInfluencesChange(newInfluences);
  };

  const addCustomInfluence = async () => {
    const trimmed = newInfluence.trim();
    if (!trimmed) return;
    const updated = await UserPreferencesService.addCustomInfluenceTag(userId, trimmed);
    setCustomInfluences(updated);
    setNewInfluence('');
    const newId = trimmed.toLowerCase().replace(/\s+/g, '-');
    if (!selectedInfluences.includes(newId)) {
      onInfluencesChange([...selectedInfluences, newId]);
    }
  };

  const removeCustomInfluence = async (label: string) => {
    const prefs = await UserPreferencesService.getPreferences(userId);
    const updated = (prefs?.customInfluenceTags || []).filter(t => t.toLowerCase() !== label.toLowerCase());
    await UserPreferencesService.savePreferences(userId, { ...(prefs || UserPreferencesService.getDefaultPreferences()), customInfluenceTags: updated });
    setCustomInfluences(updated);
    const id = label.toLowerCase().replace(/\s+/g, '-');
    if (selectedInfluences.includes(id)) {
      onInfluencesChange(selectedInfluences.filter(i => i !== id));
    }
  };

  // Notify parent component about validation state
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(selectedInfluences.length > 0);
    }
  }, [selectedInfluences, onValidationChange]);

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityLabel="Influence selector"
      accessibilityHint="Select what influenced your mood"
    >
      <Text style={styles.title}>What influenced your mood?</Text>
      <Text style={styles.subtitle}>Select all that apply</Text>
      
      {/* Option A: no inner scrolling (avoid Android nested scroll conflicts) */}
      <View style={styles.content}>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { color: '#000' }]}
            placeholder="Add your own influence"
            placeholderTextColor="#999"
            selectionColor="#4CAF50"
            value={newInfluence}
            onChangeText={setNewInfluence}
            onSubmitEditing={addCustomInfluence}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={addCustomInfluence}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.influencesContainer}>
        {availableInfluences.map((influence) => (
          <TouchableOpacity
            key={influence.id}
            style={[
              styles.influenceButton,
              selectedInfluences.includes(influence.id) && styles.selectedInfluenceButton
            ]}
            onPress={() => handleInfluenceToggle(influence.id)}
            accessibilityLabel={`${influence.label} influence`}
            accessibilityHint={`Select ${influence.label} as an influence on your mood`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selectedInfluences.includes(influence.id) }}
          >
            <Text style={[
              styles.influenceText,
              selectedInfluences.includes(influence.id) && styles.selectedInfluenceText
            ]}>
              {influence.label}
            </Text>
            {influence.isCustom && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={(e) => { e.stopPropagation?.(); removeCustomInfluence(influence.label); }}
                accessibilityLabel={`Remove custom influence ${influence.label}`}
                accessibilityRole="button"
              >
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
        </View>
      </View>
      
      {selectedInfluences.length === 0 && (
        <Text style={styles.validationMessage} accessibilityLiveRegion="polite">
          Please select at least one influence
        </Text>
      )}
      
      {selectedInfluences.length > 0 && (
        <Text style={styles.selectionFeedback} accessibilityLiveRegion="polite">
          Selected: {selectedInfluences.length} influence{selectedInfluences.length !== 1 ? 's' : ''}
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
  content: {
    paddingBottom: 10,
  },
  influencesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingBottom: 10, // Add padding for better scrolling on Android
    ...(Platform.OS === 'android' && {
      paddingVertical: 5,
    }),
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    flexBasis: '100%',
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
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  influenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    marginRight: 8, // Add horizontal margin to prevent overlap
    minHeight: 36, // Ensure consistent height for touch targets
  },
  selectedInfluenceButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  influenceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedInfluenceText: {
    color: 'white',
    fontWeight: 'bold',
  },
  removeBtn: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#555',
    fontSize: 14,
    lineHeight: 14,
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
  selectionFeedback: {
    color: '#43A047',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
});

export default InfluenceSelector; 