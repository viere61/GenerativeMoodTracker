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

### Music Generation System
- **AI-Powered Music Generation**: Attempts to generate music using Hugging Face MusicGen API
- **Intelligent Fallback System**: When AI services are unavailable, generates procedural music using Web Audio API
- **Mood-Based Music**: Music parameters are dynamically adjusted based on:
  - Mood rating (1-10 scale)
  - Selected emotion tags
  - Reflection text sentiment analysis
  - Musical theory (tempo, key signatures, scales, dynamics)

### Music Features
- **Real-time Playback**: Play, pause, resume, and stop generated music
- **Progress Tracking**: Visual progress bar with time display
- **Volume Control**: Adjustable volume levels
- **Repeat Mode**: Loop music playback
- **Cross-platform Storage**: Music data persists across sessions using platform-appropriate storage

## Fallback Music Generation System

When external AI music generation services are unavailable, the app uses an advanced procedural music generation system:

### How It Works
1. **Mood Analysis**: Analyzes the user's mood entry to determine musical parameters
2. **Parameter Generation**: Creates music parameters based on:
   - **Tempo**: Faster for higher mood ratings, slower for lower ratings
   - **Key Signatures**: Major keys for positive moods, minor keys for negative moods
   - **Scales**: Different musical scales based on emotional content
   - **Dynamics**: Volume and intensity variations
   - **Harmony**: Chord progressions and harmonic complexity

3. **Web Audio API Generation**: Uses the browser's Web Audio API to generate:
   - **Melody**: Creates melodic sequences based on mood parameters
   - **Harmony**: Adds harmonic layers and bass lines
   - **Rhythm**: Generates rhythmic patterns
   - **Envelope**: Applies attack, sustain, and release shaping

4. **Audio Processing**: Converts generated audio to WAV format with proper headers
5. **Storage**: Stores audio data as base64 in localStorage for persistent playback

### Musical Intelligence
The fallback system incorporates basic musical theory:
- **Scale Selection**: Major scales for joy/uplifting moods, minor scales for melancholic/sad moods
- **Tempo Mapping**: 60-120 BPM range based on mood energy
- **Frequency Mapping**: Musical notes mapped to frequencies (A4 = 440Hz)
- **Harmonic Content**: Adds octaves, fifths, and thirds for richer sound
- **Dynamic Range**: Varies amplitude based on mood intensity

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
- **MusicGenerationService**: Manages AI music generation and fallback systems
- **NotificationService**: Handles push notifications (mobile only)
- **TimeWindowService**: Manages the random time window system
- **StorageService**: Platform-appropriate data persistence
- **EmailNotificationService**: Manages automatic email reminders and weekly reports
- **UserPreferencesService**: Handles user settings and email notification preferences

### Storage Strategy
- **Web**: Uses localStorage for music data and IndexedDB for mood entries
- **Mobile**: Uses AsyncStorage and FileSystem for native storage
- **Cross-platform**: Unified API with platform-specific implementations

### Music Generation Pipeline
1. User creates mood entry
2. System attempts Hugging Face MusicGen API
3. If API fails, falls back to procedural generation
4. Audio data is stored and blob URL created
5. Music player loads and plays the generated audio

## Known Issues & Limitations

### Current Issues
- **Hugging Face API**: Returns 404 errors due to endpoint availability issues
- **Notifications**: Not working in Expo Go (requires development build)
- **Web Audio Context**: May require user interaction to resume suspended context
- **Email Reminders**: Only work when app is open (push notifications needed for background reminders)

### Technical Limitations
- **Audio Quality**: Fallback system generates basic procedural music (not professional quality)
- **Browser Compatibility**: Web Audio API support varies across browsers
- **Storage Limits**: localStorage has size limitations for audio data
- **Mobile Performance**: Complex audio generation may impact mobile performance

### Planned Improvements
- **Alternative AI APIs**: Integrate with other music generation services
- **Enhanced Procedural Generation**: Improve musical complexity and quality
- **Offline Support**: Better offline music generation capabilities
- **Audio Effects**: Add reverb, delay, and other audio effects
- **Export Features**: Allow users to download generated music
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
- Alternative AI music generation APIs
- Enhanced procedural music algorithms
- UI/UX improvements
- Performance optimizations
- Additional mood tracking features

---

**Note**: This app demonstrates advanced fallback systems and cross-platform audio handling. While the AI music generation is currently limited by API availability, the procedural fallback system ensures users always get mood-appropriate music. 