# Generative Mood Tracker

A cross-platform (Expo/React Native) app for mood tracking, reflection, and AI-inspired music generation.

## Features

- **Mood Logging**: Log your mood (1-10 scale), select emotion tags, and write a reflection.
- **Time Window System**: Log your mood only during a random 1-hour window within your preferred time range each day.
- **Mood History**: View your mood entries and trends over time.
- **Music Generation**: (Planned) Generate music based on your mood and emotions.
- **Notifications**: (Planned) Get notified when your mood logging window opens.
- **Settings**: Change your preferred time range, notification settings, and more.

## Setup

1. **Clone the repo:**
   ```sh
   git clone https://github.com/viere61/GenerativeMoodTracker.git
   cd GenerativeMoodTracker/GenerativeMoodTracker
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

## Known Issues / Limitations

- **Notifications are not working yet** (Expo Go does not support notifications; use a dev build for full support).
- **Music generation is not working yet** (the AI backend/API is not implemented; music generation is simulated with placeholders).
- **Web scrolling**: The app is optimized for mobile. Web scrolling may require additional CSS tweaks.

## Repository

[https://github.com/viere61/GenerativeMoodTracker](https://github.com/viere61/GenerativeMoodTracker)

## Commit Message for Initial Upload

```
Initial upload: notification not working yet, music generation not working yet
```

---

Feel free to fork, contribute, or open issues! 