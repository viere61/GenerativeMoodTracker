import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import LocalStorageManager from './src/services/LocalStorageManager';
import PushNotificationService from './src/services/PushNotificationService';

// Import required polyfills for React Navigation
import 'react-native-gesture-handler';

export default function App() {
  useEffect(() => {
    // Initialize services when app starts
    const initializeServices = async () => {
      try {
        // Initialize LocalStorageManager
        await LocalStorageManager.initialize();
        console.log('LocalStorageManager initialized successfully');
        
        // Initialize PushNotificationService
        const pushNotificationService = PushNotificationService.getInstance();
        const result = await pushNotificationService.initialize();
        if (result.success) {
          console.log('✅ PushNotificationService initialized successfully');
          // Set up notification listeners
          const cleanup = pushNotificationService.setupNotificationListeners();
          // Note: In a real app, you'd want to store the cleanup function
          // and call it when the app unmounts
        } else {
          console.log('⚠️ PushNotificationService initialization failed:', result.error);
        }
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };
    
    initializeServices();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}