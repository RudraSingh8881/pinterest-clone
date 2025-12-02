// src/utils/api.js - FINAL CORRECTED VERSION (NO DEMO FALLBACKS)
import axios from 'axios';

// Use Vite environment variable `VITE_API_URL` when deployed.
// If not set, fall back to a relative `/api` so the app works when
// frontend and backend are hosted on the same origin.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const apiBase = `${API_URL.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL: apiBase,
});

const uploadApi = axios.create({
  baseURL: apiBase,
});

// Request interceptors
[api, uploadApi].forEach(instance => {
  instance.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
});

// Auth functions - ✅ REMOVED DEMO FALLBACKS
export const loginUser = async (email, password) => {
  const res = await api.post('/login', { email, password });
  localStorage.setItem('token', res.data.token);
  localStorage.setItem('userId', res.data.user.id); // Add this
  localStorage.setItem('user', JSON.stringify(res.data.user));
  return res.data.user;
};

export const registerUser = async (username, email, password) => {
  const res = await api.post('/register', { username, email, password });
  localStorage.setItem('token', res.data.token);
  localStorage.setItem('userId', res.data.user.id); // Add this
  localStorage.setItem('user', JSON.stringify(res.data.user));
  return res.data.user;
};

export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
};

// Pin functions
export const getPins = async (search = '', page = 1) => {
  const res = await api.get('/pins', { params: { search, page, limit: 12 } });
  return res.data;
};

export const createPin = async (formData) => {
  const res = await uploadApi.post('/pins', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getUserPins = async (userId) => {
  const res = await api.get(`/pins/user/${userId}`);
  return res.data;
};

export const updatePin = async (pinId, pinData) => {
  const res = await api.put(`/pins/${pinId}`, pinData);
  return res.data;
};

export const deletePin = async (pinId) => {
  const res = await api.delete(`/pins/${pinId}`);
  return res.data;
};

// History function
export const getHistory = async () => {
  const res = await api.get('/history');
  return res.data;
};


// Default export
const API = {
  loginUser,
  registerUser,
  logoutUser,
  createPin,
  getPins,
  getUserPins,
  updatePin,
  deletePin,
  getHistory
};

export default API;