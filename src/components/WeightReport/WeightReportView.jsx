import React from 'react';

const WeightReportView = ({ reportData, onClose }) => {
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
                <h4 className="fw-bold text-white">⚖️ බර අනුව වාර්තාව</h4>
                <span className="right-info">
                    {new Date().toLocaleDateString('en-CA')}
                </span>
                <button className="print-btn" onClick={() => window.print()}>
                    🖨️ මුද්‍රණය
                </button>
            </div>

            {/* Display GRN Information if available */}
            {selectedGrnEntry && (
                <div className="mb-3 text-white">
                    <strong>GRN කේතය:</strong> {selectedGrnCode}
                    {selectedGrnEntry.supplier && (
                        <span>, <strong>Suppplier:</strong> {selectedGrnEntry.supplier}</span>
                    )}
                </div>
            )}

            {/* Display Date Range if available */}
            {(filters.start_date || filters.end_date) && (
                <div className="mb-3 text-white">
                    <strong>දින පරාසය:</strong> 
                    {filters.start_date && ` ${filters.start_date}`}
                    {filters.end_date && ` සිට ${filters.end_date} දක්වා`}
                </div>
            )}

            <table className="table table-bordered table-striped table-sm text-center align-middle">
                <thead className="table-dark">
                    <tr>
                        <th>අයිතමය</th>
                        <th>අයිතම කේතය</th>
                        <th>මලු</th>
                        <th>බර (kg)</th>
                        <th>එකතුව (Rs)</th>
                    </tr>
                </thead>
                <tbody>
                    {sales.map((sale, index) => (
                        <tr key={index}>
                            <td className="text-start">{sale.item_name}</td>
                            <td>{sale.item_code}</td>
                            <td className="text-end">{Number(sale.packs).toFixed(0)}</td>
                            <td className="text-end">{Number(sale.weight).toFixed(2)}</td>
                            <td className="text-end">{Number(sale.total).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>

                <tfoot>
                    <tr className="table-secondary fw-bold">
                        <td colSpan="2" className="text-end">මුළු එකතුව:</td>
                        <td className="text-end">{Number(totals.total_packs).toFixed(0)}</td>
                        <td className="text-end">{Number(totals.total_weight).toFixed(2)}</td>
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

export default WeightReportView;