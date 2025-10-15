import React from 'react';

const GrnSaleReportView = ({ reportData, onClose }) => {
    const { sales, filters, selectedGrnEntry, selectedGrnCode } = reportData;

    const totals = sales.reduce((acc, sale) => {
        acc.total_packs += Number(sale.packs) || 0;
        acc.total_weight += Number(sale.weight) || 0;
        acc.total_amount += Number(sale.total) || 0;
        return acc;
    }, { total_packs: 0, total_weight: 0, total_amount: 0 });

    return (
        <div className="card shadow border-0 rounded-3 p-4 custom-card mt-4">
            <div className="report-title-bar">
                <h2 className="company-name">Company Name</h2>
                <h4 className="fw-bold text-white">📄 GRN කේතය අනුව විකුණුම් වාර්තාව</h4>
                <span className="right-info">
                    {new Date().toLocaleDateString('en-CA')}
                </span>
                <button className="print-btn" onClick={() => window.print()}>
                    🖨️ මුද්‍රණය
                </button>
            </div>

            {/* Filters Summary */}
            <div className="mb-3 text-white">
                <strong>තෝරාගත් GRN කේතය:</strong> {selectedGrnCode}
                {(filters.start_date || filters.end_date) && (
                    <span className="ms-3">
                        <strong>දිනයන්:</strong> 
                        {filters.start_date && ` ${filters.start_date}`}
                        {filters.end_date && ` සිට ${filters.end_date} දක්වා`}
                    </span>
                )}
            </div>

            <table className="table table-bordered table-striped table-sm text-center align-middle">
                <thead className="table-dark">
                    <tr>
                        <th>🗓️ දිනය</th>
                        <th>බිල් අංකය</th>
                        <th>ගෙණුම්කරු කේතය</th>
                        <th>බර (kg)</th>
                        <th>මිල (1kg)</th>
                        <th>පැක්</th>
                        <th>මුළු මුදල (Rs.)</th>
                    </tr>
                </thead>
                <tbody>
                    {sales.length > 0 ? (
                        sales.map((sale, index) => (
                            <tr key={index}>
                                <td>{sale.Date || sale.created_at}</td>
                                <td>{sale.bill_no}</td>
                                <td>{sale.customer_code}</td>
                                <td className="text-end">{Number(sale.weight).toFixed(2)}</td>
                                <td className="text-end">{Number(sale.price_per_kg).toFixed(2)}</td>
                                <td className="text-end">{Number(sale.packs).toFixed(0)}</td>
                                <td className="text-end fw-bold">{Number(sale.total).toFixed(2)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7" className="text-center text-muted py-3">🚫 වාර්තා නැත</td>
                        </tr>
                    )}
                </tbody>

                <tfoot>
                    <tr className="table-secondary fw-bold">
                        <td colSpan="3" className="text-end">මුළු එකතුව:</td>
                        <td className="text-end">{Number(totals.total_weight).toFixed(2)}</td>
                        <td></td>
                        <td className="text-end">{Number(totals.total_packs).toFixed(0)}</td>
                        <td className="text-end">{Number(totals.total_amount).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <button className="btn btn-secondary mt-3" onClick={onClose}>
                Close Report
            </button>
        </div>
    );
};

export default GrnSaleReportView;