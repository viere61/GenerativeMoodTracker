# Generative Mood Tracker

A cross-platform (Expo/React Native) app for mood tracking, reflection, and AI-inspired music generation with intelligent fallback systems.

## Features

### Core Mood Tracking
- **Mood Logging**: Log your mood (1-10 scale), select emotion tags, and write a reflection
- **Time Window System**: Log your mood only during a random 1-hour window within your preferred time range each day
- **Mood History**: View your mood entries and trends over time with detailed analytics
- **Settings**: Change your preferred time range, notification settings, and more

### Email Notifications
- Actually useless because it only works when you are actively on the app, so no need to enable it.
- **Automatic Reminders**: Receive email reminders when you open the app during your preferred time window (if you haven't logged today)
- **Test Emails**: Verify email configuration with test emails
- **Backend Integration**: Deployed on Railway with SendGrid email service

### AI Sound Effects System
- **AI-Powered Sound Generation**: Generates unique sound effects based on your reflection text using ElevenLabs Sound Generation API
- **Multiple AI Services**: Fallback to alternative services if primary service is unavailable:
  - ElevenLabs Sound Generation API (primary)
  - Replicate MusicGen (fallback)
  - Hugging Face Inference API (fallback)
  - If your API key is not configured correctly, you should still get an audio based on your mood, but it's not AI generated.

### Audio Features
- **Real-time Playback**: Play, pause, resume, and stop generated sound effects
- **Progress Tracking**: Visual progress bar with time display
- **Volume Control**: Adjustable volume levels
- **Repeat Mode**: Loop audio playback
- **Cross-platform Storage**: Audio data persists across sessions using platform-appropriate storage

# Getting Started

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- ElevenLabs API key (for AI sound generation)

## Setup Instructions

### 1. Clone the Repository
```sh
git clone https://github.com/yourusername/GenerativeMoodTracker.git
cd GenerativeMoodTracker
```

### 2. Install Dependencies
```sh
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory with:
```
# Frontend Environment Variables
EXPO_PUBLIC_BACKEND_URL=http://localhost:3001
EXPO_PUBLIC_DEBUG_MODE=false

# If running locally with backend
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### 4. Configure Backend (if self-hosting)
```sh
cd backend
cp env.example .env
```

Edit the `.env` file with your API keys:
```
# ElevenLabs API (required for AI sound generation)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional alternative services
REPLICATE_API_TOKEN=your_replicate_token
HUGGINGFACE_API_TOKEN=your_huggingface_token

# Email notifications (optional)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Generative Mood Tracker
```

### 5. Start the Backend (if self-hosting)
```sh
cd backend
npm install
npm start
```

### 6. Start the App
- **For Web:**
  ```sh
  npx expo start
  ```
  Open [http://localhost:8081](http://localhost:8081) in your browser

- **For Mobile (Expo Go):**
  ```sh
  npx expo start
  ```
  Scan the QR code with Expo Go app on your device

### 7. Deploy to Railway (optional)
1. Create a Railway account
2. Create a new project
3. Add the following environment variables:
   - `ELEVENLABS_API_KEY`
   - `PORT=3001`
   - `SENDGRID_API_KEY` (optional)
   - `FROM_EMAIL` (optional)
   - `FROM_NAME` (optional)
4. Deploy the backend folder to Railway
5. Update your frontend to use the Railway URL

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
2. Your reflection text will be the prompt (not effected by mood data)
3. ElevenLabs API creates unique sound effect
4. Audio data is processed and stored locally
5. Audio player loads and plays the generated sound effect

## Known Issues & Limitations

### Current Issues
- **QR Code Scanning**: May have issues when scanning Expo QR code with iPhone camera

### Technical Limitations
- **API Dependencies**: Requires ElevenLabs API key

### Planned Improvements
- delete email notification implementation
- "what influences you" section doesn't display properly on Android devices

## Development

### Debug Features
- **Debug Panel**: Access via settings to test music generation
- **Console Logging**: Extensive logging for troubleshooting
- **Error Handling**: Graceful fallbacks for all failure scenarios

### Testing
- **Unit Tests**: Comprehensive test coverage for all services
- **Integration Tests**: End-to-end testing of music generation flow
- **Cross-platform Testing**: Verified on web, iOS, and Android

### Cleanup (Optional)
The following test/debug files can be safely removed if not needed:
- `backend/test-elevenlabs.js` - Test script for ElevenLabs API
- `e2e/` directory - End-to-end test files
- `src/integration-tests/` directory - Integration test files
- `src/*/__tests__/` directories - Unit test files

## Repository

[https://github.com/viere61/GenerativeMoodTracker](https://github.com/viere61/GenerativeMoodTracker)

---