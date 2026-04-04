import axios from "axios";
import { API_BASE } from "../config/api";
import AsyncStorage from '@react-native-async-storage/async-storage';

// ------ AUTH SERVICES ------ //

const login = async (email, password) => {
  const url = `${API_BASE}/api/auth/login`;
  console.log('Login attempt to:', url);
  try {
    const res = await axios.post(url, { email, password }, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Login successful:', res.data);
    return res.data;
  } catch (error) {
    console.error('Login error:', error.message);
    if (error.response) {
      console.error('Response error:', error.response.data);
    } else if (error.request) {
      console.error('No response received - check network/server');
    }
    throw error;
  }
};

const register = async (payload) => {
  const url = `${API_BASE}/api/auth/register`;
  console.log('Register attempt to:', url);
  try {
    const res = await axios.post(url, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Registration successful:', res.data);
    return res.data;
  } catch (error) {
    console.error('Registration error:', error.message);
    if (error.response) {
      console.error('Response error:', error.response.data);
    } else if (error.request) {
      console.error('No response received - check network/server');
    }
    throw error;
  }
};

const getProfile = async (token) => {
  if (!token) throw new Error('Not authenticated');

  try {
    const res = await axios.get(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });

    if (res?.data?.user) {
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  } catch (error) {
    // Graceful fallback to local cache if server is temporarily unreachable.
    const rawUser = await AsyncStorage.getItem('user');
    if (!rawUser) throw error;
    try {
      return { user: JSON.parse(rawUser) };
    } catch (parseError) {
      throw error;
    }
  }
};

const updateProfile = async (token, payload) => {
  if (!token) throw new Error('Not authenticated');

  try {
    const res = await axios.patch(`${API_BASE}/api/users/me`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (res?.data?.user) {
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
    }

    return res.data;
  } catch (error) {
    // Fallback when running backend instance does not yet expose /api/users/me.
    if (error?.response?.status !== 404) {
      throw error;
    }

    const rawUser = await AsyncStorage.getItem('user');
    let cachedUser = {};
    if (rawUser) {
      try {
        cachedUser = JSON.parse(rawUser);
      } catch (parseError) {
        cachedUser = {};
      }
    }

    // Persist wallet through legacy endpoint if provided.
    if (payload?.walletAddress) {
      await axios.patch(
        `${API_BASE}/api/orders/update-wallet`,
        { walletAddress: payload.walletAddress },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
    }

    const mergedUser = {
      ...cachedUser,
      ...(typeof payload?.name === 'string' ? { name: payload.name } : {}),
      ...(typeof payload?.email === 'string' ? { email: payload.email } : {}),
      ...(typeof payload?.walletAddress === 'string' ? { walletAddress: payload.walletAddress } : {}),
    };

    await AsyncStorage.setItem('user', JSON.stringify(mergedUser));
    return { user: mergedUser };
  }
};

export default { login, register, getProfile, updateProfile };