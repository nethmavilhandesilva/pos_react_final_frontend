// src/components/Suppliers/SupplierReport.jsx (FIXED LAYOUT)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from "../../api";

const SupplierReport = () => {
    // State for all data
    const [summary, setSummary] = useState({ printed: [], unprinted: [] });
    const [isLoading, setIsLoading] = useState(true);

    const [printedSearchTerm, setPrintedSearchTerm] = useState('');
    const [unprintedSearchTerm, setUnprintedSearchTerm] = useState('');

    // --- REPORT VIEW STATE (Profit Removed) ---
    // 'summary' or 'details'
    const [currentView, setCurrentView] = useState('summary');

    // --- PROFIT REPORT STATE (REMOVED) ---
    // State removed: profitReportData, isProfitReportLoading, profitSearchTerm

    // State for Details Panel (always displayed)
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [selectedBillNo, setSelectedBillNo] = useState(null);
    const [isUnprintedBill, setIsUnprintedBill] = useState(false);
    const [supplierDetails, setSupplierDetails] = useState([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // --- Function to fetch the summary data ---
    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        setCurrentView('summary'); // Reset view to summary on refresh
        try {
            const response = await api.get('/suppliers/bill-status-summary');
            setSummary({
                printed: response.data.printed || [],
                unprinted: response.data.unprinted || [],
            });
        } catch (error) {
            console.error('Error fetching summary data:', error);
            setSummary({ printed: [], unprinted: [] });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- Initial Fetch ---
    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // --- Filtering Logic ---
    const filteredPrintedItems = useMemo(() => {
        const lowerCaseSearch = printedSearchTerm.toLowerCase();
        return summary.printed.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch) ||
            (item.supplier_bill_no && item.supplier_bill_no.toLowerCase().includes(lowerCaseSearch))
        );
    }, [printedSearchTerm, summary.printed]);

    const filteredUnprintedItems = useMemo(() => {
        const lowerCaseSearch = unprintedSearchTerm.toLowerCase();
        return summary.unprinted.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch)
        );
    }, [unprintedSearchTerm, summary.unprinted]);

    // filteredProfitReport (REMOVED)

    // --- Handle Unprinted Bill Click ---
    const handleUnprintedBillClick = async (supplierCode, billNo) => {
        setSelectedSupplier(supplierCode);
        setSelectedBillNo(billNo);
        setIsUnprintedBill(true);
        setSupplierDetails([]);
        setIsDetailsLoading(true);

        try {
            const response = await api.get(`/suppliers/${supplierCode}/unprinted-details`);
            setSupplierDetails(response.data);
        } catch (error) {
            console.error(`Error fetching unprinted details for ${supplierCode}:`, error);
        } finally {
            setIsDetailsLoading(false);
        }
    };

    // --- Handle Printed Bill Click ---
    const handlePrintedBillClick = async (supplierCode, billNo) => {
        setSelectedSupplier(supplierCode);
        setSelectedBillNo(billNo);
        setIsUnprintedBill(false);
        setSupplierDetails([]);
        setIsDetailsLoading(true);

        try {
            const response = await api.get(`/suppliers/bill/${billNo}/details`);
            setSupplierDetails(response.data);
        } catch (error) {
            console.error(`Error fetching printed details for bill ${billNo}:`, error);
        } finally {
            setIsDetailsLoading(false);
        }
    };

    // --- Profit Report Handlers (REMOVED) ---

    // --- Function to reset details ---
    const resetDetails = () => {
        setSelectedSupplier(null);
        setSelectedBillNo(null);
        setIsUnprintedBill(false);
        setSupplierDetails([]);
        fetchSummary(); // Refresh summary after possible print action
    };

    // --- Close Profit Report View (REMOVED) ---

    // --- Helper function for details panel ---
    const formatDecimal = (value, decimals = 2) => (parseFloat(value) || 0).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    const getRowStyle = (index) => index % 2 === 0 ? { backgroundColor: '#f8f9fa' } : { backgroundColor: '#ffffff' };

    // --- CALCULATIONS for details panel ---
    const {
        totalWeight,
        totalCommission,
        amountPayable,
        itemSummaryData,
        totalPacksSum,
        totalsupplierSales,
        totalSupplierPackCost,
    } = useMemo(() => {
        let totalWeight = 0;
        let totalsupplierSales = 0;
        let totalCommission = 0;
        let totalPacksSum = 0;
        let totalSupplierPackCost = 0;

        const itemSummary = {};

        supplierDetails.forEach(record => {
            const weight = parseFloat(record.weight) || 0;
            const commission = parseFloat(record.commission_amount) || 0;
            const packs = parseInt(record.packs) || 0;
            // const SupplierPricePerKg = parseFloat(record.SupplierPricePerKg) || 0;
            const SupplierTotal = parseFloat(record.SupplierTotal) || 0;
            const itemName = record.item_name || 'Unknown Item';
            const SupplierPackCost = parseFloat(record.SupplierPackCost) || 0;

            totalWeight += weight;
            totalsupplierSales += SupplierTotal;
            totalCommission += commission;
            totalPacksSum += packs;
            totalSupplierPackCost += SupplierPackCost;

            if (!itemSummary[itemName]) {
                itemSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
            }
            itemSummary[itemName].totalWeight += weight;
            itemSummary[itemName].totalPacks += packs;
        });

        const finalAmountPayable = totalsupplierSales - totalCommission;

        return {
            totalWeight,
            totalCommission,
            amountPayable: finalAmountPayable,
            itemSummaryData: itemSummary,
            totalPacksSum,
            totalsupplierSales,
            totalSupplierPackCost,
        };
    }, [supplierDetails]);

    // --- BILL CONTENT GENERATION ---
    const getBillContent = useCallback((currentBillNo) => {
        const date = new Date().toLocaleDateString('si-LK');
        const time = new Date().toLocaleTimeString('si-LK');

        const mobile = '071XXXXXXX';
        const totalPackDueCost = totalSupplierPackCost;
        const finaltotal = totalsupplierSales + totalPackDueCost;

        const itemSummaryKeys = Object.keys(itemSummaryData);
        const itemSummaryHtml = itemSummaryKeys.map(itemName => {
            const sum = itemSummaryData[itemName];
            return `
                <tr>
                    <td style="width: 50%;">${itemName}</td>
                    <td style="width: 50%; text-align: right;">${sum.totalPacks} / ${sum.totalWeight.toFixed(3)}kg</td>
                </tr>
            `;
        }).join('');

        const detailedItemsHtml = supplierDetails.map(record => {
            const weight = parseFloat(record.weight) || 0;
            const packs = parseInt(record.packs) || 0;
            const SupplierPricePerKg = parseFloat(record.SupplierPricePerKg) || 0;
            const SupplierTotal = parseFloat(record.SupplierTotal) || 0;
            const itemName = record.item_name || 'Unknown Item';

            return `
                <tr style="font-size: 1.1em;">
                    <td style="text-align:left;padding:3px;border-bottom:1px solid #eee;">
                        <span style="font-weight: bold;">${itemName}</span><br>${packs}
                    </td>
                    <td style="text-align:center;padding:3px;border-bottom:1px solid #eee;"><br>${weight.toFixed(3)}</td>
                    <td style="text-align:center;padding:3px;border-bottom:1px solid #eee;"><br>${SupplierPricePerKg.toFixed(2)}</td>
                    <td style="text-align:right;padding:3px;border-bottom:1px solid #eee;">
                        <span style="font-weight: bold; font-size: 0.9em;">${record.customer_code?.toUpperCase() || ''}</span><br>${SupplierTotal.toFixed(2)}
                    </td>
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
            <tr><td>බිල් අංකය : <strong>${currentBillNo || 'N/A'}</strong></td><td style="text-align:right;"><strong style="font-size:2.0em;">${selectedSupplier?.toUpperCase() || ''}</strong></td></tr>
        </table>
    </div>
    <hr style="border:1px solid #000;margin:5px 0;opacity:1;">
    <table style="width:100%;font-size:9px;border-collapse:collapse;">
        <thead style="font-size:1.8em;">
            <tr><th style="text-align:left;padding:2px;">වර්ගය<br>මලු</th><th style="padding:2px;">කිලෝ</th><th style="padding:2px;">මිල</th><th style="text-align:right;padding:2px;">අගය</th></tr>
        </thead>
        <tbody>
            <tr><td colspan="4"><hr style="border:1px solid #000;margin:5px 0;opacity:1;"></td></tr>
            ${detailedItemsHtml}
            <tr><td colspan="4"><hr style="border:1px solid #000;margin:5px 0;opacity:1;"></td></tr>
            <tr><td colspan="2" style="text-align:left;font-weight:bold;font-size:1.8em;">${totalPacksSum}</td><td colspan="2" style="text-align:right;font-weight:bold;font-size:1.5em;">${totalsupplierSales.toFixed(2)}</td></tr>
        </tbody>
    </table>
    <table style="width:100%;font-size:15px;border-collapse:collapse;">
        <tr><td>කුලිය:</td><td style="text-align:right;font-weight:bold;">${totalPackDueCost.toFixed(2)}</td></tr>
        <tr><td>අගය:</td><td style="text-align:right;font-weight:bold;"><span style="display:inline-block; border-top:1px solid #000; border-bottom:3px double #000; padding:2px 4px; min-width:80px; text-align:right; font-size:1.5em;">${(finaltotal).toFixed(2)}</span></td></tr>
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
    }, [selectedSupplier, supplierDetails, totalPacksSum, totalsupplierSales, totalSupplierPackCost, itemSummaryData]);

    // --- Print function ---
    const handlePrint = useCallback(async () => {
        if (!supplierDetails || supplierDetails.length === 0) {
            console.log('Cannot print: No details available.');
            return;
        }

        let finalBillNo = selectedBillNo;

        if (isUnprintedBill) {
            setIsDetailsLoading(true);
            try {
                const billResponse = await api.get('/generate-f-series-bill');
                finalBillNo = billResponse.data.new_bill_no;
                setSelectedBillNo(finalBillNo);
            } catch (err) {
                console.error('Error generating bill number:', err);
                setIsDetailsLoading(false);
                alert('Failed to generate a new bill number. Print cancelled.');
                return;
            } finally {
                setIsDetailsLoading(false);
            }
        } else {
            const confirmPrint = window.confirm(`This bill (${selectedBillNo}) has already been marked as printed. Do you want to print a copy?`);
            if (!confirmPrint) {
                return;
            }
        }

        const content = getBillContent(finalBillNo);
        const printWindow = window.open('', '_blank', 'height=600,width=800');

        if (printWindow) {
            printWindow.document.write('<html><head><title>Bill Print</title>');
            printWindow.document.write(`<style>body { font-family: sans-serif; margin: 0; padding: 0; }.receipt-container { width: 80mm; padding: 5px; margin: 0 auto; }@media print { body { margin: 0; } }</style>`);
            printWindow.document.write('</head><body>');
            printWindow.document.write(content);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();

            printWindow.print();

            if (isUnprintedBill) {
                const transactionIds = supplierDetails.map(record => record.id).filter(id => id);
                if (transactionIds.length > 0 && finalBillNo && finalBillNo !== 'N/A') {
                    try {
                        const payload = {
                            bill_no: finalBillNo,
                            transaction_ids: transactionIds,
                        };
                        setTimeout(async () => {
                            await api.post('/suppliers/mark-as-printed', payload);
                            resetDetails(); // Refresh and clear
                        }, 50);
                    } catch (err) {
                        console.error('❌ Failed to mark supplier records as printed:', err);
                        alert(`Warning: Bill generated (${finalBillNo}) but failed to mark records as printed.`);
                    }
                }
            }
        } else {
            alert("Please allow pop-ups to print the bill.");
        }
    }, [supplierDetails, selectedBillNo, isUnprintedBill, getBillContent, resetDetails]);

    // --- Keyboard event listener ---
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'F4' || event.keyCode === 115) {
                event.preventDefault();
                if (supplierDetails && supplierDetails.length > 0 && !isDetailsLoading) {
                    handlePrint();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [supplierDetails, handlePrint, isDetailsLoading]);

    // Helper component for rendering supplier codes (kept identical)
    const SupplierCodeList = ({ items, type, searchTerm }) => {
        const groupedItems = useMemo(() => {
            return items.reduce((acc, item) => {
                const { supplier_code, supplier_bill_no } = item;

                if (!acc[supplier_code]) {
                    acc[supplier_code] = [];
                }
                if (type === 'printed' && supplier_bill_no) {
                    acc[supplier_code].push(supplier_bill_no);
                } else if (type === 'unprinted' && !acc[supplier_code].includes(supplier_code)) {
                    acc[supplier_code].push(supplier_code);
                }
                return acc;
            }, {});
        }, [items, type]);

        const supplierCodes = Object.keys(groupedItems);

        const buttonBaseStyle = {
            width: '100%',
            display: 'inline-block',
            textAlign: 'left',
            padding: '10px 15px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            border: 'none',
            transition: 'background-color 0.2s, transform 0.1s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            fontSize: '1rem',
            marginBottom: '4px',
            boxSizing: 'border-box',
        };

        const printedButtonStyle = {
            ...buttonBaseStyle,
            backgroundColor: '#1E88E5',
            color: 'white',
        };

        const unprintedButtonStyle = {
            ...buttonBaseStyle,
            backgroundColor: '#FF7043',
            color: 'white',
        };

        const buttonStyle = type === 'printed' ? printedButtonStyle : unprintedButtonStyle;

        const groupContainerStyle = {
            marginBottom: '4px',
            padding: '0px',
            border: 'none',
            borderRadius: '0px',
            backgroundColor: 'transparent',
            width: '100%',
            boxSizing: 'border-box',
        };

        if (items.length === 0) {
            return (
                <p style={{ color: '#6c757d', padding: '10px' }}>
                    {searchTerm ? `No results found for "${searchTerm}"` : 'No suppliers in this category.'}
                </p>
            );
        }

        return (
            <div style={listContainerStyle}>
                {supplierCodes.map(supplierCode => (
                    <div key={supplierCode} style={groupContainerStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {groupedItems[supplierCode].map(billIdentifier => (
                                <button
                                    key={billIdentifier}
                                    onClick={() => type === 'printed'
                                        ? handlePrintedBillClick(supplierCode, billIdentifier)
                                        : handleUnprintedBillClick(supplierCode, null)
                                    }
                                    style={buttonStyle}
                                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <span style={{ display: "block", textAlign: "left", fontSize: "15px", fontWeight: "600" }}>
                                        {type === 'printed'
                                            ? `${supplierCode}-${billIdentifier}`
                                            : `${supplierCode}`
                                        }
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // --- ALWAYS DISPLAYED DETAILS PANEL (INLINED STRUCTURE) ---
    const renderDetailsPanel = () => {
        // Panel styles
        const panelContainerStyle = {
            backgroundColor: '#ffffff',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '100%',
            maxHeight: 'calc(100vh - 60px)',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            fontFamily: 'Roboto, Arial, sans-serif',
            border: selectedSupplier ? '3px solid #007bff' : '3px dashed #6c757d',
            marginTop: '-90px',
            // FIX: Set a fixed width and remove the negative margin
            width: '900px',    
            minHeight: '550px',
            marginLeft: '0',    
        };

        const headerStyle = {
            color: '#007bff',
            borderBottom: '2px solid #e9ecef',
            paddingBottom: '10px',
            marginTop: '0',
            marginBottom: '20px',
            fontSize: '1.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        };

        const supplierCodeBadgeStyle = {
            backgroundColor: selectedSupplier ? '#28a745' : '#6c757d',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: 'bold',
        };

        const tableContainerStyle = {
            marginTop: '20px',
            overflowX: 'auto',
        };

        const tableStyle = {
            width: '100%', // Use 100% to fill the now larger container
            borderCollapse: 'collapse',
            minWidth: '700px',
            fontSize: '0.9rem',
            marginBottom: '30px',
        };


        const thStyle = {
            backgroundColor: '#007bff',
            color: 'white',
            fontWeight: '600',
            padding: '12px 15px',
            textAlign: 'left',
            position: 'sticky',
            top: '0',
            zIndex: 10,
        };

        const tdStyle = {
            padding: '12px 15px',
            textAlign: 'left',
            borderBottom: '1px solid #dee2e6',
            whiteSpace: 'nowrap',
        };

        // Render empty content block
        const renderEmptyContent = () => (
            <div style={{ textAlign: 'center', color: '#6c757d', fontStyle: 'italic', padding: '50px 0', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 style={{ color: '#343a40', fontSize: '2rem', marginBottom: '20px' }}>Select a Bill to View Details</h2>
                <p style={{ fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
                    Click on any **Supplier Code** or **Bill Number** from the side panels to populate this detail view.
                </p>
            </div>
        );


        // Render data rows when available
        const renderDataRows = () => (
            <tbody>
                {supplierDetails.map((record, index) => (
                    <tr
                        key={record.id || index}
                        style={getRowStyle(index)}
                    >
                        <td style={tdStyle}>{record.Date}</td>
                        <td style={tdStyle}>{record.supplier_bill_no || selectedBillNo}</td>
                        <td style={tdStyle}>{record.customer_code}</td>
                        <td style={tdStyle}><strong>{record.item_name}</strong></td>
                        <td style={tdStyle}>{record.packs}</td>
                        <td style={tdStyle}>{formatDecimal(record.weight, 3)}</td>
                        <td style={tdStyle}>{formatDecimal(record.SupplierPricePerKg)}</td>
                        <td style={tdStyle}>{formatDecimal(record.SupplierTotal)}</td>
                        <td style={tdStyle}>{formatDecimal(record.commission_amount)}</td>
                        <td style={tdStyle}>{formatDecimal(parseFloat(record.SupplierTotal) - parseFloat(record.commission_amount))}</td>
                    </tr>
                ))}
                <tr style={{ ...getRowStyle(supplierDetails.length), fontWeight: 'bold', borderTop: '2px solid #000' }}>
                    <td style={tdStyle} colSpan="4"><strong>TOTALS</strong></td>
                    <td style={tdStyle}>{totalPacksSum}</td>
                    <td style={tdStyle}>{formatDecimal(totalWeight, 3)}</td>
                    <td style={tdStyle}>-</td>
                    <td style={tdStyle}>{formatDecimal(totalsupplierSales)}</td>
                    <td style={tdStyle}>{formatDecimal(totalCommission)}</td>
                    <td style={{ ...tdStyle, fontSize: '1.1em', color: '#17a2b8' }}>{formatDecimal(amountPayable)}</td>
                </tr>
            </tbody>
        );


        // Item Summary Component
        const ItemSummary = ({ summaryData }) => {
            const itemNames = Object.keys(summaryData);
            if (itemNames.length === 0) return null;

            const itemSummaryHeaderStyle = {
                marginTop: '30px',
                fontSize: '1.5rem',
                color: '#495057',
                borderBottom: '1px dashed #dee2e6',
                paddingBottom: '10px',
                marginBottom: '15px',
            };
            const itemSummaryTableStyle = {
                width: '100%',
                borderCollapse: 'collapse',
                 marginTop: '0px',
            };
            const itemSummaryThStyle = {
                ...thStyle,
                backgroundColor: '#6c757d',
                padding: '10px 15px',
                fontSize: '0.95rem',
            };
            const itemSummaryTdStyle = {
                ...tdStyle,
                padding: '10px 15px',
            };


            return (
                <div>
                   
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

        const printButtonStyle = {
            padding: '10px 20px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            backgroundColor: '#ffc107',
            color: '#343a40',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '20px',
            transition: 'background-color 0.2s',
            opacity: selectedSupplier ? 1 : 0.5,
        };

        return (
            <div style={panelContainerStyle}>

                {/* Clear/Back Button */}



                {/* Supplier Code in Header */}
                <div style={headerStyle}>
                    <h2 style={{ fontSize: "1.5rem" }}>
                        Transaction Details (Bill No: <strong>{selectedBillNo}</strong>)
                    </h2>

                    <span style={supplierCodeBadgeStyle}>
                        {selectedSupplier || 'NO DATA'}
                    </span>
                </div>

                {/* Detailed Table */}
                <div style={tableContainerStyle}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Bill No</th>
                                <th style={thStyle}>Cus</th>
                                <th style={thStyle}>Item</th>
                                <th style={thStyle}>Packs</th>
                                <th style={thStyle}>Weight</th>
                                <th style={thStyle}>Price/kg</th>
                                <th style={thStyle}>Gross Total</th>
                                <th style={thStyle}>Comm</th>
                                <th style={thStyle}>NetPay</th>
                            </tr>
                        </thead>
                        {selectedSupplier && supplierDetails.length > 0 ? renderDataRows() : <tbody><tr><td colSpan="10" style={{ padding: 0 }}>{renderEmptyContent()}</td></tr></tbody>}
                    </table>
                </div>

                {/* Item Summary (only when data exists) */}
                {selectedSupplier && Object.keys(itemSummaryData).length > 0 && (
                    <ItemSummary summaryData={itemSummaryData} />
                )}

                {/* Print Button */}
                <div style={{ textAlign: 'center' }}>
                    <button
                        style={printButtonStyle}
                        onClick={handlePrint}
                        onMouseOver={e => selectedSupplier && (e.currentTarget.style.backgroundColor = '#e0a800')}
                        onMouseOut={e => selectedSupplier && (e.currentTarget.style.backgroundColor = '#ffc107')}
                        disabled={!selectedSupplier || isDetailsLoading || supplierDetails.length === 0}
                    >
                        🖨️ {isDetailsLoading
                            ? 'Processing...'
                            : (selectedSupplier
                                ? (isUnprintedBill ? `Print & Finalize Bill (F4)` : `Print Copy (F4)`)
                                : 'Select a Bill First')}
                    </button>
                </div>
            </div>
        );
    };

    // --- Central Content Renderer ---
    const renderCenterContent = () => {
        // Profit Report Logic (Removed)

        // Always show the details panel (empty or with data)
        return renderDetailsPanel();
    };

    if (isLoading) return <div style={loadingStyle}>Loading Supplier Report...</div>;

    return (
        <div style={reportContainerStyle}>
            <header style={headerContainerStyle}>

            </header>

            <div style={sectionsContainerStyle}>
                {/* --- Left Section: Printed Bills --- */}
                <div style={printedContainerStyle}>
                    <div style={printedSectionStyle}>
                        <h2 style={printedHeaderStyle}> Printed Bills  </h2>
                        <input
                            type="text"
                            placeholder="🔍 Search Printed Codes/Bills..."
                            value={printedSearchTerm}
                            onChange={(e) => setPrintedSearchTerm(e.target.value)}
                            style={{ ...searchBarStyle, marginBottom: '20px', height: '22px' }}
                        />
                        <SupplierCodeList items={filteredPrintedItems} type="printed" searchTerm={printedSearchTerm} />
                    </div>
                </div>

                {/* --- Center Section: Always Displayed Details Panel --- */}
                <div style={centerPanelContainerStyle}>
                    {renderCenterContent()}
                </div>

                {/* --- Right Section: Unprinted Bills --- */}
                <div style={unprintedContainerStyle}>
                    <div style={unprintedSectionStyle}>
                        <h2 style={unprintedHeaderStyle}> Unprinted Bills  </h2>
                        <input
                            type="text"
                            placeholder="🔍 Search Unprinted Codes/Bills..."
                            value={unprintedSearchTerm}
                            onChange={(e) => setUnprintedSearchTerm(e.target.value)}
                            style={{ ...searchBarStyle, marginBottom: '20px', height: '22px' }}
                        />
                        <SupplierCodeList items={filteredUnprintedItems} type="unprinted" searchTerm={unprintedSearchTerm} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- STYLES (Center width maximized and fixed for consistent layout) ---

const reportContainerStyle = {
    minHeight: '100vh',
    padding: '0 50px 50px 50px',
    fontFamily: 'Roboto, Arial, sans-serif',
    boxSizing: 'border-box',
    backgroundColor: '#99ff99',
};

const headerContainerStyle = {
    padding: '40px 0 30px 0',
    borderBottom: '1px solid #E0E0E0',
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: '#99ff99',
};

const headerStyle = {
    textAlign: 'left',
    color: '#343a40',
    marginBottom: '5px',
    fontSize: '2.8rem',
    fontWeight: '300',
};

const searchBarStyle = {
    width: '100%',
    padding: '12px 15px',
    fontSize: '1rem',
    borderRadius: '6px',
    border: '1px solid #E0E0E0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    backgroundColor: 'white',
};

const sectionsContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    // ADJUSTED: Tighter gap
    gap: '20px',
};

const printedContainerStyle = {
    // ADJUSTED: Set explicit width
    width: '200px',
    flexShrink: 0,
    // ADJUSTED: Refined negative margin
    marginLeft: '-45px',
    marginTop: '-95px',
};

const unprintedContainerStyle = {
    // ADJUSTED: Set explicit width
    width: '140px',
    flexShrink: 0,
    // ADJUSTED: Refined negative margin
    marginRight: '-45px',
    marginTop: '-95px',
    marginLeft: '0',
};


const centerPanelContainerStyle = {
    // ADJUSTED: Increased flex-grow for more available space
    flex: '3',
    minWidth: '700px',
    display: 'flex',
    // FIX: Center the content horizontally within this container
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: '0',
    width: 'auto',
};

const baseSectionStyle = {
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 210px)',
};

const printedSectionStyle = {
    ...baseSectionStyle,
    backgroundColor: '#E6FFE6',
    borderLeft: '5px solid #1E88E5',
    minHeight: '550px',
};

const unprintedSectionStyle = {
    ...baseSectionStyle,
    backgroundColor: '#FFEBE6',
    borderLeft: '5px solid #FF7043',
    minHeight: '550px',
};

const printedHeaderStyle = {
    color: '#1E88E5',
    marginBottom: '15px',
    borderBottom: '2px solid #1E88E530',
    paddingBottom: '10px',
    flexShrink: 0,
    fontSize: '1.3rem',
};

const unprintedHeaderStyle = {
    color: '#FF7043',
    marginBottom: '15px',
    borderBottom: '2px solid #FF704330',
    paddingBottom: '10px',
    flexShrink: 0,
    fontSize: '1.3rem',
};

const listContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
    marginTop: '5px',
    overflowY: 'auto',
    padding: '5px',
    flexGrow: 1,
    alignItems: 'flex-start',
    height: '900px',
};

const loadingStyle = {
    textAlign: 'center',
    padding: '50px',
    fontSize: '1.5rem',
    color: '#1E88E5',
    backgroundColor: '#99ff99',
};

// Profit Report Styles (Removed)
// ...

export default SupplierReport;