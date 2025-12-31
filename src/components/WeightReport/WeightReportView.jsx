import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api'; // axios instance

const WeightReportView = ({ reportData, onClose }) => {
    const printRef = useRef();
    const [isClient, setIsClient] = useState(false);
    const [companyName, setCompanyName] = useState('???');
    const [reportDate, setReportDate] = useState('N/A');

    const { sales, filters, selectedGrnEntry, selectedGrnCode } = reportData;

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

    // ================= TOTALS =================
    const totals = sales.reduce(
        (acc, sale) => {
            const packs = Number(sale.packs) || 0;
            const weight = Number(sale.weight) || 0;
            const pack_due = Number(sale.pack_due) || 0;
            const item_total = Number(sale.total) || 0;

            const pack_due_cost = packs * pack_due;
            const net_total = item_total - pack_due_cost;

            acc.total_packs += packs;
            acc.total_weight += weight;
            acc.total_pack_due_cost += pack_due_cost;
            acc.total_net_total += net_total;

            return acc;
        },
        {
            total_packs: 0,
            total_weight: 0,
            total_pack_due_cost: 0,
            total_net_total: 0
        }
    );

    // ================= PRINT =================
    const handlePrint = () => {
        if (!isClient) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert('Please allow popups');

        const printContent = printRef.current.innerHTML;

        printWindow.document.write(`
            <html>
            <head>
                <title>Weight Report</title>
                <style>
                    body { font-size:12px; font-family:sans-serif; }
                    table { width:100%; border-collapse:collapse; }
                    th, td { border:1px solid #000; padding:5px; }
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

        printWindow.document.close();
        printWindow.onload = () => printWindow.print();
    };

    // ================= EXCEL EXPORT =================
    const handleExcel = () => {
        const data = [
            ['අයිතම', 'බර', 'මලු', 'මලු ගාස්තුව', 'එකතුව']
        ];

        sales.forEach(s => {
            const pack_due_cost = s.packs * s.pack_due;
            const net = s.total - pack_due_cost;
            data.push([s.item_name, s.weight, s.packs, pack_due_cost, net]);
        });

        data.push([]);
        data.push(['මුළු එකතුව', totals.total_weight, totals.total_packs, totals.total_pack_due_cost, totals.total_net_total]);
        data.push(['අවසන් මුළු එකතුව', '', '', '', totals.total_net_total + totals.total_pack_due_cost]);

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Weight Report');
        XLSX.writeFile(wb, `Weight_Report_${reportDate}.xlsx`);
    };

    // ================= UI =================
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
                <h3 style={{ margin: 0 }}>📦 බර අනුව වාර්තාව</h3>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>{reportDate}</p>
            </div>

            {/* Filters / Meta */}
            {selectedGrnEntry && <p><strong>GRN:</strong> {selectedGrnCode}</p>}
            {(filters.start_date || filters.end_date) && (
                <div className="filters" style={{ marginBottom: '15px', fontSize: '0.95rem' }}>
                    <strong>දින පරාසය:</strong>
                    {filters.start_date && ` ${filters.start_date}`}
                    {filters.end_date && ` සිට ${filters.end_date} දක්වා`}
                </div>
            )}

            {/* Export Buttons */}
            <div className="d-flex justify-content-between mb-3">
                <div>
                    <button className="btn btn-success btn-sm me-2" onClick={handleExcel}>📊 Excel</button>
                    <button className="btn btn-primary btn-sm me-2" onClick={handlePrint}>📄 PDF</button>
                    <button className="btn btn-info btn-sm me-2" onClick={() => window.print()}>🖨️ Quick Print</button>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table className="table table-bordered table-striped table-sm text-center align-middle">
                    <thead className="table-dark">
                        <tr>
                            <th>අයිතම</th>
                            <th className="text-end">බර</th>
                            <th className="text-end">මලු</th>
                            <th className="text-end">මලු ගාස්තුව</th>
                            <th className="text-end">එකතුව</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((s, i) => {
                            const pack_due_cost = s.packs * s.pack_due;
                            const net = s.total - pack_due_cost;
                            return (
                                <tr key={i}>
                                    <td>{s.item_name}</td>
                                    <td className="text-end">{s.weight.toFixed(2)}</td>
                                    <td className="text-end">{s.packs}</td>
                                    <td className="text-end">{pack_due_cost.toFixed(2)}</td>
                                    <td className="text-end">{net.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="fw-bold">
                        <tr>
                            <td>මුළු එකතුව</td>
                            <td className="text-end">{totals.total_weight.toFixed(2)}</td>
                            <td className="text-end">{totals.total_packs}</td>
                            <td className="text-end">{totals.total_pack_due_cost.toFixed(2)}</td>
                            <td className="text-end">{totals.total_net_total.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td colSpan="4" className="text-end">අවසන් මුළු එකතුව</td>
                            <td className="text-end">{(totals.total_net_total + totals.total_pack_due_cost).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default WeightReportView;
