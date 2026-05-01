import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
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
  X
} from 'lucide-react';

// Set base URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const BankStatement = () => {
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
  const [selectedBank, setSelectedBank] = useState('');
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

  // Create axios instance with base URL
  const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    withCredentials: true
  });

  const token = localStorage.getItem('token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    if (selectedBank) {
      fetchStatement();
    }
  }, [selectedBank, dateRange, filterType, searchTerm]);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/api/banks/list');
      if (response.data.success) {
        setBanks(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedBank(response.data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/bank-accounts/statement/${selectedBank}`, {
        params: {
          start_date: dateRange.start.toISOString().split('T')[0],
          end_date: dateRange.end.toISOString().split('T')[0]
        }
      });
      if (response.data.success) {
        let transactions = response.data.data.transactions;
        
        if (filterType === 'debit') {
          transactions = transactions.filter(t => t.debit > 0);
        } else if (filterType === 'credit') {
          transactions = transactions.filter(t => t.credit > 0);
        }
        
        if (searchTerm) {
          transactions = transactions.filter(t => 
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.cheq_no && t.cheq_no.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }
        
        setStatementData({
          ...response.data.data,
          transactions: transactions
        });
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error fetching statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvData = [
      ['Date', 'Description', 'Cheque No', 'Debit (Dr)', 'Credit (Cr)', 'Balance'],
      ...statementData.transactions.map(t => [
        t.date,
        t.description,
        t.cheq_no || '-',
        t.debit > 0 ? t.debit : '-',
        t.credit > 0 ? t.credit : '-',
        t.balance
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank_statement_${statementData.bank?.bank_name}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printStatement = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bank Statement - ${statementData.bank?.bank_name}</title>
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
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6B7280; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bank Statement</h1>
            <h2>${statementData.bank?.bank_name} - ${statementData.bank?.account_no}</h2>
            <p class="period">Period: ${statementData.start_date} to ${statementData.end_date}</p>
          </div>
          <div class="summary">
            <div class="summary-card">
              <div class="summary-label">Opening Balance</div>
              <div class="summary-value">Rs${statementData.opening_balance.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Debit (Dr)</div>
              <div class="summary-value" style="color:#DC2626">Rs${statementData.summary.total_debit.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Credit (Cr)</div>
              <div class="summary-value" style="color:#10B981">Rs${statementData.summary.total_credit.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Closing Balance</div>
              <div class="summary-value">Rs${statementData.closing_balance.toLocaleString()}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Cheque No</th>
                <th class="text-right">Debit (Dr)</th>
                <th class="text-right">Credit (Cr)</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background:#FEF3C7">
                <td colspan="5"><strong>Opening Balance</strong></td>
                <td class="text-right"><strong>Rs${statementData.opening_balance.toLocaleString()}</strong></td>
              </tr>
              ${statementData.transactions.map(t => `
                <tr>
                  <td>${t.date}</td>
                  <td>${t.description}</td>
                  <td>${t.cheq_no || '-'}</td>
                  <td class="text-right debit">${t.debit > 0 ? `Rs${t.debit.toLocaleString()}` : '-'}</td>
                  <td class="text-right credit">${t.credit > 0 ? `Rs${t.credit.toLocaleString()}` : '-'}</td>
                  <td class="text-right">Rs${t.balance.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr style="background:#E0E7FF">
                <td colspan="5"><strong>Closing Balance</strong></td>
                <td class="text-right"><strong>Rs${statementData.closing_balance.toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>This is a computer generated statement</p>
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

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = statementData.transactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(statementData.transactions.length / itemsPerPage);

  // Full-screen styles without any max-width constraints
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
      gap: '10px'
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
      minWidth: '800px'
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

  // Add global styles for animations and datepicker
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
      ring: 2px solid #4F46E5;
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
              <h1 style={styles.title}>Bank Statement</h1>
              <p style={styles.subtitle}>Complete transaction history with debit/credit entries</p>
            </div>
            <div style={styles.actionButtons}>
              <button
                onClick={exportToCSV}
                style={{...styles.actionBtn, backgroundColor: '#10B981', color: 'white'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#10B981'}
              >
                <Download size={16} /> Export
              </button>
              <button
                onClick={printStatement}
                style={{...styles.actionBtn, backgroundColor: '#6B7280', color: 'white'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4B5563'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6B7280'}
              >
                <Printer size={16} /> Print
              </button>
              <button
                onClick={fetchStatement}
                style={{...styles.actionBtn, backgroundColor: '#4F46E5', color: 'white'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4338CA'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#4F46E5'}
              >
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </div>
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
                  <label style={styles.label}>Bank Account</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    style={styles.select}
                  >
                    {banks.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bank_name} - {bank.account_no} ({bank.branch})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>Start Date</label>
                  <DatePicker
                    selected={dateRange.start}
                    onChange={(date) => setDateRange({ ...dateRange, start: date })}
                    dateFormat="yyyy-MM-dd"
                    className="custom-datepicker"
                  />
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>End Date</label>
                  <DatePicker
                    selected={dateRange.end}
                    onChange={(date) => setDateRange({ ...dateRange, end: date })}
                    dateFormat="yyyy-MM-dd"
                    className="custom-datepicker"
                  />
                </div>
              </div>
              
              <div style={styles.searchBox}>
                <Search size={18} style={{ alignSelf: 'center', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Search by description, bill number, or cheque number..."
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
                  Debit Only (Dr)
                </button>
                <button
                  onClick={() => setFilterType('credit')}
                  style={{
                    ...styles.filterBtn,
                    ...(filterType === 'credit' ? styles.activeFilterBtn : {})
                  }}
                >
                  Credit Only (Cr)
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {statementData.bank && (
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
                  Rs{statementData.opening_balance.toLocaleString()}
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
                  Rs{statementData.summary.total_debit.toLocaleString()}
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
                  Rs{statementData.summary.total_credit.toLocaleString()}
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
                  Rs{statementData.closing_balance.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Statement Table */}
          <div style={styles.statementTable}>
            <div style={styles.tableHeader}>
              <div>
                <strong style={{ fontSize: '16px' }}>
                  {statementData.bank?.bank_name} - {statementData.bank?.account_no}
                </strong>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '5px' }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '5px' }} />
                  Period: {statementData.start_date} to {statementData.end_date}
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
                        <th style={styles.th}>Cheque No</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Debit (Dr)</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Credit (Cr)</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Balance (Rs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: '#FEF3C7' }}>
                        <td style={styles.td} colSpan="5">
                          <strong>Opening Balance</strong>
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          <strong>Rs{statementData.opening_balance.toLocaleString()}</strong>
                        </td>
                      </tr>
                      
                      {currentTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{...styles.td, textAlign: 'center', padding: '40px' }}>
                            No transactions found for the selected period
                          </td>
                        </tr>
                      ) : (
                        currentTransactions.map((transaction, index) => (
                          <tr 
                            key={index} 
                            style={{...styles.clickableRow, backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB'}}
                            onClick={() => viewTransactionDetails(transaction)}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#F9FAFB'}
                          >
                            <td style={styles.td}>{transaction.date}</td>
                            <td style={styles.td}>
                              {transaction.description}
                              {transaction.cheq_no && (
                                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                                  Cheque: {transaction.cheq_no}
                                </div>
                              )}
                            </td>
                            <td style={styles.td}>{transaction.cheq_no || '-'}</td>
                            <td style={{...styles.td, textAlign: 'right'}}>
                              {transaction.debit > 0 ? (
                                <span style={styles.debitAmount}>Rs{transaction.debit.toLocaleString()}</span>
                              ) : '-'}
                            </td>
                            <td style={{...styles.td, textAlign: 'right'}}>
                              {transaction.credit > 0 ? (
                                <span style={styles.creditAmount}>Rs{transaction.credit.toLocaleString()}</span>
                              ) : '-'}
                            </td>
                            <td style={{...styles.td, textAlign: 'right'}}>
                              <span style={{ fontWeight: '600' }}>Rs{transaction.balance.toLocaleString()}</span>
                            </td>
                          </tr>
                        ))
                      )}
                      
                      <tr style={{ backgroundColor: '#E0E7FF' }}>
                        <td style={styles.td} colSpan="5">
                          <strong>Closing Balance</strong>
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          <strong>Rs{statementData.closing_balance.toLocaleString()}</strong>
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
                  <span>{selectedTransaction.date}</span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Description:</strong>
                  <span>{selectedTransaction.description}</span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Cheque No:</strong>
                  <span>{selectedTransaction.cheq_no || '-'}</span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Debit (Dr):</strong>
                  <span style={{ color: '#DC2626', fontWeight: 'bold' }}>
                    {selectedTransaction.debit > 0 ? `Rs${selectedTransaction.debit.toLocaleString()}` : '-'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Credit (Cr):</strong>
                  <span style={{ color: '#10B981', fontWeight: 'bold' }}>
                    {selectedTransaction.credit > 0 ? `Rs${selectedTransaction.credit.toLocaleString()}` : '-'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Balance:</strong>
                  <span style={{ fontWeight: 'bold' }}>Rs{selectedTransaction.balance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BankStatement;