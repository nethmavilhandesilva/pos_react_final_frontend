import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../api';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Banknote,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  CreditCard,
  RefreshCcw,
  Package,
  Send,
  AlertTriangle,
  DollarSign as DollarIcon,
  Building2,
  FileText,
  Truck,
  History,
  Plus,
  Minus
} from 'lucide-react';

const BankStatement = () => {
  const navigate = useNavigate();
  
  const [statementData, setStatementData] = useState({
    bank: null,
    transactions: [],
    opening_balance: 0,
    closing_balance: 0,
    start_date: '',
    end_date: '',
    summary: { total_debit: 0, total_credit: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState('all');
  const [banks, setBanks] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date()
  });
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showIncomeExpense, setShowIncomeExpense] = useState(true);
  
  // Auto-refresh states
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const [refreshInterval] = useState(3000);
  const intervalRef = useRef(null);
  const isRefreshingRef = useRef(false);

  // Navigate to Payment Collection Report
  const handleAllTransactionsReport = () => {
    navigate('/payment-collection-report');
  };

  // Clear date range
  const handleClearDates = () => {
    setDateRange({
      start: '',
      end: ''
    });
  };

  // Fetch banks on component mount
  useEffect(() => {
    fetchBanks();
  }, []);

  // Fetch statement when dependencies change
  useEffect(() => {
    fetchStatement();
  }, [selectedBank, dateRange, filterType, searchTerm]);

  // Setup auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        if (!isRefreshingRef.current) {
          refreshDataSilently();
        }
      }, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [autoRefresh, selectedBank, dateRange, filterType, searchTerm]);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks/list');
      if (response.data.success) {
        setBanks(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const fetchStatement = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      let url;
      if (selectedBank === 'all') {
        url = '/bank-accounts/statement/all';
      } else {
        url = `/bank-accounts/statement/${selectedBank}`;
      }
      
      const params = {};
      if (dateRange.start && dateRange.start instanceof Date && !isNaN(dateRange.start)) {
        params.start_date = dateRange.start.toISOString().split('T')[0];
      }
      if (dateRange.end && dateRange.end instanceof Date && !isNaN(dateRange.end)) {
        params.end_date = dateRange.end.toISOString().split('T')[0];
      }
      
      const response = await api.get(url, { params });
      
      if (response.data.success) {
        let transactions = response.data.data.transactions || [];
        
        // Fetch income and expenses from income_expenses table
        let incomeExpenseTransactions = [];
        if (showIncomeExpense) {
          try {
            const ieResponse = await api.get('/income-expense-report', { params });
            if (ieResponse.data.success && ieResponse.data.data) {
              incomeExpenseTransactions = ieResponse.data.data
                .filter(t => t.loan_type === 'ingoing' || t.loan_type === 'outgoing')
                .map(t => ({
                  ...t,
                  is_income_expense: true,
                  date: t.Date,
                  description: t.description,
                  bank_name: 'Income/Expense',
                  payment_method: t.settling_way === 'cheque' ? 'Cheque' : (t.settling_way === 'bank_transfer' ? 'Bank Transfer' : 'Cash'),
                  adjustment_type: t.loan_type === 'ingoing' ? 'income' : 'expense',
                  debit: t.loan_type === 'ingoing' ? Math.abs(t.amount) : 0,
                  credit: t.loan_type === 'outgoing' ? Math.abs(t.amount) : 0,
                  balance: 0,
                  transaction_id: t.id,
                  source_table: 'income_expenses',
                  transaction_type: t.loan_type === 'ingoing' ? 'income' : 'expense',
                  user_id: t.user_id
                }));
            }
          } catch (ieError) {
            console.error('Error fetching income/expense data:', ieError);
          }
        }
        
        // Combine bank transactions with income/expense transactions
        let allTransactions = [...transactions, ...incomeExpenseTransactions];
        
        // Sort by date
        allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Calculate running balance including income/expense
        let runningBalance = response.data.data.opening_balance || 0;
        allTransactions = allTransactions.map(t => {
          if (t.is_income_expense) {
            if (t.loan_type === 'ingoing') {
              runningBalance += Math.abs(t.amount);
            } else if (t.loan_type === 'outgoing') {
              runningBalance -= Math.abs(t.amount);
            }
            t.balance = runningBalance;
          } else {
            if (t.debit > 0) runningBalance += t.debit;
            if (t.credit > 0) runningBalance -= t.credit;
            t.balance = runningBalance;
          }
          return t;
        });
        
        // Apply filters
        if (filterType === 'debit') {
          allTransactions = allTransactions.filter(t => t.debit > 0 || (t.loan_type === 'ingoing'));
        } else if (filterType === 'credit') {
          allTransactions = allTransactions.filter(t => t.credit > 0 || (t.loan_type === 'outgoing'));
        }
        
        if (searchTerm) {
          allTransactions = allTransactions.filter(t => 
            (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.bill_no && t.bill_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.cheq_no && t.cheq_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.transfer_reference_no && t.transfer_reference_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.customer_name && t.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.customer_code && t.customer_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.user_id && t.user_id.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }
        
        // Calculate totals including income/expense
        let totalDebit = (response.data.data.summary?.total_debit || 0);
        let totalCredit = (response.data.data.summary?.total_credit || 0);
        
        incomeExpenseTransactions.forEach(t => {
          if (t.loan_type === 'ingoing') totalDebit += Math.abs(t.amount);
          if (t.loan_type === 'outgoing') totalCredit += Math.abs(t.amount);
        });
        
        const closingBalance = runningBalance;
        
        setStatementData({
          ...response.data.data,
          transactions: allTransactions,
          closing_balance: closingBalance,
          summary: {
            total_debit: totalDebit,
            total_credit: totalCredit
          }
        });
        setLastRefreshTime(new Date());
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error fetching statement:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      isRefreshingRef.current = false;
    }
  };

  const refreshDataSilently = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    
    try {
      let url;
      if (selectedBank === 'all') {
        url = '/bank-accounts/statement/all';
      } else {
        url = `/bank-accounts/statement/${selectedBank}`;
      }
      
      const params = {};
      if (dateRange.start && dateRange.start instanceof Date && !isNaN(dateRange.start)) {
        params.start_date = dateRange.start.toISOString().split('T')[0];
      }
      if (dateRange.end && dateRange.end instanceof Date && !isNaN(dateRange.end)) {
        params.end_date = dateRange.end.toISOString().split('T')[0];
      }
      
      const response = await api.get(url, { params });
      
      if (response.data.success) {
        let transactions = response.data.data.transactions || [];
        
        let incomeExpenseTransactions = [];
        if (showIncomeExpense) {
          try {
            const ieResponse = await api.get('/income-expense-report', { params });
            if (ieResponse.data.success && ieResponse.data.data) {
              incomeExpenseTransactions = ieResponse.data.data
                .filter(t => t.loan_type === 'ingoing' || t.loan_type === 'outgoing')
                .map(t => ({
                  ...t,
                  is_income_expense: true,
                  date: t.Date,
                  description: t.description,
                  bank_name: 'Income/Expense',
                  payment_method: t.settling_way === 'cheque' ? 'Cheque' : (t.settling_way === 'bank_transfer' ? 'Bank Transfer' : 'Cash'),
                  adjustment_type: t.loan_type === 'ingoing' ? 'income' : 'expense',
                  debit: t.loan_type === 'ingoing' ? Math.abs(t.amount) : 0,
                  credit: t.loan_type === 'outgoing' ? Math.abs(t.amount) : 0,
                  balance: 0,
                  transaction_id: t.id,
                  source_table: 'income_expenses',
                  transaction_type: t.loan_type === 'ingoing' ? 'income' : 'expense',
                  user_id: t.user_id
                }));
            }
          } catch (ieError) {
            console.error('Error fetching income/expense data:', ieError);
          }
        }
        
        let allTransactions = [...transactions, ...incomeExpenseTransactions];
        allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let runningBalance = response.data.data.opening_balance || 0;
        allTransactions = allTransactions.map(t => {
          if (t.is_income_expense) {
            if (t.loan_type === 'ingoing') {
              runningBalance += Math.abs(t.amount);
            } else if (t.loan_type === 'outgoing') {
              runningBalance -= Math.abs(t.amount);
            }
            t.balance = runningBalance;
          } else {
            if (t.debit > 0) runningBalance += t.debit;
            if (t.credit > 0) runningBalance -= t.credit;
            t.balance = runningBalance;
          }
          return t;
        });
        
        if (filterType === 'debit') {
          allTransactions = allTransactions.filter(t => t.debit > 0 || (t.loan_type === 'ingoing'));
        } else if (filterType === 'credit') {
          allTransactions = allTransactions.filter(t => t.credit > 0 || (t.loan_type === 'outgoing'));
        }
        
        if (searchTerm) {
          allTransactions = allTransactions.filter(t => 
            (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.bill_no && t.bill_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.cheq_no && t.cheq_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.transfer_reference_no && t.transfer_reference_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.customer_name && t.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.customer_code && t.customer_code.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }
        
        let totalDebit = (response.data.data.summary?.total_debit || 0);
        let totalCredit = (response.data.data.summary?.total_credit || 0);
        
        incomeExpenseTransactions.forEach(t => {
          if (t.loan_type === 'ingoing') totalDebit += Math.abs(t.amount);
          if (t.loan_type === 'outgoing') totalCredit += Math.abs(t.amount);
        });
        
        setStatementData(prev => ({
          ...response.data.data,
          transactions: allTransactions,
          closing_balance: runningBalance,
          summary: {
            total_debit: totalDebit,
            total_credit: totalCredit
          }
        }));
        setLastRefreshTime(new Date());
      }
    } catch (error) {
      console.error('Auto-refresh error:', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [selectedBank, dateRange, filterType, searchTerm, showIncomeExpense]);

  const handleManualRefresh = async () => {
    await fetchStatement(true);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  const toggleIncomeExpense = () => {
    setShowIncomeExpense(prev => !prev);
    setTimeout(() => fetchStatement(true), 100);
  };

  const exportToCSV = () => {
    const csvData = [
      ['Date', 'Description', 'Bank Account', 'Payment Method', 'Transaction Type', 'Source', 'Reference No', 'Debit (Dr)', 'Credit (Cr)', 'Balance', 'User ID'],
      ...statementData.transactions.map(t => [
        t.date,
        t.description,
        t.bank_name || 'N/A',
        t.payment_method || (t.cheq_no ? 'Cheque' : (t.transfer_reference_no ? 'Bank Transfer' : 'Cash')),
        t.transaction_type === 'income' ? '💰 Income' : (t.transaction_type === 'expense' ? '📉 Expense' : (t.transaction_type === 'supplier_payment' ? '🏭 Supplier Payment' : '👤 Customer Sale')),
        t.source_table || 'N/A',
        t.cheq_no || t.transfer_reference_no || '-',
        t.debit > 0 ? t.debit : (t.loan_type === 'ingoing' ? Math.abs(t.amount) : '-'),
        t.credit > 0 ? t.credit : (t.loan_type === 'outgoing' ? Math.abs(t.amount) : '-'),
        t.balance,
        t.user_id || '-'
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank_statement_${selectedBank === 'all' ? 'all_accounts' : statementData.bank?.bank_name}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printStatement = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bank Statement - ${selectedBank === 'all' ? 'All Accounts' : statementData.bank?.bank_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: white; }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #4F46E5; }
            h1 { color: #1F2937; margin-bottom: 10px; }
            h2 { color: #4B5563; font-size: 18px; margin-bottom: 5px; }
            .period { color: #6B7280; font-size: 14px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .summary-card { padding: 15px; background: #F9FAFB; border-radius: 8px; text-align: center; }
            .summary-label { font-size: 12px; color: #6B7280; margin-bottom: 8px; }
            .summary-value { font-size: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
            th { background-color: #F3F4F6; font-weight: 600; }
            .text-right { text-align: right; }
            .debit { color: #DC2626; }
            .credit { color: #10B981; }
            .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; display: inline-block; font-weight: 600; }
            .badge-cash { background: #10B981; color: white; }
            .badge-cheque { background: #8B5CF6; color: white; }
            .badge-transfer { background: #EC489A; color: white; }
            .badge-supplier { background: #F59E0B; color: white; }
            .badge-customer { background: #3B82F6; color: white; }
            .badge-income { background: #10B981; color: white; }
            .badge-expense { background: #EF4444; color: white; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6B7280; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bank Statement with Income & Expenses</h1>
            <h2>${selectedBank === 'all' ? 'ALL BANK ACCOUNTS' : `${statementData.bank?.bank_name} - ${statementData.bank?.account_no}`}</h2>
            <p class="period">Period: ${statementData.start_date || 'All time'} to ${statementData.end_date || 'All time'}</p>
          </div>
          <div class="summary">
            <div class="summary-card">
              <div class="summary-label">Opening Balance</div>
              <div class="summary-value">Rs${(statementData.opening_balance || 0).toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Debit (Dr)</div>
              <div class="summary-value" style="color:#DC2626">Rs${(statementData.summary?.total_debit || 0).toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Credit (Cr)</div>
              <div class="summary-value" style="color:#10B981">Rs${(statementData.summary?.total_credit || 0).toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Closing Balance</div>
              <div class="summary-value">Rs${(statementData.closing_balance || 0).toLocaleString()}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Bank Account</th>
                <th>Payment Method</th>
                <th>Transaction Type</th>
                <th>Reference No</th>
                <th class="text-right">Debit (Dr)</th>
                <th class="text-right">Credit (Cr)</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background:#FEF3C7">
                <td colspan="8"><strong>Opening Balance</strong></td>
                <td class="text-right"><strong>Rs${(statementData.opening_balance || 0).toLocaleString()}</strong></td>
              </tr>
              ${statementData.transactions.map(t => {
                let badgeClass = '';
                if (t.transaction_type === 'supplier_payment') badgeClass = 'badge-supplier';
                else if (t.transaction_type === 'customer_sale') badgeClass = 'badge-customer';
                else if (t.transaction_type === 'income') badgeClass = 'badge-income';
                else if (t.transaction_type === 'expense') badgeClass = 'badge-expense';
                
                let paymentBadge = '';
                if (t.payment_method === 'Bank Transfer') paymentBadge = 'badge-transfer';
                else if (t.payment_method === 'Cheque') paymentBadge = 'badge-cheque';
                else paymentBadge = 'badge-cash';
                
                const displayDebit = t.debit > 0 ? t.debit : (t.loan_type === 'ingoing' ? Math.abs(t.amount) : 0);
                const displayCredit = t.credit > 0 ? t.credit : (t.loan_type === 'outgoing' ? Math.abs(t.amount) : 0);
                
                return `
                <tr>
                  <td>${t.date || '-'}</td>
                  <td>${t.description || '-'}</td>
                  <td>${t.bank_name || '-'}</td>
                  <td><span class="badge ${paymentBadge}">${t.payment_method || 'Cash'}</span></td>
                  <td><span class="badge ${badgeClass}">${t.transaction_type === 'income' ? '💰 Income' : (t.transaction_type === 'expense' ? '📉 Expense' : (t.transaction_type === 'supplier_payment' ? '🏭 Supplier Payment' : '👤 Customer Sale'))}</span></td>
                  <td>${t.cheq_no || t.transfer_reference_no || '-'}</td>
                  <td class="text-right debit">${displayDebit > 0 ? `Rs${displayDebit.toLocaleString()}` : '-'}</td>
                  <td class="text-right credit">${displayCredit > 0 ? `Rs${displayCredit.toLocaleString()}` : '-'}</td>
                  <td class="text-right">Rs${(t.balance || 0).toLocaleString()}</td>
                </tr>`;
              }).join('')}
              <tr style="background:#E0E7FF">
                <td colspan="8"><strong>Closing Balance</strong></td>
                <td class="text-right"><strong>Rs${(statementData.closing_balance || 0).toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>This is a computer generated statement</p>
            <p><strong>Note:</strong> Debit (Dr) = Money Received (Customer Payments + Income), Credit (Cr) = Money Paid Out (Customer Sales + Supplier Payments + Expenses)</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const viewTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const getPaymentMethodIcon = (transaction) => {
    if (transaction.transfer_reference_no) {
      return <Upload size={14} style={{ marginRight: '5px' }} />;
    } else if (transaction.cheq_no) {
      return <CreditCard size={14} style={{ marginRight: '5px' }} />;
    }
    return <DollarIcon size={14} style={{ marginRight: '5px' }} />;
  };

  const getTransactionTypeIcon = (transaction) => {
    if (transaction.transaction_type === 'supplier_payment') {
      return <Truck size={14} style={{ marginRight: '4px' }} />;
    } else if (transaction.transaction_type === 'income') {
      return <TrendingUp size={14} style={{ marginRight: '4px' }} />;
    } else if (transaction.transaction_type === 'expense') {
      return <TrendingDown size={14} style={{ marginRight: '4px' }} />;
    }
    return null;
  };

  const getPaymentMethodBadge = (transaction) => {
    if (transaction.transfer_reference_no) {
      return {
        text: 'Bank Transfer',
        style: { backgroundColor: '#EC489A', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }
      };
    } else if (transaction.cheq_no) {
      return {
        text: 'Cheque',
        style: { backgroundColor: '#8B5CF6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }
      };
    }
    return {
      text: 'Cash',
      style: { backgroundColor: '#10B981', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }
    };
  };

  const getTransactionTypeBadge = (transaction) => {
    if (transaction.transaction_type === 'supplier_payment') {
      return {
        text: '🏭 Supplier Payment',
        style: { backgroundColor: '#F59E0B', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }
      };
    } else if (transaction.transaction_type === 'income') {
      return {
        text: '💰 Income',
        style: { backgroundColor: '#10B981', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }
      };
    } else if (transaction.transaction_type === 'expense') {
      return {
        text: '📉 Expense',
        style: { backgroundColor: '#EF4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }
      };
    }
    return {
      text: '👤 Customer Sale',
      style: { backgroundColor: '#3B82F6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }
    };
  };

  const formatLastRefreshTime = () => {
    return lastRefreshTime.toLocaleTimeString();
  };

  const getSelectedBankName = () => {
    if (selectedBank === 'all') return 'All Bank Accounts';
    const bank = banks.find(b => b.id === parseInt(selectedBank));
    return bank ? `${bank.bank_name} - ${bank.account_no}` : 'Select Bank';
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = statementData.transactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(statementData.transactions.length / itemsPerPage);

  // Styles
  const styles = {
    container: {
      width: '100vw',
      minHeight: '100vh',
      backgroundColor: '#F3F4F6',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      margin: 0,
      padding: 0,
      overflowX: 'hidden',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    },
    header: {
      backgroundColor: '#1F2937',
      color: 'white',
      padding: '20px 30px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      width: '100%'
    },
    headerContent: {
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '15px'
    },
    titleSection: {
      flex: 1
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      margin: '0 0 5px 0'
    },
    subtitle: {
      fontSize: '14px',
      color: '#9CA3AF',
      margin: '0'
    },
    actionButtons: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    reportBtn: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s',
      backgroundColor: '#F59E0B',
      color: 'white'
    },
    actionBtn: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s'
    },
    autoRefreshBtn: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s',
      backgroundColor: '#EC489A',
      color: 'white'
    },
    incomeExpenseBtn: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s',
      backgroundColor: '#10B981',
      color: 'white'
    },
    refreshStatus: {
      fontSize: '12px',
      color: '#9CA3AF',
      marginLeft: '10px',
      marginTop: '8px'
    },
    mainContent: {
      width: '100%',
      padding: '20px 30px'
    },
    filtersCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
      overflow: 'hidden',
      width: '100%'
    },
    filtersHeader: {
      padding: '15px 20px',
      backgroundColor: '#F9FAFB',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer'
    },
    filtersTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#374151',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    filtersBody: {
      padding: '20px',
      display: showFilters ? 'block' : 'none'
    },
    filterGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#374151'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px'
    },
    dateInputGroup: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    },
    clearDateBtn: {
      padding: '8px 12px',
      backgroundColor: '#EF4444',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap'
    },
    searchBox: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px'
    },
    searchInput: {
      flex: 1,
      padding: '10px 15px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px'
    },
    filterButtons: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap'
    },
    filterBtn: {
      padding: '8px 16px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.3s'
    },
    activeFilterBtn: {
      backgroundColor: '#4F46E5',
      color: 'white',
      border: 'none'
    },
    summaryCards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '20px',
      marginBottom: '20px',
      width: '100%'
    },
    summaryCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
      transition: 'transform 0.3s, box-shadow 0.3s',
      cursor: 'pointer'
    },
    summaryHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px'
    },
    summaryLabel: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    summaryValue: {
      fontSize: '28px',
      fontWeight: 'bold',
      marginBottom: '5px'
    },
    statementTable: {
      backgroundColor: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
      width: '100%'
    },
    tableHeader: {
      padding: '15px 20px',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '15px',
      backgroundColor: '#F9FAFB'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: '1200px'
    },
    th: {
      padding: '12px 15px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#6B7280',
      borderBottom: '2px solid #E5E7EB',
      backgroundColor: '#F9FAFB'
    },
    td: {
      padding: '12px 15px',
      fontSize: '13px',
      borderBottom: '1px solid #F3F4F6'
    },
    clickableRow: {
      cursor: 'pointer',
      transition: 'background-color 0.3s'
    },
    debitAmount: {
      color: '#DC2626',
      fontWeight: '600'
    },
    creditAmount: {
      color: '#10B981',
      fontWeight: '600'
    },
    pagination: {
      padding: '15px 20px',
      borderTop: '1px solid #E5E7EB',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '10px'
    },
    paginationButton: {
      padding: '8px 12px',
      border: '1px solid #D1D5DB',
      borderRadius: '6px',
      backgroundColor: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '13px'
    },
    pageInfo: {
      fontSize: '14px',
      color: '#6B7280'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '12px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto'
    },
    modalHeader: {
      padding: '20px',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    modalBody: {
      padding: '20px'
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid #F3F4F6'
    },
    loadingSpinner: {
      textAlign: 'center',
      padding: '60px',
      fontSize: '16px',
      color: '#6B7280'
    },
    footer: {
      textAlign: 'center',
      padding: '20px',
      fontSize: '12px',
      color: '#9CA3AF',
      width: '100%'
    }
  };

  const globalStyles = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .custom-datepicker {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
    }
    
    .custom-datepicker:focus {
      outline: none;
      border-color: #4F46E5;
      box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
    }
    
    .react-datepicker-wrapper {
      width: 100%;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
    }
    
    #root {
      margin: 0;
      padding: 0;
    }
  `;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.titleSection}>
              <h1 style={styles.title}>Bank Statement with Income & Expenses</h1>
              <p style={styles.subtitle}>Complete transaction history including bank transactions, income & expenses</p>
            </div>
            <div style={styles.actionButtons}>
              <button
                onClick={handleAllTransactionsReport}
                style={styles.reportBtn}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F59E0B'}
              >
                <FileText size={16} />
                All Transactions Report
              </button>
              
              <button
                onClick={toggleIncomeExpense}
                style={{...styles.incomeExpenseBtn, backgroundColor: showIncomeExpense ? '#10B981' : '#6B7280'}}
                title={showIncomeExpense ? 'Showing Income & Expenses' : 'Hide Income & Expenses'}
              >
                {showIncomeExpense ? <Plus size={16} /> : <Minus size={16} />}
                {showIncomeExpense ? 'Hide Income/Expense' : 'Show Income/Expense'}
              </button>
              
              <button
                onClick={toggleAutoRefresh}
                style={{...styles.autoRefreshBtn, backgroundColor: autoRefresh ? '#10B981' : '#6B7280'}}
                title={autoRefresh ? 'Auto-refresh is ON - Updates every 3 seconds' : 'Auto-refresh is OFF - Click to enable'}
              >
                <RefreshCcw size={16} />
                {autoRefresh ? 'Live Updates ON' : 'Live Updates OFF'}
              </button>
              
              <button
                onClick={exportToCSV}
                style={{...styles.actionBtn, backgroundColor: '#10B981', color: 'white'}}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
              >
                <Download size={16} /> Export
              </button>
              <button
                onClick={printStatement}
                style={{...styles.actionBtn, backgroundColor: '#6B7280', color: 'white'}}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4B5563'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6B7280'}
              >
                <Printer size={16} /> Print
              </button>
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                style={{...styles.actionBtn, backgroundColor: '#4F46E5', color: 'white', opacity: loading ? 0.6 : 1}}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4338CA'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4F46E5'}
              >
                <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                Refresh
              </button>
            </div>
          </div>
          {autoRefresh && (
            <div style={styles.refreshStatus}>
              🔄 Live updates every 3 seconds (silent refresh) • Last updated: {formatLastRefreshTime()}
            </div>
          )}
        </div>

        <div style={styles.mainContent}>
          {/* Filters Card */}
          <div style={styles.filtersCard}>
            <div style={styles.filtersHeader} onClick={() => setShowFilters(!showFilters)}>
              <div style={styles.filtersTitle}>
                <Filter size={18} />
                Filters & Options
              </div>
              {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            <div style={styles.filtersBody}>
              <div style={styles.filterGrid}>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>
                    <Building2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Bank Account
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    style={styles.select}
                  >
                    <option value="all">🏦 All Bank Accounts</option>
                    {banks.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bank_name} - {bank.account_no} ({bank.branch})
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                    Currently viewing: <strong>{getSelectedBankName()}</strong>
                  </div>
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>Start Date</label>
                  <DatePicker
                    selected={dateRange.start}
                    onChange={(date) => setDateRange({ ...dateRange, start: date })}
                    dateFormat="yyyy-MM-dd"
                    className="custom-datepicker"
                    placeholderText="Select start date"
                    isClearable={true}
                  />
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>End Date</label>
                  <div style={styles.dateInputGroup}>
                    <DatePicker
                      selected={dateRange.end}
                      onChange={(date) => setDateRange({ ...dateRange, end: date })}
                      dateFormat="yyyy-MM-dd"
                      className="custom-datepicker"
                      placeholderText="Select end date"
                      isClearable={true}
                    />
                    <button
                      onClick={handleClearDates}
                      style={styles.clearDateBtn}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
                    >
                      <X size={14} />
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              
              <div style={styles.searchBox}>
                <Search size={18} style={{ alignSelf: 'center', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Search by description, bill number, cheque number, transfer reference, bank name, supplier code, or transaction type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              
              <div style={styles.filterButtons}>
                <button
                  onClick={() => setFilterType('all')}
                  style={{
                    ...styles.filterBtn,
                    ...(filterType === 'all' ? styles.activeFilterBtn : {})
                  }}
                >
                  All Transactions
                </button>
                <button
                  onClick={() => setFilterType('debit')}
                  style={{
                    ...styles.filterBtn,
                    ...(filterType === 'debit' ? styles.activeFilterBtn : {})
                  }}
                >
                  Debit Only (Dr) - Money In (Income + Customer Payments)
                </button>
                <button
                  onClick={() => setFilterType('credit')}
                  style={{
                    ...styles.filterBtn,
                    ...(filterType === 'credit' ? styles.activeFilterBtn : {})
                  }}
                >
                  Credit Only (Cr) - Money Out (Expenses + Supplier Payments)
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={styles.summaryCards}>
            <div 
              style={styles.summaryCard}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={styles.summaryHeader}>
                <span style={styles.summaryLabel}>Opening Balance</span>
                <DollarSign size={20} color="#4F46E5" />
              </div>
              <div style={{...styles.summaryValue, color: '#4F46E5'}}>
                Rs{(statementData.opening_balance || 0).toLocaleString()}
              </div>
            </div>
            <div 
              style={styles.summaryCard}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={styles.summaryHeader}>
                <span style={styles.summaryLabel}>Total Debit (Dr)</span>
                <TrendingDown size={20} color="#DC2626" />
              </div>
              <div style={{...styles.summaryValue, color: '#DC2626'}}>
                Rs{(statementData.summary?.total_debit || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '5px' }}>
                Money Received (Customer Payments + Income)
              </div>
            </div>
            <div 
              style={styles.summaryCard}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={styles.summaryHeader}>
                <span style={styles.summaryLabel}>Total Credit (Cr)</span>
                <TrendingUp size={20} color="#10B981" />
              </div>
              <div style={{...styles.summaryValue, color: '#10B981'}}>
                Rs{(statementData.summary?.total_credit || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '5px' }}>
                Money Paid Out (Supplier Payments + Expenses)
              </div>
            </div>
            <div 
              style={styles.summaryCard}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={styles.summaryHeader}>
                <span style={styles.summaryLabel}>Closing Balance</span>
                <Banknote size={20} color="#4F46E5" />
              </div>
              <div style={{...styles.summaryValue, color: '#4F46E5'}}>
                Rs{(statementData.closing_balance || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Statement Table */}
          <div style={styles.statementTable}>
            <div style={styles.tableHeader}>
              <div>
                <strong style={{ fontSize: '16px' }}>
                  {selectedBank === 'all' ? 'ALL BANK ACCOUNTS' : `${statementData.bank?.bank_name} - ${statementData.bank?.account_no}`}
                </strong>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '5px' }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '5px' }} />
                  Period: {statementData.start_date || 'All time'} to {statementData.end_date || 'All time'}
                </div>
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>
                Total Transactions: {statementData.transactions.length}
              </div>
            </div>
            
            {loading ? (
              <div style={styles.loadingSpinner}>
                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                <p>Loading statement data...</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Description</th>
                        <th style={styles.th}>Bank Account</th>
                        <th style={styles.th}>Payment Method</th>
                        <th style={styles.th}>Transaction Type</th>
                        <th style={styles.th}>Reference No</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Debit (Dr)</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Credit (Cr)</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Balance (Rs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: '#FEF3C7' }}>
                        <td style={styles.td} colSpan="8">
                          <strong>Opening Balance</strong>
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          <strong>Rs{(statementData.opening_balance || 0).toLocaleString()}</strong>
                        </td>
                      </tr>
                      
                      {currentTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{...styles.td, textAlign: 'center', padding: '40px' }}>
                            No transactions found for the selected period
                          </td>
                        </tr>
                      ) : (
                        currentTransactions.map((transaction, index) => {
                          const paymentBadge = getPaymentMethodBadge(transaction);
                          const transactionTypeBadge = getTransactionTypeBadge(transaction);
                          const displayDebit = transaction.debit > 0 ? transaction.debit : (transaction.loan_type === 'ingoing' ? Math.abs(transaction.amount) : 0);
                          const displayCredit = transaction.credit > 0 ? transaction.credit : (transaction.loan_type === 'outgoing' ? Math.abs(transaction.amount) : 0);
                          return (
                            <tr 
                              key={index} 
                              style={{...styles.clickableRow, backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB'}}
                              onClick={() => viewTransactionDetails(transaction)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#F9FAFB'}
                            >
                              <td style={styles.td}>{transaction.date || '-'}</td>
                              <td style={styles.td}>
                                {transaction.description}
                                {transaction.transfer_notes && (
                                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                                    Notes: {transaction.transfer_notes}
                                  </div>
                                )}
                                {transaction.source_table && (
                                  <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '3px' }}>
                                    Source: {transaction.source_table}
                                  </div>
                                )}
                                {transaction.user_id && (
                                  <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '3px' }}>
                                    User: {transaction.user_id}
                                  </div>
                                )}
                              </td>
                              <td style={styles.td}>
                                <strong>{transaction.bank_name || '-'}</strong>
                              </td>
                              <td style={styles.td}>
                                <span style={paymentBadge.style}>
                                  {getPaymentMethodIcon(transaction)}
                                  {paymentBadge.text}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <span style={transactionTypeBadge.style}>
                                  {getTransactionTypeIcon(transaction)}
                                  {transactionTypeBadge.text}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {transaction.cheq_no || transaction.transfer_reference_no || '-'}
                              </td>
                              <td style={{...styles.td, textAlign: 'right'}}>
                                {displayDebit > 0 ? (
                                  <span style={styles.debitAmount}>Rs{displayDebit.toLocaleString()}</span>
                                ) : '-'}
                              </td>
                              <td style={{...styles.td, textAlign: 'right'}}>
                                {displayCredit > 0 ? (
                                  <span style={styles.creditAmount}>Rs{displayCredit.toLocaleString()}</span>
                                ) : '-'}
                              </td>
                              <td style={{...styles.td, textAlign: 'right'}}>
                                <span style={{ fontWeight: '600' }}>Rs{(transaction.balance || 0).toLocaleString()}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                      
                      <tr style={{ backgroundColor: '#E0E7FF' }}>
                        <td style={styles.td} colSpan="8">
                          <strong>Closing Balance</strong>
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          <strong>Rs{(statementData.closing_balance || 0).toLocaleString()}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={styles.pagination}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{...styles.paginationButton, opacity: currentPage === 1 ? 0.5 : 1}}
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <div style={styles.pageInfo}>
                      Page {currentPage} of {totalPages}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{...styles.paginationButton, opacity: currentPage === totalPages ? 0.5 : 1}}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={styles.footer}>
            <p>Generated on: {new Date().toLocaleString()}</p>
            <p>This is a computer generated statement</p>
            <p><strong>Note:</strong> Debit (Dr) = Money Received (Customer Payments + Income), Credit (Cr) = Money Paid Out (Supplier Payments + Expenses)</p>
          </div>
        </div>

        {/* Transaction Details Modal */}
        {showModal && selectedTransaction && (
          <div style={styles.modal} onClick={() => setShowModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0 }}>Transaction Details</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.detailRow}>
                  <strong>Date:</strong>
                  <span>{selectedTransaction.date || '-'}</span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Description:</strong>
                  <span>{selectedTransaction.description || '-'}</span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Bank Account:</strong>
                  <span><strong>{selectedTransaction.bank_name || 'N/A'}</strong></span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Transaction Type:</strong>
                  <span>
                    {selectedTransaction.transaction_type === 'supplier_payment' ? '🏭 Supplier Payment' : 
                     selectedTransaction.transaction_type === 'income' ? '💰 Income' :
                     selectedTransaction.transaction_type === 'expense' ? '📉 Expense' : '👤 Customer Sale'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Source:</strong>
                  <span>
                    {selectedTransaction.source_table === 'supplier_loan' ? 'Current Supplier Loan' :
                     selectedTransaction.source_table === 'supplier_loan_history' ? 'Archived Supplier Loan' :
                     selectedTransaction.source_table === 'sales' ? 'Current Sale' :
                     selectedTransaction.source_table === 'sales_history' ? 'Archived Sale' :
                     selectedTransaction.source_table === 'income_expenses' ? 'Income/Expense Entry' : 'N/A'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Payment Method:</strong>
                  <span>
                    {selectedTransaction.payment_method === 'Bank Transfer' ? '🏦 Bank Transfer' : 
                     (selectedTransaction.payment_method === 'Cheque' ? '💳 Cheque' : '💰 Cash')}
                  </span>
                </div>
                {selectedTransaction.cheq_no && (
                  <div style={styles.detailRow}>
                    <strong>Cheque Number:</strong>
                    <span>{selectedTransaction.cheq_no}</span>
                  </div>
                )}
                {selectedTransaction.transfer_reference_no && (
                  <>
                    <div style={styles.detailRow}>
                      <strong>Transfer Reference:</strong>
                      <span>{selectedTransaction.transfer_reference_no}</span>
                    </div>
                    {selectedTransaction.transfer_date && (
                      <div style={styles.detailRow}>
                        <strong>Transfer Date:</strong>
                        <span>{selectedTransaction.transfer_date}</span>
                      </div>
                    )}
                    {selectedTransaction.transfer_notes && (
                      <div style={styles.detailRow}>
                        <strong>Notes:</strong>
                        <span>{selectedTransaction.transfer_notes}</span>
                      </div>
                    )}
                  </>
                )}
                <div style={styles.detailRow}>
                  <strong>Debit (Dr):</strong>
                  <span style={{ color: '#DC2626', fontWeight: 'bold' }}>
                    {selectedTransaction.debit > 0 ? `Rs${selectedTransaction.debit.toLocaleString()}` : 
                     (selectedTransaction.loan_type === 'ingoing' ? `Rs${Math.abs(selectedTransaction.amount).toLocaleString()}` : '-')}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Credit (Cr):</strong>
                  <span style={{ color: '#10B981', fontWeight: 'bold' }}>
                    {selectedTransaction.credit > 0 ? `Rs${selectedTransaction.credit.toLocaleString()}` : 
                     (selectedTransaction.loan_type === 'outgoing' ? `Rs${Math.abs(selectedTransaction.amount).toLocaleString()}` : '-')}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Balance:</strong>
                  <span style={{ fontWeight: 'bold' }}>Rs{(selectedTransaction.balance || 0).toLocaleString()}</span>
                </div>
                {selectedTransaction.bill_no && (
                  <div style={styles.detailRow}>
                    <strong>Bill Number:</strong>
                    <span>#{selectedTransaction.bill_no}</span>
                  </div>
                )}
                {selectedTransaction.customer_name && (
                  <div style={styles.detailRow}>
                    <strong>{selectedTransaction.transaction_type === 'supplier_payment' ? 'Supplier Code:' : 'Customer:'}</strong>
                    <span>{selectedTransaction.customer_name}</span>
                  </div>
                )}
                {selectedTransaction.user_id && (
                  <div style={styles.detailRow}>
                    <strong>User ID:</strong>
                    <span>{selectedTransaction.user_id}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BankStatement;