import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from "../../api"; // Using the dedicated axios instance // import your Axios instance

const LoanReportView = () => {
    const [loans, setLoans] = useState([]);
    const [companyName, setCompanyName] = useState('Default Company');
    const [settingDate, setSettingDate] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLoanReport();
    }, []);

    const fetchLoanReport = async () => {
        try {
            setLoading(true);
            const response = await api.get('/customers-loans/report');

            const data = response.data;

            setLoans(data.loans || []);
            setCompanyName(data.companyName || 'Default Company');
            setSettingDate(data.settingDate || new Date().toISOString().split('T')[0]);
        } catch (error) {
            console.error('❌ Error fetching loan report:', error);
            alert('Error loading loan report: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Helper to get status from color
    const getStatusFromColor = (color) => {
        switch(color) {
            case 'orange-highlight': return 'Non realized cheques';
            case 'blue-highlight': return 'Realized cheques';
            case 'red-highlight': return 'Returned cheques';
            default: return 'Normal';
        }
    };

    // Excel Export
    const handleExportExcel = () => {
        const grandTotal = loans.reduce((total, loan) => total + parseFloat(loan.total_amount || 0), 0);
        const excelData = [];

        // Headers
        excelData.push(['පාරිභෝගික නම', 'මුදල (Rs)', 'Status']);

        loans.forEach(loan => {
            const status = getStatusFromColor(loan.highlight_color);
            excelData.push([loan.customer_short_name, Number(loan.total_amount).toFixed(2), status]);
        });

        // Totals row
        excelData.push(['GRAND TOTAL', Number(grandTotal).toFixed(2), '']);

        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Loan Report');
        XLSX.writeFile(workbook, `Loan_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // PDF Export
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert('Please allow popups for printing');

        const grandTotal = loans.reduce((total, loan) => total + parseFloat(loan.total_amount || 0), 0);

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Loan Report</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .text-end { text-align: right; }
                    .totals-row { font-weight: bold; background-color: #e9ecef; }
                </style>
            </head>
            <body>
                <h2>${companyName}</h2>
                <h3>ණය වාර්තාව - Loan Report</h3>
                <p>Report Date: ${new Date(settingDate).toLocaleDateString('en-CA')}</p>

                <table>
                    <thead>
                        <tr><th>පාරිභෝගික නම</th><th>මුදල (Rs)</th></tr>
                    </thead>
                    <tbody>
                        ${loans.map(loan => `<tr><td>${loan.customer_short_name}</td><td class="text-end">${Number(loan.total_amount).toFixed(2)}</td></tr>`).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td class="text-end">Grand Total:</td>
                            <td class="text-end">${Number(grandTotal).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => printWindow.print();
    };

    if (loading) return <div>Loading loan report...</div>;

    const grandTotal = loans.reduce((total, loan) => total + parseFloat(loan.total_amount || 0), 0);

    return (
        <div>
            <h2>{companyName}</h2>
            <h4>ණය වාර්තාව</h4>
            <button onClick={handleExportExcel}>Export Excel</button>
            <button onClick={handlePrint}>Export PDF</button>
            <table>
                <thead>
                    <tr><th>පාරිභෝගික නම</th><th>මුදල</th></tr>
                </thead>
                <tbody>
                    {loans.map((loan, index) => (
                        <tr key={index} className={loan.highlight_color || ''}>
                            <td>{loan.customer_short_name}</td>
                            <td>{Number(loan.total_amount).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <th className="text-end">Grand Total:</th>
                        <th className="text-end">{Number(grandTotal).toFixed(2)}</th>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default LoanReportView;
