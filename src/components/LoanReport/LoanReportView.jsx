import React, { useState, useEffect } from 'react';

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

    const handlePrint = () => {
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
                <div className="report-title-bar">
                    <h2 className="company-name">{companyName}</h2>
                    <h4 className="fw-bold text-white">ණය වාර්තාව</h4>
                    <span className="right-info">
                        {new Date(settingDate).toLocaleDateString('en-CA')}
                    </span>
                    <button className="print-btn" onClick={handlePrint}>
                        🖨️ මුද්‍රණය
                    </button>
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

  /* ===== PRINT SETTINGS ===== */
  @media print {
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

  .print-btn {
    background-color: #004d00;
    color: white;
    border: none;
    padding: 0.4rem 0.9rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    transition: background-color 0.3s ease;
  }

  .print-btn:hover {
    background-color: #003300;
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
