#!/bin/bash

# Script to update frontend configuration with deployed backend URL
# Usage: ./update-frontend-config.sh https://your-app-name.railway.app

if [ $# -eq 0 ]; then
    echo "Usage: $0 <railway-url>"
    echo "Example: $0 https://my-app.railway.app"
    exit 1
fi

RAILWAY_URL=$1

# Remove trailing slash if present
RAILWAY_URL=${RAILWAY_URL%/}

echo "🚀 Updating frontend configuration with Railway URL: $RAILWAY_URL"

# Update EmailNotificationService.ts
echo "📝 Updating EmailNotificationService.ts..."

# Create backup
cp src/services/EmailNotificationService.ts src/services/EmailNotificationService.ts.backup

# Update the URL
sed -i '' "s|'https://your-backend-domain.com/api'|'$RAILWAY_URL/api'|g" src/services/EmailNotificationService.ts

echo "✅ EmailNotificationService.ts updated successfully"
echo "📁 Backup created at: src/services/EmailNotificationService.ts.backup"

# Test the health endpoint
echo "🧪 Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s "$RAILWAY_URL/api/health")

if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo "✅ Backend is healthy!"
    echo "📊 Health response: $HEALTH_RESPONSE"
else
    echo "❌ Backend health check failed"
    echo "🔍 Response: $HEALTH_RESPONSE"
fi

echo ""
echo "🎉 Frontend configuration updated!"
echo ""
echo "📱 Next steps:"
echo "1. Start your app: npx expo start"
echo "2. Go to Settings → Email Notifications"
echo "3. Check service status"
echo "4. Send test email"
echo ""
echo "🔧 If you need to revert:"
echo "cp src/services/EmailNotificationService.ts.backup src/services/EmailNotificationService.ts" 