import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthService, { AuthState, RegistrationData, LoginData } from '../services/AuthService';
import { User } from '../types';

// Interface for the authentication context
interface AuthContextType {
  authState: AuthState;
  isLoading: boolean;
  register: (data: RegistrationData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

// Create the authentication context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component for the authentication context
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for authentication
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
  });
  
  // State for loading status
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Effect to check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const state = await AuthService.getAuthState();
        setAuthState(state);
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Function to register a new user
  const register = async (data: RegistrationData): Promise<void> => {
    setIsLoading(true);
    try {
      const user = await AuthService.register(data);
      setAuthState({
        isAuthenticated: true,
        user,
        token: await AuthService.getAuthState().then(state => state.token),
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to log in a user
  const login = async (data: LoginData): Promise<void> => {
    setIsLoading(true);
    try {
      const user = await AuthService.login(data);
      setAuthState({
        isAuthenticated: true,
        user,
        token: await AuthService.getAuthState().then(state => state.token),
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to log out a user
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await AuthService.logout();
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to update user data
  const updateUser = async (userData: Partial<User>): Promise<void> => {
    setIsLoading(true);
    try {
      const updatedUser = await AuthService.updateUser(userData);
      setAuthState(prevState => ({
        ...prevState,
        user: updatedUser,
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to delete a user account
  const deleteAccount = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await AuthService.deleteAccount();
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Context value
  const value = {
    authState,
    isLoading,
    register,
    login,
    logout,
    updateUser,
    deleteAccount,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use the authentication context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};