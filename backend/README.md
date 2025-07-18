# Email Notification Service

This is the backend service for the Generative Mood Tracker app that handles email notifications using SendGrid.

## Features

- 📧 Send mood reminder emails
- 📊 Send weekly mood reports
- 🧪 Send test emails
- 🔒 Rate limiting and security
- 🎨 Beautiful HTML email templates
- 📱 Mobile-responsive design

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Generative Mood Tracker

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. SendGrid Setup

1. Create a SendGrid account at [sendgrid.com](https://sendgrid.com)
2. Get your API key from the SendGrid dashboard
3. Verify your sender email address in SendGrid
4. Add your API key to the `.env` file

### 4. Start the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on port 3001 (or the port specified in your `.env` file).

## API Endpoints

### Health Check
```
GET /api/health
```

### Send Mood Reminder
```
POST /api/send-mood-reminder
Content-Type: application/json

{
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "daysSinceLastEntry": 1
}
```

### Send Weekly Report
```
POST /api/send-weekly-report
Content-Type: application/json

{
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "moodStats": {
    "totalEntries": 7,
    "musicGenerated": 5,
    "mostActiveDay": "Wednesday",
    "averageMood": 7.2
  }
}
```

### Send Test Email
```
POST /api/send-test-email
Content-Type: application/json

{
  "userEmail": "user@example.com"
}
```

## Email Templates

The service includes beautiful, mobile-responsive email templates:

### Mood Reminder Template
- Personalized greeting with user's name
- Dynamic content based on days since last entry
- Tips for better mood logging
- Call-to-action button to open the app

### Weekly Report Template
- Weekly mood statistics
- Music generation count
- Most active day
- Average mood rating
- Encouraging message

## Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing protection
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Sanitizes user input
- **Error Handling**: Graceful error responses

## Development

### Running in Development
```bash
npm run dev
```

This uses nodemon for automatic restarts when files change.

### Testing the API

You can test the endpoints using curl or Postman:

```bash
# Health check
curl http://localhost:3001/api/health

# Send test email
curl -X POST http://localhost:3001/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"userEmail": "your-email@example.com"}'
```

## Deployment

### Heroku
1. Create a Heroku app
2. Set environment variables in Heroku dashboard
3. Deploy using Git:
```bash
git push heroku main
```

### Vercel
1. Install Vercel CLI
2. Deploy:
```bash
vercel
```

### Railway
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SENDGRID_API_KEY` | SendGrid API key | Yes | - |
| `FROM_EMAIL` | Sender email address | Yes | - |
| `FROM_NAME` | Sender name | Yes | - |
| `PORT` | Server port | No | 3001 |
| `NODE_ENV` | Environment | No | development |
| `ALLOWED_ORIGINS` | CORS allowed origins | No | localhost URLs |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | No | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No | 100 |

## Troubleshooting

### Common Issues

1. **SendGrid API Key Invalid**
   - Verify your API key in SendGrid dashboard
   - Check that the key has the necessary permissions

2. **CORS Errors**
   - Update `ALLOWED_ORIGINS` in your `.env` file
   - Include your frontend URL

3. **Rate Limiting**
   - Check the rate limit settings
   - Implement exponential backoff in your frontend

4. **Email Not Sending**
   - Verify sender email is verified in SendGrid
   - Check SendGrid activity logs
   - Ensure recipient email is valid

### Logs

The server logs all email sending attempts. Check the console output for:
- Successful email sends
- Error messages
- Rate limiting events

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 