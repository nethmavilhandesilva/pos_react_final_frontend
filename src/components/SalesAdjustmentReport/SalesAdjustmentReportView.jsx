import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';

const SalesAdjustmentReportView = ({ reportData, onClose }) => {
    const printRef = useRef();
    const [isClient, setIsClient] = useState(false);
    const [companyName, setCompanyName] = useState('???');
    const [reportDate, setReportDate] = useState('N/A');

    const { entries, filters } = reportData;

    useEffect(() => setIsClient(true), []);

    // Fetch company settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/settings');
                if (response.data) {
                    setCompanyName(response.data.company || '???');
                    setReportDate(response.data.value || 'N/A');
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            }
        };
        fetchSettings();
    }, []);

    const formatDate = (dateString, isOriginal = false) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return isOriginal
            ? date.toLocaleString('en-CA', { timeZone: 'Asia/Colombo', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' })
            : date.toLocaleDateString('en-CA') + ' ' + new Date().toLocaleTimeString('en-CA', { timeZone: 'Asia/Colombo', hour:'2-digit', minute:'2-digit', second:'2-digit' });
    };

    const getRowClass = (type) => {
        switch(type){
            case 'original': return 'table-success';
            case 'updated': return 'table-warning';
            case 'deleted': return 'table-danger';
            default: return '';
        }
    };

    const getTypeDisplay = (type) => {
        switch(type){
            case 'original': return 'Original';
            case 'updated': return 'Updated';
            case 'deleted': return 'Deleted';
            default: return type;
        }
    };

    const getTypeColor = (type) => {
        switch(type){
            case 'original': return '#28a745';
            case 'updated': return '#ffc107';
            case 'deleted': return '#dc3545';
            default: return '#000000';
        }
    };

    // ================= PRINT =================
    const handlePrint = () => {
        if (!isClient) return;

        const win = window.open('', '_blank');
        if (!win) return alert('Please allow popups');

        const printContent = printRef.current.innerHTML;
        win.document.write(`
            <html>
            <head>
                <title>Sales Adjustment Report</title>
                <style>
                    body { font-family: sans-serif; font-size: 12px; }
                    table { width:100%; border-collapse: collapse; }
                    th, td { border:1px solid #000; padding:5px; text-align:center; }
                    th { background:#eee; }
                    .text-end { text-align:right; }
                    .fw-bold { font-weight:bold; }
                    @media print {
                        .btn { display:none !important; }
                        .card { box-shadow:none !important; border:none !important; padding:0 !important; }
                    }
                </style>
            </head>
            <body>${printContent}</body>
            </html>
        `);
        win.document.close();
        win.onload = () => win.print();
    };

    // ================= EXCEL EXPORT =================
    const handleExportExcel = () => {
        const excelData = [];
        excelData.push([
            'විකුණුම්කරු', 'වර්ගය', 'බර', 'මිල', 'මලු', 'මුළු මුදල', 
            'බිල්පත් අංකය', 'පාරිභෝගික කේතය', 'වර්ගය (type)', 'දිනය සහ වේලාව'
        ]);

        if (entries.data && entries.data.length > 0) {
            entries.data.forEach(entry => {
                excelData.push([
                    entry.code,
                    entry.item_name,
                    entry.weight,
                    Number(entry.price_per_kg).toFixed(2),
                    entry.packs,
                    Number(entry.total).toFixed(2),
                    entry.bill_no,
                    entry.customer_code?.toUpperCase() || '-',
                    getTypeDisplay(entry.type),
                    entry.type === 'original' ? formatDate(entry.original_created_at, true) : formatDate(entry.Date)
                ]);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Adjustment Report');
        XLSX.writeFile(wb, `Sales_Adjustment_Report_${reportDate}.xlsx`);
    };

    const handleQuickPrint = () => window.print();

    return (
        <div ref={printRef} className="card shadow-sm border-0 rounded-3 p-4" style={{ backgroundColor: '#f0f4f8' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                background: 'linear-gradient(90deg, #004d00, #007700)',
                color: 'white',
                padding: '15px 20px',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontWeight: '700', margin: 0 }}>{companyName}</h2>
                <h3 style={{ margin: 0 }}>📦 Sales Adjustment Report</h3>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>{reportDate}</p>
            </div>

            {/* Filters */}
            {(filters.code || filters.start_date || filters.end_date) && (
                <div className="meta-info" style={{ marginBottom:'15px', fontSize:'0.95rem' }}>
                    {filters.code && <span><strong>කේතය:</strong> {filters.code}</span>}
                    {(filters.start_date || filters.end_date) && (
                        <span className="ms-3">
                            <strong>දිනයන්:</strong>
                            {filters.start_date && ` ${filters.start_date}`}
                            {filters.end_date && ` සිට ${filters.end_date} දක්වා`}
                        </span>
                    )}
                </div>
            )}

            {/* Legend */}
            {entries.data && entries.data.length > 0 && (
                <div className="mb-3" style={{ fontSize:'0.9rem' }}>
                    <strong>Legend:</strong> 
                    <span style={{color:'#28a745', margin:'0 10px'}}>■ Original</span>
                    <span style={{color:'#ffc107', margin:'0 10px'}}>■ Updated</span>
                    <span style={{color:'#dc3545', margin:'0 10px'}}>■ Deleted</span>
                </div>
            )}

            {/* Export Buttons */}
            <div className="d-flex justify-content-between mb-3">
                <div>
                    <button className="btn btn-success btn-sm me-2" onClick={handleExportExcel}>📊 Excel</button>
                    <button className="btn btn-primary btn-sm me-2" onClick={handlePrint}>📄 PDF</button>
                    <button className="btn btn-info btn-sm me-2" onClick={handleQuickPrint}>🖨️ Quick Print</button>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
            </div>

            {/* Table */}
            <div style={{ overflowX:'auto' }}>
                <table className="table table-bordered table-striped table-sm text-center align-middle">
                    <thead className="table-dark">
                        <tr>
                            <th>විකුණුම්කරු</th>
                            <th>වර්ගය</th>
                            <th>බර</th>
                            <th>මිල</th>
                            <th>මලු</th>
                            <th>මුළු මුදල</th>
                            <th>බිල්පත් අංකය</th>
                            <th>පාරිභෝගික කේතය</th>
                            <th>වර්ගය (type)</th>
                            <th>දිනය සහ වේලාව</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.data && entries.data.length > 0 ? (
                            entries.data.map((entry, i) => (
                                <tr key={i} className={getRowClass(entry.type)}>
                                    <td>{entry.code}</td>
                                    <td>{entry.item_name}</td>
                                    <td style={entry.type==='updated'?{color:'orange', fontWeight:'bold'}:{}}>{entry.weight}</td>
                                    <td style={entry.type==='updated'?{color:'orange', fontWeight:'bold'}:{}}>{Number(entry.price_per_kg).toFixed(2)}</td>
                                    <td style={entry.type==='updated'?{color:'orange', fontWeight:'bold'}:{}}>{entry.packs}</td>
                                    <td style={entry.type==='updated'?{color:'orange', fontWeight:'bold'}:{}}>{Number(entry.total).toFixed(2)}</td>
                                    <td>{entry.bill_no}</td>
                                    <td>{entry.customer_code?.toUpperCase()}</td>
                                    <td style={{color:getTypeColor(entry.type), fontWeight:'bold'}}>{getTypeDisplay(entry.type)}</td>
                                    <td>{entry.type==='original'?formatDate(entry.original_created_at,true):formatDate(entry.Date)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="10" className="text-center">සටහන් කිසිවක් සොයාගෙන නොමැත</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalesAdjustmentReportView;
