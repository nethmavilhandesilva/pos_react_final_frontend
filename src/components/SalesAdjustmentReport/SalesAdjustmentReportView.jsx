import React from 'react';

const SalesAdjustmentReportView = ({ reportData, onClose }) => {
    const { entries, filters } = reportData;

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

    return (
        <div className="card shadow border-0 rounded-3 p-4 custom-card mt-4">
            <div className="report-title-bar">
                <h2 className="company-name">Company Name</h2>
                <h4 className="fw-bold text-white">📦 වෙනස් කිරීම</h4>
                <span className="right-info">
                    {new Date().toLocaleDateString('en-CA')}
                </span>
                <button className="print-btn" onClick={() => window.print()}>
                    🖨️ මුද්‍රණය
                </button>
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
                                    <td>{getTypeDisplay(entry.type)}</td>
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

            <button className="btn btn-secondary mt-3" onClick={onClose}>
                Close Report
            </button>
        </div>
    );
};

export default SalesAdjustmentReportView;