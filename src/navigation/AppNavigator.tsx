import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import screens (we'll create these next)
import HomeScreen from '../screens/HomeScreen';
import MoodEntryScreen from '../screens/MoodEntryScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

// Define navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  Main: { screen?: keyof MainTabParamList; params?: MainTabParamList[keyof MainTabParamList] } | undefined;
  MoodEntry: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: { initialHistoryTab?: 'list' | 'charts' | 'weekly' } | undefined;
  Settings: undefined;
};

// Create navigators
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main tab navigator
const MainTabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Root stack navigator
const AppNavigator = () => {
  // Skip onboarding and go directly to main app
  const isOnboarded = true;

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={isOnboarded ? 'Main' : 'Onboarding'}>
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Main" 
          component={MainTabNavigator} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="MoodEntry" 
          component={MoodEntryScreen} 
          options={{ title: 'Log Your Mood' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;