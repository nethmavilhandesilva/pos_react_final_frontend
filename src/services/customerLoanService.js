import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

export const customerLoanService = {
    getAll: () => api.get('/customers-loans'),
    getCustomerLoanTotal: (customerId) => api.get(`/customers-loans/${customerId}/total`),
    create: (data) => api.post('/customers-loans', data),
    update: (id, data) => api.put(`/customers-loans/${id}`, data),
    delete: (id) => api.delete(`/customers-loans/${id}`),
};