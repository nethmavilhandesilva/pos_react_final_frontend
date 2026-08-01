import api from '../api';

const bankService = {
    // Get all banks with balances from all four tables
    async getAllBanksWithBalances() {
        try {
            const response = await api.get('/banks/all-with-balances');
            return response.data;
        } catch (error) {
            console.error('Error fetching banks with balances:', error);
            throw error;
        }
    },

    // Get all banks
    async getAllBanks() {
        try {
            const response = await api.get('/banks');
            return response.data;
        } catch (error) {
            console.error('Error fetching banks:', error);
            throw error;
        }
    },

    // Get banks list for dropdown
    async getBanksList() {
        try {
            const response = await api.get('/banks/list');
            return response.data;
        } catch (error) {
            console.error('Error fetching banks list:', error);
            throw error;
        }
    },

    // Create a new bank
    async createBank(data) {
        try {
            const response = await api.post('/banks', data);
            return response.data;
        } catch (error) {
            console.error('Error creating bank:', error);
            throw error;
        }
    },

    // Update a bank
    async updateBank(id, data) {
        try {
            const response = await api.put(`/banks/${id}`, data);
            return response.data;
        } catch (error) {
            console.error('Error updating bank:', error);
            throw error;
        }
    },

    // Delete a bank
    async deleteBank(id) {
        try {
            const response = await api.delete(`/banks/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting bank:', error);
            throw error;
        }
    },

    // Get bank balance details for a specific bank
    async getBankBalanceDetails(id) {
        try {
            const response = await api.get(`/banks/${id}/balance-details`);
            return response.data;
        } catch (error) {
            console.error('Error fetching bank balance details:', error);
            throw error;
        }
    },

    // Get bank dashboard with summary
    async getBankDashboard(startDate, endDate) {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            const response = await api.get(`/banks/dashboard?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching bank dashboard:', error);
            throw error;
        }
    },

    // Get bank transactions
    async getBankTransactions(bankAccountId, params = {}) {
        try {
            const queryParams = new URLSearchParams(params);
            const url = bankAccountId 
                ? `/banks/${bankAccountId}/transactions?${queryParams.toString()}`
                : `/banks/transactions?${queryParams.toString()}`;
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching bank transactions:', error);
            throw error;
        }
    },

    // Get bank statement
    async getBankStatement(bankAccountId, startDate, endDate) {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            const response = await api.get(`/banks/${bankAccountId}/statement?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching bank statement:', error);
            throw error;
        }
    },

    // Get all accounts statement
    async getAllAccountsStatement(startDate, endDate) {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            const response = await api.get(`/banks/all-statement?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching all accounts statement:', error);
            throw error;
        }
    },

    // Get cheque report
    async getChequeReport(params = {}) {
        try {
            const queryParams = new URLSearchParams(params);
            const response = await api.get(`/banks/cheque-report?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching cheque report:', error);
            throw error;
        }
    },

    // Get bank transfer report
    async getBankTransferReport(params = {}) {
        try {
            const queryParams = new URLSearchParams(params);
            const response = await api.get(`/banks/bank-transfer-report?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching bank transfer report:', error);
            throw error;
        }
    },

    // Get monthly summary for charts
    async getMonthlySummary(year) {
        try {
            const params = new URLSearchParams();
            if (year) params.append('year', year);
            const response = await api.get(`/banks/monthly-summary?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching monthly summary:', error);
            throw error;
        }
    },

    // Export transactions
    async exportTransactions(params = {}) {
        try {
            const queryParams = new URLSearchParams(params);
            const response = await api.get(`/banks/export-transactions?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error exporting transactions:', error);
            throw error;
        }
    },

    // Get single transaction
    async getTransaction(id) {
        try {
            const response = await api.get(`/banks/transaction/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching transaction:', error);
            throw error;
        }
    },

    // Get bank balance
    async getBankBalance(bankAccountId) {
        try {
            const response = await api.get(`/banks/${bankAccountId}/balance`);
            return response.data;
        } catch (error) {
            console.error('Error fetching bank balance:', error);
            throw error;
        }
    }
};

export default bankService;