// src/services/bankService.js
import api from '../api';

const routes = {
    getAllBanks: '/banks',
    createBank: '/banks',
    deleteBank: (id) => `/banks/${id}`,
};

const bankService = {
    getAllBanks: async () => {
        try {
            const response = await api.get(routes.getAllBanks);
            return response.data;
        } catch (error) {
            console.error('Error fetching banks:', error);
            throw error;
        }
    },

    createBank: async (bankData) => {
        try {
            const response = await api.post(routes.createBank, bankData);
            return response.data;
        } catch (error) {
            console.error('Error creating bank:', error);
            throw error;
        }
    },

    deleteBank: async (id) => {
        try {
            const response = await api.delete(routes.deleteBank(id));
            return response.data;
        } catch (error) {
            console.error('Error deleting bank:', error);
            throw error;
        }
    },

    // New methods for adjustments
    getPendingCustomerBills: async (customerCode) => {
        try {
            const response = await api.get(`/adjustments/pending-customer-bills?customer_code=${customerCode}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching pending customer bills:', error);
            throw error;
        }
    },

    getPendingFarmerBills: async (supplierCode) => {
        try {
            const response = await api.get(`/adjustments/pending-farmer-bills?supplier_code=${supplierCode}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching pending farmer bills:', error);
            throw error;
        }
    },

    applyPaymentAdjustment: async (adjustmentData) => {
        try {
            const response = await api.post('/adjustments/apply', adjustmentData);
            return response.data;
        } catch (error) {
            console.error('Error applying adjustment:', error);
            throw error;
        }
    }
};

export default bankService;