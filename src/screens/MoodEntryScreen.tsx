import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import MoodRatingSelector from '../components/MoodRatingSelector';
import EmotionTagSelector from '../components/EmotionTagSelector';
import InfluenceSelector from '../components/InfluenceSelector';
import ReflectionTextInput from '../components/ReflectionTextInput';
import MoodEntryService from '../services/MoodEntryService';

/**
 * Screen for entering daily mood information
 * Implements requirements:
 * - 1.5: "WHEN a user selects a mood rating (1-10 scale) THEN the system SHALL record the mood with timestamp"
 * - 1.6: "WHEN a user adds emotion tags THEN the system SHALL store the tags with the mood entry"
 * - 1.7: "WHEN a user submits a mood entry THEN the system SHALL require a descriptive reflection text (minimum 20 characters)"
 */
type MoodEntryScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<RootStackParamList, 'MoodEntry'>,
  BottomTabNavigationProp<MainTabParamList>
>;

const MoodEntryScreen = () => {
  const navigation = useNavigation<MoodEntryScreenNavigationProp>();
  // Use demo user for web compatibility
  const user = { userId: 'demo-user' };
  
  const [moodRating, setMoodRating] = useState<number | null>(null);
  const [emotionTags, setEmotionTags] = useState<string[]>([]);
  const [influences, setInfluences] = useState<string[]>([]);
  const [reflection, setReflection] = useState('');
  const [isRatingValid, setIsRatingValid] = useState(false);
  const [areTagsValid, setAreTagsValid] = useState(false);
  const [areInfluencesValid, setAreInfluencesValid] = useState(false);
  const [isReflectionValid, setIsReflectionValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAlreadyLoggedToday, setHasAlreadyLoggedToday] = useState(false);
  const [useSimpleComponents, setUseSimpleComponents] = useState(false);
  
  // Check if user has already logged a mood today
  useEffect(() => {
    const checkTodaysMoodEntry = async () => {
      if (user?.userId) {
        try {
          const hasLogged = await MoodEntryService.hasLoggedMoodToday(user.userId);
          setHasAlreadyLoggedToday(hasLogged);
          
          if (hasLogged) {
            Alert.alert(
              "Already Logged Today",
              "You've already recorded your mood for today. You can view it in your history.",
              [{ text: "OK" }]
            );
          }
        } catch (error) {
          console.error('Error checking today\'s mood entry:', error);
          // Fall back to simple components if there's an error
          setUseSimpleComponents(true);
        }
      }
    };
    
    checkTodaysMoodEntry();
  }, [user]);
  
  // Check if form is valid
  const isFormValid = isRatingValid && areTagsValid && areInfluencesValid && isReflectionValid;
  
  const handleSubmit = async () => {
    if (!user?.userId || !moodRating || !isFormValid) return;
    
    try {
      setIsSubmitting(true);
      
      // Save the mood entry
      await MoodEntryService.saveMoodEntry(
        user.userId,
        moodRating,
        emotionTags,
        influences,
        reflection
      );
      
      // Show success message
      Alert.alert(
        "Success",
        "Your mood has been recorded successfully!",
        [
          { 
            text: "View History", 
            onPress: () => navigation.navigate('Main', { screen: 'History' })
          },
          { 
            text: "OK", 
            onPress: () => navigation.navigate('Main', { screen: 'Home' })
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to save your mood entry. Please try again.",
        [{ text: "OK" }]
      );
      console.error("Error saving mood entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // If user has already logged today, show a message
  if (hasAlreadyLoggedToday) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.title}>You've already logged your mood today</Text>
        <Text style={styles.message}>
          You can only log your mood once per day. Check back tomorrow for a new mood logging window.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Main', { screen: 'History' })}
        >
          <Text style={styles.buttonText}>View Mood History</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Use simple components if there was an error or for better web compatibility
  if (useSimpleComponents) {
    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>How are you feeling today?</Text>
        
        {/* Simple mood rating */}
        <View style={styles.ratingContainer}>
          <Text style={styles.sectionTitle}>Mood Rating (1-10)</Text>
          <View style={styles.ratingButtons}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingButton,
                  moodRating === rating && styles.selectedRatingButton
                ]}
                onPress={() => setMoodRating(rating)}
              >
                <Text style={[
                  styles.ratingButtonText,
                  moodRating === rating && styles.selectedRatingButtonText
                ]}>
                  {rating}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Simple emotion tags */}
        <View style={styles.emotionsContainer}>
          <Text style={styles.sectionTitle}>Emotions (select at least 1)</Text>
          <View style={styles.emotionButtons}>
            {['Happy', 'Sad', 'Anxious', 'Excited', 'Tired', 'Stressed'].map((emotion) => (
              <TouchableOpacity
                key={emotion}
                style={[
                  styles.emotionButton,
                  emotionTags.includes(emotion) && styles.selectedEmotionButton
                ]}
                onPress={() => {
                  if (emotionTags.includes(emotion)) {
                    setEmotionTags(emotionTags.filter(tag => tag !== emotion));
                  } else {
                    setEmotionTags([...emotionTags, emotion]);
                  }
                }}
              >
                <Text style={[
                  styles.emotionButtonText,
                  emotionTags.includes(emotion) && styles.selectedEmotionButtonText
                ]}>
                  {emotion}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Simple influences */}
        <View style={styles.influencesContainer}>
          <Text style={styles.sectionTitle}>Influences (select at least 1)</Text>
          <View style={styles.influenceButtons}>
            {['Family', 'Work', 'Friends', 'Exercise', 'Travel', 'Health'].map((influence) => (
              <TouchableOpacity
                key={influence}
                style={[
                  styles.influenceButton,
                  influences.includes(influence) && styles.selectedInfluenceButton
                ]}
                onPress={() => {
                  if (influences.includes(influence)) {
                    setInfluences(influences.filter(inf => inf !== influence));
                  } else {
                    setInfluences([...influences, influence]);
                  }
                }}
              >
                <Text style={[
                  styles.influenceButtonText,
                  influences.includes(influence) && styles.selectedInfluenceButtonText
                ]}>
                  {influence}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Simple reflection input */}
        <View style={styles.reflectionContainer}>
          <Text style={styles.sectionTitle}>Reflection (minimum 20 characters)</Text>
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="Write about how you're feeling today..."
            value={reflection}
            onChangeText={setReflection}
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {reflection.length}/20 characters
          </Text>
        </View>
        
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isFormValid || isSubmitting) && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {!isFormValid && (
          <View style={styles.validationSummary}>
            <Text style={styles.validationSummaryTitle}>
              Please complete all required fields:
            </Text>
            {!moodRating && (
              <Text style={styles.validationMessage}>• Select a mood rating</Text>
            )}
            {emotionTags.length === 0 && (
              <Text style={styles.validationMessage}>• Select at least one emotion</Text>
            )}
            {influences.length === 0 && (
              <Text style={styles.validationMessage}>• Select at least one influence</Text>
            )}
            {reflection.length < 20 && (
              <Text style={styles.validationMessage}>
                • Write a reflection (minimum 20 characters)
              </Text>
            )}
          </View>
        )}
        
        {/* Add extra space at the bottom to ensure submit button is visible */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  }
  
  // Restore the original MoodEntryScreen return (before the scroll test):
  return (
    <View style={{ flex: 1 }}>
      {(Platform.OS === 'ios' || Platform.OS === 'android') ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, padding: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <Text style={styles.title}>How are you feeling today?</Text>
            <View style={styles.ratingContainer}>
              <MoodRatingSelector 
                value={moodRating} 
                onChange={setMoodRating}
                onValidationChange={setIsRatingValid}
              />
            </View>
            <View style={styles.emotionsContainer}>
              <EmotionTagSelector
                selectedTags={emotionTags}
                onChange={setEmotionTags}
                onValidationChange={setAreTagsValid}
                minSelections={1}
              />
            </View>
            <View style={styles.influencesContainer}>
              <InfluenceSelector
                selectedInfluences={influences}
                onInfluencesChange={setInfluences}
                onValidationChange={setAreInfluencesValid}
              />
            </View>
            <View style={styles.reflectionContainer}>
              <ReflectionTextInput
                value={reflection}
                onChange={setReflection}
                minLength={20}
                onValidationChange={setIsReflectionValid}
              />
            </View>
            <View style={styles.submitContainer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!isFormValid || isSubmitting) && styles.disabledButton
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                accessibilityLabel="Submit mood entry"
                accessibilityHint="Save your mood rating, emotions, and reflection"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
            {!isFormValid && (
              <View style={styles.validationSummary}>
                <Text style={styles.validationSummaryTitle}>
                  Please complete all required fields:
                </Text>
                {!isRatingValid && (
                  <Text style={styles.validationMessage}>• Select a mood rating</Text>
                )}
                {!areTagsValid && (
                  <Text style={styles.validationMessage}>• Select at least one emotion</Text>
                )}
                {!areInfluencesValid && (
                  <Text style={styles.validationMessage}>• Select at least one influence</Text>
                )}
                {!isReflectionValid && (
                  <Text style={styles.validationMessage}>
                    • Write a reflection (minimum 20 characters)
                  </Text>
                )}
              </View>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <Text style={styles.title}>How are you feeling today?</Text>
          <View style={styles.ratingContainer}>
            <MoodRatingSelector 
              value={moodRating} 
              onChange={setMoodRating}
              onValidationChange={setIsRatingValid}
            />
          </View>
          <View style={styles.emotionsContainer}>
            <EmotionTagSelector
              selectedTags={emotionTags}
              onChange={setEmotionTags}
              onValidationChange={setAreTagsValid}
              minSelections={1}
            />
          </View>
          <View style={styles.influencesContainer}>
            <InfluenceSelector
              selectedInfluences={influences}
              onInfluencesChange={setInfluences}
              onValidationChange={setAreInfluencesValid}
            />
          </View>
          <View style={styles.reflectionContainer}>
            <ReflectionTextInput
              value={reflection}
              onChange={setReflection}
              minLength={20}
              onValidationChange={setIsReflectionValid}
            />
          </View>
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isFormValid || isSubmitting) && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              accessibilityLabel="Submit mood entry"
              accessibilityHint="Save your mood rating, emotions, and reflection"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
          {!isFormValid && (
            <View style={styles.validationSummary}>
              <Text style={styles.validationSummaryTitle}>
                Please complete all required fields:
              </Text>
              {!isRatingValid && (
                <Text style={styles.validationMessage}>• Select a mood rating</Text>
              )}
                              {!areTagsValid && (
                  <Text style={styles.validationMessage}>• Select at least one emotion</Text>
                )}
                {!areInfluencesValid && (
                  <Text style={styles.validationMessage}>• Select at least one influence</Text>
                )}
                {!isReflectionValid && (
                  <Text style={styles.validationMessage}>
                    • Write a reflection (minimum 20 characters)
                  </Text>
                )}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    minHeight: '100%',
  },
  centeredContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  ratingContainer: {
    marginBottom: 20,
  },
  emotionsContainer: {
    marginBottom: 20,
  },
  influencesContainer: {
    marginBottom: 20,
  },
  reflectionContainer: {
    marginBottom: 20,
  },
  submitContainer: {
    marginTop: 20,
    marginBottom: 20,
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
  validationSummary: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 5,
  },
  validationSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E53935',
    marginBottom: 5,
  },
  validationMessage: {
    color: '#E53935',
    fontSize: 14,
    marginVertical: 2,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
    width: '80%',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  ratingButton: {
    width: '10%', // Adjust as needed for 10 buttons
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    backgroundColor: '#E0E0E0',
  },
  selectedRatingButton: {
    backgroundColor: '#4CAF50',
  },
  ratingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedRatingButtonText: {
    color: 'white',
  },
  emotionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  emotionButton: {
    width: '45%', // Adjust as needed for 6 buttons
    aspectRatio: 1.5,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    backgroundColor: '#E0E0E0',
  },
  selectedEmotionButton: {
    backgroundColor: '#2196F3',
  },
  emotionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedEmotionButtonText: {
    color: 'white',
  },
  influenceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  influenceButton: {
    width: '45%', // Adjust as needed for 6 buttons
    aspectRatio: 1.5,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    backgroundColor: '#E0E0E0',
  },
  selectedInfluenceButton: {
    backgroundColor: '#FF9800',
  },
  influenceButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedInfluenceButtonText: {
    color: 'white',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignSelf: 'flex-end',
    marginTop: 5,
    fontSize: 12,
    color: '#666',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default MoodEntryScreen;