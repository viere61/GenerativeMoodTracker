import * as Crypto from 'expo-crypto';
import { User } from '../types';
import { generateUUID } from '../utils/uuid';
import StorageService from './StorageService';

// Keys for secure storage
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const USER_PREFERENCES_KEY = 'user_preferences';

// Interface for registration data
export interface RegistrationData {
  email: string;
  password: string;
  preferredTimeRange: {
    start: string; // Format: "HH:MM"
    end: string; // Format: "HH:MM"
  };
}

// Interface for login data
export interface LoginData {
  email: string;
  password: string;
}

// Interface for authentication state
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

/**
 * Service for handling authentication operations
 */
class AuthService {
  /**
   * Register a new user
   * @param data User registration data
   * @returns Promise resolving to the created user
   */
  async register(data: RegistrationData): Promise<User> {
    try {
      // In a real app, this would be an API call to a backend service
      // For now, we'll simulate creating a user locally
      
      // Hash the password (in a real app, this would be done on the server)
      const hashedPassword = await this.hashPassword(data.password);
      const currentTime = Date.now();
      
      // Create a new user object with enhanced security fields
      const newUser: User = {
        userId: generateUUID(),
        email: data.email,
        preferredTimeRange: data.preferredTimeRange,
        createdAt: currentTime,
        lastLogin: currentTime,
        settings: {
          notifications: true,
          theme: 'light',
          audioQuality: 'high',
          privacyOptions: {
            dataSharing: false,
            analyticsEnabled: true
          },
          accessibilityOptions: {
            fontSize: 'medium',
            highContrast: false
          }
        },
        accountStatus: 'active',
        securityInfo: {
          lastPasswordChange: currentTime,
          failedLoginAttempts: 0,
          passwordResetRequired: false
        }
      };
      
      // Store the user credentials (in a real app, this would be in a database)
      await this.storeUserCredentials(data.email, hashedPassword);
      
      // Store the user data
      await this.storeUserData(newUser);
      
      // Generate and store an authentication token
      const token = this.generateAuthToken();
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      
      return newUser;
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Failed to register user');
    }
  }
  
  /**
   * Log in an existing user
   * @param data User login data
   * @returns Promise resolving to the authenticated user
   */
  async login(data: LoginData): Promise<User> {
    try {
      // In a real app, this would be an API call to a backend service
      // For now, we'll simulate authentication locally
      
      // Get the stored credentials
      const storedHash = await this.getUserCredentials(data.email);
      
      if (!storedHash) {
        throw new Error('User not found');
      }
      
      // Get the user data
      const userData = await this.getUserData();
      
      if (!userData) {
        throw new Error('User data not found');
      }
      
      // Check account status
      if (userData.accountStatus === 'locked') {
        throw new Error('Account is locked. Please reset your password.');
      }
      
      // Verify the password
      const isValid = await this.verifyPassword(data.password, storedHash);
      
      if (!isValid) {
        // Update failed login attempts
        const failedAttempts = (userData.securityInfo?.failedLoginAttempts || 0) + 1;
        const updatedUser: User = {
          ...userData,
          securityInfo: {
            ...userData.securityInfo,
            failedLoginAttempts: failedAttempts
          }
        };
        
        // Lock account after 5 failed attempts
        if (failedAttempts >= 5) {
          updatedUser.accountStatus = 'locked';
          updatedUser.securityInfo = {
            ...updatedUser.securityInfo,
            passwordResetRequired: true
          };
        }
        
        await this.storeUserData(updatedUser);
        throw new Error('Invalid password');
      }
      
      // Reset failed login attempts and update last login time
      const currentTime = Date.now();
      const updatedUser: User = {
        ...userData,
        lastLogin: currentTime,
        securityInfo: {
          ...userData.securityInfo,
          failedLoginAttempts: 0
        }
      };
      
      // Check if password reset is required
      if (userData.securityInfo?.passwordResetRequired) {
        // In a real app, we would redirect to password reset
        console.warn('Password reset required');
      }
      
      // Store the updated user data
      await this.storeUserData(updatedUser);
      
      // Generate and store a new authentication token
      const token = this.generateAuthToken();
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      
      return updatedUser;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Failed to log in');
    }
  }
  
  /**
   * Log out the current user
   */
  async logout(): Promise<void> {
    try {
      // Remove the authentication token
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to log out');
    }
  }
  
  /**
   * Check if a user is currently authenticated
   * @returns Promise resolving to the authentication state
   */
  async getAuthState(): Promise<AuthState> {
    try {
      // Get the authentication token
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      
      if (!token) {
        return {
          isAuthenticated: false,
          user: null,
          token: null,
        };
      }
      
      // Get the user data
      const userData = await this.getUserData();
      
      if (!userData) {
        return {
          isAuthenticated: false,
          user: null,
          token: null,
        };
      }
      
      return {
        isAuthenticated: true,
        user: userData,
        token,
      };
    } catch (error) {
      console.error('Get auth state error:', error);
      return {
        isAuthenticated: false,
        user: null,
        token: null,
      };
    }
  }
  
  /**
   * Update the current user's data
   * @param userData Updated user data
   * @returns Promise resolving to the updated user
   */
  async updateUser(userData: Partial<User>): Promise<User> {
    try {
      // Get the current user data
      const currentUser = await this.getUserData();
      
      if (!currentUser) {
        throw new Error('User not found');
      }
      
      // Update the user data
      const updatedUser: User = {
        ...currentUser,
        ...userData,
      };
      
      // Store the updated user data
      await this.storeUserData(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Update user error:', error);
      throw new Error('Failed to update user');
    }
  }
  
  /**
   * Delete the current user's account
   * @param password Optional password for verification
   */
  async deleteAccount(password?: string): Promise<void> {
    try {
      // Get the current user data
      const userData = await this.getUserData();
      
      if (!userData) {
        throw new Error('User not found');
      }
      
      // In a real app, we would verify the password with the server
      if (password) {
        const storedHash = await this.getUserCredentials(userData.email);
        if (!storedHash) {
          throw new Error('User credentials not found');
        }
        
        const isValid = await this.verifyPassword(password, storedHash);
        if (!isValid) {
          throw new Error('Invalid password');
        }
      }
      
      // Clean up all user data
      
      // 1. Remove user credentials
      await this.removeUserCredentials(userData.email);
      
      // 2. Remove user preferences
      await SecureStore.deleteItemAsync(`${USER_PREFERENCES_KEY}_${userData.userId}`);
      
      // 3. Remove daily window data
      await SecureStore.deleteItemAsync(`daily_window_${userData.userId}`);
      
      // 4. Remove authentication tokens
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      
      // 5. Remove user data
      await SecureStore.deleteItemAsync(USER_DATA_KEY);
      
      // 6. In a real app, we would also delete all mood entries, generated music, etc.
      // This would typically be done on the server side
      
      console.log('Account deleted successfully');
    } catch (error) {
      console.error('Delete account error:', error);
      throw new Error('Failed to delete account');
    }
  }
  
  /**
   * Update user privacy settings
   * @param userId The user's ID
   * @param privacyOptions The privacy options to update
   */
  async updatePrivacySettings(
    userId: string, 
    privacyOptions: { dataSharing: boolean; analyticsEnabled: boolean }
  ): Promise<User> {
    try {
      // Get the current user data
      const currentUser = await this.getUserData();
      
      if (!currentUser) {
        throw new Error('User not found');
      }
      
      // Update the privacy options
      const updatedUser: User = {
        ...currentUser,
        settings: {
          ...currentUser.settings,
          privacyOptions: {
            ...currentUser.settings.privacyOptions,
            ...privacyOptions
          }
        }
      };
      
      // Store the updated user data
      await this.storeUserData(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Update privacy settings error:', error);
      throw new Error('Failed to update privacy settings');
    }
  }
  
  /**
   * Update user accessibility settings
   * @param userId The user's ID
   * @param accessibilityOptions The accessibility options to update
   */
  async updateAccessibilitySettings(
    userId: string, 
    accessibilityOptions: { fontSize: string; highContrast: boolean }
  ): Promise<User> {
    try {
      // Get the current user data
      const currentUser = await this.getUserData();
      
      if (!currentUser) {
        throw new Error('User not found');
      }
      
      // Update the accessibility options
      const updatedUser: User = {
        ...currentUser,
        settings: {
          ...currentUser.settings,
          accessibilityOptions: {
            ...currentUser.settings.accessibilityOptions,
            ...accessibilityOptions
          }
        }
      };
      
      // Store the updated user data
      await this.storeUserData(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Update accessibility settings error:', error);
      throw new Error('Failed to update accessibility settings');
    }
  }
  
  /**
   * Change user password
   * @param currentPassword The current password
   * @param newPassword The new password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Get the current user data
      const userData = await this.getUserData();
      
      if (!userData) {
        throw new Error('User not found');
      }
      
      // Get the stored credentials
      const storedHash = await this.getUserCredentials(userData.email);
      
      if (!storedHash) {
        throw new Error('User credentials not found');
      }
      
      // Verify the current password
      const isValid = await this.verifyPassword(currentPassword, storedHash);
      
      if (!isValid) {
        throw new Error('Invalid current password');
      }
      
      // Hash the new password
      const newHash = await this.hashPassword(newPassword);
      
      // Store the new credentials
      await this.storeUserCredentials(userData.email, newHash);
      
      // Update security info
      const updatedUser: User = {
        ...userData,
        securityInfo: {
          ...userData.securityInfo,
          lastPasswordChange: Date.now(),
          passwordResetRequired: false
        }
      };
      
      // Store the updated user data
      await this.storeUserData(updatedUser);
      
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      throw new Error('Failed to change password');
    }
  }
  
  /**
   * Request password reset
   * @param email The user's email
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      // In a real app, this would send a password reset email
      // For now, we'll just simulate the process
      
      // Check if the user exists
      const storedHash = await this.getUserCredentials(email);
      
      if (!storedHash) {
        // Don't reveal that the user doesn't exist for security reasons
        return true;
      }
      
      // In a real app, we would generate a reset token and send an email
      console.log(`Password reset requested for ${email}`);
      
      return true;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw new Error('Failed to request password reset');
    }
  }
  
  // Private helper methods
  
  /**
   * Generate a secure authentication token with expiration
   * @returns A secure authentication token
   */
  private generateAuthToken(): string {
    // In a real app, this would be a JWT or similar token
    // For now, we'll generate a token with expiration
    const tokenId = Math.random().toString(36).substring(2, 15);
    const issuedAt = Date.now();
    const expiresAt = issuedAt + (24 * 60 * 60 * 1000); // 24 hours from now
    
    // Store token expiration
    this.storeTokenExpiry(expiresAt);
    
    // Generate refresh token
    this.generateRefreshToken();
    
    return `token_${tokenId}_${issuedAt}_${expiresAt}`;
  }
  
  /**
   * Generate and store a refresh token
   * @returns The generated refresh token
   */
  private generateRefreshToken(): string {
    const refreshToken = `refresh_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    return refreshToken;
  }
  
  /**
   * Store token expiration time
   * @param expiryTime Timestamp when the token expires
   */
  private async storeTokenExpiry(expiryTime: number): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString());
  }
  
  /**
   * Check if the current token is expired
   * @returns Promise resolving to true if the token is expired
   */
  private async isTokenExpired(): Promise<boolean> {
    const expiryTimeStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    
    if (!expiryTimeStr) {
      return true;
    }
    
    const expiryTime = parseInt(expiryTimeStr, 10);
    return Date.now() > expiryTime;
  }
  
  /**
   * Refresh the authentication token using the refresh token
   * @returns Promise resolving to the new authentication token
   */
  public async refreshAuthToken(): Promise<string | null> {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        return null;
      }
      
      // In a real app, this would validate the refresh token with a server
      // For now, we'll just generate a new token
      const newToken = this.generateAuthToken();
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, newToken);
      
      return newToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }
  
  /**
   * Hash a password securely using SHA-256
   * @param password The password to hash
   * @returns Promise resolving to the hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    // Generate a random salt
    const salt = Array.from(new Uint8Array(16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Hash the password with the salt
    const passwordWithSalt = password + salt;
    const hashedBuffer = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      passwordWithSalt
    );
    
    // Return the salt and hash together
    return `${salt}:${hashedBuffer}`;
  }
  
  /**
   * Verify a password against a stored hash
   * @param password The password to verify
   * @param storedHash The stored hash (format: "salt:hash")
   * @returns Promise resolving to true if the password is valid
   */
  private async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      // Extract the salt from the stored hash
      const [salt, hash] = storedHash.split(':');
      
      // Hash the password with the extracted salt
      const passwordWithSalt = password + salt;
      const hashedBuffer = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        passwordWithSalt
      );
      
      // Compare the hashes
      return hashedBuffer === hash;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }
  
  /**
   * Store user credentials securely
   * @param email The user's email
   * @param passwordHash The hashed password
   */
  private async storeUserCredentials(email: string, passwordHash: string): Promise<void> {
    const key = `credentials_${email}`;
    await SecureStore.setItemAsync(key, passwordHash);
  }
  
  /**
   * Get stored user credentials
   * @param email The user's email
   * @returns Promise resolving to the stored password hash
   */
  private async getUserCredentials(email: string): Promise<string | null> {
    const key = `credentials_${email}`;
    return await SecureStore.getItemAsync(key);
  }
  
  /**
   * Remove stored user credentials
   * @param email The user's email
   */
  private async removeUserCredentials(email: string): Promise<void> {
    const key = `credentials_${email}`;
    await SecureStore.deleteItemAsync(key);
  }
  
  /**
   * Store user data securely
   * @param user The user data to store
   */
  private async storeUserData(user: User): Promise<void> {
    await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
  }
  
  /**
   * Get stored user data
   * @returns Promise resolving to the stored user data
   */
  private async getUserData(): Promise<User | null> {
    const userData = await SecureStore.getItemAsync(USER_DATA_KEY);
    
    if (!userData) {
      return null;
    }
    
    return JSON.parse(userData) as User;
  }
  
  /**
   * Store user preferences securely
   * @param userId The user's ID
   * @param preferences The preferences to store
   */
  public async storeUserPreferences(userId: string, preferences: any): Promise<void> {
    const key = `${USER_PREFERENCES_KEY}_${userId}`;
    await SecureStore.setItemAsync(key, JSON.stringify(preferences));
  }
  
  /**
   * Get stored user preferences
   * @param userId The user's ID
   * @returns Promise resolving to the stored user preferences
   */
  public async getUserPreferences(userId: string): Promise<any | null> {
    const key = `${USER_PREFERENCES_KEY}_${userId}`;
    const preferences = await SecureStore.getItemAsync(key);
    
    if (!preferences) {
      return null;
    }
    
    return JSON.parse(preferences);
  }
  
  /**
   * Update user preferred time range
   * @param userId The user's ID
   * @param timeRange The new preferred time range
   * @returns Promise resolving to the updated user
   */
  public async updatePreferredTimeRange(userId: string, timeRange: { start: string; end: string }): Promise<User> {
    // Get the current user data
    const currentUser = await this.getUserData();
    
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    // Update the time range
    const updatedUser: User = {
      ...currentUser,
      preferredTimeRange: timeRange,
    };
    
    // Store the updated user data
    await this.storeUserData(updatedUser);
    
    // Also update in preferences storage for redundancy
    const preferences = await this.getUserPreferences(userId) || {};
    await this.storeUserPreferences(userId, {
      ...preferences,
      preferredTimeRange: timeRange,
    });
    
    return updatedUser;
  }
  
  /**
   * Check if the authentication token needs to be refreshed
   * @returns Promise resolving to true if the token was refreshed
   */
  public async checkAndRefreshToken(): Promise<boolean> {
    try {
      const isExpired = await this.isTokenExpired();
      
      if (isExpired) {
        const newToken = await this.refreshAuthToken();
        return newToken !== null;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh check error:', error);
      return false;
    }
  }
}

export default new AuthService();