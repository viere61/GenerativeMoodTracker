/**
 * Type definitions for the Generative Mood Tracker app
 */

// User model
export interface User {
  userId: string;
  email: string;
  passwordHash?: string; // Optional in the interface but required internally
  preferredTimeRange: {
    start: string; // Format: "HH:MM"
    end: string; // Format: "HH:MM"
  };
  createdAt: number; // Timestamp
  lastLogin: number; // Timestamp
  settings: {
    notifications: boolean;
    theme: string;
    audioQuality: string;
    privacyOptions?: {
      dataSharing: boolean;
      analyticsEnabled: boolean;
    };
    accessibilityOptions?: {
      fontSize: string;
      highContrast: boolean;
    };
  };
  accountStatus: 'active' | 'inactive' | 'locked';
  securityInfo?: {
    lastPasswordChange?: number;
    failedLoginAttempts?: number;
    passwordResetRequired?: boolean;
  };
}

// Daily time window model
export interface DailyWindow {
  userId: string;
  date: string; // Format: "YYYY-MM-DD"
  windowStart: number; // Timestamp
  windowEnd: number; // Timestamp
  hasLogged: boolean;
  notificationSent: boolean;
}

// Mood entry model
export interface MoodEntry {
  entryId: string;
  userId: string;
  timestamp: number; // Timestamp
  moodRating: number; // 1-10
  emotionTags: string[];
  influences: string[]; // What influenced your mood
  reflection: string;
  musicGenerated: boolean;
  musicId?: string;
}

// Generated music model
export interface GeneratedMusic {
  musicId: string;
  userId: string;
  entryId: string;
  generatedAt: number; // Timestamp
  audioUrl: string;
  duration: number;
  musicParameters: {
    tempo: number;
    key: string;
    instruments: string[];
    mood: string;
  };
}