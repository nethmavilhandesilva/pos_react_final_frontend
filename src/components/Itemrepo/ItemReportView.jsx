import React, { useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api'; // axios instance

const ItemReportView = ({ reportData, onClose }) => {
    const printRef = useRef();
    const [isClient, setIsClient] = useState(false);
    const [companyName, setCompanyName] = useState('???');
    const [reportDate, setReportDate] = useState('N/A');
    const { sales, filters } = reportData;

    useEffect(() => setIsClient(true), []);

    // Fetch settings from backend
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

    const totals = sales.reduce(
        (acc, sale) => {
            acc.total_packs += sale.packs;
            acc.total_weight += sale.weight;
            acc.total_amount += sale.total;
            return acc;
        },
        { total_packs: 0, total_weight: 0, total_amount: 0 }
    );

    const handlePrint = () => {
        if (!isClient) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert('Please allow popups for printing');
        const printContent = printRef.current.innerHTML;
        printWindow.document.write(`
            <html>
            <head>
                <title>Item-wise Report</title>
            </head>
            <body>${printContent}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => printWindow.print();
    };

    const handleExportExcel = () => {
        const excelData = [];
        excelData.push(['බිල් අංකය', 'මලු', 'බර (kg)', 'මිල (Rs/kg)', 'එකතුව (Rs)', 'ගෙණුම්කරු', 'කේතය']);
        sales.forEach(sale => {
            excelData.push([
                sale.bill_no,
                sale.packs,
                Number(sale.weight).toFixed(2),
                Number(sale.price_per_kg).toFixed(2),
                Number(sale.total).toFixed(2),
                sale.customer_code,
                sale.code
            ]);
        });
        excelData.push([
            'මුළු එකතුව:',
            totals.total_packs,
            Number(totals.total_weight).toFixed(2),
            '',
            Number(totals.total_amount).toFixed(2),
            '',
            ''
        ]);
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Item-wise Report');
        XLSX.writeFile(workbook, `Item_Report_${reportDate}.xlsx`);
    };

    return (
        <div ref={printRef} className="card shadow-sm border-0 rounded-3 p-4" style={{ backgroundColor: '#f0f4f8' }}>
            {/* Header in one line with background */}
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
                <h3 style={{ margin: 0 }}>📦 අයිතමය අනුව වාර්තාව</h3>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>{reportDate}</p>
            </div>

            {/* Filters & Meta */}
            {sales.length > 0 && (
                <div className="meta-info" style={{ marginBottom: '10px', fontSize: '0.95rem' }}>
                    <strong>අයිතමය:</strong> {sales[0].item_name || 'N/A'} (<strong>කේතය:</strong> {sales[0].item_code})
                </div>
            )}
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
                    <button className="btn btn-success btn-sm me-2" onClick={handleExportExcel}>📊 Excel</button>
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
                            <th>බිල් අංකය</th>
                            <th>මලු</th>
                            <th>බර (kg)</th>
                            <th>මිල (Rs/kg)</th>
                            <th>එකතුව (Rs)</th>
                            <th>ගෙණුම්කරු</th>
                            <th>කේතය</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((sale, idx) => (
                            <tr key={idx}>
                                <td>{sale.bill_no}</td>
                                <td className="text-end">{sale.packs}</td>
                                <td className="text-end">{Number(sale.weight).toFixed(2)}</td>
                                <td className="text-end">{Number(sale.price_per_kg).toFixed(2)}</td>
                                <td className="text-end">{Number(sale.total).toFixed(2)}</td>
                                <td>{sale.customer_code}</td>
                                <td>{sale.item_code}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="totals-row" style={{ fontWeight: 'bold', backgroundColor: '#e6ffe6' }}>
                            <td className="text-end">මුළු එකතුව:</td>
                            <td className="text-end">{totals.total_packs}</td>
                            <td className="text-end">{Number(totals.total_weight).toFixed(2)}</td>
                            <td></td>
                            <td className="text-end">{Number(totals.total_amount).toFixed(2)}</td>
                            <td colSpan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    .btn { display: none !important; }
                    .card { box-shadow: none !important; border: none !important; padding: 0 !important; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #000 !important; padding: 5px; }
                }
            `}</style>
        </div>
    );
};

export default ItemReportView;
