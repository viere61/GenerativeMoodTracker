import { Platform } from 'react-native';

export interface EmailNotificationSettings {
  enabled: boolean;
  userEmail: string;
  userName: string;
  reminderFrequency: 'daily' | 'weekly' | 'never';
  reminderTime: string; // HH:MM format
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
    // Use localhost for development, change to your deployed backend URL for production
    this.baseUrl = __DEV__ 
      ? 'http://localhost:3001/api'
      : 'https://your-backend-domain.com/api';
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