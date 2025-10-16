import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const SalesAdjustmentReportView = ({ reportData, onClose }) => {
    const [isClient, setIsClient] = useState(false);
    const { entries, filters } = reportData;

    // Ensure we're on client side before printing
    useEffect(() => {
        setIsClient(true);
    }, []);

    const formatDate = (dateString, isOriginal = false) => {
        if (!dateString) return '-';
        
        if (isOriginal) {
            // For original records with original_created_at
            const date = new Date(dateString);
            return date.toLocaleString('en-CA', { 
                timeZone: 'Asia/Colombo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } else {
            // For other records with Date field
            const date = new Date(dateString);
            return date.toLocaleDateString('en-CA') + ' ' + 
                   new Date().toLocaleTimeString('en-CA', { 
                       timeZone: 'Asia/Colombo',
                       hour: '2-digit',
                       minute: '2-digit',
                       second: '2-digit'
                   });
        }
    };

    const getRowClass = (type) => {
        switch (type) {
            case 'original': return 'table-success';
            case 'updated': return 'table-warning';
            case 'deleted': return 'table-danger';
            default: return '';
        }
    };

    const getTypeDisplay = (type) => {
        switch (type) {
            case 'original': return 'Original';
            case 'updated': return 'Updated';
            case 'deleted': return 'Deleted';
            default: return type;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'original': return '#28a745'; // Green
            case 'updated': return '#ffc107'; // Orange/Yellow
            case 'deleted': return '#dc3545'; // Red
            default: return '#000000'; // Black
        }
    };

    // PDF Export functionality
    const handlePrint = () => {
        if (!isClient) return;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups for printing');
            return;
        }

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sales Adjustment Report</title>
                <style>
                    body { 
                        font-family: 'notosanssinhala', sans-serif; 
                        font-size: 11px; 
                        line-height: 1.3;
                        margin: 15px;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 20px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 15px;
                    }
                    th, td { 
                        border: 1px solid #000; 
                        padding: 6px; 
                        text-align: left; 
                        vertical-align: middle;
                    }
                    th { 
                        background-color: #f2f2f2; 
                        font-weight: bold;
                        text-align: center;
                    }
                    .text-center { text-align: center; }
                    .table-success { background-color: #d4edda !important; }
                    .table-warning { background-color: #fff3cd !important; }
                    .table-danger { background-color: #f8d7da !important; }
                    .meta-info { 
                        margin-bottom: 15px; 
                        padding: 10px;
                        background-color: #f8f9fa;
                        border-radius: 5px;
                    }
                    .no-data { 
                        text-align: center; 
                        color: #6c757d; 
                        padding: 20px;
                        background-color: #f8f9fa;
                    }
                    .updated-field { 
                        color: #e67e22; 
                        font-weight: bold; 
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>TGK ට්‍රේඩර්ස්</h2>
                    <h3>📦 වෙනස් කිරීම</h3>
                    <p>Report Date: ${new Date().toLocaleDateString('en-CA')}</p>
                </div>

                ${(filters.code || filters.start_date || filters.end_date) ? `
                    <div class="meta-info">
                        ${filters.code ? `<strong>කේතය:</strong> ${filters.code}<br>` : ''}
                        ${(filters.start_date || filters.end_date) ? `
                            <strong>දිනයන්:</strong>
                            ${filters.start_date ? ` ${filters.start_date}` : ''}
                            ${filters.end_date ? ` සිට ${filters.end_date} දක්වා` : ''}
                        ` : ''}
                    </div>
                ` : ''}

                <table>
                    <thead>
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
                        ${entries.data && entries.data.length > 0 ? entries.data.map(entry => {
                            const rowClass = getRowClass(entry.type).replace('table-', '');
                            const typeColor = getTypeColor(entry.type);
                            
                            return `
                                <tr class="${rowClass}">
                                    <td class="text-center">${entry.code}</td>
                                    <td class="text-center">${entry.item_name}</td>
                                    
                                    <td class="text-center" ${entry.type === 'updated' ? 'style="color: #e67e22; font-weight: bold;"' : ''}>
                                        ${entry.weight}
                                    </td>
                                    <td class="text-center" ${entry.type === 'updated' ? 'style="color: #e67e22; font-weight: bold;"' : ''}>
                                        ${Number(entry.price_per_kg).toFixed(2)}
                                    </td>
                                    <td class="text-center" ${entry.type === 'updated' ? 'style="color: #e67e22; font-weight: bold;"' : ''}>
                                        ${entry.packs}
                                    </td>
                                    <td class="text-center" ${entry.type === 'updated' ? 'style="color: #e67e22; font-weight: bold;"' : ''}>
                                        ${Number(entry.total).toFixed(2)}
                                    </td>

                                    <td class="text-center">${entry.bill_no}</td>
                                    <td class="text-center">${entry.customer_code?.toUpperCase() || '-'}</td>
                                    <td class="text-center" style="color: ${typeColor}; font-weight: bold;">
                                        ${getTypeDisplay(entry.type)}
                                    </td>
                                    <td class="text-center">
                                        ${entry.type === 'original' 
                                            ? formatDate(entry.original_created_at, true)
                                            : formatDate(entry.Date)
                                        }
                                    </td>
                                </tr>
                            `;
                        }).join('') : `
                            <tr>
                                <td colspan="10" class="no-data">සටහන් කිසිවක් සොයාගෙන නොමැත</td>
                            </tr>
                        `}
                    </tbody>
                </table>

                ${entries.data && entries.data.length > 0 ? `
                    <div style="margin-top: 20px; text-align: center; font-size: 10px;">
                        <strong>Legend:</strong> 
                        <span style="color: #28a745; margin: 0 10px;">■ Original</span>
                        <span style="color: #ffc107; margin: 0 10px;">■ Updated</span>
                        <span style="color: #dc3545; margin: 0 10px;">■ Deleted</span>
                    </div>
                ` : ''}
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    };

    // Excel Export functionality
    const handleExportExcel = () => {
        const excelData = [];
        
        // Add headers
        const headers = [
            'විකුණුම්කරු', 
            'වර්ගය', 
            'බර', 
            'මිල', 
            'මලු', 
            'මුළු මුදල', 
            'බිල්පත් අංකය', 
            'පාරිභෝගික කේතය', 
            'වර්ගය (type)', 
            'දිනය සහ වේලාව'
        ];
        excelData.push(headers);
        
        // Add data rows
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
                    entry.type === 'original' 
                        ? formatDate(entry.original_created_at, true)
                        : formatDate(entry.Date)
                ]);
            });
        }

        // Create workbook and export
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Adjustment Report');
        XLSX.writeFile(workbook, `Sales_Adjustment_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Simple browser print (fallback)
    const handleSimplePrint = () => {
        window.print();
    };

    return (
        <div className="card shadow border-0 rounded-3 p-4 custom-card mt-4">
            {/* Export Buttons */}
            <div className="d-flex justify-content-between mb-3">
                <div>
                    <button className="btn btn-success me-2" onClick={handleExportExcel}>
                        📊 Export Excel
                    </button>
                    <button className="btn btn-primary me-2" onClick={handlePrint}>
                        📄 Export PDF
                    </button>
                    <button className="btn btn-info me-2" onClick={handleSimplePrint}>
                        🖨️ Quick Print
                    </button>
                </div>
                <button className="btn btn-secondary" onClick={onClose}>
                    Close Report
                </button>
            </div>

            {/* Report Header */}
            <div className="report-title-bar">
                <h2 className="company-name">TGK ට්‍රේඩර්ස්</h2>
                <h4 className="fw-bold text-white">📦 වෙනස් කිරීම</h4>
                <span className="right-info">
                    {new Date().toLocaleDateString('en-CA')}
                </span>
            </div>

            {/* Filters Summary */}
            {(filters.code || filters.start_date || filters.end_date) && (
                <div className="mb-3 text-white">
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
                <div className="mb-3 text-white">
                    <strong>Legend:</strong> 
                    <span className="ms-2 me-3" style={{color: '#28a745'}}>■ Original</span>
                    <span className="mx-3" style={{color: '#ffc107'}}>■ Updated</span>
                    <span className="mx-3" style={{color: '#dc3545'}}>■ Deleted</span>
                </div>
            )}

            <div className="table-responsive">
                <table className="table table-bordered table-striped table-sm align-middle text-center">
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
                            entries.data.map((entry, index) => (
                                <tr key={index} className={getRowClass(entry.type)}>
                                    <td>{entry.code}</td>
                                    <td>{entry.item_name}</td>
                                    
                                    {/* Highlight updated fields */}
                                    <td style={entry.type === 'updated' ? { color: 'orange', fontWeight: 'bold' } : {}}>
                                        {entry.weight}
                                    </td>
                                    <td style={entry.type === 'updated' ? { color: 'orange', fontWeight: 'bold' } : {}}>
                                        {Number(entry.price_per_kg).toFixed(2)}
                                    </td>
                                    <td style={entry.type === 'updated' ? { color: 'orange', fontWeight: 'bold' } : {}}>
                                        {entry.packs}
                                    </td>
                                    <td style={entry.type === 'updated' ? { color: 'orange', fontWeight: 'bold' } : {}}>
                                        {Number(entry.total).toFixed(2)}
                                    </td>

                                    <td>{entry.bill_no}</td>
                                    <td>{entry.customer_code?.toUpperCase()}</td>
                                    <td style={{color: getTypeColor(entry.type), fontWeight: 'bold'}}>
                                        {getTypeDisplay(entry.type)}
                                    </td>
                                    <td>
                                        {entry.type === 'original' 
                                            ? formatDate(entry.original_created_at, true)
                                            : formatDate(entry.Date)
                                        }
                                    </td>
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

            {/* Pagination */}
            {entries.data && entries.data.length > 0 && entries.links && (
                <div className="d-flex justify-content-center mt-3">
                    <nav>
                        <ul className="pagination">
                            {entries.links.map((link, index) => (
                                <li key={index} className={`page-item ${link.active ? 'active' : ''} ${link.url ? '' : 'disabled'}`}>
                                    <a 
                                        className="page-link" 
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            )}

            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    .btn { display: none !important; }
                    .card { 
                        border: none !important; 
                        box-shadow: none !important; 
                        padding: 0 !important;
                    }
                    .report-title-bar {
                        background: #333 !important;
                        color: white !important;
                        padding: 15px;
                        text-align: center;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 10px;
                    }
                    th, td {
                        border: 1px solid #000 !important;
                        padding: 4px;
                    }
                    .pagination { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default SalesAdjustmentReportView;