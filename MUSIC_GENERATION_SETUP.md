# Music Generation Setup Guide

This guide will help you set up AI-powered music generation in your Generative Mood Tracker app using Hugging Face's MusicGen API.

## 🎵 What's New

Your app now uses **real AI music generation** instead of placeholder files! The app will:
- Convert your mood entries into text prompts
- Send them to Hugging Face's MusicGen AI model
- Generate unique music based on your mood, emotions, and reflections
- Save the generated music locally for playback

## 📋 Prerequisites

1. **Hugging Face Account**: You need a free account at [Hugging Face](https://huggingface.co/join)
2. **API Token**: Get your free API token from [Hugging Face Settings](https://huggingface.co/settings/tokens)

## 🔧 Setup Instructions

### Step 1: Get Your Hugging Face API Token

1. Go to [https://huggingface.co/join](https://huggingface.co/join) and create a free account
2. After signing up, go to [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
3. Click "New token"
4. Give it a name like "Mood Tracker Music Generation"
5. Select "Read" permissions
6. Copy the generated token (it looks like `hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Step 2: Configure Your App

1. Open `src/config/api.ts` in your project
2. Find this line:
   ```typescript
   API_TOKEN: 'YOUR_HUGGINGFACE_TOKEN_HERE',
   ```
3. Replace `'YOUR_HUGGINGFACE_TOKEN_HERE'` with your actual token:
   ```typescript
   API_TOKEN: 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
   ```

### Step 3: Test the Integration

1. Start your app: `npx expo start`
2. Create a mood entry with some emotions and reflection text
3. Check the console logs for music generation progress
4. The generated music should appear in your app's music player

## 🎼 How It Works

### Text Prompt Generation
The app converts your mood data into AI-friendly text prompts:

- **Mood Rating (1-10)**: Influences the base mood (melancholic → joyful)
- **Emotion Tags**: Add specific emotional qualities (happy, calm, anxious, etc.)
- **Reflection Text**: Extracts keywords to personalize the music
- **Genre Selection**: Automatically suggests appropriate musical styles

### Example Prompts
- Low mood (2/10) + "sad" + "feeling lonely today" → `"melancholic, sad, slow, somber, reflective, lonely, feeling, today, ambient, classical, piano music"`
- High mood (9/10) + "excited" + "great day at work" → `"joyful, exuberant, celebratory, bright, cheerful, great, work, pop, electronic, upbeat music"`

## 🔍 Debugging

### Enable Debug Logging
Debug mode is automatically enabled in development. You'll see logs like:
```
Starting music generation with Hugging Face MusicGen API...
Generated prompt: melancholic, sad, slow, ambient, classical, piano music
Received audio data, size: 123456 bytes
Audio file saved to: /path/to/music/abc123.wav
Music generation completed successfully
```

### Common Issues

1. **"API token not configured"**
   - Make sure you've set your token in `src/config/api.ts`
   - Verify the token is correct and has read permissions

2. **"API request failed: 401"**
   - Your token is invalid or expired
   - Generate a new token at Hugging Face

3. **"API request failed: 429"**
   - You've hit the rate limit (free tier has limits)
   - Wait a few minutes and try again

4. **No audio file generated**
   - Check the console for error messages
   - Verify your internet connection
   - The fallback system will create a silent audio file if generation fails

## 💰 Cost Information

- **Hugging Face Free Tier**: 
  - 30,000 requests per month
  - Perfect for personal use and testing
  - No credit card required

- **Paid Plans**: 
  - Start at $9/month for higher limits
  - Only needed if you exceed free tier

## 🎯 Next Steps

1. **Test with different moods**: Try creating entries with various mood ratings and emotions
2. **Customize prompts**: Modify the `createMusicPrompt` method in `MusicGenerationService.ts` to change how prompts are generated
3. **Try different models**: You can switch to `musicgen-medium` or `musicgen-melody` for different quality/speed trade-offs
4. **Add more features**: Consider adding music sharing, playlists, or mood-based music recommendations

## 🆘 Need Help?

- Check the console logs for detailed error messages
- Verify your API token is correct
- Test with a simple mood entry first
- The fallback system ensures your app won't crash if generation fails

---

**Happy music generating! 🎵** 