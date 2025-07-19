# Generative Mood Tracker

A cross-platform (Expo/React Native) app for mood tracking, reflection, and AI-inspired music generation with intelligent fallback systems.

## Features

### Core Mood Tracking
- **Mood Logging**: Log your mood (1-10 scale), select emotion tags, and write a reflection
- **Time Window System**: Log your mood only during a random 1-hour window within your preferred time range each day
- **Mood History**: View your mood entries and trends over time with detailed analytics
- **Settings**: Change your preferred time range, notification settings, and more

### Email Notifications
- **Automatic Reminders**: Receive email reminders when you open the app during your preferred time window (if you haven't logged today)
- **Time Window Respect**: Reminders only sent during your configured time range (e.g., 21:00-22:00)
- **Smart Detection**: Automatically detects if you've already logged a mood today
- **Weekly Reports**: Optional weekly mood statistics and insights
- **Test Emails**: Verify email configuration with test emails
- **Backend Integration**: Deployed on Railway with SendGrid email service

### AI Sound Effects System
- **AI-Powered Sound Effects**: Generates unique sound effects using ElevenLabs Sound Effects API
- **Mood-Based Audio**: Sound effect parameters are dynamically adjusted based on:
  - Mood rating (1-10 scale)
  - Selected emotion tags
  - Reflection text sentiment analysis
  - Emotional context and atmosphere

### Audio Features
- **Real-time Playback**: Play, pause, resume, and stop generated sound effects
- **Progress Tracking**: Visual progress bar with time display
- **Volume Control**: Adjustable volume levels
- **Repeat Mode**: Loop audio playback
- **Cross-platform Storage**: Audio data persists across sessions using platform-appropriate storage

## AI Sound Effects Generation System

The app generates AI-powered sound effects using ElevenLabs Sound Effects API, creating unique audio experiences based on your mood entries:

### How It Works
1. **Mood Analysis**: Analyzes the user's mood entry to determine sound effect parameters
2. **AI Prompt Generation**: Creates detailed prompts for ElevenLabs API based on:
   - **Mood Rating**: Emotional intensity and energy level
   - **Emotion Tags**: Specific emotions like "joyful", "melancholic", "energetic"
   - **Reflection Text**: Sentiment analysis of user's written reflection
   - **Musical Context**: References to musical elements and atmosphere

3. **ElevenLabs API Integration**: Uses ElevenLabs Sound Effects API to generate:
   - **Unique Sound Effects**: AI-generated audio based on mood prompts
   - **Mood-Appropriate Audio**: Tailored to match the user's emotional state
   - **High-Quality Output**: Professional-grade sound effects

4. **Audio Processing**: Handles MP3 audio data and converts for cross-platform compatibility
5. **Storage**: Stores audio files locally for persistent playback across app sessions

### AI Intelligence
The system leverages ElevenLabs' advanced AI to create mood-appropriate sound effects:
- **Emotional Mapping**: Translates mood ratings and emotions into descriptive sound effect prompts
- **Context Awareness**: Incorporates reflection text to create more personalized audio experiences
- **Cross-Platform Compatibility**: Handles React Native and web environments seamlessly
- **Persistent Storage**: Audio files are saved locally and persist across app sessions

## Setup

1. **Clone the repo:**
   ```sh
   git clone https://github.com/viere61/GenerativeMoodTracker.git
   cd GenerativeMoodTracker
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Start the app:**
   - For mobile (Expo Go):
     ```sh
     npx expo start
     ```
   - For web:
     ```sh
     npx expo start --web
     ```

4. **Scan the QR code** with Expo Go (iOS/Android) or open [http://localhost:8081](http://localhost:8081) in your browser.

## Technical Architecture

### Services
- **MoodEntryService**: Handles mood entry creation, storage, and retrieval
- **MusicGenerationService**: Manages AI sound effects generation
- **NotificationService**: Handles push notifications (mobile only)
- **TimeWindowService**: Manages the random time window system
- **StorageService**: Platform-appropriate data persistence
- **EmailNotificationService**: Manages automatic email reminders and weekly reports
- **UserPreferencesService**: Handles user settings and email notification preferences

### Storage Strategy
- **Web**: Uses localStorage for music data and IndexedDB for mood entries
- **Mobile**: Uses AsyncStorage and FileSystem for native storage
- **Cross-platform**: Unified API with platform-specific implementations

### Sound Effects Generation Pipeline
1. User creates mood entry
2. System generates AI prompt based on mood data
3. ElevenLabs API creates unique sound effect
4. Audio data is processed and stored locally
5. Audio player loads and plays the generated sound effect

## Known Issues & Limitations

### Current Issues
- **Notifications**: Not working in Expo Go (requires development build)
- **Web Audio Context**: May require user interaction to resume suspended context
- **Email Reminders**: Only work when app is open (push notifications needed for background reminders)

### Technical Limitations
- **API Dependencies**: Requires ElevenLabs API access for AI music generation
- **Browser Compatibility**: Web Audio API support varies across browsers
- **Storage Limits**: localStorage has size limitations for audio data
- **Mobile Performance**: Audio processing may impact mobile performance

### Planned Improvements
- **Enhanced AI Prompts**: Improve prompt engineering for better sound effects generation
- **Multiple AI Services**: Integrate with additional sound effects generation APIs
- **Offline Support**: Better offline sound effects generation capabilities
- **Audio Effects**: Add reverb, delay, and other audio effects
- **Export Features**: Allow users to download generated sound effects
- **Push Notifications**: Background reminders when app is not running
- **Enhanced Email Features**: More sophisticated email templates and scheduling

## Development

### Debug Features
- **Debug Panel**: Access via settings to test music generation
- **Console Logging**: Extensive logging for troubleshooting
- **Error Handling**: Graceful fallbacks for all failure scenarios

### Testing
- **Unit Tests**: Comprehensive test coverage for all services
- **Integration Tests**: End-to-end testing of music generation flow
- **Cross-platform Testing**: Verified on web, iOS, and Android

## Repository

[https://github.com/viere61/GenerativeMoodTracker](https://github.com/viere61/GenerativeMoodTracker)

## Contributing

Feel free to fork, contribute, or open issues! Areas for contribution:
- Enhanced AI sound effects generation prompts
- Additional sound effects generation APIs
- UI/UX improvements
- Performance optimizations
- Additional mood tracking features

---

**Note**: This app demonstrates AI-powered sound effects generation using ElevenLabs Sound Effects API. The system creates unique, mood-appropriate audio experiences based on your emotional state and reflections. 