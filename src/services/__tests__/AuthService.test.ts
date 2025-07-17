import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AuthService, { RegistrationData, LoginData } from '../AuthService';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { generateUUID } from '../../utils/uuid';

// Mock dependencies
vi.mock('expo-secure-store');
vi.mock('expo-crypto');
vi.mock('../../utils/uuid');

describe('AuthService', () => {
  // Mock data
  const mockUserId = 'test-user-123';
  const mockEmail = 'test@example.com';
  const mockPassword = 'Password123!';
  const mockHashedPassword = 'salt:hashed-password';
  const mockToken = 'test-auth-token';
  const mockRegistrationData: RegistrationData = {
    email: mockEmail,
    password: mockPassword,
    preferredTimeRange: {
      start: '09:00',
      end: '21:00'
    }
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
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
      if (key === `credentials_${mockEmail}`) return Promise.resolve(mockHashedPassword);
      return Promise.resolve(null);
    });
    
    vi.mocked(SecureStore.setItemAsync).mockResolvedValue();
    vi.mocked(SecureStore.deleteItemAsync).mockResolvedValue();
    
    // Mock Crypto methods
    vi.mocked(Crypto.digestStringAsync).mockResolvedValue('hashed-password');
    
    // Mock UUID generation
    vi.mocked(generateUUID).mockReturnValue(mockUserId);
  });
  
  describe('register', () => {
    it('should register a new user successfully', async () => {
      const result = await AuthService.register(mockRegistrationData);
      
      // Verify user was created with correct data
      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.email).toBe(mockEmail);
      expect(result.preferredTimeRange).toEqual(mockRegistrationData.preferredTimeRange);
      
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
    });
    
    it('should throw an error if registration fails', async () => {
      // Mock SecureStore.setItemAsync to throw an error
      vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(AuthService.register(mockRegistrationData)).rejects.toThrow('Failed to register user');
    });
  });
  
  describe('login', () => {
    it('should log in a user successfully', async () => {
      // Mock password verification
      vi.spyOn(AuthService as any, 'verifyPassword').mockResolvedValueOnce(true);
      
      const loginData: LoginData = {
        email: mockEmail,
        password: mockPassword
      };
      
      const result = await AuthService.login(loginData);
      
      // Verify user data was returned
      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.email).toBe(mockEmail);
      
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
    });
    
    it('should throw an error if user is not found', async () => {
      // Mock getUserCredentials to return null
      vi.spyOn(AuthService as any, 'getUserCredentials').mockResolvedValueOnce(null);
      
      const loginData: LoginData = {
        email: 'nonexistent@example.com',
        password: mockPassword
      };
      
      await expect(AuthService.login(loginData)).rejects.toThrow('User not found');
    });
    
    it('should throw an error if password is invalid', async () => {
      // Mock password verification to fail
      vi.spyOn(AuthService as any, 'verifyPassword').mockResolvedValueOnce(false);
      
      const loginData: LoginData = {
        email: mockEmail,
        password: 'wrong-password'
      };
      
      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid password');
    });
    
    it('should throw an error if account is locked', async () => {
      // Mock getUserData to return locked account
      vi.spyOn(AuthService as any, 'getUserData').mockResolvedValueOnce({
        userId: mockUserId,
        email: mockEmail,
        accountStatus: 'locked'
      });
      
      const loginData: LoginData = {
        email: mockEmail,
        password: mockPassword
      };
      
      await expect(AuthService.login(loginData)).rejects.toThrow('Account is locked');
    });
  });
  
  describe('logout', () => {
    it('should log out a user successfully', async () => {
      await AuthService.logout();
      
      // Verify auth token was removed
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
    });
    
    it('should throw an error if logout fails', async () => {
      // Mock SecureStore.deleteItemAsync to throw an error
      vi.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(AuthService.logout()).rejects.toThrow('Failed to log out');
    });
  });
  
  describe('getAuthState', () => {
    it('should return authenticated state when token exists', async () => {
      const result = await AuthService.getAuthState();
      
      expect(result.isAuthenticated).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe(mockToken);
    });
    
    it('should return unauthenticated state when token does not exist', async () => {
      // Mock SecureStore.getItemAsync to return null for auth_token
      vi.mocked(SecureStore.getItemAsync).mockImplementation((key) => {
        if (key === 'auth_token') return Promise.resolve(null);
        return Promise.resolve(null);
      });
      
      const result = await AuthService.getAuthState();
      
      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeNull();
      expect(result.token).toBeNull();
    });
    
    it('should return unauthenticated state when user data does not exist', async () => {
      // Mock SecureStore.getItemAsync to return null for user_data
      vi.mocked(SecureStore.getItemAsync).mockImplementation((key) => {
        if (key === 'auth_token') return Promise.resolve(mockToken);
        if (key === 'user_data') return Promise.resolve(null);
        return Promise.resolve(null);
      });
      
      const result = await AuthService.getAuthState();
      
      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeNull();
      expect(result.token).toBeNull();
    });
  });
  
  describe('updateUser', () => {
    it('should update user data successfully', async () => {
      const updates = {
        settings: {
          notifications: false,
          theme: 'dark'
        }
      };
      
      const result = await AuthService.updateUser(updates);
      
      // Verify user data was updated
      expect(result).toBeDefined();
      expect(result.settings.notifications).toBe(false);
      expect(result.settings.theme).toBe('dark');
      
      // Verify user data was stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_data',
        expect.any(String)
      );
    });
    
    it('should throw an error if user is not found', async () => {
      // Mock getUserData to return null
      vi.spyOn(AuthService as any, 'getUserData').mockResolvedValueOnce(null);
      
      await expect(AuthService.updateUser({})).rejects.toThrow('User not found');
    });
  });
  
  describe('deleteAccount', () => {
    it('should delete account successfully without password verification', async () => {
      await AuthService.deleteAccount();
      
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
    });
    
    it('should verify password when provided', async () => {
      // Mock verifyPassword
      vi.spyOn(AuthService as any, 'verifyPassword').mockResolvedValueOnce(true);
      
      await AuthService.deleteAccount(mockPassword);
      
      // Verify password was verified
      expect(AuthService['verifyPassword']).toHaveBeenCalledWith(mockPassword, mockHashedPassword);
    });
    
    it('should throw an error if password verification fails', async () => {
      // Mock verifyPassword to fail
      vi.spyOn(AuthService as any, 'verifyPassword').mockResolvedValueOnce(false);
      
      await expect(AuthService.deleteAccount(mockPassword)).rejects.toThrow('Invalid password');
    });
    
    it('should throw an error if user is not found', async () => {
      // Mock getUserData to return null
      vi.spyOn(AuthService as any, 'getUserData').mockResolvedValueOnce(null);
      
      await expect(AuthService.deleteAccount()).rejects.toThrow('User not found');
    });
  });
  
  describe('updatePrivacySettings', () => {
    it('should update privacy settings successfully', async () => {
      const privacyOptions = {
        dataSharing: false,
        analyticsEnabled: false
      };
      
      const result = await AuthService.updatePrivacySettings(mockUserId, privacyOptions);
      
      // Verify privacy settings were updated
      expect(result.settings.privacyOptions).toEqual(privacyOptions);
      
      // Verify user data was stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_data',
        expect.any(String)
      );
    });
  });
  
  describe('updateAccessibilitySettings', () => {
    it('should update accessibility settings successfully', async () => {
      const accessibilityOptions = {
        fontSize: 'large',
        highContrast: true
      };
      
      const result = await AuthService.updateAccessibilitySettings(mockUserId, accessibilityOptions);
      
      // Verify accessibility settings were updated
      expect(result.settings.accessibilityOptions).toEqual(accessibilityOptions);
      
      // Verify user data was stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_data',
        expect.any(String)
      );
    });
  });
  
  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Mock verifyPassword
      vi.spyOn(AuthService as any, 'verifyPassword').mockResolvedValueOnce(true);
      
      const result = await AuthService.changePassword(mockPassword, 'NewPassword123!');
      
      // Verify password was verified
      expect(AuthService['verifyPassword']).toHaveBeenCalledWith(mockPassword, mockHashedPassword);
      
      // Verify new password was hashed and stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        `credentials_${mockEmail}`,
        expect.any(String)
      );
      
      // Verify user data was updated
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_data',
        expect.any(String)
      );
      
      expect(result).toBe(true);
    });
    
    it('should throw an error if current password is invalid', async () => {
      // Mock verifyPassword to fail
      vi.spyOn(AuthService as any, 'verifyPassword').mockResolvedValueOnce(false);
      
      await expect(AuthService.changePassword(mockPassword, 'NewPassword123!')).rejects.toThrow('Invalid current password');
    });
  });
  
  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      const result = await AuthService.requestPasswordReset(mockEmail);
      
      // Verify credentials were checked
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(`credentials_${mockEmail}`);
      
      expect(result).toBe(true);
    });
    
    it('should return true even if user does not exist (for security)', async () => {
      // Mock getUserCredentials to return null
      vi.spyOn(AuthService as any, 'getUserCredentials').mockResolvedValueOnce(null);
      
      const result = await AuthService.requestPasswordReset('nonexistent@example.com');
      
      expect(result).toBe(true);
    });
  });
});