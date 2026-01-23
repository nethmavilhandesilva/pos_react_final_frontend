import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';

const SalesReportView = ({ reportData, onClose }) => {
    const { salesData: initialSalesData, filters } = reportData;
    const [salesData, setSalesData] = useState(initialSalesData || []);
    const [companyName, setCompanyName] = useState('Default Company');
    const [settingDate, setSettingDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [isClient, setIsClient] = useState(false);
    const printRef = useRef();

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

        const fetchSalesData = async () => {
            try {
                const params = {
                    start_date: filters?.start_date,
                    end_date: filters?.end_date,
                    code: filters?.code
                };
                const { data } = await api.get('/processed-sales', { params });
                setSalesData(data || []);
            } catch (err) {
                console.error('Error fetching sales data:', err);
            }
        };

        fetchCompanyInfo();
        fetchSalesData();
    }, [filters]);

    const groupedData = salesData.reduce((acc, sale) => {
        const customer = sale.customer_code || 'Unknown Customer';
        const bill = sale.bill_no || 'No Bill';
        if (!acc[customer]) acc[customer] = {};
        if (!acc[customer][bill]) acc[customer][bill] = [];
        acc[customer][bill].push(sale);
        return acc;
    }, {});

    const grandTotal = Object.values(groupedData).reduce((total, custBills) => {
        return total + Object.values(custBills).reduce((custSum, billSales) => {
            return custSum + billSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
        }, 0);
    }, 0);

    const handlePrint = () => {
        if (!isClient) return;
        const win = window.open('', '_blank');
        if (!win) return alert('Please allow popups for printing');

        win.document.write(`
            <html>
            <head>
                <title>සකස් කළ විකුණුම් සාරාංශය</title>
                <style>
                    html, body { 
                        margin:0; 
                        padding:0; 
                        font-family:'notosanssinhala',sans-serif; 
                        font-size:12px; 
                        line-height:1.4; 
                        background:#1ec139ff !important; 
                        min-height:100vh;
                    }
                    table { 
                        width:100%; 
                        border-collapse:collapse; 
                        margin-bottom:15px; 
                        background:white;
                    }
                    th, td { 
                        border:1px solid #000; 
                        padding:6px; 
                        vertical-align:middle;
                    }
                    th { 
                        font-weight:bold; 
                        text-align:center; 
                        background:#004d00; 
                        color:white;
                    }
                    td.text-left { 
                        text-align:left; 
                    }
                    td.text-right { 
                        text-align:right; 
                    }
                    .customer-section { 
                        margin-bottom:20px; 
                        background:white; 
                        padding:10px; 
                        border-radius:5px; 
                    }
                    .customer-header { 
                        font-weight:bold; 
                        padding:8px; 
                        background:#004d00; 
                        color:white; 
                        border-radius:3px; 
                        margin-bottom:10px; 
                    }
                    .bill-header { 
                        font-weight:bold; 
                        padding:6px; 
                        background:#e9ecef; 
                        margin-bottom:5px; 
                        display:flex; 
                        justify-content:space-between;
                    }
                    .grand-total { 
                        font-weight:bold; 
                        font-size:16px; 
                        text-align:right; 
                        margin-top:20px; 
                        color:#004d00; 
                        background:white;
                        padding:10px;
                        border-radius:5px;
                    }
                    @media print { 
                        .btn { 
                            display:none !important; 
                        } 
                        .customer-section { 
                            page-break-inside: avoid; 
                        }
                        body {
                            background:#1ec139ff !important;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body style="background:#1ec139ff !important; min-height:100vh;">${printRef.current.innerHTML}</body>
            </html>
        `);
        win.document.close();
        win.onload = () => win.print();
    };

    const handleExportExcel = () => {
        const excelData = [];
        excelData.push([
            'Customer Code', 'Bill No', 'කේතය', 'භාණ්ඩ නාමය', 'මලු', 'බර', 'කිලෝවකට මිල',
            'ගනුදෙනුකරු කේතය', 'සැපයුම්කරු කේතය', 'එකතුව'
        ]);

        Object.entries(groupedData).forEach(([customerCode, bills]) => {
            Object.entries(bills).forEach(([billNo, sales]) => {
                const billTotal2 = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
                sales.forEach((sale, i) => {
                    excelData.push([
                        customerCode,
                        billNo,
                        sale.code,
                        sale.item_name,
                        sale.packs,
                        Number(sale.weight).toFixed(2),
                        Number(sale.price_per_kg).toFixed(2),
                        sale.customer_code,
                        sale.supplier_code,
                        i === 0 ? billTotal2.toFixed(2) : ''
                    ]);
                });
                excelData.push([]);
            });
            excelData.push([]);
        });

        excelData.push(['GRAND TOTAL', '', '', '', '', '', '', '', '', grandTotal.toFixed(2)]);
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Processed Sales Summary');
        XLSX.writeFile(wb, `Processed_Sales_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleQuickPrint = () => window.print();

    return (
        <div 
            ref={printRef} 
            style={{ 
                minHeight: '100vh', 
                padding: '15px', 
                background: '#1ec139ff', // Main background color
            }}
        >
            {/* Export Buttons */}
            <div className="d-flex justify-content-between mb-3">
                <div>
                    <button className="btn btn-success me-2" onClick={handleExportExcel}>📊 Export Excel</button>
                    <button className="btn btn-primary me-2" onClick={handlePrint}>📄 Export PDF</button>
                    <button className="btn btn-info me-2" onClick={handleQuickPrint}>🖨️ Quick Print</button>
                </div>
                <button className="btn btn-secondary" onClick={onClose}>Close Report</button>
            </div>

            {/* Report Header */}
            <div className="card shadow border-0 rounded-3 mb-3 p-3" style={{ background:'#004d00', color:'white' }}>
                <h2>{companyName}</h2>
                <h4>සකස් කළ විකුණුම් සාරාංශය</h4>
                <span>වාර්තා දිනය: {settingDate}</span>
            </div>

            {/* Filters Summary */}
            {(filters?.start_date || filters?.end_date || filters?.code) && (
                <div className="mb-3 p-2" style={{ background:'#f8f9fa', borderRadius:'5px' }}>
                    {filters.code && <span><strong>Code:</strong> {filters.code}</span>}
                    {(filters.start_date || filters.end_date) && (
                        <span className="ms-3"><strong>Date Range:</strong> {filters.start_date || ''} to {filters.end_date || ''}</span>
                    )}
                </div>
            )}

            {/* Sales Data */}
            {salesData.length === 0 ? (
                <div className="alert alert-info">No processed sales records found.</div>
            ) : (
                Object.entries(groupedData).map(([customerCode, bills]) => {
                    const customerTotal = Object.values(bills).reduce((custSum, billSales) => {
                        return custSum + billSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
                    }, 0);

                    return (
                        <div key={customerCode} className="customer-section">
                            <div className="customer-header">ගනුදෙනුකරු කේතය: {customerCode}</div>

                            {Object.entries(bills).map(([billNo, sales]) => {
                                const isBill = billNo !== 'No Bill';
                                const billTotal = sales.reduce((sum, sale) => sum + (Number(sale.weight) * Number(sale.price_per_kg) || 0), 0);
                                const billTotal2 = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
                                const firstPrinted = sales[0].FirstTimeBillPrintedOn;
                                const reprinted = sales[0].BillReprintAfterchanges;

                                return (
                                    <div key={billNo} className="bill-section mb-4">
                                        <div className="bill-header">
                                            <strong>{isBill ? `බිල් අංකය: ${billNo}` : 'No Bill Number'}</strong>
                                            {isBill && (
                                                <div>
                                                    {firstPrinted && <span className="me-3">පළමු වර මුද්‍රණය: {new Date(firstPrinted).toLocaleDateString('en-CA')}</span>}
                                                    {reprinted && <span>නැවත මුද්‍රණය: {new Date(reprinted).toLocaleDateString('en-CA')}</span>}
                                                </div>
                                            )}
                                        </div>

                                        <table className="table table-bordered table-sm">
                                           <thead>
                                                <tr>
                                                    <th style={{ color: 'white', backgroundColor: '#004d00' }}>බිල් අං</th>
                                                    <th style={{ color: 'white', backgroundColor: '#004d00' }}>කේතය</th>
                                                    <th className="text-left" style={{ color: 'white', backgroundColor: '#004d00' }}>භාණ්ඩ නාමය</th>
                                                    <th style={{ color: 'white', backgroundColor: '#004d00' }}>මලු</th>
                                                    <th style={{ color: 'white', backgroundColor: '#004d00' }}>බර</th>
                                                    <th style={{ color: 'white', backgroundColor: '#004d00' }}>කිලෝවකට මිල</th>
                                                    <th style={{ color: 'white', backgroundColor: '#004d00' }}>ගනුදෙනුකරු කේතය</th>
                                                    <th style={{ color: 'white', backgroundColor: '#004d00' }}>සැපයුම්කරු කේතය</th>
                                                    <th style={{ color: 'white', backgroundColor: '#004d00' }}>එකතුව</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {sales.map((sale, idx) => (
                                                    <tr key={idx}>
                                                        <td>{sale.bill_no}</td>
                                                        <td>{sale.item_code}</td>
                                                        <td className="text-left">{sale.item_name}</td>
                                                        <td className="text-right">{sale.packs}</td>
                                                        <td className="text-right">{Number(sale.weight).toFixed(2)}</td>
                                                        <td className="text-right">{Number(sale.price_per_kg).toFixed(2)}</td>
                                                        <td>{sale.customer_code}</td>
                                                        <td>{sale.supplier_code}</td>
                                                        <td className="text-right">{(Number(sale.weight) * Number(sale.price_per_kg)).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td colSpan="8" className="text-end fw-bold">එකතුව :</td>
                                                    <td className="text-right fw-bold">{billTotal.toFixed(2)}</td>
                                                </tr>
                                                <tr>
                                                    <td colSpan="8" className="text-end fw-bold">මලු සමග එකතුව :</td>
                                                    <td className="text-right fw-bold">{billTotal2.toFixed(2)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                );
                            })}
                            <div className="text-end fw-bold mt-2" style={{ 
                                color: '#004d00', 
                                background: 'white', 
                                padding: '8px', 
                                borderRadius: '5px' 
                            }}>
                                Customer Total: {customerTotal.toFixed(2)}
                            </div>
                        </div>
                    );
                })
            )}

            {salesData.length > 0 && (
                <div className="grand-total" style={{ 
                    background: 'white', 
                    padding: '15px', 
                    borderRadius: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    සම්පූර්ණ එකතුව: {grandTotal.toFixed(2)}
                </div>
            )}
        </div>
    );
};

export default SalesReportView;