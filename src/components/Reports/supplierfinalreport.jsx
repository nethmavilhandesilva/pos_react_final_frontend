import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';
import Sidebar from '../Sidebar';

const SupplierReport = () => {
    // Report Data
    const [reportData, setReportData] = useState({ billed: {}, nonBilled: {} });
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('grouped');

    // Local filter states
    const [localFilters, setLocalFilters] = useState({
        start_date: '',
        end_date: '',
        supplier_code: '',
        supplier_bill_no: '',
        customer_code: '',
        item_code: '',
        min_total: '',
        max_total: '',
        sort_by: 'supplier_code_asc'
    });

    // Sort options
    const sortOptions = [
        { value: 'supplier_code_asc', label: 'Supplier Code (Ascending)' },
        { value: 'supplier_code_desc', label: 'Supplier Code (Descending)' },
        { value: 'supplier_bill_no_asc', label: 'Supplier Bill No (Ascending)' },
        { value: 'supplier_bill_no_desc', label: 'Supplier Bill No (Descending)' },
        { value: 'customer_code_asc', label: 'Customer Code (Ascending)' },
        { value: 'customer_code_desc', label: 'Customer Code (Descending)' },
        { value: 'item_code_asc', label: 'Item Code (Ascending)' },
        { value: 'item_code_desc', label: 'Item Code (Descending)' },
        { value: 'total_asc', label: 'Total (Low to High)' },
        { value: 'total_desc', label: 'Total (High to Low)' },
        { value: 'profit_asc', label: 'Profit (Low to High)' },
        { value: 'profit_desc', label: 'Profit (High to Low)' }
    ];

    // Fetch Report
    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await api.get('/supplier-report', {
                params: {
                    start_date: localFilters.start_date,
                    end_date: localFilters.end_date
                }
            });
            setReportData(response.data);
            applyFilters(response.data);
        } catch (error) {
            console.error("Error fetching report:", error);
        } finally {
            setLoading(false);
        }
    };

    // Convert grouped data to flat array for filtering/sorting
    const flattenData = (data) => {
        const flatArray = [];
        
        Object.entries(data.nonBilled || {}).forEach(([supplierCode, sales]) => {
            sales.forEach(sale => {
                flatArray.push({
                    ...sale,
                    supplier_code: supplierCode,
                    bill_status: 'Not Printed',
                    bill_type: 'nonBilled'
                });
            });
        });
        
        Object.entries(data.billed || {}).forEach(([supplierCode, sales]) => {
            sales.forEach(sale => {
                flatArray.push({
                    ...sale,
                    supplier_code: supplierCode,
                    bill_status: 'Printed',
                    bill_type: 'billed'
                });
            });
        });
        
        return flatArray;
    };

    // Sort data function
    const sortData = (data, sortBy) => {
        if (!data || data.length === 0) return data;
        
        const sorted = [...data];
        
        switch(sortBy) {
            case 'supplier_code_asc':
                return sorted.sort((a, b) => (a.supplier_code || '').localeCompare(b.supplier_code || ''));
            case 'supplier_code_desc':
                return sorted.sort((a, b) => (b.supplier_code || '').localeCompare(a.supplier_code || ''));
            case 'supplier_bill_no_asc':
                return sorted.sort((a, b) => (a.supplier_bill_no || '').localeCompare(b.supplier_bill_no || ''));
            case 'supplier_bill_no_desc':
                return sorted.sort((a, b) => (b.supplier_bill_no || '').localeCompare(a.supplier_bill_no || ''));
            case 'customer_code_asc':
                return sorted.sort((a, b) => (a.customer_code || '').localeCompare(b.customer_code || ''));
            case 'customer_code_desc':
                return sorted.sort((a, b) => (b.customer_code || '').localeCompare(a.customer_code || ''));
            case 'item_code_asc':
                return sorted.sort((a, b) => (a.item_code || '').localeCompare(b.item_code || ''));
            case 'item_code_desc':
                return sorted.sort((a, b) => (b.item_code || '').localeCompare(a.item_code || ''));
            case 'total_asc':
                return sorted.sort((a, b) => (Number(a.SupplierTotal) || 0) - (Number(b.SupplierTotal) || 0));
            case 'total_desc':
                return sorted.sort((a, b) => (Number(b.SupplierTotal) || 0) - (Number(a.SupplierTotal) || 0));
            case 'profit_asc':
                return sorted.sort((a, b) => (Number(a.profit) || 0) - (Number(b.profit) || 0));
            case 'profit_desc':
                return sorted.sort((a, b) => (Number(b.profit) || 0) - (Number(a.profit) || 0));
            default:
                return sorted;
        }
    };

    // Apply all filters
    const applyFilters = (data) => {
        let flat = flattenData(data);
        
        if (localFilters.supplier_code) {
            flat = flat.filter(item => 
                item.supplier_code && item.supplier_code.toLowerCase().includes(localFilters.supplier_code.toLowerCase())
            );
        }
        
        if (localFilters.supplier_bill_no) {
            flat = flat.filter(item => 
                item.supplier_bill_no && item.supplier_bill_no.toLowerCase().includes(localFilters.supplier_bill_no.toLowerCase())
            );
        }
        
        if (localFilters.customer_code) {
            flat = flat.filter(item => 
                item.customer_code && item.customer_code.toLowerCase().includes(localFilters.customer_code.toLowerCase())
            );
        }
        
        if (localFilters.item_code) {
            flat = flat.filter(item => 
                item.item_code && item.item_code.toLowerCase().includes(localFilters.item_code.toLowerCase())
            );
        }
        
        if (localFilters.min_total) {
            flat = flat.filter(item => (Number(item.SupplierTotal) || 0) >= Number(localFilters.min_total));
        }
        if (localFilters.max_total) {
            flat = flat.filter(item => (Number(item.SupplierTotal) || 0) <= Number(localFilters.max_total));
        }
        
        flat = sortData(flat, localFilters.sort_by);
        setFilteredData(flat);
    };

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setLocalFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilters = () => {
        fetchReport();
        setShowFilters(false);
    };

    const handleResetFilters = () => {
        setLocalFilters({
            start_date: '',
            end_date: '',
            supplier_code: '',
            supplier_bill_no: '',
            customer_code: '',
            item_code: '',
            min_total: '',
            max_total: '',
            sort_by: 'supplier_code_asc'
        });
        fetchReport();
    };

    // Group data by supplier for grouped view
    const groupedData = filteredData.reduce((acc, sale) => {
        const supplier = sale.supplier_code || 'Unknown';
        const billNo = sale.supplier_bill_no || 'No Bill';
        if (!acc[supplier]) acc[supplier] = {};
        if (!acc[supplier][billNo]) acc[supplier][billNo] = [];
        acc[supplier][billNo].push(sale);
        return acc;
    }, {});

    const calculateBillTotal = (sales) => {
        return sales.reduce((sum, sale) => sum + (Number(sale.SupplierTotal) || 0), 0);
    };

    const calculateSupplierTotal = (bills) => {
        return Object.values(bills).reduce((sum, billSales) => sum + calculateBillTotal(billSales), 0);
    };

    const grandTotal = Object.values(groupedData).reduce((total, bills) => 
        total + calculateSupplierTotal(bills), 0);

    const activeFilterCount = Object.values(localFilters).filter(v => v !== '' && v !== 'supplier_code_asc').length;

    useEffect(() => {
        fetchReport();
    }, [localFilters.start_date, localFilters.end_date]);

    // Generate detailed HTML for printing with proper table structure
    const generateDetailedPrintHTML = () => {
        if (filteredData.length === 0) return '<p>No records found</p>';
        
        return `
            <div style="width:100%; overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead>
                        <tr style="background:#4CAF50; color:white;">
                            <th style="border:1px solid #ddd; padding:10px 8px; text-align:left;">Date</th>
                            <th style="border:1px solid #ddd; padding:10px 8px; text-align:left;">Supplier Code</th>
                            <th style="border:1px solid #ddd; padding:10px 8px; text-align:left;">Supplier Bill No</th>
                            <th style="border:1px solid #ddd; padding:10px 8px; text-align:left;">Customer</th>
                            <th style="border:1px solid #ddd; padding:10px 8px; text-align:left;">Item Code</th>
                            <th style="border:1px solid #ddd; padding:10px 8px; text-align:left;">Item Name</th>
                            <th style="border:1px solid #ddd; padding:10px 8px; text-align:right;">Weight</th>
                            <th style="border:1px solid #ddd; padding:10px 8px; text-align:right;">Price/kg</th>
                            <th style="border:1px solid #ddd; padding:10px 8px; text-align:right;">Total</th>
                            <th style="border:1px solid #ddd; padding:10px 8px; text-align:right;">Profit</th>
                            <th style="border:1px solid #ddd; padding:10px 8px; text-align:center;">Bill Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredData.map(item => `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="border:1px solid #ddd; padding:8px;">${item.Date || '-'}</td>
                                <td style="border:1px solid #ddd; padding:8px;">${item.supplier_code || '-'}</td>
                                <td style="border:1px solid #ddd; padding:8px;">${item.supplier_bill_no || '-'}</td>
                                <td style="border:1px solid #ddd; padding:8px;">${item.customer_code || '-'}</td>
                                <td style="border:1px solid #ddd; padding:8px;">${item.item_code || '-'}</td>
                                <td style="border:1px solid #ddd; padding:8px;">${item.item_name || '-'}</td>
                                <td style="border:1px solid #ddd; padding:8px; text-align:right;">${Number(item.SupplierWeight || 0).toFixed(2)}</td>
                                <td style="border:1px solid #ddd; padding:8px; text-align:right;">${Number(item.SupplierPricePerKg || 0).toFixed(2)}</td>
                                <td style="border:1px solid #ddd; padding:8px; text-align:right; font-weight:bold;">${(Number(item.SupplierTotal) || 0).toFixed(2)}</td>
                                <td style="border:1px solid #ddd; padding:8px; text-align:right; color:#4CAF50;">${(Number(item.profit) || 0).toFixed(2)}</td>
                                <td style="border:1px solid #ddd; padding:8px; text-align:center;">
                                    <span style="background: ${item.bill_status === 'Printed' ? '#2196F3' : '#f44336'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                        ${item.bill_status || 'Not Printed'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background:#f0f2f5; font-weight:bold;">
                            <td colspan="8" style="border:1px solid #ddd; padding:12px; text-align:right;">GRAND TOTAL:</td>
                            <td style="border:1px solid #ddd; padding:12px; text-align:right; color:#4CAF50;">${grandTotal.toFixed(2)}</td>
                            <td colspan="2" style="border:1px solid #ddd; padding:12px;"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const printHTML = generateDetailedPrintHTML();
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Supplier Report</title>
                <meta charset="UTF-8">
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
                        font-size: 12px;
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
                        margin: 5px 0;
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
                        page-break-inside: avoid;
                    }
                    th { 
                        background: #4CAF50; 
                        color: white; 
                        font-weight: bold;
                        padding: 10px 8px;
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 8px; 
                    }
                    .grand-total { 
                        text-align: right; 
                        font-size: 16px; 
                        font-weight: bold; 
                        margin-top: 20px; 
                        padding: 15px 20px;
                        background: #f0f2f5;
                        border-radius: 8px;
                    }
                    @media print {
                        body { padding: 10px; }
                        th { background: #4CAF50 !important; }
                        .no-print { display: none; }
                        table { page-break-inside: avoid; }
                        tr { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">මංජු සහ සහෝදරයෝ</div>
                    <div class="report-title">Supplier Report - Detailed View</div>
                    <div class="report-date">Date: ${new Date().toLocaleDateString()}</div>
                    <div class="sort-info">
                        📊 Sorted By: ${sortOptions.find(opt => opt.value === localFilters.sort_by)?.label || 'Supplier Code'}
                    </div>
                    ${activeFilterCount > 0 ? `
                        <div class="filter-info">
                            🔍 Active Filters: 
                            ${localFilters.start_date ? `Start: ${localFilters.start_date} | ` : ''}
                            ${localFilters.end_date ? `End: ${localFilters.end_date} | ` : ''}
                            ${localFilters.supplier_code ? `Supplier: ${localFilters.supplier_code} | ` : ''}
                            ${localFilters.supplier_bill_no ? `Bill No: ${localFilters.supplier_bill_no} | ` : ''}
                            ${localFilters.customer_code ? `Customer: ${localFilters.customer_code}` : ''}
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

    const handleExportExcel = () => {
        const excelData = [
            ['Date', 'Supplier Code', 'Supplier Bill No', 'Customer Code', 'Item Code', 'Item Name', 
             'Weight (kg)', 'Price/kg', 'Total', 'Profit', 'Bill Status']
        ];

        filteredData.forEach(item => {
            excelData.push([
                item.Date || '',
                item.supplier_code || '',
                item.supplier_bill_no || '',
                item.customer_code || '',
                item.item_code || '',
                item.item_name || '',
                Number(item.SupplierWeight || 0).toFixed(2),
                Number(item.SupplierPricePerKg || 0).toFixed(2),
                (Number(item.SupplierTotal) || 0).toFixed(2),
                (Number(item.profit) || 0).toFixed(2),
                item.bill_status || 'Not Printed'
            ]);
        });

        excelData.push([]);
        excelData.push(['GRAND TOTAL', '', '', '', '', '', '', '', grandTotal.toFixed(2), '', '']);

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Supplier Report');
        
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Supplier_Report_${dateStr}.xlsx`);
    };

    const buttonStyle = {
        primary: { padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
        secondary: { padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
        success: { padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
        danger: { padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }
    };

    const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: '#555' };
    const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
    const thStyle = { padding: '10px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' };
    const tdStyle = { padding: '8px', fontSize: '12px' };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            
            <div style={{
                marginLeft: '260px',
                padding: '30px',
                width: '100%',
                backgroundColor: '#f5f5f5',
                minHeight: '100vh'
            }}>
                
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
                        <h1 style={{ fontSize: '24px', margin: 0, color: '#333' }}>Supplier Report</h1>
                        <p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>
                            {localFilters.start_date && localFilters.end_date ? 
                                `Showing records from ${localFilters.start_date} to ${localFilters.end_date}` : 
                                'All records'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => setShowFilters(!showFilters)} style={buttonStyle.secondary}>
                            🔍 Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                        </button>
                        <button onClick={() => setViewMode(viewMode === 'grouped' ? 'detailed' : 'grouped')} style={buttonStyle.secondary}>
                            {viewMode === 'grouped' ? '📋 Switch to Detailed View' : '📊 Switch to Grouped View'}
                        </button>
                        <button onClick={handleExportExcel} style={buttonStyle.success}>📊 Export Excel</button>
                        <button onClick={handlePrint} style={buttonStyle.primary}>🖨️ Print (Detailed)</button>
                    </div>
                </div>

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
                    <span style={{ color: '#1976d2' }}>{sortOptions.find(opt => opt.value === localFilters.sort_by)?.label || 'Supplier Code'}</span>
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
                                <label style={labelStyle}>Supplier Code</label>
                                <input type="text" name="supplier_code" value={localFilters.supplier_code} onChange={handleFilterChange} placeholder="Enter supplier code" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Supplier Bill No</label>
                                <input type="text" name="supplier_bill_no" value={localFilters.supplier_bill_no} onChange={handleFilterChange} placeholder="Enter bill number" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Customer Code</label>
                                <input type="text" name="customer_code" value={localFilters.customer_code} onChange={handleFilterChange} placeholder="Enter customer code" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Item Code</label>
                                <input type="text" name="item_code" value={localFilters.item_code} onChange={handleFilterChange} placeholder="Enter item code" style={inputStyle} />
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
                            <strong> Suppliers:</strong> {Object.keys(groupedData).length} |
                            <strong> Total Bills:</strong> {Object.values(groupedData).reduce((sum, bills) => sum + Object.keys(bills).length, 0)}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
                            Grand Total: Rs. {grandTotal.toFixed(2)}
                        </div>
                    </div>
                )}

                {/* Grouped View */}
                {!loading && viewMode === 'grouped' && filteredData.length > 0 && (
                    <div>
                        {Object.entries(groupedData).map(([supplierCode, bills]) => {
                            const supplierTotal = calculateSupplierTotal(bills);
                            return (
                                <div key={supplierCode} style={{
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
                                        🏢 Supplier: {supplierCode}
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
                                                    🧾 Supplier Bill #: {billNo}
                                                </div>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: '#f2f2f2' }}>
                                                            <th style={thStyle}>Date</th>
                                                            <th style={thStyle}>Customer</th>
                                                            <th style={thStyle}>Item Code</th>
                                                            <th style={thStyle}>Item Name</th>
                                                            <th style={thStyle}>Weight</th>
                                                            <th style={thStyle}>Price/kg</th>
                                                            <th style={thStyle}>Total</th>
                                                            <th style={thStyle}>Profit</th>
                                                            <th style={thStyle}>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sales.map((sale, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                                <td style={tdStyle}>{sale.Date || '-'}</td>
                                                                <td style={tdStyle}>{sale.customer_code || '-'}</td>
                                                                <td style={tdStyle}>{sale.item_code || '-'}</td>
                                                                <td style={tdStyle}>{sale.item_name || '-'}</td>
                                                                <td style={tdStyle}>{Number(sale.SupplierWeight || 0).toFixed(2)}</td>
                                                                <td style={tdStyle}>{Number(sale.SupplierPricePerKg || 0).toFixed(2)}</td>
                                                                <td style={{ ...tdStyle, fontWeight: 'bold' }}>{(Number(sale.SupplierTotal) || 0).toFixed(2)}</td>
                                                                <td style={{ ...tdStyle, color: '#4CAF50' }}>{(Number(sale.profit) || 0).toFixed(2)}</td>
                                                                <td style={tdStyle}>
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        background: sale.bill_status === 'Printed' ? '#2196F3' : '#f44336',
                                                                        color: 'white'
                                                                    }}>
                                                                        {sale.bill_status || 'Not Printed'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr style={{ background: '#f0f2f5' }}>
                                                            <td colSpan="6" style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>Bill Total:</td>
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
                                        Supplier Total: Rs. {supplierTotal.toFixed(2)}
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

                {/* Detailed View */}
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
                                    <th style={thStyle}>Supplier Code</th>
                                    <th style={thStyle}>Supplier Bill No</th>
                                    <th style={thStyle}>Customer</th>
                                    <th style={thStyle}>Item Code</th>
                                    <th style={thStyle}>Item Name</th>
                                    <th style={thStyle}>Weight</th>
                                    <th style={thStyle}>Price/kg</th>
                                    <th style={thStyle}>Total</th>
                                    <th style={thStyle}>Profit</th>
                                    <th style={thStyle}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={tdStyle}>{item.Date || '-'}</td>
                                        <td style={tdStyle}>{item.supplier_code || '-'}</td>
                                        <td style={tdStyle}>{item.supplier_bill_no || '-'}</td>
                                        <td style={tdStyle}>{item.customer_code || '-'}</td>
                                        <td style={tdStyle}>{item.item_code || '-'}</td>
                                        <td style={tdStyle}>{item.item_name || '-'}</td>
                                        <td style={tdStyle}>{Number(item.SupplierWeight || 0).toFixed(2)}</td>
                                        <td style={tdStyle}>{Number(item.SupplierPricePerKg || 0).toFixed(2)}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{(Number(item.SupplierTotal) || 0).toFixed(2)}</td>
                                        <td style={{ ...tdStyle, color: '#4CAF50' }}>{(Number(item.profit) || 0).toFixed(2)}</td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                background: item.bill_status === 'Printed' ? '#2196F3' : '#f44336',
                                                color: 'white'
                                            }}>
                                                {item.bill_status || 'Not Printed'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f0f2f5' }}>
                                    <td colSpan="8" style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>GRAND TOTAL:</td>
                                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#4CAF50' }}>{grandTotal.toFixed(2)}</td>
                                    <td colSpan="2"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupplierReport;