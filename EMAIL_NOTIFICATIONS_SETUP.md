# Email Notifications Setup Guide

This guide will help you set up email notifications for the Generative Mood Tracker app using SendGrid.

## Overview

The email notification system consists of:
- **Backend Service**: Node.js/Express server with SendGrid integration
- **Frontend Integration**: React Native components for settings management
- **Email Templates**: Beautiful, mobile-responsive HTML emails

## Prerequisites

1. **SendGrid Account**: Free tier available (100 emails/day)
2. **Domain Email**: A verified email address for sending
3. **Node.js**: Version 14 or higher

## Step 1: SendGrid Setup

### 1.1 Create SendGrid Account
1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up for a free account
3. Verify your email address

### 1.2 Get API Key
1. In SendGrid dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Choose **Full Access** or **Restricted Access** with **Mail Send** permissions
4. Copy the API key (you won't see it again!)

### 1.3 Verify Sender Email
1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in your details and verify your email
4. Use this email as your `FROM_EMAIL` in the configuration

## Step 2: Backend Setup

### 2.1 Install Dependencies
```bash
cd backend
npm install
```

### 2.2 Configure Environment
```bash
cp env.example .env
```

Edit `.env` with your SendGrid credentials:
```env
SENDGRID_API_KEY=your_actual_api_key_here
FROM_EMAIL=your-verified-email@yourdomain.com
FROM_NAME=Generative Mood Tracker
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
```

### 2.3 Start the Server
```bash
npm run dev
```

You should see:
```
🚀 Email notification service running on port 3001
📧 SendGrid API Key configured: Yes
📧 From Email: your-email@yourdomain.com
```

## Step 3: Test the Setup

### 3.1 Test Health Endpoint
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "email-notification-service"
}
```

### 3.2 Test Email Sending
```bash
curl -X POST http://localhost:3001/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"userEmail": "your-test-email@example.com"}'
```

Expected response:
```json
{
  "success": true,
  "messageId": "abc123..."
}
```

Check your email inbox for the test message!

## Step 4: Frontend Integration

The email notification settings are already integrated into the Settings screen. Users can:

1. **Enable/Disable**: Toggle email notifications on/off
2. **Configure Email**: Enter their email address and name
3. **Set Frequency**: Choose daily, weekly, or never for reminders
4. **Set Time**: Choose when to receive reminders
5. **Weekly Reports**: Enable/disable weekly mood reports
6. **Test Emails**: Send test emails to verify setup

## Step 5: Email Templates

The system includes two beautiful email templates:

### Mood Reminder Template
- Personalized greeting
- Dynamic content based on days since last entry
- Tips for better mood logging
- Call-to-action button

### Weekly Report Template
- Weekly mood statistics
- Music generation count
- Most active day
- Average mood rating
- Encouraging message

## Step 6: Deployment

### Option 1: Heroku (Recommended)
1. Create Heroku account
2. Install Heroku CLI
3. Create app:
```bash
heroku create your-mood-tracker-email-service
```

4. Set environment variables:
```bash
heroku config:set SENDGRID_API_KEY=your_api_key
heroku config:set FROM_EMAIL=your-email@domain.com
heroku config:set FROM_NAME="Generative Mood Tracker"
```

5. Deploy:
```bash
git add .
git commit -m "Add email notification service"
git push heroku main
```

### Option 2: Railway
1. Connect GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically

### Option 3: Vercel
1. Install Vercel CLI
2. Deploy:
```bash
vercel
```

## Step 7: Update Frontend Configuration

After deploying, update the backend URL in your frontend:

```typescript
// src/services/EmailNotificationService.ts
constructor() {
  this.baseUrl = __DEV__ 
    ? 'http://localhost:3001/api'
    : 'https://your-deployed-backend-url.com/api';
}
```

## Troubleshooting

### Common Issues

1. **"SendGrid API Key Invalid"**
   - Verify API key in SendGrid dashboard
   - Check key permissions (needs "Mail Send")

2. **"CORS Error"**
   - Update `ALLOWED_ORIGINS` in backend `.env`
   - Include your frontend URL

3. **"Email Not Sending"**
   - Check SendGrid activity logs
   - Verify sender email is authenticated
   - Check recipient email is valid

4. **"Rate Limited"**
   - SendGrid free tier: 100 emails/day
   - Implement exponential backoff in frontend

### Debug Steps

1. **Check Backend Logs**
```bash
cd backend
npm run dev
# Watch console for error messages
```

2. **Test API Endpoints**
```bash
# Health check
curl http://localhost:3001/api/health

# Test email
curl -X POST http://localhost:3001/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"userEmail": "test@example.com"}'
```

3. **Check SendGrid Dashboard**
   - Activity → Mail
   - Look for failed deliveries
   - Check API key usage

## Security Considerations

1. **API Key Protection**
   - Never commit API keys to Git
   - Use environment variables
   - Rotate keys regularly

2. **Rate Limiting**
   - Backend includes rate limiting
   - Frontend should implement retry logic

3. **Input Validation**
   - Backend validates all inputs
   - Sanitizes email addresses

## Cost Considerations

- **SendGrid Free Tier**: 100 emails/day
- **Paid Plans**: Start at $14.95/month for 50k emails
- **Estimated Usage**: 
  - Daily reminders: 1 email/day per user
  - Weekly reports: 1 email/week per user
  - Test emails: As needed

## Next Steps

1. **Scheduling**: Implement cron jobs for automatic reminders
2. **Analytics**: Track email open rates and engagement
3. **Templates**: Customize email templates for your brand
4. **A/B Testing**: Test different email content and timing

## Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review SendGrid documentation
3. Check backend logs for error messages
4. Test with curl commands above

---

🎉 **Congratulations!** Your email notification system is now set up and ready to help users stay engaged with their mood tracking journey. 