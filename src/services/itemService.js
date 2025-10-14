import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

export const itemService = {
    // Get all items
    getAll: () => api.get('/items'),
    
    // Get single item
    get: (id) => api.get(`/items/${id}`),
    
    // Create new item
    create: (data) => api.post('/items', data),
    
    // Update item
    update: (id, data) => api.put(`/items/${id}`, data),
    
    // Delete item
    delete: (id) => api.delete(`/items/${id}`),
    
    // Search items
    search: (query) => api.get(`/items/search/${query}`),
};