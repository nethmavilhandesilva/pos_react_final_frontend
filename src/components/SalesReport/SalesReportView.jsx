import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';

const SalesReportView = ({ reportData, onClose }) => {
    const { salesData: initialSalesData, filters: initialFilters } = reportData;
    const [salesData, setSalesData] = useState(initialSalesData || []);
    const [filteredData, setFilteredData] = useState(initialSalesData || []);
    const [companyName, setCompanyName] = useState('Default Company');
    const [settingDate, setSettingDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [isClient, setIsClient] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grouped');
    const [showUserTransactions, setShowUserTransactions] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const printRef = useRef();

    // Local filter states
    const [localFilters, setLocalFilters] = useState({
        start_date: '',
        end_date: '',
        transaction_type: '',
        customer_code: '',
        bill_no: '',
        min_total: '',
        max_total: '',
        sort_by: 'bill_no_asc'
    });

    // Sort options
    const sortOptions = [
        { value: 'bill_no_asc', label: 'Bill Number (Ascending)' },
        { value: 'bill_no_desc', label: 'Bill Number (Descending)' },
        { value: 'item_code_asc', label: 'Item Code (Ascending)' },
        { value: 'item_code_desc', label: 'Item Code (Descending)' },
        { value: 'customer_code_asc', label: 'Customer Code (Ascending)' },
        { value: 'customer_code_desc', label: 'Customer Code (Descending)' },
        { value: 'supplier_code_asc', label: 'Supplier Code (Ascending)' },
        { value: 'supplier_code_desc', label: 'Supplier Code (Descending)' },
        { value: 'price_asc', label: 'Price (Low to High)' },
        { value: 'price_desc', label: 'Price (High to Low)' },
        { value: 'bill_no_price_asc', label: 'Bill Number + Price (Ascending)' },
        { value: 'bill_no_price_desc', label: 'Bill Number + Price (Descending)' },
        { value: 'bill_no_item_code_asc', label: 'Bill Number + Item Code' },
        { value: 'price_item_code_asc', label: 'Price + Item Code' }
    ];

    useEffect(() => setIsClient(true), []);

    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                const { data } = await api.get('/settings');
                setCompanyName(data.company || 'Default Company');
                setSettingDate(data.value || new Date().toLocaleDateString('en-CA'));
            } catch (err) {
                console.error('Error fetching company info:', err);
            }
        };
        
        // Get current user from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);
        
        fetchCompanyInfo();
    }, []);

    // Calculate total for a sale
    const calculateSaleTotal = (sale) => {
        const weightTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
        const packCost = Number(sale.CustomerPackCost) || 0;
        return weightTotal + packCost;
    };

    // Sort data function
    const sortData = (data, sortBy) => {
        if (!data || data.length === 0) return data;
        
        const sorted = [...data];
        
        switch(sortBy) {
            case 'bill_no_asc':
                return sorted.sort((a, b) => (a.bill_no || '').localeCompare(b.bill_no || ''));
            case 'bill_no_desc':
                return sorted.sort((a, b) => (b.bill_no || '').localeCompare(a.bill_no || ''));
            case 'item_code_asc':
                return sorted.sort((a, b) => (a.item_code || '').localeCompare(b.item_code || ''));
            case 'item_code_desc':
                return sorted.sort((a, b) => (b.item_code || '').localeCompare(a.item_code || ''));
            case 'customer_code_asc':
                return sorted.sort((a, b) => (a.customer_code || '').localeCompare(b.customer_code || ''));
            case 'customer_code_desc':
                return sorted.sort((a, b) => (b.customer_code || '').localeCompare(a.customer_code || ''));
            case 'supplier_code_asc':
                return sorted.sort((a, b) => (a.supplier_code || '').localeCompare(b.supplier_code || ''));
            case 'supplier_code_desc':
                return sorted.sort((a, b) => (b.supplier_code || '').localeCompare(a.supplier_code || ''));
            case 'price_asc':
                return sorted.sort((a, b) => (Number(a.price_per_kg) || 0) - (Number(b.price_per_kg) || 0));
            case 'price_desc':
                return sorted.sort((a, b) => (Number(b.price_per_kg) || 0) - (Number(a.price_per_kg) || 0));
            case 'bill_no_price_asc':
                return sorted.sort((a, b) => {
                    const billCompare = (a.bill_no || '').localeCompare(b.bill_no || '');
                    if (billCompare !== 0) return billCompare;
                    return (Number(a.price_per_kg) || 0) - (Number(b.price_per_kg) || 0);
                });
            case 'bill_no_price_desc':
                return sorted.sort((a, b) => {
                    const billCompare = (a.bill_no || '').localeCompare(b.bill_no || '');
                    if (billCompare !== 0) return billCompare;
                    return (Number(b.price_per_kg) || 0) - (Number(a.price_per_kg) || 0);
                });
            case 'bill_no_item_code_asc':
                return sorted.sort((a, b) => {
                    const billCompare = (a.bill_no || '').localeCompare(b.bill_no || '');
                    if (billCompare !== 0) return billCompare;
                    return (a.item_code || '').localeCompare(b.item_code || '');
                });
            case 'price_item_code_asc':
                return sorted.sort((a, b) => {
                    const priceCompare = (Number(a.price_per_kg) || 0) - (Number(b.price_per_kg) || 0);
                    if (priceCompare !== 0) return priceCompare;
                    return (a.item_code || '').localeCompare(b.item_code || '');
                });
            default:
                return sorted;
        }
    };

    // Fetch filtered data
    const fetchFilteredData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (localFilters.start_date) params.start_date = localFilters.start_date;
            if (localFilters.end_date) params.end_date = localFilters.end_date;
            if (localFilters.transaction_type) params.transaction_type = localFilters.transaction_type;
            if (localFilters.customer_code) params.customer_code = localFilters.customer_code;
            if (localFilters.bill_no) params.bill_no = localFilters.bill_no;
            
            // Add user filter if showUserTransactions is true
            if (showUserTransactions && currentUser && currentUser.user_id) {
                params.user_id = currentUser.user_id;
            }

            const response = await api.get('/sales-report', { params });
            let data = response.data?.salesData || [];
            
            // Apply total filters client-side
            if (localFilters.min_total || localFilters.max_total) {
                data = data.filter(sale => {
                    const total = calculateSaleTotal(sale);
                    const minOk = !localFilters.min_total || total >= Number(localFilters.min_total);
                    const maxOk = !localFilters.max_total || total <= Number(localFilters.max_total);
                    return minOk && maxOk;
                });
            }
            
            // Apply sorting
            data = sortData(data, localFilters.sort_by);
            
            setSalesData(data);
            setFilteredData(data);
        } catch (err) {
            console.error('Error fetching sales data:', err);
            setSalesData([]);
            setFilteredData([]);
        } finally {
            setLoading(false);
        }
    };

    // Toggle user transactions filter
    const handleToggleUserTransactions = () => {
        const newState = !showUserTransactions;
        setShowUserTransactions(newState);
        
        if (newState && currentUser) {
            // Show only current user's transactions
            alert(`Showing transactions for user: ${currentUser.user_id || currentUser.name || 'Current User'}`);
        } else {
            alert('Showing all transactions');
        }
        
        // Refresh data with new filter
        fetchFilteredData();
    };

    // Group data by customer and bill
    const groupedData = filteredData.reduce((acc, sale) => {
        const customer = sale.customer_code || 'Unknown';
        const bill = sale.bill_no || 'No Bill';
        if (!acc[customer]) acc[customer] = {};
        if (!acc[customer][bill]) acc[customer][bill] = [];
        acc[customer][bill].push(sale);
        return acc;
    }, {});

    // Calculate totals
    const calculateBillTotal = (sales) => {
        const weightTotal = sales.reduce((sum, sale) => 
            sum + ((Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0)), 0);
        const packCost = sales[0]?.CustomerPackCost ? Number(sales[0].CustomerPackCost) : 0;
        return weightTotal + packCost;
    };

    const calculateCustomerTotal = (bills) => {
        return Object.values(bills).reduce((sum, billSales) => 
            sum + calculateBillTotal(billSales), 0);
    };

    const grandTotal = Object.values(groupedData).reduce((total, bills) => 
        total + calculateCustomerTotal(bills), 0);

    const activeFilterCount = Object.values(localFilters).filter(v => v !== '' && v !== 'bill_no_asc').length;
    const userFilterActive = showUserTransactions ? 1 : 0;
    const totalActiveFilters = activeFilterCount + userFilterActive;

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setLocalFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilters = () => {
        fetchFilteredData();
        setShowFilters(false);
    };

    const handleResetFilters = () => {
        setLocalFilters({
            start_date: '',
            end_date: '',
            transaction_type: '',
            customer_code: '',
            bill_no: '',
            min_total: '',
            max_total: '',
            sort_by: 'bill_no_asc'
        });
        setShowUserTransactions(false);
        fetchFilteredData();
    };

    // Export to Excel
    const handleExportExcel = () => {
        const excelData = [
            ['Date', 'Customer Code', 'Bill No', 'Item Code', 'Item Name', 'Packs', 'Weight (kg)', 
             'Price/kg', 'Supplier Code', 'Total', 'Transaction Type', 'Bill Status', 'User ID']
        ];

        filteredData.forEach(sale => {
            excelData.push([
                sale.Date || '',
                sale.customer_code || '',
                sale.bill_no || '',
                sale.item_code || '',
                sale.item_name || '',
                sale.packs || 0,
                Number(sale.weight || 0).toFixed(2),
                Number(sale.price_per_kg || 0).toFixed(2),
                sale.supplier_code || '',
                calculateSaleTotal(sale).toFixed(2),
                sale.credit_transaction === 'Y' ? 'Credit' : 'Cash',
                sale.bill_printed === 'Y' ? 'Printed' : 'Not Printed',
                sale.UniqueCode || sale.user_id || ''
            ]);
        });

        excelData.push([]);
        excelData.push(['GRAND TOTAL', '', '', '', '', '', '', '', '', grandTotal.toFixed(2), '', '', '']);

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
        
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = showUserTransactions && currentUser 
            ? `Sales_Report_${currentUser.user_id}_${dateStr}.xlsx`
            : `Sales_Report_${dateStr}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // Generate detailed HTML for printing (flat table view)
    const generateDetailedPrintHTML = () => {
        return `
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#4CAF50; color:white;">
                        <th style="border:1px solid #ddd; padding:10px 8px; text-align:left;">Date</th>
                        <th style="border:1px solid #ddd; padding:10px 8px; text-align:left;">Customer</th>
                        <th style="border:1px solid #ddd; padding:10px 8px; text-align:left;">Bill No</th>
                        <th style="border:1px solid #ddd; padding:10px 8px; text-align:left;">Item</th>
                        <th style="border:1px solid #ddd; padding:10px 8px; text-align:right;">Packs</th>
                        <th style="border:1px solid #ddd; padding:10px 8px; text-align:right;">Weight</th>
                        <th style="border:1px solid #ddd; padding:10px 8px; text-align:right;">Price</th>
                        <th style="border:1px solid #ddd; padding:10px 8px; text-align:left;">Supplier</th>
                        <th style="border:1px solid #ddd; padding:10px 8px; text-align:right;">Total</th>
                        <th style="border:1px solid #ddd; padding:10px 8px; text-align:center;">Type</th>
                        <th style="border:1px solid #ddd; padding:10px 8px; text-align:center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(sale => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="border:1px solid #ddd; padding:8px;">${sale.Date || '-'}</td>
                            <td style="border:1px solid #ddd; padding:8px;">${sale.customer_code || '-'}</td>
                            <td style="border:1px solid #ddd; padding:8px;">${sale.bill_no || '-'}</td>
                            <td style="border:1px solid #ddd; padding:8px;">${sale.item_name || '-'}</td>
                            <td style="border:1px solid #ddd; padding:8px; text-align:right;">${sale.packs || 0}</td>
                            <td style="border:1px solid #ddd; padding:8px; text-align:right;">${Number(sale.weight || 0).toFixed(2)}</td>
                            <td style="border:1px solid #ddd; padding:8px; text-align:right;">${Number(sale.price_per_kg || 0).toFixed(2)}</td>
                            <td style="border:1px solid #ddd; padding:8px;">${sale.supplier_code || '-'}</td>
                            <td style="border:1px solid #ddd; padding:8px; text-align:right; font-weight:bold;">${calculateSaleTotal(sale).toFixed(2)}</td>
                            <td style="border:1px solid #ddd; padding:8px; text-align:center;">
                                <span style="background: ${sale.credit_transaction === 'Y' ? '#ffd700' : '#4CAF50'}; color: ${sale.credit_transaction === 'Y' ? '#000' : 'white'}; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                    ${sale.credit_transaction === 'Y' ? 'Credit' : 'Cash'}
                                </span>
                            </td>
                            <td style="border:1px solid #ddd; padding:8px; text-align:center;">
                                <span style="background: ${sale.bill_printed === 'Y' ? '#2196F3' : '#f44336'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                    ${sale.bill_printed === 'Y' ? 'Printed' : 'Pending'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background:#f0f2f5;">
                        <td colspan="8" style="border:1px solid #ddd; padding:12px; text-align:right; font-weight:bold;">GRAND TOTAL:</td>
                        <td style="border:1px solid #ddd; padding:12px; text-align:right; font-weight:bold; color:#4CAF50;">${grandTotal.toFixed(2)}</td>
                        <td colspan="2" style="border:1px solid #ddd; padding:12px;"></td>
                    </tr>
                </tfoot>
            </table>
        `;
    };

    // Print report - ALWAYS uses detailed view (flat table)
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        
        // Generate detailed view HTML for printing
        const printHTML = generateDetailedPrintHTML();
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Sales Report</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 20px;
                        background: white;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #4CAF50;
                    }
                    .company-name {
                        font-size: 24px;
                        font-weight: bold;
                        color: #2c3e50;
                    }
                    .report-title {
                        font-size: 18px;
                        color: #4CAF50;
                        margin: 5px 0;
                    }
                    .report-date {
                        color: #666;
                        font-size: 12px;
                    }
                    .sort-info {
                        background: #e3f2fd;
                        padding: 8px 15px;
                        border-radius: 5px;
                        margin: 15px 0;
                        font-size: 12px;
                        text-align: center;
                    }
                    .filter-info {
                        background: #f5f5f5;
                        padding: 8px 15px;
                        border-radius: 5px;
                        margin: 10px 0;
                        font-size: 12px;
                        text-align: center;
                        color: #666;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 10px;
                    }
                    th { 
                        background: #4CAF50; 
                        color: white; 
                        font-weight: bold;
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 8px; 
                    }
                    .grand-total { 
                        text-align: right; 
                        font-size: 18px; 
                        font-weight: bold; 
                        margin-top: 20px; 
                        padding: 15px 20px;
                        background: #f0f2f5;
                        border-radius: 8px;
                    }
                    @media print {
                        body { padding: 10px; }
                        .no-print { display: none; }
                        th { background: #4CAF50 !important; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">මංජු සහ සහෝදරයෝ</div>
                    <div class="report-title">Sales Report - Detailed View</div>
                    <div class="report-date">Date: ${settingDate}</div>
                    <div class="sort-info">
                        📊 Sorted By: ${sortOptions.find(opt => opt.value === localFilters.sort_by)?.label || 'Bill Number (Ascending)'}
                    </div>
                    ${showUserTransactions && currentUser ? `
                        <div class="filter-info">
                            👤 Filtered by User: ${currentUser.user_id || currentUser.name || 'Current User'}
                        </div>
                    ` : ''}
                    ${activeFilterCount > 0 ? `
                        <div class="filter-info">
                            🔍 Active Filters: 
                            ${localFilters.start_date ? `Start: ${localFilters.start_date} | ` : ''}
                            ${localFilters.end_date ? `End: ${localFilters.end_date} | ` : ''}
                            ${localFilters.transaction_type ? `Type: ${localFilters.transaction_type === 'credit' ? 'Credit' : 'Cash'} | ` : ''}
                            ${localFilters.customer_code ? `Customer: ${localFilters.customer_code} | ` : ''}
                            ${localFilters.bill_no ? `Bill No: ${localFilters.bill_no} | ` : ''}
                            ${localFilters.min_total || localFilters.max_total ? `Total Range: ${localFilters.min_total || '0'} - ${localFilters.max_total || '∞'}` : ''}
                        </div>
                    ` : ''}
                </div>
                ${printHTML}
                <div class="grand-total">
                    GRAND TOTAL: Rs. ${grandTotal.toFixed(2)}
                </div>
                <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #999;">
                    Generated on ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const generateReportHTML = () => {
        return Object.entries(groupedData).map(([customerCode, bills]) => {
            const customerTotal = calculateCustomerTotal(bills);
            
            return `
                <div class="customer-section">
                    <div class="customer-title">Customer: ${customerCode}</div>
                    ${Object.entries(bills).map(([billNo, sales]) => {
                        const billTotal = calculateBillTotal(sales);
                        return `
                            <div class="bill-section">
                                <div class="bill-header">Bill #: ${billNo}</div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Item</th>
                                            <th>Packs</th>
                                            <th>Weight</th>
                                            <th>Price/kg</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${sales.map(sale => `
                                            <tr>
                                                <td>${sale.Date || ''}</td>
                                                <td>${sale.item_name || ''}</td>
                                                <td>${sale.packs || 0}</td>
                                                <td>${Number(sale.weight || 0).toFixed(2)}</td>
                                                <td>${Number(sale.price_per_kg || 0).toFixed(2)}</td>
                                                <td>${((Number(sale.weight) * Number(sale.price_per_kg)) + (Number(sale.CustomerPackCost) || 0)).toFixed(2)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="5" style="text-align:right"><strong>Bill Total:</strong></td>
                                            <td><strong>${billTotal.toFixed(2)}</strong></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        `;
                    }).join('')}
                    <div class="total-row">Customer Total: Rs. ${customerTotal.toFixed(2)}</div>
                </div>
            `;
        }).join('');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '20px' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header Bar */}
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '15px'
                }}>
                    <div>
                        <h1 style={{ fontSize: '24px', margin: 0, color: '#333' }}>{companyName}</h1>
                        <p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>Sales Report - {settingDate}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button 
                            onClick={handleToggleUserTransactions} 
                            style={{
                                ...buttonStyle.secondary,
                                background: showUserTransactions ? '#4CAF50' : '#6c757d',
                                border: showUserTransactions ? '2px solid #45a049' : 'none'
                            }}
                        >
                            👤 User Transactions {showUserTransactions && '✓'}
                        </button>
                        <button onClick={() => setShowFilters(!showFilters)} style={buttonStyle.secondary}>
                            🔍 Filters {totalActiveFilters > 0 && `(${totalActiveFilters})`}
                        </button>
                        <button onClick={() => setViewMode(viewMode === 'grouped' ? 'detailed' : 'grouped')} style={buttonStyle.secondary}>
                            {viewMode === 'grouped' ? '📋 Switch to Detailed View' : '📊 Switch to Grouped View'}
                        </button>
                        <button onClick={handleExportExcel} style={buttonStyle.success}>📊 Export Excel</button>
                        <button onClick={handlePrint} style={buttonStyle.primary}>🖨️ Print (Detailed)</button>
                        <button onClick={onClose} style={buttonStyle.danger}>✕ Close</button>
                    </div>
                </div>

                {/* Active User Filter Display */}
                {showUserTransactions && currentUser && (
                    <div style={{
                        background: '#e8f5e9',
                        borderRadius: '8px',
                        padding: '10px 15px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        border: '1px solid #4CAF50'
                    }}>
                        <span style={{ fontWeight: 'bold' }}>👤 Currently Filtering By:</span>
                        <span style={{ color: '#2e7d32' }}>User: {currentUser.user_id || currentUser.name || 'Current User'}</span>
                        <button 
                            onClick={handleToggleUserTransactions}
                            style={{
                                marginLeft: 'auto',
                                background: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 12px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            Clear
                        </button>
                    </div>
                )}

                {/* Current Sort Display */}
                <div style={{
                    background: '#e3f2fd',
                    borderRadius: '8px',
                    padding: '10px 15px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px'
                }}>
                    <span style={{ fontWeight: 'bold' }}>📊 Currently Sorted By:</span>
                    <span style={{ color: '#1976d2' }}>{sortOptions.find(opt => opt.value === localFilters.sort_by)?.label || 'Bill Number (Ascending)'}</span>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Filter & Sort Records</h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '15px',
                            marginBottom: '20px'
                        }}>
                            <div>
                                <label style={labelStyle}>Start Date</label>
                                <input type="date" name="start_date" value={localFilters.start_date} onChange={handleFilterChange} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>End Date</label>
                                <input type="date" name="end_date" value={localFilters.end_date} onChange={handleFilterChange} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Transaction Type</label>
                                <select name="transaction_type" value={localFilters.transaction_type} onChange={handleFilterChange} style={inputStyle}>
                                    <option value="">All</option>
                                    <option value="credit">Credit</option>
                                    <option value="cash">Cash</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Customer Code</label>
                                <input type="text" name="customer_code" value={localFilters.customer_code} onChange={handleFilterChange} placeholder="Enter customer code" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Bill Number</label>
                                <input type="text" name="bill_no" value={localFilters.bill_no} onChange={handleFilterChange} placeholder="Enter bill number" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Min Total</label>
                                <input type="number" name="min_total" value={localFilters.min_total} onChange={handleFilterChange} placeholder="Minimum amount" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Max Total</label>
                                <input type="number" name="max_total" value={localFilters.max_total} onChange={handleFilterChange} placeholder="Maximum amount" style={inputStyle} />
                            </div>
                            <div style={{ gridColumn: 'span 1' }}>
                                <label style={labelStyle}>Sort By</label>
                                <select name="sort_by" value={localFilters.sort_by} onChange={handleFilterChange} style={inputStyle}>
                                    {sortOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={handleResetFilters} style={buttonStyle.danger}>Reset All</button>
                            <button onClick={handleApplyFilters} style={buttonStyle.success}>Apply Filters & Sort</button>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
                        <p>Loading data...</p>
                    </div>
                )}

                {/* No Data State */}
                {!loading && filteredData.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📭</div>
                        <h3>No records found</h3>
                        <p>Try adjusting your filters</p>
                    </div>
                )}

                {/* Results Summary */}
                {!loading && filteredData.length > 0 && (
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '15px 20px',
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                    }}>
                        <div>
                            <strong>Total Records:</strong> {filteredData.length} | 
                            <strong> Customers:</strong> {Object.keys(groupedData).length} |
                            <strong> Bills:</strong> {Object.values(groupedData).reduce((sum, bills) => sum + Object.keys(bills).length, 0)}
                            {showUserTransactions && currentUser && (
                                <> | <strong style={{ color: '#4CAF50' }}>Filtered by: {currentUser.user_id || currentUser.name}</strong></>
                            )}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
                            Grand Total: Rs. {grandTotal.toFixed(2)}
                        </div>
                    </div>
                )}

                {/* Grouped View */}
                {!loading && viewMode === 'grouped' && filteredData.length > 0 && (
                    <div>
                        {Object.entries(groupedData).map(([customerCode, bills]) => {
                            const customerTotal = calculateCustomerTotal(bills);
                            return (
                                <div key={customerCode} style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    marginBottom: '20px',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        padding: '12px 20px',
                                        fontWeight: 'bold',
                                        fontSize: '16px'
                                    }}>
                                        🏢 {customerCode}
                                    </div>

                                    {Object.entries(bills).map(([billNo, sales]) => {
                                        const billTotal = calculateBillTotal(sales);
                                        return (
                                            <div key={billNo} style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
                                                <div style={{
                                                    background: '#f8f9fa',
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    marginBottom: '10px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    🧾 Bill #: {billNo}
                                                </div>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: '#f2f2f2' }}>
                                                            <th style={thStyle}>Date</th>
                                                            <th style={thStyle}>Item</th>
                                                            <th style={thStyle}>Packs</th>
                                                            <th style={thStyle}>Weight</th>
                                                            <th style={thStyle}>Price</th>
                                                            <th style={thStyle}>Total</th>
                                                            <th style={thStyle}>Type</th>
                                                            <th style={thStyle}>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sales.map((sale, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                                <td style={tdStyle}>{sale.Date || '-'}</td>
                                                                <td style={tdStyle}>{sale.item_name || '-'}</td>
                                                                <td style={tdStyle}>{sale.packs || 0}</td>
                                                                <td style={tdStyle}>{Number(sale.weight || 0).toFixed(2)}</td>
                                                                <td style={tdStyle}>{Number(sale.price_per_kg || 0).toFixed(2)}</td>
                                                                <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                                                                    {calculateSaleTotal(sale).toFixed(2)}
                                                                </td>
                                                                <td style={tdStyle}>
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        background: sale.credit_transaction === 'Y' ? '#ffd700' : '#4CAF50',
                                                                        color: sale.credit_transaction === 'Y' ? '#000' : 'white'
                                                                    }}>
                                                                        {sale.credit_transaction === 'Y' ? 'Credit' : 'Cash'}
                                                                    </span>
                                                                </td>
                                                                <td style={tdStyle}>
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        background: sale.bill_printed === 'Y' ? '#2196F3' : '#f44336',
                                                                        color: 'white'
                                                                    }}>
                                                                        {sale.bill_printed === 'Y' ? 'Printed' : 'Pending'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr style={{ background: '#f0f2f5' }}>
                                                            <td colSpan="5" style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>Bill Total:</td>
                                                            <td style={{ padding: '10px', fontWeight: 'bold', color: '#4CAF50' }}>{billTotal.toFixed(2)}</td>
                                                            <td colSpan="2"></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        );
                                    })}
                                    
                                    <div style={{
                                        padding: '12px 20px',
                                        background: '#f8f9fa',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        borderTop: '2px solid #4CAF50'
                                    }}>
                                        Customer Total: Rs. {customerTotal.toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                        
                        <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '15px 20px',
                            marginTop: '20px',
                            textAlign: 'right',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            borderRight: '5px solid #4CAF50'
                        }}>
                            GRAND TOTAL: Rs. {grandTotal.toFixed(2)}
                        </div>
                    </div>
                )}

                {/* Detailed View (Simple Table) */}
                {!loading && viewMode === 'detailed' && filteredData.length > 0 && (
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        overflowX: 'auto',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#4CAF50', color: 'white' }}>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Customer</th>
                                    <th style={thStyle}>Bill No</th>
                                    <th style={thStyle}>Item</th>
                                    <th style={thStyle}>Packs</th>
                                    <th style={thStyle}>Weight</th>
                                    <th style={thStyle}>Price</th>
                                    <th style={thStyle}>Supplier</th>
                                    <th style={thStyle}>Total</th>
                                    <th style={thStyle}>Type</th>
                                    <th style={thStyle}>Status</th>
                                    {showUserTransactions && <th style={thStyle}>User ID</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((sale, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={tdStyle}>{sale.Date || '-'}</td>
                                        <td style={tdStyle}>{sale.customer_code || '-'}</td>
                                        <td style={tdStyle}>{sale.bill_no || '-'}</td>
                                        <td style={tdStyle}>{sale.item_name || '-'}</td>
                                        <td style={tdStyle}>{sale.packs || 0}</td>
                                        <td style={tdStyle}>{Number(sale.weight || 0).toFixed(2)}</td>
                                        <td style={tdStyle}>{Number(sale.price_per_kg || 0).toFixed(2)}</td>
                                        <td style={tdStyle}>{sale.supplier_code || '-'}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{calculateSaleTotal(sale).toFixed(2)}</td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                background: sale.credit_transaction === 'Y' ? '#ffd700' : '#4CAF50',
                                                color: sale.credit_transaction === 'Y' ? '#000' : 'white'
                                            }}>
                                                {sale.credit_transaction === 'Y' ? 'Credit' : 'Cash'}
                                            </span>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                background: sale.bill_printed === 'Y' ? '#2196F3' : '#f44336',
                                                color: 'white'
                                            }}>
                                                {sale.bill_printed === 'Y' ? 'Printed' : 'Pending'}
                                            </span>
                                        </td>
                                        {showUserTransactions && (
                                            <td style={tdStyle}>{sale.UniqueCode || sale.user_id || '-'}</td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f0f2f5' }}>
                                    <td colSpan="8" style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>GRAND TOTAL:</td>
                                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#4CAF50' }}>{grandTotal.toFixed(2)}</td>
                                    <td colSpan={showUserTransactions ? "2" : "2"}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// Styles
const buttonStyle = {
    primary: {
        padding: '8px 16px',
        background: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    secondary: {
        padding: '8px 16px',
        background: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    success: {
        padding: '8px 16px',
        background: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    danger: {
        padding: '8px 16px',
        background: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    }
};

const labelStyle = {
    display: 'block',
    marginBottom: '5px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#555'
};

const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
};

const thStyle = {
    padding: '10px 8px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600'
};

const tdStyle = {
    padding: '8px',
    fontSize: '12px'
};

export default SalesReportView;