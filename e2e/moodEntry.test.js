describe('Mood Entry Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true }); // Start with a fresh app install
    
    // Complete onboarding first
    await completeOnboarding();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show the mood entry screen when time window is active', async () => {
    // For testing purposes, we'll use a special test mode that forces the time window to be active
    await element(by.id('settings-tab')).tap();
    await element(by.text('Developer Options')).tap();
    await element(by.text('Force Time Window Active')).tap();
    await element(by.text('Confirm')).tap();
    
    // Go back to home screen
    await element(by.id('home-tab')).tap();
    
    // Should see the mood entry button
    await expect(element(by.text('Log Your Mood'))).toBeVisible();
    await element(by.text('Log Your Mood')).tap();
    
    // Should now be on the mood entry screen
    await expect(element(by.id('mood-entry-screen'))).toBeVisible();
  });

  it('should complete the mood entry process', async () => {
    // Navigate to mood entry screen
    await element(by.id('home-tab')).tap();
    await element(by.text('Log Your Mood')).tap();
    
    // Select mood rating (7 out of 10)
    await element(by.id('mood-rating-7')).tap();
    
    // Select emotion tags
    await element(by.id('emotion-tag-happy')).tap();
    await element(by.id('emotion-tag-relaxed')).tap();
    
    // Enter reflection text
    await element(by.id('reflection-input')).typeText('I had a great day today. I went for a walk in the park and enjoyed the sunshine.');
    
    // Submit mood entry
    await element(by.text('Submit')).tap();
    
    // Should see the processing screen
    await expect(element(by.text('Processing Your Mood'))).toBeVisible();
    
    // Wait for music generation (may take some time)
    await waitFor(element(by.text('Your Music is Ready'))).toBeVisible().withTimeout(30000);
    
    // Play the generated music
    await element(by.id('play-button')).tap();
    
    // Verify music player controls are visible
    await expect(element(by.id('music-player'))).toBeVisible();
    await expect(element(by.id('pause-button'))).toBeVisible();
    
    // Go back to home screen
    await element(by.text('Done')).tap();
    
    // Should be back on home screen with updated status
    await expect(element(by.text('Mood Logged Today'))).toBeVisible();
  });

  it('should prevent multiple mood entries on the same day', async () => {
    // Navigate to home screen
    await element(by.id('home-tab')).tap();
    
    // Should see that mood has been logged
    await expect(element(by.text('Mood Logged Today'))).toBeVisible();
    
    // Should not see the Log Your Mood button
    await expect(element(by.text('Log Your Mood'))).not.toBeVisible();
    
    // Should see when the next entry will be available
    await expect(element(by.text('Next entry available tomorrow'))).toBeVisible();
  });

  it('should show mood history in the history screen', async () => {
    // Navigate to history screen
    await element(by.id('history-tab')).tap();
    
    // Should see the mood entry we just created
    await expect(element(by.id('mood-entry-list'))).toBeVisible();
    await expect(element(by.id('mood-entry-item'))).toBeVisible();
    
    // Tap on the entry to view details
    await element(by.id('mood-entry-item')).atIndex(0).tap();
    
    // Should see the mood entry details
    await expect(element(by.id('mood-entry-detail-screen'))).toBeVisible();
    await expect(element(by.text('Mood Rating: 7/10'))).toBeVisible();
    await expect(element(by.text('happy, relaxed'))).toBeVisible();
    await expect(element(by.text('I had a great day today. I went for a walk in the park and enjoyed the sunshine.'))).toBeVisible();
    
    // Should see the music player
    await expect(element(by.id('music-player'))).toBeVisible();
  });
});

// Helper function to complete onboarding
async function completeOnboarding() {
  // First screen
  await expect(element(by.text('Welcome to Generative Mood Tracker'))).toBeVisible();
  await element(by.text('Get Started')).tap();
  
  // Time range selection screen
  await expect(element(by.text('Select Your Preferred Time Range'))).toBeVisible();
  
  // Select time range (9am - 9pm)
  await element(by.id('start-time-picker')).tap();
  // Set time to 9:00 AM (implementation depends on platform)
  if (device.getPlatform() === 'ios') {
    await element(by.text('9')).atIndex(0).tap();
    await element(by.text('00')).tap();
    await element(by.text('AM')).tap();
    await element(by.text('Confirm')).tap();
  } else {
    // Android time picker interaction
  }
  
  await element(by.id('end-time-picker')).tap();
  // Set time to 9:00 PM
  if (device.getPlatform() === 'ios') {
    await element(by.text('9')).atIndex(0).tap();
    await element(by.text('00')).tap();
    await element(by.text('PM')).tap();
    await element(by.text('Confirm')).tap();
  } else {
    // Android time picker interaction
  }
  
  await element(by.text('Continue')).tap();
  
  // Registration screen
  await expect(element(by.text('Create Your Account'))).toBeVisible();
  
  // Fill in registration details
  await element(by.id('email-input')).typeText('test@example.com');
  await element(by.id('password-input')).typeText('Password123!');
  await element(by.id('confirm-password-input')).typeText('Password123!');
  
  // Submit registration
  await element(by.text('Register')).tap();
  
  // Notification permission screen
  await expect(element(by.text('Enable Notifications'))).toBeVisible();
  await element(by.text('Allow Notifications')).tap();
  
  // Final onboarding screen
  await expect(element(by.text('You\'re All Set!'))).toBeVisible();
  await element(by.text('Start Tracking')).tap();
  
  // Should now be on the home screen
  await expect(element(by.id('home-screen'))).toBeVisible();
}