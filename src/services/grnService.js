import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

export const grnService = {
    getAll: () => api.get('/grn-entries'),
    getCreateData: () => api.get('/grn-entries/create-data'),
    get: (id) => api.get(`/grn-entries/${id}`),
    create: (data) => api.post('/grn-entries', data),
    update: (id, data) => api.put(`/grn-entries/${id}`, data),
    delete: (id) => api.delete(`/grn-entries/${id}`),
};