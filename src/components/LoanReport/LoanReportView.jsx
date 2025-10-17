import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const BACKEND_URL = 'http://localhost:8000/api';

const LoanReportView = () => {
    const [loans, setLoans] = useState([]);
    const [companyName, setCompanyName] = useState('Default Company');
    const [settingDate, setSettingDate] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLoanReport();
    }, []);

    const fetchLoanReport = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BACKEND_URL}/customers-loans/report`);

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            setLoans(data.loans || []);
            setCompanyName(data.companyName || 'Default Company');
            setSettingDate(data.settingDate || new Date().toISOString().split('T')[0]);
        } catch (error) {
            console.error('❌ Error fetching loan report:', error);
            alert('Error loading loan report: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Simple and reliable PDF export
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups for printing');
            return;
        }

        const grandTotal = loans.reduce((total, loan) => total + parseFloat(loan.total_amount || 0), 0);

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Loan Report</title>
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
                    .legend { 
                        margin-top: 20px;
                        font-size: 10px;
                    }
                    .legend-item { 
                        display: inline-block; 
                        margin-right: 15px;
                    }
                    .color-box {
                        display: inline-block;
                        width: 12px;
                        height: 12px;
                        margin-right: 5px;
                        border: 1px solid #ccc;
                    }
                    .orange-box { background-color: #fff3e0; }
                    .blue-box { background-color: #e3f2fd; }
                    .red-box { background-color: #ffebee; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${companyName}</h2>
                    <h3>ණය වාර්තාව - Loan Report</h3>
                    <p>Report Date: ${new Date(settingDate).toLocaleDateString('en-CA')}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>පාරිභෝගික නම</th>
                            <th>මුදල (Rs)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${loans.map(loan => `
                            <tr>
                                <td>${loan.customer_short_name}</td>
                                <td class="text-end">${Number(loan.total_amount).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td class="text-end">Grand Total:</td>
                            <td class="text-end">${Number(grandTotal).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div class="legend">
                    <strong>Legend:</strong><br>
                    <span class="legend-item">
                        <span class="color-box orange-box"></span>Non realized cheques
                    </span>
                    <span class="legend-item">
                        <span class="color-box blue-box"></span>Realized cheques
                    </span>
                    <span class="legend-item">
                        <span class="color-box red-box"></span>Returned cheques
                    </span>
                </div>
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
        const grandTotal = loans.reduce((total, loan) => total + parseFloat(loan.total_amount || 0), 0);
        const excelData = [];
        
        // Add headers
        const headers = ['පාරිභෝගික නම', 'මුදල (Rs)', 'Status'];
        excelData.push(headers);
        
        // Add data rows
        loans.forEach(loan => {
            const status = getStatusFromColor(loan.highlight_color);
            excelData.push([
                loan.customer_short_name,
                Number(loan.total_amount).toFixed(2),
                status
            ]);
        });
        
        // Add totals row
        excelData.push([
            'GRAND TOTAL',
            Number(grandTotal).toFixed(2),
            ''
        ]);

        // Create workbook and export
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Loan Report');
        XLSX.writeFile(workbook, `Loan_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Helper function to get status from color
    const getStatusFromColor = (color) => {
        switch(color) {
            case 'orange-highlight': return 'Non realized cheques';
            case 'blue-highlight': return 'Realized cheques';
            case 'red-highlight': return 'Returned cheques';
            default: return 'Normal';
        }
    };

    // Simple browser print (fallback)
    const handleSimplePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="page-container d-flex justify-content-center align-items-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <span className="ms-2 fw-bold text-dark">Loading loan report...</span>
            </div>
        );
    }

    const grandTotal = loans.reduce(
        (total, loan) => total + parseFloat(loan.total_amount || 0),
        0
    );

    return (
        <div className="page-container d-flex justify-content-center align-items-center">
            <div className="card custom-card shadow-lg border-0 rounded-4 p-4">
                {/* Export Buttons */}
                <div className="d-flex justify-content-between mb-3 flex-wrap gap-2">
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
                    <button className="btn btn-secondary" onClick={() => window.history.back()}>
                        Close Report
                    </button>
                </div>

                <div className="report-title-bar">
                    <h2 className="company-name">{companyName}</h2>
                    <h4 className="fw-bold text-white">ණය වාර්තාව</h4>
                    <span className="right-info">
                        {new Date(settingDate).toLocaleDateString('en-CA')}
                    </span>
                </div>

                <div className="card-body p-0">
                    {loans.length === 0 ? (
                        <div className="alert alert-info m-3">No loan records found.</div>
                    ) : (
                        <>
                            <table className="table table-bordered table-striped table-hover table-sm mb-0">
                                <thead>
                                    <tr>
                                        <th>පාරිභෝගික නම</th>
                                        <th>මුදල</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loans.map((loan, index) => (
                                        <tr key={index} className={loan.highlight_color || ''}>
                                            <td>{loan.customer_short_name}</td>
                                            <td className="text-end">
                                                {Number(loan.total_amount).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th className="text-end">Grand Total:</th>
                                        <th className="text-end">{Number(grandTotal).toFixed(2)}</th>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Legend */}
                            <div className="legend mt-3 text-center">
                                <span className="orange-box"></span> Non realized cheques &nbsp;
                                <span className="blue-box"></span> Realized cheques &nbsp;
                                <span className="red-box"></span> Returned cheques
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style jsx>{`
  /* ===== ENSURE FULL GREEN BACKGROUND ===== */
  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
    background-color: #99ff99 !important;
  }

  .page-container {
    background-color: #99ff99 !important;
    min-height: 100vh;
    width: 100vw;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  /* ===== CARD STYLE ===== */
  .custom-card {
    background-color: #006400 !important;
    color: white;
    width: 95%;
    max-width: 850px;
    transform: scale(1.05); /* slightly larger */
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }

  /* ===== BUTTON STYLES ===== */
  .btn {
    font-size: 0.9rem;
    font-weight: 600;
  }

  /* ===== PRINT SETTINGS ===== */
  @media print {
    .btn { 
        display: none !important; 
    }
    html, body {
      background-color: white !important;
    }
    .page-container {
      background-color: white !important;
    }
    body * {
      visibility: hidden;
    }
    .custom-card, .custom-card * {
      visibility: visible;
    }
    .custom-card {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
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

  /* ===== TABLE & COLORS ===== */
  table.table {
    font-size: 0.9rem;
  }

  table.table td, table.table th {
    padding: 0.3rem 0.6rem !important;
    vertical-align: middle;
  }

  .custom-card table {
    background-color: #006400 !important;
    color: white;
  }

  .custom-card table thead,
  .custom-card table tfoot {
    background-color: #004d00 !important;
    color: white;
  }

  .custom-card table tbody tr:nth-child(odd):not(.blue-highlight):not(.red-highlight):not(.orange-highlight) {
    background-color: #00550088;
  }

  .custom-card table tbody tr:nth-child(even):not(.blue-highlight):not(.red-highlight):not(.orange-highlight) {
    background-color: transparent;
  }

  /* ===== HEADER BAR ===== */
  .report-title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .company-name {
    font-weight: 700;
    font-size: 1.5rem;
    color: white;
    margin: 0;
  }

  .report-title-bar h4 {
    margin: 0;
    color: white;
    font-weight: 700;
    white-space: nowrap;
  }

  .right-info {
    color: white;
    font-weight: 600;
    white-space: nowrap;
    font-size: 0.85rem;
  }

  /* ===== LEGEND ===== */
  .legend {
    font-size: 0.85rem;
    margin-top: 10px;
    color: white;
  }
  .legend span {
    display: inline-block;
    width: 15px;
    height: 15px;
    margin-right: 5px;
    border: 1px solid #ccc;
    vertical-align: middle;
  }
  .legend .orange-box { background-color: #fff3e0; }
  .legend .blue-box { background-color: #e3f2fd; }
  .legend .red-box { background-color: #ffebee; }

  /* ===== HIGHLIGHT COLORS ===== */
  .blue-highlight td {
    background-color: #e3f2fd !important;
    color: #1565c0 !important;
    font-weight: bold;
  }

  .red-highlight td {
    background-color: #ffebee !important;
    color: #c62828 !important;
    font-weight: bold;
  }

  .orange-highlight td {
    background-color: #fff3e0 !important;
    color: #e65100 !important;
    font-weight: bold;
  }
`}</style>

        </div>
    );
};

export default LoanReportView;