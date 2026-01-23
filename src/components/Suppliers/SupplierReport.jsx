/// src/components/Suppliers/SupplierReport.jsx (FIXED LAYOUT)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from "../../api";
import { useNavigate } from 'react-router-dom';

const SupplierReport = () => {
    const navigate = useNavigate();

    // State for all data
    const [summary, setSummary] = useState({ printed: [], unprinted: [] });
    const [isLoading, setIsLoading] = useState(true);

    // 🚀 NEW STATE: Bill size selector (3mm or 4mm)
    const [billSize, setBillSize] = useState('3mm');

    const [printedSearchTerm, setPrintedSearchTerm] = useState('');
    const [unprintedSearchTerm, setUnprintedSearchTerm] = useState('');

    const [currentView, setCurrentView] = useState('summary');

    // State for Details Panel
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [selectedBillNo, setSelectedBillNo] = useState(null);
    const [isUnprintedBill, setIsUnprintedBill] = useState(false);
    const [supplierDetails, setSupplierDetails] = useState([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // --- Function to fetch the summary data ---
    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        setCurrentView('summary');
        console.log("➡️ Attempting to fetch supplier summary data from backend...");
        try {
            const response = await api.get('/suppliers/bill-status-summary');

            if (response.data) {
                console.log("✅ Summary data received.");
                console.log("   - Printed count:", response.data.printed?.length || 0);
                console.log("   - Unprinted count:", response.data.unprinted?.length || 0);

                if (response.data.printed && response.data.printed.length > 0) {
                    console.log("   - Example Printed Item:", response.data.printed[0]);
                }
                if (response.data.unprinted && response.data.unprinted.length > 0) {
                    console.log("   - Example Unprinted Item:", response.data.unprinted[0]);
                }

                setSummary({
                    printed: response.data.printed || [],
                    unprinted: response.data.unprinted || [],
                });
            } else {
                console.warn("⚠️ Received empty response body or data structure from /suppliers/bill-status-summary.");
                setSummary({ printed: [], unprinted: [] });
            }

        } catch (error) {
            console.error('❌ Error fetching summary data:', error.message, error.response?.data);
            setSummary({ printed: [], unprinted: [] });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- Initial Fetch ---
    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // --- Navigation Handler ---
    const goToSalesEntry = () => {
        navigate('/sales');
    };

    // --- Filtering Logic ---
    const filteredPrintedItems = useMemo(() => {
        const lowerCaseSearch = printedSearchTerm.toLowerCase();
        const filtered = summary.printed.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch) ||
            (item.supplier_bill_no && item.supplier_bill_no.toLowerCase().includes(lowerCaseSearch))
        );
        console.log(`ℹ️ Filtered Printed Items: ${filtered.length} results.`);
        return filtered;
    }, [printedSearchTerm, summary.printed]);

    const filteredUnprintedItems = useMemo(() => {
        const lowerCaseSearch = unprintedSearchTerm.toLowerCase();
        const filtered = summary.unprinted.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch)
        );
        console.log(`ℹ️ Filtered Unprinted Items: ${filtered.length} results.`);
        return filtered;
    }, [unprintedSearchTerm, summary.unprinted]);

    // --- Handle Unprinted Bill Click ---
    const handleUnprintedBillClick = async (supplierCode, billNo) => {
        setSelectedSupplier(supplierCode);
        setSelectedBillNo(billNo);
        setIsUnprintedBill(true);
        setSupplierDetails([]);
        setIsDetailsLoading(true);

        console.log(`➡️ Fetching unprinted details for supplier: ${supplierCode}`);
        try {
            const response = await api.get(`/suppliers/${supplierCode}/unprinted-details`);
            setSupplierDetails(response.data);
            console.log(`✅ Unprinted details fetched. Records: ${response.data?.length || 0}`);
        } catch (error) {
            console.error(`❌ Error fetching unprinted details for ${supplierCode}:`, error.message, error.response?.data);
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

        console.log(`➡️ Fetching printed details for bill: ${billNo}`);
        try {
            const response = await api.get(`/suppliers/bill/${billNo}/details`);
            setSupplierDetails(response.data);
            console.log(`✅ Printed details fetched. Records: ${response.data?.length || 0}`);
        } catch (error) {
            console.error(`❌ Error fetching printed details for bill ${billNo}:`, error.message, error.response?.data);
        } finally {
            setIsDetailsLoading(false);
        }
    };

    // --- Function to reset details ---
    const resetDetails = () => {
        setSelectedSupplier(null);
        setSelectedBillNo(null);
        setIsUnprintedBill(false);
        setSupplierDetails([]);
        fetchSummary();
    };

    // --- Helper function for details panel ---
    const formatDecimal = (value, decimals = 2) => (parseFloat(value) || 0).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    const getRowStyle = (index) => index % 2 === 0 ? { backgroundColor: '#f8f9fa' } : { backgroundColor: '#ffffff' };

    // --- CALCULATIONS for details panel (UPDATED TO INCLUDE CUS GROSS TOTAL) ---
    const {
        totalWeight,
        totalCommission,
        amountPayable,
        itemSummaryData,
        totalPacksSum,
        totalsupplierSales,
        totalSupplierPackCost,
        totalCusGross, // 🚀 NEW TOTAL ADDED
    } = useMemo(() => {
        let totalWeight = 0;
        let totalsupplierSales = 0;
        let totalCommission = 0;
        let totalPacksSum = 0;
        let totalSupplierPackCost = 0;
        let totalCusGross = 0; // 🚀 INITIALIZED

        const itemSummary = {};

        supplierDetails.forEach(record => {
            const weight = parseFloat(record.weight) || 0;
            const commission = parseFloat(record.commission_amount) || 0;
            const packs = parseInt(record.packs) || 0;
            const SupplierTotal = parseFloat(record.SupplierTotal) || 0;
            const itemName = record.item_name || 'Unknown Item';
            const SupplierPackCost = parseFloat(record.SupplierPackCost) || 0;

            // Logic for Cus Gross: Total - CustomerPackLabour
            const rowCusGross = (parseFloat(record?.total) || 0) - (parseFloat(record?.CustomerPackLabour) || 0);

            totalWeight += weight;
            totalsupplierSales += SupplierTotal;
            totalCommission += commission;
            totalPacksSum += packs;
            totalSupplierPackCost += SupplierPackCost;
            totalCusGross += rowCusGross; // 🚀 ACCUMULATED

            if (!itemSummary[itemName]) {
                itemSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
            }
            itemSummary[itemName].totalWeight += weight;
            itemSummary[itemName].totalPacks += packs;
        });

        const finalAmountPayable = totalsupplierSales;

        return {
            totalWeight,
            totalCommission,
            amountPayable: finalAmountPayable,
            itemSummaryData: itemSummary,
            totalPacksSum,
            totalsupplierSales,
            totalSupplierPackCost,
            totalCusGross, // 🚀 RETURNED
        };
    }, [supplierDetails]);

    const getBillContent = useCallback((currentBillNo) => {
        const date = new Date().toLocaleDateString('si-LK');
        const time = new Date().toLocaleTimeString('si-LK');
        const mobile = '0777672838/071437115';

        // Unified Width & Font sizing (matching the previous successful bill)
        const is4Inch = billSize === '4inch';
        const receiptMaxWidth = is4Inch ? '4in' : '350px';

        const fontSizeBody = '25px';
        const fontSizeHeader = '23px';
        const fontSizeTotal = '28px';

        // Standardized 4-column structure
        const colGroups = `
        <colgroup>
            <col style="width:32%;"> 
            <col style="width:21%;">
            <col style="width:21%;">
            <col style="width:26%;">
        </colgroup>`;

        const formatNumber = (value, maxDecimals = 3) => {
            if (typeof value !== 'number' && typeof value !== 'string') return '0';
            const number = parseFloat(value);
            if (isNaN(number)) return '0';

            if (Number.isInteger(number)) {
                return number.toLocaleString('en-US');
            } else {
                const parts = number.toFixed(maxDecimals).replace(/\.?0+$/, '').split('.');
                const wholePart = parseInt(parts[0]).toLocaleString('en-US');
                return parts[1] ? `${wholePart}.${parts[1]}` : wholePart;
            }
        };

        const detailedItemsHtml = supplierDetails.map(record => {
            const weight = parseFloat(record.weight) || 0;
            const packs = parseInt(record.packs) || 0;
            const price = parseFloat(record.SupplierPricePerKg) || 0;
            const total = parseFloat(record.SupplierTotal) || 0;
            const itemName = record.item_name || '';
            const customerCode = record.customer_code?.toUpperCase() || '';

            return `
            <tr style="font-size:${fontSizeBody}; font-weight:bold; vertical-align: bottom;">
                <td style="text-align:left; padding:10px 0; white-space: nowrap;">
                    ${itemName}<br>${formatNumber(packs)}
                </td>
               <td style="text-align:right; padding:10px 2px; position: relative; left: -50px;">
  ${formatNumber(weight.toFixed(2))}
</td>

                <td style="text-align:right; padding:10px 2px; position: relative; left: -25px;">${formatNumber(price.toFixed(2))}</td>
                <td style="padding:10px 0; display:flex; flex-direction:column; align-items:flex-end;">
    
    <div style="font-size:25px; white-space:nowrap;">
        ${customerCode}
    </div>

    <div style="
        font-weight:900;
        white-space:nowrap;
    ">
        ${formatNumber(total.toFixed(2))}
    </div>

</td>
            </tr>`;
        }).join("");

        // --- UPDATED ITEM SUMMARY SECTION ---
        const summaryEntries = Object.entries(itemSummaryData);
        let itemSummaryHtml = '';

        for (let i = 0; i < summaryEntries.length; i += 2) {
            const [name1, d1] = summaryEntries[i];
            const [name2, d2] = summaryEntries[i + 1] || [null, null];

            const text1 = `${name1}:${formatNumber(d1.totalWeight)}/${formatNumber(d1.totalPacks)}`;
            const text2 = d2 ? `${name2}:${formatNumber(d2.totalWeight)}/${formatNumber(d2.totalPacks)}` : '';

            itemSummaryHtml += `
        <tr>
            <td style="padding:6px; width:50%; font-weight:bold; white-space:nowrap; font-size:14px;">${text1}</td>
            <td style="padding:6px; width:50%; font-weight:bold; white-space:nowrap; font-size:14px;">${text2}</td>
        </tr>`;
        }

        return `
    <div style="width:${receiptMaxWidth}; margin:0 auto; padding:10px; font-family:'Courier New', monospace; color:#000; background:#fff;">
        <div style="text-align:center; font-weight:bold;">
            <div style="font-size:24px;">මංජු සහ සහෝදරයෝ</div>
            
            <div style="display:flex; justify-content:center; align-items:center; gap:15px; margin:12px 0;">
                <span style="border:2.5px solid #000; padding:5px 12px; font-size:22px;">N66</span>
                <div style="font-size:18px;">ගොවියා: 
                    <span style="border:2.5px solid #000; padding:5px 10px; font-size:22px;">${selectedSupplier}</span>
                </div>
            </div>

          <div style="font-size:16px; white-space: nowrap;">
එළවළු තොග වෙළෙන්දෝ බණ්ඩාරවෙල
</div>

        </div>

        <div style="font-size:19px; margin-top:10px; padding:0 5px;">
            <div style="font-weight: bold;">දුර:${mobile}</div>
            <div style="display:flex; justify-content:space-between; margin-top:3px;">
                <span>බිල් අංකය:${currentBillNo}</span>
                <span>දිනය:${date}</span>
            </div>
        </div>

        <hr style="border:none; border-top:2.5px solid #000; margin:10px 0;">

        <table style="width:100%; border-collapse:collapse; font-size:${fontSizeBody}; table-layout: fixed;">
            ${colGroups}
            <thead>
                <tr style="border-bottom:2.5px solid #000; font-weight:bold;">
                    <th style="text-align:left; padding-bottom:8px; font-size:${fontSizeHeader};">වර්ගය<br>මලු</th>
                    <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader}; position: relative; left: -30px; top: 24px;"> කිලෝ </th>
                     <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader}; position: relative; left: -25px; top: 24px;">මිල</th>
                    <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader};">කේතය<br>අගය</th>
                </tr>
            </thead>
            <tbody>
                ${detailedItemsHtml}
            </tbody>
            <tfoot>
                <tr style="border-top:2.5px solid #000; font-weight:bold;">
                    <td style="padding-top:12px; font-size:${fontSizeTotal};">${formatNumber(totalPacksSum)}</td>
                  <td colspan="3" style="padding-top:12px; font-size:${fontSizeTotal};">
    <div style="text-align:right; float:right; white-space:nowrap;">
        ${formatNumber(totalsupplierSales.toFixed(2))}
    </div>
</td>
                </tr>
            </tfoot>
        </table>

        <table style="width:100%; margin-top:20px; font-weight:bold; font-size:22px; padding:0 5px;">
            <tr>
                <td style="font-size:20px;">මෙම බිලට ගෙවන්න:</td>
                <td style="text-align:right;">
                    <span style="border-bottom:5px double #000; border-top:2px solid #000; font-size:${fontSizeTotal}; padding:5px 10px;">
                        ${formatNumber(totalsupplierSales.toFixed(2))}
                    </span>
                </td>
            </tr>
        </table>

        <div style="margin-top:25px; border-top:1px dashed #000; padding-top:10px;">
            <table style="width:100%; border-collapse:collapse; font-size:14px; text-align:center;">
                ${itemSummaryHtml}
            </table>
        </div>

        <div style="text-align:center; margin-top:25px; font-size:13px; border-top:2.5px solid #000; padding-top:10px;">
            <p style="margin:4px 0; font-weight:bold;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p>
            <p style="margin:4px 0;">නැවත භාර ගනු නොලැබේ</p>
        </div>
    </div>`;
    }, [selectedSupplier, supplierDetails, totalPacksSum, totalsupplierSales, itemSummaryData, billSize]);

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
            printWindow.document.write(`<style>
                body { font-family: 'Courier New', monospace; margin: 0; padding: 0; }
                .receipt-container { padding: 3px; margin: 0 auto; }
                @media print { 
                    body { margin: 0; padding: 0; }
                    .receipt-container { max-width: ${billSize === '4mm' ? '320px' : '300px'} !important; }
                }
                table { table-layout: fixed; width: 100%; }
                td, th { padding: 2px 3px; }
            </style>`);
            printWindow.document.write('</head><body>');
            printWindow.document.write(content);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();

            setTimeout(() => {
                printWindow.print();
            }, 300);

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
                            resetDetails();
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
    }, [supplierDetails, selectedBillNo, isUnprintedBill, getBillContent, resetDetails, billSize]);

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

    // Helper component for rendering supplier codes
    const SupplierCodeList = ({ items, type, searchTerm }) => {
        const groupedItems = useMemo(() => {
            console.log(`ℹ️ SupplierCodeList (Type: ${type}): Processing ${items.length} items.`);
            const result = items.reduce((acc, item) => {
                const { supplier_code, supplier_bill_no } = item;

                if (!supplier_code) {
                    console.warn(`⚠️ Skipping item due to missing supplier_code:`, item);
                    return acc;
                }

                if (!acc[supplier_code]) {
                    acc[supplier_code] = [];
                }

                if (type === 'printed') {
                    if (supplier_bill_no) {
                        acc[supplier_code].push(supplier_bill_no);
                    } else {
                        console.warn(`⚠️ Printed item missing supplier_bill_no:`, item);
                    }
                } else if (type === 'unprinted') {
                    if (!acc[supplier_code].includes(supplier_code)) {
                        acc[supplier_code].push(supplier_code);
                    }
                }
                return acc;
            }, {});
            console.log(`🔍 Grouped ${type} suppliers:`, Object.keys(result).length, 'groups.');
            return result;
        }, [items, type]);

        const supplierCodes = Object.keys(groupedItems);

        const buttonBaseStyle = {
            width: '100%',
            display: 'block',
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

        const listContainerStyle = {
            display: 'flex',
            flexDirection: 'column',
            gap: '0px',
            marginTop: '5px',
            overflowY: 'auto',
            padding: '0 5px 0 5px',
            flexGrow: 1,
            height: '900px',
        };

        if (items.length === 0) {
            return (
                <p style={{ color: '#6c757d', padding: '10px' }}>
                    {searchTerm ? `No results found for "${searchTerm}"` : 'මෙම ප්‍රවර්ගයේ සැපයුම්කරු නොමැත'}
                </p>
            );
        }

        return (
            <div style={listContainerStyle}>
                {supplierCodes.map(supplierCode => (
                    <div key={supplierCode} style={groupContainerStyle}>
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
                ))}
            </div>
        );
    };

    // --- ALWAYS DISPLAYED DETAILS PANEL ---
    const renderDetailsPanel = () => {
        const panelContainerStyle = {
            backgroundColor: '#091d3d',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '100%',
            maxHeight: 'calc(100vh - 60px)',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            fontFamily: 'Roboto, Arial, sans-serif',

            marginTop: '-90px',
            width: '850px',
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
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '250px',
            fontSize: '0.7rem',
            marginBottom: '30px',
        };

        const thStyle = {
            backgroundColor: '#007bff',
            color: 'white',
            fontWeight: '600',
            padding: '6px 8px',
            textAlign: 'left',
            position: 'sticky',
            top: '0',
            zIndex: 10,
            fontSize: '0.7rem',
            whiteSpace: 'nowrap',
        };

        const tdStyle = {
            padding: '6px 8px',
            textAlign: 'left',
            borderBottom: '1px solid #dee2e6',
            whiteSpace: 'normal',
        };

        const renderEmptyContent = () => (
            <div style={{ textAlign: 'center', color: '#6c757d', fontStyle: 'italic', padding: '50px 0', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

            </div>
        );

        const renderDataRows = () => (
            <tbody>
                {supplierDetails.map((record, index) => (
                    <tr
                        key={record.id || index}
                        style={getRowStyle(index)}
                    >
                        <td style={tdStyle}>{record.bill_no || selectedBillNo}</td>
                        <td style={tdStyle}>{record.customer_code}</td>
                        <td style={tdStyle}><strong>{record.item_name}</strong></td>
                        <td style={tdStyle}>{record.packs}</td>
                        <td style={tdStyle}>{record.weight}</td>
                        <td style={tdStyle}>{record.price_per_kg}</td>
                        <td style={tdStyle}>{record.SupplierPricePerKg}</td>
                        <td style={tdStyle}>
                            {formatDecimal((record?.total || 0) - (record?.CustomerPackLabour || 0))}
                        </td>
                        <td style={tdStyle}>{record.SupplierTotal}</td>
                        <td style={tdStyle}>{record.commission_amount}</td>
                    </tr>
                ))}
                <tr style={{ ...getRowStyle(supplierDetails.length), fontWeight: 'bold', borderTop: '2px solid #000' }}>
                    <td style={tdStyle} colSpan="3"><strong>TOTALS</strong></td>
                    <td style={tdStyle}>{totalPacksSum}</td>
                    <td style={tdStyle}>{totalWeight.toFixed(3)}</td>
                    <td style={tdStyle}>-</td>
                    <td style={tdStyle}>-</td>
                    <td style={tdStyle}>{totalCusGross.toFixed(2)}</td> {/* 🚀 ADDED COLUMN TOTAL HERE */}
                    <td style={tdStyle}>{totalsupplierSales.toFixed(2)}</td>
                    <td style={tdStyle}>-</td>
                </tr>
            </tbody>
        );


        const ItemSummary = ({ summaryData }) => {
            const itemNames = Object.keys(summaryData);
            if (itemNames.length === 0) return null;

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
            const itemSummaryTableStyle = {
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '0px',
            };

            return (
                <div>
                    <table style={itemSummaryTableStyle}>
                        <thead>
                            <tr>
                                <th style={itemSummaryThStyle}>අයිතමය නම</th>
                                <th style={itemSummaryThStyle}>සම්පූර්ණ බර</th>
                                <th style={itemSummaryThStyle}>මුළු අසුරුම්</th>
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
                <div style={headerStyle}>
                    <h2 style={{ fontSize: "1.5rem", color: "white" }}>
                        ගනුදෙනු විස්තර (බිල් අංකය: <strong>{selectedBillNo}</strong>)
                    </h2>

                    <span style={supplierCodeBadgeStyle}>
                        {selectedSupplier || 'NO DATA'}
                    </span>
                </div>

                <div style={tableContainerStyle}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>බිල් අං:</th>
                                <th style={thStyle}>ගනුදෙ</th>
                                <th style={thStyle}>අයිතමය</th>
                                <th style={thStyle}>අසුරුම්</th>
                                <th style={thStyle}>බර</th>
                                <th style={thStyle}>ගනුදෙ මිල</th>
                                <th style={thStyle}>සැපයුම් මිල</th>
                                <th style={thStyle}>ගනුදෙ එකතුව</th>
                                <th style={thStyle}>සැපයුම් එකතුව</th>
                                <th style={thStyle}>කොමි</th>


                            </tr>
                        </thead>
                        {selectedSupplier && supplierDetails.length > 0 ? renderDataRows() : <tbody><tr><td colSpan="11" style={{ padding: 0 }}>{renderEmptyContent()}</td></tr></tbody>}
                    </table>
                </div>

                {selectedSupplier && Object.keys(itemSummaryData).length > 0 && (
                    <ItemSummary summaryData={itemSummaryData} />
                )}

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

    const renderCenterContent = () => {
        return renderDetailsPanel();
    };

    const navBarStyle = {
        backgroundColor: '#343a40',
        padding: '15px 50px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    };

    const navTitleStyle = {
        color: 'white',
        fontSize: '1.5rem',
        margin: 0,
    };

    const navControlsStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    };

    const billSizeSelectorStyle = {
        padding: '8px 15px',
        fontSize: '1rem',
        fontWeight: 'bold',
        backgroundColor: '#17a2b8',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    };

    const navButtonStyle = {
        padding: '10px 20px',
        fontSize: '1rem',
        fontWeight: 'bold',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    };

    const reportContainerStyle = {
        minHeight: '100vh',
        padding: '90px 50px 50px 50px',
        fontFamily: 'Roboto, Arial, sans-serif',
        boxSizing: 'border-box',
        backgroundColor: '#1ec139ff',
    };

    if (isLoading) return <div style={loadingStyle}>Loading Supplier Report...</div>;

    return (
        <>
            <nav style={navBarStyle}>
                <h1 style={navTitleStyle}>සැපයුම්කරු වාර්තාව</h1>
                <div style={navControlsStyle}>
                    <button
                        style={billSizeSelectorStyle}
                        onClick={() => setBillSize(billSize === '3mm' ? '4mm' : '3mm')}
                    >
                        බිල්පත් ප්‍රමාණය: {billSize}
                    </button>

                    <button
                        style={navButtonStyle}
                        onClick={goToSalesEntry}
                    >
                        මුල් පිටුව
                    </button>
                </div>
            </nav>

            <div style={reportContainerStyle}>
                <header style={headerContainerStyle}></header>
                <div style={sectionsContainerStyle}>
                    <div style={printedContainerStyle}>
                        <div style={printedSectionStyle}>
                            <h2 style={{ ...printedHeaderStyle, padding: '0 25px 10px 25px', marginBottom: '15px' }}> මුද්‍රණය කළ </h2>
                            <input
                                type="text"
                                placeholder="🔍 මුද්‍රිත සෙවීම..."
                                value={printedSearchTerm}
                                onChange={(e) => setPrintedSearchTerm(e.target.value)}
                                style={{ ...searchBarStyle, marginBottom: '20px', height: '22px', padding: '12px 25px' }}
                            />
                            <SupplierCodeList items={filteredPrintedItems} type="printed" searchTerm={printedSearchTerm} />
                        </div>
                    </div>

                    <div style={centerPanelContainerStyle}>
                        {renderCenterContent()}
                    </div>

                    <div style={unprintedContainerStyle}>
                        <div style={unprintedSectionStyle}>
                            <h2 style={{ ...unprintedHeaderStyle, padding: '0 25px 10px 25px', marginBottom: '15px', whiteSpace: 'nowrap' }}>මුද්‍රණය නොකළ</h2>
                            <input
                                type="text"
                                placeholder="🔍 මුද්‍රණ නොකළ සෙවීම..."
                                value={unprintedSearchTerm}
                                onChange={(e) => setUnprintedSearchTerm(e.target.value)}
                                style={{ ...searchBarStyle, marginBottom: '20px', height: '22px', padding: '12px 25px' }}
                            />
                            <SupplierCodeList items={filteredUnprintedItems} type="unprinted" searchTerm={unprintedSearchTerm} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// --- STYLES ---

const headerContainerStyle = { padding: '40px 0 30px 0', borderBottom: '1px solid #E0E0E0', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: '#1ec139ff' };
const searchBarStyle = { width: '100%', fontSize: '1rem', borderRadius: '6px', border: '1px solid #E0E0E0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box', backgroundColor: 'white' };
const sectionsContainerStyle = { display: 'flex', justifyContent: 'space-between', gap: '20px' };
const printedContainerStyle = { width: '200px', flexShrink: 0, marginLeft: '-45px', marginTop: '-95px', border: '2px solid black' };
const unprintedContainerStyle = { width: '180px', flexShrink: 0, marginRight: '-45px', marginTop: '-95px', marginLeft: '0', border: '2px solid black' };
const centerPanelContainerStyle = { flex: '3', minWidth: '700px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' };
const baseSectionStyle = { padding: '25px 0 25px 0', borderRadius: '12px', boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 210px)' };
const printedSectionStyle = { ...baseSectionStyle, backgroundColor: '#1ec139ff', borderLeft: '5px solid #FFFFFF', minHeight: '550px' };
const unprintedSectionStyle = { ...baseSectionStyle, backgroundColor: '#1ec139ff', borderLeft: '5px solid #FFFFFF', minHeight: '550px' };
const printedHeaderStyle = { color: '#07090ae6', borderBottom: '2px solid #1E88E530', flexShrink: 0, fontSize: '1.3rem' };
const unprintedHeaderStyle = { color: '#07090ae6', borderBottom: '2px solid #FF704330', flexShrink: 0, fontSize: '1.3rem' };
const listContainerStyle = { display: 'flex', flexDirection: 'column', gap: '0px', marginTop: '5px', overflowY: 'auto', padding: '0 5px 0 5px', flexGrow: 1, height: '900px' };
const loadingStyle = { textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: '#1E88E5', backgroundColor: '#1ec139ff' };

export default SupplierReport;