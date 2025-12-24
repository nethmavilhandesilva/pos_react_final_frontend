import React, { useState, useEffect } from 'react';
import api from '../../api';
import Layout from '../Layout/Layout';
import './FinancialReport.css';

const FinancialReport = () => {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [showProfit, setShowProfit] = useState(false);
    
    // State for all report data
    const [financialData, setFinancialData] = useState({
        totalDr: 0,
        totalCr: 0,
        salesTotal: 0,
        totalProfit: 0,
        totalDamages: 0,
        totalOldLoans: 0,
        totaltodayLoans: 0,
        totalQtySold: 0,
        totalBillsPrinted: 0,
        firstBillTime: '',
        lastBillTime: '',
        firstBillNo: '',
        lastBillNo: '',
        companyName: '',
        settingDate: ''
    });

    useEffect(() => {
        fetchFinancialReport();
    }, []);

    const fetchFinancialReport = async () => {
        try {
            setLoading(true);
            const response = await api.get('/financial-report');
            
            if (response.data.success) {
                const data = response.data.data;
                setReportData(data.reportData || []);
                setFinancialData({
                    totalDr: data.totalDr || 0,
                    totalCr: data.totalCr || 0,
                    salesTotal: data.salesTotal || 0,
                    totalProfit: data.totalProfit || 0,
                    totalDamages: data.totalDamages || 0,
                    totalOldLoans: data.totalOldLoans || 0,
                    totaltodayLoans: data.totaltodayLoans || 0,
                    totalQtySold: data.totalQtySold || 0,
                    totalBillsPrinted: data.totalBillsPrinted || 0,
                    firstBillTime: data.firstBillTime || 'N/A',
                    lastBillTime: data.lastBillTime || 'N/A',
                    firstBillNo: data.firstBillNo || 'N/A',
                    lastBillNo: data.lastBillNo || 'N/A',
                    companyName: data.companyName || 'Default Company',
                    settingDate: data.settingDate || new Date().toLocaleString()
                });
            } else {
                setError('Failed to load financial report');
            }
        } catch (err) {
            setError('Error fetching financial report: ' + (err.response?.data?.message || err.message));
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handlePasswordSubmit = () => {
        if (password === 'nethma123') {
            setShowProfit(true);
        } else {
            alert('Incorrect password');
        }
    };

    const formatNumber = (num) => {
        if (num === null || num === undefined) return '';
        return parseFloat(num).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const calculateBalance = () => {
        const diff = financialData.totalDr + financialData.totalCr;
        return diff;
    };

    if (loading) {
        return (
            <Layout>
                <div className="container mt-4 text-center">
                    <div className="spinner-border text-success" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading financial report...</p>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="container mt-4">
                    <div className="alert alert-danger">{error}</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mt-4 financial-report-container">
                <div className="report-card">
                    <div className="report-title-bar">
                        <div>
                            <h2 className="company-name">{financialData.companyName}</h2>
                            <h4 className="fw-bold">📄 විකුණුම් වාර්තාව</h4>
                        </div>
                        <div>
                            <span className="right-info">
                                {new Date(financialData.settingDate).toLocaleString()}
                            </span>
                            <button className="print-btn" onClick={handlePrint}>
                                🖨️ මුද්‍රණය
                            </button>
                        </div>
                    </div>

                    {/* Sales Total */}
                    <div className="alert alert-info fw-bold mb-3">
                        Sales Total: {formatNumber(financialData.salesTotal)}
                    </div>

                    {/* Report Table */}
                    <div className="table-responsive">
                        <table className="table table-bordered table-striped">
                            <thead>
                                <tr>
                                    <th>විස්තරය</th>
                                    <th>ලැබීම්</th>
                                    <th>ගෙවීම</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((row, index) => (
                                    <tr key={index}>
                                        <td>{row.description}</td>
                                        <td className="text-end">
                                            {row.dr ? formatNumber(Math.abs(row.dr)) : ''}
                                        </td>
                                        <td className="text-end">
                                            {row.cr ? formatNumber(Math.abs(row.cr)) : ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="fw-bold">
                                    <td>Total</td>
                                    <td className="text-end">{formatNumber(Math.abs(financialData.totalDr))}</td>
                                    <td className="text-end">{formatNumber(Math.abs(financialData.totalCr))}</td>
                                </tr>
                                
                                <tr className="fw-bold table-warning">
                                    <td>ඇතැති මුදල්</td>
                                    <td colSpan="2" className="text-end">
                                        {(() => {
                                            const diff = calculateBalance();
                                            return diff < 0 ? (
                                                <span className="text-danger">{formatNumber(diff)}</span>
                                            ) : (
                                                <span className="text-success">{formatNumber(diff)}</span>
                                            );
                                        })()}
                                    </td>
                                </tr>
                                
                                <tr className="fw-bold table-warning">
                                    <td>💰 Profit</td>
                                    <td colSpan="2" className="text-end">
                                        {showProfit ? (
                                            <span className="text-success">
                                                {formatNumber(financialData.totalProfit)}
                                            </span>
                                        ) : (
                                            <div className="d-flex align-items-center gap-2">
                                                <input
                                                    type="password"
                                                    className="form-control form-control-sm"
                                                    placeholder="Enter password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    style={{ width: '150px' }}
                                                />
                                                <button 
                                                    className="btn btn-sm btn-success"
                                                    onClick={handlePasswordSubmit}
                                                >
                                                    Show
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                
                                <tr className="fw-bold table-warning">
                                    <td>Total Damages</td>
                                    <td colSpan="2" className="text-end text-danger">
                                        {formatNumber(financialData.totalDamages)}
                                    </td>
                                </tr>
                                
                                {/* Loans Row */}
                                <tr className="fw-bold table-warning">
                                    <td colSpan="3">
                                        <div className="d-flex flex-wrap gap-3">
                                            <div className="loan-box">
                                                <div>අද දින පරණ නය</div>
                                                <div className="fw-bold">{formatNumber(financialData.totalOldLoans)}</div>
                                            </div>
                                            <div className="loan-box">
                                                <div>අද දින නය ගැනීම</div>
                                                <div className="fw-bold">{formatNumber(Math.abs(financialData.totaltodayLoans))}</div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                
                                {/* Sales Stats Row */}
                                <tr className="fw-bold table-warning">
                                    <td colSpan="3">
                                        <div className="d-flex flex-wrap gap-3">
                                            <div className="stat-box">
                                                <div>Total Qty Sold</div>
                                                <div className="fw-bold">{formatNumber(financialData.totalQtySold)}</div>
                                            </div>
                                            <div className="stat-box">
                                                <div>Total Bills Printed</div>
                                                <div className="fw-bold">{financialData.totalBillsPrinted}</div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                
                                {/* Bill Times Row */}
                                <tr className="fw-bold table-warning">
                                    <td colSpan="3">
                                        <div className="d-flex flex-wrap gap-3">
                                            <div className="bill-time-box">
                                                <div>First Bill Printed Time</div>
                                                <div className="fw-bold">{financialData.firstBillTime}</div>
                                                <small>Bill No: {financialData.firstBillNo}</small>
                                            </div>
                                            <div className="bill-time-box">
                                                <div>Last Bill Printed Time</div>
                                                <div className="fw-bold">{financialData.lastBillTime}</div>
                                                <small>Bill No: {financialData.lastBillNo}</small>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default FinancialReport;