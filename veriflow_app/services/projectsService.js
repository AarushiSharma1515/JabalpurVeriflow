import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../config/api';

export { API_BASE };

export const getAPIBase = () => API_BASE;

export const apiCall = async (endpoint, method = 'GET', data = null, token = null) => {
  const url = `${API_BASE}${endpoint}`;
  console.log(`API Call: ${method} ${url}`);
  const config = {
    method,
    url,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...(data && { data })
  };
  const response = await axios(config);
  return response.data;
};

export const loginUser = async (email, password) => {
  return await apiCall('/api/auth/login', 'POST', { email, password });
};

export const registerUser = async (userData) => {
  return await apiCall('/api/auth/register', 'POST', userData);
};

export const getProjects = async (token, userId = null) => {
  const endpoint = userId ? `/api/projects?owner=${userId}` : '/api/projects';
  return await apiCall(endpoint, 'GET', null, token);
};

export const createProject = async (projectData, token) => {
  return await apiCall('/api/projects', 'POST', projectData, token);
};

export const saveMLResult = async (resultData, token) => {
  return await apiCall('/api/ml/save-result', 'POST', resultData, token);
};

export const getMLResults = async (token, status = null) => {
  const endpoint = status ? `/api/ml/results?status=${status}` : '/api/ml/results';
  return await apiCall(endpoint, 'GET', null, token);
};

export const approveMLResult = async (id, adminNotes, token) => {
  return await apiCall(`/api/ml/${id}/approve`, 'PATCH', { adminNotes }, token);
};

export const rejectMLResult = async (id, adminNotes, token) => {
  return await apiCall(`/api/ml/${id}/reject`, 'PATCH', { adminNotes }, token);
};

export const fileAppeal = async (id, appealReason, token) => {
  return await apiCall(`/api/ml/${id}/appeal`, 'POST', { appealReason }, token);
};

export const reviewAppeal = async (id, decision, adminNotes, token) => {
  return await apiCall(`/api/ml/${id}/appeal/review`, 'PATCH', { decision, adminNotes }, token);
};

export const getAllFarmers = async (token) => {
  const response = await apiCall('/api/users/farmers', 'GET', null, token);
  return response.farmers || response.users || [];
};

export const updateUserStatus = async (token, id, status) => {
  return await apiCall(`/api/users/${id}/status`, 'PATCH', { status }, token);
};

export const deleteUser = async (token, id) => {
  return await apiCall(`/api/users/${id}`, 'DELETE', null, token);
};

export default {
  API_BASE,
  getAPIBase,
  apiCall,
  loginUser,
  registerUser,
  getProjects,
  createProject,
  saveMLResult,
  getMLResults,
  approveMLResult,
  rejectMLResult,
  fileAppeal,
  reviewAppeal,
  getAllFarmers,
  updateUserStatus,
  deleteUser,
};