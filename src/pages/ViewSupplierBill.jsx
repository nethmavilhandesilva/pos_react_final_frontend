import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from "../api";

const ViewSupplierBill = () => {
    const { token } = useParams();
    const [bill, setBill] = useState(null);

    // Configuration
    const billSize = 'default'; 
    const mobile = '0777672838/071437115';
    const is4Inch = billSize === '4inch';
    const receiptMaxWidth = is4Inch ? '4in' : '350px';
    const fontSizeBody = '25px';
    const fontSizeHeader = '23px';
    const fontSizeTotal = '28px';

    useEffect(() => {
        api.get(`https://goviraju.lk/sms_new_backend_50500/api/public/supplier-bill/${token}`).then(res => {
            setBill(res.data);
            // 🚀 STEP 1: Set the document title so the browser uses it as the filename
            if (res.data && res.data.bill_no) {
                document.title = `${res.data.bill_no}`;
            }
        });

        // Cleanup: Reset title when leaving the page
        return () => { document.title = "POS System"; };
    }, [token]);

    const handlePrint = () => {
        // Double-check title is set before opening print dialog
        if (bill && bill.bill_no) {
            document.title = `${bill.bill_no}`;
        }
        window.print();
    };

    const formatNumber = (value, maxDecimals = 3) => {
        if (typeof value !== 'number' && typeof value !== 'string') return '0';
        const number = parseFloat(value);
        if (isNaN(number)) return '0';
        if (Number.isInteger(number)) return number.toLocaleString('en-US');
        const parts = number.toFixed(maxDecimals).replace(/\.?0+$/, '').split('.');
        const wholePart = parseInt(parts[0]).toLocaleString('en-US');
        return parts[1] ? `${wholePart}.${parts[1]}` : wholePart;
    };

    if (!bill) return <div style={{ padding: '20px' }}>Loading...</div>;

    // Data Parsing
    const items = JSON.parse(bill.sales_data || "[]");
    const advanceAmount = parseFloat(bill.advance_amount || 0);
    const totalsupplierSales = items.reduce((s, i) => s + parseFloat(i.SupplierTotal || 0), 0);
    const totalPacksSum = items.reduce((s, i) => s + (parseInt(i.packs) || 0), 0);
    const netPayable = totalsupplierSales - advanceAmount;
    const date = new Date(bill.created_at || Date.now()).toLocaleDateString('si-LK');

    return (
        <div style={{ padding: '20px', background: '#f0f0f0', minHeight: '100vh' }}>
            <button 
                onClick={handlePrint} 
                className="no-print"
                style={{ 
                    marginBottom: '20px', 
                    padding: '12px 24px', 
                    cursor: 'pointer', 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
            >
                📥 Download PDF (Bill: {bill.bill_no})
            </button>

            {/* MAIN RECEIPT CONTAINER */}
            <div style={{ 
                width: receiptMaxWidth, 
                margin: '0 auto', 
                padding: '10px', 
                fontFamily: "'Courier New', monospace", 
                color: '#000', 
                background: '#fff',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)' 
            }}>
                
                {/* HEADER */}
                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                    <div style={{ fontSize: '24px' }}>මංජු සහ සහෝදරයෝ</div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', margin: '12px 0' }}>
                        <span style={{ border: '2.5px solid #000', padding: '5px 12px', fontSize: '22px' }}>xx</span>
                        <div style={{ fontSize: '18px' }}>
                            ගොවියා: <span style={{ border: '2.5px solid #000', padding: '5px 10px', fontSize: '22px' }}>{bill.supplier_code}</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '16px', whiteSpace: 'nowrap' }}>එළවළු තොග වෙළෙන්දෝ බණ්ඩාරවෙල</div>
                </div>

                {/* BILL INFO */}
                <div style={{ fontSize: '19px', marginTop: '10px', padding: '0 5px' }}>
                    <div style={{ fontWeight: 'bold' }}>දුර:{mobile}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                        <span>බිල් අංකය:{bill.bill_no}</span>
                        <span>දිනය:{date}</span>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '2.5px solid #000', margin: '10px 0' }} />

                {/* TABLE */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSizeBody, tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '32%' }} />
                        <col style={{ width: '21%' }} />
                        <col style={{ width: '21%' }} />
                        <col style={{ width: '26%' }} />
                    </colgroup>
                    <thead>
                        <tr style={{ borderBottom: '2.5px solid #000', fontWeight: 'bold' }}>
                            <th style={{ textAlign: 'left', paddingBottom: '8px', fontSize: fontSizeHeader }}>වර්ගය<br />මලු</th>
                            <th style={{ textAlign: 'right', paddingBottom: '8px', fontSize: fontSizeHeader, position: 'relative', left: '-50px', top: '24px' }}>කිලෝ</th>
                            <th style={{ textAlign: 'right', paddingBottom: '8px', fontSize: fontSizeHeader, position: 'relative', left: '-45px', top: '24px' }}>මිල</th>
                            <th style={{ textAlign: 'right', paddingBottom: '8px', fontSize: fontSizeHeader }}>කේතය<br />අගය</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((record, index) => (
                            <tr key={index} style={{ fontSize: fontSizeBody, fontWeight: 'bold', verticalAlign: 'bottom' }}>
                                <td style={{ textAlign: 'left', padding: '10px 0', whiteSpace: 'nowrap' }}>
                                    {record.item_name}<br />{formatNumber(record.packs)}
                                </td>
                                <td style={{ textAlign: 'right', padding: '10px 2px', position: 'relative', left: '-70px' }}>
                                    {formatNumber(parseFloat(record.weight).toFixed(2))}
                                </td>
                                <td style={{ textAlign: 'right', padding: '10px 2px', position: 'relative', left: '-65px' }}>
                                    {formatNumber(parseFloat(record.SupplierPricePerKg).toFixed(2))}
                                </td>
                                <td style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <div style={{ fontSize: '25px', whiteSpace: 'nowrap' }}>{record.customer_code?.toUpperCase()}</div>
                                    <div style={{ fontWeight: '900', whiteSpace: 'nowrap' }}>{formatNumber(parseFloat(record.SupplierTotal).toFixed(2))}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ borderTop: '2.5px solid #000', fontWeight: 'bold' }}>
                            <td style={{ paddingTop: '12px', fontSize: fontSizeTotal }}>{formatNumber(totalPacksSum)}</td>
                            <td colSpan="3" style={{ paddingTop: '12px', fontSize: fontSizeTotal }}>
                                <div style={{ textAlign: 'right', float: 'right', whiteSpace: 'nowrap' }}>{totalsupplierSales.toFixed(2)}</div>
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* TOTALS SECTION */}
                <table style={{ width: '100%', marginTop: '20px', fontWeight: 'bold', fontSize: '22px', padding: '0 5px' }}>
                    <tbody>
                        <tr>
                            <td style={{ fontSize: '15px', whiteSpace: 'nowrap', position: 'relative', left: '-15px' }}>මෙම බිලට ගෙවන්න:</td>
                            <td style={{ textAlign: 'right' }}>
                                <span style={{ borderBottom: '5px double #000', borderTop: '2.5px solid #000', fontSize: fontSizeTotal, padding: '5px 10px', paddingLeft: '25px' }}>
                                    {totalsupplierSales.toFixed(2)}
                                </span>
                            </td>
                        </tr>
                        <tr style={{ fontSize: '18px' }}>
                            <td style={{ fontSize: '15px', paddingTop: '10px' }}>අත්තිකාරම්</td>
                            <td style={{ textAlign: 'right', paddingTop: '10px', color: '#000' }}>
                                - {advanceAmount.toFixed(2)}
                            </td>
                        </tr>
                        <tr style={{ fontWeight: '900' }}>
                            <td style={{ fontSize: '18px', paddingTop: '5px' }}>ඉතිරි ශේෂය:</td>
                            <td style={{ textAlign: 'right', paddingTop: '5px' }}>
                                <span style={{ color: '#000', fontSize: fontSizeTotal }}>
                                    {netPayable.toFixed(2)}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* FOOTER MESSAGE */}
                <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '13px', borderTop: '2.5px solid #000', paddingTop: '10px' }}>
                    <p style={{ margin: '4px 0', fontWeight: 'bold' }}>භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p>
                    <p style={{ margin: '4px 0' }}>නැවත භාර ගනු නොලැබේ</p>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    @page { margin: 0; }
                }
            `}</style>
        </div>
    );
};

export default ViewSupplierBill;