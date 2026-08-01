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
        item_code: '',
        item_name: '',
        min_total: '',
        max_total: '',
        sort_by: 'bill_no_asc'
    });

    // Item dropdown states
    const [items, setItems] = useState([]);
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loadingItems, setLoadingItems] = useState(false);

    // Sort options
    const sortOptions = [
        { value: 'bill_no_asc', label: 'බිල් අංක පිළිවෙලට' },
        { value: 'item_code_asc', label: 'එළවළු නම් පිළිවෙලට' },
        { value: 'customer_code_asc', label: 'ගනුම්කරුවන්ගේ පිළිවෙලට' },
        { value: 'supplier_code_asc', label: 'අයිතිකරුවන් පිළිවෙලට' },
        { value: 'price_asc', label: 'මිල පිළිවෙලට' },
        { value: 'bill_no_price_asc', label: 'බිල් අංක, මිල පිළිවෙලට' },
        { value: 'bill_no_item_code_asc', label: 'බිල්,එළවළු පිළිවෙලට' },
        { value: 'price_item_code_asc', label: 'මිල, එළවළු පිළිවෙලට' },
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

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);

        fetchCompanyInfo();
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoadingItems(true);
        try {
            const response = await api.get('/items');
            let itemsData = response.data || [];
            
            if (response.data && response.data.items) {
                itemsData = response.data.items;
            } else if (Array.isArray(response.data)) {
                itemsData = response.data;
            } else if (response.data && response.data.data) {
                itemsData = response.data.data;
            }
            
            setItems(itemsData);
        } catch (err) {
            console.error('Error fetching items:', err);
            setItems([]);
        } finally {
            setLoadingItems(false);
        }
    };

    const filteredItems = items.filter(item => {
        const searchLower = itemSearchTerm.toLowerCase().trim();
        if (!searchLower) return true;
        
        const itemNo = (item.no || item.item_code || item.code || '').toString().toLowerCase();
        const itemName = (item.name || item.item_name || item.type || item.item_type || '').toLowerCase();
        
        return (
            itemName.includes(searchLower) ||
            itemNo.includes(searchLower)
        );
    });

    const handleItemSelect = (item) => {
        setSelectedItem(item);
        const itemCode = item.no || item.item_code || item.code || '';
        const itemName = item.name || item.item_name || item.type || item.item_type || '';
        const displayName = itemName || itemCode || 'Unnamed';
        
        setLocalFilters(prev => ({ 
            ...prev, 
            item_code: itemCode,
            item_name: displayName 
        }));
        setItemSearchTerm(`${itemCode} - ${displayName}`);
        setShowItemDropdown(false);
        
        setTimeout(() => {
            fetchFilteredData();
        }, 100);
    };

    const handleItemSearchChange = (e) => {
        const value = e.target.value;
        setItemSearchTerm(value);
        setShowItemDropdown(true);
        
        if (value.trim() === '') {
            setSelectedItem(null);
            setLocalFilters(prev => ({ 
                ...prev, 
                item_code: '',
                item_name: '' 
            }));
            setTimeout(() => {
                fetchFilteredData();
            }, 300);
        }
    };

    const handleItemSearchBlur = () => {
        setTimeout(() => {
            setShowItemDropdown(false);
        }, 300);
    };

    const calculateSaleTotal = (sale) => {
        const weightTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
        const packCost = (Number(sale.packs) || 0) * (Number(sale.CustomerPackCost) || 0);
        return weightTotal + packCost;
    };

    const calculateWeightTotal = (sale) => {
        return (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
    };

    const calculatePackCost = (sale) => {
        return (Number(sale.packs) || 0) * (Number(sale.CustomerPackCost) || 0);
    };

    const sortData = (data, sortBy) => {
        if (!data || data.length === 0) return data;
        const sorted = [...data];

        switch (sortBy) {
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

    const fetchFilteredData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (localFilters.start_date) params.start_date = localFilters.start_date;
            if (localFilters.end_date) params.end_date = localFilters.end_date;
            if (localFilters.transaction_type) params.transaction_type = localFilters.transaction_type;
            if (localFilters.customer_code) params.customer_code = localFilters.customer_code;
            if (localFilters.bill_no) params.bill_no = localFilters.bill_no;
            if (localFilters.item_code) params.item_code = localFilters.item_code;
            if (localFilters.item_name) params.item_name = localFilters.item_name;

            if (showUserTransactions && currentUser && currentUser.user_id) {
                params.user_id = currentUser.user_id;
            }

            const response = await api.get('/sales-report', { params });
            let data = response.data?.salesData || [];

            if (localFilters.min_total || localFilters.max_total) {
                data = data.filter(sale => {
                    const total = calculateSaleTotal(sale);
                    const minOk = !localFilters.min_total || total >= Number(localFilters.min_total);
                    const maxOk = !localFilters.max_total || total <= Number(localFilters.max_total);
                    return minOk && maxOk;
                });
            }

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

    const handleToggleUserTransactions = () => {
        const newState = !showUserTransactions;
        setShowUserTransactions(newState);

        if (newState && currentUser) {
            alert(`Showing transactions for user: ${currentUser.user_id || currentUser.name || 'Current User'}`);
        } else {
            alert('Showing all transactions');
        }

        fetchFilteredData();
    };

    const groupedData = filteredData.reduce((acc, sale) => {
        const customer = sale.customer_code || 'Unknown';
        const bill = sale.bill_no || 'No Bill';
        if (!acc[customer]) acc[customer] = {};
        if (!acc[customer][bill]) acc[customer][bill] = [];
        acc[customer][bill].push(sale);
        return acc;
    }, {});

    const calculateBillTotal = (sales) => {
        const weightTotal = sales.reduce((sum, sale) =>
            sum + ((Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0)), 0);
        const packCost = sales.reduce((sum, sale) =>
            sum + ((Number(sale.packs) || 0) * (Number(sale.CustomerPackCost) || 0)), 0);
        return weightTotal + packCost;
    };

    const calculateBillWeightTotal = (sales) => {
        return sales.reduce((sum, sale) =>
            sum + ((Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0)), 0);
    };

    const calculateBillPackCost = (sales) => {
        return sales.reduce((sum, sale) =>
            sum + ((Number(sale.packs) || 0) * (Number(sale.CustomerPackCost) || 0)), 0);
    };

    const calculateCustomerTotal = (bills) => {
        return Object.values(bills).reduce((sum, billSales) =>
            sum + calculateBillTotal(billSales), 0);
    };

    const grandTotal = Object.values(groupedData).reduce((total, bills) =>
        total + calculateCustomerTotal(bills), 0);

    const totalWeightAll = filteredData.reduce((sum, sale) => sum + (Number(sale.weight) || 0), 0);

    const activeFilterCount = Object.values(localFilters).filter(v => v !== '' && v !== 'bill_no_asc').length;
    const userFilterActive = showUserTransactions ? 1 : 0;
    const totalActiveFilters = activeFilterCount + userFilterActive;

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setLocalFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilters = () => {
        fetchFilteredData();
    };

    const handleResetFilters = () => {
        setLocalFilters({
            start_date: '',
            end_date: '',
            transaction_type: '',
            customer_code: '',
            bill_no: '',
            item_code: '',
            item_name: '',
            min_total: '',
            max_total: '',
            sort_by: 'bill_no_asc'
        });
        setItemSearchTerm('');
        setSelectedItem(null);
        setShowItemDropdown(false);
        setShowUserTransactions(false);
        fetchFilteredData();
    };

    const handleExportExcel = () => {
        const excelData = [
            ['Date', 'Customer Code', 'Bill No', 'Item Code', 'Item Name', 'Packs', 'Weight (kg)',
                'Price/kg', 'Supplier Code', 'Weight Total', 'Pack Cost', 'Total', 'Transaction Type', 'Bill Status', 'User ID']
        ];

        filteredData.forEach(sale => {
            const weightTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
            const packCost = (Number(sale.packs) || 0) * (Number(sale.CustomerPackCost) || 0);
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
                weightTotal.toFixed(2),
                packCost.toFixed(2),
                calculateSaleTotal(sale).toFixed(2),
                sale.credit_transaction === 'Y' ? 'Credit' : 'Cash',
                sale.bill_printed === 'Y' ? 'Printed' : 'Not Printed',
                sale.UniqueCode || sale.user_id || ''
            ]);
        });

        excelData.push([]);
        excelData.push(['GRAND TOTAL', '', '', '', '', '', totalWeightAll.toFixed(2), '', '', '', '', grandTotal.toFixed(2), '', '', '']);

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');

        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = showUserTransactions && currentUser
            ? `Sales_Report_${currentUser.user_id}_${dateStr}.xlsx`
            : `Sales_Report_${dateStr}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // ===== UPDATED PRINT FUNCTION - Uses exact same table structure as detailed view =====
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');

        // Calculate totals for the print
        let totalWeightSum = 0;
        let totalPackCostSum = 0;
        let totalWeightKg = 0;

        // Generate the table rows using the EXACT same structure as the detailed view
        const tableRows = filteredData.map((sale, idx) => {
            const weightTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
            const packCost = (Number(sale.packs) || 0) * (Number(sale.CustomerPackCost) || 0);
            totalWeightSum += weightTotal;
            totalPackCostSum += packCost;
            totalWeightKg += Number(sale.weight) || 0;

            return `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:4px 3px; font-size:11px; text-align:center;">${sale.bill_no || '-'}</td>
                    <td style="padding:4px 3px; font-size:11px; text-align:center;">${sale.packs || 0}</td>
                    <td style="padding:4px 3px; font-size:11px; text-align:left;">${sale.item_name || '-'}</td>
                    <td style="padding:4px 3px; font-size:11px; text-align:right;">${Number(sale.weight || 0).toFixed(2)}</td>
                    <td style="padding:4px 3px; font-size:11px; text-align:right;">${Number(sale.price_per_kg || 0).toFixed(2)}</td>
                    <td style="padding:4px 3px; font-size:11px; text-align:right;">${packCost.toFixed(2)}</td>
                    <td style="padding:4px 3px; font-size:11px; text-align:right; font-weight:bold;">${calculateSaleTotal(sale).toFixed(2)}</td>
                    <td style="padding:4px 3px; font-size:11px; text-align:right;">${Number(sale.kuliya || 0).toFixed(2)}</td>
                    <td style="padding:4px 3px; font-size:11px; text-align:center;">${sale.supplier_code || 0}</td>
                    <td style="padding:4px 3px; font-size:11px; text-align:center;">${sale.customer_code || 0}</td>
                    <td style="padding:4px 3px; font-size:11px; text-align:center;">
                        ${sale.created_at ? new Date(sale.created_at).toLocaleTimeString('si-LK', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        }) : '-'}
                    </td>
                    <td style="padding:4px 3px; font-size:11px; text-align:center;">${sale.Date || '-'}</td>
                    ${showUserTransactions ? `<td style="padding:4px 3px; font-size:11px; text-align:center;">${sale.UniqueCode || sale.user_id || '-'}</td>` : ''}
                </tr>
            `;
        }).join('');

        const grandTotalWeightSum = filteredData.reduce((sum, sale) => sum + ((Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0)), 0);
        const grandTotalPackCost = filteredData.reduce((sum, sale) => sum + ((Number(sale.packs) || 0) * (Number(sale.CustomerPackCost) || 0)), 0);

        // Calculate columns for tfoot
        const colSpan = showUserTransactions ? 6 : 6;

        printWindow.document.write(`
            <html>
            <head>
                <title>Sales Report - Print</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 15px;
                        background: white;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 2px solid #4CAF50;
                    }
                    .company-name {
                        font-size: 20px;
                        font-weight: bold;
                        color: #2c3e50;
                    }
                    .report-title {
                        font-size: 16px;
                        color: #4CAF50;
                        margin: 3px 0;
                    }
                    .report-date {
                        color: #666;
                        font-size: 11px;
                    }
                    .filter-info {
                        background: #f5f5f5;
                        padding: 5px 12px;
                        border-radius: 4px;
                        margin: 8px 0;
                        font-size: 11px;
                        text-align: center;
                        color: #666;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 8px;
                        font-size: 11px;
                    }
                    th { 
                        background: #4CAF50; 
                        color: white; 
                        font-weight: bold;
                        padding: 5px 3px;
                        text-align: center;
                        font-size: 10px;
                    }
                    td { 
                        border: 1px solid #ddd; 
                        padding: 4px 3px;
                        text-align: center;
                    }
                    .grand-total { 
                        text-align: right; 
                        font-size: 16px; 
                        font-weight: bold; 
                        margin-top: 15px; 
                        padding: 10px 15px;
                        background: #f0f2f5;
                        border-radius: 6px;
                    }
                    .subtotal-row {
                        background: #f0f2f5;
                        font-weight: bold;
                    }
                    .subtotal-row td {
                        padding: 6px 3px;
                        font-size: 11px;
                    }
                    @media print {
                        body { padding: 8px; }
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
                            ${localFilters.item_code ? `Item Code: ${localFilters.item_code} | ` : ''}
                            ${localFilters.item_name ? `Item Name: ${localFilters.item_name} | ` : ''}
                            ${localFilters.min_total || localFilters.max_total ? `Total Range: ${localFilters.min_total || '0'} - ${localFilters.max_total || '∞'}` : ''}
                        </div>
                    ` : ''}
                    <div style="font-size:11px; color:#666; margin-top:4px;">
                        Total Records: ${filteredData.length} | Total Weight: ${totalWeightKg.toFixed(2)} kg
                    </div>
                </div>

                <!-- EXACT SAME TABLE STRUCTURE AS DETAILED VIEW -->
                <table>
                    <thead>
                        <tr style="background:#4CAF50; color:white;">
                            <th style="padding:4px 3px; font-size:10px;">බිල් අං</th>
                            <th style="padding:4px 3px; font-size:10px;">මලු</th>
                            <th style="padding:4px 3px; font-size:10px;">වර්ගය</th>
                            <th style="padding:4px 3px; font-size:10px;">ප්‍රමාණය</th>
                            <th style="padding:4px 3px; font-size:10px;">බැගින්</th>
                            <th style="padding:4px 3px; font-size:10px;">මලු කුලිය</th>
                            <th style="padding:4px 3px; font-size:10px;">එකතුව</th>
                            <th style="padding:4px 3px; font-size:10px;">කුලි</th>
                            <th style="padding:4px 3px; font-size:10px;">අයිතිය</th>
                            <th style="padding:4px 3px; font-size:10px;">විලා</th>
                            <th style="padding:4px 3px; font-size:10px;">වේලාව</th>
                            <th style="padding:4px 3px; font-size:10px;">දිනය</th>
                            ${showUserTransactions ? '<th style="padding:4px 3px; font-size:10px;">User ID</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr style="background:#f0f2f5; font-weight:bold;">
                            <td colspan="3" style="padding:6px 3px; text-align:right; font-size:11px;">GRAND TOTAL:</td>
                            <td style="padding:6px 3px; text-align:right; font-size:11px;">${totalWeightKg.toFixed(2)}</td>
                            <td style="padding:6px 3px; text-align:right; font-size:11px;">${grandTotalWeightSum.toFixed(2)}</td>
                            <td style="padding:6px 3px; text-align:right; font-size:11px;">${grandTotalPackCost.toFixed(2)}</td>
                            <td style="padding:6px 3px; text-align:right; font-size:11px; font-weight:bold; color:#4CAF50;">${grandTotal.toFixed(2)}</td>
                            <td colspan="${showUserTransactions ? '6' : '6'}" style="padding:6px 3px; text-align:center; font-size:11px;">
                                Total Weight: ${totalWeightKg.toFixed(2)} kg
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div class="grand-total">
                    Total Weight: ${totalWeightKg.toFixed(2)} kg | GRAND TOTAL: Rs. ${grandTotal.toFixed(2)}
                </div>
                <div style="text-align: center; margin-top: 20px; font-size: 9px; color: #999;">
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
            const customerWeightTotal = Object.values(bills).reduce((sum, billSales) => 
                sum + billSales.reduce((s, sale) => s + (Number(sale.weight) || 0), 0), 0
            );

            return `
                <div class="customer-section">
                    <div class="customer-title">Customer: ${customerCode} (Total Weight: ${customerWeightTotal.toFixed(2)} kg)</div>
                    ${Object.entries(bills).map(([billNo, sales]) => {
                const billTotal = calculateBillTotal(sales);
                const billWeightTotal = calculateBillWeightTotal(sales);
                const billPackCost = calculateBillPackCost(sales);
                const billWeightSum = sales.reduce((sum, sale) => sum + (Number(sale.weight) || 0), 0);
                return `
                            <div class="bill-section">
                                <div class="bill-header">Bill #: ${billNo} (Weight: ${billWeightSum.toFixed(2)} kg)</div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Item</th>
                                            <th>Packs</th>
                                            <th>Weight</th>
                                            <th>Price/kg</th>
                                            <th>Weight Total</th>
                                            <th>Pack Cost</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${sales.map(sale => {
                                            const weightTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
                                            const packCost = (Number(sale.packs) || 0) * (Number(sale.CustomerPackCost) || 0);
                                            return `
                                                <tr>
                                                    <td>${sale.Date || ''}</td>
                                                    <td>${sale.item_name || ''}</td>
                                                    <td>${sale.packs || 0}</td>
                                                    <td>${Number(sale.weight || 0).toFixed(2)}</td>
                                                    <td>${Number(sale.price_per_kg || 0).toFixed(2)}</td>
                                                    <td>${weightTotal.toFixed(2)}</td>
                                                    <td>${packCost.toFixed(2)}</td>
                                                    <td>${(weightTotal + packCost).toFixed(2)}</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr style="background:#f0f2f5; font-weight:bold;">
                                            <td colspan="3" style="text-align:right;">Bill Totals:</td>
                                            <td>${billWeightSum.toFixed(2)}</td>
                                            <td></td>
                                            <td>${billWeightTotal.toFixed(2)}</td>
                                            <td>${billPackCost.toFixed(2)}</td>
                                            <td>${billTotal.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        `;
            }).join('')}
                    <div class="total-row">Customer Total: Rs. ${customerTotal.toFixed(2)} (Weight: ${customerWeightTotal.toFixed(2)} kg)</div>
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
                        <button onClick={() => setViewMode(viewMode === 'grouped' ? 'detailed' : 'grouped')} style={buttonStyle.secondary}>
                            {viewMode === 'grouped' ? '📋 Switch to Detailed View' : '📊 Switch to Grouped View'}
                        </button>
                        <button onClick={handleExportExcel} style={buttonStyle.success}>
                            📥 Export Excel
                        </button>
                        <button onClick={handlePrint} style={buttonStyle.primary}>🖨️ Print (Detailed)</button>
                        <button onClick={onClose} style={buttonStyle.danger}>✕ Close</button>
                    </div>
                </div>

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

                {/* Filter Panel */}
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '15px 20px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        marginBottom: '15px'
                    }}>
                        <div>
                            <label style={{ ...labelStyle, fontSize: '12px' }}>ආරම්භක දිනය</label>
                            <input type="date" name="start_date" value={localFilters.start_date} onChange={handleFilterChange} style={{ ...inputStyle, padding: '6px 10px', fontSize: '13px' }} />
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: '12px' }}>අවසන් දිනය</label>
                            <input type="date" name="end_date" value={localFilters.end_date} onChange={handleFilterChange} style={{ ...inputStyle, padding: '6px 10px', fontSize: '13px' }} />
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: '12px' }}>ගනුදෙනු වර්ගය</label>
                            <select name="transaction_type" value={localFilters.transaction_type} onChange={handleFilterChange} style={{ ...inputStyle, padding: '6px 10px', fontSize: '13px' }}>
                                <option value="">සියල්ල</option>
                                <option value="credit">ණය</option>
                                <option value="cash">මුදල්</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: '12px' }}>ගනුදෙනුකරු</label>
                            <input type="text" name="customer_code" value={localFilters.customer_code} onChange={handleFilterChange} placeholder="කේතය" style={{ ...inputStyle, padding: '6px 10px', fontSize: '13px' }} />
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: '12px' }}>බිල් අංකය</label>
                            <input type="text" name="bill_no" value={localFilters.bill_no} onChange={handleFilterChange} placeholder="අංකය" style={{ ...inputStyle, padding: '6px 10px', fontSize: '13px' }} />
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: '12px' }}>වර්ගීකරණය</label>
                            <select name="sort_by" value={localFilters.sort_by} onChange={handleFilterChange} style={{ ...inputStyle, padding: '6px 10px', fontSize: '13px' }}>
                                {sortOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <label style={{ ...labelStyle, fontSize: '12px' }}>අයිතමය</label>
                            <input 
                                type="text"
                                value={itemSearchTerm}
                                onChange={handleItemSearchChange}
                                onFocus={() => setShowItemDropdown(true)}
                                onBlur={handleItemSearchBlur}
                                placeholder="අයිතමයේ නම හෝ කේතය සොයන්න..."
                                style={{ ...inputStyle, padding: '6px 10px', fontSize: '13px' }}
                            />
                            {loadingItems && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    padding: '10px',
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                    zIndex: 1000,
                                    marginTop: '2px',
                                    textAlign: 'center',
                                    color: '#666',
                                    fontSize: '13px'
                                }}>
                                    Loading items...
                                </div>
                            )}
                            {!loadingItems && showItemDropdown && filteredItems.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                    zIndex: 1000,
                                    marginTop: '2px'
                                }}>
                                    {filteredItems.map((item) => {
                                        const itemCode = item.no || item.item_code || item.code || 'N/A';
                                        const itemName = item.name || item.item_name || item.type || item.item_type || 'Unnamed';
                                        
                                        return (
                                            <div
                                                key={item.id || item.no || Math.random()}
                                                onMouseDown={() => handleItemSelect(item)}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #f0f0f0',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: '13px'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                                                onMouseLeave={(e) => e.target.style.background = 'white'}
                                            >
                                                <span>
                                                    <strong>{itemCode}</strong> - {itemName}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#666' }}>
                                                    {item.pack_due ? `මලු කුලිය: ${item.pack_due}` : ''}
                                                    {item.selling_price ? ` | විකුණුම්: ${item.selling_price}` : ''}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {!loadingItems && showItemDropdown && filteredItems.length === 0 && itemSearchTerm && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    padding: '10px',
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                    zIndex: 1000,
                                    marginTop: '2px',
                                    textAlign: 'center',
                                    color: '#666',
                                    fontSize: '13px'
                                }}>
                                    No items found
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button onClick={handleApplyFilters} style={{ ...buttonStyle.success, padding: '6px 16px', fontSize: '13px' }}>තොරතුරු බැලීම</button>
                        <button onClick={handleResetFilters} style={{ ...buttonStyle.danger, padding: '6px 16px', fontSize: '13px' }}>ඉවත් වීම</button>
                    </div>
                </div>

                {loading && (
                    <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
                        <p>Loading data...</p>
                    </div>
                )}

                {!loading && filteredData.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📭</div>
                        <h3>No records found</h3>
                        <p>Try adjusting your filters</p>
                    </div>
                )}

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
                            <strong> Bills:</strong> {Object.values(groupedData).reduce((sum, bills) => sum + Object.keys(bills).length, 0)} |
                            <strong> Total Weight:</strong> {totalWeightAll.toFixed(2)} kg
                            {showUserTransactions && currentUser && (
                                <> | <strong style={{ color: '#4CAF50' }}>Filtered by: {currentUser.user_id || currentUser.name}</strong></>
                            )}
                            {selectedItem && (
                                <> | <strong style={{ color: '#4CAF50' }}>Item: {selectedItem.no || selectedItem.item_code || 'N/A'} - {selectedItem.name || selectedItem.item_name || selectedItem.type || selectedItem.item_type || 'Unnamed'}</strong></>
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
                            const customerWeightTotal = Object.values(bills).reduce((sum, billSales) => 
                                sum + billSales.reduce((s, sale) => s + (Number(sale.weight) || 0), 0), 0
                            );
                            
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
                                        fontSize: '16px',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span>🏢 {customerCode}</span>
                                        <span>Total Weight: {customerWeightTotal.toFixed(2)} kg</span>
                                    </div>

                                    {Object.entries(bills).map(([billNo, sales]) => {
                                        const billTotal = calculateBillTotal(sales);
                                        const billWeightTotal = calculateBillWeightTotal(sales);
                                        const billPackCost = calculateBillPackCost(sales);
                                        const billWeightSum = sales.reduce((sum, sale) => sum + (Number(sale.weight) || 0), 0);
                                        
                                        return (
                                            <div key={billNo} style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
                                                <div style={{
                                                    background: '#f8f9fa',
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    marginBottom: '10px',
                                                    fontWeight: 'bold',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <span>🧾 Bill : {billNo}</span>
                                                    <span style={{
                                                        background: '#667eea',
                                                        color: 'white',
                                                        padding: '2px 12px',
                                                        borderRadius: '12px',
                                                        fontSize: '13px',
                                                        fontWeight: '600'
                                                    }}>
                                                        Weight: {billWeightSum.toFixed(2)} kg
                                                    </span>
                                                </div>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: '#f2f2f2' }}>
                                                            <th style={thStyle}>දිනය</th>
                                                            <th style={thStyle}>අයිතිය</th>
                                                            <th style={thStyle}>අයිතමය</th>
                                                            <th style={thStyle}>මලු</th>
                                                            <th style={thStyle}>බර</th>
                                                            <th style={thStyle}>මිල</th>
                                                            <th style={thStyle}>මලු කුලිය</th>
                                                            <th style={thStyle}>එකතුව</th>
                                                            <th style={thStyle}>වේලාව</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sales.map((sale, idx) => {
                                                            const weightTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
                                                            const packCost = (Number(sale.packs) || 0) * (Number(sale.CustomerPackCost) || 0);
                                                            return (
                                                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                                    <td style={tdStyle}>{sale.Date || '-'}</td>
                                                                    <td style={tdStyle}>{sale.supplier_code || 0}</td>
                                                                    <td style={tdStyle}>{sale.item_name || '-'}</td>
                                                                    <td style={tdStyle}>{sale.packs || 0}</td>
                                                                    <td style={tdStyle}>{Number(sale.weight || 0).toFixed(2)}</td>
                                                                    <td style={tdStyle}>{Number(sale.price_per_kg || 0).toFixed(2)}</td>
                                                                    <td style={tdStyle}>{packCost.toFixed(2)}</td>
                                                                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                                                                        {calculateSaleTotal(sale).toFixed(2)}
                                                                    </td>
                                                                    <td style={tdStyle}>
                                                                        {sale.created_at ? new Date(sale.created_at).toLocaleTimeString('si-LK', {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                            second: '2-digit',
                                                                            hour12: false
                                                                        }) : '-'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr style={{ background: '#f0f2f5', fontWeight: 'bold' }}>
                                                            <td colSpan="4" style={{ padding: '10px', textAlign: 'right' }}>Bill Totals:</td>
                                                            <td style={{ padding: '10px', textAlign: 'right' }}>{billWeightSum.toFixed(2)}</td>
                                                            <td style={{ padding: '10px', textAlign: 'right' }}>{billWeightTotal.toFixed(2)}</td>
                                                            <td style={{ padding: '10px', textAlign: 'right' }}>{billPackCost.toFixed(2)}</td>
                                                            <td style={{ padding: '10px', fontWeight: 'bold', color: '#4CAF50' }}>{billTotal.toFixed(2)}</td>
                                                            <td style={{ padding: '10px' }}></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        );
                                    })}

                                    <div style={{
                                        padding: '12px 20px',
                                        background: '#f8f9fa',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontWeight: 'bold',
                                        borderTop: '2px solid #4CAF50'
                                    }}>
                                        <span>Total Weight: {customerWeightTotal.toFixed(2)} kg</span>
                                        <span>Customer Total: Rs. {customerTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            );
                        })}

                        <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '15px 20px',
                            marginTop: '20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderRight: '5px solid #4CAF50'
                        }}>
                            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                Total Weight: {totalWeightAll.toFixed(2)} kg
                            </span>
                            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#4CAF50' }}>
                                GRAND TOTAL: Rs. {grandTotal.toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Detailed View */}
                {!loading && viewMode === 'detailed' && filteredData.length > 0 && (
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '15px',
                        overflowX: 'auto',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr style={{ background: '#4CAF50', color: 'white' }}>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'center' }}>බිල් අං</th>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'center' }}>මලු</th>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'left' }}>වර්ගය</th>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'right' }}>ප්‍රමාණය</th>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'right' }}>බැගින්</th>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'right' }}>මලු කුලිය</th>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'right' }}>එකතුව</th>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'right' }}>කුලි</th>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'center' }}>අයිතිය</th>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'center' }}>විලා</th>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'center' }}>වේලාව</th>
                                    <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'center' }}>දිනය</th>
                                    {showUserTransactions && <th style={{ ...thStyle, padding: '5px 3px', fontSize: '10px', textAlign: 'center' }}>User ID</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((sale, idx) => {
                                    const weightTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
                                    const packCost = (Number(sale.packs) || 0) * (Number(sale.CustomerPackCost) || 0);
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'center' }}>{sale.bill_no || '-'}</td>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'center' }}>{sale.packs || 0}</td>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'left' }}>{sale.item_name || '-'}</td>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'right' }}>{Number(sale.weight || 0).toFixed(2)}</td>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'right' }}>{Number(sale.price_per_kg || 0).toFixed(2)}</td>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'right' }}>{packCost.toFixed(2)}</td>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'right', fontWeight: 'bold' }}>
                                                {calculateSaleTotal(sale).toFixed(2)}
                                            </td>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'right' }}>{Number(sale.kuliya || 0).toFixed(2)}</td>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'center' }}>{sale.supplier_code || 0}</td>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'center' }}>{sale.customer_code || 0}</td>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'center' }}>
                                                {sale.created_at ? new Date(sale.created_at).toLocaleTimeString('si-LK', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit',
                                                    hour12: false
                                                }) : '-'}
                                            </td>
                                            <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'center' }}>{sale.Date || '-'}</td>
                                            {showUserTransactions && (
                                                <td style={{ ...tdStyle, padding: '4px 3px', fontSize: '11px', textAlign: 'center' }}>{sale.UniqueCode || sale.user_id || '-'}</td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f0f2f5', fontWeight: 'bold' }}>
                                    <td colSpan="3" style={{ padding: '8px 3px', textAlign: 'right', fontSize: '11px' }}>GRAND TOTAL:</td>
                                    <td style={{ padding: '8px 3px', textAlign: 'right', fontSize: '11px' }}>{totalWeightAll.toFixed(2)}</td>
                                    <td style={{ padding: '8px 3px', textAlign: 'right', fontSize: '11px' }}>
                                        {filteredData.reduce((sum, sale) => sum + ((Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0)), 0).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '8px 3px', textAlign: 'right', fontSize: '11px' }}>
                                        {filteredData.reduce((sum, sale) => sum + ((Number(sale.packs) || 0) * (Number(sale.CustomerPackCost) || 0)), 0).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '8px 3px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', color: '#4CAF50' }}>{grandTotal.toFixed(2)}</td>
                                    <td colSpan={showUserTransactions ? "6" : "6"} style={{ padding: '8px 3px', textAlign: 'center', fontSize: '11px' }}>
                                        Total Weight: {totalWeightAll.toFixed(2)} kg
                                    </td>
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
    padding: '8px 6px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600'
};

const tdStyle = {
    padding: '6px',
    fontSize: '12px'
};

export default SalesReportView;