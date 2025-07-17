import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AuthService, { RegistrationData, LoginData } from '../services/AuthService';
import LocalStorageManager from '../services/LocalStorageManager';
import NotificationService from '../services/NotificationService';
import TimeWindowService from '../services/TimeWindowService';
import * as SecureStore from 'expo-secure-store';
import { generateUUID } from '../utils/uuid';

// Mock dependencies
vi.mock('../services/LocalStorageManager');
vi.mock('../services/NotificationService');
vi.mock('../services/TimeWindowService');
vi.mock('expo-secure-store');
vi.mock('../utils/uuid');

describe('Authentication Flow Integration', () => {
  const mockUserId = 'test-user-123';
  const mockEmail = 'test@example.com';
  const mockPassword = 'Password123!';
  const mockToken = 'test-auth-token';
  
  // Mock registration data
  const mockRegistrationData: RegistrationData = {
    email: mockEmail,
    password: mockPassword,
    preferredTimeRange: {
      start: '09:00',
      end: '21:00'
    }
  };
  
  // Mock login data
  const mockLoginData: LoginData = {
    email: mockEmail,
    password: mockPassword
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock UUID generation
    vi.mocked(generateUUID).mockReturnValue(mockUserId);
    
    // Mock SecureStore methods
    vi.mocked(SecureStore.getItemAsync).mockImplementation((key) => {
      if (key === 'auth_token') return Promise.resolve(mockToken);
      if (key === 'user_data') return Promise.resolve(JSON.stringify({
        userId: mockUserId,
        email: mockEmail,
        preferredTimeRange: mockRegistrationData.preferredTimeRange,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        settings: {
          notifications: true,
          theme: 'light',
          audioQuality: 'high'
        },
        accountStatus: 'active'
      }));
      if (key === `credentials_${mockEmail}`) return Promise.resolve('salt:hashed-password');
      return Promise.resolve(null);
    });
    
    vi.mocked(SecureStore.setItemAsync).mockResolvedValue();
    vi.mocked(SecureStore.deleteItemAsync).mockResolvedValue();
    
    // Mock LocalStorageManager methods
    vi.mocked(LocalStorageManager.initialize).mockResolvedValue();
    
    // Mock NotificationService methods
    vi.mocked(NotificationService.initialize).mockResolvedValue();
    vi.mocked(NotificationService.requestPermissions).mockResolvedValue(true);
    vi.mocked(NotificationService.scheduleTimeWindowNotification).mockResolvedValue(true);
    
    // Mock TimeWindowService methods
    vi.mocked(TimeWindowService.initialize).mockResolvedValue();
    vi.mocked(TimeWindowService.getOrCreateDailyWindow).mockResolvedValue({
      userId: mockUserId,
      date: new Date().toISOString().split('T')[0],
      windowStart: Date.now(),
      windowEnd: Date.now() + 3600000, // 1 hour later
      hasLogged: false,
      notificationSent: false
    });
  });
  
  describe('Registration and onboarding flow', () => {
    it('should complete the full registration and onboarding process', async () => {
      // Step 1: Register a new user
      const user = await AuthService.register(mockRegistrationData);
      
      // Verify user was created with correct data
      expect(user).toBeDefined();
      expect(user.userId).toBe(mockUserId);
      expect(user.email).toBe(mockEmail);
      expect(user.preferredTimeRange).toEqual(mockRegistrationData.preferredTimeRange);
      
      // Verify credentials were stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        `credentials_${mockEmail}`,
        expect.any(String)
      );
      
      // Verify user data was stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_data',
        expect.any(String)
      );
      
      // Verify auth token was generated and stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth_token',
        expect.any(String)
      );
      
      // Step 2: Initialize services for the new user
      await LocalStorageManager.initialize();
      await NotificationService.initialize();
      await TimeWindowService.initialize();
      
      // Verify services were initialized
      expect(LocalStorageManager.initialize).toHaveBeenCalled();
      expect(NotificationService.initialize).toHaveBeenCalled();
      expect(TimeWindowService.initialize).toHaveBeenCalled();
      
      // Step 3: Request notification permissions
      const permissionsGranted = await NotificationService.requestPermissions();
      expect(permissionsGranted).toBe(true);
      
      // Step 4: Generate first time window
      const timeWindow = await TimeWindowService.getOrCreateDailyWindow(mockUserId);
      
      // Verify time window was created
      expect(timeWindow).toBeDefined();
      expect(timeWindow.userId).toBe(mockUserId);
      expect(timeWindow.hasLogged).toBe(false);
      
      // Step 5: Schedule notification for time window
      const notificationScheduled = await NotificationService.scheduleTimeWindowNotification(mockUserId);
      expect(notificationScheduled).toBe(true);
      
      // Step 6: Verify authentication state
      const authState = await AuthService.getAuthState();
      
      // Verify user is authenticated
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toBeDefined();
      expect(authState.token).toBeDefined();
    });
  });
  
  describe('Login flow', () => {
    it('should complete the full login process', async () => {
      // Mock verifyPassword to succeed
      vi.spyOn(AuthService as any, 'verifyPassword').mockResolvedValueOnce(true);
      
      // Step 1: Log in with credentials
      const user = await AuthService.login(mockLoginData);
      
      // Verify user data was returned
      expect(user).toBeDefined();
      expect(user.userId).toBe(mockUserId);
      expect(user.email).toBe(mockEmail);
      
      // Verify user data was updated (last login time)
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_data',
        expect.any(String)
      );
      
      // Verify auth token was generated and stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth_token',
        expect.any(String)
      );
      
      // Step 2: Initialize services for the logged-in user
      await LocalStorageManager.initialize();
      await NotificationService.initialize();
      await TimeWindowService.initialize();
      
      // Verify services were initialized
      expect(LocalStorageManager.initialize).toHaveBeenCalled();
      expect(NotificationService.initialize).toHaveBeenCalled();
      expect(TimeWindowService.initialize).toHaveBeenCalled();
      
      // Step 3: Get or create daily time window
      const timeWindow = await TimeWindowService.getOrCreateDailyWindow(mockUserId);
      
      // Verify time window was retrieved or created
      expect(timeWindow).toBeDefined();
      expect(timeWindow.userId).toBe(mockUserId);
      
      // Step 4: Verify authentication state
      const authState = await AuthService.getAuthState();
      
      // Verify user is authenticated
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toBeDefined();
      expect(authState.token).toBeDefined();
    });
    
    it('should handle login failures gracefully', async () => {
      // Mock verifyPassword to fail
      vi.spyOn(AuthService as any, 'verifyPassword').mockResolvedValueOnce(false);
      
      // Attempt to log in with incorrect password
      await expect(AuthService.login({
        email: mockEmail,
        password: 'wrong-password'
      })).rejects.toThrow('Invalid password');
      
      // Verify services were not initialized
      expect(LocalStorageManager.initialize).not.toHaveBeenCalled();
      expect(NotificationService.initialize).not.toHaveBeenCalled();
      expect(TimeWindowService.initialize).not.toHaveBeenCalled();
    });
  });
  
  describe('Logout flow', () => {
    it('should successfully log out and clean up', async () => {
      // Step 1: Log out
      await AuthService.logout();
      
      // Verify auth token was removed
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      
      // Step 2: Verify authentication state after logout
      // Mock SecureStore.getItemAsync to return null for auth_token after logout
      vi.mocked(SecureStore.getItemAsync).mockImplementation((key) => {
        if (key === 'auth_token') return Promise.resolve(null);
        return Promise.resolve(null);
      });
      
      const authState = await AuthService.getAuthState();
      
      // Verify user is not authenticated
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.token).toBeNull();
    });
  });
  
  describe('Account deletion flow', () => {
    it('should successfully delete account and clean up all data', async () => {
      // Mock verifyPassword to succeed
      vi.spyOn(AuthService as any, 'verifyPassword').mockResolvedValueOnce(true);
      
      // Step 1: Delete account with password verification
      await AuthService.deleteAccount(mockPassword);
      
      // Verify user credentials were removed
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(`credentials_${mockEmail}`);
      
      // Verify user preferences were removed
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(`user_preferences_${mockUserId}`);
      
      // Verify daily window data was removed
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(`daily_window_${mockUserId}`);
      
      // Verify auth tokens were removed
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token_expiry');
      
      // Verify user data was removed
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
      
      // Step 2: Verify authentication state after account deletion
      // Mock SecureStore.getItemAsync to return null for auth_token after deletion
      vi.mocked(SecureStore.getItemAsync).mockImplementation((key) => {
        return Promise.resolve(null);
      });
      
      const authState = await AuthService.getAuthState();
      
      // Verify user is not authenticated
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.token).toBeNull();
    });
  });
});