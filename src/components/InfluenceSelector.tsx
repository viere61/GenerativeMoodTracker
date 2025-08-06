import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';

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
  // Predefined influence categories
  const availableInfluences = [
    // Relationships
    { id: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
    { id: 'friends', label: 'Friends', emoji: '👥' },
    { id: 'partner', label: 'Partner', emoji: '💕' },
    { id: 'colleagues', label: 'Colleagues', emoji: '💼' },
    
    // Activities
    { id: 'work', label: 'Work', emoji: '💻' },
    { id: 'exercise', label: 'Exercise', emoji: '🏃‍♀️' },
    { id: 'travel', label: 'Travel', emoji: '✈️' },
    { id: 'hobbies', label: 'Hobbies', emoji: '🎨' },
    { id: 'self-care', label: 'Self-care', emoji: '🧘‍♀️' },
    
    // Environment
    { id: 'weather', label: 'Weather', emoji: '🌤️' },
    { id: 'home', label: 'Home', emoji: '🏠' },
    { id: 'work-environment', label: 'Work Environment', emoji: '🏢' },
    
    // Health
    { id: 'physical-health', label: 'Physical Health', emoji: '🏥' },
    { id: 'mental-health', label: 'Mental Health', emoji: '🧠' },
    { id: 'sleep', label: 'Sleep', emoji: '😴' },
    
    // Life Events
    { id: 'special-occasion', label: 'Special Occasion', emoji: '🎉' },
    { id: 'challenge', label: 'Challenge', emoji: '⚡' },
    { id: 'achievement', label: 'Achievement', emoji: '🏆' },
    { id: 'food', label: 'Food', emoji: '🍕' },
    { id: 'music', label: 'Music', emoji: '🎵' },
  ];

  // Handle influence selection/deselection
  const handleInfluenceToggle = (influenceId: string) => {
    const newInfluences = selectedInfluences.includes(influenceId)
      ? selectedInfluences.filter(id => id !== influenceId)
      : [...selectedInfluences, influenceId];
    
    onInfluencesChange(newInfluences);
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
      accessibilityHint="Select what influenced your mood today"
    >
      <Text style={styles.title}>What influenced your mood today?</Text>
      <Text style={styles.subtitle}>Select all that apply</Text>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.influencesContainer}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
      >
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
            <Text style={styles.influenceEmoji}>{influence.emoji}</Text>
            <Text style={[
              styles.influenceText,
              selectedInfluences.includes(influence.id) && styles.selectedInfluenceText
            ]}>
              {influence.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
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
  scrollView: {
    maxHeight: 200,
    flexGrow: 0, // Prevent the ScrollView from expanding beyond maxHeight
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
  influenceEmoji: {
    fontSize: 16,
    marginRight: 6,
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