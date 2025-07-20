#!/usr/bin/env node

/**
 * ElevenLabs API Key Test Script
 * 
 * This script tests your ElevenLabs API key to ensure it's working correctly.
 * Run this script locally with your API key to debug issues.
 */

require('dotenv').config();
const axios = require('axios');

async function testElevenLabsAPI() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  console.log('🔑 Testing ElevenLabs API Key...\n');
  
  // Basic validation
  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
    console.log('💡 Make sure to set ELEVENLABS_API_KEY in your .env file');
    return;
  }
  
  if (!apiKey.startsWith('sk_')) {
    console.error('❌ Invalid API key format - ElevenLabs keys should start with "sk_"');
    console.log('💡 Check that you copied the API key correctly from ElevenLabs dashboard');
    return;
  }
  
  console.log('✅ API Key format looks correct');
  console.log(`📏 API Key length: ${apiKey.length} characters`);
  console.log(`🔍 API Key preview: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);
  
  // Test 1: Check user info (basic API access)
  console.log('🧪 Test 1: Checking user info...');
  try {
    const userResponse = await axios.get('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    console.log('✅ User info retrieved successfully');
    console.log(`👤 User: ${userResponse.data.subscription?.tier || 'Free'} tier`);
    console.log(`💰 Characters remaining: ${userResponse.data.subscription?.character_count || 'N/A'}`);
    console.log(`📊 Character limit: ${userResponse.data.subscription?.character_limit || 'N/A'}\n`);
  } catch (error) {
    console.error('❌ Failed to get user info:', error.response?.status, error.response?.statusText);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
    return;
  }
  
  // Test 2: Test sound effects generation
  console.log('🧪 Test 2: Testing sound effects generation...');
  try {
    const soundResponse = await axios.post('https://api.elevenlabs.io/v1/sound-effects', {
      text: 'gentle rain on leaves',
      duration_seconds: 3,
      prompt_influence: 0.3
    }, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });
    
    console.log('✅ Sound effects generation successful!');
    console.log(`📊 Response size: ${soundResponse.data.byteLength} bytes`);
    console.log('🎵 Your API key is working correctly for music generation\n');
    
  } catch (error) {
    console.error('❌ Sound effects generation failed:', error.response?.status, error.response?.statusText);
    
    if (error.response?.data) {
      // Try to parse buffer response
      try {
        const errorString = Buffer.from(error.response.data).toString();
        const errorObj = JSON.parse(errorString);
        console.error('Error details:', errorObj);
        
        if (errorObj.detail?.status === 'detected_unusual_activity') {
          console.log('\n💡 Troubleshooting "unusual activity" error:');
          console.log('   1. Your account might be new and need verification');
          console.log('   2. Try logging into ElevenLabs dashboard and verify your account');
          console.log('   3. Make sure you have available character quota');
          console.log('   4. Wait a few minutes and try again');
          console.log('   5. Contact ElevenLabs support if the issue persists');
        }
      } catch (parseError) {
        console.error('Could not parse error response');
      }
    }
    return;
  }
  
  console.log('🎉 All tests passed! Your ElevenLabs API key is working correctly.');
}

// Run the test
testElevenLabsAPI().catch(console.error);