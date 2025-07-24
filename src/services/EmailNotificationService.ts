import { Platform } from 'react-native';
import UserPreferencesService from './UserPreferencesService';
import LocalStorageManager from './LocalStorageManager';

export interface EmailNotificationSettings {
  enabled: boolean;
  userEmail: string;
  userName: string;
  autoRemindersEnabled: boolean; // New: automatic reminders when app opens
  preferredTimeRange?: { start: string; end: string }; // User's preferred time window
  weeklyReportEnabled: boolean;
  weeklyReportDay: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
}

export interface MoodStats {
  totalEntries: number;
  musicGenerated: number;
  mostActiveDay: string;
  averageMood: number;
}

export interface EmailNotificationResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailNotificationService {
  private baseUrl: string;
  private isInitialized: boolean = false;

  constructor() {
    // Always use the deployed Railway backend for now
    this.baseUrl = 'https://generativemoodtracker-production.up.railway.app/api';
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Test the connection to the backend
      const response = await fetch(`${this.baseUrl}/health`);
      if (response.ok) {
        this.isInitialized = true;
        console.log('✅ Email notification service initialized successfully');
      } else {
        console.warn('⚠️ Email notification service health check failed');
      }
    } catch (error) {
      console.warn('⚠️ Email notification service not available:', error);
    }
  }

  async sendMoodReminder(
    userEmail: string, 
    userName: string, 
    daysSinceLastEntry: number = 1
  ): Promise<EmailNotificationResponse> {
    try {
      await this.initialize();
      
      const response = await fetch(`${this.baseUrl}/send-mood-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          userName,
          daysSinceLastEntry
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('📧 Mood reminder email sent successfully');
      } else {
        console.error('❌ Failed to send mood reminder email:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error sending mood reminder email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendWeeklyReport(
    userEmail: string, 
    userName: string, 
    moodStats: MoodStats
  ): Promise<EmailNotificationResponse> {
    try {
      await this.initialize();
      
      const response = await fetch(`${this.baseUrl}/send-weekly-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          userName,
          moodStats
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('📧 Weekly report email sent successfully');
      } else {
        console.error('❌ Failed to send weekly report email:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error sending weekly report email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendTestEmail(userEmail: string): Promise<EmailNotificationResponse> {
    try {
      await this.initialize();
      
      const response = await fetch(`${this.baseUrl}/send-test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('📧 Test email sent successfully');
      } else {
        console.error('❌ Failed to send test email:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      await this.initialize();
      
      const response = await fetch(`${this.baseUrl}/health`);
      const result = await response.json();
      
      return result.status === 'healthy';
    } catch (error) {
      console.error('❌ Email service health check failed:', error);
      return false;
    }
  }

  // Helper method to calculate days since last entry
  calculateDaysSinceLastEntry(lastEntryDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastEntryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Check if user has logged a mood today
  hasLoggedMoodToday(moodEntries: any[]): boolean {
    if (!moodEntries || moodEntries.length === 0) return false;
    
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    return moodEntries.some(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= todayStart && entryDate < todayEnd;
    });
  }

  // Check if we should send a reminder (within user's preferred time window)
  async shouldSendReminder(): Promise<boolean> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Get user's preferred time window from settings
    const settings = await this.getStoredSettings();
    if (!settings) {
      // Fallback to reasonable hours if no settings
      return currentHour >= 9 && currentHour < 22;
    }
    
    // Parse user's preferred time window
    const [startHour, startMinute] = settings.preferredTimeRange?.start?.split(':').map(Number) || [21, 0];
    const [endHour, endMinute] = settings.preferredTimeRange?.end?.split(':').map(Number) || [22, 0];
    
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    
    console.log(`📧 Time check: current=${currentTimeInMinutes}, window=${startTimeInMinutes}-${endTimeInMinutes}`);
    
    // Check if current time is within the preferred window
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
  }

  // Check if we already sent a reminder today
  hasSentReminderToday(): boolean {
    try {
      const lastReminderDate = Platform.OS === 'web' 
        ? localStorage.getItem('last_reminder_date')
        : null; // For mobile, we'll use a different approach
      
      if (!lastReminderDate) return false;
      
      const today = new Date().toDateString();
      return lastReminderDate === today;
    } catch (error) {
      console.error('❌ Error checking reminder date:', error);
      return false;
    }
  }

  // Mark that we sent a reminder today
  markReminderSent(): void {
    try {
      const today = new Date().toDateString();
      if (Platform.OS === 'web') {
        localStorage.setItem('last_reminder_date', today);
      }
      // For mobile, we'll rely on the backend to prevent duplicates
      console.log('📧 Marked reminder as sent for today:', today);
    } catch (error) {
      console.error('❌ Error marking reminder sent:', error);
    }
  }

  // Automatic reminder when app opens
  async checkAndSendAutoReminder(
    userEmail: string,
    userName: string,
    moodEntries: any[]
  ): Promise<EmailNotificationResponse> {
    try {
      console.log('📧 Starting automatic reminder check...');
      console.log('📧 User email:', userEmail);
      console.log('📧 Mood entries count:', moodEntries?.length || 0);
      
      // Check if auto-reminders are enabled
      const settings = await this.getStoredSettings();
      console.log('📧 Email settings:', settings);
      
      if (!settings?.autoRemindersEnabled) {
        console.log('📧 Auto-reminders disabled');
        return { success: false, error: 'Auto-reminders disabled' };
      }

      // Check if user has already logged mood today
      const hasLoggedToday = this.hasLoggedMoodToday(moodEntries);
      console.log('📧 Has logged mood today:', hasLoggedToday);
      
      if (hasLoggedToday) {
        console.log('📧 User already logged mood today, no reminder needed');
        return { success: false, error: 'Already logged today' };
      }

      // Check if we should send reminder (time window)
      const shouldSend = await this.shouldSendReminder();
      console.log('📧 Should send reminder (time window):', shouldSend);
      
      if (!shouldSend) {
        console.log('📧 Outside reminder time window');
        return { success: false, error: 'Outside time window' };
      }

      // Check if we already sent a reminder today
      const alreadySent = this.hasSentReminderToday();
      console.log('📧 Already sent reminder today:', alreadySent);
      
      if (alreadySent) {
        console.log('📧 Already sent reminder today');
        return { success: false, error: 'Already sent today' };
      }

      // Send the reminder
      console.log('📧 Sending automatic mood reminder...');
      const result = await this.sendMoodReminder(userEmail, userName, 0);
      
      if (result.success) {
        this.markReminderSent();
        console.log('📧 Automatic reminder sent successfully');
      } else {
        console.log('📧 Failed to send automatic reminder:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error in auto-reminder check:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get stored settings from LocalStorageManager (same as UserPreferencesService)
  private async getStoredSettings(): Promise<EmailNotificationSettings | null> {
    try {
      // Use LocalStorageManager to get the settings (same as UserPreferencesService)
      const settings = await LocalStorageManager.retrieveData<EmailNotificationSettings>('emailNotificationSettings');
      
      if (settings) {

        
        // Get time preferences from UserPreferencesService
        try {
          const userPreferences = await UserPreferencesService.getPreferences('demo-user');
          if (userPreferences && settings) {
            settings.preferredTimeRange = userPreferences.preferredTimeRange;
    
          }
        } catch (error) {
          console.warn('⚠️ Could not get user preferences for time range:', error);
        }
        
        return settings;
      }
      
      
      return null;
    } catch (error) {
      console.error('❌ Error reading stored settings:', error);
      return null;
    }
  }

  // Helper method to generate mood stats for weekly reports
  generateMoodStats(moodEntries: any[]): MoodStats {
    if (!moodEntries || moodEntries.length === 0) {
      return {
        totalEntries: 0,
        musicGenerated: 0,
        mostActiveDay: 'N/A',
        averageMood: 0
      };
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentEntries = moodEntries.filter(entry => 
      new Date(entry.timestamp) >= oneWeekAgo
    );

    const totalEntries = recentEntries.length;
    const musicGenerated = recentEntries.filter(entry => entry.musicId).length;
    
    // Calculate average mood
    const totalMood = recentEntries.reduce((sum, entry) => sum + (entry.moodRating || 0), 0);
    const averageMood = totalEntries > 0 ? Math.round((totalMood / totalEntries) * 10) / 10 : 0;
    
    // Find most active day
    const dayCounts: { [key: string]: number } = {};
    recentEntries.forEach(entry => {
      const day = new Date(entry.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    
    const mostActiveDay = Object.keys(dayCounts).reduce((a, b) => 
      dayCounts[a] > dayCounts[b] ? a : b, 'N/A'
    );

    return {
      totalEntries,
      musicGenerated,
      mostActiveDay,
      averageMood
    };
  }

  // Method to schedule notifications based on user preferences
  async scheduleNotifications(settings: EmailNotificationSettings): Promise<void> {
    if (!settings.enabled) {
      console.log('📧 Email notifications disabled');
      return;
    }

    try {
      // For now, we'll use a simple approach
      // In a production app, you might want to use a proper scheduling service
      console.log('📧 Email notifications scheduled with settings:', settings);
      
      // You could integrate with a cron job service here
      // or use a cloud function to handle scheduling
    } catch (error) {
      console.error('❌ Error scheduling email notifications:', error);
    }
  }
}

export const emailNotificationService = new EmailNotificationService();
export default emailNotificationService; 