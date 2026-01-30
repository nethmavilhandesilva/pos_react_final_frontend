import React, { useState, useEffect } from 'react';
import api from '../../api';
import Sidebar from '../Sidebar';

const SupplierReport = () => {

    // Report Data
    const [reportData, setReportData] = useState({ billed: {}, nonBilled: {} });
    const [loading, setLoading] = useState(false);

    // Date Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Fetch Report
    const fetchReport = async () => {
        try {
            setLoading(true);

            const response = await api.get('/supplier-report', {
                params: {
                    start_date: startDate,
                    end_date: endDate
                }
            });

            setReportData(response.data);
        } catch (error) {
            console.error("Error fetching report:", error);
        } finally {
            setLoading(false);
        }
    };

    // Reset Function
    const handleReset = async () => {
        setStartDate('');
        setEndDate('');
        setLoading(true);

        const response = await api.get('/supplier-report');
        setReportData(response.data);
        setLoading(false);
    };

    // Auto Load Default Report on Page Load
    useEffect(() => {
        fetchReport();
    }, []);

    // Render Table Function
    const renderTableBlock = (groups) => {
        const groupKeys = Object.keys(groups);
        if (groupKeys.length === 0) return null;

        return groupKeys.map((key) => (
            <div key={key} className="mb-5 shadow card border-0">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0 fw-bold">
                        සැපයුම්කරු: {key}
                    </h5>
                    <span className="badge bg-white text-primary">
                        වාර්තා ගණන: {groups[key].length}
                    </span>
                </div>

                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-striped table-hover mb-0">
                            <thead style={{ backgroundColor: '#007bff', color: 'white' }}>
                                <tr>
                                    <th>දිනය</th>
                                    <th>අයිතම කේතය</th>
                                    <th>අයිතමය</th>
                                    <th>ගනුදෙනුකරු</th>
                                    <th className="text-end">බර</th>
                                    <th className="text-end">මිල</th>
                                    <th className="text-end">එකතුව</th>
                                    <th className="text-end">ලාභය</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups[key].map((sale, idx) => (
                                    <tr key={idx}>
                                        <td>{sale.Date}</td>
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
                            <tfoot className="table-secondary">
                                <tr>
                                    <td colSpan="6" className="text-end fw-bold">මුළු එකතුව:</td>
                                    <td className="text-end fw-bold text-primary">
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
            <Sidebar />

            <div style={{
                marginLeft: '260px',
                padding: '30px',
                width: '100%',
                backgroundColor: '#f5f5f5',
                minHeight: '100vh'
            }}>

                {/* DATE FILTER PANEL */}
                <div className="card shadow mb-4 p-3">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="fw-bold">ආරම්භ දිනය</label>
                            <input type="date" className="form-control"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="fw-bold">අවසන් දිනය</label>
                            <input type="date" className="form-control"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>

                        <div className="col-md-3">
                            <button
                                className="btn btn-primary w-100"
                                onClick={fetchReport}
                                disabled={!startDate || !endDate || loading}
                            >
                                {loading ? 'Loading...' : 'Search'}
                            </button>
                        </div>

                        <div className="col-md-3">
                            <button className="btn btn-secondary w-100" onClick={handleReset}>
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Date Summary */}
                    {startDate && endDate && (
                        <div className="mt-2 text-muted">
                            Showing records from <b>{startDate}</b> to <b>{endDate}</b>
                        </div>
                    )}
                </div>

                {/* TITLE */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold">සැපයුම්කරු අනුව වාර්තාව</h2>
                    <button className="btn btn-success" onClick={() => window.print()}>
                        Print
                    </button>
                </div>

                {/* LOADING */}
                {loading && (
                    <div className="text-center p-4">
                        <div className="spinner-border text-primary"></div>
                        <div>Loading data...</div>
                    </div>
                )}

                {/* DATA */}
                {!loading && (
                    <>
                        {Object.keys(reportData.nonBilled).length > 0 && (
                            <>
                                <h4 className="fw-bold">බිල් නොකළ වාර්තා</h4>
                                {renderTableBlock(reportData.nonBilled)}
                            </>
                        )}

                        {Object.keys(reportData.billed).length > 0 && (
                            <>
                                <hr />
                                <h4 className="fw-bold">බිල් කළ වාර්තා</h4>
                                {renderTableBlock(reportData.billed)}
                            </>
                        )}

                        {Object.keys(reportData.billed).length === 0 &&
                         Object.keys(reportData.nonBilled).length === 0 && (
                            <div className="alert alert-info">No records found</div>
                        )}
                    </>
                )}

            </div>
        </div>
    );
};

export default SupplierReport;
