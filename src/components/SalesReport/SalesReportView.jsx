import React, { useState, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:8000/api';

const SalesReportView = ({ reportData, onClose }) => {
    const { salesData, filters } = reportData;
    const [companyName, setCompanyName] = useState('Default Company');
    const [settingDate, setSettingDate] = useState('');

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

    // Group data by bill_no or customer_code
    const groupedData = salesData.reduce((acc, sale) => {
        const groupKey = sale.bill_no || sale.customer_code;
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(sale);
        return acc;
    }, {});

    // Calculate grand total
    const grandTotal = Object.values(groupedData).reduce((total, group) => {
        const groupTotal = group.reduce((groupSum, sale) => {
            return groupSum + (Number(sale.total) || 0);
        }, 0);
        return total + groupTotal;
    }, 0);

    return (
        <div className="container mt-2" style={{ minHeight: '100vh', padding: '15px' }}>
            <div className="card custom-card shadow border-0 rounded-3">
                {/* Report Header */}
                <div className="report-title-bar">
                    <h2 className="company-name">{companyName}</h2>
                    <h4 className="fw-bold text-white">Processed Sales Summary</h4>
                    <div className="right-info">
                        <span>Report Date: {settingDate}</span>
                    </div>
                    <button className="print-btn" onClick={() => window.print()}>
                        🖨️ Print
                    </button>
                </div>

                <div className="card-body p-0">
                    {salesData.length === 0 ? (
                        <div className="alert alert-info m-3">No processed sales records found.</div>
                    ) : (
                        Object.entries(groupedData).map(([groupKey, sales]) => {
                            const isBill = sales[0].bill_no;
                            const billTotal = sales.reduce((sum, sale) => sum + (Number(sale.weight) * Number(sale.price_per_kg) || 0), 0);
                            const billTotal2 = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
                            const firstPrinted = sales[0].FirstTimeBillPrintedOn;
                            const reprinted = sales[0].BillReprintAfterchanges;

                            return (
                                <div key={groupKey} className="mb-4">
                                    {/* Header Section */}
                                    <div className="mb-2 d-flex justify-content-between align-items-center">
                                        <h5 className="fw-bold mb-1 text-white">
                                            {isBill ? (
                                                <>
                                                    Bill No: {sales[0].bill_no}
                                                    <span className="ms-3 text-white">
                                                        Customer Code: {sales[0].customer_code || '-'}
                                                    </span>
                                                </>
                                            ) : (
                                                `Customer Code: ${sales[0].customer_code || '-'}`
                                            )}
                                        </h5>
                                        {isBill && (
                                            <div className="right-info">
                                                {firstPrinted && (
                                                    <span>First Printed: {new Date(firstPrinted).toLocaleDateString('en-CA')}</span>
                                                )}
                                                {reprinted && (
                                                    <span>Reprinted: {new Date(reprinted).toLocaleDateString('en-CA')}</span>
                                                )}
                                            </div>
                                        )}
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

            {/* Export Buttons */}
            <div className="mt-3">
                <button className="btn btn-success me-2" onClick={() => alert('Excel download functionality would go here')}>
                    Download Excel
                </button>
                <button className="btn btn-danger me-2" onClick={() => alert('PDF download functionality would go here')}>
                    Download PDF
                </button>
                <button className="btn btn-secondary" onClick={onClose}>
                    Close Report
                </button>
            </div>
        </div>
    );
};

export default SalesReportView;