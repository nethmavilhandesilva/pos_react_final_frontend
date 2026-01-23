import React, { useState, useEffect } from 'react';
import api from '../../api';
import Sidebar from '../Sidebar'; // Import the sidebar from the location you provided

const SupplierReport = () => {
    // Initializing state to hold the two separate groups from Laravel
    const [reportData, setReportData] = useState({ billed: {}, nonBilled: {} });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await api.get('/supplier-report');
                // The backend now returns { billed: {...}, nonBilled: {...} }
                setReportData(response.data);
            } catch (error) {
                console.error("Error fetching report:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, []);

    // Helper function to render a table block to avoid repeating the large table HTML
    const renderTableBlock = (groups) => {
        const groupKeys = Object.keys(groups);
        if (groupKeys.length === 0) return null;

        return groupKeys.map((key) => (
            <div key={key} className="mb-5 shadow card border-0">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0 fw-bold">
                        <i className="material-icons align-middle me-2">local_shipping</i>
                        සැපයුම්කරු: {key}
                    </h5>
                    <span className="badge bg-white text-primary">වාර්තා ගණන: {groups[key].length}</span>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-striped table-hover mb-0">
                            <thead style={{ backgroundColor: '#007bff', color: 'white' }}>
                                <tr className="text-white">
                                    <th className="text-white border-0">දිනය (Date)</th>
                                    <th className="text-white border-0">අයිතම කේතය</th>
                                    <th className="text-white border-0">අයිතමය</th>
                                    <th className="text-white border-0">ගනුදෙනුකරු</th>
                                    <th className="text-end text-white border-0">බර (Weight)</th>
                                    <th className="text-end text-white border-0">මිල</th>
                                    <th className="text-end text-white border-0">එකතුව</th>
                                    <th className="text-end text-white border-0">ලාභය</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups[key].map((sale, idx) => (
                                    <tr key={idx}>
                                        <td className="small">{sale.Date}</td>
                                        <td>{sale.item_code}</td>
                                        <td>{sale.item_name}</td>
                                        <td>{sale.customer_code}</td>
                                        <td className="text-end">{sale.SupplierWeight}</td>
                                        <td className="text-end">{sale.SupplierPricePerKg}</td>
                                        <td className="text-end fw-bold">
                                            {parseFloat(sale.SupplierTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-end text-success fw-bold">{sale.profit}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="table-secondary border-top">
                                <tr>
                                    <td colSpan="6" className="text-end fw-bold px-3">සැපයුම්කරුගේ මුළු එකතුව (Sub-Total):</td>
                                    <td className="text-end fw-bold text-primary px-3" style={{ fontSize: '1.1rem' }}>
                                        {groups[key].reduce((sum, item) => sum + parseFloat(item.SupplierTotal || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        ));
    };

    return (
        <div style={{ display: 'flex' }}>
            {/* 1. Sidebar on the left */}
            <Sidebar />

            {/* 2. Main Content on the right */}
            <div style={{ 
                marginLeft: '260px', // Matches sidebar width
                padding: '30px', 
                width: '100%', 
                backgroundColor: '#1ec139ff', 
                minHeight: '100vh' 
            }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold text-dark">සැපයුම්කරු අනුව වාර්තාව</h2>
                    <button className="btn btn-success shadow-sm" onClick={() => window.print()}>
                        <i className="material-icons align-middle me-1">print</i> වාර්තාව මුද්‍රණය කරන්න
                    </button>
                </div>

                {loading ? (
                    <div className="p-5 text-center">
                        <div className="spinner-border text-success" role="status"></div>
                        <div className="mt-2 text-dark">දත්ත පූරණය වෙමින් පවතී...</div>
                    </div>
                ) : (
                    <>
                        {/* Section: Non-Billed Records */}
                        {Object.keys(reportData.nonBilled).length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-dark fw-bold mb-3">බිල්පත් නොකළ වාර්තා (Pending)</h4>
                                {renderTableBlock(reportData.nonBilled)}
                            </div>
                        )}

                        {/* Section: Billed Records */}
                        {Object.keys(reportData.billed).length > 0 && (
                            <div className="mb-4">
                                <hr className="border-dark my-5" />
                                
                                {renderTableBlock(reportData.billed)}
                            </div>
                        )}

                        {/* No Records State */}
                        {Object.keys(reportData.billed).length === 0 && Object.keys(reportData.nonBilled).length === 0 && (
                            <div className="alert alert-info shadow-sm">ගැලපෙන දත්ත කිසිවක් හමු නොවීය. (No records found)</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SupplierReport;