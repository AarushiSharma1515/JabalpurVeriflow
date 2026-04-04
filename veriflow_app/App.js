import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import 'react-native-gesture-handler';
import MLReviewScreen from './screen/MLReviewScreen';
import LandingScreen from './screen/LandingScreen';
import LoginScreen from './screen/LoginScreen';
import RegisterScreen from './screen/RegisterScreen';
import FarmerDashboard from './screen/FarmerDashboard';
import PlotRegistrationScreen from './screen/PlotRegistrationScreen';
import AdminDashboard from './screen/AdminDashboard';
import GeoCaptureScreen from "./screen/GeoCaptureScreen";
import MyPlots from "./screen/MyPlotsScreen";
import RecordFieldData from "./screen/RecordFieldDataScreen";
import ManagePlots from "./screen/ManagePlotsScreen";
import ManageFarmers from "./screen/ManageFarmerScreen";
import CarbonReportsScreen from "./screen/CarbonReportsScreen";
import MarketplaceDashboard from "./screen/MarketplaceDashboard";
import SystemSettingsScreen from "./screen/SystemSettingsScreen";
import VerificationScreen from "./screen/VerificationScreen";
import BlockchainScreen from "./screen/BlockchainScreen";
import ProfileScreen from "./screen/ProfileScreen";

const Stack = createStackNavigator();

// Expo Router / ExpoRoot already provides a NavigationContainer at runtime.
// Do NOT wrap this navigator in a NavigationContainer to avoid nesting warnings.
export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Landing">
      <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FarmerDashboard" component={FarmerDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="PlotRegistration" component={PlotRegistrationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }}/>
      <Stack.Screen name="GeoCapture" component={GeoCaptureScreen} options={{ headerShown: false }}/>
      <Stack.Screen name="MyPlots" component={MyPlots} options={{ headerShown: false }}/>
      <Stack.Screen name="RecordFieldData" component={RecordFieldData} options={{ headerShown: false }}/>
      <Stack.Screen name="ManagePlots" component={ManagePlots} options={{ headerShown: false }}/>
      <Stack.Screen name="ManageFarmers" component={ManageFarmers} options={{ headerShown: false }}/>
      <Stack.Screen name="MLReviewScreen" component={MLReviewScreen} options={{ headerShown: false }}/>
      <Stack.Screen name="CarbonReportsScreen" component={CarbonReportsScreen} options={{ headerShown: false }}/>
      <Stack.Screen name="Marketplace" component={MarketplaceDashboard} options={{ headerShown: false }}/>
      <Stack.Screen name="SystemSettings" component={SystemSettingsScreen} options={{ headerShown: false }}/>
      <Stack.Screen name="Verification" component={VerificationScreen} options={{ headerShown: false }}/>
      <Stack.Screen name="BlockchainScreen" component={BlockchainScreen} options={{ headerShown: false }}/>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }}/>
    </Stack.Navigator>

  );
}

