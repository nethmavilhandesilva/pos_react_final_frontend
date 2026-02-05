import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance with base config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Accept': 'application/json',
    },
});

// Add request interceptor to include token dynamically
api.interceptors.request.use(
    (config) => {
        // Get token from localStorage (or wherever you store it)
        const token = localStorage.getItem('auth_token') || 
                     localStorage.getItem('token') || 
                     sessionStorage.getItem('token');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // If the data is FormData, remove Content-Type header
        // Let the browser set it automatically with boundary
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Redirect to login if unauthorized
            localStorage.removeItem('token');
            localStorage.removeItem('auth_token');
            window.location.href = '/login'; // Adjust this to your login route
        }
        return Promise.reject(error);
    }
);

export const supplierService = {
    // Get all suppliers
    getAll: () => api.get('/suppliers'),
    
    // Get single supplier
    get: (id) => api.get(`/suppliers/${id}`),
    
    // Create new supplier - handles both JSON and FormData
    create: (data) => {
        // If it's FormData, send with appropriate headers
        if (data instanceof FormData) {
            return api.post('/suppliers', data, {
                headers: {
                    // Don't set Content-Type - browser will do it automatically
                }
            });
        }
        // For JSON data
        return api.post('/suppliers', data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    },
    
    // Update supplier
    update: (id, data) => {
        if (data instanceof FormData) {
            return api.post(`/suppliers/${id}`, data, {
                headers: {
                    // Using POST with _method=PUT for FormData with Laravel
                }
            });
        }
        return api.put(`/suppliers/${id}`, data);
    },
    
    // Delete supplier
    delete: (id) => api.delete(`/suppliers/${id}`),
    
    // Search suppliers
    search: (query) => api.get(`/suppliers/search/${query}`),
};