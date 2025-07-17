# Music Generation Troubleshooting Guide

If you're not seeing generated music after logging your mood, follow this step-by-step troubleshooting guide.

## 🔍 **Step 1: Check Console Logs**

First, open your browser's developer console (F12) or check your terminal where you're running `npx expo start`. Look for these specific log messages:

### ✅ **What to Look For:**

1. **When you save a mood entry:**
   ```
   Triggering music generation for mood entry: [entry-id]
   Starting music generation with Hugging Face MusicGen API...
   Generated prompt: [your-prompt]
   ```

2. **During API call:**
   ```
   Received audio data, size: [number] bytes
   Audio file saved to: [file-path]
   Music generation completed successfully
   ```

3. **When mood entry is updated:**
   ```
   Mood entry updated with music ID: [music-id]
   ```

### ❌ **What Indicates Problems:**

- `"API token not configured"` → You need to set your Hugging Face token
- `"API request failed: 401"` → Invalid or expired token
- `"API request failed: 429"` → Rate limit exceeded
- `"Music generation failed or was queued"` → Generation failed

## 🛠️ **Step 2: Add Debug Panel (Optional)**

To help with debugging, you can temporarily add the debug panel to your app. Add this to any screen (like `HomeScreen.tsx`):

```tsx
import MusicDebugPanel from '../components/MusicDebugPanel';

// Add this inside your component's return statement:
<MusicDebugPanel userId="demo-user" />
```

This will give you buttons to:
- Test music generation manually
- Check service status
- See detailed logs

## 🔧 **Step 3: Common Issues & Solutions**

### **Issue 1: "API token not configured"**
**Solution:**
1. Go to [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a new token with "Read" permissions
3. Copy the token (starts with `hf_`)
4. Replace `'YOUR_HUGGINGFACE_TOKEN_HERE'` in `src/config/api.ts`

### **Issue 2: "API request failed: 401"**
**Solution:**
- Your token is invalid or expired
- Generate a new token at Hugging Face
- Make sure you copied the entire token correctly

### **Issue 3: "API request failed: 429"**
**Solution:**
- You've hit the rate limit (free tier has limits)
- Wait 5-10 minutes and try again
- Consider upgrading to a paid plan if you need more requests

### **Issue 4: No logs appear at all**
**Solution:**
- Check if the `MoodEntryService` is properly importing `MusicGenerationService`
- Verify that `triggerMusicGeneration` is being called
- Make sure your app is running in development mode for debug logs

### **Issue 5: Music generates but doesn't appear in the UI**
**Solution:**
- Check if the mood entry is being updated with `musicGenerated: true`
- Verify the `MusicPlayer` component is receiving the correct `musicId`
- Check if the audio file exists at the saved path

## 🧪 **Step 4: Manual Testing**

If automatic generation isn't working, test manually:

1. **Add the debug panel** to your app
2. **Click "Test Music Generation"**
3. **Check the console** for detailed logs
4. **Click "Check Service Status"** to see current state

## 📱 **Step 5: Check Your App Flow**

Make sure your app follows this flow:

1. **User creates mood entry** → `MoodEntryService.saveMoodEntry()`
2. **Music generation triggered** → `triggerMusicGeneration()`
3. **API call made** → `generateMusicFromAPI()`
4. **Music saved** → `LocalStorageManager.storeGeneratedMusic()`
5. **Mood entry updated** → `musicGenerated: true, musicId: [id]`
6. **UI shows music player** → `MusicPlayer` component

## 🔄 **Step 6: Refresh and Retry**

If nothing seems to work:

1. **Stop your app** (`Ctrl+C` in terminal)
2. **Clear browser cache** (if using web)
3. **Restart the app** (`npx expo start`)
4. **Try creating a new mood entry**

## 📊 **Step 7: Check Data Storage**

You can manually check if data is being saved:

```javascript
// In browser console, check if mood entries exist:
// (This works if you're using web version)
localStorage.getItem('mood_entries_demo-user')
```

## 🆘 **Still Having Issues?**

If you're still not seeing generated music:

1. **Share your console logs** - Copy and paste any error messages
2. **Check your API token** - Make sure it's valid and has the right permissions
3. **Try the debug panel** - Use the manual test to isolate the issue
4. **Check your internet connection** - The API requires internet access

## 🎯 **Expected Behavior**

When everything works correctly, you should see:

1. **Console logs** showing the generation process
2. **Music player appears** in your mood entry details
3. **"♪ Play Music" button** in your mood entry list
4. **Audio file saved** locally on your device

---

**Need more help?** Share your console logs and I can help you debug further! 🎵 