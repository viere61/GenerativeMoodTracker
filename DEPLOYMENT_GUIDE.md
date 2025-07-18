# Deployment Guide - Email Notification Backend

## 🚀 **Railway Deployment (Recommended)**

### **Step 1: Create Railway Account**
1. Go to [railway.app](https://railway.app)
2. Sign up with your GitHub account
3. Click "New Project"

### **Step 2: Connect Repository**
1. Choose "Deploy from GitHub repo"
2. Select your `GenerativeMoodTracker` repository
3. Railway will auto-detect it's a Node.js project

### **Step 3: Configure Deployment**
1. **Root Directory**: Leave as `/` (root)
2. **Build Command**: `cd backend && npm install`
3. **Start Command**: `cd backend && npm start`
4. Click "Deploy"

### **Step 4: Set Environment Variables**
Go to **Variables** tab and add:

```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=your_verified_email@example.com
FROM_NAME=Generative Mood Tracker
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-url.com,http://localhost:3000,http://localhost:19006
```

### **Step 5: Get Your URL**
Railway will provide a URL like: `https://your-app-name.railway.app`

---

## 📱 **Update Frontend Configuration**

Once you have your Railway URL, update the frontend:

### **Step 1: Update EmailNotificationService.ts**

Replace line 31 in `src/services/EmailNotificationService.ts`:

```typescript
// OLD:
this.baseUrl = __DEV__ 
  ? 'http://localhost:3001/api'
  : 'https://your-backend-domain.com/api';

// NEW (replace with your Railway URL):
this.baseUrl = __DEV__ 
  ? 'http://localhost:3001/api'
  : 'https://your-app-name.railway.app/api';
```

### **Step 2: Test the Integration**

1. **Start your app**: `npx expo start`
2. **Go to Settings** → **Email Notifications**
3. **Check Service Status** - should show "Connected"
4. **Send Test Email** - should work with your Railway backend

---

## 🔧 **Alternative Deployment Options**

### **Option 2: Heroku**
```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login and create app
heroku login
heroku create your-mood-tracker-email-service

# Set environment variables
heroku config:set SENDGRID_API_KEY=your_sendgrid_api_key_here
heroku config:set FROM_EMAIL=your_verified_email@example.com
heroku config:set FROM_NAME="Generative Mood Tracker"

# Deploy
git push heroku main
```

### **Option 3: Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd backend
vercel

# Set environment variables in Vercel dashboard
```

---

## 🧪 **Testing After Deployment**

### **1. Test Health Endpoint**
```bash
curl https://your-railway-url.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "email-notification-service"
}
```

### **2. Test Email Sending**
```bash
curl -X POST https://your-railway-url.railway.app/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"userEmail": "your_email@example.com"}'
```

### **3. Test Frontend Integration**
1. Open your app
2. Go to Settings → Email Notifications
3. Check service status
4. Send test email
5. Verify email received

---

## 🔒 **Security Considerations**

### **Environment Variables**
- ✅ Never commit API keys to Git
- ✅ Use Railway's environment variable system
- ✅ Rotate API keys regularly

### **CORS Configuration**
- ✅ Update `ALLOWED_ORIGINS` with your frontend URLs
- ✅ Include localhost for development
- ✅ Add production URLs when deployed

### **Rate Limiting**
- ✅ Railway includes basic rate limiting
- ✅ Monitor usage in Railway dashboard
- ✅ Consider upgrading if needed

---

## 📊 **Monitoring & Maintenance**

### **Railway Dashboard**
- **Logs**: Monitor application logs
- **Metrics**: Track performance and usage
- **Deployments**: Automatic deployments on Git push

### **SendGrid Dashboard**
- **Activity**: Monitor email delivery
- **Bounces**: Check for failed deliveries
- **Usage**: Track email count (100/day free)

---

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Service Not Available"**
   - Check Railway deployment status
   - Verify environment variables
   - Check application logs

2. **"CORS Error"**
   - Update `ALLOWED_ORIGINS` in Railway
   - Include your frontend URL

3. **"Email Not Sending"**
   - Verify SendGrid API key
   - Check sender email verification
   - Monitor SendGrid activity logs

4. **"Build Failed"**
   - Check `package.json` dependencies
   - Verify Node.js version compatibility
   - Check build logs in Railway

### **Debug Steps**
1. Check Railway deployment logs
2. Test API endpoints with curl
3. Verify environment variables
4. Check SendGrid dashboard
5. Test frontend integration

---

## 🎯 **Next Steps After Deployment**

1. **✅ Deploy backend to Railway**
2. **✅ Update frontend configuration**
3. **✅ Test email functionality**
4. **🔄 Move to AI Music Generation**
5. **🔄 Deploy full app to App Store**

---

🎉 **Congratulations!** Your email notification system is now production-ready and will help users stay engaged with their mood tracking journey. 