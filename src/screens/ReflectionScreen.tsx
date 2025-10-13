import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import ReflectionTextInput from '../components/ReflectionTextInput';
import MoodEntryService from '../services/MoodEntryService';

type ReflectionParams = {
  userId: string;
  moodRating: number;
  emotionTags: string[];
  influences: string[];
};
type ReflectionRouteProp = RouteProp<{ Reflection: ReflectionParams }, 'Reflection'>;

const ReflectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ReflectionRouteProp>();
  const { userId, moodRating, emotionTags, influences } = route.params;

  const [reflection, setReflection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const promptPool = [
    'Share three words that capture your day.',
    'Share one object that encapsulates your feeling.',
    'What environment matches your current state of mind?',
    'If your mood were weather, what would it be?',
    'What is the rhythm of your current mood?',
    'Describe your mood as a texture.',
    'Describe your mood as a room in your dream house.',
    'If your current mood were a piece of music, what would it sound like?',
    'If your current mood were a dance move, how would it go?',
    'What do you hope you remember from today?',
    'Share a food that encapsulates your feeling.',
    'If your mood could speak, what would it say to you?',
    'What word or phrase is echoing in your mind today?',
    'What kind of architecture describes your current mood?',
    'What mode of transportation represents your current mood?',
    'If you were to be an animal today, what would it be?',
    'What ice cream flavors match your day today?',
    'Describe how you are feeling today based on a travel destination.',
    'Describe the sound you want to hear right now.',
    'What color is your mood today?',
  ];
  const [randomPrompt] = useState(() => promptPool[Math.floor(Math.random() * promptPool.length)]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      await MoodEntryService.saveMoodEntry(
        userId,
        moodRating,
        emotionTags,
        influences,
        reflection,
        randomPrompt
      );

      try {
        const TimeWindowService = (await import('../services/TimeWindowService')).default;
        await TimeWindowService.markMoodLogged(userId);
      } catch {}

      Alert.alert(
        'Success',
        'Your mood has been recorded successfully!',
        [
          { text: 'View History', onPress: () => navigation.navigate('Main', { screen: 'History' }) },
          { text: 'Done', onPress: () => navigation.navigate('Main', { screen: 'Home' }) },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save your mood entry. Please try again.', [{ text: 'OK' }]);
      console.error('Error saving mood entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {(Platform.OS === 'ios' || Platform.OS === 'android') ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{randomPrompt}</Text>
            <View>
              <ReflectionTextInput value={reflection} onChange={setReflection} minLength={0} showSubtitle={false} placeholderText={randomPrompt} />
            </View>
            <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.disabledButton]} onPress={handleSubmit} disabled={isSubmitting}>
              <Text style={styles.submitButtonText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{randomPrompt}</Text>
          <View>
            <ReflectionTextInput value={reflection} onChange={setReflection} minLength={0} showSubtitle={false} placeholderText={randomPrompt} />
          </View>
          <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.disabledButton]} onPress={handleSubmit} disabled={isSubmitting}>
            <Text style={styles.submitButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ReflectionScreen;


