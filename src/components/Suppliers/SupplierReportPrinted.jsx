import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from "../../api";
import { useNavigate } from 'react-router-dom';

const SupplierReport = () => {
    const navigate = useNavigate();

    // State for all data
    const [summary, setSummary] = useState({ printed: [], unprinted: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [loanSummary, setLoanSummary] = useState([]);

    // 🚀 NEW STATE: For Context Menu (Right Click)
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, target: null });

    // 🚀 NEW STATE: To hold specific loan record data (Paid & Remaining amounts)
    const [selectedLoanRecord, setSelectedLoanRecord] = useState(null);

    // 🚀 NEW STATES: For Farmer Full Report Feature
    const [isFarmerModalOpen, setIsFarmerModalOpen] = useState(false);
    const [allSuppliers, setAllSuppliers] = useState([]); 
    const [selectedFarmerForReport, setSelectedFarmerForReport] = useState('');
    const [fullReportData, setFullReportData] = useState(null); 

    // 🚀 NEW STATE: Bill size selector (3mm or 4mm)
    const [billSize, setBillSize] = useState('3mm');

    const [printedSearchTerm, setPrintedSearchTerm] = useState('');
    const [unprintedSearchTerm, setUnprintedSearchTerm] = useState('');

    //new states  in adding telephone no
    const [phoneNo, setPhoneNo] = useState('');
    const [phoneStatus, setPhoneStatus] = useState(''); // For feedback
    const [enteredAmount, setEnteredAmount] = useState(0);

    // 🚀 NEW STATE: For loan/paying amount
    const [payingAmount, setPayingAmount] = useState('');
    const [loanStatus, setLoanStatus] = useState(''); // For feedback

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

    // 🚀 NEW STATES FOR PAYMENT MODAL FEATURES
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentType, setPaymentType] = useState('Cash'); 
    const [paymentAmount, setPaymentAmount] = useState('');
    
    // 🚀 NEW STATES FOR CHEQUE DETAILS
    const [bankName, setBankName] = useState('');
    const [chequeNo, setChequeNo] = useState('');
    const [realizedDate, setRealizedDate] = useState('');

    // --- Function to fetch the summary data ---
    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        setCurrentView('summary');
        console.log("➡️ Attempting to fetch supplier summary data from backend...");
        try {
            const response = await api.get('/suppliers/supplierloans');

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

    //fetchoing loans for new unprinted section
    const fetchLoanSummary = useCallback(async () => {
        try {
            const response = await api.get('/suppliers/loan-summary');
            if (response.data.success) {
                setLoanSummary(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching loan summary:", error);
        }
    }, []);

    // Fetch all suppliers for the report modal
    const fetchAllSuppliersList = async () => {
        try {
            const res = await api.get('/suppliers/all-codes');
            setAllSuppliers(res.data);
        } catch (e) {
            console.error("Error fetching codes:", e);
        }
    };

    // Call this inside your existing useEffect or fetchSummary
    useEffect(() => {
        fetchSummary();
        fetchLoanSummary(); // 🚀 Fetch the separate loan list
        fetchAllSuppliersList(); // 🚀 Fetch for the Farmer Report Modal
    }, [fetchSummary, fetchLoanSummary]);

    // 🚀 NEW: Context Menu Handlers
    const handleContextMenu = (e, loan) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            target: loan
        });
    };

    const closeContextMenu = () => {
        setContextMenu({ ...contextMenu, visible: false });
    };

    // 🚀 NEW: Handle Delete Record
    const handleDeleteRecord = async () => {
        const loan = contextMenu.target;
        if (!loan) return;

        if (window.confirm(`${loan.supplier_code} සැපයුම්කරුගේ බිල් අංක ${loan.supplier_bill_no || 'Pending'} ට අදාල ණය වාර්තාව මකා දැමීමට ඔබට විශ්වාසද?`)) {
            try {
                setIsDetailsLoading(true);
                await api.post('/suppliers/delete-loan-record', {
                    code: loan.supplier_code,
                    bill_no: loan.supplier_bill_no
                });
                
                fetchLoanSummary();
                fetchSummary();
                resetDetails();
                setLoanStatus('✅ මකා දමන ලදී');
                setTimeout(() => setLoanStatus(''), 2000);
            } catch (error) {
                console.error("Delete Error:", error);
                alert("මකා දැමීම අසාර්ථක විය.");
            } finally {
                setIsDetailsLoading(false);
                closeContextMenu();
            }
        }
    };

    // 🚀 NEW: Farmer Report Logic
    const handleOpenFarmerReport = async () => {
        if (!selectedFarmerForReport) {
            alert("කරුණාකර සැපයුම්කරුවෙකු තෝරන්න.");
            return;
        }
        try {
            const res = await api.get(`/suppliers/full-report?code=${selectedFarmerForReport}`);
            if (res.data.success) {
                setFullReportData(res.data);
                setIsFarmerModalOpen(false);
            }
        } catch (e) {
            alert("වාර්තාව ලබාගැනීම අසාර්ථක විය.");
        }
    };

    // Listen for clicks to close context menu
    useEffect(() => {
        window.addEventListener('click', closeContextMenu);
        return () => window.removeEventListener('click', closeContextMenu);
    }, [contextMenu]);

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
    // --- Handle Printed Bill Click ---
    const handlePrintedBillClick = async (supplierCode, billNo) => {
        setSelectedSupplier(supplierCode);
        setSelectedBillNo(billNo);
        setIsUnprintedBill(false);
        setSupplierDetails([]);
        setAdvanceAmount(0);
        setProfilePic(null);
        setPhoneNo(''); // Reset before fetch
        setPayingAmount(''); // Reset paying amount
        setSelectedLoanRecord(null); // Reset loan data
        setAdvancePayload({ code: supplierCode, advance_amount: '' });
        setIsDetailsLoading(true);

        try {
            const response = await api.get(`/suppliers/bill/${billNo}/details`);
            setSupplierDetails(response.data);

            // 🚀 NEW: Fetch existing loan record for this bill
            try {
                const loanRes = await api.get(`/supplier-loan/search?code=${supplierCode}&bill_no=${billNo}`);
                if (loanRes.data) {
                    setSelectedLoanRecord(loanRes.data);
                }
            } catch (loanErr) {
                console.warn("No loan record found for this selection.");
            }

            // Fetch supplier profile to get the saved telephone number
            const supRes = await api.get(`/suppliers/search-by-code/${supplierCode}`);
            if (supRes.data) {
                setAdvanceAmount(parseFloat(supRes.data.advance_amount) || 0);
                setProfilePic(supRes.data.profile_pic);
                // 🚀 MATCHING & FETCHING: This gets the phone from the DB record
                setPhoneNo(supRes.data.telephone_no || '');

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

    // --- Updated: Handle Loan/Unprinted Bill Click ---
const handleUnprintedBillClick = async (supplierCode, billNo) => {
    setSelectedSupplier(supplierCode);
    setSelectedBillNo(billNo);
    setIsUnprintedBill(true);
    setSupplierDetails([]);
    setAdvanceAmount(0);
    setProfilePic(null);
    setPhoneNo(''); 
    setPayingAmount(''); // Reset first
    setSelectedLoanRecord(null); // Reset loan data
    setAdvancePayload({ code: supplierCode, advance_amount: '' });
    setIsDetailsLoading(true);

    try {
        // 1. Fetch the transaction details (the items in the bill)
        const response = await api.get(`/suppliers/${supplierCode}/unprinted-details2`);
        setSupplierDetails(response.data);

        // 2. NEW: Fetch the saved loan amount for this specific bill/supplier
        try {
            const loanRes = await api.get(`/supplier-loan/search?code=${supplierCode}&bill_no=${billNo || ''}`);
            if (loanRes.data) {
                // Populate state for amounts and the input field
                setSelectedLoanRecord(loanRes.data);
                if (loanRes.data.loan_amount) {
                    setPayingAmount(loanRes.data.loan_amount);
                }
            }
        } catch (loanErr) {
            console.warn("No existing loan record found for this selection.");
        }

        // 3. Fetch supplier profile & advance (Existing logic)
        const supRes = await api.get(`/suppliers/search-by-code/${supplierCode}`);
        if (supRes.data) {
            setAdvanceAmount(parseFloat(supRes.data.advance_amount) || 0);
            setProfilePic(supRes.data.profile_pic);
            setPhoneNo(supRes.data.telephone_no || '');
            setSupplierDocs({
                title: supRes.data.name || supplierCode,
                profile: supRes.data.profile_pic,
                nic_front: supRes.data.nic_front,
                nic_back: supRes.data.nic_back
            });
        }
    } catch (error) {
        console.error(`❌ Error fetching details:`, error.message);
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
        setSelectedLoanRecord(null);
        fetchSummary();
    };

    // --- Helper function for details panel ---
    const formatDecimal = (value, decimals = 2) => (parseFloat(value) || 0).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    //function to add telephone number
    const handlePhoneSubmit = async (e) => {
        if (e.key === 'Enter') {
            if (!selectedSupplier) return;
            setPhoneStatus('Updating...');
            try {
                await api.post('/suppliers/update-phone', {
                    code: selectedSupplier,
                    telephone_no: phoneNo
                });
                setPhoneStatus('✅ Saved');
                setTimeout(() => setPhoneStatus(''), 2000);
            } catch (error) {
                console.error("Phone Update Error:", error);
                setPhoneStatus('❌ Error');
            }
        }
    };
    // 🚀 UPDATED: Handle loan amount submission and update sales records
    const handleLoanSubmit = async (e) => {
        if (e.key === 'Enter') {
            if (!selectedSupplier || !payingAmount || parseFloat(payingAmount) <= 0) {
                setLoanStatus('⚠️ Invalid amount');
                setTimeout(() => setLoanStatus(''), 2000);
                return;
            }

            // Get the IDs of the records currently being viewed/processed
            const currentTransactionIds = supplierDetails.map(record => record.id);

            if (currentTransactionIds.length === 0) {
                setLoanStatus('⚠️ No records selected');
                return;
            }

            setLoanStatus('Processing...');

            try {
                // Calculate total amount (SupplierTotal - payingAmount)
                const totalAmount = totalsupplierSales - parseFloat(payingAmount);

                // Save the loan amount AND send the transaction IDs to update sales table
                await api.post('/supplier-loan', {
                    code: selectedSupplier,
                    loan_amount: parseFloat(payingAmount),
                    total_amount: totalAmount,
                    bill_no: selectedBillNo || null,
                    transaction_ids: currentTransactionIds // 🚀 NEW: Added this
                });

                setLoanStatus('✅ Loan saved');

                // Clear the input
                setPayingAmount('');

                // Small delay to ensure the loan is saved before printing
                setTimeout(() => {
                    handlePrint();
                }, 300);

            } catch (error) {
                console.error("Loan Update Error:", error);

                if (error.response && error.response.status === 422) {
                    setLoanStatus('⚠️ Invalid data');
                } else {
                    setLoanStatus('❌ Error');
                }

                setTimeout(() => setLoanStatus(''), 2000);
            }
        }
    };


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

        // 🚀 NEW: Calculation for Loan/Partial Payment
        const paidAmountValue = parseFloat(payingAmount) || 0;
        const remainingAfterPayment = totalsupplierSales - paidAmountValue;

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
        // We subtract both Advance and any current payment made
        const netPayable = totalsupplierSales - advanceAmount - (parseFloat(paymentAmount) || 0);

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
          <td style="font-size:15px; white-space:nowrap; position:relative; left:-15px;">මෙම බිලට මුළු අගය:</td>
          <td style="text-align:right;"><span style="border-bottom:2px solid #000; font-size:${fontSizeTotal}; padding:5px 10px;">${(totalsupplierSales.toFixed(2))}</span></td>
        </tr>
        
        ${(parseFloat(paymentAmount) || 0) > 0 ? `
        <tr style="font-size:18px;">
            <td style="font-size:15px; padding-top:10px;">ගෙවූ මුදල (${paymentType}):</td>
            <td style="text-align:right; padding-top:10px; color:#000;">
                - ${(parseFloat(paymentAmount) || 0).toFixed(2)}
            </td>
        </tr>
        ` : ''}

        <tr style="font-size:18px;">
          <td style="font-size:15px; padding-top:5px;">අත්තිකාරම්</td>
          <td style="text-align:right; padding-top:5px; color:#000;">
            - ${advanceAmount.toFixed(2)}
          </td>
        </tr>

        <tr style="font-weight:900;">
          <td style="font-size:18px; padding-top:10px;">ශුද්ධ ඉතිරි ශේෂය:</td>
          <td style="text-align:right; padding-top:10px;">
            <span style="color:#000; font-size:${fontSizeTotal}; border-bottom:5px double #000; border-top:2px solid #000;">
              ${netPayable.toFixed(2)}
            </span>
          </td>
        </tr>
    </table>

    <div style="margin-top:25px; border-top:1px dashed #000; padding-top:10px;"><table style="width:100%; border-collapse:collapse; font-size:14px; text-align:center;">${itemSummaryHtml}</table></div>
</div>`;
    }, [selectedSupplier, supplierDetails, totalPacksSum, totalsupplierSales, itemSummaryData, billSize, advanceAmount, paymentAmount, paymentType, payingAmount]);

    // --- Print function ---

    const handlePrint = useCallback(async () => {
        if (!supplierDetails || supplierDetails.length === 0) return;

        let finalBillNo = selectedBillNo;

        // If it's a new bill (Unprinted), we must finalize and send SMS
        if (isUnprintedBill) {
            setIsDetailsLoading(true);
            try {
                const response = await api.post('/suppliers/mark-as-printed', {
                    transaction_ids: supplierDetails.map(r => r.id),
                    advance_amount: advanceAmount,
                    supplier_code: selectedSupplier
                });

                finalBillNo = response.data.new_bill_no;
                setSelectedBillNo(finalBillNo);

                if (phoneNo) {
                    console.log(`Finalized Bill ${finalBillNo}. SMS triggered for ${phoneNo}`);
                }
            } catch (err) {
                console.error('Finalize/SMS Error:', err);
                alert('Finalize failed. SMS could not be sent.');
                return;
            } finally {
                setIsDetailsLoading(false);
            }
        } else {
            // 🚀 NEW: For printed bills, send SMS without finalizing
            if (phoneNo) {
                setIsDetailsLoading(true);
                try {
                    // Send SMS for reprint using the same backend method
                    const smsResponse = await api.post('/suppliers/resend-sms', {
                        bill_no: selectedBillNo,
                        telephone_no: phoneNo,
                        supplier_code: selectedSupplier,
                        transaction_ids: supplierDetails.map(r => r.id),
                        advance_amount: advanceAmount,
                        is_reprint: true  // Add flag to indicate reprint
                    });

                    console.log(`Reprint SMS triggered for ${phoneNo} on bill ${selectedBillNo}`);

                    // Show success message
                    setPhoneStatus('📱 SMS resent');
                    setTimeout(() => setPhoneStatus(''), 2000);

                } catch (err) {
                    console.error('SMS Resend Error:', err);
                    setPhoneStatus('⚠️ SMS failed');
                    setTimeout(() => setPhoneStatus(''), 2000);
                } finally {
                    setIsDetailsLoading(false);
                }
            } else {
                setPhoneStatus('⚠️ No phone number');
                setTimeout(() => setPhoneStatus(''), 2000);
            }
        }

        // After backend success, proceed to show the browser print dialog
        const content = getBillContent(finalBillNo);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`<html><body>${content}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();

            // ✅ Refresh current page after print dialog opens
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    }, [supplierDetails, selectedBillNo, isUnprintedBill, phoneNo, advanceAmount, selectedSupplier, getBillContent]);

    // 🚀 NEW: Handle Final Payment Submission with Type and Cheque details
    const handlePaymentSubmit = async (e) => {
        if (e && e.key && e.key !== 'Enter') return;

        if (!paymentAmount || isNaN(paymentAmount)) {
            alert("කරුණාකර නිවැරදි මුදලක් ඇතුළත් කරන්න.");
            return;
        }

        setIsDetailsLoading(true);
        try {
            // Write record to supplier_loans table
            await api.post('/supplier-loan', {
                code: selectedSupplier,
                loan_amount: parseFloat(paymentAmount),
                total_amount: totalsupplierSales,
                bill_no: selectedBillNo || null,
                type: paymentType, 
                bank_name: paymentType === 'Cheque' ? bankName : null,
                cheque_no: paymentType === 'Cheque' ? chequeNo : null,
                realized_date: paymentType === 'Cheque' ? realizedDate : null,
                transaction_ids: supplierDetails.map(record => record.id)
            });

            setIsPaymentModalOpen(false);
            handlePrint(); // Trigger the existing print logic

        } catch (error) {
            console.error("Payment Submission Error:", error);
            alert("දත්ත සුරැකීම අසාර්ථක විය.");
        } finally {
            setIsDetailsLoading(false);
        }
    };

    // --- Keyboard event listener ---
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'F1' || event.keyCode === 112) { event.preventDefault(); return false; }
            if ((event.key === 'F4' || event.keyCode === 115) && supplierDetails.length > 0 && !isDetailsLoading) {
                event.preventDefault();
                // 🚀 MODIFIED: Open modal instead of printing directly
                setPaymentAmount(totalsupplierSales.toString()); // Default value
                setIsPaymentModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [supplierDetails, totalsupplierSales, isDetailsLoading]);

    //new profile pic view modal
    const renderImageModal = () => {
        if (!isImageModalOpen) return null;

        // Helper to format URLs correctly
        const formatUrl = (path) => {
            if (!path) return null;
            return path.startsWith('http') ? path : `https://goviraju.lk/sms_new_backend_50500/application/public/storage/${path}`;
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

    // 🚀 NEW: Payment Confirm Modal with Cheque Logic
    const renderPaymentModal = () => {
        if (!isPaymentModalOpen) return null;

        return (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '450px', textAlign: 'center' }}>
                    <h2 style={{ color: '#091d3d', marginBottom: '20px' }}>ගෙවීම් තහවුරු කිරීම</h2>
                    
                    <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ගෙවීම් ක්‍රමය:</label>
                        <select 
                            value={paymentType} 
                            onChange={(e) => setPaymentType(e.target.value)}
                            style={{ width: '100%', padding: '10px', fontSize: '1.1rem', borderRadius: '6px' }}
                        >
                            <option value="Cash">මුදල් (Cash)</option>
                            <option value="Cheque">චෙක්පත් (Cheque)</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>මුදල (Amount):</label>
                        <input 
                            type="number" 
                            autoFocus
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            onKeyDown={handlePaymentSubmit}
                            style={{ width: '100%', padding: '10px', fontSize: '1.3rem', fontWeight: 'bold', borderRadius: '6px', border: '2px solid #28a745', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* 🚀 ADDED: Cheque Specific Section */}
                    {paymentType === 'Cheque' && (
                        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9', marginBottom: '20px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#1E88E5' }}>චෙක්පත් විස්තර</h4>
                            
                            <div style={{ marginBottom: '10px', textAlign: 'left' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>බැංකුවේ නම:</label>
                                <input 
                                    type="text" 
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                    placeholder="උදා: BOC, NSB..."
                                />
                            </div>

                            <div style={{ marginBottom: '10px', textAlign: 'left' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>චෙක්පත් අංකය:</label>
                                <input 
                                    type="text" 
                                    value={chequeNo}
                                    onChange={(e) => setChequeNo(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                />
                            </div>

                            <div style={{ textAlign: 'left' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>මාරු කළ යුතු දිනය (Realized Date):</label>
                                <input 
                                    type="date" 
                                    value={realizedDate}
                                    onChange={(e) => setRealizedDate(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={handlePaymentSubmit}
                            style={{ flex: 1, padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >තහවුරු කරන්න (Enter)</button>
                        <button 
                            onClick={() => setIsPaymentModalOpen(false)}
                            style={{ flex: 1, padding: '15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >අවලංගු කරන්න</button>
                    </div>
                </div>
            </div>
        );
    };

    // 🚀 NEW: Selection Modal
    const renderFarmerSelectorModal = () => {
        if (!isFarmerModalOpen) return null;
        return (
            <div style={modalOverlayStyle}>
                <div style={selectionModalContainer}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#1a2a6c' }}>සැපයුම්කරු වාර්තාව</h3>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>වාර්තාව බැලීම සඳහා සැපයුම්කරු තෝරන්න</p>
                    <select 
                        style={modernSelect} 
                        value={selectedFarmerForReport} 
                        onChange={(e) => setSelectedFarmerForReport(e.target.value)}
                    >
                        <option value="">ගොවි කේතය තෝරන්න...</option>
                        {allSuppliers.map(s => (
                            <option key={s.id} value={s.code}>{s.code} - {s.name}</option>
                        ))}
                    </select>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                        <button onClick={handleOpenFarmerReport} style={reportSubmitBtn}>වාර්තාව බලන්න</button>
                        <button onClick={() => setIsFarmerModalOpen(false)} style={reportCancelBtn}>වසන්න</button>
                    </div>
                </div>
            </div>
        );
    };

    // 🚀 NEW: Interactive Full Report View
    const renderFullReportView = () => {
        if (!fullReportData) return null;
        const { profile, loans, sales } = fullReportData;
        const storageUrl = "https://goviraju.lk/sms_new_backend_50500/application/public/storage/";

        return (
            <div style={fullScreenReportOverlay}>
                <div style={reportContainerPaper}>
                    <button onClick={() => setFullReportData(null)} style={closeReportFloatingBtn}>✕ වසන්න</button>
                    
                    <div style={reportProfileHeader}>
                        <img 
                            src={profile.profile_pic ? `${storageUrl}${profile.profile_pic}` : 'https://via.placeholder.com/150'} 
                            style={reportHeaderPic} 
                            alt="Farmer" 
                        />
                        <div style={{ flex: 1 }}>
                            <h1 style={{ margin: 0, color: '#1a2a6c' }}>{profile.name}</h1>
                            <p style={{ margin: '5px 0', fontSize: '1.2rem', color: '#555' }}>ගොවි කේතය: <strong>{profile.code}</strong></p>
                            <p style={{ margin: 0 }}>📍 {profile.address} | 📞 {profile.telephone_no}</p>
                        </div>
                        <div style={advanceReportBadge}>
                            <small>පවතින අත්තිකාරම්</small>
                            <h3>රු. {formatDecimal(profile.advance_amount)}</h3>
                        </div>
                    </div>

                    <div style={reportContentGrid}>
                        <div style={reportCard}>
                            <h4 style={reportCardTitle}>විකුණුම් ඉතිහාසය (Sales)</h4>
                            <div style={reportTableWrapper}>
                                <table style={reportInteractiveTable}>
                                    <thead>
                                        <tr><th>දිනය</th><th>අයිතමය</th><th>බර (Kg)</th><th>මුළු අගය</th></tr>
                                    </thead>
                                    <tbody>
                                        {sales.map(s => (
                                            <tr key={s.id}>
                                                <td>{s.Date}</td>
                                                <td style={{ fontWeight: 'bold' }}>{s.item_name}</td>
                                                <td>{s.weight}</td>
                                                <td>{formatDecimal(s.SupplierTotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={reportCard}>
                            <h4 style={reportCardTitle}>ණය සහ ගෙවීම් වාර්තා (Loans/Payments)</h4>
                            <div style={reportTableWrapper}>
                                <table style={reportInteractiveTable}>
                                    <thead>
                                        <tr><th>බිල් අං</th><th>ගෙවූ මුදල</th><th>ඉතිරි මුදල</th><th>ක්‍රමය</th></tr>
                                    </thead>
                                    <tbody>
                                        {loans.map(l => (
                                            <tr key={l.id}>
                                                <td>{l.bill_no || 'N/A'}</td>
                                                <td style={{ color: '#27ae60', fontWeight: 'bold' }}>{formatDecimal(l.loan_amount)}</td>
                                                <td style={{ color: '#e74c3c' }}>{formatDecimal(l.total_amount)}</td>
                                                <td>{l.type}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
                            <button key={id} onClick={() => type === 'printed' ? handlePrintedBillClick(code, id) : handleUnprintedBillClick(code, id)} style={buttonStyle}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <h2 style={{ fontSize: "1.5rem", color: "white", margin: 0 }}>
                            ගනුදෙනු විස්තර (බිල් අංකය: <strong>{selectedBillNo || 'N/A'}</strong>)
                        </h2>
                        {/* TELEPHONE INPUT - DISABLED FOR PRINTED BILLS */}
                        {selectedSupplier && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* 🚀 NEW: Paying Amount Input */}
                                <input
                                    type="number"
                                    placeholder="ගෙවන මුදල..."
                                    value={payingAmount}
                                    onChange={(e) => setPayingAmount(e.target.value)}
                                    onKeyDown={handleLoanSubmit}
                                    disabled={!selectedSupplier || supplierDetails.length === 0}
                                    style={{
                                        padding: '10px 15px',
                                        borderRadius: '8px',
                                        border: '2px solid #28a745',
                                        fontSize: '1rem',
                                        width: '180px',
                                        backgroundColor: !selectedSupplier ? '#e9ecef' : '#ffffff',
                                        color: '#000000',
                                        fontWeight: 'bold',
                                        outline: 'none',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                        cursor: !selectedSupplier ? 'not-allowed' : 'text',
                                        marginLeft: '10px'
                                    }}
                                />
                                {loanStatus && (
                                    <span style={{ fontSize: '0.9rem', color: loanStatus.includes('✅') ? '#00ff00' : (loanStatus.includes('⚠️') ? '#ffc107' : '#ff4444'), fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                                        {loanStatus}
                                    </span>
                                )}

                                {/* Optional: Show the current SupplierTotal value for reference */}
                                {totalsupplierSales > 0 && (
                                    <span style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px 15px', borderRadius: '8px', marginLeft: '10px' }}>
                                        ගෙවිය යුතු: රු. {totalsupplierSales.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 🚀 DISPLAY PROFILE PIC ON THE RIGHT */}
                    {profilePic && (
                        <div style={{ marginLeft: '20px' }}>
                            <img
                                src={profilePic.startsWith('http') ? profilePic : `https://goviraju.lk/sms_new_backend_50500/application/public/storage/${profilePic}`}
                                alt="Supplier"
                                onClick={() => setIsImageModalOpen(true)}
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                    objectFit: 'cover',
                                    backgroundColor: '#ccc',
                                    cursor: 'pointer'
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

                        {/* 🚀 NEW: DISPLAY PAID AND REMAINING AMOUNTS FETCHED FROM DATABASE */}
                        {selectedLoanRecord && (
                            <div style={{ 
                                marginTop: '15px', 
                                padding: '15px', 
                                backgroundColor: '#0d2347', 
                                borderRadius: '8px', 
                                border: '1px solid #17a2b8',
                                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        <p style={{ color: '#aaa', margin: '0 0 5px 0', fontSize: '0.8rem' }}>ගෙවූ මුදල (Paid Amount)</p>
                                        <h3 style={{ color: '#2ecc71', margin: 0 }}>රු. {formatDecimal(selectedLoanRecord.loan_amount)}</h3>
                                    </div>
                                    <div style={{ height: '40px', width: '1px', backgroundColor: '#34495e' }}></div>
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        <p style={{ color: '#aaa', margin: '0 0 5px 0', fontSize: '0.8rem' }}>මුළු ශේෂය (Remaining Balance)</p>
                                        <h3 style={{ color: '#e74c3c', margin: 0 }}>රු. {formatDecimal(selectedLoanRecord.total_amount)}</h3>
                                    </div>
                                </div>
                                {selectedLoanRecord.type === 'Cheque' && (
                                    <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#17a2b8', textAlign: 'center', borderTop: '1px solid #1a3a6b', paddingTop: '5px' }}>
                                        චෙක්පත්: {selectedLoanRecord.bank_name} - {selectedLoanRecord.cheque_no} ({selectedLoanRecord.realized_date})
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
                <div style={{ textAlign: 'center' }}>
                    <button style={{ padding: '10px 20px', fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: '#ffc107', color: '#343a40', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '20px', opacity: selectedSupplier ? 1 : 0.5 }} onClick={() => { if(selectedSupplier) { setPaymentAmount(totalsupplierSales.toString()); setIsPaymentModalOpen(true); } }} disabled={!selectedSupplier || isDetailsLoading || supplierDetails.length === 0}>
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
            {/* 🚀 NEW: Context Menu UI */}
            {contextMenu.visible && (
                <div 
                    style={{ 
                        position: 'absolute', 
                        top: contextMenu.y, 
                        left: contextMenu.x, 
                        backgroundColor: 'white', 
                        border: '1px solid #ccc', 
                        borderRadius: '4px', 
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)', 
                        zIndex: 11000,
                        overflow: 'hidden'
                    }}
                >
                    <button 
                        onClick={handleDeleteRecord}
                        style={{ 
                            padding: '10px 20px', 
                            border: 'none', 
                            background: 'white', 
                            cursor: 'pointer', 
                            width: '100%', 
                            textAlign: 'left',
                            color: '#d32f2f',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                    >
                        🗑️ මකා දමන්න (Delete)
                    </button>
                </div>
            )}

            <nav style={navBarStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button style={{ padding: '8px 15px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#e83e8c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => navigate('/farmer-loans')}>ගොවි ණය ඇතුළත් කිරීම</button>
                    <button 
                        style={{ 
                            padding: '8px 15px', 
                            fontSize: '1rem', 
                            fontWeight: 'bold', 
                            backgroundColor: '#6f42c1', // Purple color for Farmer Report
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }} 
                        onClick={() => setIsFarmerModalOpen(true)}
                    >
                        📊 ගොවි වාර්තාව (Farmer Report)
                    </button>
                     <button style={{ padding: '8px 15px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#e83e8c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => navigate('/supplier-loan-report')}>ගොවි ණය වාර්තාව</button>
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
                       <h2 style={{ ...unprintedHeaderStyle, padding: '0 25px 10px 25px', marginBottom: '15px', whiteSpace: 'nowrap' }}>ණය ලබාගත්</h2>
                            <div style={listContainerStyle}>
                                {loanSummary.length > 0 ? (
                                    loanSummary.map((loan, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleUnprintedBillClick(loan.supplier_code, loan.supplier_bill_no)}
                                            onContextMenu={(e) => handleContextMenu(e, loan)} // 🚀 Trigger Context Menu
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                marginBottom: '5px',
                                                backgroundColor: '#FF7043',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold' }}>{loan.supplier_code}</div>
                                            <div style={{ fontSize: '12px' }}>බිල්: {loan.supplier_bill_no || 'Pending'}</div>
                                        </button>
                                    ))
                                ) : (
                                    <p style={{ color: 'white', padding: '10px' }}>ණය වාර්තා නොමැත</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {renderFarmerSelectorModal()}
            {renderFullReportView()}
            {renderImageModal()}
            {renderEditModal()}
            {renderPaymentModal()}
        </>
    );
};

// --- STYLES ---
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 };
const selectionModalContainer = { backgroundColor: 'white', padding: '40px', borderRadius: '16px', width: '450px', textAlign: 'center' };
const modernSelect = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', marginTop: '10px' };
const reportSubmitBtn = { flex: 1, padding: '12px', backgroundColor: '#1a2a6c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const reportCancelBtn = { flex: 1, padding: '12px', backgroundColor: '#f1f2f6', color: '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

const fullScreenReportOverlay = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#f0f2f5', zIndex: 13000, overflowY: 'auto', padding: '30px' };
const reportContainerPaper = { maxWidth: '1300px', margin: '0 auto', backgroundColor: 'white', padding: '50px', borderRadius: '24px', position: 'relative', boxShadow: '0 10px 50px rgba(0,0,0,0.1)' };
const closeReportFloatingBtn = { position: 'absolute', top: '25px', right: '25px', padding: '10px 20px', backgroundColor: '#ff4757', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' };
const reportProfileHeader = { display: 'flex', alignItems: 'center', gap: '40px', borderBottom: '2px solid #f1f2f6', paddingBottom: '40px' };
const reportHeaderPic = { width: '140px', height: '140px', borderRadius: '20px', objectFit: 'cover', border: '5px solid #1a2a6c' };
const advanceReportBadge = { backgroundColor: '#1a2a6c', color: 'white', padding: '20px 35px', borderRadius: '15px', textAlign: 'center' };
const reportContentGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '40px' };
const reportCard = { backgroundColor: '#fff', border: '1px solid #e1e1e1', borderRadius: '16px', overflow: 'hidden' };
const reportCardTitle = { backgroundColor: '#f8f9fa', margin: 0, padding: '20px', color: '#1a2a6c', borderBottom: '1px solid #eee' };
const reportTableWrapper = { maxHeight: '600px', overflowY: 'auto' };
const reportInteractiveTable = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };

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