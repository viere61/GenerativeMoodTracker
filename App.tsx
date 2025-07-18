import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import LocalStorageManager from './src/services/LocalStorageManager';

// Import required polyfills for React Navigation
import 'react-native-gesture-handler';

export default function App() {
  useEffect(() => {
    // Initialize LocalStorageManager when app starts
    const initializeStorage = async () => {
      try {
        await LocalStorageManager.initialize();
        console.log('LocalStorageManager initialized successfully');
      } catch (error) {
        console.error('Failed to initialize LocalStorageManager:', error);
      }
    };
    
    initializeStorage();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}