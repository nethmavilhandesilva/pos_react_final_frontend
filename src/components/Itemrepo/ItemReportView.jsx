import React, { useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const ItemReportView = ({ reportData, onClose }) => {
    const printRef = useRef();
    const [isClient, setIsClient] = useState(false);
    const { sales, filters } = reportData;

    // Ensure we're on client side before printing
    useEffect(() => {
        setIsClient(true);
    }, []);

    const totals = sales.reduce((acc, sale) => {
        acc.total_packs += sale.packs;
        acc.total_weight += sale.weight;
        acc.total_amount += sale.total;
        return acc;
    }, { total_packs: 0, total_weight: 0, total_amount: 0 });

    // Simple and reliable PDF export
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
                <title>Item-wise Report</title>
                <style>
                    body { 
                        font-family: 'notosanssinhala', sans-serif; 
                        font-size: 12px; 
                        line-height: 1.4;
                        margin: 20px;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 20px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 15px;
                    }
                    th, td { 
                        border: 1px solid #000; 
                        padding: 8px; 
                        text-align: left; 
                    }
                    th { 
                        background-color: #f2f2f2; 
                        font-weight: bold;
                    }
                    .text-end { text-align: right; }
                    .totals-row { 
                        font-weight: bold; 
                        background-color: #e9ecef;
                    }
                    .meta-info { margin-bottom: 15px; }
                    .filters { margin-bottom: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>TGK ට්‍රේඩර්ස්</h2>
                    <h3>📦 අයිතමය අනුව වාර්තාව</h3>
                    <p>Report Date: ${new Date().toLocaleDateString('en-CA')}</p>
                </div>

                ${sales.length > 0 ? `
                    <div class="meta-info">
                        <strong>අයිතමය:</strong> ${sales[0].item?.type || 'N/A'}
                        (<strong>කේතය:</strong> ${sales[0].item_code})
                    </div>
                ` : ''}

                ${(filters.start_date || filters.end_date) ? `
                    <div class="filters">
                        <strong>දින පරාසය:</strong>
                        ${filters.start_date ? ` ${filters.start_date}` : ''}
                        ${filters.end_date ? ` සිට ${filters.end_date} දක්වා` : ''}
                    </div>
                ` : ''}

                <table>
                    <thead>
                        <tr>
                            <th>බිල් අංකය</th>
                            <th>මලු</th>
                            <th>බර (kg)</th>
                            <th>මිල (Rs/kg)</th>
                            <th>එකතුව (Rs)</th>
                            <th>ගෙණුම්කරු</th>
                            <th>GRN අංකය</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sales.map(sale => `
                            <tr>
                                <td>${sale.bill_no}</td>
                                <td class="text-end">${sale.packs}</td>
                                <td class="text-end">${Number(sale.weight).toFixed(2)}</td>
                                <td class="text-end">${Number(sale.price_per_kg).toFixed(2)}</td>
                                <td class="text-end">${Number(sale.total).toFixed(2)}</td>
                                <td>${sale.customer_code}</td>
                                <td>${sale.code}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td class="text-end">මුළු එකතුව:</td>
                            <td class="text-end">${totals.total_packs}</td>
                            <td class="text-end">${Number(totals.total_weight).toFixed(2)}</td>
                            <td></td>
                            <td class="text-end">${Number(totals.total_amount).toFixed(2)}</td>
                            <td colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            // Don't close immediately - let user decide
            // printWindow.close();
        };
    };

    // Excel Export functionality
    const handleExportExcel = () => {
        const excelData = [];
        
        // Add headers
        const headers = ['බිල් අංකය', 'මලු', 'බර (kg)', 'මිල (Rs/kg)', 'එකතුව (Rs)', 'ගෙණුම්කරු', 'GRN අංකය'];
        excelData.push(headers);
        
        // Add data rows
        sales.forEach(sale => {
            excelData.push([
                sale.bill_no,
                sale.packs,
                Number(sale.weight).toFixed(2),
                Number(sale.price_per_kg).toFixed(2),
                Number(sale.total).toFixed(2),
                sale.customer_code,
                sale.code
            ]);
        });
        
        // Add totals row
        excelData.push([
            'මුළු එකතුව:',
            totals.total_packs,
            Number(totals.total_weight).toFixed(2),
            '',
            Number(totals.total_amount).toFixed(2),
            '',
            ''
        ]);

        // Create workbook and export
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Item-wise Report');
        XLSX.writeFile(workbook, `Item_wise_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Simple browser print (fallback)
    const handleSimplePrint = () => {
        window.print();
    };

    return (
        <div className="card shadow border-0 rounded-3 p-4 custom-card mt-4">
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

            {/* Report Content */}
            <div className="report-title-bar">
                <h2 className="company-name">TGK ට්‍රේඩර්ස්</h2>
                <h4 className="fw-bold text-white">📦 අයිතමය අනුව වාර්තාව</h4>
                <span className="right-info">
                    {new Date().toLocaleDateString('en-CA')}
                </span>
            </div>

            {sales.length > 0 && (
                <div className="mb-3 text-white">
                    <strong>අයිතමය:</strong> {sales[0].item?.type || 'N/A'}
                    (<strong>කේතය:</strong> {sales[0].item_code})
                </div>
            )}

            {(filters.start_date || filters.end_date) && (
                <div className="mb-3 text-white">
                    <strong>දින පරාසය:</strong>
                    {filters.start_date && ` ${filters.start_date}`}
                    {filters.end_date && ` සිට ${filters.end_date} දක්වා`}
                </div>
            )}

            <table className="table table-bordered table-striped table-sm text-center align-middle">
                <thead className="table-dark">
                    <tr>
                        <th>බිල් අංකය</th>
                        <th>මලු</th>
                        <th>බර (kg)</th>
                        <th>මිල (Rs/kg)</th>
                        <th>එකතුව (Rs)</th>
                        <th>ගෙණුම්කරු</th>
                        <th>GRN අංකය</th>
                    </tr>
                </thead>
                <tbody>
                    {sales.map((sale, index) => (
                        <tr key={index}>
                            <td>{sale.bill_no}</td>
                            <td className="text-end">{sale.packs}</td>
                            <td className="text-end">{Number(sale.weight).toFixed(2)}</td>
                            <td className="text-end">{Number(sale.price_per_kg).toFixed(2)}</td>
                            <td className="text-end">{Number(sale.total).toFixed(2)}</td>
                            <td>{sale.customer_code}</td>
                            <td>{sale.code}</td>
                        </tr>
                    ))}
                </tbody>

                <tfoot>
                    <tr className="table-secondary fw-bold">
                        <td className="text-end">මුළු එකතුව:</td>
                        <td className="text-end">{totals.total_packs}</td>
                        <td className="text-end">{Number(totals.total_weight).toFixed(2)}</td>
                        <td></td>
                        <td className="text-end">{Number(totals.total_amount).toFixed(2)}</td>
                        <td colSpan="2"></td>
                    </tr>
                </tfoot>
            </table>

            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    .btn { display: none !important; }
                    .card { 
                        border: none !important; 
                        box-shadow: none !important; 
                        padding: 0 !important;
                    }
                    .report-title-bar {
                        background: #333 !important;
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
                        padding: 5px;
                    }
                }
            `}</style>
        </div>
    );
};

export default ItemReportView;