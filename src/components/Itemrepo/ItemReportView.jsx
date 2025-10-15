import React from 'react';

const ItemReportView = ({ reportData, onClose }) => {
    const { sales, filters } = reportData;

    const totals = sales.reduce((acc, sale) => {
        acc.total_packs += sale.packs;
        acc.total_weight += sale.weight;
        acc.total_amount += sale.total;
        return acc;
    }, { total_packs: 0, total_weight: 0, total_amount: 0 });

    return (
        <div className="card shadow border-0 rounded-3 p-4 custom-card mt-4">
            <div className="report-title-bar">
                <h2 className="company-name">Company Name</h2>
                <h4 className="fw-bold text-white">📦 අයිතමය අනුව වාර්තාව</h4>
                <span className="right-info">
                    {new Date().toLocaleDateString('en-CA')}
                </span>
                <button className="print-btn" onClick={() => window.print()}>
                    🖨️ මුද්‍රණය
                </button>
            </div>

            {sales.length > 0 && (
                <div className="mb-3 text-white">
                    <strong>අයිතමය:</strong> {sales[0].item?.type || 'N/A'}
                    (<strong>කේතය:</strong> {sales[0].item_code})
                </div>
            )}

            <table className="table table-bordered table-striped table-sm text-center align-middle">
                <thead className="table-dark">
                    <tr>
                        <th>බිල් අංකය</th>
                        <th>මලු</th>
                        <th>බර (kg)</th>
                        <th>මිල (Rs/kg)</th>
                        <th>එකතුව (Rs)</th>
                        <th>ගෙණුම්කරු</th>
                        <th>GRN අංකය</th>
                    </tr>
                </thead>
                <tbody>
                    {sales.map((sale, index) => (
                        <tr key={index}>
                            <td>{sale.bill_no}</td>
                            <td className="text-end">{sale.packs}</td>
                            <td className="text-end">{Number(sale.weight).toFixed(2)}</td>
                            <td className="text-end">{Number(sale.price_per_kg).toFixed(2)}</td>
                            <td className="text-end">{Number(sale.total).toFixed(2)}</td>
                            <td>{sale.customer_code}</td>
                            <td>{sale.code}</td>
                        </tr>
                    ))}
                </tbody>

                <tfoot>
                    <tr className="table-secondary fw-bold">
                        <td className="text-end">මුළු එකතුව:</td>
                        <td className="text-end">{totals.total_packs}</td>
                        <td className="text-end">{Number(totals.total_weight).toFixed(2)}</td>
                        <td></td>
                        <td className="text-end">{Number(totals.total_amount).toFixed(2)}</td>
                        <td colSpan="2"></td>
                    </tr>
                </tfoot>
            </table>

            <button className="btn btn-secondary mt-3" onClick={onClose}>
                Close Report
            </button>
        </div>
    );
};

export default ItemReportView;