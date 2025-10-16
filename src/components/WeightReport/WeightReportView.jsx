import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const WeightReportView = ({ reportData, onClose }) => {
    const [isClient, setIsClient] = useState(false);
    const { sales, filters, selectedGrnEntry, selectedGrnCode } = reportData;

    // Ensure we're on client side before printing
    useEffect(() => {
        setIsClient(true);
    }, []);

    // === Calculate Totals ===
    const totals = sales.reduce(
        (acc, sale) => {
            const pack_due = sale.pack_due || 0;
            const weight = Number(sale.weight) || 0;
            const price_per_kg = Number(sale.price_per_kg) || 0;
            const packs = Number(sale.packs) || 0;

            const pack_due_cost = packs * pack_due;
            const net_total = weight * price_per_kg;

            acc.total_weight += weight;
            acc.total_packs += packs;
            acc.total_pack_due_cost += pack_due_cost;
            acc.total_amount += net_total;
            return acc;
        },
        { total_packs: 0, total_weight: 0, total_amount: 0, total_pack_due_cost: 0 }
    );

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
                <title>GRN-based Sales Report</title>
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
                    .text-start { text-align: left; }
                    .totals-row { 
                        font-weight: bold; 
                        background-color: #e9ecef;
                    }
                    .final-totals-row { 
                        font-weight: bold; 
                        background-color: #343a40;
                        color: white;
                    }
                    .meta-info { margin-bottom: 15px; }
                    .filters { margin-bottom: 10px; }
                    .separator-row td { 
                        padding: 0; 
                        border: none; 
                    }
                    hr { 
                        margin: 10px 0; 
                        border-top: 2px solid #000;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>TGK ට්‍රේඩර්ස්</h2>
                    <h3>මුළු අයිතම විකිණුම් – ප්‍රමාණ අනුව</h3>
                    <p>Report Date: ${new Date().toLocaleDateString('en-CA')}</p>
                </div>

                ${selectedGrnEntry ? `
                    <div class="meta-info">
                        <strong>GRN කේතය:</strong> ${selectedGrnCode}
                        ${selectedGrnEntry.supplier ? `, <strong>Supplier:</strong> ${selectedGrnEntry.supplier}` : ''}
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
                            <th>අයිතම කේතය</th>
                            <th>වර්ගය</th>
                            <th>බර (kg)</th>
                            <th>මිල</th>
                            <th>මලු</th>
                            <th>මලු ගාස්තුව (Rs)</th>
                            <th>එකතුව (Rs)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sales.length > 0 ? sales.map(sale => {
                            const pack_due = sale.pack_due || 0;
                            const weight = Number(sale.weight) || 0;
                            const price_per_kg = Number(sale.price_per_kg) || 0;
                            const packs = Number(sale.packs) || 0;
                            const pack_due_cost = packs * pack_due;
                            const net_total = weight * price_per_kg;

                            return `
                                <tr>
                                    <td>${sale.item_code}</td>
                                    <td class="text-start">${sale.item_name}</td>
                                    <td class="text-end">${weight.toFixed(2)}</td>
                                    <td class="text-end">${price_per_kg.toFixed(2)}</td>
                                    <td class="text-end">${packs.toFixed(0)}</td>
                                    <td class="text-end">${pack_due_cost.toFixed(2)}</td>
                                    <td class="text-end">${net_total.toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('') : `
                            <tr>
                                <td colspan="7" style="text-align: center; background-color: #6c757d; color: white;">
                                    වාර්තා නැත
                                </td>
                            </tr>
                        `}
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td colspan="2" class="text-end">මුළු එකතුව:</td>
                            <td class="text-end">${totals.total_weight.toFixed(2)}</td>
                            <td></td>
                            <td class="text-end">${totals.total_packs.toFixed(0)}</td>
                            <td class="text-end">${totals.total_pack_due_cost.toFixed(2)}</td>
                            <td class="text-end">${totals.total_amount.toFixed(2)}</td>
                        </tr>
                        
                        <tr class="separator-row">
                            <td colspan="7"><hr></td>
                        </tr>
                        
                        <tr class="final-totals-row">
                            <td colspan="5"></td>
                            <td class="text-end">අවසන් මුළු එකතුව:</td>
                            <td class="text-end">${(totals.total_amount + totals.total_pack_due_cost).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
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
        
        // Add headers
        const headers = ['අයිතම කේතය', 'වර්ගය', 'බර (kg)', 'මිල', 'මලු', 'මලු ගාස්තුව (Rs)', 'එකතුව (Rs)'];
        excelData.push(headers);
        
        // Add data rows
        sales.forEach(sale => {
            const pack_due = sale.pack_due || 0;
            const weight = Number(sale.weight) || 0;
            const price_per_kg = Number(sale.price_per_kg) || 0;
            const packs = Number(sale.packs) || 0;
            const pack_due_cost = packs * pack_due;
            const net_total = weight * price_per_kg;

            excelData.push([
                sale.item_code,
                sale.item_name,
                weight.toFixed(2),
                price_per_kg.toFixed(2),
                packs.toFixed(0),
                pack_due_cost.toFixed(2),
                net_total.toFixed(2)
            ]);
        });
        
        // Add empty row for separation
        excelData.push(['', '', '', '', '', '', '']);
        
        // Add totals row
        excelData.push([
            '',
            'මුළු එකතුව:',
            totals.total_weight.toFixed(2),
            '',
            totals.total_packs.toFixed(0),
            totals.total_pack_due_cost.toFixed(2),
            totals.total_amount.toFixed(2)
        ]);
        
        // Add final totals row
        excelData.push([
            '',
            '',
            '',
            '',
            '',
            'අවසන් මුළු එකතුව:',
            (totals.total_amount + totals.total_pack_due_cost).toFixed(2)
        ]);

        // Create workbook and export
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'GRN Sales Report');
        XLSX.writeFile(workbook, `GRN_Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Simple browser print (fallback)
    const handleSimplePrint = () => {
        window.print();
    };

    return (
        <div className="card shadow border-0 rounded-3 p-4 custom-card mt-4">
            {/* === Export Buttons === */}
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

            {/* === Header Section === */}
            <div className="report-title-bar">
                <h2 className="company-name">TGK ට්‍රේඩර්ස්</h2>
                <h4 className="fw-bold text-white">මුළු අයිතම විකිණුම් – ප්‍රමාණ අනුව</h4>
                <span className="right-info">{new Date().toLocaleDateString('en-CA')}</span>
            </div>

            {/* === GRN Info === */}
            {selectedGrnEntry && (
                <div className="mb-3 text-white">
                    <strong>GRN කේතය:</strong> {selectedGrnCode}
                    {selectedGrnEntry.supplier && (
                        <span>, <strong>Supplier:</strong> {selectedGrnEntry.supplier}</span>
                    )}
                </div>
            )}

            {/* === Date Range === */}
            {(filters.start_date || filters.end_date) && (
                <div className="mb-3 text-white">
                    <strong>දින පරාසය:</strong>
                    {filters.start_date && ` ${filters.start_date}`}
                    {filters.end_date && ` සිට ${filters.end_date} දක්වා`}
                </div>
            )}

            {/* === Report Table === */}
            <table className="table table-sm table-bordered table-striped compact-table text-center align-middle">
                <thead className="table-dark">
                    <tr>
                        <th>අයිතම කේතය</th>
                        <th>වර්ගය</th>
                        <th>බර (kg)</th>
                        <th>මිල</th>
                        <th>මලු</th>
                        <th>මලු ගාස්තුව (Rs)</th>
                        <th>එකතුව (Rs)</th>
                    </tr>
                </thead>

                <tbody>
                    {sales.length > 0 ? (
                        sales.map((sale, index) => {
                            const pack_due = sale.pack_due || 0;
                            const weight = Number(sale.weight) || 0;
                            const price_per_kg = Number(sale.price_per_kg) || 0;
                            const packs = Number(sale.packs) || 0;

                            const pack_due_cost = packs * pack_due;
                            const net_total = weight * price_per_kg;

                            return (
                                <tr key={index}>
                                    <td>{sale.item_code}</td>
                                    <td className="text-start">{sale.item_name}</td>
                                    <td className="text-end">{weight.toFixed(2)}</td>
                                    <td className="text-end">{price_per_kg.toFixed(2)}</td>
                                    <td className="text-end">{packs.toFixed(0)}</td>
                                    <td className="text-end">{pack_due_cost.toFixed(2)}</td>
                                    <td className="text-end">{net_total.toFixed(2)}</td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="7" className="text-center text-white bg-secondary">
                                වාර්තා නැත
                            </td>
                        </tr>
                    )}
                </tbody>

                {/* === Table Footer Totals === */}
                <tfoot>
                    <tr className="table-secondary fw-bold">
                        <td colSpan="2" className="text-end">මුළු එකතුව:</td>
                        <td className="text-end">{totals.total_weight.toFixed(2)}</td>
                        <td></td>
                        <td className="text-end">{totals.total_packs.toFixed(0)}</td>
                        <td className="text-end">{totals.total_pack_due_cost.toFixed(2)}</td>
                        <td className="text-end">{totals.total_amount.toFixed(2)}</td>
                    </tr>

                    <tr>
                        <td colSpan="7" className="p-0">
                            <hr className="m-0" />
                        </td>
                    </tr>

                    <tr className="table-dark fw-bold">
                        <td colSpan="5"></td>
                        <td className="text-end">අවසන් මුළු එකතුව:</td>
                        <td className="text-end">{(totals.total_amount + totals.total_pack_due_cost).toFixed(2)}</td>
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
                    .compact-table th,
                    .compact-table td {
                        padding: 4px 8px;
                        font-size: 0.875rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default WeightReportView;