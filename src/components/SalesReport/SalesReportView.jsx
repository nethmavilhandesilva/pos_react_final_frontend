import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const BACKEND_URL = 'http://localhost:8000/api';

const SalesReportView = ({ reportData, onClose }) => {
    const { salesData, filters } = reportData;
    const [companyName, setCompanyName] = useState('Default Company');
    const [settingDate, setSettingDate] = useState('');
    const [isClient, setIsClient] = useState(false);

    // Ensure we're on client side before printing
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        fetchCompanyInfo();
    }, []);

    const fetchCompanyInfo = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/company-info`);
            if (response.ok) {
                const data = await response.json();
                setCompanyName(data.companyName || 'Default Company');
                setSettingDate(data.settingDate || new Date().toLocaleDateString('en-CA'));
            }
        } catch (error) {
            console.error('Error fetching company info:', error);
        }
    };

    // Group data by customer_code first, then by bill_no within each customer
    const groupedData = salesData.reduce((acc, sale) => {
        const customerCode = sale.customer_code || 'Unknown Customer';
        
        if (!acc[customerCode]) {
            acc[customerCode] = {};
        }
        
        const billNo = sale.bill_no || 'No Bill';
        if (!acc[customerCode][billNo]) {
            acc[customerCode][billNo] = [];
        }
        
        acc[customerCode][billNo].push(sale);
        return acc;
    }, {});

    // Calculate grand total
    const grandTotal = Object.values(groupedData).reduce((total, customerGroups) => {
        const customerTotal = Object.values(customerGroups).reduce((custSum, billSales) => {
            const billTotal = billSales.reduce((billSum, sale) => {
                return billSum + (Number(sale.total) || 0);
            }, 0);
            return custSum + billTotal;
        }, 0);
        return total + customerTotal;
    }, 0);

    // PDF Export functionality
    const handlePrint = () => {
        if (!isClient) return;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups for printing');
            return;
        }

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Processed Sales Summary</title>
                <style>
                    body { 
                        font-family: 'notosanssinhala', sans-serif; 
                        font-size: 11px; 
                        line-height: 1.3;
                        margin: 15px;
                        background-color: #f8f9fa;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 20px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                        background-color: #004d00;
                        color: white;
                        padding: 15px;
                        border-radius: 5px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 15px;
                        background-color: white;
                        margin-bottom: 20px;
                    }
                    th, td { 
                        border: 1px solid #000; 
                        padding: 6px; 
                        text-align: center; 
                        vertical-align: middle;
                    }
                    th { 
                        background-color: #f2f2f2; 
                        font-weight: bold;
                    }
                    .text-end { text-align: right; }
                    .text-center { text-align: center; }
                    .text-start { text-align: left; }
                    .total-row { 
                        font-weight: bold; 
                        background-color: #e9ecef;
                    }
                    .grand-total { 
                        font-weight: bold; 
                        background-color: #004d00;
                        color: white;
                        padding: 10px;
                        text-align: right;
                        margin-top: 20px;
                    }
                    .customer-header {
                        background-color: #004d00;
                        color: white;
                        padding: 12px;
                        border-radius: 5px;
                        margin-bottom: 10px;
                        font-weight: bold;
                        font-size: 14px;
                    }
                    .bill-header {
                        background-color: #e9ecef;
                        padding: 8px 12px;
                        border-radius: 3px;
                        margin-bottom: 8px;
                        margin-top: 15px;
                        font-weight: bold;
                    }
                    .company-name {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .report-title {
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .no-data { 
                        text-align: center; 
                        color: #6c757d; 
                        padding: 20px;
                        background-color: #f8f9fa;
                    }
                    .customer-section {
                        margin-bottom: 30px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        padding: 10px;
                        background-color: white;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">${companyName}</div>
                    <div class="report-title">Processed Sales Summary</div>
                    <div>Report Date: ${settingDate}</div>
                </div>

                ${salesData.length === 0 ? `
                    <div class="no-data">No processed sales records found.</div>
                ` : Object.entries(groupedData).map(([customerCode, billGroups]) => {
                    const customerTotal = Object.values(billGroups).reduce((custSum, billSales) => {
                        const billTotal = billSales.reduce((billSum, sale) => billSum + (Number(sale.total) || 0), 0);
                        return custSum + billTotal;
                    }, 0);

                    return `
                        <div class="customer-section">
                            <div class="customer-header">
                                Customer Code: ${customerCode}
                            </div>
                            
                            ${Object.entries(billGroups).map(([billNo, sales]) => {
                                const isBill = billNo !== 'No Bill';
                                const billTotal = sales.reduce((sum, sale) => sum + (Number(sale.weight) * Number(sale.price_per_kg) || 0), 0);
                                const billTotal2 = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
                                const firstPrinted = sales[0].FirstTimeBillPrintedOn;
                                const reprinted = sales[0].BillReprintAfterchanges;

                                return `
                                    <div class="bill-section">
                                        ${isBill ? `
                                            <div class="bill-header">
                                                <strong>Bill No: ${billNo}</strong>
                                                ${firstPrinted ? `
                                                    <span style="float: right; margin-left: 15px;">
                                                        First Printed: ${new Date(firstPrinted).toLocaleDateString('en-CA')}
                                                    </span>
                                                ` : ''}
                                                ${reprinted ? `
                                                    <span style="float: right; margin-left: 15px;">
                                                        Reprinted: ${new Date(reprinted).toLocaleDateString('en-CA')}
                                                    </span>
                                                ` : ''}
                                            </div>
                                        ` : `
                                            <div class="bill-header">
                                                <strong>No Bill Number</strong>
                                            </div>
                                        `}

                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>කේතය</th>
                                                    <th>භාණ්ඩ නාමය</th>
                                                    <th>බර</th>
                                                    <th>කිලෝවකට මිල</th>
                                                    <th>මලු</th>
                                                    <th>එකතුව</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${sales.map((sale, index) => `
                                                    <tr>
                                                        <td>${sale.code}</td>
                                                        <td class="text-start">${sale.item_name}</td>
                                                        <td>${Number(sale.weight).toFixed(2)}</td>
                                                        <td>${Number(sale.price_per_kg).toFixed(2)}</td>
                                                        <td>${sale.packs}</td>
                                                        <td>${(Number(sale.weight) * Number(sale.price_per_kg)).toFixed(2)}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                            <tfoot>
                                                <tr class="total-row">
                                                    <td colspan="5" class="text-end">Total:</td>
                                                    <td>${billTotal.toFixed(2)}</td>
                                                </tr>
                                                <tr class="total-row">
                                                    <td colspan="5" class="text-end">Total with Pack Cost:</td>
                                                    <td>${billTotal2.toFixed(2)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                `;
                            }).join('')}
                            
                            <div style="text-align: right; margin-top: 10px; font-weight: bold;">
                                Customer Total: ${customerTotal.toFixed(2)}
                            </div>
                        </div>
                    `;
                }).join('')}

                ${salesData.length > 0 ? `
                    <div class="grand-total">
                        <h3>Grand Total: ${grandTotal.toFixed(2)}</h3>
                    </div>
                ` : ''}
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    };

    // Excel Export functionality
    const handleExportExcel = () => {
        const excelData = [];
        
        // Add main headers
        const headers = [
            'Customer Code',
            'Bill No',
            'කේතය',
            'භාණ්ඩ නාමය',
            'බර',
            'කිලෝවකට මිල',
            'මලු',
            'එකතුව',
            'Total with Pack Cost',
            'First Printed',
            'Reprinted'
        ];
        excelData.push(headers);
        
        // Add data rows
        if (salesData.length > 0) {
            Object.entries(groupedData).forEach(([customerCode, billGroups]) => {
                Object.entries(billGroups).forEach(([billNo, sales]) => {
                    const isBill = billNo !== 'No Bill';
                    const billTotal = sales.reduce((sum, sale) => sum + (Number(sale.weight) * Number(sale.price_per_kg) || 0), 0);
                    const billTotal2 = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
                    const firstPrinted = sales[0].FirstTimeBillPrintedOn;
                    const reprinted = sales[0].BillReprintAfterchanges;

                    sales.forEach((sale, index) => {
                        excelData.push([
                            customerCode,
                            billNo,
                            sale.code,
                            sale.item_name,
                            Number(sale.weight).toFixed(2),
                            Number(sale.price_per_kg).toFixed(2),
                            sale.packs,
                            (Number(sale.weight) * Number(sale.price_per_kg)).toFixed(2),
                            index === 0 ? billTotal2.toFixed(2) : '', // Only show in first row of group
                            index === 0 ? (firstPrinted ? new Date(firstPrinted).toLocaleDateString('en-CA') : '') : '',
                            index === 0 ? (reprinted ? new Date(reprinted).toLocaleDateString('en-CA') : '') : ''
                        ]);
                    });

                    // Add bill totals
                    excelData.push([
                        `TOTAL for ${customerCode} - ${isBill ? `Bill ${billNo}` : 'No Bill'}`,
                        '',
                        '',
                        '',
                        '',
                        '',
                        '',
                        billTotal.toFixed(2),
                        billTotal2.toFixed(2),
                        '',
                        ''
                    ]);

                    // Add empty row between bills
                    excelData.push([]);
                });

                // Add empty row between customers
                excelData.push(['---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---']);
            });

            // Remove last separator row and add grand total
            excelData.pop();
            excelData.push([]);
            excelData.push([
                'GRAND TOTAL',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                grandTotal.toFixed(2),
                '',
                ''
            ]);
        }

        // Create workbook and export
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Processed Sales Summary');
        XLSX.writeFile(workbook, `Processed_Sales_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Simple browser print (fallback)
    const handleSimplePrint = () => {
        window.print();
    };

    return (
        <div className="container mt-2" style={{ minHeight: '100vh', padding: '15px' }}>
            {/* Export Buttons */}
            <div className="d-flex justify-content-between mb-3">
                <div>
                    <button className="btn btn-success me-2" onClick={handleExportExcel}>
                        📊 Export Excel
                    </button>
                    <button className="btn btn-primary me-2" onClick={handlePrint}>
                        📄 Export PDF
                    </button>
                    <button className="btn btn-info me-2" onClick={handleSimplePrint}>
                        🖨️ Quick Print
                    </button>
                </div>
                <button className="btn btn-secondary" onClick={onClose}>
                    Close Report
                </button>
            </div>

            <div className="card custom-card shadow border-0 rounded-3">
                {/* Report Header */}
                <div className="report-title-bar">
                    <h2 className="company-name">{companyName}</h2>
                    <h4 className="fw-bold text-white">Processed Sales Summary</h4>
                    <div className="right-info">
                        <span>Report Date: {settingDate}</span>
                    </div>
                </div>

                <div className="card-body p-0">
                    {salesData.length === 0 ? (
                        <div className="alert alert-info m-3">No processed sales records found.</div>
                    ) : (
                        Object.entries(groupedData).map(([customerCode, billGroups]) => {
                            const customerTotal = Object.values(billGroups).reduce((custSum, billSales) => {
                                const billTotal = billSales.reduce((billSum, sale) => billSum + (Number(sale.total) || 0), 0);
                                return custSum + billTotal;
                            }, 0);

                            return (
                                <div key={customerCode} className="customer-section mb-4 p-3" style={{ border: '1px solid #ddd', borderRadius: '5px', backgroundColor: 'white' }}>
                                    {/* Customer Header */}
                                    <div className="customer-header mb-3 p-2" style={{ backgroundColor: '#004d00', color: 'white', borderRadius: '5px' }}>
                                        <h5 className="mb-0">Customer Code: {customerCode}</h5>
                                    </div>

                                    {Object.entries(billGroups).map(([billNo, sales]) => {
                                        const isBill = billNo !== 'No Bill';
                                        const billTotal = sales.reduce((sum, sale) => sum + (Number(sale.weight) * Number(sale.price_per_kg) || 0), 0);
                                        const billTotal2 = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
                                        const firstPrinted = sales[0].FirstTimeBillPrintedOn;
                                        const reprinted = sales[0].BillReprintAfterchanges;

                                        return (
                                            <div key={billNo} className="bill-section mb-4">
                                                {/* Bill Header */}
                                                <div className="bill-header p-2 mb-2" style={{ backgroundColor: '#e9ecef', borderRadius: '3px' }}>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <strong>
                                                            {isBill ? `Bill No: ${billNo}` : 'No Bill Number'}
                                                        </strong>
                                                        {isBill && (
                                                            <div>
                                                                {firstPrinted && (
                                                                    <span className="me-3">First Printed: {new Date(firstPrinted).toLocaleDateString('en-CA')}</span>
                                                                )}
                                                                {reprinted && (
                                                                    <span>Reprinted: {new Date(reprinted).toLocaleDateString('en-CA')}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Sales Table */}
                                                <table className="table table-bordered table-striped table-hover table-sm mb-3">
                                                    <thead className="text-center">
                                                        <tr>
                                                            <th>කේතය</th>
                                                            <th>භාණ්ඩ නාමය</th>
                                                            <th>බර</th>
                                                            <th>කිලෝවකට මිල</th>
                                                            <th>මලු</th>
                                                            <th>එකතුව</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sales.map((sale, index) => (
                                                            <tr key={index} className="text-center">
                                                                <td>{sale.code}</td>
                                                                <td className="text-start">{sale.item_name}</td>
                                                                <td>{Number(sale.weight).toFixed(2)}</td>
                                                                <td>{Number(sale.price_per_kg).toFixed(2)}</td>
                                                                <td>{sale.packs}</td>
                                                                <td>{(Number(sale.weight) * Number(sale.price_per_kg)).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="fw-bold text-center">
                                                            <td colSpan="5" className="text-end">Total:</td>
                                                            <td>{billTotal.toFixed(2)}</td>
                                                        </tr>
                                                        <tr className="fw-bold text-center">
                                                            <td colSpan="5" className="text-end">Total with Pack Cost:</td>
                                                            <td>{billTotal2.toFixed(2)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        );
                                    })}

                                    {/* Customer Total */}
                                    <div className="text-end fw-bold mt-3">
                                        <h5 style={{ color: '#004d00' }}>Customer Total: {customerTotal.toFixed(2)}</h5>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Grand Total */}
                    {salesData.length > 0 && (
                        <div className="text-end fw-bold mt-3 me-3">
                            <h3 className="text-white">Grand Total: {grandTotal.toFixed(2)}</h3>
                        </div>
                    )}
                </div>
            </div>

            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    .btn { display: none !important; }
                    .card { 
                        border: none !important; 
                        box-shadow: none !important; 
                    }
                    .report-title-bar {
                        background: #004d00 !important;
                        color: white !important;
                        padding: 15px;
                        text-align: center;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        border: 1px solid #000 !important;
                        padding: 4px;
                    }
                    .text-start { text-align: left !important; }
                    .customer-section {
                        border: 1px solid #000 !important;
                        margin-bottom: 20px !important;
                        page-break-inside: avoid;
                    }
                    .customer-header {
                        background: #004d00 !important;
                        color: white !important;
                    }
                    .bill-header {
                        background: #f8f9fa !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default SalesReportView;