import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * API Configuration
 * Central location for all API endpoints
 */

// Set these in Expo env to avoid hardcoded/stale network addresses:
// EXPO_PUBLIC_API_BASE_URL=http://your-hostname-or-lan-host:5001
// or EXPO_PUBLIC_SERVER_IP=your-hostname-or-lan-host and EXPO_PUBLIC_SERVER_PORT=5001
const SERVER_IP = process.env.EXPO_PUBLIC_SERVER_IP;
const SERVER_PORT = process.env.EXPO_PUBLIC_SERVER_PORT || '5001';
const EXPLICIT_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const getExpoHost = () => {
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.debuggerHost;

  if (!hostUri) return null;
  return hostUri.split(':')[0];
};

/**
 * Get the appropriate API base URL based on platform
 */
const getApiBase = () => {
  if (EXPLICIT_API_BASE_URL) {
    return EXPLICIT_API_BASE_URL;
  }

  const resolvedHost = SERVER_IP || getExpoHost() || 'localhost';

  // Same base URL across platforms; provide the correct host via env vars.
  if (Platform.OS === 'web' || Platform.OS === 'android' || Platform.OS === 'ios') {
    return `http://${resolvedHost}:${SERVER_PORT}`;
  }

  return `http://${resolvedHost}:${SERVER_PORT}`;
};

export const API_BASE = getApiBase();

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE}/api/auth/login`,
  REGISTER: `${API_BASE}/api/auth/register`,

  // Projects
  PROJECTS: `${API_BASE}/api/projects`,

  // Users
  FARMERS: `${API_BASE}/api/users/farmers`,
  MARKETPLACE_USERS: `${API_BASE}/api/users/marketplace-users`,
};

export default {
  API_BASE,
  API_ENDPOINTS,
};
