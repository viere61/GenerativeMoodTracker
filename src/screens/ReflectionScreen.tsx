import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import ReflectionTextInput from '../components/ReflectionTextInput';
import MoodEntryService from '../services/MoodEntryService';

type ReflectionParams = {
  userId: string;
  moodRating: number;
  intensityRating: number;
  emotionTags: string[];
  influences: string[];
};
type ReflectionRouteProp = RouteProp<{ Reflection: ReflectionParams }, 'Reflection'>;

const ReflectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ReflectionRouteProp>();
  const { userId, moodRating, intensityRating, emotionTags, influences } = route.params;

  const [reflection, setReflection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const promptPool = [
    'Share one object that encapsulates your feeling.',
    'What environment matches your current state of mind?',
    'If your mood were weather, what would it be?',
    'Describe your mood as a texture.',
    'Share a food that encapsulates your feeling.',
    'What mode of transportation represents your current mood?',
    'If you were to be an animal today, what would it be?',
    'What ice cream flavors match your day today?',
    'Describe how you are feeling today based on a travel destination.',
    'What color is your mood today?',
    'What small moment stood out to you today?',
    'Share three objects, sounds, or images from your day.',
    'What greeting card message describes your day?',
    'If your mood were a time of day, what would it be?',
    'What plant or flower represents how you\'re feeling?',
    'If your mood were a beverage, what would it be?',
    'What sounds are you craving right now—rain, traffic, silence, music?',
    'What natural element matches your feeling—fire, water, earth, air?',
    'What kind of light describes your mood—bright sunlight, candlelight, moonlight, shadows?',
    'What kind of container holds your mood today—a jar, a basket, an open box, a sealed envelope?',
  ];
  const [randomPrompt] = useState(() => promptPool[Math.floor(Math.random() * promptPool.length)]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      await MoodEntryService.saveMoodEntry(
        userId,
        moodRating,
        intensityRating,
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


