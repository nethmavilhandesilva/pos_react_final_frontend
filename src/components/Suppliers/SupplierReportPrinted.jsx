import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from "../../api";
import { useNavigate } from 'react-router-dom';

const SupplierReport = () => {
    const navigate = useNavigate();

    // State for all data
    const [summary, setSummary] = useState({ printed: [], unprinted: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [loanSummary, setLoanSummary] = useState([]);

    // Payment History Modal
    const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState(null);

    // Context Menu (Right Click)
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, target: null });

    // To hold specific loan record data (Paid & Remaining amounts)
    const [selectedLoanRecord, setSelectedLoanRecord] = useState(null);

    // For Farmer Full Report Feature
    const [isFarmerModalOpen, setIsFarmerModalOpen] = useState(false);
    const [allSuppliers, setAllSuppliers] = useState([]); 
    const [selectedFarmerForReport, setSelectedFarmerForReport] = useState('');
    const [fullReportData, setFullReportData] = useState(null); 

    // Bill size selector (3mm or 4mm)
    const [billSize, setBillSize] = useState('3mm');

    const [printedSearchTerm, setPrintedSearchTerm] = useState('');
    const [unprintedSearchTerm, setUnprintedSearchTerm] = useState('');

    // Telephone number state
    const [phoneNo, setPhoneNo] = useState('');
    const [phoneStatus, setPhoneStatus] = useState('');
    const [enteredAmount, setEnteredAmount] = useState(0);

    // Loan/paying amount
    const [payingAmount, setPayingAmount] = useState('');
    const [loanStatus, setLoanStatus] = useState('');

    const [currentView, setCurrentView] = useState('summary');
    const [profilePic, setProfilePic] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [supplierDocs, setSupplierDocs] = useState({ title: '', profile: null, nic_front: null, nic_back: null });

    // State for Details Panel
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [selectedBillNo, setSelectedBillNo] = useState(null);
    const [isUnprintedBill, setIsUnprintedBill] = useState(false);
    const [supplierDetails, setSupplierDetails] = useState([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // Advance amount from the suppliers table
    const [advanceAmount, setAdvanceAmount] = useState(0);

    // Advance Entry Form Logic
    const [advancePayload, setAdvancePayload] = useState({ code: '', advance_amount: '' });
    const [advanceLoading, setAdvanceLoading] = useState(false);
    const [advanceStatus, setAdvanceStatus] = useState({ type: '', text: '' });

    // For Editing Records
    const [editingRecord, setEditingRecord] = useState(null);
    const [newFarmerCode, setNewFarmerCode] = useState('');
    const [newCustomerCode, setNewCustomerCode] = useState('');

    // PAYMENT MODAL FEATURES
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentType, setPaymentType] = useState('Cash'); 
    const [paymentAmount, setPaymentAmount] = useState('');
    
    // CHEQUE DETAILS
    const [bankName, setBankName] = useState('');
    const [chequeNo, setChequeNo] = useState('');
    const [realizedDate, setRealizedDate] = useState('');
    
    const [banks, setBanks] = useState([]);
    const [loadingBills, setLoadingBills] = useState(false);
    const [pendingCustomerBills, setPendingCustomerBills] = useState([]);
    const [pendingFarmerBills, setPendingFarmerBills] = useState([]);
    const [bankTransferDetails, setBankTransferDetails] = useState({
        bank_account_id: null,
        bank_name: '',
        reference_no: '',
        transfer_date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [bagToBoxDetails, setBagToBoxDetails] = useState({
        bag_count: '',
        box_count: '',
        bag_value: '',
        box_value: ''
    });
    const [badDebtDetails, setBadDebtDetails] = useState({
        name: '',
        amount: ''
    });
    const [billToBillDetails, setBillToBillDetails] = useState({
        customer_code: '',
        customer_bill_no: '',
        customer_bill_value: '',
        farmer_code: '',
        farmer_bill_no: '',
        farmer_bill_value: ''
    });

    // Function to show payment history
    const handleShowPaymentHistory = async () => {
        if (!selectedSupplier || !selectedBillNo) return;
        
        try {
            const response = await api.get(`/supplier-loan/payment-history?code=${selectedSupplier}&bill_no=${selectedBillNo}`);
            if (response.data.success) {
                setPaymentHistory(response.data.data);
                setIsPaymentHistoryModalOpen(true);
            }
        } catch (error) {
            console.error("Error fetching payment history:", error);
            alert("ගෙවීම් ඉතිහාසය ලබාගැනීම අසාර්ථක විය.");
        }
    };

    // Function to fetch the summary data
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

    // Initial Fetch
    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // Fetching loans for unprinted section
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

    useEffect(() => {
        fetchSummary();
        fetchLoanSummary();
        fetchAllSuppliersList();
    }, [fetchSummary, fetchLoanSummary]);

    useEffect(() => {
        const fetchBanks = async () => {
            try {
                const response = await api.get('/banks');
                if (response.data.success) setBanks(response.data.data);
            } catch (error) {
                console.error("Error fetching banks:", error);
            }
        };
        fetchBanks();
    }, []);

    // Context Menu Handlers
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

    // Handle Delete Record
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

    // Farmer Report Logic
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

    // Handle Advance Entry Form Submission
    const handleAdvanceSubmit = async (e) => {
        e.preventDefault();
        setAdvanceLoading(true);
        setAdvanceStatus({ type: '', text: '' });

        try {
            const response = await api.post('/suppliers/advance', advancePayload);
            setAdvanceStatus({ type: 'success', text: `සාර්ථකයි! අත්තිකාරම් යාවත්කාලීන විය.` });
            setAdvanceAmount(parseFloat(response.data.data.advance_amount) || 0);
            setAdvancePayload({ ...advancePayload, advance_amount: '' });
        } catch (error) {
            console.error("Advance Update Error:", error);
            setAdvanceStatus({ type: 'error', text: 'යාවත්කාලීන කිරීම අසාර්ථක විය.' });
        } finally {
            setAdvanceLoading(false);
        }
    };

    // Update Farmer Logic
    const handleUpdateFarmer = async () => {
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

    // Filtering Logic
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

    // Handle Printed Bill Click
    const handlePrintedBillClick = async (supplierCode, billNo) => {
        setSelectedSupplier(supplierCode);
        setSelectedBillNo(billNo);
        setIsUnprintedBill(false);
        setSupplierDetails([]);
        setAdvanceAmount(0);
        setProfilePic(null);
        setPhoneNo('');
        setPayingAmount('');
        setSelectedLoanRecord(null);
        setAdvancePayload({ code: supplierCode, advance_amount: '' });
        setIsDetailsLoading(true);

        try {
            const response = await api.get(`/suppliers/bill/${billNo}/details`);
            setSupplierDetails(response.data);

            try {
                const loanRes = await api.get(`/supplier-loan/search?code=${supplierCode}&bill_no=${billNo}`);
                if (loanRes.data) {
                    setSelectedLoanRecord(loanRes.data);
                }
            } catch (loanErr) {
                console.warn("No loan record found for this selection.");
            }

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
            console.error(`❌ Error fetching printed details:`, error.message);
        } finally {
            setIsDetailsLoading(false);
        }
    };

    // Handle Unprinted Bill Click
   // Handle Unprinted Bill Click
const handleUnprintedBillClick = async (supplierCode, billNo) => {
    setSelectedSupplier(supplierCode);
    setSelectedBillNo(billNo);
    
    // First, check if this is a bad debt record by fetching loan details
    let isBadDebt = false;
    try {
        const loanRes = await api.get(`/supplier-loan/search?code=${supplierCode}&bill_no=${billNo || ''}`);
        if (loanRes.data && loanRes.data.type === 'bad_debt') {
            isBadDebt = true;
        }
    } catch (loanErr) {
        console.warn("No loan record found for this selection.");
    }
    
    // For bad debt records, treat them as printed bills (so F4 won't create new bill numbers)
    setIsUnprintedBill(!isBadDebt && !billNo);  // Only true for truly unprinted bills without bill numbers
    
    setSupplierDetails([]);
    setAdvanceAmount(0);
    setProfilePic(null);
    setPhoneNo(''); 
    setPayingAmount('');
    setSelectedLoanRecord(null);
    setAdvancePayload({ code: supplierCode, advance_amount: '' });
    setIsDetailsLoading(true);

    try {
        const response = await api.get(`/suppliers/${supplierCode}/unprinted-details2`);
        setSupplierDetails(response.data);

        try {
            const loanRes = await api.get(`/supplier-loan/search?code=${supplierCode}&bill_no=${billNo || ''}`);
            if (loanRes.data) {
                setSelectedLoanRecord(loanRes.data);
                if (loanRes.data.loan_amount) {
                    setPayingAmount(loanRes.data.loan_amount);
                }
            }
        } catch (loanErr) {
            console.warn("No existing loan record found for this selection.");
        }

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

    // Function to reset details
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

    // Helper function for details panel
    const formatDecimal = (value, decimals = 2) => (parseFloat(value) || 0).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    // Function to add telephone number
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

    // Handle loan amount submission
    const handleLoanSubmit = async (e) => {
        if (e.key === 'Enter') {
            if (!selectedSupplier || !payingAmount || parseFloat(payingAmount) <= 0) {
                setLoanStatus('⚠️ Invalid amount');
                setTimeout(() => setLoanStatus(''), 2000);
                return;
            }

            const currentTransactionIds = supplierDetails.map(record => record.id);

            if (currentTransactionIds.length === 0) {
                setLoanStatus('⚠️ No records selected');
                return;
            }

            setLoanStatus('Processing...');

            try {
                const totalAmount = totalsupplierSales - parseFloat(payingAmount);

                await api.post('/supplier-loan', {
                    code: selectedSupplier,
                    loan_amount: parseFloat(payingAmount),
                    total_amount: totalAmount,
                    bill_no: selectedBillNo || null,
                    transaction_ids: currentTransactionIds
                });

                setLoanStatus('✅ Loan saved');
                setPayingAmount('');

                setTimeout(() => {
                    handlePrint();
                }, 300);

            } catch (error) {
                console.error("Loan Update Error:", error);
                setLoanStatus(error.response && error.response.status === 422 ? '⚠️ Invalid data' : '❌ Error');
                setTimeout(() => setLoanStatus(''), 2000);
            }
        }
    };

    const getRowStyle = (index) => index % 2 === 0 ? { backgroundColor: '#f8f9fa' } : { backgroundColor: '#ffffff' };

    // CALCULATIONS
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

    <div style="margin-top:25px; border-top:1px dashed #000; padding-top:10px;"><table style="width:100%; border-collapse:collapse; font-size:14px; text-align:center;">${itemSummaryHtml}<table></div>
</div>`;
    }, [selectedSupplier, supplierDetails, totalPacksSum, totalsupplierSales, itemSummaryData, billSize, advanceAmount, paymentAmount, paymentType, payingAmount]);

    // Print function
    const handlePrint = useCallback(async () => {
        if (!supplierDetails || supplierDetails.length === 0) return;

        let finalBillNo = selectedBillNo;

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
            if (phoneNo) {
                setIsDetailsLoading(true);
                try {
                    await api.post('/suppliers/resend-sms', {
                        bill_no: selectedBillNo,
                        telephone_no: phoneNo,
                        supplier_code: selectedSupplier,
                        transaction_ids: supplierDetails.map(r => r.id),
                        advance_amount: advanceAmount,
                        is_reprint: true
                    });
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

        const content = getBillContent(finalBillNo);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`<html><body>${content}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();

            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    }, [supplierDetails, selectedBillNo, isUnprintedBill, phoneNo, advanceAmount, selectedSupplier, getBillContent]);

    // Reset payment details
    const resetPaymentDetails = () => {
        setPaymentAmount('');
        setBankName('');
        setChequeNo('');
        setRealizedDate('');
        setBankTransferDetails({
            bank_account_id: null,
            bank_name: '',
            reference_no: '',
            transfer_date: new Date().toISOString().split('T')[0],
            notes: ''
        });
        setBagToBoxDetails({
            bag_count: '',
            box_count: '',
            bag_value: '',
            box_value: ''
        });
        setBillToBillDetails({
            customer_code: '',
            customer_bill_no: '',
            customer_bill_value: '',
            farmer_code: '',
            farmer_bill_no: '',
            farmer_bill_value: ''
        });
        setBadDebtDetails({ name: '', amount: '' });
        setPendingCustomerBills([]);
        setPendingFarmerBills([]);
    };

    // Handle payment submission with proper payment_details storage
  const handlePaymentConfirm = async () => {
    let finalAmount = parseFloat(paymentAmount);
    let finalType = paymentType;
    let finalDetails = null;
    let paymentDetailsArray = [];

    if (paymentType === 'Bag to Box') {
        const bagTotal = (parseFloat(bagToBoxDetails.bag_count) || 0) * (parseFloat(bagToBoxDetails.bag_value) || 0);
        const boxTotal = (parseFloat(bagToBoxDetails.box_count) || 0) * (parseFloat(bagToBoxDetails.box_value) || 0);
        finalAmount = Math.abs(bagTotal - boxTotal);
        if (finalAmount <= 0) {
            alert("කරුණාකර නිවැරදි බෑග්/බොක්ස් අගයන් ඇතුළත් කරන්න.");
            return;
        }
        finalDetails = bagToBoxDetails;
        paymentDetailsArray.push({
            method: 'bag_to_box',
            amount: finalAmount,
            bag_count: bagToBoxDetails.bag_count,
            box_count: bagToBoxDetails.box_count,
            bag_value: bagToBoxDetails.bag_value,
            box_value: bagToBoxDetails.box_value,
            date: new Date().toISOString()
        });
    } 
    else if (paymentType === 'Bill to Bill') {
        const customerTotal = (parseFloat(billToBillDetails.customer_bill_value) || 0);
        const farmerTotal = (parseFloat(billToBillDetails.farmer_bill_value) || 0);
        finalAmount = customerTotal + farmerTotal;
        if (finalAmount <= 0 || !billToBillDetails.customer_bill_no || !billToBillDetails.farmer_bill_no) {
            alert("කරුණාකර බිල්පත් දෙකම තෝරන්න.");
            return;
        }
        finalDetails = billToBillDetails;
        paymentDetailsArray.push({
            method: 'bill_to_bill',
            amount: finalAmount,
            customer_code: billToBillDetails.customer_code,
            customer_bill_no: billToBillDetails.customer_bill_no,
            customer_bill_value: billToBillDetails.customer_bill_value,
            farmer_code: billToBillDetails.farmer_code,
            farmer_bill_no: billToBillDetails.farmer_bill_no,
            farmer_bill_value: billToBillDetails.farmer_bill_value,
            date: new Date().toISOString()
        });
    }
    else if (paymentType === 'Bad Debt') {
        if (!badDebtDetails.name || parseFloat(badDebtDetails.amount) <= 0) {
            alert("කරුණාකර නරක ණය නම සහ මුදල ඇතුළත් කරන්න.");
            return;
        }
        finalAmount = parseFloat(badDebtDetails.amount);
        finalDetails = badDebtDetails;
        paymentDetailsArray.push({
            method: 'bad_debt',
            amount: finalAmount,
            bad_debt_name: badDebtDetails.name,  // CHANGED: use bad_debt_name instead of name
            bad_debt_amount: parseFloat(badDebtDetails.amount),  // CHANGED: explicit amount
            date: new Date().toISOString()
        });
    }
    else if (paymentType === 'Bank Transfer') {
        if (!bankTransferDetails.bank_account_id || !bankTransferDetails.reference_no) {
            alert("කරුණාකර බැංකු ගිණුම සහ යොමු අංකය ඇතුළත් කරන්න.");
            return;
        }
        finalDetails = bankTransferDetails;
        paymentDetailsArray.push({
            method: 'bank_transfer',
            amount: finalAmount,
            bank_account_id: bankTransferDetails.bank_account_id,
            bank_name: bankTransferDetails.bank_name,
            reference_no: bankTransferDetails.reference_no,
            transfer_date: bankTransferDetails.transfer_date,
            notes: bankTransferDetails.notes,
            date: new Date().toISOString()
        });
    }
    else if (paymentType === 'Cheque') {
        if (!bankName || !chequeNo) {
            alert("කරුණාකර චෙක්පත් විස්තර සම්පූර්ණ කරන්න.");
            return;
        }
        finalDetails = { bank_name: bankName, cheque_no: chequeNo, realized_date: realizedDate };
        paymentDetailsArray.push({
            method: 'cheque',
            amount: finalAmount,
            bank_name: bankName,
            cheque_no: chequeNo,
            realized_date: realizedDate,
            date: new Date().toISOString()
        });
    }
    else if (paymentType === 'Cash') {
        paymentDetailsArray.push({
            method: 'cash',
            amount: finalAmount,
            date: new Date().toISOString()
        });
    }

    if (finalAmount <= 0) {
        alert("කරුණාකර නිවැරදි මුදලක් ඇතුළත් කරන්න.");
        return;
    }

    setIsDetailsLoading(true);
    try {
        let existingPaymentDetails = [];
        if (selectedLoanRecord && selectedLoanRecord.payment_details) {
            existingPaymentDetails = selectedLoanRecord.payment_details;
        }
        
        const allPaymentDetails = [...existingPaymentDetails, ...paymentDetailsArray];
        
        // BUILD THE PAYLOAD WITH ALL FIELDS AT ROOT LEVEL
        const payload = {
            code: selectedSupplier,
            loan_amount: finalAmount,
            total_amount: totalsupplierSales - finalAmount,
            bill_no: selectedBillNo || null,
            transaction_ids: supplierDetails.map(record => record.id),
            payment_details: allPaymentDetails
        };
        
        // Set type and payment-specific fields based on payment type
        if (paymentType === 'Cash') {
            payload.type = 'Cash';
        } 
        else if (paymentType === 'Cheque') {
            payload.type = 'Cheque';
            payload.bank_name = finalDetails.bank_name;
            payload.cheque_no = finalDetails.cheque_no;
            payload.realized_date = finalDetails.realized_date;
        } 
        else if (paymentType === 'Bank Transfer') {
            payload.type = 'Bank Transfer';
            payload.bank_account_id = finalDetails.bank_account_id;
            payload.bank_name = finalDetails.bank_name;
            payload.transfer_reference_no = finalDetails.reference_no;
            payload.transfer_date = finalDetails.transfer_date;
            payload.transfer_notes = finalDetails.notes;
        } 
        else if (paymentType === 'Bag to Box') {
            payload.type = 'bag_to_box';
            payload.bag_count = finalDetails.bag_count;
            payload.box_count = finalDetails.box_count;
            payload.bag_value = finalDetails.bag_value;
            payload.box_value = finalDetails.box_value;
        } 
        else if (paymentType === 'Bill to Bill') {
            payload.type = 'bill_to_bill';
            payload.target_customer_code = finalDetails.customer_code;
            payload.target_bill_no = finalDetails.customer_bill_no;
            payload.target_bill_value = finalDetails.customer_bill_value;
            payload.target_supplier_code = finalDetails.farmer_code;
            payload.target_supplier_bill_no = finalDetails.farmer_bill_no;
            payload.target_supplier_bill_value = finalDetails.farmer_bill_value;
        } 
        else if (paymentType === 'Bad Debt') {
            payload.type = 'bad_debt';
            payload.bad_debt_name = finalDetails.name;
            payload.bad_debt_amount = finalDetails.amount;
        }

        // Log the payload before sending
        console.log('Sending payload:', JSON.stringify(payload, null, 2));
        
        const response = await api.post('/supplier-loan', payload);
        
        if (response.data.success) {
            setIsPaymentModalOpen(false);
            setLoanStatus('✅ Payment saved');
            setTimeout(() => setLoanStatus(''), 2000);
            
            resetPaymentDetails();
            
            await fetchLoanSummary();
            await fetchSummary();
            
            if (isUnprintedBill) {
                await handleUnprintedBillClick(selectedSupplier, selectedBillNo);
            } else {
                await handlePrintedBillClick(selectedSupplier, selectedBillNo);
            }
            
            handlePrint();
        } else {
            alert(response.data.message || "ගෙවීම සුරැකීම අසාර්ථක විය.");
        }
        
    } catch (error) {
        console.error("Payment Error:", error);
        console.error("Error response:", error.response?.data);
        alert(error.response?.data?.message || "ගෙවීම සුරැකීම අසාර්ථක විය.");
    } finally {
        setIsDetailsLoading(false);
    }
};

    // Fetch bills for Bill to Bill
    const fetchCustomerBills = async () => {
        if (!billToBillDetails.customer_code) {
            alert("කරුණාකර ගනුදෙනුකරු කේතය ඇතුළත් කරන්න.");
            return;
        }
        setLoadingBills(true);
        try {
            const response = await api.get(`/pending-customer-bills?customer_code=${billToBillDetails.customer_code}`);
            if (response.data.success) setPendingCustomerBills(response.data.data);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoadingBills(false);
        }
    };

    const fetchFarmerBills = async () => {
        if (!billToBillDetails.farmer_code) {
            alert("කරුණාකර ගොවි කේතය ඇතුළත් කරන්න.");
            return;
        }
        setLoadingBills(true);
        try {
            const response = await api.get(`/pending-farmer-bills?supplier_code=${billToBillDetails.farmer_code}`);
            if (response.data.success) setPendingFarmerBills(response.data.data);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoadingBills(false);
        }
    };

    // Keyboard event listener
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'F1' || event.keyCode === 112) { event.preventDefault(); return false; }
            if ((event.key === 'F4' || event.keyCode === 115) && supplierDetails.length > 0 && !isDetailsLoading) {
                event.preventDefault();
                setPaymentAmount(totalsupplierSales.toString());
                setIsPaymentModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [supplierDetails, totalsupplierSales, isDetailsLoading]);

    // Render Payment History Modal
    const renderPaymentHistoryModal = () => {
        if (!isPaymentHistoryModalOpen || !paymentHistory) return null;
        
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                    <h2 style={{ color: '#091d3d', marginBottom: '20px' }}>ගෙවීම් ඉතිහාසය</h2>
                    
                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <p><strong>මුළු ගෙවූ මුදල:</strong> රු. {paymentHistory.total_paid?.toFixed(2)}</p>
                        <p><strong>ඉතිරි ශේෂය:</strong> රු. {paymentHistory.remaining_balance?.toFixed(2)}</p>
                        <p><strong>ගෙවීම් ක්‍රම:</strong> {paymentHistory.payment_methods}</p>
                    </div>
                    
                    <h3>ගෙවීම් විස්තර</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>දිනය</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>ක්‍රමය</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>මුදල</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>විස්තර</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentHistory.payments?.map((payment, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                                    <td style={{ padding: '10px' }}>{new Date(payment.date).toLocaleDateString()}</td>
                                    <td style={{ padding: '10px' }}>
                                        {payment.method === 'cash' && '💰 මුදල්'}
                                        {payment.method === 'cheque' && '💳 චෙක්පත්'}
                                        {payment.method === 'bank_transfer' && '🏦 බැංකු හුවමාරුව'}
                                        {payment.method === 'bag_to_box' && '📦 බෑග් සිට බොක්ස්'}
                                        {payment.method === 'bill_to_bill' && '📄 බිල්පත් හුවමාරුව'}
                                        {payment.method === 'bad_debt' && '⚠️ නරක ණය'}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'right' }}>රු. {payment.amount?.toFixed(2)}</td>
                                    <td style={{ padding: '10px', fontSize: '0.9rem', color: '#666' }}>
                                        {payment.method === 'cheque' && `${payment.bank_name} - ${payment.cheque_no}`}
                                        {payment.method === 'bank_transfer' && `${payment.bank_name} - ${payment.reference_no}`}
                                        {payment.method === 'bag_to_box' && `${payment.bag_count} බෑග් → ${payment.box_count} බොක්ස්`}
                                        {payment.method === 'bill_to_bill' && `${payment.customer_code}/${payment.farmer_code}`}
                                        {payment.method === 'bad_debt' && payment.name}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <button onClick={() => setIsPaymentHistoryModalOpen(false)} style={{ padding: '10px 30px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                            වසන්න
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Render Image Modal
    const renderImageModal = () => {
        if (!isImageModalOpen) return null;

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #374151', paddingBottom: '15px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                            {supplierDocs.title} - ලේඛන පරීක්ෂාව
                        </h2>
                        <button onClick={onClose} style={{ background: '#374151', border: 'none', color: 'white', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}> ✕ </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: '20px', overflowY: 'auto', padding: '5px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>ප්‍රධාන රූපය</span>
                            <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #3b82f6', backgroundColor: '#111827', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                <img src={formatUrl(supplierDocs.profile)} style={{ width: '100%', height: 'auto', display: 'block' }} alt="Profile" />
                            </div>
                        </div>

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

                    <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #374151', paddingTop: '15px' }}>
                        <button onClick={onClose} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>Close</button>
                    </div>
                </div>
            </div>
        );
    };

    // Render Edit Modal
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

                    <div style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>නව ගොවි කේතය (Supplier - Optional):</label>
                        <input
                            type="text"
                            placeholder={editingRecord.supplier_code}
                            value={newFarmerCode}
                            onChange={(e) => setNewFarmerCode(e.target.value.toUpperCase())}
                            style={{ width: '100%', padding: '10px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                            autoFocus
                        />
                    </div>

                    <div style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>නව ගැනුම්කරු (Customer - Optional):</label>
                        <input
                            type="text"
                            placeholder={editingRecord.customer_code}
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

    // Render Payment Modal
    const renderPaymentModal = () => {
        if (!isPaymentModalOpen) return null;

        return (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, overflowY: 'auto' }}>
                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <h2 style={{ color: '#091d3d', marginBottom: '20px', textAlign: 'center' }}>ගෙවීම් තහවුරු කිරීම</h2>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>ගෙවීම් ක්‍රමය:</label>
                        <select 
                            value={paymentType} 
                            onChange={(e) => setPaymentType(e.target.value)}
                            style={{ width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #ccc' }}
                        >
                            <option value="Cash">💰 මුදල් (Cash)</option>
                            <option value="Cheque">💳 චෙක්පත් (Cheque)</option>
                            <option value="Bank Transfer">🏦 බැංකු හුවමාරුව (Bank Transfer)</option>
                            <option value="Bag to Box">📦 බෑග් සිට බොක්ස් (Bag to Box)</option>
                            <option value="Bill to Bill">📄 බිල්පත් හුවමාරුව (Bill to Bill)</option>
                            <option value="Bad Debt">⚠️ නරක ණය (Bad Debt)</option>
                        </select>
                    </div>

                    {paymentType === 'Cash' && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>මුදල (Amount):</label>
                            <input 
                                type="number" 
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="ගෙවන මුදල ඇතුළත් කරන්න"
                                style={{ width: '100%', padding: '12px', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '8px', border: '2px solid #10b981' }}
                            />
                        </div>
                    )}

                    {paymentType === 'Cheque' && (
                        <>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>මුදල (Amount):</label>
                                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                            </div>
                            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#8b5cf6' }}>චෙක්පත් විස්තර</h4>
                                <div style={{ marginBottom: '10px' }}>
                                    <label>බැංකුවේ නම:</label>
                                    <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <label>චෙක්පත් අංකය:</label>
                                    <input type="text" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </div>
                                <div>
                                    <label>දිනය:</label>
                                    <input type="date" value={realizedDate} onChange={(e) => setRealizedDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </div>
                            </div>
                        </>
                    )}

                    {paymentType === 'Bank Transfer' && (
                        <>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>මුදල (Amount):</label>
                                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                            </div>
                            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#ec489a' }}>බැංකු හුවමාරු විස්තර</h4>
                                <div style={{ marginBottom: '10px' }}>
                                    <label>බැංකු ගිණුම:</label>
                                    <select value={bankTransferDetails.bank_account_id || ''} onChange={(e) => {
                                        const bank = banks.find(b => b.id === parseInt(e.target.value));
                                        setBankTransferDetails({...bankTransferDetails, bank_account_id: e.target.value ? parseInt(e.target.value) : null, bank_name: bank?.bank_name || ''});
                                    }} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                        <option value="">-- තෝරන්න --</option>
                                        {banks.map(bank => <option key={bank.id} value={bank.id}>{bank.bank_name} - {bank.branch}</option>)}
                                    </select>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <label>යොමු අංකය:</label>
                                    <input type="text" value={bankTransferDetails.reference_no} onChange={(e) => setBankTransferDetails({...bankTransferDetails, reference_no: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <label>හුවමාරු දිනය:</label>
                                    <input type="date" value={bankTransferDetails.transfer_date} onChange={(e) => setBankTransferDetails({...bankTransferDetails, transfer_date: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </div>
                                <div>
                                    <label>සටහන්:</label>
                                    <textarea value={bankTransferDetails.notes} onChange={(e) => setBankTransferDetails({...bankTransferDetails, notes: e.target.value})} rows="2" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </div>
                            </div>
                        </>
                    )}

                    {paymentType === 'Bag to Box' && (
                        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#f59e0b' }}>බෑග් සිට බොක්ස් පරිවර්තනය</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                <div><label>බෑග් ගණන:</label><input type="number" value={bagToBoxDetails.bag_count} onChange={(e) => setBagToBoxDetails({...bagToBoxDetails, bag_count: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} /></div>
                                <div><label>බෑග් අගය (Rs.):</label><input type="number" value={bagToBoxDetails.bag_value} onChange={(e) => setBagToBoxDetails({...bagToBoxDetails, bag_value: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} /></div>
                                <div><label>බොක්ස් ගණන:</label><input type="number" value={bagToBoxDetails.box_count} onChange={(e) => setBagToBoxDetails({...bagToBoxDetails, box_count: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} /></div>
                                <div><label>බොක්ස් අගය (Rs.):</label><input type="number" value={bagToBoxDetails.box_value} onChange={(e) => setBagToBoxDetails({...bagToBoxDetails, box_value: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} /></div>
                            </div>
                        </div>
                    )}

                    {paymentType === 'Bill to Bill' && (
                        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#3b82f6' }}>බිල්පත් හුවමාරුව</h4>
                            
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#eff6ff', borderRadius: '6px' }}>
                                <label><strong>ගනුදෙනුකරු කේතය:</strong></label>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                                    <input type="text" value={billToBillDetails.customer_code} onChange={(e) => setBillToBillDetails({...billToBillDetails, customer_code: e.target.value.toUpperCase()})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                    <button onClick={fetchCustomerBills} style={{ padding: '8px 15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>සෙවීම</button>
                                </div>
                                {pendingCustomerBills.length > 0 && (
                                    <select size="3" style={{ width: '100%', marginTop: '10px' }} onChange={(e) => {
                                        const bill = pendingCustomerBills.find(b => b.bill_no == e.target.value);
                                        if (bill) setBillToBillDetails({...billToBillDetails, customer_bill_no: bill.bill_no, customer_bill_value: bill.total_amount});
                                    }}>
                                        <option value="">-- බිල්පත තෝරන්න --</option>
                                        {pendingCustomerBills.map(bill => <option key={bill.bill_no} value={bill.bill_no}>Bill #{bill.bill_no} - Rs.{parseFloat(bill.total_amount).toLocaleString()}</option>)}
                                    </select>
                                )}
                            </div>

                            <div style={{ padding: '10px', backgroundColor: '#d1fae5', borderRadius: '6px' }}>
                                <label><strong>ගොවි කේතය:</strong></label>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                                    <input type="text" value={billToBillDetails.farmer_code} onChange={(e) => setBillToBillDetails({...billToBillDetails, farmer_code: e.target.value.toUpperCase()})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                    <button onClick={fetchFarmerBills} style={{ padding: '8px 15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>සෙවීම</button>
                                </div>
                                {pendingFarmerBills.length > 0 && (
                                    <select size="3" style={{ width: '100%', marginTop: '10px' }} onChange={(e) => {
                                        const bill = pendingFarmerBills.find(b => b.supplier_bill_no == e.target.value);
                                        if (bill) setBillToBillDetails({...billToBillDetails, farmer_bill_no: bill.supplier_bill_no, farmer_bill_value: bill.total_amount});
                                    }}>
                                        <option value="">-- බිල්පත තෝරන්න --</option>
                                        {pendingFarmerBills.map(bill => <option key={bill.supplier_bill_no} value={bill.supplier_bill_no}>Bill #{bill.supplier_bill_no} - Rs.{parseFloat(bill.total_amount).toLocaleString()}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                    )}

                    {paymentType === 'Bad Debt' && (
                        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#fee2e2' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>⚠️ නරක ණය ලෙස ලිවීම</h4>
                            <div style={{ marginBottom: '10px' }}>
                                <label>නම / යොමුව:</label>
                                <input type="text" value={badDebtDetails.name} onChange={(e) => setBadDebtDetails({...badDebtDetails, name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                            <div>
                                <label>මුදල (Rs.):</label>
                                <input type="number" value={badDebtDetails.amount} onChange={(e) => setBadDebtDetails({...badDebtDetails, amount: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                        <button onClick={handlePaymentConfirm} style={{ flex: 1, padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>තහවුරු කරන්න</button>
                        <button onClick={() => { setIsPaymentModalOpen(false); resetPaymentDetails(); }} style={{ flex: 1, padding: '15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>අවලංගු කරන්න</button>
                    </div>
                </div>
            </div>
        );
    };

    // Render Farmer Selector Modal
    const renderFarmerSelectorModal = () => {
        if (!isFarmerModalOpen) return null;
        return (
            <div style={modalOverlayStyle}>
                <div style={selectionModalContainer}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#1a2a6c' }}>සැපයුම්කරු වාර්තාව</h3>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>වාර්තාව බැලීම සඳහා සැපයුම්කරු තෝරන්න</p>
                    <select style={modernSelect} value={selectedFarmerForReport} onChange={(e) => setSelectedFarmerForReport(e.target.value)}>
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

    // Render Full Report View
    const renderFullReportView = () => {
        if (!fullReportData) return null;
        const { profile, loans, sales } = fullReportData;
        const storageUrl = "https://goviraju.lk/sms_new_backend_50500/application/public/storage/";

        return (
            <div style={fullScreenReportOverlay}>
                <div style={reportContainerPaper}>
                    <button onClick={() => setFullReportData(null)} style={closeReportFloatingBtn}>✕ වසන්න</button>
                    
                    <div style={reportProfileHeader}>
                        <img src={profile.profile_pic ? `${storageUrl}${profile.profile_pic}` : 'https://via.placeholder.com/150'} style={reportHeaderPic} alt="Farmer" />
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

    // Supplier Code List Component
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

    // Render Details Panel
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: "1.5rem", color: "white", margin: 0 }}>
                            ගනුදෙනු විස්තර (බිල් අංකය: <strong>{selectedBillNo || 'N/A'}</strong>)
                        </h2>
                        {selectedSupplier && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                                        cursor: !selectedSupplier ? 'not-allowed' : 'text'
                                    }}
                                />
                                {loanStatus && (
                                    <span style={{ fontSize: '0.9rem', color: loanStatus.includes('✅') ? '#00ff00' : (loanStatus.includes('⚠️') ? '#ffc107' : '#ff4444'), fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                                        {loanStatus}
                                    </span>
                                )}
                                {totalsupplierSales > 0 && (
                                    <span style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px 15px', borderRadius: '8px' }}>
                                        ගෙවිය යුතු: රු. {totalsupplierSales.toFixed(2)}
                                    </span>
                                )}
                                {selectedLoanRecord && selectedLoanRecord.total_amount > 0 && (
                                    <button
                                        onClick={handleShowPaymentHistory}
                                        style={{
                                            padding: '8px 15px',
                                            backgroundColor: '#17a2b8',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📜 ගෙවීම් ඉතිහාසය
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

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
                            backgroundColor: '#6f42c1',
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
                    <button style={{ padding: '8px 15px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#e83e8c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => navigate('/supplierreport')}>මුල් පිටුව</button>
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
                                            onContextMenu={(e) => handleContextMenu(e, loan)}
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
            {renderPaymentHistoryModal()}
        </>
    );
};

// STYLES
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