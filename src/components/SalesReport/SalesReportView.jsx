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
    const printRef = useRef();
    const reportContentRef = useRef(null);

    // Local filter states
    const [localFilters, setLocalFilters] = useState({
        transaction_type: '',
        bill_status: '',
        customer_code: '',
        item_code: '',
        bill_no: '',
        start_date: '',
        end_date: '',
        min_total: '',
        max_total: ''
    });

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

        fetchCompanyInfo();
    }, []);

    // Function to calculate correct totals for display while keeping all records
    const calculateCorrectTotal = (sale, billPackCostMap) => {
        const weightTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
        
        // Only add CustomerPackCost for the first occurrence in each bill
        const billNo = sale.bill_no;
        let packCost = 0;
        
        if (billPackCostMap && billPackCostMap.has(billNo)) {
            const packInfo = billPackCostMap.get(billNo);
            // Only add pack cost if this is the first item in the bill
            if (packInfo.firstItemId === sale.id) {
                packCost = packInfo.totalPackCost;
            }
        }
        
        return weightTotal + packCost;
    };

    // Function to identify which records should contribute to CustomerPackCost
    const identifyPackCostRecords = (salesData) => {
        if (!salesData || !Array.isArray(salesData)) return new Map();
        
        const billPackMap = new Map();
        
        // First pass: Group by bill_no and calculate total pack cost per bill
        salesData.forEach((sale) => {
            const billNo = sale.bill_no;
            const packCost = Number(sale.CustomerPackCost) || 0;
            
            if (!billPackMap.has(billNo)) {
                billPackMap.set(billNo, {
                    totalPackCost: 0,
                    firstItemId: null,
                    items: []
                });
            }
            
            const billData = billPackMap.get(billNo);
            billData.totalPackCost += packCost;
            billData.items.push(sale);
        });
        
        // Second pass: Determine which record gets the pack cost in display
        billPackMap.forEach((billData, billNo) => {
            // Find the first item in the bill to attach the total pack cost
            if (billData.items.length > 0) {
                // Sort by id or date to get the first record
                const sortedItems = [...billData.items].sort((a, b) => {
                    return (a.id || 0) - (b.id || 0);
                });
                billData.firstItemId = sortedItems[0].id;
            }
        });
        
        return billPackMap;
    };

    // Fetch sales data when backend filters change
    const fetchFilteredData = async () => {
        setLoading(true);
        try {
            // Build params object with only the filters that have values
            const params = {};

            // Add date filters
            if (localFilters.start_date) {
                params.start_date = localFilters.start_date;
            }
            if (localFilters.end_date) {
                params.end_date = localFilters.end_date;
            }

            // Add transaction_type filter if selected
            if (localFilters.transaction_type) {
                params.transaction_type = localFilters.transaction_type;
            }

            // Add bill_status filter if selected
            if (localFilters.bill_status) {
                params.bill_status = localFilters.bill_status;
            }

            // Add bill_no filter if entered
            if (localFilters.bill_no) {
                params.bill_no = localFilters.bill_no;
            }

            // Add customer code filter
            if (localFilters.customer_code) {
                params.customer_code = localFilters.customer_code;
            }

            // Add item code filter
            if (localFilters.item_code) {
                params.item_code = localFilters.item_code;
            }

            console.log('🚀 Sending params to backend:', params);

            const response = await api.get('/sales-report', { params });
            console.log('📦 Received response from backend:', response);

            // Extract the salesData from the response
            let data = response.data?.salesData || [];
            console.log('📊 Number of records:', data.length);

            if (data.length > 0) {
                console.log('📝 First record sample:', data[0]);
            }
            
            // Identify which records should contribute to pack costs
            const packCostMap = identifyPackCostRecords(data);
            
            // Store the pack cost map with the data for calculations
            const processedData = data.map(record => ({
                ...record,
                _packCostMap: packCostMap
            }));

            setSalesData(processedData);
            // Apply client-side filters after getting new data
            applyLocalFilters(processedData);
        } catch (err) {
            console.error('❌ Error fetching sales data:', err);
            setSalesData([]);
            setFilteredData([]);
        } finally {
            setLoading(false);
        }
    };

    // This useEffect will trigger when backend filters change
    useEffect(() => {
        // Only fetch if we have backend filters
        if (localFilters.transaction_type || localFilters.bill_status || localFilters.bill_no || 
            localFilters.start_date || localFilters.end_date || localFilters.customer_code || localFilters.item_code) {
            console.log('🔍 Backend filters changed, fetching new data...');
            fetchFilteredData();
        }
    }, [localFilters.transaction_type, localFilters.bill_status, localFilters.bill_no, 
        localFilters.start_date, localFilters.end_date, localFilters.customer_code, localFilters.item_code]);

    // Initial data load if no filters are applied
    useEffect(() => {
        // If no filters are applied, load all data
        if (!localFilters.transaction_type && !localFilters.bill_status && !localFilters.bill_no &&
            !localFilters.start_date && !localFilters.end_date && !localFilters.customer_code && !localFilters.item_code) {
            fetchFilteredData();
        }
    }, []);

    // Helper function to calculate total for a sale (with proper pack cost handling)
    const calculateSaleTotal = (sale) => {
        const weightTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
        let packCost = 0;
        
        // Check if this sale should contribute to pack cost
        if (sale._packCostMap && sale._packCostMap.has(sale.bill_no)) {
            const packInfo = sale._packCostMap.get(sale.bill_no);
            // Only add pack cost for the first item in the bill
            if (packInfo.firstItemId === sale.id) {
                packCost = packInfo.totalPackCost;
            }
        }
        
        return weightTotal + packCost;
    };

    // Apply local filters (total range) - client-side only
    const applyLocalFilters = (data) => {
        // If no data provided, use salesData
        const dataToFilter = data || salesData;

        console.log('Applying local filters to', dataToFilter?.length || 0, 'records');

        // Make sure we have an array to work with
        if (!dataToFilter || !Array.isArray(dataToFilter)) {
            console.log('No valid data to filter');
            setFilteredData([]);
            return;
        }

        let filtered = [...dataToFilter];

        if (localFilters.min_total) {
            filtered = filtered.filter(sale =>
                calculateSaleTotal(sale) >= Number(localFilters.min_total)
            );
        }

        if (localFilters.max_total) {
            filtered = filtered.filter(sale =>
                calculateSaleTotal(sale) <= Number(localFilters.max_total)
            );
        }

        console.log('After local filters:', filtered.length, 'records');
        setFilteredData(filtered);
    };

    // Handle local filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        console.log(`Filter changed: ${name} = ${value}`);
        setLocalFilters(prev => ({ ...prev, [name]: value }));
    };

    // Apply all filters
    const handleApplyFilters = () => {
        console.log('Applying all filters...');
        console.log('Current localFilters:', localFilters);

        // For backend filters, the useEffect will trigger a new API call
        // For client-side filters (min_total, max_total), apply them directly
        if (localFilters.min_total || localFilters.max_total) {
            applyLocalFilters();
        }

        setShowFilters(false);
    };

    // Reset all filters
    const handleResetFilters = () => {
        console.log('Resetting all filters');
        setLocalFilters({
            transaction_type: '',
            bill_status: '',
            customer_code: '',
            item_code: '',
            bill_no: '',
            start_date: '',
            end_date: '',
            min_total: '',
            max_total: ''
        });
        // Fetch data without filters
        fetchFilteredData();
    };

    // Group data after filtering - keep ALL records visible
    const groupedData = filteredData.reduce((acc, sale) => {
        const customer = sale.customer_code || 'Unknown Customer';
        const bill = sale.bill_no || 'No Bill';
        if (!acc[customer]) acc[customer] = {};
        if (!acc[customer][bill]) acc[customer][bill] = [];
        acc[customer][bill].push(sale);
        return acc;
    }, {});

    // Calculate grand total with proper pack cost handling (only count once per bill)
    const grandTotal = Object.values(groupedData).reduce((total, custBills) => {
        return total + Object.values(custBills).reduce((custSum, billSales) => {
            // For each bill, only add pack cost once
            const billNo = billSales[0]?.bill_no;
            let packCostForBill = 0;
            
            if (billSales[0]?._packCostMap && billSales[0]._packCostMap.has(billNo)) {
                packCostForBill = billSales[0]._packCostMap.get(billNo).totalPackCost;
            }
            
            // Calculate total weight cost for all items in bill
            const weightTotal = billSales.reduce((sum, sale) => 
                sum + ((Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0)), 0);
            
            return custSum + weightTotal + packCostForBill;
        }, 0);
    }, 0);

    // Updated Print Function
    const handlePrint = () => {
        if (!isClient) return;
        
        // Get the current filtered data HTML
        const reportHTML = generateReportHTML();
        
        const win = window.open('', '_blank');
        if (!win) return alert('Please allow popups for printing');

        win.document.write(`
            <html>
            <head>
                <title>සකස් කළ විකුණුම් සාරාංශය</title>
                <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    * { margin:0; padding:0; box-sizing:border-box; }
                    body { 
                        font-family:'Noto Sans Sinhala',sans-serif; 
                        font-size:12px; 
                        line-height:1.4; 
                        padding:20px;
                        background: white;
                    }
                    .report-container {
                        max-width:1400px;
                        margin:0 auto;
                    }
                    .header-card {
                        background: white;
                        border-radius: 15px;
                        padding: 25px;
                        margin-bottom: 25px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        border-left: 5px solid #4CAF50;
                    }
                    .company-name {
                        color: #2c3e50;
                        font-size: 28px;
                        font-weight: 700;
                        margin-bottom: 5px;
                    }
                    .report-title {
                        color: #4CAF50;
                        font-size: 20px;
                        font-weight: 600;
                        margin-bottom: 10px;
                    }
                    .date-badge {
                        background: #f0f2f5;
                        padding: 8px 15px;
                        border-radius: 20px;
                        color: #666;
                        display: inline-block;
                    }
                    .filters-summary {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 10px;
                        margin-bottom: 20px;
                        border: 1px solid #e0e0e0;
                    }
                    .filter-tag {
                        background: #4CAF50;
                        color: white;
                        padding: 5px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        margin-right: 8px;
                        display: inline-block;
                    }
                    .customer-section { 
                        background: white;
                        border-radius: 12px;
                        margin-bottom: 25px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                        overflow: hidden;
                        border: 1px solid #e0e0e0;
                    }
                    .customer-header { 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 15px 20px;
                        font-weight: 600;
                        font-size: 16px;
                    }
                    .bill-section {
                        padding: 20px;
                        border-bottom: 1px solid #e0e0e0;
                    }
                    .bill-section:last-child {
                        border-bottom: none;
                    }
                    .bill-header { 
                        background: #f8f9fa;
                        padding: 12px 15px;
                        border-radius: 8px;
                        margin-bottom: 15px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-left: 4px solid #4CAF50;
                    }
                    table { 
                        width:100%; 
                        border-collapse:collapse; 
                        margin-bottom:15px;
                        border-radius: 8px;
                        overflow: hidden;
                        border: 1px solid #e0e0e0;
                    }
                    th { 
                        background: #4CAF50;
                        color: white;
                        font-weight: 600;
                        padding: 12px 8px;
                        text-align: center;
                    }
                    td { 
                        padding: 10px 8px;
                        border-bottom: 1px solid #e0e0e0;
                        vertical-align: middle;
                    }
                    tr:last-child td {
                        border-bottom: none;
                    }
                    tbody tr:hover {
                        background: #f5f5f5;
                    }
                    tfoot td {
                        background: #f0f2f5;
                        font-weight: 600;
                    }
                    .text-left { text-align: left; }
                    .text-right { text-align: right; }
                    .badge {
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 600;
                    }
                    .badge-credit {
                        background: #ffd700;
                        color: #000;
                    }
                    .badge-cash {
                        background: #4CAF50;
                        color: white;
                    }
                    .badge-printed {
                        background: #2196F3;
                        color: white;
                    }
                    .badge-not-printed {
                        background: #f44336;
                        color: white;
                    }
                    .customer-total {
                        text-align: right;
                        padding: 15px 20px;
                        background: #f8f9fa;
                        font-weight: 700;
                        color: #4CAF50;
                        border-top: 2px solid #4CAF50;
                    }
                    .grand-total {
                        background: white;
                        padding: 20px 25px;
                        border-radius: 12px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        text-align: right;
                        font-size: 20px;
                        font-weight: 700;
                        color: #2c3e50;
                        margin-top: 20px;
                        border-right: 5px solid #4CAF50;
                    }
                    @media print { 
                        .no-print { display: none !important; }
                        body { background: white; padding: 10px; }
                        .customer-header { background: #4CAF50 !important; }
                        th { background: #4CAF50 !important; }
                    }
                </style>
            </head>
            <body>
                <div class="report-container">
                    ${reportHTML}
                </div>
            </body>
            </html>
        `);
        win.document.close();
        win.onload = () => {
            win.print();
            win.onafterprint = () => win.close();
        };
    };

    // Generate HTML for the current filtered data
    const generateReportHTML = () => {
        const activeFiltersHTML = activeFilterCount > 0 ? `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                <span style="color: #666; font-weight: 500;">Active Filters:</span>
                ${localFilters.start_date || localFilters.end_date ? `
                    <span style="background: #4CAF50; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                        Date: ${localFilters.start_date || 'Start'} to ${localFilters.end_date || 'End'}
                    </span>
                ` : ''}
                ${localFilters.transaction_type ? `
                    <span style="background: #4CAF50; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                        ${localFilters.transaction_type === 'credit' ? 'Credit Transactions' : 'Cash Transactions'}
                    </span>
                ` : ''}
                ${localFilters.bill_status ? `
                    <span style="background: #2196F3; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                        ${localFilters.bill_status === 'printed' ? 'Printed Bills' : 'Not Printed Bills'}
                    </span>
                ` : ''}
                ${localFilters.bill_no ? `
                    <span style="background: #9C27B0; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                        Bill No: ${localFilters.bill_no}
                    </span>
                ` : ''}
                ${localFilters.customer_code ? `
                    <span style="background: #FF9800; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                        Customer: ${localFilters.customer_code}
                    </span>
                ` : ''}
                ${localFilters.item_code ? `
                    <span style="background: #9C27B0; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                        Item: ${localFilters.item_code}
                    </span>
                ` : ''}
                ${(localFilters.min_total || localFilters.max_total) ? `
                    <span style="background: #f44336; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                        Total: ${localFilters.min_total || '0'} - ${localFilters.max_total || '∞'}
                    </span>
                ` : ''}
            </div>
        ` : '';

        const salesHTML = Object.entries(groupedData).map(([customerCode, bills]) => {
            // Calculate customer total correctly (pack cost only once per bill)
            const customerTotal = Object.values(bills).reduce((custSum, billSales) => {
                const billNo = billSales[0]?.bill_no;
                let packCostForBill = 0;
                
                if (billSales[0]?._packCostMap && billSales[0]._packCostMap.has(billNo)) {
                    packCostForBill = billSales[0]._packCostMap.get(billNo).totalPackCost;
                }
                
                const weightTotal = billSales.reduce((sum, sale) => 
                    sum + ((Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0)), 0);
                
                return custSum + weightTotal + packCostForBill;
            }, 0);

            return `
                <div style="background: white; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e0e0e0;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 20px; font-weight: 600; font-size: 16px;">
                        🏢 ගනුදෙනුකරු කේතය: ${customerCode}
                    </div>

                    ${Object.entries(bills).map(([billNo, sales]) => {
                        const isBill = billNo !== 'No Bill';
                        // Calculate weight total only (without pack cost for individual items)
                        const weightTotal = sales.reduce((sum, sale) => sum + (Number(sale.weight) * Number(sale.price_per_kg) || 0), 0);
                        
                        // Get pack cost for this bill (only added once)
                        let packCostForBill = 0;
                        if (sales[0]?._packCostMap && sales[0]._packCostMap.has(billNo)) {
                            packCostForBill = sales[0]._packCostMap.get(billNo).totalPackCost;
                        }
                        
                        const billTotalWithPack = weightTotal + packCostForBill;
                        const firstPrinted = sales[0]?.FirstTimeBillPrintedOn;
                        const reprinted = sales[0]?.BillReprintAfterchanges;
                        
                        // Determine which item shows the pack cost
                        const firstItemId = sales[0]?._packCostMap?.get(billNo)?.firstItemId;

                        return `
                            <div style="padding: 20px; border-bottom: 1px solid #e0e0e0;">
                                <div style="background: #f8f9fa; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #4CAF50;">
                                    <strong>${isBill ? `🧾 බිල් අංකය: ${billNo}` : '📝 No Bill Number'}</strong>
                                    ${isBill ? `
                                        <div style="font-size: 12px; color: #666;">
                                            ${firstPrinted ? `<span style="margin-right: 15px;">🖨️ පළමු මුද්‍රණය: ${new Date(firstPrinted).toLocaleDateString('en-CA')}</span>` : ''}
                                            ${reprinted ? `<span>🔄 නැවත මුද්‍රණය: ${new Date(reprinted).toLocaleDateString('en-CA')}</span>` : ''}
                                        </div>
                                    ` : ''}
                                </div>

                                <table style="width:100%; border-collapse:collapse; margin-bottom:15px; border-radius:8px; overflow:hidden; border:1px solid #e0e0e0;">
                                    <thead>
                                        <tr>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px;">Date</th>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px;">බිල් අං</th>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px;">කේතය</th>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px; text-align:left;">භාණ්ඩ නාමය</th>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px;">මලු</th>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px;">බර (kg)</th>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px;">මිල/kg</th>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px;">ගනුදෙනුකරු</th>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px;">සැපයුම්කරු</th>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px;">එකතුව</th>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px;">ගනුදෙනු වර්ගය</th>
                                            <th style="background:#4CAF50; color:white; padding:12px 8px;">බිල් තත්වය</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${sales.map(sale => {
                                            const weightOnlyTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
                                            const isFirstItem = firstItemId === sale.id;
                                            const displayTotal = isFirstItem ? weightOnlyTotal + packCostForBill : weightOnlyTotal;
                                            const packIndicator = isFirstItem && packCostForBill > 0 ? ` (+Pack: ${packCostForBill})` : '';
                                            
                                            return `
                                                <tr style="border-bottom:1px solid #e0e0e0;">
                                                    <td style="padding:10px 8px; text-align:center;">${sale.Date || ''}</td>
                                                    <td style="padding:10px 8px; text-align:center;">${sale.bill_no || ''}</td>
                                                    <td style="padding:10px 8px; text-align:center;">${sale.item_code || ''}</td>
                                                    <td style="padding:10px 8px; text-align:left;">${sale.item_name || ''}${packIndicator}</td>
                                                    <td style="padding:10px 8px; text-align:right;">${sale.packs || ''}</td>
                                                    <td style="padding:10px 8px; text-align:right;">${Number(sale.weight || 0).toFixed(2)}</td>
                                                    <td style="padding:10px 8px; text-align:right;">${Number(sale.price_per_kg || 0).toFixed(2)}</td>
                                                    <td style="padding:10px 8px; text-align:center;">${sale.customer_code || ''}</td>
                                                    <td style="padding:10px 8px; text-align:center;">${sale.supplier_code || ''}</td>
                                                    <td style="padding:10px 8px; text-align:right; font-weight:600;">
                                                        ${displayTotal.toFixed(2)}
                                                    </td>
                                                    <td style="padding:10px 8px; text-align:center;">
                                                        <span style="padding:4px 8px; border-radius:12px; font-size:11px; font-weight:600; background:${sale.credit_transaction === 'Y' ? '#ffd700' : '#4CAF50'}; color:${sale.credit_transaction === 'Y' ? '#000' : 'white'};">
                                                            ${sale.credit_transaction === 'Y' ? 'Credit' : 'Cash'}
                                                        </span>
                                                    </td>
                                                    <td style="padding:10px 8px; text-align:center;">
                                                        <span style="padding:4px 8px; border-radius:12px; font-size:11px; font-weight:600; background:${sale.bill_printed === 'Y' ? '#2196F3' : '#f44336'}; color:white;">
                                                            ${sale.bill_printed === 'Y' ? 'Printed' : 'Not Printed'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="9" style="padding:12px 8px; text-align:right; background:#f0f2f5; font-weight:600;">
                                                එකතුව (බර මිල):
                                            </td>
                                            <td style="padding:12px 8px; text-align:right; background:#f0f2f5; font-weight:600; color:#4CAF50;">
                                                ${weightTotal.toFixed(2)}
                                            </td>
                                            <td colspan="2" style="background:#f0f2f5;"></td>
                                        </tr>
                                        <tr>
                                            <td colspan="9" style="padding:12px 8px; text-align:right; background:#f0f2f5; font-weight:600;">
                                                මලු සමග එකතුව:
                                            </td>
                                            <td style="padding:12px 8px; text-align:right; background:#f0f2f5; font-weight:600; color:#4CAF50;">
                                                ${billTotalWithPack.toFixed(2)}
                                            </td>
                                            <td colspan="2" style="background:#f0f2f5;"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        `;
                    }).join('')}

                    <div style="text-align:right; padding:15px 20px; background:#f8f9fa; font-weight:700; color:#4CAF50; border-top:2px solid #4CAF50;">
                        පාරිභෝගික එකතුව: ${customerTotal.toFixed(2)}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div style="background: white; border-radius: 15px; padding: 30px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 5px solid #4CAF50;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                    <div>
                        <h1 style="color: #2c3e50; font-size: 28px; font-weight: 700; margin-bottom: 5px;">
                            ${companyName}
                        </h1>
                        <h2 style="color: #4CAF50; font-size: 20px; font-weight: 600; margin-bottom: 10px;">
                            සකස් කළ විකුණුම් සාරාංශය
                        </h2>
                    </div>
                    <div style="background: #f0f2f5; padding: 8px 15px; border-radius: 20px; color: #666;">
                        📅 ${settingDate}
                    </div>
                </div>
            </div>
            ${activeFiltersHTML}
            ${salesHTML}
            ${filteredData.length > 0 ? `
                <div style="background: white; padding: 20px 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: right; font-size: 20px; font-weight: 700; color: #2c3e50; margin-top: 20px; border-right: 5px solid #4CAF50;">
                    සම්පූර්ණ එකතුව: ${grandTotal.toFixed(2)}
                </div>
            ` : ''}
        `;
    };

    // Updated Export Excel function
    const handleExportExcel = () => {
        const excelData = [];
        
        // Add headers
        excelData.push([
            'Date', 'Customer Code', 'Bill No', 'Item Code', 'Item Name', 'Packs', 'Weight (kg)',
            'Price/kg', 'Supplier Code', 'Weight Only Total', 'Pack Cost (Bill Total)', 'Display Total', 
            'Transaction Type', 'Bill Status', 'Note'
        ]);

        // Create a map to track pack costs per bill for Excel export
        const packCostMap = new Map();
        filteredData.forEach(sale => {
            const billNo = sale.bill_no;
            if (!packCostMap.has(billNo)) {
                const totalPackCost = filteredData
                    .filter(s => s.bill_no === billNo)
                    .reduce((sum, s) => sum + (Number(s.CustomerPackCost) || 0), 0);
                packCostMap.set(billNo, totalPackCost);
            }
        });

        // Add data rows
        Object.entries(groupedData).forEach(([customerCode, bills]) => {
            Object.entries(bills).forEach(([billNo, sales]) => {
                const totalPackCostForBill = packCostMap.get(billNo) || 0;
                let isFirstItem = true;
                
                sales.forEach((sale) => {
                    const weightOnlyTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
                    const displayTotal = isFirstItem ? weightOnlyTotal + totalPackCostForBill : weightOnlyTotal;
                    const note = isFirstItem && totalPackCostForBill > 0 
                        ? `Includes pack cost: ${totalPackCostForBill}` 
                        : (totalPackCostForBill > 0 ? 'Pack cost shown in first item' : '');
                    
                    excelData.push([
                        sale.Date || '',
                        customerCode,
                        billNo,
                        sale.item_code || '',
                        sale.item_name || '',
                        sale.packs || 0,
                        Number(sale.weight || 0).toFixed(2),
                        Number(sale.price_per_kg || 0).toFixed(2),
                        sale.supplier_code || '',
                        weightOnlyTotal.toFixed(2),
                        isFirstItem ? totalPackCostForBill.toFixed(2) : '0.00',
                        displayTotal.toFixed(2),
                        sale.credit_transaction === 'Y' ? 'Credit' : 'Cash',
                        sale.bill_printed === 'Y' ? 'Printed' : 'Not Printed',
                        note
                    ]);
                    
                    isFirstItem = false;
                });
            });
        });

        // Add empty row before totals
        excelData.push([]);
        
        // Add grand total
        excelData.push(['GRAND TOTAL', '', '', '', '', '', '', '', '', '', '', grandTotal.toFixed(2), '', '', '']);

        // Add filter information
        excelData.push([]);
        excelData.push(['FILTERS APPLIED:']);
        if (localFilters.start_date || localFilters.end_date) {
            excelData.push(['Date Range', `${localFilters.start_date || 'Start'} to ${localFilters.end_date || 'End'}`]);
        }
        if (localFilters.transaction_type) {
            excelData.push(['Transaction Type', localFilters.transaction_type === 'credit' ? 'Credit Only' : 'Cash Only']);
        }
        if (localFilters.bill_status) {
            excelData.push(['Bill Status', localFilters.bill_status === 'printed' ? 'Printed Bills' : 'Not Printed Bills']);
        }
        if (localFilters.bill_no) {
            excelData.push(['Bill Number', localFilters.bill_no]);
        }
        if (localFilters.customer_code) {
            excelData.push(['Customer Code', localFilters.customer_code]);
        }
        if (localFilters.item_code) {
            excelData.push(['Item Code/Name', localFilters.item_code]);
        }
        if (localFilters.min_total || localFilters.max_total) {
            excelData.push(['Total Range', `${localFilters.min_total || '0'} - ${localFilters.max_total || '∞'}`]);
        }
        
        // Add note about pack cost handling
        excelData.push([]);
        excelData.push(['NOTE: Pack costs are only counted once per bill and displayed with the first item only to prevent double counting']);

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 12 }, // Date
            { wch: 15 }, // Customer Code
            { wch: 12 }, // Bill No
            { wch: 12 }, // Item Code
            { wch: 25 }, // Item Name
            { wch: 8 },  // Packs
            { wch: 12 }, // Weight
            { wch: 10 }, // Price/kg
            { wch: 15 }, // Supplier Code
            { wch: 15 }, // Weight Only Total
            { wch: 15 }, // Pack Cost
            { wch: 12 }, // Display Total
            { wch: 15 }, // Transaction Type
            { wch: 12 }, // Bill Status
            { wch: 35 }  // Note
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
        
        // Generate filename with current date and filter info
        const dateStr = new Date().toISOString().split('T')[0];
        let filename = `Sales_Report_${dateStr}`;
        if (localFilters.start_date || localFilters.end_date) {
            filename += `_${localFilters.start_date || 'start'}_to_${localFilters.end_date || 'end'}`;
        }
        if (localFilters.transaction_type) filename += `_${localFilters.transaction_type}`;
        if (localFilters.bill_status) filename += `_${localFilters.bill_status}`;
        if (localFilters.bill_no) filename += `_bill_${localFilters.bill_no}`;
        filename += '.xlsx';
        
        XLSX.writeFile(wb, filename);
    };

    const activeFilterCount = Object.values(localFilters).filter(v => v !== '').length;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <div ref={printRef} style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Action Bar */}
                <div className="no-print" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            style={{
                                padding: '10px 20px',
                                background: showFilters ? '#f44336' : '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600',
                                transition: 'all 0.3s'
                            }}
                        >
                            <span>🔍</span>
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                            {activeFilterCount > 0 && (
                                <span style={{
                                    background: 'white',
                                    color: '#4CAF50',
                                    borderRadius: '50%',
                                    width: '22px',
                                    height: '22px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}>
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={handleExportExcel}
                            style={{
                                padding: '10px 20px',
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600'
                            }}
                        >
                            <span>📊</span> Export Excel
                        </button>

                        <button
                            onClick={handlePrint}
                            style={{
                                padding: '10px 20px',
                                background: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600'
                            }}
                        >
                            <span>📄</span> Export PDF
                        </button>

                        <button
                            onClick={() => window.print()}
                            style={{
                                padding: '10px 20px',
                                background: '#FF9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600'
                            }}
                        >
                            <span>🖨️</span> Quick Print
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        ✕ Close Report
                    </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="no-print" style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '25px',
                        marginBottom: '25px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{
                            color: '#2c3e50',
                            marginBottom: '20px',
                            fontSize: '18px',
                            fontWeight: '600',
                            borderBottom: '2px solid #4CAF50',
                            paddingBottom: '10px'
                        }}>
                            Filter Records
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px',
                            marginBottom: '20px'
                        }}>
                            {/* Date Range Filters */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#666',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}>
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={localFilters.start_date}
                                    onChange={handleFilterChange}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        transition: 'border 0.3s',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#666',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}>
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    name="end_date"
                                    value={localFilters.end_date}
                                    onChange={handleFilterChange}
                                    min={localFilters.start_date}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        transition: 'border 0.3s',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#666',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}>
                                    Transaction Type
                                </label>
                                <select
                                    name="transaction_type"
                                    value={localFilters.transaction_type}
                                    onChange={handleFilterChange}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        transition: 'border 0.3s',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">All Transactions</option>
                                    <option value="credit">Credit Only</option>
                                    <option value="cash">Cash Only</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#666',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}>
                                    Bill Status
                                </label>
                                <select
                                    name="bill_status"
                                    value={localFilters.bill_status}
                                    onChange={handleFilterChange}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        transition: 'border 0.3s',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">All Bills</option>
                                    <option value="printed">Printed Bills</option>
                                    <option value="not_printed">Not Printed Bills</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#666',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}>
                                    Bill Number
                                </label>
                                <input
                                    type="text"
                                    name="bill_no"
                                    value={localFilters.bill_no}
                                    onChange={handleFilterChange}
                                    placeholder="Enter bill number..."
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        transition: 'border 0.3s',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#666',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}>
                                    Customer Code
                                </label>
                                <input
                                    type="text"
                                    name="customer_code"
                                    value={localFilters.customer_code}
                                    onChange={handleFilterChange}
                                    placeholder="Search customer..."
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        transition: 'border 0.3s',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#666',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}>
                                    Item Code/Name
                                </label>
                                <input
                                    type="text"
                                    name="item_code"
                                    value={localFilters.item_code}
                                    onChange={handleFilterChange}
                                    placeholder="Search item..."
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        transition: 'border 0.3s',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#666',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}>
                                    Min Total
                                </label>
                                <input
                                    type="number"
                                    name="min_total"
                                    value={localFilters.min_total}
                                    onChange={handleFilterChange}
                                    placeholder="Minimum amount"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        transition: 'border 0.3s',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#666',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}>
                                    Max Total
                                </label>
                                <input
                                    type="number"
                                    name="max_total"
                                    value={localFilters.max_total}
                                    onChange={handleFilterChange}
                                    placeholder="Maximum amount"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        transition: 'border 0.3s',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={handleResetFilters}
                                style={{
                                    padding: '10px 25px',
                                    background: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    transition: 'all 0.3s'
                                }}
                            >
                                Reset Filters
                            </button>
                            <button
                                onClick={handleApplyFilters}
                                style={{
                                    padding: '10px 25px',
                                    background: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    transition: 'all 0.3s'
                                }}
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Active Filters Display */}
                {activeFilterCount > 0 && (
                    <div style={{
                        background: 'white',
                        padding: '15px 20px',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: '#666', fontWeight: '500' }}>Active Filters:</span>
                        {(localFilters.start_date || localFilters.end_date) && (
                            <span style={{
                                background: '#4CAF50',
                                color: 'white',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px'
                            }}>
                                Date: {localFilters.start_date || 'Start'} to {localFilters.end_date || 'End'}
                            </span>
                        )}
                        {localFilters.transaction_type && (
                            <span style={{
                                background: '#4CAF50',
                                color: 'white',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px'
                            }}>
                                {localFilters.transaction_type === 'credit' ? 'Credit Transactions' : 'Cash Transactions'}
                            </span>
                        )}
                        {localFilters.bill_status && (
                            <span style={{
                                background: '#2196F3',
                                color: 'white',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px'
                            }}>
                                {localFilters.bill_status === 'printed' ? 'Printed Bills' : 'Not Printed Bills'}
                            </span>
                        )}
                        {localFilters.bill_no && (
                            <span style={{
                                background: '#9C27B0',
                                color: 'white',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px'
                            }}>
                                Bill No: {localFilters.bill_no}
                            </span>
                        )}
                        {localFilters.customer_code && (
                            <span style={{
                                background: '#FF9800',
                                color: 'white',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px'
                            }}>
                                Customer: {localFilters.customer_code}
                            </span>
                        )}
                        {localFilters.item_code && (
                            <span style={{
                                background: '#9C27B0',
                                color: 'white',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px'
                            }}>
                                Item: {localFilters.item_code}
                            </span>
                        )}
                        {(localFilters.min_total || localFilters.max_total) && (
                            <span style={{
                                background: '#f44336',
                                color: 'white',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px'
                            }}>
                                Total: {localFilters.min_total || '0'} - {localFilters.max_total || '∞'}
                            </span>
                        )}
                    </div>
                )}

                {/* Report Header */}
                <div ref={reportContentRef} id="report-content" style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '30px',
                    marginBottom: '25px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    borderLeft: '5px solid #4CAF50'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                            <h1 style={{ color: '#2c3e50', fontSize: '28px', fontWeight: '700', marginBottom: '5px' }}>
                                {companyName}
                            </h1>
                            <h2 style={{ color: '#4CAF50', fontSize: '20px', fontWeight: '600', marginBottom: '10px' }}>
                                සකස් කළ විකුණුම් සාරාංශය
                            </h2>
                        </div>
                        <div style={{
                            background: '#f0f2f5',
                            padding: '8px 15px',
                            borderRadius: '20px',
                            color: '#666'
                        }}>
                            📅 {settingDate}
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '50px',
                        background: 'white',
                        borderRadius: '12px'
                    }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            border: '5px solid #f3f3f3',
                            borderTop: '5px solid #4CAF50',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 20px'
                        }}></div>
                        <p style={{ color: '#666' }}>Loading data...</p>
                    </div>
                )}

                {/* Sales Data */}
                {!loading && filteredData.length === 0 ? (
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: '#666'
                    }}>
                        <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>📭</span>
                        <h3>No processed sales records found</h3>
                        <p>Try adjusting your filters or check back later</p>
                    </div>
                ) : (
                    !loading && Object.entries(groupedData).map(([customerCode, bills]) => {
                        // Calculate customer total correctly
                        const customerTotal = Object.values(bills).reduce((custSum, billSales) => {
                            const billNo = billSales[0]?.bill_no;
                            let packCostForBill = 0;
                            
                            if (billSales[0]?._packCostMap && billSales[0]._packCostMap.has(billNo)) {
                                packCostForBill = billSales[0]._packCostMap.get(billNo).totalPackCost;
                            }
                            
                            const weightTotal = billSales.reduce((sum, sale) => 
                                sum + ((Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0)), 0);
                            
                            return custSum + weightTotal + packCostForBill;
                        }, 0);

                        return (
                            <div key={customerCode} style={{
                                background: 'white',
                                borderRadius: '12px',
                                marginBottom: '25px',
                                boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    padding: '15px 20px',
                                    fontWeight: '600',
                                    fontSize: '16px'
                                }}>
                                    🏢 ගනුදෙනුකරු කේතය: {customerCode}
                                </div>

                                {Object.entries(bills).map(([billNo, sales]) => {
                                    const isBill = billNo !== 'No Bill';
                                    const weightTotal = sales.reduce((sum, sale) => sum + (Number(sale.weight) * Number(sale.price_per_kg) || 0), 0);
                                    
                                    let packCostForBill = 0;
                                    if (sales[0]?._packCostMap && sales[0]._packCostMap.has(billNo)) {
                                        packCostForBill = sales[0]._packCostMap.get(billNo).totalPackCost;
                                    }
                                    
                                    const billTotalWithPack = weightTotal + packCostForBill;
                                    const firstPrinted = sales[0]?.FirstTimeBillPrintedOn;
                                    const reprinted = sales[0]?.BillReprintAfterchanges;
                                    const firstItemId = sales[0]?._packCostMap?.get(billNo)?.firstItemId;

                                    return (
                                        <div key={billNo} style={{
                                            padding: '20px',
                                            borderBottom: '1px solid #e0e0e0'
                                        }}>
                                            <div style={{
                                                background: '#f8f9fa',
                                                padding: '12px 15px',
                                                borderRadius: '8px',
                                                marginBottom: '15px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderLeft: '4px solid #4CAF50'
                                            }}>
                                                <strong>{isBill ? `🧾 බිල් අංකය: ${billNo}` : '📝 No Bill Number'}</strong>
                                                {isBill && (
                                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                                        {firstPrinted && <span style={{ marginRight: '15px' }}>🖨️ පළමු මුද්‍රණය: {new Date(firstPrinted).toLocaleDateString('en-CA')}</span>}
                                                        {reprinted && <span>🔄 නැවත මුද්‍රණය: {new Date(reprinted).toLocaleDateString('en-CA')}</span>}
                                                    </div>
                                                )}
                                            </div>

                                            <table style={{
                                                width: '100%',
                                                borderCollapse: 'collapse',
                                                marginBottom: '15px',
                                                borderRadius: '8px',
                                                overflow: 'hidden'
                                            }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px' }}>Date</th>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px' }}>බිල් අං</th>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px' }}>කේතය</th>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px', textAlign: 'left' }}>භාණ්ඩ නාමය</th>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px' }}>මලු</th>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px' }}>බර (kg)</th>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px' }}>මිල/kg</th>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px' }}>ගනුදෙනුකරු</th>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px' }}>සැපයුම්කරු</th>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px' }}>එකතුව</th>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px' }}>ගනුදෙනු වර්ගය</th>
                                                        <th style={{ background: '#4CAF50', color: 'white', padding: '12px 8px' }}>බිල් තත්වය</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sales.map((sale, idx) => {
                                                        const weightOnlyTotal = (Number(sale.weight) || 0) * (Number(sale.price_per_kg) || 0);
                                                        const isFirstItem = firstItemId === sale.id;
                                                        const displayTotal = isFirstItem ? weightOnlyTotal + packCostForBill : weightOnlyTotal;
                                                        const packIndicator = isFirstItem && packCostForBill > 0 ? ` (+Pack: ${packCostForBill})` : '';
                                                        
                                                        return (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>{sale.Date || ''}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>{sale.bill_no}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>{sale.item_code}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'left' }}>{sale.item_name}{packIndicator}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'right' }}>{sale.packs}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(sale.weight).toFixed(2)}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(sale.price_per_kg).toFixed(2)}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>{sale.customer_code}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>{sale.supplier_code}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>
                                                                    {displayTotal.toFixed(2)}
                                                                </td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                                    <span style={{
                                                                        padding: '4px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        fontWeight: '600',
                                                                        background: sale.credit_transaction === 'Y' ? '#ffd700' : '#4CAF50',
                                                                        color: sale.credit_transaction === 'Y' ? '#000' : 'white'
                                                                    }}>
                                                                        {sale.credit_transaction === 'Y' ? 'Credit' : 'Cash'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                                    <span style={{
                                                                        padding: '4px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        fontWeight: '600',
                                                                        background: sale.bill_printed === 'Y' ? '#2196F3' : '#f44336',
                                                                        color: 'white'
                                                                    }}>
                                                                        {sale.bill_printed === 'Y' ? 'Printed' : 'Not Printed'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr>
                                                        <td colSpan="9" style={{ padding: '12px 8px', textAlign: 'right', background: '#f0f2f5', fontWeight: '600' }}>
                                                            එකතුව (බර මිල):
                                                        </td>
                                                        <td style={{ padding: '12px 8px', textAlign: 'right', background: '#f0f2f5', fontWeight: '600', color: '#4CAF50' }}>
                                                            {weightTotal.toFixed(2)}
                                                        </td>
                                                        <td colSpan="2" style={{ background: '#f0f2f5' }}></td>
                                                    </tr>
                                                    <tr>
                                                        <td colSpan="9" style={{ padding: '12px 8px', textAlign: 'right', background: '#f0f2f5', fontWeight: '600' }}>
                                                            මලු සමග එකතුව:
                                                        </td>
                                                        <td style={{ padding: '12px 8px', textAlign: 'right', background: '#f0f2f5', fontWeight: '600', color: '#4CAF50' }}>
                                                            {billTotalWithPack.toFixed(2)}
                                                        </td>
                                                        <td colSpan="2" style={{ background: '#f0f2f5' }}></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    );
                                })}

                                <div style={{
                                    textAlign: 'right',
                                    padding: '15px 20px',
                                    background: '#f8f9fa',
                                    fontWeight: '700',
                                    color: '#4CAF50',
                                    borderTop: '2px solid #4CAF50'
                                }}>
                                    පාරිභෝගික එකතුව: {customerTotal.toFixed(2)}
                                </div>
                            </div>
                        );
                    })
                )}

                {filteredData.length > 0 && (
                    <div style={{
                        background: 'white',
                        padding: '20px 25px',
                        borderRadius: '12px',
                        boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
                        textAlign: 'right',
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#2c3e50',
                        marginTop: '20px',
                        borderRight: '5px solid #4CAF50'
                    }}>
                        සම්පූර්ණ එකතුව: {grandTotal.toFixed(2)}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default SalesReportView;