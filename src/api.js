// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',  // ✅ Laravel API URL
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: false // ❗ VERY IMPORTANT → disables browser cookie redirect issues
});

// 🔐 Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// ❗ Handle 401 (Unauthorized) globally
api.interceptors.response.use((response) => {
  return response;
}, (error) => {

  if (error.response && error.response.status === 401) {
    console.log("⚠️ Token expired or invalid. Redirecting to login...");

    localStorage.removeItem("token");
    window.location.href = "/login"; // redirect user to login page
  }

  return Promise.reject(error);
});

export default api;