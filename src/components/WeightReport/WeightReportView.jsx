import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

const WeightReportView = ({ reportData, onClose }) => {
    const [isClient, setIsClient] = useState(false);
    const { sales, filters, selectedGrnEntry, selectedGrnCode } = reportData;

    useEffect(() => {
        setIsClient(true);
    }, []);

    // ================= TOTALS (MATCH BLADE) =================
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

    // ================= PDF PRINT =================
    const handlePrint = () => {
        if (!isClient) return;

        const win = window.open('', '_blank');
        if (!win) return alert('Allow popups');

        win.document.write(`
        <html>
        <head>
            <title>Weight Report</title>
            <style>
                body { font-size:12px; font-family:sans-serif; }
                table { width:100%; border-collapse:collapse; }
                th, td { border:1px solid #000; padding:5px; }
                th { background:#eee; }
                .right { text-align:right; }
                .bold { font-weight:bold; }
            </style>
        </head>
        <body>
            <h3 align="center">මුළු අයිතම විකිණුම් – ප්‍රමාණ අනුව</h3>
            ${selectedGrnEntry ? `<p><b>GRN:</b> ${selectedGrnCode}</p>` : ''}
            <table>
                <thead>
                    <tr>
                        <th>අයිතම</th>
                        <th>බර</th>
                        <th>මලු</th>
                        <th>මලු ගාස්තුව</th>
                        <th>එකතුව</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map(s => {
                        const pack_due_cost = s.packs * s.pack_due;
                        const net = s.total - pack_due_cost;
                        return `
                        <tr>
                            <td>${s.item_name}</td>
                            <td class="right">${s.weight.toFixed(2)}</td>
                            <td class="right">${s.packs}</td>
                            <td class="right">${pack_due_cost.toFixed(2)}</td>
                            <td class="right">${net.toFixed(2)}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr class="bold">
                        <td>මුළු එකතුව</td>
                        <td class="right">${totals.total_weight.toFixed(2)}</td>
                        <td class="right">${totals.total_packs}</td>
                        <td class="right">${totals.total_pack_due_cost.toFixed(2)}</td>
                        <td class="right">${totals.total_net_total.toFixed(2)}</td>
                    </tr>
                    <tr class="bold">
                        <td colspan="4" class="right">අවසන් මුළු එකතුව</td>
                        <td class="right">${(totals.total_net_total + totals.total_pack_due_cost).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </body>
        </html>
        `);

        win.document.close();
        win.print();
    };

    // ================= EXCEL EXPORT =================
    const handleExcel = () => {
        const data = [
            ['අයිතම', 'බර', 'මලු', 'මලු ගාස්තුව', 'එකතුව']
        ];

        sales.forEach(s => {
            const pack_due_cost = s.packs * s.pack_due;
            const net = s.total - pack_due_cost;
            data.push([
                s.item_name,
                s.weight,
                s.packs,
                pack_due_cost,
                net
            ]);
        });

        data.push([]);
        data.push(['මුළු එකතුව', totals.total_weight, totals.total_packs, totals.total_pack_due_cost, totals.total_net_total]);
        data.push(['අවසන් මුළු එකතුව', '', '', '', totals.total_net_total + totals.total_pack_due_cost]);

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Weight Report');
        XLSX.writeFile(wb, 'Weight_Report.xlsx');
    };

    // ================= UI =================
    return (
        <div className="card p-4">
            <div className="mb-3">
                <button className="btn btn-success me-2" onClick={handleExcel}>Excel</button>
                <button className="btn btn-primary me-2" onClick={handlePrint}>PDF</button>
                <button className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>

            <table className="table table-bordered table-sm">
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
                        <td className="text-end">
                            {(totals.total_net_total + totals.total_pack_due_cost).toFixed(2)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default WeightReportView;
