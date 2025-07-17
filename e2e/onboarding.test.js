describe('Onboarding Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true }); // Start with a fresh app install
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show the onboarding screen on first launch', async () => {
    await expect(element(by.text('Welcome to Generative Mood Tracker'))).toBeVisible();
    await expect(element(by.text('Get Started'))).toBeVisible();
  });

  it('should navigate through the onboarding process', async () => {
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
      // This would need to be implemented based on the specific Android time picker used
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
  });
});