import React, { useState, useEffect } from "react";
import api from "../../api";
import Layout from "../Layout/Layout"; // Adjust path based on your structure

const PrintedSalesReport = () => {
    const [reportData, setReportData] = useState({});
    const [transactionType, setTransactionType] = useState("Y"); // Default: Y
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/sales-report/printed?transaction_type=${transactionType}`);
            // response.data.data is the grouped object from Laravel
            setReportData(response.data.data || {});
        } catch (error) {
            console.error("Error fetching report:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [transactionType]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value || 0);
    };

    return (
        <Layout>
            <div className="p-4" style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
                <div className="max-w-5xl mx-auto">
                    
                    {/* Header & Filter */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-xl shadow-sm mb-6 border-l-4 border-blue-600">
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 uppercase">මුද්‍රිත විකුණුම් වාර්තාව</h1>
                            <p className="text-gray-500 text-sm">Printed Sales Grouped by Customer</p>
                        </div>

                        <div className="mt-4 md:mt-0 flex items-center gap-3">
                            <label className="font-bold text-gray-700 text-sm">ගනුදෙනු වර්ගය:</label>
                            <select 
                                value={transactionType}
                                onChange={(e) => setTransactionType(e.target.value)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 font-bold"
                            >
                                <option value="Y">ණය (Credit - Y)</option>
                                <option value="N">අත්පිට මුදල් (Cash - N)</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 font-bold text-blue-600">දත්ත පූරණය වෙමින් පවතී...</div>
                    ) : Object.keys(reportData).length === 0 ? (
                        <div className="bg-white p-10 rounded-xl text-center shadow">වාර්තා කිසිවක් හමු නොවීය.</div>
                    ) : (
                        /* Map over grouped customers */
                        Object.entries(reportData).map(([customerCode, sales]) => (
                            <div key={customerCode} className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
                                    <span className="text-lg font-bold">පාරිභෝගිකයා: {customerCode}</span>
                                    <span className="bg-blue-600 px-3 py-1 rounded-full text-xs uppercase">Bills: {sales.length}</span>
                                </div>
                                
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 font-bold">
                                        <tr>
                                            <th className="px-6 py-3 border">බිල් අංකය (Bill No)</th>
                                            <th className="px-6 py-3 border">දිනය (Date)</th>
                                            <th className="px-6 py-3 border text-right">මුළු එකතුව (Total)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.map((sale, idx) => (
                                            <tr key={idx} className="border-b hover:bg-gray-50">
                                                <td className="px-6 py-3 font-mono font-bold text-blue-600">{sale.bill_no}</td>
                                                <td className="px-6 py-3 text-gray-600">
                                                    {new Date(sale.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold text-gray-900">
                                                    {formatCurrency(sale.total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr className="font-black text-gray-900">
                                            <td colSpan="2" className="px-6 py-3 text-right text-base">මුළු එකතුව (Sub Total):</td>
                                            <td className="px-6 py-3 text-right text-lg text-red-600">
                                                {formatCurrency(sales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default PrintedSalesReport;