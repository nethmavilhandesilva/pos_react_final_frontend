import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', // ✅ Laravel API URL
  headers: {
    'Accept': 'application/json'
  },
  withCredentials: false 
});

// 🔐 Add token and handle Content-Type dynamically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  // Add Auth Token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // ✅ DYNAMIC CONTENT-TYPE LOGIC
  // If the data is FormData (images), we MUST let the browser set the Content-Type
  // so it can include the unique boundary string.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else {
    // For regular objects, default back to JSON
    config.headers['Content-Type'] = 'application/json';
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
    window.location.href = "/login"; 
  }
  return Promise.reject(error);
});

export default api;