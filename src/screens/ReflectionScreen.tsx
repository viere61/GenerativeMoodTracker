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

  const getWeeklyPromptTitle = () => {
    const day = new Date().getDay();
    switch (day) {
      case 1:
        return 'Monday: Share one object that encapsulates your feeling.';
      case 2:
        return 'Tuesday: Share three words that capture your day.';
      case 3:
        return 'Wednesday: What environment matches your current state of mind?';
      case 4:
        return 'Thursday: How does your mood feel in your body right now?';
      case 5:
        return 'Friday: If your mood were weather, what would it be?';
      case 6:
        return 'Saturday: Journal whatever you want!';
      case 0:
      default:
        return 'Sunday: Journal whatever you want!';
    }
  };
  const weeklyPromptTitle = getWeeklyPromptTitle();

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      await MoodEntryService.saveMoodEntry(
        userId,
        moodRating,
        emotionTags,
        influences,
        reflection
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
            <Text style={styles.title}>{weeklyPromptTitle}</Text>
            <View>
              <ReflectionTextInput value={reflection} onChange={setReflection} minLength={0} showSubtitle={false} />
            </View>
            <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.disabledButton]} onPress={handleSubmit} disabled={isSubmitting}>
              <Text style={styles.submitButtonText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{weeklyPromptTitle}</Text>
          <View>
            <ReflectionTextInput value={reflection} onChange={setReflection} minLength={0} showSubtitle={false} />
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


