// src/components/Suppliers/SupplierReport.jsx (FIXED LAYOUT)

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

    // --- BILL CONTENT GENERATION (UPDATED WITH PROPER ALIGNMENT) ---
    const getBillContent = useCallback((currentBillNo) => {
        const date = new Date().toLocaleDateString('si-LK');
        const time = new Date().toLocaleTimeString('si-LK');
        const mobile = '071XXXXXXX';
        const totalPackDueCost = totalSupplierPackCost;
        const finaltotal = totalsupplierSales + totalPackDueCost;
        
        const is4mm = billSize === '4mm';

        // Define column widths based on bill size
        let colGroups, itemHeader, columnCount;
        if (is4mm) {
            colGroups = `
                <colgroup>
                    <col style="width:40%;"> <col style="width:15%;"> <col style="width:15%;"> <col style="width:15%;"> <col style="width:15%;"> </colgroup>
            `;
            itemHeader = 'වර්ගය (මලු)';
            columnCount = 5;
        } else {
            colGroups = `
                <colgroup>
                    <col style="width:35%;"> <col style="width:15%;"> <col style="width:15%;"> <col style="width:20%;"> <col style="width:15%;"> </colgroup>
            `;
            itemHeader = 'වර්ගය';
            columnCount = 5;
        }

        
const itemSummaryKeys = Object.keys(itemSummaryData);

const itemSummaryHtml = itemSummaryKeys
    .reduce((rows, itemName, index) => {
        if (index % 2 === 0) rows.push([]);
        rows[rows.length - 1].push(itemName);
        return rows;
    }, [])
    .map(itemGroup => `
        <tr style="font-size:10px;">
            <td style="width:50%; padding:2px; text-align:left; white-space:nowrap;">
                ${itemGroup[0]
                    ? `${itemGroup[0]} (${itemSummaryData[itemGroup[0]].totalPacks}/${itemSummaryData[itemGroup[0]].totalWeight.toFixed(3)}kg)`
                    : ''}
            </td>
            <td style="width:50%; padding:2px; text-align:right; white-space:nowrap;">
                ${itemGroup[1]
                    ? `${itemGroup[1]} (${itemSummaryData[itemGroup[1]].totalPacks}/${itemSummaryData[itemGroup[1]].totalWeight.toFixed(3)}kg)`
                    : ''}
            </td>
        </tr>
    `)
    .join('');



        // Detailed Items HTML with bill size support
        const detailedItemsHtml = supplierDetails.map(record => {
            const weight = parseFloat(record.weight) || 0;
            const packs = parseInt(record.packs) || 0;
            const SupplierPricePerKg = parseFloat(record.SupplierPricePerKg) || 0;
            const SupplierTotal = parseFloat(record.SupplierTotal) || 0;
            const itemName = record.item_name || 'Unknown Item';
            const customerCode = record.customer_code?.toUpperCase() || '';

            if (is4mm) {
                return `
                    <tr>
                        <td style="text-align:left; padding:2px 4px; border-bottom:1px solid #eee;">
                            <strong>${itemName}</strong> (${packs})
                        </td>
                        <td style="text-align:center; padding:2px 4px; border-bottom:1px solid #eee;">${weight.toFixed(3)}</td>
                        <td style="text-align:center; padding:2px 4px; border-bottom:1px solid #eee;">${SupplierPricePerKg.toFixed(2)}</td>
                        <td style="text-align:right; padding:2px 4px; border-bottom:1px solid #eee;">${SupplierTotal.toFixed(2)}</td>
                        <td style="text-align:right; padding:2px 4px; border-bottom:1px solid #eee; font-size:0.8em;">${customerCode}</td>
                    </tr>
                `;
            } else {
                return `
                    <tr>
                        <td style="text-align:left; padding:2px 4px; border-bottom:1px solid #eee; vertical-align:top;">
                            <strong>${itemName}</strong><br>${packs}
                        </td>
                        <td style="text-align:center; padding:2px 4px; border-bottom:1px solid #eee; vertical-align:top;">${weight.toFixed(3)}</td>
                        <td style="text-align:center; padding:2px 4px; border-bottom:1px solid #eee; vertical-align:top;">${SupplierPricePerKg.toFixed(2)}</td>
                        <td style="text-align:right; padding:2px 4px; border-bottom:1px solid #eee; vertical-align:top;">${SupplierTotal.toFixed(2)}</td>
                        <td style="text-align:right; padding:2px 4px; border-bottom:1px solid #eee; vertical-align:top; font-size:0.8em;">${customerCode}</td>
                    </tr>
                `;
            }
        }).join('');

        const fontSizeHeader = is4mm ? '1.3em' : '1.5em';
        const fontSizeTitle = is4mm ? '1.1em' : '1.3em';
        const fontSizeTable = is4mm ? '8px' : '9px';
        const fontSizeTotal = is4mm ? '9px' : '10px';
        const fontSizeHeaderRow = is4mm ? '0.9em' : '1em';
        const maxWidth = is4mm ? '320px' : '300px';

        return `
        <div class="receipt-container" style="width:100%; max-width:${maxWidth}; margin:0 auto; padding:3px; font-family:'Courier New', monospace;">
            <div style="text-align:center; margin-bottom:5px;">
                <h3 style="font-size:${fontSizeHeader}; margin:0 0 2px 0; font-weight:bold;">NVDS</h3>
            </div>

            <div style="margin-bottom:5px;">
                <table style="width:100%; font-size:8px; border-collapse:collapse;">
                    <tr>
                        <td>දිනය : ${date}</td>
                        <td style="text-align:right;">${time}</td>
                    </tr>
                    <tr>
                        <td colspan="2">දුර : ${mobile}</td>
                    </tr>
                    <tr>
                        <td>බිල් අංකය : <strong>${currentBillNo || 'N/A'}</strong></td>
                        <td style="text-align:right;"><strong style="font-size:${fontSizeTitle};">${selectedSupplier?.toUpperCase() || ''}</strong></td>
                    </tr>
                </table>
            </div>

            <hr style="border:1px solid #000; margin:3px 0;">

            <table style="width:100%; font-size:${fontSizeTable}; border-collapse:collapse; table-layout:fixed;">
                ${colGroups}
                <thead>
                    <tr style="font-size:${fontSizeHeaderRow}; font-weight:bold;">
                        <th style="text-align:left; padding:3px 4px; border-bottom:1px solid #000;">${itemHeader}</th>
                        <th style="text-align:center; padding:3px 4px; border-bottom:1px solid #000;">කිලෝ</th>
                        <th style="text-align:center; padding:3px 4px; border-bottom:1px solid #000;">මිල</th>
                        <th style="text-align:right; padding:3px 4px; border-bottom:1px solid #000;">අගය</th>
                        <th style="text-align:right; padding:3px 4px; border-bottom:1px solid #000;">කේතය</th>
                    </tr>
                </thead>
                <tbody>
                    ${detailedItemsHtml}
                    <tr style="border-top:1px solid #000;">
                        <td colspan="2" style="text-align:left; padding:4px; font-weight:bold;">${totalPacksSum}</td>
                        <td colspan="3" style="text-align:right; padding:4px; font-weight:bold;">${totalsupplierSales.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <table style="width:100%; font-size:${fontSizeTotal}; border-collapse:collapse; margin-top:5px;">
                <tr>
                    <td style="text-align:left; padding:2px 0;">කුලිය:</td>
                    <td style="text-align:right; padding:2px 0; font-weight:bold;">${totalPackDueCost.toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="text-align:left; padding:2px 0;">අගය:</td>
                    <td style="text-align:right; padding:2px 0; font-weight:bold;">
                        <span style="display:inline-block; border-top:1px solid #000; border-bottom:2px double #000; padding:2px 4px; text-align:right; font-size:${is4mm ? '1em' : '1.1em'};">
                            ${finaltotal.toFixed(2)}
                        </span>
                    </td>
                </tr>
            </table>

            <div style="font-size:8px; margin-top:8px; padding-top:5px; border-top:1px dashed #000;">
                <table style="width:100%; border-collapse:collapse;">
                    ${itemSummaryHtml}
                </table>
            </div>

            <hr style="border:1px solid #000; margin:5px 0;">

            <div style="text-align:center; font-size:8px; margin-top:8px;">
                <p style="margin:2px 0;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p>
                <p style="margin:2px 0;">නැවත භාර ගනු නොලැබේ</p>
            </div>
        </div>
        `;
    }, [selectedSupplier, supplierDetails, totalPacksSum, totalsupplierSales, totalSupplierPackCost, itemSummaryData, billSize]);

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
                    {searchTerm ? `No results found for "${searchTerm}"` : 'No suppliers in this category.'}
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
                <h2 style={{ color: '#343a40', fontSize: '2rem', marginBottom: '20px' }}>Select a Bill to View Details</h2>
                <p style={{ fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
                    Click on any **Supplier Code** or **Bill Number** from the side panels to populate this detail view.
                </p>
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
                <div style={headerStyle}>
                    <h2 style={{ fontSize: "1.5rem" }}>
                        Transaction Details (Bill No: <strong>{selectedBillNo}</strong>)
                    </h2>
                    <span style={supplierCodeBadgeStyle}>
                        {selectedSupplier || 'NO DATA'}
                    </span>
                </div>

                <div style={tableContainerStyle}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Bill No</th>
                                <th style={thStyle}>Cus</th>
                                <th style={thStyle}>Item</th>
                                <th style={thStyle}>Packs</th>
                                <th style={thStyle}>Weight</th>
                                <th style={thStyle}>CusPrice/kg</th>
                                <th style={thStyle}>SupPrice/kg</th>
                                <th style={thStyle}>Cus Gross Total</th>
                                <th style={thStyle}>Sup Gross Total</th>
                                <th style={thStyle}>Comm</th>
                               
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
        backgroundColor: '#99ff99',
    };

    if (isLoading) return <div style={loadingStyle}>Loading Supplier Report...</div>;

    return (
        <>
            <nav style={navBarStyle}>
                <h1 style={navTitleStyle}>Supplier Report</h1>
                <div style={navControlsStyle}>
                    <button
                        style={billSizeSelectorStyle}
                        onClick={() => setBillSize(billSize === '3mm' ? '4mm' : '3mm')}
                    >
                        📏 Bill Size: {billSize}
                    </button>
                    
                    <button
                        style={navButtonStyle}
                        onClick={goToSalesEntry}
                    >
                        Go to Sales Entry
                    </button>
                </div>
            </nav>

            <div style={reportContainerStyle}>
                <header style={headerContainerStyle}></header>
                <div style={sectionsContainerStyle}>
                    <div style={printedContainerStyle}>
                        <div style={printedSectionStyle}>
                            <h2 style={{...printedHeaderStyle, padding: '0 25px 10px 25px', marginBottom: '15px'}}> Printed Bills </h2>
                            <input
                                type="text"
                                placeholder="🔍 Search Printed..."
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
                            <h2 style={{...unprintedHeaderStyle, padding: '0 25px 10px 25px', marginBottom: '15px'}}> Unprinted Bills </h2>
                            <input
                                type="text"
                                placeholder="🔍 Search Unprinted..."
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

const headerContainerStyle = { padding: '40px 0 30px 0', borderBottom: '1px solid #E0E0E0', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: '#99ff99' };
const searchBarStyle = { width: '100%', fontSize: '1rem', borderRadius: '6px', border: '1px solid #E0E0E0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box', backgroundColor: 'white' };
const sectionsContainerStyle = { display: 'flex', justifyContent: 'space-between', gap: '20px' };
const printedContainerStyle = { width: '200px', flexShrink: 0, marginLeft: '-45px', marginTop: '-95px' };
const unprintedContainerStyle = { width: '180px', flexShrink: 0, marginRight: '-45px', marginTop: '-95px', marginLeft: '0' };
const centerPanelContainerStyle = { flex: '3', minWidth: '700px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' };
const baseSectionStyle = { padding: '25px 0 25px 0', borderRadius: '12px', boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 210px)' };
const printedSectionStyle = { ...baseSectionStyle, backgroundColor: '#E6FFE6', borderLeft: '5px solid #1E88E5', minHeight: '550px' };
const unprintedSectionStyle = { ...baseSectionStyle, backgroundColor: '#FFEBE6', borderLeft: '5px solid #FF7043', minHeight: '550px' };
const printedHeaderStyle = { color: '#1E88E5', borderBottom: '2px solid #1E88E530', flexShrink: 0, fontSize: '1.3rem' };
const unprintedHeaderStyle = { color: '#FF7043', borderBottom: '2px solid #FF704330', flexShrink: 0, fontSize: '1.3rem' };
const listContainerStyle = { display: 'flex', flexDirection: 'column', gap: '0px', marginTop: '5px', overflowY: 'auto', padding: '0 5px 0 5px', flexGrow: 1, height: '900px' };
const loadingStyle = { textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: '#1E88E5', backgroundColor: '#99ff99' };

export default SupplierReport;