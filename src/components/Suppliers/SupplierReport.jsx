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
    const [profilePic, setProfilePic] = useState(null);
    // Add these with your other state variables
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [supplierDocs, setSupplierDocs] = useState({ title: '', profile: null, nic_front: null, nic_back: null });

    // State for Details Panel
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [selectedBillNo, setSelectedBillNo] = useState(null);
    const [isUnprintedBill, setIsUnprintedBill] = useState(false);
    const [supplierDetails, setSupplierDetails] = useState([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // 🚀 NEW STATE: To hold the advance amount from the suppliers table
    const [advanceAmount, setAdvanceAmount] = useState(0);

    // 🚀 NEW STATE: For the Advance Entry Form Logic
    const [advancePayload, setAdvancePayload] = useState({ code: '', advance_amount: '' });
    const [advanceLoading, setAdvanceLoading] = useState(false);
    const [advanceStatus, setAdvanceStatus] = useState({ type: '', text: '' });

    // 🚀 NEW STATE: For Editing Records
    const [editingRecord, setEditingRecord] = useState(null);
    const [newFarmerCode, setNewFarmerCode] = useState('');
    const [newCustomerCode, setNewCustomerCode] = useState('');

    // --- Function to fetch the summary data ---
    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        setCurrentView('summary');
        console.log("➡️ Attempting to fetch supplier summary data from backend...");
        try {
            const response = await api.get('/suppliers/bill-status-summary');

            if (response.data) {
                console.log("✅ Summary data received.");
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

    // 🚀 NEW: Handle Advance Entry Form Submission
    const handleAdvanceSubmit = async (e) => {
        e.preventDefault();
        setAdvanceLoading(true);
        setAdvanceStatus({ type: '', text: '' });

        try {
            const response = await api.post('/suppliers/advance', advancePayload);
            setAdvanceStatus({ type: 'success', text: `සාර්ථකයි! අත්තිකාරම් යාවත්කාලීන විය.` });

            // Immediately update the display advance amount
            setAdvanceAmount(parseFloat(response.data.data.advance_amount) || 0);
            setAdvancePayload({ ...advancePayload, advance_amount: '' });
        } catch (error) {
            console.error("Advance Update Error:", error);
            setAdvanceStatus({ type: 'error', text: 'යාවත්කාලීන කිරීම අසාර්ථක විය.' });
        } finally {
            setAdvanceLoading(false);
        }
    };

    // --- 🚀 NEW: Update Farmer Logic ---
    const handleUpdateFarmer = async () => {
        // Both are now technically optional, but we need at least one change or we just send existing values
        const finalSupplierCode = newFarmerCode || editingRecord.supplier_code;
        const finalCustomerCode = newCustomerCode || editingRecord.customer_code;

        try {
            setIsDetailsLoading(true);
            const response = await api.put(`/sales/${editingRecord.id}/update-supplier`, {
                supplier_code: finalSupplierCode,
                customer_code: finalCustomerCode
            });

            if (response.status === 200) {
                setEditingRecord(null);
                setNewFarmerCode('');
                setNewCustomerCode('');

                // Refresh current view
                if (isUnprintedBill) {
                    await handleUnprintedBillClick(selectedSupplier, null);
                } else {
                    await handlePrintedBillClick(selectedSupplier, selectedBillNo);
                }
                fetchSummary();
            }
        } catch (error) {
            console.error("Update failed:", error);
            alert("Failed to update records.");
        } finally {
            setIsDetailsLoading(false);
        }
    };
    // --- Filtering Logic ---
    const filteredPrintedItems = useMemo(() => {
        const lowerCaseSearch = printedSearchTerm.toLowerCase();
        const filtered = summary.printed.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch) ||
            (item.supplier_bill_no && item.supplier_bill_no.toLowerCase().includes(lowerCaseSearch))
        );
        return filtered;
    }, [printedSearchTerm, summary.printed]);

    const filteredUnprintedItems = useMemo(() => {
        const lowerCaseSearch = unprintedSearchTerm.toLowerCase();
        const filtered = summary.unprinted.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch)
        );
        return filtered;
    }, [unprintedSearchTerm, summary.unprinted]);

    // --- Handle Unprinted Bill Click ---
    // --- Updated: Handle Printed Bill Click ---
    const handlePrintedBillClick = async (supplierCode, billNo) => {
        setSelectedSupplier(supplierCode);
        setSelectedBillNo(billNo);
        setIsUnprintedBill(false);
        setSupplierDetails([]);
        setAdvanceAmount(0);
        setProfilePic(null);
        setAdvancePayload({ code: supplierCode, advance_amount: '' });
        setIsDetailsLoading(true);

        try {
            const response = await api.get(`/suppliers/bill/${billNo}/details`);
            setSupplierDetails(response.data);

            const supRes = await api.get(`/suppliers/search-by-code/${supplierCode}`);
            if (supRes.data) {
                setAdvanceAmount(parseFloat(supRes.data.advance_amount) || 0);
                setProfilePic(supRes.data.profile_pic);

                // 🚀 NEW: Set data for the Document Modal
                setSupplierDocs({
                    title: supRes.data.name || supplierCode,
                    profile: supRes.data.profile_pic,
                    nic_front: supRes.data.nic_front,
                    nic_back: supRes.data.nic_back
                });
            }
        } catch (error) {
            console.error(`❌ Error fetching printed details:`, error.message);
        } finally {
            setIsDetailsLoading(false);
        }
    };

    // --- Updated: Handle Unprinted Bill Click ---
    const handleUnprintedBillClick = async (supplierCode, billNo) => {
        setSelectedSupplier(supplierCode);
        setSelectedBillNo(billNo);
        setIsUnprintedBill(true);
        setSupplierDetails([]);
        setAdvanceAmount(0);
        setProfilePic(null);
        setAdvancePayload({ code: supplierCode, advance_amount: '' });
        setIsDetailsLoading(true);

        try {
            const response = await api.get(`/suppliers/${supplierCode}/unprinted-details`);
            setSupplierDetails(response.data);

            const supRes = await api.get(`/suppliers/search-by-code/${supplierCode}`);
            if (supRes.data) {
                setAdvanceAmount(parseFloat(supRes.data.advance_amount) || 0);
                setProfilePic(supRes.data.profile_pic);

                // 🚀 NEW: Set data for the Document Modal
                setSupplierDocs({
                    title: supRes.data.name || supplierCode,
                    profile: supRes.data.profile_pic,
                    nic_front: supRes.data.nic_front,
                    nic_back: supRes.data.nic_back
                });
            }
        } catch (error) {
            console.error(`❌ Error fetching unprinted details:`, error.message);
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
        setAdvanceAmount(0);
        setAdvancePayload({ code: '', advance_amount: '' });
        setProfilePic(null);
        fetchSummary();
    };

    // --- Helper function for details panel ---
    const formatDecimal = (value, decimals = 2) => (parseFloat(value) || 0).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    const getRowStyle = (index) => index % 2 === 0 ? { backgroundColor: '#f8f9fa' } : { backgroundColor: '#ffffff' };

    // --- CALCULATIONS ---
    const {
        totalWeight,
        totalCommission,
        amountPayable,
        itemSummaryData,
        totalPacksSum,
        totalsupplierSales,
        totalSupplierPackCost,
        totalCusGross,
    } = useMemo(() => {
        let totalWeight = 0, totalsupplierSales = 0, totalCommission = 0, totalPacksSum = 0, totalSupplierPackCost = 0, totalCusGross = 0;
        const itemSummary = {};

        supplierDetails.forEach(record => {
            const weight = parseFloat(record.weight) || 0;
            const commission = parseFloat(record.commission_amount) || 0;
            const packs = parseInt(record.packs) || 0;
            const SupplierTotal = parseFloat(record.SupplierTotal) || 0;
            const itemName = record.item_name || 'Unknown Item';
            const rowCusGross = (parseFloat(record?.total) || 0) - (parseFloat(record?.CustomerPackLabour) || 0);

            totalWeight += weight;
            totalsupplierSales += SupplierTotal;
            totalCommission += commission;
            totalPacksSum += packs;
            totalCusGross += rowCusGross;

            if (!itemSummary[itemName]) {
                itemSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
            }
            itemSummary[itemName].totalWeight += weight;
            itemSummary[itemName].totalPacks += packs;
        });

        return {
            totalWeight, totalCommission, amountPayable: totalsupplierSales, itemSummaryData: itemSummary,
            totalPacksSum, totalsupplierSales, totalSupplierPackCost, totalCusGross,
        };
    }, [supplierDetails]);

    const getBillContent = useCallback((currentBillNo) => {
        const date = new Date().toLocaleDateString('si-LK');
        const mobile = '0777672838/071437115';
        const is4Inch = billSize === '4inch';
        const receiptMaxWidth = is4Inch ? '4in' : '350px';
        const fontSizeBody = '25px';
        const fontSizeHeader = '23px';
        const fontSizeTotal = '28px';

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
            if (Number.isInteger(number)) return number.toLocaleString('en-US');
            const parts = number.toFixed(maxDecimals).replace(/\.?0+$/, '').split('.');
            const wholePart = parseInt(parts[0]).toLocaleString('en-US');
            return parts[1] ? `${wholePart}.${parts[1]}` : wholePart;
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
                <td style="text-align:left; padding:10px 0; white-space: nowrap;">${itemName}<br>${formatNumber(packs)}</td>
                <td style="text-align:right; padding:10px 2px; position: relative; left: -70px;">${formatNumber(weight.toFixed(2))}</td>
                <td style="text-align:right; padding:10px 2px; position: relative; left: -65px;">${formatNumber(price.toFixed(2))}</td>
                <td style="padding:10px 0; display:flex; flex-direction:column; align-items:flex-end;">
                    <div style="font-size:25px; white-space:nowrap;">${customerCode}</div>
                    <div style="font-weight:900; white-space:nowrap;">${formatNumber(total.toFixed(2))}</div>
                </td>
            </tr>`;
        }).join("");

        const summaryEntries = Object.entries(itemSummaryData);
        let itemSummaryHtml = '';
        for (let i = 0; i < summaryEntries.length; i += 2) {
            const [name1, d1] = summaryEntries[i];
            const [name2, d2] = summaryEntries[i + 1] || [null, null];
            const text1 = `${name1}:${formatNumber(d1.totalWeight)}/${formatNumber(d1.totalPacks)}`;
            const text2 = d2 ? `${name2}:${formatNumber(d2.totalWeight)}/${formatNumber(d2.totalPacks)}` : '';
            itemSummaryHtml += `<tr><td style="padding:6px; width:50%; font-weight:bold; white-space:nowrap; font-size:14px;">${text1}</td><td style="padding:6px; width:50%; font-weight:bold; white-space:nowrap; font-size:14px;">${text2}</td></tr>`;
        }

        // 🚀 CALCULATION FOR FINAL NET AMOUNT
        const netPayable = totalsupplierSales - advanceAmount;

        return `
    <div style="width:${receiptMaxWidth}; margin:0 auto; padding:10px; font-family:'Courier New', monospace; color:#000; background:#fff;">
        <div style="text-align:center; font-weight:bold;">
            <div style="font-size:24px;">xxxx</div>
            <div style="display:flex; justify-content:center; align-items:center; gap:15px; margin:12px 0;">
                <span style="border:2.5px solid #000; padding:5px 12px; font-size:22px;">xx</span>
                <div style="font-size:18px;">ගොවියා: <span style="border:2.5px solid #000; padding:5px 10px; font-size:22px;">${selectedSupplier}</span></div>
            </div>
          <div style="font-size:16px; white-space: nowrap;">එළවළු තොග වෙළෙන්දෝ බණ්ඩාරවෙල</div>
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
                    <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader}; position: relative; left: -50px; top: 24px;"> කිලෝ </th>
                     <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader}; position: relative; left: -45px; top: 24px;">මිල</th>
                    <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader};">කේතය<br>අගය</th>
                </tr>
            </thead>
            <tbody>${detailedItemsHtml}</tbody>
            <tfoot>
                <tr style="border-top:2.5px solid #000; font-weight:bold;">
                    <td style="padding-top:12px; font-size:${fontSizeTotal};">${formatNumber(totalPacksSum)}</td>
                    <td colspan="3" style="padding-top:12px; font-size:${fontSizeTotal};"><div style="text-align:right; float:right; white-space:nowrap;">${(totalsupplierSales.toFixed(2))}</div></td>
                </tr>
            </tfoot>
        </table>

        <table style="width:100%; margin-top:20px; font-weight:bold; font-size:22px; padding:0 5px;">
            <tr>
              <td style="font-size:15px; white-space:nowrap; position:relative; left:-15px;">මෙම බිලට ගෙවන්න:</td>
              <td style="text-align:right;"><span style="border-bottom:5px double #000; border-top:2px solid #000; font-size:${fontSizeTotal}; padding:5px 10px; padding-left:25px;">${(totalsupplierSales.toFixed(2))}</span></td>
            </tr>
            
           <tr style="font-size:18px;">
  <td style="font-size:15px; padding-top:10px;">අත්තිකාරම්</td>
  <td style="text-align:right; padding-top:10px; color:#000;">
    - ${advanceAmount.toFixed(2)}
  </td>
</tr>

           <tr style="font-weight:900;">
  <td style="font-size:18px; padding-top:5px;">ඉතිරි ශේෂය:</td>
  <td style="text-align:right; padding-top:5px;">
    <span style="color:#000; font-size:${fontSizeTotal};">
      ${netPayable.toFixed(2)}
    </span>
  </td>
</tr>

        </table>

        <div style="margin-top:25px; border-top:1px dashed #000; padding-top:10px;"><table style="width:100%; border-collapse:collapse; font-size:14px; text-align:center;">${itemSummaryHtml}</table></div>
        <div style="text-align:center; margin-top:25px; font-size:13px; border-top:2.5px solid #000; padding-top:10px;"><p style="margin:4px 0; font-weight:bold;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p><p style="margin:4px 0;">නැවත භාර ගනු නොලැබේ</p></div>
    </div>`;
    }, [selectedSupplier, supplierDetails, totalPacksSum, totalsupplierSales, itemSummaryData, billSize, advanceAmount]);

    // --- Print function ---
    const handlePrint = useCallback(async () => {
        if (!supplierDetails || supplierDetails.length === 0) return;
        let finalBillNo = selectedBillNo;
        if (isUnprintedBill) {
            setIsDetailsLoading(true);
            try {
                const billResponse = await api.get('/generate-f-series-bill');
                finalBillNo = billResponse.data.new_bill_no;
                setSelectedBillNo(finalBillNo);
            } catch (err) { alert('Failed to generate a new bill number.'); return; }
            finally { setIsDetailsLoading(false); }
        } else {
            if (!window.confirm(`This bill (${selectedBillNo}) has already been marked as printed. Do you want to print a copy?`)) return;
        }

        const content = getBillContent(finalBillNo);
        const printWindow = window.open('', '_blank', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write(`<html><head><title>Bill Print</title><style>body { font-family: 'Courier New', monospace; margin: 0; padding: 0; } @media print { .receipt-container { max-width: ${billSize === '4mm' ? '320px' : '300px'} !important; } } table { table-layout: fixed; width: 100%; } td, th { padding: 2px 3px; }</style></head><body>${content}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 300);

            if (isUnprintedBill) {
                const transactionIds = supplierDetails.map(record => record.id).filter(id => id);
                if (transactionIds.length > 0 && finalBillNo && finalBillNo !== 'N/A') {
                    setTimeout(async () => {
                        await api.post('/suppliers/mark-as-printed', { bill_no: finalBillNo, transaction_ids: transactionIds });
                        resetDetails();
                    }, 50);
                }
            }
        }
    }, [supplierDetails, selectedBillNo, isUnprintedBill, getBillContent, resetDetails, billSize]);

    // --- Keyboard event listener ---
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'F1' || event.keyCode === 112) { event.preventDefault(); return false; }
            if ((event.key === 'F4' || event.keyCode === 115) && supplierDetails.length > 0 && !isDetailsLoading) {
                event.preventDefault();
                handlePrint();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [supplierDetails, handlePrint, isDetailsLoading]);
    //new profile pic view modal
    const renderImageModal = () => {
        if (!isImageModalOpen) return null;

        // Helper to format URLs correctly
        const formatUrl = (path) => {
            if (!path) return null;
            return path.startsWith('http') ? path : `http://localhost:8000/storage/${path}`;
        };

        const onClose = () => setIsImageModalOpen(false);

        return (
            <div
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
                onClick={onClose}
            >
                <div
                    style={{ backgroundColor: '#1f2937', borderRadius: '20px', width: '95%', maxWidth: '1000px', maxHeight: '95vh', padding: '25px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', border: '1px solid #4b5563', display: 'flex', flexDirection: 'column' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Area */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #374151', paddingBottom: '15px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                            {supplierDocs.title} - ලේඛන පරීක්ෂාව
                        </h2>
                        <button
                            onClick={onClose}
                            style={{ background: '#374151', border: 'none', color: 'white', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                        > ✕ </button>
                    </div>

                    {/* Larger Images Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: '20px', overflowY: 'auto', padding: '5px' }}>
                        {/* Profile Picture */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>ප්‍රධාන රූපය</span>
                            <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #3b82f6', backgroundColor: '#111827', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                <img src={formatUrl(supplierDocs.profile)} style={{ width: '100%', height: 'auto', display: 'block' }} alt="Profile" />
                            </div>
                        </div>

                        {/* NIC Front */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>NIC ඉදිරිපස</span>
                            <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #4b5563', backgroundColor: '#111827', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                {supplierDocs.nic_front ? (
                                    <img src={formatUrl(supplierDocs.nic_front)} style={{ width: '100%', height: 'auto', maxHeight: '500px', display: 'block', objectFit: 'contain' }} alt="NIC Front" />
                                ) : (
                                    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>ඡායාරූපයක් නොමැත</div>
                                )}
                            </div>
                        </div>

                        {/* NIC Back */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>NIC පසුපස</span>
                            <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #4b5563', backgroundColor: '#111827', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                {supplierDocs.nic_back ? (
                                    <img src={formatUrl(supplierDocs.nic_back)} style={{ width: '100%', height: 'auto', maxHeight: '500px', display: 'block', objectFit: 'contain' }} alt="NIC Back" />
                                ) : (
                                    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>ඡායාරූපයක් නොමැත</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Area */}
                    <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #374151', paddingTop: '15px' }}>
                        <button
                            onClick={onClose}
                            style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                        >Close </button>
                    </div>
                </div>
            </div>
        );
    };

    // 🚀 NEW: Edit Modal UI
    const renderEditModal = () => {
        if (!editingRecord) return null;
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                    <h3 style={{ marginTop: 0, color: '#091d3d', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>ගනුදෙනුව වෙනස් කරන්න</h3>

                    <div style={{ margin: '15px 0', fontSize: '0.9rem', color: '#666', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                        <p style={{ margin: '2px 0' }}><strong>බිල් අං:</strong> {editingRecord.bill_no || selectedBillNo}</p>
                        <p style={{ margin: '2px 0' }}><strong>අයිතමය:</strong> {editingRecord.item_name} | {editingRecord.weight} kg</p>
                    </div>

                    {/* Supplier Code Input */}
                    <div style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>නව ගොවි කේතය (Supplier - Optional):</label>
                        <input
                            type="text"
                            placeholder={editingRecord.supplier_code} // Show current code as placeholder
                            value={newFarmerCode}
                            onChange={(e) => setNewFarmerCode(e.target.value.toUpperCase())}
                            style={{ width: '100%', padding: '10px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                            autoFocus
                        />
                    </div>

                    {/* Customer Code Input */}
                    <div style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>නව ගැනුම්කරු (Customer - Optional):</label>
                        <input
                            type="text"
                            placeholder={editingRecord.customer_code} // Show current code as placeholder
                            value={newCustomerCode}
                            onChange={(e) => setNewCustomerCode(e.target.value.toUpperCase())}
                            style={{ width: '100%', padding: '10px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                        <button onClick={handleUpdateFarmer} style={{ flex: 1, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>OK</button>
                        <button onClick={() => { setEditingRecord(null); setNewFarmerCode(''); setNewCustomerCode(''); }} style={{ flex: 1, padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    };

    // Helper component for rendering supplier codes
    const SupplierCodeList = ({ items, type, searchTerm }) => {
        const groupedItems = useMemo(() => {
            return items.reduce((acc, item) => {
                const { supplier_code, supplier_bill_no } = item;
                if (!supplier_code) return acc;
                if (!acc[supplier_code]) acc[supplier_code] = [];
                if (type === 'printed' && supplier_bill_no) acc[supplier_code].push(supplier_bill_no);
                else if (type === 'unprinted' && !acc[supplier_code].includes(supplier_code)) acc[supplier_code].push(supplier_code);
                return acc;
            }, {});
        }, [items, type]);

        const supplierCodes = Object.keys(groupedItems);
        const buttonBaseStyle = { width: '100%', display: 'block', textAlign: 'left', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '1rem', marginBottom: '4px', boxSizing: 'border-box' };
        const buttonStyle = type === 'printed' ? { ...buttonBaseStyle, backgroundColor: '#1E88E5', color: 'white' } : { ...buttonBaseStyle, backgroundColor: '#FF7043', color: 'white' };

        if (items.length === 0) return <p style={{ color: '#6c757d', padding: '10px' }}>{searchTerm ? `No results found` : 'මෙම ප්‍රවර්ගයේ සැපයුම්කරු නොමැත'}</p>;

        return (
            <div style={listContainerStyle}>
                {supplierCodes.map(code => (
                    <div key={code}>
                        {groupedItems[code].map(id => (
                            <button key={id} onClick={() => type === 'printed' ? handlePrintedBillClick(code, id) : handleUnprintedBillClick(code, null)} style={buttonStyle}>
                                <span style={{ display: "block", textAlign: "left", fontSize: "15px", fontWeight: "600" }}>{type === 'printed' ? `${code}-${id}` : `${code}`}</span>
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        );
    };

    // --- ALWAYS DISPLAYED DETAILS PANEL ---
    const renderDetailsPanel = () => {
        const panelContainerStyle = { backgroundColor: '#091d3d', padding: '30px', borderRadius: '12px', maxWidth: '100%', maxHeight: 'calc(100vh - 60px)', overflowY: 'auto', position: 'relative', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)', fontFamily: 'Roboto, Arial, sans-serif', marginTop: '-10px', width: '850px', minHeight: '550px', marginLeft: '0' };
        const headerStyle = { color: '#007bff', borderBottom: '2px solid #e9ecef', paddingBottom: '10px', marginTop: '0', marginBottom: '20px', fontSize: '1.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
        const thStyle = { backgroundColor: '#007bff', color: 'white', fontWeight: '600', padding: '6px 8px', textAlign: 'left', position: 'sticky', top: '0', zIndex: 10, fontSize: '0.8rem', whiteSpace: 'nowrap' };
        const tdStyle = { padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #dee2e6', whiteSpace: 'normal' };

        const renderDataRows = () => (
            <tbody>
                {supplierDetails.map((record, index) => (
                    <tr key={record.id || index} style={{ ...getRowStyle(index), cursor: 'pointer' }} onClick={() => setEditingRecord(record)}>
                        <td style={tdStyle}>{record.bill_no || selectedBillNo}</td>
                        <td style={tdStyle}>{record.customer_code}</td>
                        <td style={tdStyle}><strong>{record.item_name}</strong></td>
                        <td style={tdStyle}>{record.packs}</td>
                        <td style={tdStyle}>{record.weight}</td>
                        <td style={tdStyle}>{record.price_per_kg}</td>
                        <td style={tdStyle}>{record.SupplierPricePerKg}</td>
                        <td style={tdStyle}>{formatDecimal((record?.total || 0) - (record?.CustomerPackLabour || 0))}</td>
                        <td style={tdStyle}>{record.SupplierTotal}</td>
                        <td style={tdStyle}>{record.commission_amount}</td>
                    </tr>
                ))}
                <tr style={{ ...getRowStyle(supplierDetails.length), fontWeight: 'bold', borderTop: '2px solid #000' }}>
                    <td style={tdStyle} colSpan="3"><strong>TOTALS</strong></td>
                    <td style={tdStyle}>{totalPacksSum}</td>
                    <td style={tdStyle}>{totalWeight.toFixed(3)}</td>
                    <td style={tdStyle}>-</td><td style={tdStyle}>-</td>
                    <td style={tdStyle}>{totalCusGross.toFixed(2)}</td>
                    <td style={tdStyle}>{totalsupplierSales.toFixed(2)}</td>
                    <td style={tdStyle}>-</td>
                </tr>
            </tbody>
        );

        return (
            <div style={panelContainerStyle}>
                <div style={headerStyle}>
                    <h2 style={{ fontSize: "1.5rem", color: "white", margin: 0 }}>
                        ගනුදෙනු විස්තර (බිල් අංකය: <strong>{selectedBillNo || 'N/A'}</strong>)
                    </h2>

                    {/* 🚀 DISPLAY PROFILE PIC ON THE RIGHT */}
                    {profilePic && (
                        <div style={{ marginLeft: '20px' }}>
                            <img
                                src={profilePic.startsWith('http') ? profilePic : `http://localhost:8000/storage/${profilePic}`}
                                alt="Supplier"
                                /* 🚀 ADD THIS ONCLICK LINE */
                                onClick={() => setIsImageModalOpen(true)}
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                    objectFit: 'cover',
                                    backgroundColor: '#ccc',
                                    cursor: 'pointer' // Adds the hand icon so users know it's clickable
                                }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                    )}
                </div>
                <div style={{ marginTop: '20px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '250px', fontSize: '0.9rem', marginBottom: '30px' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>බිල් අං:</th><th style={thStyle}>ගනුදෙ</th><th style={thStyle}>අයිත</th><th style={thStyle}>අසුරුම්</th><th style={thStyle}>බර</th><th style={thStyle}>ගනුදෙ මිල</th><th style={thStyle}>සැපයුම් මිල</th><th style={thStyle}>ගනුදෙ එක</th><th style={thStyle}>සැපයුම් එක</th><th style={thStyle}>කොමි</th>
                            </tr>
                        </thead>
                        {selectedSupplier && supplierDetails.length > 0 ? renderDataRows() : <tbody><tr><td colSpan="11" style={{ textAlign: 'center', color: '#6c757d', fontStyle: 'italic', padding: '50px 0' }}>Select a bill to view details</td></tr></tbody>}
                    </table>
                </div>
                {selectedSupplier && Object.keys(itemSummaryData).length > 0 && (
                    <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0px' }}>
                            <thead>
                                <tr><th style={{ ...thStyle, backgroundColor: '#6c757d' }}>අයිතමය නම</th><th style={{ ...thStyle, backgroundColor: '#6c757d' }}>සම්පූර්ණ බර</th><th style={{ ...thStyle, backgroundColor: '#6c757d' }}>මුළු අසුරුම්</th></tr>
                            </thead>
                            <tbody>
                                {Object.keys(itemSummaryData).map((name, i) => (
                                    <tr key={name} style={getRowStyle(i)}><td style={tdStyle}>{name}</td><td style={tdStyle}>{formatDecimal(itemSummaryData[name].totalWeight, 3)}</td><td style={tdStyle}>{itemSummaryData[name].totalPacks}</td></tr>
                                ))}
                            </tbody>
                        </table>

                        {/* 🚀 INTEGRATED ADVANCE ENTRY FORM */}
                        <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ffffff33', borderRadius: '8px', backgroundColor: '#ffffff11' }}>
                            <h3 style={{ color: '#ffc107', marginTop: 0, fontSize: '1.2rem' }}>අත්තිකාරම් ඇතුලත් කරන්න (Advance Entry)</h3>
                            <form onSubmit={handleAdvanceSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: '#eee', display: 'block', marginBottom: '5px' }}>Supplier Code</label>
                                    <input
                                        type="text"
                                        value={advancePayload.code}
                                        readOnly
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#eee', color: '#000' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: '#eee', display: 'block', marginBottom: '5px' }}>Amount (රු:)</label>
                                    <input
                                        type="number"
                                        name="advance_amount"
                                        value={advancePayload.advance_amount}
                                        onChange={(e) => setAdvancePayload({ ...advancePayload, advance_amount: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: 'none', color: '#000' }}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={advanceLoading || !selectedSupplier}
                                    style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: '40px' }}
                                >
                                    {advanceLoading ? 'Saving...' : 'Update Advance'}
                                </button>
                            </form>
                            {advanceStatus.text && (
                                <p style={{ color: advanceStatus.type === 'success' ? '#28a745' : '#ff4444', marginTop: '10px', fontWeight: 'bold' }}>
                                    {advanceStatus.text}
                                </p>
                            )}
                        </div>
                    </>
                )}
                <div style={{ textAlign: 'center' }}>
                    <button style={{ padding: '10px 20px', fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: '#ffc107', color: '#343a40', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '20px', opacity: selectedSupplier ? 1 : 0.5 }} onClick={handlePrint} disabled={!selectedSupplier || isDetailsLoading || supplierDetails.length === 0}>
                        🖨️ {isDetailsLoading ? 'Processing...' : (selectedSupplier ? (isUnprintedBill ? `Print & Finalize Bill (F4)` : `Print Copy (F4)`) : 'Select a Bill First')}
                    </button>
                </div>
            </div>
        );
    };

    const navBarStyle = { backgroundColor: '#343a40', padding: '15px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' };
    const reportContainerStyle = { minHeight: '100vh', padding: '90px 50px 50px 50px', fontFamily: 'Roboto, Arial, sans-serif', boxSizing: 'border-box', backgroundColor: '#1ec139ff' };

    if (isLoading) return <div style={loadingStyle}>Loading Supplier Report...</div>;

    return (
        <>
            <nav style={navBarStyle}>
                <h1 style={{ color: 'white', fontSize: '1.5rem', margin: 0 }}>සැපයුම්කරු වාර්තාව</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button style={{ padding: '8px 15px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setBillSize(billSize === '3mm' ? '4mm' : '3mm')}>බිල්පත් ප්‍රමාණය: {billSize}</button>
                    <button style={{ padding: '10px 20px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={goToSalesEntry}>මුල් පිටුව</button>
                </div>
            </nav>

            <div style={reportContainerStyle}>
                <div style={sectionsContainerStyle}>
                    <div style={printedContainerStyle}>
                        <div style={printedSectionStyle}>
                            <h2 style={{ ...printedHeaderStyle, padding: '0 25px 10px 25px', marginBottom: '15px' }}> මුද්‍රණය කළ </h2>
                            <input type="text" placeholder="🔍 මුද්‍රිත සෙවීම..." value={printedSearchTerm} onChange={(e) => setPrintedSearchTerm(e.target.value)} style={{ ...searchBarStyle, marginBottom: '20px', height: '22px', padding: '12px 25px' }} />
                            <SupplierCodeList items={filteredPrintedItems} type="printed" searchTerm={printedSearchTerm} />
                        </div>
                    </div>
                    <div style={centerPanelContainerStyle}>{renderDetailsPanel()}</div>
                    <div style={unprintedContainerStyle}>
                        <div style={unprintedSectionStyle}>
                            <h2 style={{ ...unprintedHeaderStyle, padding: '0 25px 10px 25px', marginBottom: '15px', whiteSpace: 'nowrap' }}>මුද්‍රණය නොකළ</h2>
                            <input type="text" placeholder="🔍 මුද්‍රණ නොකළ සෙවීම..." value={unprintedSearchTerm} onChange={(e) => setUnprintedSearchTerm(e.target.value)} style={{ ...searchBarStyle, marginBottom: '20px', height: '22px', padding: '12px 25px' }} />
                            <SupplierCodeList items={filteredUnprintedItems} type="unprinted" searchTerm={unprintedSearchTerm} />
                        </div>
                    </div>
                </div>
            </div>
            {renderImageModal()}
            {renderEditModal()}
        </>
    );
};

// --- STYLES ---
const headerContainerStyle = { padding: '40px 0 30px 0', borderBottom: '1px solid #E0E0E0', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: '#1ec139ff' };
const searchBarStyle = { width: '100%', fontSize: '1rem', borderRadius: '6px', border: '1px solid #E0E0E0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box', backgroundColor: 'white' };
const sectionsContainerStyle = { display: 'flex', justifyContent: 'space-between', gap: '20px' };
const printedContainerStyle = { width: '200px', flexShrink: 0, marginLeft: '-45px', marginTop: '-10px', border: '2px solid black' };
const unprintedContainerStyle = { width: '180px', flexShrink: 0, marginRight: '-45px', marginTop: '-10px', marginLeft: '0', border: '2px solid black' };
const centerPanelContainerStyle = { flex: '3', minWidth: '700px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' };
const baseSectionStyle = { padding: '25px 0 25px 0', borderRadius: '12px', boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 210px)' };
const printedSectionStyle = { ...baseSectionStyle, backgroundColor: '#1ec139ff', borderLeft: '5px solid #FFFFFF', minHeight: '550px' };
const unprintedSectionStyle = { ...baseSectionStyle, backgroundColor: '#1ec139ff', borderLeft: '5px solid #FFFFFF', minHeight: '550px' };
const printedHeaderStyle = { color: '#07090ae6', borderBottom: '2px solid #1E88E530', flexShrink: 0, fontSize: '1.3rem' };
const unprintedHeaderStyle = { color: '#07090ae6', borderBottom: '2px solid #FF704330', flexShrink: 0, fontSize: '1.3rem' };
const listContainerStyle = { display: 'flex', flexDirection: 'column', gap: '0px', marginTop: '5px', overflowY: 'auto', padding: '0 5px 0 5px', flexGrow: 1, height: '900px' };
const loadingStyle = { textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: '#1E88E5', backgroundColor: '#1ec139ff' };

export default SupplierReport;