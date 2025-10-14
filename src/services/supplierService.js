import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

export const supplierService = {
    // Get all suppliers
    getAll: () => api.get('/suppliers'),
    
    // Get single supplier
    get: (id) => api.get(`/suppliers/${id}`),
    
    // Create new supplier
    create: (data) => api.post('/suppliers', data),
    
    // Update supplier
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    
    // Delete supplier
    delete: (id) => api.delete(`/suppliers/${id}`),
    
    // Search suppliers
    search: (query) => api.get(`/suppliers/search/${query}`),
};