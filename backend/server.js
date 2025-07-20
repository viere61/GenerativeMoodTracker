require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sgMail = require('@sendgrid/mail');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment (fixes rate limiting issue)
app.set('trust proxy', 1);

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:19006', 'http://localhost:8081', 'http://localhost:19000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For development, allow localhost with any port
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
const musicGenerationRoutes = require('./music-generation');

// Email templates
const emailTemplates = {
  moodReminder: (userName, daysSinceLastEntry) => ({
    subject: `Time to check in with your mood, ${userName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎵 Generative Mood Tracker</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your AI-powered mood companion</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${userName}! 👋</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            ${daysSinceLastEntry > 1 
              ? `It's been ${daysSinceLastEntry} days since your last mood entry.` 
              : 'It\'s time for your daily mood check-in!'
            }
          </p>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Take a moment to reflect on how you're feeling and let our AI create a personalized piece of music just for you.
          </p>
          
          <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #1976d2; font-weight: 500;">
              💡 <strong>Today's Tip:</strong> Try to be specific about your emotions. The more detailed you are, the better the AI can understand and create music that resonates with your mood.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="exp://localhost:19000" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">
              📱 Open App & Log Mood
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            This email was sent because you have email notifications enabled in your mood tracker settings.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 Generative Mood Tracker. All rights reserved.</p>
        </div>
      </div>
    `
  }),
  
  weeklyReport: (userName, moodStats) => ({
    subject: `Your Weekly Mood Report, ${userName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📊 Weekly Mood Report</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your mood journey this week</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${userName}! 📈</h2>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h3 style="color: #333; margin-top: 0;">This Week's Stats:</h3>
            <ul style="color: #666; line-height: 1.8; font-size: 16px;">
              <li>📝 <strong>Entries logged:</strong> ${moodStats.totalEntries || 0}</li>
              <li>🎵 <strong>Music pieces generated:</strong> ${moodStats.musicGenerated || 0}</li>
              <li>📅 <strong>Most active day:</strong> ${moodStats.mostActiveDay || 'N/A'}</li>
              <li>😊 <strong>Average mood rating:</strong> ${moodStats.averageMood || 'N/A'}/10</li>
            </ul>
          </div>
          
          <div style="background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #2e7d32; font-weight: 500;">
              🌟 <strong>Great job!</strong> You're building a valuable habit of self-reflection and emotional awareness.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="exp://localhost:19000" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">
              📱 View Full Report
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 Generative Mood Tracker. All rights reserved.</p>
        </div>
      </div>
    `
  })
};

// Email service functions
const emailService = {
  async sendMoodReminder(userEmail, userName, daysSinceLastEntry = 1) {
    try {
      const template = emailTemplates.moodReminder(userName, daysSinceLastEntry);
      
      const msg = {
        to: userEmail,
        from: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME
        },
        subject: template.subject,
        html: template.html
      };
      
      const response = await sgMail.send(msg);
      console.log(`Mood reminder sent to ${userEmail}:`, response[0].statusCode);
      return { success: true, messageId: response[0].headers['x-message-id'] };
    } catch (error) {
      console.error('Error sending mood reminder:', error);
      return { success: false, error: error.message };
    }
  },
  
  async sendWeeklyReport(userEmail, userName, moodStats) {
    try {
      const template = emailTemplates.weeklyReport(userName, moodStats);
      
      const msg = {
        to: userEmail,
        from: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME
        },
        subject: template.subject,
        html: template.html
      };
      
      const response = await sgMail.send(msg);
      console.log(`Weekly report sent to ${userEmail}:`, response[0].statusCode);
      return { success: true, messageId: response[0].headers['x-message-id'] };
    } catch (error) {
      console.error('Error sending weekly report:', error);
      return { success: false, error: error.message };
    }
  },
  
  async sendTestEmail(userEmail) {
    try {
      const msg = {
        to: userEmail,
        from: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME
        },
        subject: 'Test Email from Generative Mood Tracker',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>🎵 Email Notifications Working!</h2>
            <p>This is a test email to confirm that email notifications are properly configured.</p>
            <p>Your Generative Mood Tracker app can now send you mood reminders and weekly reports!</p>
          </div>
        `
      };
      
      const response = await sgMail.send(msg);
      console.log(`Test email sent to ${userEmail}:`, response[0].statusCode);
      return { success: true, messageId: response[0].headers['x-message-id'] };
    } catch (error) {
      console.error('Error sending test email:', error);
      return { success: false, error: error.message };
    }
  }
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'email-notification-service'
  });
});

// Music generation routes
app.use('/api/music', musicGenerationRoutes);

app.post('/api/send-mood-reminder', async (req, res) => {
  try {
    const { userEmail, userName, daysSinceLastEntry } = req.body;
    
    if (!userEmail || !userName) {
      return res.status(400).json({ 
        success: false, 
        error: 'userEmail and userName are required' 
      });
    }
    
    const result = await emailService.sendMoodReminder(userEmail, userName, daysSinceLastEntry);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in send-mood-reminder endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

app.post('/api/send-weekly-report', async (req, res) => {
  try {
    const { userEmail, userName, moodStats } = req.body;
    
    if (!userEmail || !userName) {
      return res.status(400).json({ 
        success: false, 
        error: 'userEmail and userName are required' 
      });
    }
    
    const result = await emailService.sendWeeklyReport(userEmail, userName, moodStats);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in send-weekly-report endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

app.post('/api/send-test-email', async (req, res) => {
  try {
    const { userEmail } = req.body;
    
    if (!userEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'userEmail is required' 
      });
    }
    
    const result = await emailService.sendTestEmail(userEmail);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in send-test-email endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Email notification service running on port ${PORT}`);
  console.log(`📧 SendGrid API Key configured: ${process.env.SENDGRID_API_KEY ? 'Yes' : 'No'}`);
  console.log(`📧 From Email: ${process.env.FROM_EMAIL || 'Not configured'}`);
});

module.exports = app; 