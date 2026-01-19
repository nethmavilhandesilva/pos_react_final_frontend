import React, { useState, useEffect } from 'react';
import api from '../../api';
import Sidebar from '../Sidebar'; // Import the sidebar from the location you provided

const SupplierReport = () => {
    const [groupedSales, setGroupedSales] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await api.get('/supplier-report');
                setGroupedSales(response.data);
            } catch (error) {
                console.error("Error fetching report:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, []);

    // Get the supplier codes (the keys of our object)
    const supplierCodes = Object.keys(groupedSales);

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
                        <div className="mt-2">දත්ත පූරණය වෙමින් පවතී...</div>
                    </div>
                ) : (
                    <>
                        {supplierCodes.length === 0 ? (
                            <div className="alert alert-info shadow-sm">ගැලපෙන දත්ත කිසිවක් හමු නොවීය. (No records found)</div>
                        ) : (
                            supplierCodes.map((code) => (
                                <div key={code} className="mb-5 shadow card border-0">
                                    <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-3">
                                        <h5 className="mb-0 fw-bold">
                                            <i className="material-icons align-middle me-2">local_shipping</i>
                                            සැපයුම්කරු: {code}
                                        </h5>
                                        <span className="badge bg-white text-primary">වාර්තා ගණන: {groupedSales[code].length}</span>
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
                                                    {groupedSales[code].map((sale, idx) => (
                                                        <tr key={idx}>
                                                            <td className="small">{sale.Date}</td>
                                                            <td>{sale.item_code}</td>
                                                            <td>{sale.item_name}</td>
                                                            <td>{sale.customer_code}</td>
                                                            <td className="text-end">{sale.SupplierWeight}</td>
                                                            <td className="text-end">{sale.SupplierPricePerKg}</td>
                                                            <td className="text-end fw-bold">{parseFloat(sale.SupplierTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                            <td className="text-end text-success fw-bold">{sale.profit}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="table-secondary border-top">
                                                    <tr>
                                                        <td colSpan="6" className="text-end fw-bold px-3">සැපයුම්කරුගේ මුළු එකතුව (Sub-Total):</td>
                                                        <td className="text-end fw-bold text-primary px-3" style={{ fontSize: '1.1rem' }}>
                                                            {groupedSales[code].reduce((sum, item) => sum + parseFloat(item.SupplierTotal || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SupplierReport;