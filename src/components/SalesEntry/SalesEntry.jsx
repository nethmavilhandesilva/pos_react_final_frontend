// src/components/Suppliers/SupplierDetailsModal.jsx

import React, { useMemo, useEffect } from 'react';

const SupplierDetailsModal = ({ isOpen, onClose, supplierCode, details }) => {
    if (!isOpen) return null;

    // --- CALCULATIONS (using useMemo for efficiency) ---
    const { 
        totalWeight, 
        totalSales, 
        totalCommission, 
        amountPayable, 
        itemSummaryData,
        detailedItemsHtml,
        totalPacksSum,
        billNo,
        customerCode 
    } = useMemo(() => {
        let totalWeight = 0;
        let totalSales = 0;
        let totalCommission = 0;
        let totalPacksSum = 0;
        let customerCode = details.length > 0 ? details[0].customer_code : '';
        let billNo = details.length > 0 ? details[0].bill_no : '';

        const itemSummary = {};
        const itemsHtmlArray = [];

        details.forEach(record => {
            const weight = parseFloat(record.weight) || 0;
            const total = parseFloat(record.total) || 0;
            const commission = parseFloat(record.commission_amount) || 0;
            const packs = parseInt(record.packs) || 0;
            const pricePerKg = parseFloat(record.price_per_kg) || 0;
            const itemName = record.item_name || 'Unknown Item';

            // 1. Grand Totals
            totalWeight += weight;
            totalSales += total;
            totalCommission += commission;
            totalPacksSum += packs;

            // 2. Detailed Items HTML (for the bill)
            // Item Net Value (Total - Commission)
            const itemNetValue = total - commission;
            
            itemsHtmlArray.push(`
                <tr>
                    <td style="text-align:left;padding:2px;border-bottom:1px solid #eee;">${itemName}<br>${packs}</td>
                    <td style="text-align:center;padding:2px;border-bottom:1px solid #eee;">${weight.toFixed(3)}</td>
                    <td style="text-align:center;padding:2px;border-bottom:1px solid #eee;">${pricePerKg.toFixed(2)}</td>
                    <td style="text-align:right;padding:2px;border-bottom:1px solid #eee;">${itemNetValue.toFixed(2)}</td>
                </tr>
            `);

            // 3. Item Summary Data
            if (!itemSummary[itemName]) {
                itemSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
            }
            itemSummary[itemName].totalWeight += weight;
            itemSummary[itemName].totalPacks += packs;
        });

        return {
            totalWeight,
            totalSales,
            totalCommission,
            amountPayable: totalSales - totalCommission,
            itemSummaryData: itemSummary,
            detailedItemsHtml: itemsHtmlArray.join(''),
            totalPacksSum,
            billNo,
            customerCode,
        };
    }, [details]);

    // Helper function to format decimals
    const formatDecimal = (value, decimals = 2) => value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    // --- BILL CONTENT GENERATION ---
    const getBillContent = () => {
        const date = new Date().toLocaleDateString('si-LK');
        const time = new Date().toLocaleTimeString('si-LK');
        
        const mobile = '071XXXXXXX'; 
        const customerName = customerCode || 'N/A';
        
        const totalSalesExcludingPackDue = amountPayable;
        const totalPackDueCost = totalCommission;
        const finalAmountToDisplay = amountPayable; 
        
        const givenAmountRow = ''; 
        const loanRow = ''; 
        
        const itemSummaryKeys = Object.keys(itemSummaryData);
        const itemSummaryHtml = itemSummaryKeys.map(itemName => {
            const sum = itemSummaryData[itemName];
            return `
                <tr>
                    <td style="width: 50%;">${itemName}</td>
                    <td style="width: 50%; text-align: right;">${sum.totalPacks} @ ${sum.totalWeight.toFixed(3)}kg</td>
                </tr>
            `;
        }).join('');

        return `<div class="receipt-container" style="width:100%;max-width:300px;margin:0 auto;padding:5px;">
          <div style="text-align:center;margin-bottom:5px;">
            <h3 style="font-size:1.8em;font-weight:bold;margin:0;">NVDS</h3>
            </div>
          <div style="text-align:left;margin-bottom:5px;">
            <table style="width:100%;font-size:9px;border-collapse:collapse;">
              <tr><td style="width:50%;">දිනය : ${date}</td><td style="width:50%;text-align:right;">${time}</td></tr>
              <tr><td colspan="2">දුර : ${mobile || ''}</td></tr>
                            <tr><td>බිල් අංකය : <strong>${billNo || 'N/A'}</strong></td><td style="text-align:right;"><strong style="font-size:2.0em;">${customerName.toUpperCase()}</strong></td></tr>
            </table>
          </div>
          <hr style="border:1px solid #000;margin:5px 0;opacity:1;">
          
          <div style="font-size:1.5em; text-align:right; font-weight:bold; margin-bottom:5px;">
             පාරිභෝගික කේතය: ${customerCode}
          </div>

          <table style="width:100%;font-size:9px;border-collapse:collapse;">
            <thead style="font-size:1.8em;">
              <tr><th style="text-align:left;padding:2px;">වර්ගය<br>මලු</th><th style="padding:2px;">කිලෝ</th><th style="padding:2px;">මිල</th><th style="text-align:right;padding:2px;">අගය</th></tr>
            </thead>
            <tbody>
              <tr><td colspan="4"><hr style="border:1px solid #000;margin:5px 0;opacity:1;"></td></tr>
              ${detailedItemsHtml}
              <tr><td colspan="4"><hr style="border:1px solid #000;margin:5px 0;opacity:1;"></td></tr>
              <tr><td colspan="2" style="text-align:left;font-weight:bold;font-size:1.8em;">${totalPacksSum}</td><td colspan="2" style="text-align:right;font-weight:bold;font-size:1.5em;">${totalSalesExcludingPackDue.toFixed(2)}</td></tr>
            </tbody>
          </table>
          <table style="width:100%;font-size:15px;border-collapse:collapse;">
            <tr><td>ප්‍රවාහන ගාස්තු:</td><td style="text-align:right;font-weight:bold;">00</td></tr>
            <tr><td>කුලිය:</td><td style="text-align:right;font-weight:bold;">${totalPackDueCost.toFixed(2)}</td></tr>
            <tr><td>අගය:</td><td style="text-align:right;font-weight:bold;"><span style="display:inline-block; border-top:1px solid #000; border-bottom:3px double #000; padding:2px 4px; min-width:80px; text-align:right; font-size:1.5em;">${(finalAmountToDisplay).toFixed(2)}</span></td></tr>
            ${givenAmountRow}${loanRow}
          </table>
          <div style="font-size:10px;">
                <table style="width:100%;font-size:10px;border-collapse:collapse;margin-top:10px;">
                    ${itemSummaryHtml}
                </table>
            </div>
            <tr><td colspan="4"><hr style="border:1px solid #000;margin:5px 0;opacity:1;"></td></tr>
          <div style="text-align:center;margin-top:10px;font-size:10px;">
            <p style="margin:0;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p><p style="margin:0;">නැවත භාර ගනු නොලැබේ</p>
          </div>
        </div>`;
    };

    const handlePrint = () => {
        const content = getBillContent();
        const printWindow = window.open('', '', 'height=600,width=800');
        
        if (printWindow) {
            printWindow.document.write('<html><head><title>Bill Print</title>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(content);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } else {
            alert("Please allow pop-ups to print the bill.");
        }
    };
    
    // --- KEYBOARD EVENT LISTENER (F1) ---
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'F1' || event.keyCode === 112) {
                event.preventDefault();
                if (isOpen) {
                    handlePrint();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, details]);

    // --- INLINE STYLES (Kept for completeness) ---
    const modalOverlayStyle = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
        justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    };
    const modalContentStyle = {
        backgroundColor: '#ffffff', padding: '30px', borderRadius: '12px',
        width: '95%', maxWidth: '1000px', maxHeight: '90%', overflowY: 'auto',
        position: 'relative', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        fontFamily: 'Roboto, Arial, sans-serif',
    };
    const closeButtonStyle = {
        position: 'absolute', top: '15px', right: '15px', fontSize: '30px',
        border: 'none', background: 'none', cursor: 'pointer', color: '#6c757d',
        transition: 'color 0.2s', lineHeight: '1',
    };
    const headerStyle = {
        color: '#007bff', borderBottom: '2px solid #e9ecef', paddingBottom: '10px',
        marginTop: '0', marginBottom: '20px', fontSize: '1.8rem', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
    };
    const supplierCodeBadgeStyle = {
        backgroundColor: '#28a745', color: 'white', padding: '5px 10px',
        borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold',
    };
    const tableContainerStyle = {
        marginTop: '20px', overflowX: 'auto',
    };
    const tableStyle = {
        width: '100%', borderCollapse: 'collapse', minWidth: '900px',
        fontSize: '0.9rem', marginBottom: '30px',
    };
    const thStyle = {
        backgroundColor: '#007bff', color: 'white', fontWeight: '600',
        padding: '12px 15px', textAlign: 'left', position: 'sticky',
        top: '0', zIndex: 10,
    };
    const tdStyle = {
        padding: '12px 15px', textAlign: 'left', borderBottom: '1px solid #dee2e6',
        whiteSpace: 'nowrap',
    };
    const summaryBoxContainerStyle = {
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
        gap: '20px', padding: '20px 0', borderBottom: '2px solid #e9ecef',
    };
    const summaryBoxStyle = (color) => ({
        flex: '1', minWidth: '200px',
        backgroundColor: color === 'blue' ? '#e7f3ff' : color === 'red' ? '#ffe7e7' : '#e6ffed',
        padding: '15px', borderRadius: '8px', textAlign: 'center',
        border: `1px solid ${color === 'blue' ? '#007bff' : color === 'red' ? '#dc3545' : '#28a745'}`,
    });
    const summaryValueStyle = {
        fontSize: '1.5rem', fontWeight: 'bold', color: '#343a40', marginTop: '5px',
    };
    const itemSummaryHeaderStyle = {
        marginTop: '30px', fontSize: '1.5rem', color: '#495057',
        borderBottom: '1px dashed #dee2e6', paddingBottom: '10px', marginBottom: '15px',
    };
    const itemSummaryTableStyle = {
        width: '100%', borderCollapse: 'collapse', marginTop: '15px',
    };
    const itemSummaryThStyle = {
        ...thStyle, backgroundColor: '#6c757d', padding: '10px 15px', fontSize: '0.95rem',
    };
    const itemSummaryTdStyle = {
        ...tdStyle, padding: '10px 15px',
    };
    const getRowStyle = (index) => {
        const baseStyle = index % 2 === 0 ? { backgroundColor: '#f8f9fa' } : { backgroundColor: '#ffffff' };
        return baseStyle;
    };
    const printButtonStyle = {
        padding: '10px 20px', fontSize: '1.1rem', fontWeight: 'bold',
        backgroundColor: '#ffc107', color: '#343a40', border: 'none',
        borderRadius: '6px', cursor: 'pointer', marginTop: '20px', transition: 'background-color 0.2s',
    };
    
    // --- Item Summary Component ---
    const ItemSummary = ({ summaryData }) => {
        const itemNames = Object.keys(summaryData);
        if (itemNames.length === 0) return null;

        return (
            <div>
                <h3 style={itemSummaryHeaderStyle}>📦 Item Summary</h3>
                <table style={itemSummaryTableStyle}>
                    <thead>
                        <tr>
                            <th style={itemSummaryThStyle}>Item Name</th>
                            <th style={itemSummaryThStyle}>Total Weight (kg)</th>
                            <th style={itemSummaryThStyle}>Total Packs</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemNames.map((itemName, index) => (
                            <tr key={itemName} style={getRowStyle(index)}>
                                <td style={itemSummaryTdStyle}>{itemName}</td>
                                <td style={itemSummaryTdStyle}>{formatDecimal(summaryData[itemName].totalWeight, 3)}</td>
                                <td style={itemSummaryTdStyle}>{summaryData[itemName].totalPacks}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // --- MAIN RENDER ---
    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button 
                    style={closeButtonStyle} 
                    onClick={onClose}
                    onMouseOver={e => e.currentTarget.style.color = '#dc3545'}
                    onMouseOut={e => e.currentTarget.style.color = '#6c757d'}
                >
                    &times;
                </button>
                
                {/* --- SUPPLIER CODE IN HEADER --- */}
                <div style={headerStyle}>
                    <h2>Transaction Details</h2>
                    <span style={supplierCodeBadgeStyle}>{supplierCode}</span>
                </div>
                
                {details.length === 0 ? (
                    <p style={{ color: '#6c757d' }}>No records found for this supplier.</p>
                ) : (
                    <>
                        {/* --- GRAND SUMMARY BOXES --- */}
                        <div style={summaryBoxContainerStyle}>
                            <div style={summaryBoxStyle('green')}>
                                <div>Total Weight (kg)</div>
                                <div style={summaryValueStyle}>{formatDecimal(totalWeight, 3)}</div>
                            </div>
                            <div style={summaryBoxStyle('blue')}>
                                <div>Total Sales Amount</div>
                                <div style={summaryValueStyle}>{formatDecimal(totalSales)}</div>
                            </div>
                            <div style={summaryBoxStyle('red')}>
                                <div>Total Commission</div>
                                <div style={summaryValueStyle}>{formatDecimal(totalCommission)}</div>
                            </div>
                            <div style={summaryBoxStyle('blue')}>
                                <div>**Amount Payable**</div>
                                <div style={summaryValueStyle}>{formatDecimal(amountPayable)}</div>
                            </div>
                        </div>

                        {/* --- DETAILED TABLE --- */}
                        <div style={tableContainerStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Date</th>
                                        <th style={thStyle}>Bill No</th>
                                        <th style={thStyle}>Customer</th>
                                        <th style={thStyle}>Item</th>
                                        <th style={thStyle}>Weight</th>
                                        <th style={thStyle}>Price/kg</th>
                                        <th style={thStyle}>Commission</th>
                                        <th style={thStyle}>Total</th>
                                        <th style={thStyle}>Packs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {details.map((record, index) => (
                                        <tr 
                                            key={index} 
                                            style={getRowStyle(index)}
                                        >
                                            <td style={tdStyle}>{record.Date}</td>
                                            <td style={tdStyle}>{record.bill_no}</td>
                                            <td style={tdStyle}>{record.customer_code}</td>
                                            <td style={tdStyle}>{record.item_name}</td>
                                            <td style={tdStyle}>{formatDecimal(record.weight, 3)}</td>
                                            <td style={tdStyle}>{formatDecimal(record.price_per_kg)}</td>
                                            <td style={tdStyle}>{formatDecimal(record.commission_amount)}</td>
                                            <td style={tdStyle}>{formatDecimal(record.total)}</td>
                                            <td style={tdStyle}>{record.packs}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* --- ITEM SUMMARY --- */}
                        <ItemSummary summaryData={itemSummaryData} />

                        {/* --- PRINT BUTTON --- */}
                        <div style={{ textAlign: 'center' }}>
                            <button 
                                style={printButtonStyle} 
                                onClick={handlePrint}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#e0a800'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#ffc107'}
                            >
                                🖨️ Print Bill (F1)
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SupplierDetailsModal;