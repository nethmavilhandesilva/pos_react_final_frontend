import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import api from "../../api";
import ItemReportModal from '../Itemrepo/ItemReportModal';
import WeightReportModal from '../WeightReport/WeightReportModal';
import GrnSaleReportModal from '../GrnSale/ReportModal';
import GrnReportModal from '../GrnReport/GrnReportModal';
import SalesAdjustmentReportModal from '../SalesAdjustmentReport/SalesAdjustmentReportModal';
import GrnSalesOverviewReport from '../GrnSalesOverview/GrnSalesOverviewReport';
import GrnSalesOverviewReport2 from '../GrnSalesOverview/GrnSalesOverviewReport2';
import SalesReportModal from '../SalesReport/SalesReportModal';
import DayProcessModal from '../Modals/DayProcessModal';
import { useNavigate } from 'react-router-dom';

const routes = {
    sales: "/sales",
    customers: "/customers",
    getAllSales: "/sales/all",
    getArchivedSales: "/sales/archived",
    updateGivenAmountApplied: "/sales/update-given-amount-applied",
    getBanks: "/banks",
    applyAdjustment: "/adjustments/apply",
    pendingCustomerBills: "/adjustments/pending-customer-bills",
    pendingFarmerBills: "/adjustments/pending-farmer-bills",
    paymentHistory: "/sales/payment-history",
    checkCustomer: "/customers/check-short-name",
    updateDebtorStatus: "/customers/update-debtor-status",
    paymentReport: "/sales/payment-report",
    dashboardStats: "/sales/dashboard-stats",
    debtors: {
        create: "/debtors/create",
        updatePayment: "/debtors/update-payment",
        getByBill: "/debtors",
        getByCustomer: "/debtors/customer",
        getPending: "/debtors/pending/all"
    }
};

// ==================== HELPER FUNCTIONS ====================
const formatDecimal = (value) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value || 0));
};

const processBillData = (salesData) => {
    const pendingMap = {};
    const appliedMap = {};

    salesData.filter(s => s.bill_printed === 'Y' && s.bill_no).forEach(sale => {
        const billNo = sale.bill_no;
        let paymentHistory = [];
        if (sale.payment_history) {
            try {
                paymentHistory = typeof sale.payment_history === 'string' ? JSON.parse(sale.payment_history) : sale.payment_history;
                if (!Array.isArray(paymentHistory)) paymentHistory = [];
            } catch (e) { paymentHistory = []; }
        }

        let creditAmount = 0, cashPayments = 0, totalGivenAmount = 0;
        paymentHistory.forEach(payment => {
            const amount = parseFloat(payment.amount) || 0;
            totalGivenAmount += amount;
            if (payment.method === 'Credit') creditAmount += amount;
            else if (['Cash', 'Cheque', 'Bank Transfer'].includes(payment.method)) cashPayments += amount;
        });

        const finalGivenAmount = totalGivenAmount || sale.given_amount || 0;
        const finalCashPayments = cashPayments || sale.given_amount || 0;
        const finalCreditAmount = creditAmount;

        const isApplied = sale.given_amount_applied === 'Y';
        const targetMap = isApplied ? appliedMap : pendingMap;

        if (!targetMap[billNo]) {
            targetMap[billNo] = {
                billNo, customerCode: sale.customer_code, sales: [], totalAmount: 0,
                givenAmount: finalGivenAmount, cashPayments: finalCashPayments, creditAmount: finalCreditAmount,
                givenAmountApplied: sale.given_amount_applied || 'N', paymentAdjustmentType: sale.payment_adjustment_type || null,
                createdAt: sale.created_at, chequeDetails: sale.cheq_no ? { cheq_no: sale.cheq_no, cheq_date: sale.cheq_date, bank_name: sale.bank_name } : null,
                transferDetails: sale.transfer_reference_no ? { reference_no: sale.transfer_reference_no, transfer_date: sale.transfer_date } : null,
                paymentHistory
            };
        }
        targetMap[billNo].sales.push(sale);
        targetMap[billNo].totalAmount += (parseFloat(sale.total) || 0) + ((parseFloat(sale.packs) || 0) * (parseFloat(sale.CustomerPackCost) || 0));
    });

    return {
        pendingBills: Object.values(pendingMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        appliedBills: Object.values(appliedMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    };
};

// ==================== CUSTOMER TYPE SELECTOR ====================
const CustomerTypeSelector = ({ selectedType, onSelect, disabled = false, onDebtorClick, billCustomerCode = null, billNo = null, selectedBillDebtor = null }) => {
    const [showDebtorConfirm, setShowDebtorConfirm] = useState(false);
    const [customerCode, setCustomerCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [matchingCustomers, setMatchingCustomers] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [allCustomers, setAllCustomers] = useState([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [selectedFromDropdown, setSelectedFromDropdown] = useState(false);
    const [customersLoaded, setCustomersLoaded] = useState(false);

    // Check if bill has an existing debtor number
    const billHasDebtor = selectedBillDebtor?.Debtor_no;

    useEffect(() => { fetchAllCustomers(); }, []);
    useEffect(() => { if (showDebtorConfirm && !customersLoaded) fetchAllCustomers(); }, [showDebtorConfirm]);

    const fetchAllCustomers = async () => {
        setIsLoadingCustomers(true);
        try {
            const response = await api.get(routes.customers);
            let customersData = [];
            if (Array.isArray(response.data)) customersData = response.data;
            else if (response.data.data && Array.isArray(response.data.data)) customersData = response.data.data;
            else if (response.data.customers && Array.isArray(response.data.customers)) customersData = response.data.customers;
            setAllCustomers(customersData);
            setCustomersLoaded(true);
        } catch (error) { console.error('Error fetching customers:', error); alert('Failed to load customers list.'); }
        finally { setIsLoadingCustomers(false); }
    };

    useEffect(() => {
        if (showDebtorConfirm && billCustomerCode) {
            setCustomerCode(billCustomerCode);
            setSelectedFromDropdown(false);
            const timer = setTimeout(() => {
                if (allCustomers.length) searchMatchingCustomers(billCustomerCode);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [showDebtorConfirm, billCustomerCode, allCustomers.length]);

    const searchMatchingCustomers = (searchTerm) => {
        if (!searchTerm?.trim()) { setMatchingCustomers([]); setShowSuggestions(false); return; }
        const term = searchTerm.toUpperCase();
        const matches = allCustomers.filter(c => (c.short_name || '').toUpperCase() === term || (c.short_name || '').toUpperCase().startsWith(term)).slice(0, 10);
        setMatchingCustomers(matches);
        setShowSuggestions(matches.length > 0);
    };

    const handleCustomerCodeChange = (e) => {
        const value = e.target.value.toUpperCase();
        setCustomerCode(value);
        setSelectedFromDropdown(false);
        searchMatchingCustomers(value);
    };

    const handleSelectCustomer = (customer) => {
        setCustomerCode(customer.short_name);
        setSelectedFromDropdown(true);
        setShowSuggestions(false);
        const msg = customer.Debtor === 'Y' && customer.Debtor_no
            ? `✅ Customer "${customer.short_name}" selected!\n📋 Debtor Number: ${customer.Debtor_no}`
            : `👤 Customer "${customer.short_name}" selected!`;
        alert(msg);
        setTimeout(() => handleCheckCustomerWithCode(customer.short_name, true, customer), 100);
    };

    const handleCheckCustomerWithCode = async (code, useExisting = false, selectedCustomerData = null) => {
        if (!code.trim()) { alert('Please enter a customer code'); return; }
        setLoading(true);
        try {
            let customerData, selectedDebtorNo, selectedCustomerId;
            if (selectedCustomerData) {
                customerData = { exists: true, customer: selectedCustomerData };
                selectedDebtorNo = selectedCustomerData.Debtor_no;
                selectedCustomerId = selectedCustomerData.id;
            } else {
                const response = await api.get(`${routes.checkCustomer}/${code}`);
                customerData = response.data;
                selectedDebtorNo = customerData.customer?.Debtor_no;
                selectedCustomerId = customerData.customer?.id;
            }

            if (customerData.exists && (selectedFromDropdown || useExisting)) {
                const updateResponse = await api.put(routes.updateDebtorStatus, { short_name: code, customer_id: selectedCustomerId, Debtor: 'Y', bill_no: billNo });
                const debtorNo = updateResponse.data.debtor_no || selectedDebtorNo;
                alert(updateResponse.data.was_new_record_created
                    ? `✅ New debtor record created for Bill #${billNo}\n📋 Debtor Number: ${debtorNo}`
                    : `✅ Using EXISTING Debtor!\n📋 Customer: ${code}\n📋 Debtor Number: ${debtorNo || 'N/A'}`);
                setShowDebtorConfirm(false);
                onSelect('walking');
                resetCustomerState();
            } else if (customerData.exists) {
                const confirmNew = window.confirm(`⚠️ Customer "${code}" exists but not selected from dropdown.\nDo you want to CREATE a NEW debtor record?`);
                if (confirmNew) {
                    alert(`✅ Creating NEW debtor record for "${code}".`);
                    setShowDebtorConfirm(false);
                    onDebtorClick(code, billNo);
                    resetCustomerState();
                } else {
                    await api.put(routes.updateDebtorStatus, { short_name: code, customer_id: selectedCustomerId, Debtor: 'Y', bill_no: billNo });
                    alert(`✅ Using EXISTING debtor record for "${code}".`);
                    setShowDebtorConfirm(false);
                    onSelect('walking');
                    resetCustomerState();
                }
            } else {
                setShowDebtorConfirm(false);
                onDebtorClick(code, billNo);
                resetCustomerState();
            }
        } catch (error) { console.error('Error:', error); alert('Failed to check customer.'); }
        finally { setLoading(false); }
    };

    const resetCustomerState = () => {
        setCustomerCode('');
        setMatchingCustomers([]);
        setShowSuggestions(false);
        setSelectedFromDropdown(false);
    };

    const handleSkip = () => { setShowDebtorConfirm(false); resetCustomerState(); };

    // Check if no type is selected AND there's no existing debtor
    const noTypeSelected = !selectedType && !billHasDebtor;

    return (
        <>
            <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', borderRadius: '12px', border: '2px solid #bae6fd' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '12px', color: '#0369a1' }}>👤 Customer Type</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => onSelect('walking')}
                        disabled={disabled || !!billHasDebtor}
                        style={{
                            flex: 1, padding: '10px',
                            background: selectedType === 'walking' ? 'linear-gradient(135deg, #10b981, #059669)' : 'white',
                            color: selectedType === 'walking' ? 'white' : '#475569',
                            border: selectedType === 'walking' ? 'none' : '2px solid #e2e8f0',
                            borderRadius: '10px',
                            cursor: (disabled || billHasDebtor) ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            opacity: (disabled || billHasDebtor) ? 0.6 : 1
                        }}
                    >
                        🚶 Walking Customer
                    </button>
                    <button
                        onClick={() => setShowDebtorConfirm(true)}
                        disabled={disabled || !!billHasDebtor}
                        style={{
                            flex: 1, padding: '10px',
                            background: (selectedType === 'debtor' || billHasDebtor) ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'white',
                            color: (selectedType === 'debtor' || billHasDebtor) ? 'white' : '#475569',
                            border: (selectedType === 'debtor' || billHasDebtor) ? 'none' : '2px solid #e2e8f0',
                            borderRadius: '10px',
                            cursor: (disabled || billHasDebtor) ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            opacity: (disabled || billHasDebtor) ? 0.6 : 1
                        }}
                    >
                        📋 Debtor
                    </button>
                </div>

                {/* Show warning only when no type selected AND no existing debtor */}
                {noTypeSelected && !billHasDebtor && (
                    <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '8px', textAlign: 'center', fontWeight: '500' }}>
                        ⚠️ Please select customer type to continue
                    </div>
                )}

                {/* Show success message when bill has existing debtor */}
                {billHasDebtor && (
                    <div style={{ fontSize: '10px', color: '#059669', marginTop: '8px', textAlign: 'center', fontWeight: '500', background: '#d1fae5', padding: '6px', borderRadius: '8px' }}>
                        ✅ Debtor Bill - Customer Type: Debtor (Auto-selected)
                    </div>
                )}

                {/* Show selected type message when not auto-selected */}
                {!noTypeSelected && !billHasDebtor && (
                    <div style={{ fontSize: '10px', color: '#0369a1', marginTop: '8px', textAlign: 'center' }}>
                        ✅ Customer type selected: {selectedType === 'walking' ? 'Walking Customer' : 'Debtor'}
                    </div>
                )}
            </div>

            {showDebtorConfirm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20000 }} onClick={() => setShowDebtorConfirm(false)}>
                    <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '500px', maxWidth: '90%', padding: '24px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <span style={{ fontSize: '48px' }}>📋</span>
                            <h3 style={{ margin: '10px 0 5px', fontSize: '18px', fontWeight: '700' }}>{billCustomerCode ? `Register Debtor: ${billCustomerCode}` : 'Enter Customer Code'}</h3>
                            {billNo && <p style={{ fontSize: '11px', color: '#92400e' }}>Bill Number: {billNo}</p>}
                        </div>
                        <div style={{ marginBottom: '20px', position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>Customer Code</label>
                            <input type="text" value={customerCode} onChange={handleCustomerCodeChange} placeholder="Enter customer code" autoFocus style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', outline: 'none', fontFamily: 'monospace', fontWeight: 'bold' }} onKeyPress={e => e.key === 'Enter' && handleCheckCustomerWithCode(customerCode)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} />
                            {isLoadingCustomers && <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px' }}>⏳ Loading customers...</div>}
                            {!isLoadingCustomers && showSuggestions && matchingCustomers.length > 0 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 20001, maxHeight: '300px', overflowY: 'auto', marginTop: '4px' }}>
                                    {matchingCustomers.map((c, i) => (
                                        <div key={i} onClick={() => handleSelectCustomer(c)} style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: i < matchingCustomers.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div><div style={{ fontWeight: 'bold' }}>{c.short_name}</div><div style={{ fontSize: '11px', color: '#64748b' }}>{c.name || 'No name'}</div></div>
                                            <div style={{ background: c.Debtor === 'Y' ? '#fef3c7' : '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: c.Debtor === 'Y' ? '#92400e' : '#64748b' }}>{c.Debtor === 'Y' ? `📋 Debtor: ${c.Debtor_no || 'N/A'}` : '👤 Regular'}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ background: '#e0f2fe', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}><strong>📌 How it works:</strong><br />• <strong>Select from dropdown</strong> → Use existing customer (same Debtor No)<br />• <strong>Type & click Continue</strong> → Create NEW debtor (different Debtor No)</div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={handleSkip} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Cancel</button>
                            <button onClick={() => handleCheckCustomerWithCode(customerCode)} disabled={loading} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px', opacity: loading ? 0.6 : 1 }}>{loading ? 'Checking...' : 'Continue'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
// ==================== DEBTOR FORM MODAL ====================
const DebtorFormModal = ({ isOpen, onClose, onSave, customerCode, billNo = null }) => {
    const [formData, setFormData] = useState({ name: '', ID_NO: '', telephone_no: '', address: '', credit_limit: '', profile_pic: null, nic_front: null, nic_back: null });
    const [loading, setLoading] = useState(false);
    const [previewImages, setPreviewImages] = useState({ profile_pic: null, nic_front: null, nic_back: null });
    const [generatedDebtorNo, setGeneratedDebtorNo] = useState(null);

    useEffect(() => { if (isOpen && customerCode) setGeneratedDebtorNo(null); }, [isOpen, customerCode]);
    if (!isOpen) return null;

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (files[0]) {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
            const reader = new FileReader();
            reader.onloadend = () => setPreviewImages(prev => ({ ...prev, [name]: reader.result }));
            reader.readAsDataURL(files[0]);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('short_name', customerCode.toUpperCase());
            if (formData.name) formDataToSend.append('name', formData.name);
            if (formData.ID_NO) formDataToSend.append('ID_NO', formData.ID_NO);
            if (formData.telephone_no) formDataToSend.append('telephone_no', formData.telephone_no);
            if (formData.address) formDataToSend.append('address', formData.address);
            if (formData.credit_limit) formDataToSend.append('credit_limit', formData.credit_limit);
            formDataToSend.append('Debtor', 'Y');
            if (billNo) formDataToSend.append('bill_no', billNo);
            if (formData.profile_pic) formDataToSend.append('profile_pic', formData.profile_pic);
            if (formData.nic_front) formDataToSend.append('nic_front', formData.nic_front);
            if (formData.nic_back) formDataToSend.append('nic_back', formData.nic_back);

            const response = await api.post('/customers', formDataToSend, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (response.status === 200 || response.status === 201) {
                const debtorNo = response.data.Debtor_no;
                setGeneratedDebtorNo(debtorNo);
                alert(`Customer registered as Debtor successfully!\nDebtor Number: ${debtorNo}${billNo ? `\nBill No: ${billNo}` : ''}`);
                onSave(true, debtorNo);
                onClose();
            }
        } catch (error) { console.error('Error saving debtor:', error); alert('Failed to save debtor information.'); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '500px', maxWidth: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '20px 20px 0 0' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}><span>📝</span> Register Debtor: {customerCode}{billNo && <span style={{ fontSize: '12px' }}>(Bill: {billNo})</span>}</h3>
                </div>
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {generatedDebtorNo && <div style={{ background: '#d1fae5', padding: '12px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center' }}><div style={{ fontSize: '12px', color: '#065f46' }}>Debtor Number</div><div style={{ fontSize: '20px', fontWeight: 'bold', color: '#047857' }}>{generatedDebtorNo}</div></div>}
                    <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#92400e' }}>⚠️ Customer "{customerCode}" not found. Please provide information to register as Debtor.<br /><small>All fields are optional. A unique Debtor Number will be automatically generated.{billNo && <><br /><small>This debtor will be linked to Bill No: {billNo}</small></>}</small></div>

                    {/* Text fields with enter key navigation */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>Full Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.querySelector('input[name="ID_NO"]').focus();
                                }
                            }}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>ID Number</label>
                        <input
                            type="text"
                            name="ID_NO"
                            value={formData.ID_NO}
                            onChange={handleChange}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.querySelector('input[name="telephone_no"]').focus();
                                }
                            }}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>Telephone Number</label>
                        <input
                            type="text"
                            name="telephone_no"
                            value={formData.telephone_no}
                            onChange={handleChange}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.querySelector('textarea[name="address"]').focus();
                                }
                            }}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    document.querySelector('input[name="credit_limit"]').focus();
                                }
                            }}
                            rows="2"
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>Credit Limit (Rs.)</label>
                        <input
                            type="number"
                            name="credit_limit"
                            value={formData.credit_limit}
                            onChange={handleChange}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.querySelector('input[name="profile_pic_file"]')?.focus();
                                }
                            }}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                        />
                    </div>

                    {/* File upload fields - Enter key skips to next or submits on last */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>Profile Picture</label>
                        <input
                            type="file"
                            name="profile_pic"
                            onChange={handleFileChange}
                            accept="image/jpeg,image/jpg,image/png"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.querySelector('input[name="nic_front"]').focus();
                                }
                            }}
                            style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                        />
                        {previewImages.profile_pic && <img src={previewImages.profile_pic} alt="Preview" style={{ marginTop: '6px', maxWidth: '100%', maxHeight: '80px', borderRadius: '6px' }} />}
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>NIC Front</label>
                        <input
                            type="file"
                            name="nic_front"
                            onChange={handleFileChange}
                            accept="image/jpeg,image/jpg,image/png"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.querySelector('input[name="nic_back"]').focus();
                                }
                            }}
                            style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                        />
                        {previewImages.nic_front && <img src={previewImages.nic_front} alt="Preview" style={{ marginTop: '6px', maxWidth: '100%', maxHeight: '80px', borderRadius: '6px' }} />}
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>NIC Back</label>
                        <input
                            type="file"
                            name="nic_back"
                            onChange={handleFileChange}
                            accept="image/jpeg,image/jpg,image/png"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    // On last field, submit the form
                                    handleSubmit();
                                }
                            }}
                            style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                        />
                        {previewImages.nic_back && <img src={previewImages.nic_back} alt="Preview" style={{ marginTop: '6px', maxWidth: '100%', maxHeight: '80px', borderRadius: '6px' }} />}
                    </div>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc', borderRadius: '0 0 20px 20px' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>Skip</button>
                    <button onClick={handleSubmit} disabled={loading} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #4CAF50, #45a049)', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '12px', opacity: loading ? 0.6 : 1 }}>{loading ? 'Saving...' : 'Save & Continue'}</button>
                </div>
            </div>
        </div>
    );
};

// ==================== BANK ACCOUNT SELECTOR ====================
const BankAccountSelector = ({ selectedAccountId, onSelect, disabled = false }) => {
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => { fetchBanks(); }, []);

    const fetchBanks = async () => {
        setLoading(true);
        try {
            const response = await api.get(routes.getBanks);
            if (response.data.success) setBanks(response.data.data);
            else setError('Failed to load bank accounts');
        } catch (error) { setError('Unable to load bank accounts'); }
        finally { setLoading(false); }
    };

    if (loading) return <div style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Loading bank accounts...</div>;
    if (error) return <div style={{ padding: '10px', textAlign: 'center', color: '#ef4444', fontSize: '12px' }}>{error}</div>;

    return (
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#334155' }}>Select Bank Account <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={selectedAccountId || ''} onChange={(e) => onSelect(e.target.value ? parseInt(e.target.value) : null)} disabled={disabled} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', cursor: 'pointer' }}>
                <option value="">-- Select Bank Account --</option>
                {banks.map(bank => (<option key={bank.id} value={bank.id}>{bank.bank_name} - {bank.branch} (Acc: {bank.account_no})</option>))}
            </select>
        </div>
    );
};

// ==================== PAYMENT HISTORY MODAL ====================
const PaymentHistoryModal = ({ isOpen, onClose, payments, totalPaid, totalBill, remaining }) => {
    if (!isOpen) return null;

    const getPaymentMethodStyle = (method) => {
        switch (method) {
            case 'Cash': return { backgroundColor: '#10b981', color: 'white' };
            case 'Cheque': return { backgroundColor: '#8b5cf6', color: 'white' };
            case 'Bank Transfer': return { backgroundColor: '#ec489a', color: 'white' };
            case 'bag_to_box': return { backgroundColor: '#f59e0b', color: 'white' };
            case 'bill_to_bill': return { backgroundColor: '#3b82f6', color: 'white' };
            case 'bad_debt': return { backgroundColor: '#ef4444', color: 'white' };
            default: return { backgroundColor: '#6b7280', color: 'white' };
        }
    };

    const getPaymentIcon = (method) => {
        switch (method) {
            case 'Cash': return '💰';
            case 'Cheque': return '💳';
            case 'Bank Transfer': return '🏦';
            case 'bag_to_box': return '📦';
            case 'bill_to_bill': return '📄';
            case 'bad_debt': return '⚠️';
            default: return '💵';
        }
    };

    const getMethodDisplayName = (method) => {
        switch (method) {
            case 'bag_to_box': return 'Bag to Box';
            case 'bill_to_bill': return 'Bill to Bill';
            case 'bad_debt': return 'Bad Debt';
            default: return method;
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '550px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Payment History</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#64748b' }}>Total Bill</div><div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(totalBill)}</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#64748b' }}>Total Paid</div><div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalPaid)}</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#64748b' }}>Remaining</div><div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(remaining)}</div></div>
                </div>
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {payments && payments.length > 0 ? payments.map((payment, index) => (
                        <div key={index} style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: '600' }}>Payment #{index + 1}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(payment.date).toLocaleString()}</div>
                                {payment.reference && <div style={{ fontSize: '11px', color: '#64748b' }}>Ref: {payment.reference}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', ...getPaymentMethodStyle(payment.method) }}>{getPaymentIcon(payment.method)} {getMethodDisplayName(payment.method)}</span>
                                <div style={{ fontWeight: 'bold', marginTop: '8px' }}>{formatCurrency(payment.amount)}</div>
                            </div>
                        </div>
                    )) : <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No payment history available</div>}
                </div>
                <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <button onClick={onClose} style={{ padding: '8px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        </div>
    );
};

const formatCurrency = (amount) => `Rs. ${formatDecimal(amount)}`;

// ==================== CHEQUE MODAL ====================
const ChequeModal = ({ isOpen, onClose, onConfirm, amount }) => {
    const [chequeDetails, setChequeDetails] = useState({ cheq_date: '', cheq_no: '', bank_account_id: null });
    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!chequeDetails.cheq_date || !chequeDetails.cheq_no || !chequeDetails.bank_account_id) {
            alert("Please fill all cheque details and select a bank account");
            return;
        }
        onConfirm(chequeDetails);
        setChequeDetails({ cheq_date: '', cheq_no: '', bank_account_id: null });
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', width: '380px', maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '24px' }}>💳</span>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Cheque Payment</h3>
                </div>
                <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '12px' }}>Payment Amount</div>
                    <div style={{ fontSize: '22px', fontWeight: '800' }}>Rs. {amount.toFixed(2)}</div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>📅 Cheque Date <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="date" name="cheq_date" value={chequeDetails.cheq_date} onChange={(e) => setChequeDetails(prev => ({ ...prev, cheq_date: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px' }} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>🔢 Cheque Number <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" name="cheq_no" value={chequeDetails.cheq_no} onChange={(e) => setChequeDetails(prev => ({ ...prev, cheq_no: e.target.value }))} placeholder="Enter cheque number" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px' }} />
                </div>
                <div style={{ marginBottom: '18px' }}>
                    <BankAccountSelector selectedAccountId={chequeDetails.bank_account_id} onSelect={(bankId) => setChequeDetails(prev => ({ ...prev, bank_account_id: bankId }))} disabled={false} />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', flex: 1 }}>Cancel</button>
                    <button onClick={handleSubmit} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', flex: 1 }}>Confirm Payment</button>
                </div>
            </div>
        </div>
    );
};

// ==================== BANK TO BANK MODAL ====================
const BankToBankModal = ({ isOpen, onClose, onConfirm, amount, customerCode, customerName }) => {
    const [transferDetails, setTransferDetails] = useState({ bank_account_id: null, reference_no: '', transfer_date: new Date().toISOString().split('T')[0], notes: '' });
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { if (isOpen) fetchBanks(); }, [isOpen]);

    const fetchBanks = async () => {
        setLoading(true);
        try {
            const response = await api.get(routes.getBanks);
            if (response.data.success) setBanks(response.data.data);
        } catch (error) { console.error('Error fetching banks:', error); }
        finally { setLoading(false); }
    };

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!transferDetails.bank_account_id) { alert("Please select a bank account"); return; }
        if (!transferDetails.reference_no) { alert("Please enter transaction reference number"); return; }
        onConfirm(transferDetails);
        setTransferDetails({ bank_account_id: null, reference_no: '', transfer_date: new Date().toISOString().split('T')[0], notes: '' });
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '500px', maxWidth: '90%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #ec489a, #db2777)', borderRadius: '20px 20px 0 0' }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: '700' }}>🏦 Bank to Bank Transfer</h3>
                </div>
                <div style={{ padding: '24px' }}>
                    <div style={{ background: '#fdf2f8', padding: '16px', borderRadius: '14px', marginBottom: '24px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>💰 Payment Details</div>
                        <div style={{ fontSize: '13px' }}><strong>Amount:</strong> Rs. {amount.toFixed(2)}<br /><strong>Customer:</strong> {customerName || customerCode}</div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>🏦 Select Bank Account <span style={{ color: '#ef4444' }}>*</span></label>
                        <select value={transferDetails.bank_account_id || ''} onChange={(e) => setTransferDetails(prev => ({ ...prev, bank_account_id: e.target.value ? parseInt(e.target.value) : null }))} disabled={loading} style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }}>
                            <option value="">-- Select Bank Account --</option>
                            {banks.map(bank => (<option key={bank.id} value={bank.id}>{bank.bank_name} - {bank.branch} (Acc: {bank.account_no})</option>))}
                        </select>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>🔢 Transaction Reference Number <span style={{ color: '#ef4444' }}>*</span></label>
                        <input type="text" value={transferDetails.reference_no} onChange={(e) => setTransferDetails(prev => ({ ...prev, reference_no: e.target.value }))} placeholder="Enter transaction ID" style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }} />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>📅 Transfer Date <span style={{ color: '#ef4444' }}>*</span></label>
                        <input type="date" value={transferDetails.transfer_date} onChange={(e) => setTransferDetails(prev => ({ ...prev, transfer_date: e.target.value }))} style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }} />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>📝 Notes (Optional)</label>
                        <textarea value={transferDetails.notes} onChange={(e) => setTransferDetails(prev => ({ ...prev, notes: e.target.value }))} rows="3" style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                        <button onClick={onClose} style={{ padding: '10px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Cancel</button>
                        <button onClick={handleSubmit} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #ec489a, #db2777)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Confirm Transfer</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==================== PAYMENT ADJUSTMENT MODAL ====================
// ==================== PAYMENT ADJUSTMENT MODAL ====================
const PaymentAdjustmentModal = ({ isOpen, onClose, onConfirm, billNo, customerCode, originalBillTotal }) => {
    const [adjustmentType, setAdjustmentType] = useState('bag_to_box');
    const [bagCount, setBagCount] = useState('');
    const [boxCount, setBoxCount] = useState('');
    const [bagValue, setBagValue] = useState('');
    const [boxValue, setBoxValue] = useState('');
    const [customerCodeField, setCustomerCodeField] = useState('');
    const [customerBillNo, setCustomerBillNo] = useState('');
    const [customerBillValue, setCustomerBillValue] = useState('');
    const [badDebtName, setBadDebtName] = useState('');
    const [badDebtAmount, setBadDebtAmount] = useState('');

    if (!isOpen) return null;

    const calculateBagToBoxAdjustment = () => {
        const amount = ((parseInt(state.bagCount) || 0) * (parseFloat(state.bagValue) || 0)) +
            ((parseInt(state.boxCount) || 0) * (parseFloat(state.boxValue) || 0));
        const maxAmount = selectedBillDebtor?.remaining_amount > 0
            ? selectedBillDebtor.remaining_amount
            : (state.selectedBill ? (state.selectedBill.totalAmount - (state.selectedBill.givenAmount || 0)) : Infinity);
        if (amount > maxAmount) {
            setTimeout(() => alert(`Adjustment amount cannot exceed maximum allowed amount of Rs. ${formatDecimal(maxAmount)}`), 100);
            return 0;
        }
        return amount;
    };

    const handleConfirm = () => {
        const adjustmentData = { adjustment_type: adjustmentType, original_bill_total: originalBillTotal };

        if (adjustmentType === 'bag_to_box') {
            if (!bagCount || !boxCount || !bagValue || !boxValue) {
                alert('Please fill all bag/box fields');
                return;
            }
            adjustmentData.type = 'bag_to_box';
            adjustmentData.bag_count = parseInt(bagCount);
            adjustmentData.box_count = parseInt(boxCount);
            adjustmentData.bag_value = parseFloat(bagValue);
            adjustmentData.box_value = parseFloat(boxValue);
            adjustmentData.amount = Math.abs(calculateBagToBoxAdjustment());
        }
        else if (adjustmentType === 'bill_to_bill') {
            if (!customerCodeField || !customerBillNo || !customerBillValue) {
                alert('Please fill all bill to bill fields');
                return;
            }
            adjustmentData.type = 'bill_to_bill';
            adjustmentData.customer_code = customerCodeField;
            adjustmentData.customer_bill_no = customerBillNo;
            adjustmentData.customer_bill_value = parseFloat(customerBillValue);
            adjustmentData.amount = parseFloat(customerBillValue);
        }
        else if (adjustmentType === 'bad_debt') {
            if (!badDebtName || !badDebtAmount) {
                alert('Please enter bad debt name and amount');
                return;
            }
            adjustmentData.type = 'bad_debt';
            adjustmentData.bad_debt_name = badDebtName;
            adjustmentData.bad_debt_amount = parseFloat(badDebtAmount);
            adjustmentData.amount = parseFloat(badDebtAmount);
        }

        onConfirm(adjustmentData);
        onClose();
    };

    const handleTypeSelect = (type) => {
        setAdjustmentType(type);
        // Reset form fields when switching types
        setBagCount('');
        setBoxCount('');
        setBagValue('');
        setBoxValue('');
        setCustomerCodeField('');
        setCustomerBillNo('');
        setCustomerBillValue('');
        setBadDebtName('');
        setBadDebtAmount('');
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '750px', maxWidth: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '24px 24px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>🔧 Payment Adjustment</h3>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'white', width: '34px', height: '34px', borderRadius: '50%' }}>×</button>
                </div>
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {/* Three Buttons for Adjustment Types - REPLACES THE DROPDOWN */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => handleTypeSelect('bag_to_box')}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: adjustmentType === 'bag_to_box' ? 'linear-gradient(135deg, #10b981, #059669)' : '#f1f5f9',
                                color: adjustmentType === 'bag_to_box' ? 'white' : '#475569',
                                border: adjustmentType === 'bag_to_box' ? 'none' : '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '13px',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>📦</span> Bag to Box Conversion
                        </button>
                        <button
                            onClick={() => handleTypeSelect('bill_to_bill')}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: adjustmentType === 'bill_to_bill' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#f1f5f9',
                                color: adjustmentType === 'bill_to_bill' ? 'white' : '#475569',
                                border: adjustmentType === 'bill_to_bill' ? 'none' : '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '13px',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>📄</span> Bill to Bill Transfer
                        </button>
                        <button
                            onClick={() => handleTypeSelect('bad_debt')}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: adjustmentType === 'bad_debt' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#f1f5f9',
                                color: adjustmentType === 'bad_debt' ? 'white' : '#475569',
                                border: adjustmentType === 'bad_debt' ? 'none' : '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '13px',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>⚠️</span> Bad Debt Write-off
                        </button>
                    </div>

                    {/* Conditional Form Fields based on selected adjustment type */}
                    {adjustmentType === 'bag_to_box' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>📦 Number of Bags</label><input type="number" value={bagCount} onChange={(e) => setBagCount(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                                <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>💰 Value per Bag (Rs.)</label><input type="number" value={bagValue} onChange={(e) => setBagValue(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>📦 Number of Boxes</label><input type="number" value={boxCount} onChange={(e) => setBoxCount(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                                <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>💰 Value per Box (Rs.)</label><input type="number" value={boxValue} onChange={(e) => setBoxValue(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                            </div>
                            <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600' }}>📊 Adjustment Summary</div>
                                <div style={{ fontSize: '12px' }}>Adjustment Amount: Rs. {Math.abs(calculateBagToBoxAdjustment()).toFixed(2)}</div>
                            </div>
                        </>
                    )}

                    {adjustmentType === 'bill_to_bill' && (
                        <>
                            <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>🏢 Customer Bill Transfer</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>Customer Code</label><input type="text" value={customerCodeField} onChange={(e) => setCustomerCodeField(e.target.value.toUpperCase())} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                                    <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>Customer Bill No</label><input type="text" value={customerBillNo} onChange={(e) => setCustomerBillNo(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                                </div>
                                <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>Bill Amount (Rs.)</label><input type="number" value={customerBillValue} onChange={(e) => setCustomerBillValue(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                            </div>
                            <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600' }}>📊 Transfer Summary</div>
                                <div style={{ fontSize: '12px' }}>Transfer Amount: Rs. {(parseFloat(customerBillValue) || 0).toLocaleString()}</div>
                            </div>
                        </>
                    )}

                    {adjustmentType === 'bad_debt' && (
                        <>
                            <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>Bad Debt Name/Reference</label><input type="text" value={badDebtName} onChange={(e) => setBadDebtName(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px' }} /></div>
                            <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>Bad Debt Amount (Rs.)</label><input type="number" value={badDebtAmount} onChange={(e) => setBadDebtAmount(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px' }} /></div>
                            <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '600' }}>⚠️ Bad Debt Write-off: Rs. {(parseFloat(badDebtAmount) || 0).toLocaleString()}</div>
                            </div>
                        </>
                    )}
                </div>
                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={onClose} style={{ padding: '10px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                    <button onClick={handleConfirm} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #4CAF50, #45a049)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Apply Adjustment</button>
                </div>
            </div>
        </div>
    );
};

// ==================== BUILD RECEIPT HTML ====================
const buildFullReceiptHTML = (salesData, billNo, customerCode, mobile, globalLoanAmount = 0, givenAmount = 0, paymentMethod = 'cash', paymentDetails = null, billSize = '3inch', cashGivenAmount = 0) => {
    const formatNumber = (num) => {
        if (typeof num !== 'number' && typeof num !== 'string') return '0';
        const number = parseFloat(num);
        if (isNaN(number)) return '0';
        if (Number.isInteger(number)) return number.toLocaleString('en-US');
        const parts = number.toFixed(2).split('.');
        const wholePart = parseInt(parts[0]).toLocaleString('en-US');
        return `${wholePart}.${parts[1]}`;
    };

    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    const consolidatedSummary = {};
    salesData.forEach(s => {
        const itemName = s.item_name || 'Unknown';
        if (!consolidatedSummary[itemName]) consolidatedSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
        consolidatedSummary[itemName].totalWeight += parseFloat(s.weight) || 0;
        consolidatedSummary[itemName].totalPacks += parseInt(s.packs) || 0;
    });

    const totalSales = salesData.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0);
    const totalPackCost = salesData.reduce((sum, s) => sum + ((parseFloat(s.CustomerPackCost) || 0) * (parseFloat(s.packs) || 0)), 0);
    const finalGrandTotal = totalSales + totalPackCost;
    const displayGivenAmount = cashGivenAmount > 0 ? cashGivenAmount : givenAmount;
    const remaining = displayGivenAmount > 0 ? Math.abs(displayGivenAmount - finalGrandTotal) : 0;

    const itemsHtml = salesData.map(s => {
        const packs = parseInt(s.packs) || 0;
        const weight = parseFloat(s.weight) || 0;
        const price = parseFloat(s.price_per_kg) || 0;
        const value = (weight * price).toFixed(2);
        return `<tr><td style="padding:5px 0;">${s.item_name || ""}<br>${formatNumber(packs)}</td><td style="text-align:right;">${formatNumber(weight.toFixed(2))}</td><td style="text-align:right;">${formatNumber(price.toFixed(2))}</td><td style="text-align:right;">${s.supplier_code || "ASW"}<br>${formatNumber(value)}</td></tr>`;
    }).join("");

    let paymentMethodDisplay = '';
    if (paymentMethod === 'cheque' && paymentDetails) {
        paymentMethodDisplay = `<div style="font-size:12px; margin-top:8px; text-align:center;">💳 Cheque: ${paymentDetails.bank_name || 'Bank'} | No: ${paymentDetails.cheq_no}</div>`;
    } else if (paymentMethod === 'bank_to_bank' && paymentDetails) {
        paymentMethodDisplay = `<div style="font-size:12px; margin-top:8px; text-align:center;">🏦 Bank Transfer: Ref: ${paymentDetails.reference_no}</div>`;
    } else if (paymentMethod === 'credit') {
        paymentMethodDisplay = `<div style="font-size:12px; margin-top:8px; text-align:center; background:#fef3c7; padding:8px;">💳 CREDIT PAYMENT: Rs. ${(paymentDetails?.amount || 0).toFixed(2)}</div>`;
    } else {
        paymentMethodDisplay = `<div style="font-size:12px; margin-top:8px; text-align:center;">💰 Cash Payment</div>`;
    }

    const displayCode = customerCode ? customerCode.toUpperCase() : 'WALKING';

    return `
        <div style="width:350px; margin:0 auto; padding:10px; font-family: monospace;">
            <div style="text-align:center; font-weight:bold;">
                <div style="font-size:20px;">Manju Colombage Lanka (Pvt) Ltd</div>
                <div style="font-size:14px;">එළවළු,පළතුරු තොග වෙළෙන්දෝ</div>
                <div style="font-size:18px; margin:10px 0;">Bill No: ${billNo}</div>
                <div>Customer: ${displayCode}</div>
                <div>Date: ${date} | Time: ${time}</div>
            </div>
            <hr/>
            <table style="width:100%; border-collapse:collapse;">
                <thead><tr><th>Item</th><th>Kg</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <hr/>
            <div><strong>Total: Rs. ${formatNumber(finalGrandTotal.toFixed(2))}</strong></div>
            <div>Paid: Rs. ${formatNumber(displayGivenAmount.toFixed(2))}</div>
            <div>Balance: Rs. ${formatNumber(remaining.toFixed(2))}</div>
            ${paymentMethodDisplay}
            <hr/>
            <div style="text-align:center; font-size:12px;">Thank you! Come again.</div>
        </div>
    `;
};

// ==================== STYLES ====================
const styles = {
    app: { width: '100vw', minHeight: '100vh', background: '#0dea77', margin: 0, padding: 0, fontFamily: "'Inter', sans-serif" },
    container: { width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '24px 32px' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '28px' },
    statBox: { background: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
    statLabel: { fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' },
    statNumber: { fontSize: '32px', fontWeight: '700', color: '#0f172a' },
    statSub: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
    searchInput: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', background: 'white' },
    threeColumns: { display: 'grid', gridTemplateColumns: '0.7fr 2fr 0.7fr', gap: '24px', alignItems: 'start' },
    panel: { background: '#11ba2d', borderRadius: '20px', border: '4px solid #000000', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 320px)', minHeight: '500px' },
    panelHeader: { padding: '16px 20px', background: '#ffffff', borderBottom: '1px solid #eef2ff' },
    panelTitle: { fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' },
    panelContent: { flex: 1, overflowY: 'auto', padding: '16px' },
    billItem: { padding: '14px', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer', background: '#ffffff', border: '1px solid #f1f5f9' },
    billSelected: { background: '#eff6ff', borderColor: '#074ec1' },
    billApplied: { background: '#f0fdf4', borderColor: '#dcfce7' },
    billRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    billNo: { fontWeight: '700', fontSize: '15px', color: '#0f172a' },
    billCustomer: { fontSize: '12px', color: '#000000', fontWeight: 'bold', marginTop: '2px' },
    billTotal: { fontWeight: '700', fontSize: '15px', color: '#0f172a' },
    billGiven: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
    emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' },
    oldBillsBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', padding: '16px', background: 'white', borderRadius: '16px', flexWrap: 'wrap', gap: '12px' },
    datePickerContainer: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px' },
    dateInput: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' },
    viewTypeIndicator: { padding: '6px 12px', background: '#fef3c7', borderRadius: '20px', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }
};

const LoadingSkeleton = () => (
    <div style={styles.app}><div style={styles.container}><div style={{ height: '40px', background: '#e2e8f0', borderRadius: '12px', width: '200px', marginBottom: '24px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '24px' }}>{[1, 2, 3].map(i => <div key={i} style={{ background: 'white', borderRadius: '20px', height: '500px' }}></div>)}</div>
    </div></div>
);

const EmptyStateComponent = ({ message }) => (<div style={styles.emptyState}><div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div><p>{message}</p></div>);

// ==================== DELETE CONFIRMATION MODAL ====================
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, billNo, customerCode }) => {
    const [loading, setLoading] = useState(false);
    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20001 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '450px', maxWidth: '90%', padding: '24px' }} onClick={e => e.stopPropagation()}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '48px' }}>⚠️</span>
                    <h3 style={{ margin: '10px 0 5px' }}>Delete Payment Record</h3>
                    <p>Are you sure you want to delete all payment records for Bill #{billNo}?</p>
                </div>
                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px' }}>
                    <strong>Warning:</strong> This will reverse all payments made and cannot be undone!
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onConfirm(billNo)} disabled={loading} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>{loading ? 'Deleting...' : 'Yes, Delete'}</button>
                </div>
            </div>
        </div>
    );
};

// ==================== MAIN COMPONENT ====================
export default function PrintedBills() {
    const navigate = useNavigate();
    const basePath = window.location.hostname === 'goviraju.lk' ? '/sms_new_frontend_50500' : '';

    // ==================== AUTO REFRESH WITH SILENT UPDATE ====================
    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshTimeoutRef = useRef(null);
    const isMountedRef = useRef(true);

    // Silent refresh function - updates data without showing loading skeleton
    const silentRefresh = useCallback(async () => {
        if (!isMountedRef.current) return;

        setIsRefreshing(true);
        try {
            const [salesRes, customersRes] = await Promise.all([
                api.get(routes.getAllSales),
                api.get(routes.customers)
            ]);

            const salesData = salesRes.data.sales || salesRes.data || [];
            const customersData = customersRes.data.data || customersRes.data.customers || customersRes.data || [];
            const { pendingBills, appliedBills } = processBillData(salesData);

            // Only update if component is still mounted
            if (isMountedRef.current) {
                setState(prev => ({
                    ...prev,
                    pendingBills,
                    appliedBills,
                    customers: customersData,
                    isLoading: false
                }));
            }
        } catch (error) {
            console.error("Silent refresh error:", error);
        } finally {
            if (isMountedRef.current) {
                setIsRefreshing(false);
            }
        }
    }, []);
    const getTotalReceived = (bill) => {
        if (!bill) return 0;

        let total = 0;
        const history = bill.paymentHistory || bill.payment_history;
        if (history) {
            let payments = typeof history === 'string' ? JSON.parse(history) : history;
            if (Array.isArray(payments)) {
                payments.forEach(p => {
                    if (p.method !== 'Credit') {
                        total += parseFloat(p.amount) || 0;
                    }
                });
            }
        }
        return total;
    };
    const getAdjustmentTotals = (history) => {
        let totals = { bag_to_box: 0, bill_to_bill: 0, bad_debt: 0 };
        if (!history) return totals;
        let payments = typeof history === 'string' ? JSON.parse(history) : (history || []);
        payments.forEach(p => { if (totals[p.method] !== undefined) totals[p.method] += parseFloat(p.amount) || 0; });
        return totals;
    };

    // Initial fetch and setup auto-refresh every 3 seconds
    useEffect(() => {
        isMountedRef.current = true;

        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));

        // Initial load with loading indicator
        const initialLoad = async () => {
            setState(prev => ({ ...prev, isLoading: true }));
            await silentRefresh();
        };
        initialLoad();

        // Set up interval for silent refresh every 3 seconds
        const intervalId = setInterval(() => {
            // Only refresh if we're not already refreshing and component is mounted
            if (!isRefreshing && isMountedRef.current && !viewOldBills) {
                silentRefresh();
            }
        }, 3000); // 3 seconds

        // Cleanup on unmount
        return () => {
            isMountedRef.current = false;
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
            clearInterval(intervalId);
        };
    }, []);
    // Report Modal States
    const [modals, setModals] = useState({
        itemReport: false, weightReport: false, grnSaleReport: false, salesAdjustmentReport: false,
        grnSalesOverview: false, grnSalesOverview2: false, salesReport: false, grnReport: false, dayProcess: false
    });

    const toggleModal = (name) => setModals(prev => ({ ...prev, [name]: !prev[name] }));

    // Old Bills States
    // Old Bills States - Initialize from localStorage immediately
    const [viewOldBills, setViewOldBills] = useState(() => {
        const saved = localStorage.getItem('printedBills_viewOldBills');
        return saved === 'true';
    });
    const [startDate, setStartDate] = useState(() => {
        return localStorage.getItem('printedBills_startDate') || '';
    });
    const [endDate, setEndDate] = useState(() => {
        return localStorage.getItem('printedBills_endDate') || '';
    });
    const [archivedData, setArchivedData] = useState({ pendingBills: [], appliedBills: [], isLoading: false });
    const [dataSource, setDataSource] = useState(() => {
        return localStorage.getItem('printedBills_dataSource') || 'sales';
    });

    const [state, setState] = useState({
        pendingBills: [], appliedBills: [], customers: [], pendingSearchQuery: "", appliedSearchQuery: "",
        selectedBill: null, isLoading: true, isPrinting: false, givenAmountInput: "", isUpdatingCompletedBill: false,
        showChequeModal: false, pendingChequeAmount: 0, showAdjustmentModal: false, showBankToBankModal: false,
        pendingBankToBankAmount: 0, showPaymentHistoryModal: false, currentPayments: [], paymentHistoryTotalPaid: 0,
        paymentHistoryTotalBill: 0, paymentHistoryRemaining: 0, customerType: null, showDebtorForm: false,
        pendingDebtorBill: null, showDeleteModal: false, deleteBillNo: null, deleteCustomerCode: null, adjustmentType: 'bag_to_box', // Track selected adjustment type
        bagCount: '', boxCount: '', bagValue: '', boxValue: '',
        customerCodeField: '', customerBillNo: '', customerBillValue: '',
        badDebtName: '', badDebtAmount: ''
    });
    const [selectedBillDebtor, setSelectedBillDebtor] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
        fetchSalesData();
        const interval = setInterval(fetchSalesData, 30000);
        return () => clearInterval(interval);
    }, []);
    const handleAdjustmentTypeSelect = (type) => {
        setState(prev => ({
            ...prev,
            adjustmentType: type,
            // Reset all adjustment fields
            bagCount: '', boxCount: '', bagValue: '', boxValue: '',
            customerCodeField: '', customerBillNo: '', customerBillValue: '',
            badDebtName: '', badDebtAmount: ''
        }));
    };

    const calculateBagToBoxAdjustment = () => {
        return ((parseInt(state.bagCount) || 0) * (parseFloat(state.bagValue) || 0)) +
            ((parseInt(state.boxCount) || 0) * (parseFloat(state.boxValue) || 0));
    };

   const handleAdjustmentPayment = async () => {
    let paymentAmount = parseFloat(state.givenAmountInput);
    if (!paymentAmount || paymentAmount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    if (!state.selectedBill) {
        alert("Please select a bill first");
        return;
    }

    // Check against debt amount if exists, otherwise against remaining bill amount
    const remainingDebtAmount = selectedBillDebtor?.remaining_amount || 0;
    const remainingBillAmount = state.selectedBill.totalAmount - (state.selectedBill.givenAmount || 0);
    const maxAllowed = remainingDebtAmount > 0 ? remainingDebtAmount : remainingBillAmount;
    
    if (paymentAmount > maxAllowed) {
        alert(`Amount exceeds maximum allowed!\n\nMaximum: Rs. ${formatDecimal(maxAllowed)}\nEntered: Rs. ${formatDecimal(paymentAmount)}`);
        return;
    }

    let adjustmentDetails = null;

    if (state.adjustmentType === 'bag_to_box') {
        if (!state.bagCount || !state.boxCount || !state.bagValue || !state.boxValue) {
            alert('Please fill all bag/box fields');
            return;
        }
        adjustmentDetails = {
            type: 'bag_to_box',
            amount: Math.abs(calculateBagToBoxAdjustment()),
            bag_count: parseInt(state.bagCount),
            box_count: parseInt(state.boxCount),
            bag_value: parseFloat(state.bagValue),
            box_value: parseFloat(state.boxValue)
        };
    } else if (state.adjustmentType === 'bill_to_bill') {
        if (!state.customerCodeField || !state.customerBillNo || !state.customerBillValue) {
            alert('Please fill all bill to bill fields');
            return;
        }
        adjustmentDetails = {
            type: 'bill_to_bill',
            amount: parseFloat(state.customerBillValue),
            customer_code: state.customerCodeField,
            customer_bill_no: state.customerBillNo,
            customer_bill_value: parseFloat(state.customerBillValue)
        };
    } else if (state.adjustmentType === 'bad_debt') {
        if (!state.badDebtName || !state.badDebtAmount) {
            alert('Please enter bad debt name and amount');
            return;
        }
        adjustmentDetails = {
            type: 'bad_debt',
            amount: parseFloat(state.badDebtAmount),
            bad_debt_name: state.badDebtName,
            bad_debt_amount: parseFloat(state.badDebtAmount)
        };
    }

    await processPayment(paymentAmount, false, null, false, null, true, adjustmentDetails);

    // Clear all adjustment fields after submission
    setState(prev => ({
        ...prev,
        givenAmountInput: "",
        bagCount: '',
        boxCount: '',
        bagValue: '',
        boxValue: '',
        customerCodeField: '',
        customerBillNo: '',
        customerBillValue: '',
        badDebtName: '',
        badDebtAmount: '',
        adjustmentType: 'bag_to_box'
    }));
};

    const fetchSalesData = async () => {
        try {
            const [salesRes, customersRes] = await Promise.all([api.get(routes.getAllSales), api.get(routes.customers)]);
            const salesData = salesRes.data.sales || salesRes.data || [];
            const customersData = customersRes.data.data || customersRes.data.customers || customersRes.data || [];
            const { pendingBills, appliedBills } = processBillData(salesData);
            setState(prev => ({ ...prev, pendingBills, appliedBills, customers: customersData, isLoading: false }));
        } catch (error) { console.error("Error fetching data:", error); setState(prev => ({ ...prev, isLoading: false })); }
    };

    const fetchArchivedSales = async (isFromStorage = false) => {
        if (!startDate || !endDate) {
            return;
        }
        setArchivedData(prev => ({ ...prev, isLoading: true }));
        try {
            const response = await api.get(routes.getArchivedSales, { params: { start_date: startDate, end_date: endDate } });
            if (response.data.success) {
                const { pendingBills, appliedBills } = processBillData(response.data.sales || []);
                setArchivedData({ pendingBills, appliedBills, isLoading: false });
                setDataSource('sales_history');
                // Save to localStorage
                localStorage.setItem('printedBills_startDate', startDate);
                localStorage.setItem('printedBills_endDate', endDate);
                localStorage.setItem('printedBills_dataSource', 'sales_history');
                localStorage.setItem('printedBills_viewOldBills', 'true');

                if (!isFromStorage) {
                    alert(`Loaded ${pendingBills.length + appliedBills.length} bills from ${startDate} to ${endDate}`);
                }
            } else {
                if (!isFromStorage) alert('Failed to fetch archived data');
                setArchivedData(prev => ({ ...prev, isLoading: false }));
            }
        } catch (error) {
            console.error('Error fetching archived sales:', error);
            if (!isFromStorage) alert('Failed to fetch archived data');
            setArchivedData(prev => ({ ...prev, isLoading: false }));
        }
    };
    // Auto-set customer type to 'debtor' when a bill with existing debtor is selected
    useEffect(() => {
        if (selectedBillDebtor && selectedBillDebtor.Debtor_no) {
            // If bill has a debtor number, automatically set customer type to debtor
            if (state.customerType !== 'debtor') {
                setState(prev => ({ ...prev, customerType: 'debtor' }));
            }
        }
    }, [selectedBillDebtor]);

    const resetToCurrentSales = () => {
        setViewOldBills(false);
        setStartDate('');
        setEndDate('');
        setDataSource('sales');
        setArchivedData({ pendingBills: [], appliedBills: [], isLoading: false });
        // Reset customer type to null when going back to current bills
        setState(prev => ({ ...prev, customerType: null }));
        fetchSalesData();
        // Clear saved filter states from localStorage
        localStorage.removeItem('printedBills_viewOldBills');
        localStorage.removeItem('printedBills_startDate');
        localStorage.removeItem('printedBills_endDate');
        localStorage.removeItem('printedBills_dataSource');
    };
    // Auto-populate givenAmountInput based on adjustment type and values
    useEffect(() => {
        if (!state.selectedBill) return;
        let calculatedAmount = 0;
        const maxAmount = selectedBillDebtor?.remaining_amount > 0
            ? selectedBillDebtor.remaining_amount
            : (state.selectedBill.totalAmount - (state.selectedBill.givenAmount || 0));

        if (state.adjustmentType === 'bag_to_box') {
            const bagTotal = (parseInt(state.bagCount) || 0) * (parseFloat(state.bagValue) || 0);
            const boxTotal = (parseInt(state.boxCount) || 0) * (parseFloat(state.boxValue) || 0);
            calculatedAmount = bagTotal + boxTotal;
            if ((state.bagCount || state.boxCount || state.bagValue || state.boxValue) && calculatedAmount <= maxAmount) {
                setState(prev => ({ ...prev, givenAmountInput: calculatedAmount.toString() }));
            } else if (calculatedAmount > maxAmount && (state.bagCount || state.boxCount)) {
                alert(`Adjustment amount exceeds limit! Maximum: Rs. ${formatDecimal(maxAmount)}`);
                setState(prev => ({ ...prev, bagCount: '', boxCount: '', bagValue: '', boxValue: '', givenAmountInput: "" }));
            }
        }
        else if (state.adjustmentType === 'bill_to_bill') {
            calculatedAmount = parseFloat(state.customerBillValue) || 0;
            if (state.customerBillValue && calculatedAmount <= maxAmount) {
                setState(prev => ({ ...prev, givenAmountInput: calculatedAmount.toString() }));
            } else if (calculatedAmount > maxAmount && state.customerBillValue) {
                alert(`Bill amount exceeds limit! Maximum: Rs. ${formatDecimal(maxAmount)}`);
                setState(prev => ({ ...prev, customerBillValue: "", givenAmountInput: "" }));
            }
        }
        else if (state.adjustmentType === 'bad_debt') {
            calculatedAmount = parseFloat(state.badDebtAmount) || 0;
            if (state.badDebtAmount && calculatedAmount <= maxAmount) {
                setState(prev => ({ ...prev, givenAmountInput: calculatedAmount.toString() }));
            } else if (calculatedAmount > maxAmount && state.badDebtAmount) {
                alert(`Bad debt amount exceeds limit! Maximum: Rs. ${formatDecimal(maxAmount)}`);
                setState(prev => ({ ...prev, badDebtAmount: "", givenAmountInput: "" }));
            }
        }
    }, [state.adjustmentType, state.bagCount, state.bagValue, state.boxCount, state.boxValue, state.customerBillValue, state.badDebtAmount, selectedBillDebtor]);

    const handleBillClick = async (bill) => {
        // If clicking the same bill, clear it
        if (state.selectedBill?.billNo === bill.billNo) {
            setState(prev => ({
                ...prev,
                selectedBill: null,
                givenAmountInput: "",
                isUpdatingCompletedBill: false
            }));
            setSelectedBillDebtor(null);
            return;
        }

        setState(prev => ({
            ...prev,
            selectedBill: bill,
            givenAmountInput: "",
            isUpdatingCompletedBill: bill.givenAmountApplied === 'Y'
        }));
        try {
            const response = await api.get(`/debtors/${bill.billNo}`);
            if (response.data.success && response.data.data) {
                setSelectedBillDebtor(response.data.data);
            } else {
                setSelectedBillDebtor(null);
            }
        } catch (e) {
            setSelectedBillDebtor(null);
        }
    };
    // Add this useEffect after your state declarations (around line where other useEffects are)
    useEffect(() => {
        if (state.givenAmountInput && state.givenAmountInput !== "0") {
            const num = parseFloat(state.givenAmountInput);
            const maxAmount = selectedBillDebtor?.remaining_amount > 0
                ? selectedBillDebtor.remaining_amount
                : (state.selectedBill ? (state.selectedBill.totalAmount - (state.selectedBill.givenAmount || 0)) : Infinity);
            if (state.selectedBill && num > maxAmount) {
                alert(`Amount cannot exceed Rs. ${formatDecimal(maxAmount)}`);
                return;
            }
            setState(prev => ({
                ...prev,
                customerBillValue: state.givenAmountInput,
                badDebtAmount: state.givenAmountInput
            }));
        }
    }, [state.givenAmountInput, selectedBillDebtor]);

    // Save filter states whenever they change
    useEffect(() => {
        localStorage.setItem('printedBills_viewOldBills', viewOldBills);
    }, [viewOldBills]);

    useEffect(() => {
        localStorage.setItem('printedBills_startDate', startDate);
    }, [startDate]);

    useEffect(() => {
        localStorage.setItem('printedBills_endDate', endDate);
    }, [endDate]);

    useEffect(() => {
        localStorage.setItem('printedBills_dataSource', dataSource);
    }, [dataSource]);
    const handleContextMenu = (e, bill) => {
        e.preventDefault();
        setState(prev => ({ ...prev, showDeleteModal: true, deleteBillNo: bill.billNo, deleteCustomerCode: bill.customerCode }));
    };

    const handleDeleteBillPayments = async (billNo) => {
        setState(prev => ({ ...prev, isPrinting: true }));
        try {
            const response = await api.delete(`/sales/delete-bill-payments/${billNo}`);
            if (response.data.success) {
                alert(`All payments for Bill #${billNo} have been reversed!`);
                await fetchSalesData();
                if (state.selectedBill?.billNo === billNo) setState(prev => ({ ...prev, selectedBill: null, givenAmountInput: "" }));
            }
        } catch (error) { console.error('Error deleting payments:', error); alert('Failed to reverse payments.'); }
        finally { setState(prev => ({ ...prev, isPrinting: false, showDeleteModal: false, deleteBillNo: null, deleteCustomerCode: null })); }
    };
    const checkAndHandleDebtor = async (bill) => {
        console.log('Checking debtor for:', bill.customerCode, 'Customer type:', state.customerType);

        // If clicking the same bill that's already selected, clear everything
        if (state.selectedBill && state.selectedBill.billNo === bill.billNo) {
            setState(prev => ({
                ...prev,
                selectedBill: null,
                givenAmountInput: "",
                isUpdatingCompletedBill: false,
                customerType: null  // Clear customer type as well
            }));
            setSelectedBillDebtor(null);
            return;
        }

        // First, show the bill details in the middle screen
        handleBillClick(bill);

        // Then check if customer type is selected - if not, just show bill but don't process debtor logic
        if (!state.customerType) {
            // Bill details are shown, but payment section is locked via opacity/pointerEvents
            return;
        }

        // If customer type is selected, proceed with debtor processing
        if (state.customerType === 'walking') {
            // Walking customer - no additional processing needed
            return;
        }

        // For debtor type, process debtor registration if needed
        try {
            const response = await api.get(`${routes.checkCustomer}/${bill.customerCode}`);
            const data = response.data;
            console.log('Customer check response:', data);

            if (data.exists) {
                if (data.customer && data.customer.Debtor !== 'Y') {
                    await api.put(routes.updateDebtorStatus, {
                        short_name: bill.customerCode,
                        Debtor: 'Y'
                    });
                    console.log('Updated customer as Debtor');
                }
            } else {
                console.log('Customer not found, showing debtor form');
                setState(prev => ({
                    ...prev,
                    showDebtorForm: true,
                    pendingDebtorBill: bill
                }));
            }
        } catch (error) {
            console.error('Error checking debtor:', error);
        }
    };
    const handleDebtorSave = async (saved, debtorNo = null) => {
        console.log('Debtor save callback:', saved, 'Debtor No:', debtorNo);
        if (saved && state.pendingDebtorBill) {
            setState(prev => ({
                ...prev,
                customerType: 'debtor',  // ✅ Set to 'debtor' instead of null
                showDebtorForm: false,
                pendingDebtorBill: null
            }));
            const message = `Customer ${state.pendingDebtorBill.customerCode} has been registered as a Debtor!`;
            const debtorMessage = debtorNo ? `\nDebtor Number: ${debtorNo}` : '';
            const billMessage = state.pendingDebtorBill.billNo ? `\nBill No: ${state.pendingDebtorBill.billNo}` : '';
            alert(message + debtorMessage + billMessage);

            // Refresh the selected bill's debtor data
            if (state.selectedBill?.billNo === state.pendingDebtorBill.billNo) {
                try {
                    const response = await api.get(`/debtors/${state.pendingDebtorBill.billNo}`);
                    if (response.data.success && response.data.data) {
                        setSelectedBillDebtor(response.data.data);
                    }
                } catch (e) {
                    console.log('Error fetching new debtor data:', e);
                }
            }
        } else {
            setState(prev => ({
                ...prev,
                showDebtorForm: false,
                pendingDebtorBill: null
            }));
        }
    };
    // Refresh debtor data when a debtor is saved
    useEffect(() => {
        if (state.pendingDebtorBill?.billNo && !state.showDebtorForm) {
            // If we just closed the debtor form and we have a pending bill, refresh its debtor data
            const refreshDebtor = async () => {
                try {
                    const response = await api.get(`/debtors/${state.pendingDebtorBill.billNo}`);
                    if (response.data.success && response.data.data) {
                        setSelectedBillDebtor(response.data.data);
                        // Auto-set customer type to debtor
                        setState(prev => ({ ...prev, customerType: 'debtor' }));
                    }
                } catch (e) {
                    console.log('No debtor record found after save');
                }
            };
            refreshDebtor();
        }
    }, [state.showDebtorForm, state.pendingDebtorBill]);

    const handlePrintWithoutUpdate = async () => {
        if (!state.selectedBill?.sales?.length) { alert("No sales data found."); return; }
        setState(prev => ({ ...prev, isPrinting: true }));
        try {
            const customer = state.customers.find(c => c.short_name?.toUpperCase() === state.selectedBill.customerCode?.toUpperCase());
            const receiptHtml = buildFullReceiptHTML(state.selectedBill.sales, state.selectedBill.billNo, customer?.name || state.selectedBill.customerCode, customer?.telephone_no || "", 0, state.selectedBill.givenAmount || 0, 'cash', null, '3inch', state.selectedBill.cashPayments || 0);
            const printWindow = window.open("", "_blank", "width=800,height=600");
            if (!printWindow) { alert("Please allow pop-ups"); setState(prev => ({ ...prev, isPrinting: false })); return; }
            printWindow.document.write(`<html><head><title>Print Bill</title></head><body>${receiptHtml}<script>window.onload=()=>{setTimeout(()=>{window.print();setTimeout(()=>window.close(),500)},500)};<\/script></body></html>`);
            printWindow.document.close();
        } catch (error) { console.error("Print error:", error); alert("Error printing bill"); }
        finally { setState(prev => ({ ...prev, isPrinting: false })); }
    };

    const handleViewPaymentHistory = async () => {
        if (!state.selectedBill) return;
        try {
            const response = await api.get(`${routes.paymentHistory}/${state.selectedBill.billNo}`);
            if (response.data.success) {
                const payments = response.data.payments || [];
                const totalPaidExcludingCredit = payments.reduce((sum, p) => p.method !== 'Credit' ? sum + (parseFloat(p.amount) || 0) : sum, 0);
                setState(prev => ({ ...prev, currentPayments: payments, paymentHistoryTotalPaid: totalPaidExcludingCredit, paymentHistoryTotalBill: response.data.total_bill || 0, paymentHistoryRemaining: response.data.remaining || 0, showPaymentHistoryModal: true }));
            }
        } catch (error) { console.error('Error fetching payment history:', error); alert('Failed to fetch payment history'); }
    };
  const processPayment = async (paymentAmount, isCheque = false, chequeDetails = null, isBankTransfer = false, bankTransferDetails = null, isAdjustment = false, adjustmentDetails = null) => {
    if (!state.selectedBill || state.isPrinting) return;

    // ===== ADD THIS VALIDATION AT THE BEGINNING =====
    const remainingDebtAmount = selectedBillDebtor?.remaining_amount || 0;
    const remainingBillAmount = state.selectedBill.totalAmount - (state.selectedBill.givenAmount || 0);
    const maxAllowed = remainingDebtAmount > 0 ? remainingDebtAmount : remainingBillAmount;
    
    if (paymentAmount > maxAllowed) {
        alert(`Payment amount exceeds maximum allowed!\n\nMaximum: Rs. ${formatDecimal(maxAllowed)}\nEntered: Rs. ${formatDecimal(paymentAmount)}`);
        setState(prev => ({ ...prev, isPrinting: false }));
        return;
    }
    // ===== END OF ADDED VALIDATION =====

    setState(prev => ({ ...prev, isPrinting: true }));

    try {
        const currentGiven = state.selectedBill.givenAmount || 0;
        const totalGivenAmount = currentGiven + paymentAmount;
        const isFullySettled = totalGivenAmount >= state.selectedBill.totalAmount;
        const creditTransaction = isFullySettled ? 'N' : 'Y';
        const givenAmountApplied = isFullySettled ? 'Y' : 'N';

        let paymentMethod = 'Cash';
        let paymentMethodForDebtor = 'cash';

        if (isAdjustment && adjustmentDetails) {
            paymentMethod = adjustmentDetails.type;
            if (adjustmentDetails.type === 'bag_to_box') paymentMethodForDebtor = 'bag_to_box';
            else if (adjustmentDetails.type === 'bill_to_bill') paymentMethodForDebtor = 'bill_to_bill';
            else if (adjustmentDetails.type === 'bad_debt') paymentMethodForDebtor = 'bad_debt';
        } else if (isBankTransfer) {
            paymentMethod = 'Bank Transfer';
            paymentMethodForDebtor = 'bank_transfer';
        } else if (isCheque) {
            paymentMethod = 'Cheque';
            paymentMethodForDebtor = 'cheque';
        } else {
            paymentMethodForDebtor = 'cash';
        }

        // Debug log to see what's being sent
        console.log('=== PROCESS PAYMENT DEBUG ===');
        console.log('isAdjustment:', isAdjustment);
        console.log('adjustmentDetails:', adjustmentDetails);
        console.log('paymentMethod:', paymentMethod);
        console.log('paymentAmount:', paymentAmount);

        const payload = {
            bill_no: state.selectedBill.billNo,
            given_amount: totalGivenAmount,
            given_amount_applied: givenAmountApplied,
            credit_transaction: creditTransaction,
            payment_amount: paymentAmount,
            payment_method: paymentMethod,
            is_walking_customer: state.customerType === 'walking'
        };

        let paymentMethodText = 'Cash';
        let paymentDetailsForReceipt = null;

        if (isAdjustment && adjustmentDetails) {
            if (adjustmentDetails.type === 'bag_to_box') {
                payload.bag_count = adjustmentDetails.bag_count;
                payload.box_count = adjustmentDetails.box_count;
                payload.bag_value = adjustmentDetails.bag_value;
                payload.box_value = adjustmentDetails.box_value;
                payload.adjustment_amount = adjustmentDetails.amount;
                paymentMethodText = 'Bag to Box';
                paymentDetailsForReceipt = {
                    type: 'bag_to_box',
                    amount: adjustmentDetails.amount,
                    bag_count: adjustmentDetails.bag_count,
                    box_count: adjustmentDetails.box_count,
                    bag_value: adjustmentDetails.bag_value,
                    box_value: adjustmentDetails.box_value
                };
            } else if (adjustmentDetails.type === 'bill_to_bill') {
                payload.target_customer_code = adjustmentDetails.customer_code;
                payload.target_bill_no = adjustmentDetails.customer_bill_no;
                payload.target_bill_value = adjustmentDetails.customer_bill_value;
                payload.adjustment_amount = adjustmentDetails.amount;
                paymentMethodText = 'Bill to Bill';
                paymentDetailsForReceipt = {
                    type: 'bill_to_bill',
                    amount: adjustmentDetails.amount,
                    customer_bill_no: adjustmentDetails.customer_bill_no
                };
            } else if (adjustmentDetails.type === 'bad_debt') {
                payload.bad_debt_name = adjustmentDetails.bad_debt_name;
                payload.bad_debt_amount = adjustmentDetails.bad_debt_amount;
                payload.adjustment_amount = adjustmentDetails.amount;
                paymentMethodText = 'Bad Debt';
                paymentDetailsForReceipt = {
                    type: 'bad_debt',
                    amount: adjustmentDetails.amount,
                    name: adjustmentDetails.bad_debt_name
                };
            }
        } else if (isBankTransfer && bankTransferDetails) {
            payload.bank_account_id = bankTransferDetails.bank_account_id;
            payload.transfer_reference_no = bankTransferDetails.reference_no;
            payload.transfer_date = bankTransferDetails.transfer_date;
            payload.transfer_notes = bankTransferDetails.notes;
            paymentMethodText = 'Bank Transfer';
            paymentDetailsForReceipt = {
                reference_no: bankTransferDetails.reference_no,
                transfer_date: bankTransferDetails.transfer_date
            };
        } else if (isCheque && chequeDetails) {
            payload.cheq_date = chequeDetails.cheq_date;
            payload.cheq_no = chequeDetails.cheq_no;
            payload.bank_account_id = chequeDetails.bank_account_id;
            paymentMethodText = 'Cheque';
            paymentDetailsForReceipt = {
                cheq_no: chequeDetails.cheq_no,
                cheq_date: chequeDetails.cheq_date
            };
        }

        // Create payment history entry
        const paymentHistoryEntry = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            amount: parseFloat(paymentAmount),
            method: paymentMethod,
            running_balance: parseFloat(totalGivenAmount),
            is_fully_paid: isFullySettled,
            reference: paymentMethod,
            details: {}
        };

        // Add details based on payment method
        if (isCheque && chequeDetails) {
            paymentHistoryEntry.details = {
                cheq_no: chequeDetails.cheq_no,
                cheq_date: chequeDetails.cheq_date,
                bank_account_id: chequeDetails.bank_account_id
            };
        } else if (isBankTransfer && bankTransferDetails) {
            paymentHistoryEntry.details = {
                transfer_reference_no: bankTransferDetails.reference_no,
                transfer_date: bankTransferDetails.transfer_date,
                bank_account_id: bankTransferDetails.bank_account_id
            };
        }

        // Add adjustment details to payment history
        if (isAdjustment && adjustmentDetails) {
            paymentHistoryEntry.details.adjustment = {
                type: adjustmentDetails.type,
                amount: adjustmentDetails.amount,
                ...(adjustmentDetails.type === 'bag_to_box' && {
                    bag_count: adjustmentDetails.bag_count,
                    box_count: adjustmentDetails.box_count,
                    bag_value: adjustmentDetails.bag_value,
                    box_value: adjustmentDetails.box_value
                }),
                ...(adjustmentDetails.type === 'bill_to_bill' && {
                    customer_code: adjustmentDetails.customer_code,
                    customer_bill_no: adjustmentDetails.customer_bill_no,
                    customer_bill_value: adjustmentDetails.customer_bill_value
                }),
                ...(adjustmentDetails.type === 'bad_debt' && {
                    bad_debt_name: adjustmentDetails.bad_debt_name,
                    bad_debt_amount: adjustmentDetails.bad_debt_amount
                })
            };
        }

        // CHECK IF THERE'S AN EXISTING DEBTOR RECORD OR CREDIT IN PAYMENT HISTORY
        let existingDebtor = null;
        let totalCreditAmount = state.selectedBill.creditAmount || 0;

        try {
            const debtorCheck = await api.get(`/debtors/${state.selectedBill.billNo}`);
            if (debtorCheck.data.success && debtorCheck.data.data) {
                existingDebtor = debtorCheck.data.data;
                console.log('Found existing debtor record:', existingDebtor);
            }
        } catch (e) {
            console.log('No existing debtor record found');
        }

        // If there's credit amount (from payment history) and no debtor record, create one
        if (totalCreditAmount > 0 && !existingDebtor) {
            console.log('Creating debtor record from payment history credit:', totalCreditAmount);
            await api.post('/debtors/create', {
                bill_no: state.selectedBill.billNo,
                customer_code: state.selectedBill.customerCode,
                credit_amount: totalCreditAmount
            });

            // Refetch debtor to get the new record
            const debtorCheck = await api.get(`/debtors/${state.selectedBill.billNo}`);
            if (debtorCheck.data.success && debtorCheck.data.data) {
                existingDebtor = debtorCheck.data.data;
            }
        }

        // FIX: Update debtor payment for ALL payment types (including adjustments and credit)
        if (existingDebtor && existingDebtor.remaining_amount > 0) {
            let debtorPaymentAmount = 0;

            if (paymentMethod === 'Credit') {
                debtorPaymentAmount = paymentAmount;
            } else {
                debtorPaymentAmount = Math.min(paymentAmount, existingDebtor.remaining_amount);
            }

            const isDebtFullyPaid = (existingDebtor.remaining_amount - debtorPaymentAmount) <= 0;

            if (debtorPaymentAmount > 0) {
                let debtorPaymentMethod = 'cash';
                if (isAdjustment && adjustmentDetails) {
                    if (adjustmentDetails.type === 'bag_to_box') debtorPaymentMethod = 'bag_to_box';
                    else if (adjustmentDetails.type === 'bill_to_bill') debtorPaymentMethod = 'bill_to_bill';
                    else if (adjustmentDetails.type === 'bad_debt') debtorPaymentMethod = 'bad_debt';
                } else if (paymentMethod === 'Credit') {
                    debtorPaymentMethod = 'credit';
                } else if (paymentMethod === 'Cheque') {
                    debtorPaymentMethod = 'cheque';
                } else if (paymentMethod === 'Bank Transfer') {
                    debtorPaymentMethod = 'bank_transfer';
                }

                console.log('Updating debtor payment for:', {
                    type: isAdjustment ? 'adjustment' : paymentMethod,
                    amount: debtorPaymentAmount,
                    method: debtorPaymentMethod
                });

                try {
                    const updateResponse = await api.put('/debtors/update-payment', {
                        bill_no: state.selectedBill.billNo,
                        payment_amount: debtorPaymentAmount,
                        payment_method: debtorPaymentMethod
                    });

                    console.log('Debtor update response:', updateResponse.data);

                    // Add debtor payment to history details
                    paymentHistoryEntry.details.debtor_payment = {
                        amount: debtorPaymentAmount,
                        previous_remaining: existingDebtor.remaining_amount,
                        new_remaining: existingDebtor.remaining_amount - debtorPaymentAmount,
                        is_fully_paid: isDebtFullyPaid,
                        settled_way: isDebtFullyPaid ? debtorPaymentMethod : null
                    };

                    // If debt is fully paid, add a special message
                    if (isDebtFullyPaid) {
                        console.log('✅ Debt fully paid! Status updated to "paid" in debtors table');
                    }
                } catch (debtorError) {
                    console.error('Error updating debtor payment:', debtorError);
                    // Don't stop the main payment process if debtor update fails
                }
            }
        }

        // Get existing payment history
        let existingHistory = [];
        try {
            const currentHistory = state.selectedBill.payment_history;
            if (currentHistory) {
                existingHistory = typeof currentHistory === 'string'
                    ? JSON.parse(currentHistory)
                    : currentHistory;
            }
        } catch (e) {
            existingHistory = [];
        }

        existingHistory.push(paymentHistoryEntry);
        payload.payment_history = JSON.stringify(existingHistory);

        const response = await api.put(routes.updateGivenAmountApplied, payload);

        if (response.data.success) {
            await fetchSalesData();

            const event = new CustomEvent('salesDataUpdated', {
                detail: {
                    billNo: state.selectedBill.billNo,
                    customerCode: state.selectedBill.customerCode,
                    givenAmount: totalGivenAmount,
                    timestamp: Date.now()
                }
            });
            window.dispatchEvent(event);

            const customer = state.customers.find(c =>
                String(c.short_name).toUpperCase() === String(state.selectedBill.customerCode).toUpperCase()
            );

            let debtorMessage = '';
            if (existingDebtor && existingDebtor.remaining_amount > 0) {
                const newRemaining = Math.max(0, existingDebtor.remaining_amount - paymentAmount);
                const isDebtFullyPaid = newRemaining <= 0;

                if (isDebtFullyPaid) {
                    debtorMessage = `\n\n✅ DEBT FULLY SETTLED!\n` +
                        `Total Credit: Rs. ${formatDecimal(existingDebtor.credit_amount)}\n` +
                        `Total Paid: Rs. ${formatDecimal(existingDebtor.paid_amount + Math.min(paymentAmount, existingDebtor.remaining_amount))}\n` +
                        `Settled Via: ${paymentMethodForDebtor.toUpperCase()}\n` +
                        `Status: PAID ✓`;
                } else {
                    debtorMessage = `\n\n💰 DEBTOR UPDATE:\n` +
                        `Paid towards debt: Rs. ${formatDecimal(Math.min(paymentAmount, existingDebtor.remaining_amount))}\n` +
                        `Remaining Debt: Rs. ${formatDecimal(newRemaining)}\n` +
                        `Status: ${newRemaining > 0 ? 'PARTIAL' : 'PAID'}`;
                }
            } else if (totalCreditAmount > 0 && paymentMethod === 'Cash' && !existingDebtor) {
                debtorMessage = `\n\n💰 NOTE: This bill has a credit of Rs. ${formatDecimal(totalCreditAmount)}. Your cash payment will be applied to this credit.`;
            }

            // ⭐ ONLY GENERATE RECEIPT IF FULLY SETTLED ⭐
            if (isFullySettled) {
                if (paymentDetailsForReceipt && response.data.data.bank_name) {
                    paymentDetailsForReceipt.bank_name = response.data.data.bank_name;
                }

                // Calculate cash given amount (exclude credit payments)
                const cashGivenAmount = state.selectedBill.cashPayments || 0;

                const receiptHtml = buildFullReceiptHTML(
                    state.selectedBill.sales,
                    state.selectedBill.billNo,
                    state.selectedBill.customerCode,
                    customer?.telephone_no || "",
                    0,
                    totalGivenAmount,
                    isAdjustment ? 'adjustment' : (isBankTransfer ? 'bank_to_bank' : (isCheque ? 'cheque' : 'cash')),
                    paymentDetailsForReceipt,
                    '3inch',
                    cashGivenAmount
                );

                const printWindow = window.open("", "_blank", "width=800,height=600");
                if (!printWindow) {
                    alert("Please allow pop-ups for printing");
                    setState(prev => ({ ...prev, isPrinting: false }));
                    return;
                }

                printWindow.document.write(`
<html>
    <head><title>Print Bill - ${state.selectedBill.billNo}</title>
    <style>
        body { margin: 0; padding: 20px; font-family: 'Courier New', monospace; } 
        @media print { body { padding: 0; margin: 0; } }
    </style>
</head>
<body>${receiptHtml}
<script>
    window.onload = () => { 
        window.print(); 
    };
    
    window.onafterprint = function() {
        setTimeout(function() {
            window.close();
            window.opener.location.reload();
        }, 500);
    };
    
    setTimeout(function() {
        if (!window.closed) {
            window.close();
            if (window.opener && !window.opener.closed) {
                window.opener.location.reload();
            }
        }
    }, 5000);
<\/script>
</body>
</html>
`);
                printWindow.document.close();
            }

            // Show appropriate success message
            const statusMessage = givenAmountApplied === 'Y'
                ? `✅ Payment Complete!\n\nPayment Method: ${paymentMethodText}\nAmount Paid: Rs. ${formatDecimal(paymentAmount)}\nTotal Given: Rs. ${formatDecimal(totalGivenAmount)}\nBill is now FULLY PAID and moved to Completed Payments.${debtorMessage}`
                : `✓ Payment Added!\n\nPayment Method: ${paymentMethodText}\nAmount Paid: Rs. ${formatDecimal(paymentAmount)}\nTotal Given: Rs. ${formatDecimal(totalGivenAmount)}\nRemaining: Rs. ${formatDecimal(Math.max(0, state.selectedBill.totalAmount - totalGivenAmount))}${debtorMessage}\n\n📝 Receipt will be generated when bill is fully settled.`;

            alert(statusMessage);

            setState(prev => ({
                ...prev,
                selectedBill: null,
                givenAmountInput: "",
                showChequeModal: false,
                showBankToBankModal: false,
                showAdjustmentModal: false,
                pendingBankToBankAmount: 0
            }));
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to update. Please try again.");
    } finally {
        setState(prev => ({ ...prev, isPrinting: false }));
    }
};
    // Get current data based on dataSource
    const currentPendingBills = dataSource === 'sales_history' ? archivedData.pendingBills : state.pendingBills;
    const currentAppliedBills = dataSource === 'sales_history' ? archivedData.appliedBills : state.appliedBills;

    const filterPendingBills = useMemo(() => {
        if (!state.pendingSearchQuery) return currentPendingBills;
        const q = state.pendingSearchQuery.toLowerCase();
        return currentPendingBills.filter(b => b.billNo.toString().includes(q) || b.customerCode.toLowerCase().includes(q));
    }, [currentPendingBills, state.pendingSearchQuery]);

    const filterAppliedBills = useMemo(() => {
        if (!state.appliedSearchQuery) return currentAppliedBills;
        const q = state.appliedSearchQuery.toLowerCase();
        return currentAppliedBills.filter(b => b.billNo.toString().includes(q) || b.customerCode.toLowerCase().includes(q));
    }, [currentAppliedBills, state.appliedSearchQuery]);
    // Process Credit Payment function
    const processCreditPayment = async (paymentAmount) => {
        if (!state.selectedBill || state.isPrinting) return;

        console.log('=== PROCESS CREDIT PAYMENT ===');
        console.log('Payment Amount:', paymentAmount);
        console.log('Bill No:', state.selectedBill.billNo);
        console.log('Customer Code:', state.selectedBill.customerCode);
        console.log('Current Given Amount:', state.selectedBill.givenAmount);
        console.log('Total Bill Amount:', state.selectedBill.totalAmount);
        console.log('Sales Data:', state.selectedBill.sales); // Debug log

        setState(prev => ({ ...prev, isPrinting: true }));

        try {
            const currentGiven = state.selectedBill.givenAmount || 0;
            const totalGivenAmount = currentGiven + paymentAmount;
            const isFullySettled = totalGivenAmount >= state.selectedBill.totalAmount;
            const creditTransaction = isFullySettled ? 'N' : 'Y';
            const givenAmountApplied = isFullySettled ? 'Y' : 'N';

            console.log('Calculated Values:', {
                currentGiven,
                totalGivenAmount,
                isFullySettled,
                creditTransaction,
                givenAmountApplied
            });

            // First, create debtor record with the exact payment amount
            const debtorData = {
                bill_no: state.selectedBill.billNo,
                customer_code: state.selectedBill.customerCode,
                credit_amount: parseFloat(paymentAmount)
            };

            console.log('Sending to debtor API:', debtorData);

            const debtorResponse = await api.post('/debtors/create', debtorData);

            console.log('Debtor API Response:', debtorResponse.data);

            if (!debtorResponse.data.success) {
                throw new Error(debtorResponse.data.message || 'Failed to create credit record');
            }

            // Get the remaining debt amount and status from the response
            let remainingDebtAmount = parseFloat(paymentAmount);
            let debtorStatus = 'pending';

            if (debtorResponse.data.data?.remaining_amount !== undefined) {
                remainingDebtAmount = parseFloat(debtorResponse.data.data.remaining_amount);
                debtorStatus = debtorResponse.data.data.status || 'pending';
            } else if (debtorResponse.data.data?.credit_amount !== undefined) {
                remainingDebtAmount = parseFloat(debtorResponse.data.data.credit_amount);
            }

            console.log('Remaining Debt Amount:', remainingDebtAmount);
            console.log('Debtor Status:', debtorStatus);

            // Create payment history entry
            const paymentHistoryEntry = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                amount: parseFloat(paymentAmount),
                method: 'Credit',
                running_balance: parseFloat(totalGivenAmount),
                is_fully_paid: isFullySettled,
                reference: 'Credit Payment',
                details: {
                    debtor_id: debtorResponse.data.data?.id,
                    credit_amount: parseFloat(paymentAmount),
                    remaining_debt: remainingDebtAmount,
                    debtor_status: debtorStatus
                }
            };

            // Get existing payment history
            let existingHistory = [];
            try {
                const currentHistory = state.selectedBill.payment_history;
                if (currentHistory) {
                    existingHistory = typeof currentHistory === 'string'
                        ? JSON.parse(currentHistory)
                        : currentHistory;
                }
            } catch (e) {
                console.error('Error parsing existing history:', e);
                existingHistory = [];
            }

            existingHistory.push(paymentHistoryEntry);
            console.log('Updated payment history:', existingHistory);

            // Create the payload object
            const payload = {
                bill_no: state.selectedBill.billNo,
                given_amount: parseFloat(totalGivenAmount),
                given_amount_applied: givenAmountApplied,
                credit_transaction: creditTransaction,
                payment_amount: parseFloat(paymentAmount),
                payment_method: 'Credit',
                payment_history: JSON.stringify(existingHistory),
                is_walking_customer: state.customerType === 'walking'
            };

            console.log('Sending to sales update API:', payload);

            const response = await api.put(routes.updateGivenAmountApplied, payload);

            console.log('Sales update response:', response.data);

            if (response.data.success) {
                // Refresh sales data
                await fetchSalesData();

                // Get customer details
                const customer = state.customers.find(c =>
                    String(c.short_name).toUpperCase() === String(state.selectedBill.customerCode).toUpperCase()
                );

                // ⭐ ONLY GENERATE RECEIPT IF FULLY SETTLED ⭐
                if (isFullySettled) {
                    // Calculate cash given amount (exclude credit payments)
                    const cashGivenAmount = state.selectedBill.cashPayments || 0;

                    console.log('Generating receipt with sales data:', state.selectedBill.sales);

                    // Ensure sales data is valid
                    if (!state.selectedBill.sales || state.selectedBill.sales.length === 0) {
                        console.error('No sales data found for bill:', state.selectedBill.billNo);
                        alert('No sales data found for this bill. Receipt cannot be generated.');
                    } else {
                        // Use the existing buildFullReceiptHTML function which already handles 'credit' payment method
                        const receiptHtml = buildFullReceiptHTML(
                            state.selectedBill.sales,
                            state.selectedBill.billNo,
                            customer?.name || state.selectedBill.customerCode,
                            customer?.telephone_no || "",
                            0,
                            parseFloat(totalGivenAmount),
                            'credit',
                            {
                                amount: parseFloat(paymentAmount),
                                remaining_debt: remainingDebtAmount,
                                debtor_status: debtorStatus
                            },
                            '3inch',
                            cashGivenAmount
                        );

                        console.log('Receipt HTML generated, length:', receiptHtml.length);

                        const printWindow = window.open("", "_blank", "width=800,height=600");
                        if (!printWindow) {
                            alert("Please allow pop-ups for printing");
                            setState(prev => ({ ...prev, isPrinting: false }));
                            return;
                        }

                        // Use a clean HTML structure with the receipt from buildFullReceiptHTML
                        printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Credit Bill - ${state.selectedBill.billNo}</title>
                        <meta charset="UTF-8">
                        <style>
                            * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                            }
                            body { 
                                margin: 0; 
                                padding: 20px; 
                                font-family: 'Courier New', monospace;
                                background: white;
                            } 
                            @media print { 
                                body { 
                                    margin: 0; 
                                    padding: 0; 
                                    background: white;
                                } 
                            }
                        </style>
                    </head>
                    <body>
                        ${receiptHtml}
                        <script>
                            window.onload = function() { 
                                setTimeout(function() {
                                    window.print();
                                }, 500);
                            };
                            
                            // Listen for print dialog completion
                            window.onafterprint = function() {
                                setTimeout(function() {
                                    window.close();
                                    // Refresh the parent page
                                    window.opener.location.reload();
                                }, 500);
                            };
                            
                            // Fallback for browsers that don't support onafterprint
                            setTimeout(function() {
                                if (!window.closed) {
                                    window.close();
                                    if (window.opener && !window.opener.closed) {
                                        window.opener.location.reload();
                                    }
                                }
                            }, 8000);
                        <\/script>
                    </body>
                </html>
            `);
                        printWindow.document.close();
                    }
                }

                // Show success message
                const statusMessage = givenAmountApplied === 'Y'
                    ? `✅ Bill Fully Paid!\n\n` +
                    `Payment Method: CREDIT\n` +
                    `Amount Added: Rs. ${formatDecimal(paymentAmount)}\n` +
                    `Total Given: Rs. ${formatDecimal(totalGivenAmount)}\n` +
                    `Remaining Debt: Rs. ${formatDecimal(remainingDebtAmount)}\n` +
                    `Debt Status: ${debtorStatus === 'paid' ? 'FULLY PAID' : 'PENDING'}\n\n` +
                    `Bill is now FULLY PAID.`
                    : `✓ Credit Added Successfully!\n\n` +
                    `Amount: Rs. ${formatDecimal(paymentAmount)}\n` +
                    `Total Given: Rs. ${formatDecimal(totalGivenAmount)}\n` +
                    `Remaining on Bill: Rs. ${formatDecimal(Math.max(0, state.selectedBill.totalAmount - totalGivenAmount))}\n` +
                    `Remaining Debt: Rs. ${formatDecimal(remainingDebtAmount)}\n` +
                    `Debt Status: ${debtorStatus === 'paid' ? 'FULLY PAID' : (debtorStatus === 'partial' ? 'PARTIAL PAYMENT' : 'PENDING')}\n\n` +
                    `⚠️ This amount has been recorded as DEBT and needs to be collected later.\n` +
                    `📝 Receipt will be generated when bill is fully settled.`;

                alert(statusMessage);

                // Reset state
                setState(prev => ({
                    ...prev,
                    selectedBill: null,
                    givenAmountInput: "",
                    showChequeModal: false,
                    showBankToBankModal: false,
                    showAdjustmentModal: false,
                    pendingBankToBankAmount: 0
                }));
            } else {
                throw new Error(response.data.message || 'Failed to update sales record');
            }
        } catch (error) {
            console.error("Error processing credit payment:", error);
            let errorMessage = "Failed to process credit payment. ";

            if (error.response) {
                console.error("Error response:", error.response.data);
                errorMessage += error.response.data?.message || error.message;
            } else if (error.request) {
                console.error("Error request:", error.request);
                errorMessage += "No response from server. Please check your connection.";
            } else {
                errorMessage += error.message;
            }

            alert(errorMessage);
        } finally {
            setState(prev => ({ ...prev, isPrinting: false }));
        }
    };
    // Auto-fetch archived sales when both start date and end date are selected
    useEffect(() => {
        if (viewOldBills && startDate && endDate) {
            // Add a small delay to avoid too many requests while typing
            const delayDebounce = setTimeout(() => {
                fetchArchivedSales(true);
            }, 500);
            return () => clearTimeout(delayDebounce);
        }
    }, [startDate, endDate, viewOldBills]);
    // Add this useEffect after your existing state declarations
    useEffect(() => {
        // When View Old Bills is clicked, automatically select Walking Customer
        if (viewOldBills) {
            setState(prev => ({ ...prev, customerType: 'walking' }));
        }
    }, [viewOldBills]); // This runs whenever viewOldBills changes
    const stats = useMemo(() => {
        const pendingAmount = filterPendingBills.reduce((sum, b) => sum + b.totalAmount, 0);
        const appliedAmount = filterAppliedBills.reduce((sum, b) => sum + b.totalAmount, 0);
        const pendingGiven = filterPendingBills.reduce((sum, b) => sum + (b.givenAmount || 0), 0);
        const appliedGiven = filterAppliedBills.reduce((sum, b) => sum + (b.givenAmount || 0), 0);
        return { totalPending: filterPendingBills.length, totalApplied: filterAppliedBills.length, totalAmount: pendingAmount + appliedAmount, totalGiven: pendingGiven + appliedGiven };
    }, [filterPendingBills, filterAppliedBills]);
   const handleCreditPayment = async () => {
    // Get the amount from input field
    let paymentAmount = parseFloat(state.givenAmountInput);

    console.log('=== CREDIT PAYMENT DEBUG ===');
    console.log('Input field raw value:', state.givenAmountInput);
    console.log('Parsed payment amount:', paymentAmount);
    console.log('Selected bill:', state.selectedBill?.billNo);
    console.log('Customer code:', state.selectedBill?.customerCode);
    console.log('Total bill amount:', state.selectedBill?.totalAmount);
    console.log('Already given:', state.selectedBill?.givenAmount);

    // Validate amount
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        alert("Please enter a valid amount greater than 0");
        return;
    }

    if (!state.selectedBill) {
        alert("Please select a bill first");
        return;
    }

    // Check against debt amount if exists, otherwise against remaining bill amount
    const remainingDebtAmount = selectedBillDebtor?.remaining_amount || 0;
    const remainingBillAmount = state.selectedBill.totalAmount - (state.selectedBill.givenAmount || 0);
    const maxAllowed = remainingDebtAmount > 0 ? remainingDebtAmount : remainingBillAmount;
    
    if (paymentAmount > maxAllowed) {
        alert(`Amount exceeds maximum allowed!\n\nMaximum: Rs. ${formatDecimal(maxAllowed)}\nEntered: Rs. ${formatDecimal(paymentAmount)}`);
        return;
    }

    // Show confirmation dialog with the exact amount
    const confirmCredit = window.confirm(
        `⚠️ CREDIT PAYMENT CONFIRMATION ⚠️\n\n` +
        `Bill Number: ${state.selectedBill.billNo}\n` +
        `Customer: ${state.selectedBill.customerCode}\n` +
        `Amount: Rs. ${paymentAmount.toFixed(2)}\n` +
        `Maximum Allowed: Rs. ${formatDecimal(maxAllowed)}\n\n` +
        `This amount will be recorded as DEBT in the debtors table.\n` +
        `Are you sure you want to proceed?`
    );

    if (!confirmCredit) return;

    await processCreditPayment(paymentAmount);
};

    if (state.isLoading) return <LoadingSkeleton />;

    return (
        <div style={styles.app}>
            <div style={styles.container}>
                {/* Old Bills Bar */}
                <div style={styles.oldBillsBar}>
                    <button
                        onClick={async () => {
                            if (viewOldBills) {
                                // Switching from Old Bills to Current Bills
                                resetToCurrentSales();
                                // Reset customer type to null (user must select again)
                                setState(prev => ({ ...prev, customerType: null }));
                            } else {
                                // Switching from Current Bills to Old Bills
                                setViewOldBills(true);
                                // Auto-select Walking Customer when viewing old bills
                                setState(prev => ({ ...prev, customerType: 'walking' }));

                                // Don't fetch immediately - let user select dates first
                                // Just show the date pickers
                            }
                        }}
                        style={{
                            padding: '10px 24px',
                            background: viewOldBills ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #64748b, #475569)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }}
                    >
                        <span>📜</span>{viewOldBills ? '📅 View Current Bills' : '📜 View Old Bills'}
                    </button>

                    {viewOldBills && (
                        <div style={styles.datePickerContainer}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        // Auto-fetch when both dates are selected
                                        if (endDate && e.target.value) {
                                            setTimeout(() => {
                                                fetchArchivedSales();
                                            }, 100);
                                        }
                                    }}
                                    style={styles.dateInput}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        // Auto-fetch when both dates are selected
                                        if (startDate && e.target.value) {
                                            setTimeout(() => {
                                                fetchArchivedSales();
                                            }, 100);
                                        }
                                    }}
                                    style={styles.dateInput}
                                />
                            </div>
                            <button
                                onClick={() => {
                                    if (startDate && endDate) {
                                        setArchivedData(prev => ({ ...prev, isLoading: true }));
                                        fetchArchivedSales();
                                    } else {
                                        alert('Please select both start and end dates');
                                    }
                                }}
                                style={{
                                    padding: '8px 20px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    marginTop: '18px'
                                }}
                            >
                                Apply Filter
                            </button>
                            <button
                                onClick={resetToCurrentSales}
                                style={{
                                    padding: '8px 20px',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    marginTop: '18px'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {dataSource === 'sales_history' && (
                        <div style={styles.viewTypeIndicator}>
                            <span>📚</span>Viewing Archived Bills
                            <button
                                onClick={() => {
                                    resetToCurrentSales();
                                    setState(prev => ({ ...prev, customerType: null }));
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#92400e',
                                    cursor: 'pointer',
                                    marginLeft: '4px'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                <div style={styles.threeColumns}>
                    {/* LEFT: Completed Payments */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}><h2 style={styles.panelTitle}><span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></span>{dataSource === 'sales_history' ? 'Archived Completed' : 'Completed Payments'}<span style={{ fontSize: '11px', marginLeft: '8px' }}>(Right-click to delete)</span></h2></div>
                        <div style={{ padding: '12px 16px 0' }}><input type="text" placeholder="🔍 Search completed bills..." value={state.appliedSearchQuery} onChange={(e) => setState(prev => ({ ...prev, appliedSearchQuery: e.target.value.toUpperCase() }))} style={styles.searchInput} /></div>
                        <div style={styles.panelContent}>
                            {filterAppliedBills.length === 0 ? <EmptyStateComponent message="No completed bills" /> : filterAppliedBills.map(bill => (
                                <div key={bill.billNo} style={{ ...styles.billItem, ...styles.billApplied, ...(state.selectedBill?.billNo === bill.billNo && state.isUpdatingCompletedBill ? styles.billSelected : {}) }} onClick={() => handleBillClick(bill)} onContextMenu={(e) => handleContextMenu(e, bill)}>
                                    <div style={styles.billRow}>
                                        <div style={styles.billLeft}><div style={styles.billNo}>{bill.billNo}</div><div style={styles.billCustomer}>{bill.customerCode}</div></div>
                                        <div style={styles.billRight}>
                                            <div style={styles.billTotal}>Rs. {formatDecimal(bill.totalAmount)}</div>
                                            {getTotalReceived(bill) > 0 && <div style={styles.billGiven}>Paid: {formatDecimal(getTotalReceived(bill))}</div>}
                                            {bill.creditAmount > 0 && <div style={{ fontSize: '10px', color: '#d97706', marginTop: '2px' }}>💳 Credit: {formatDecimal(bill.creditAmount)}</div>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* CENTER: Bill Details */}
                    <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 320px)', minHeight: '500px', boxShadow: '0 20px 35px -10px rgba(0,0,0,0.15)' }}>
                        {/* Customer Type Selector */}
                        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                            <CustomerTypeSelector
                                selectedType={state.customerType}
                                onSelect={(type) => setState(prev => ({ ...prev, customerType: type }))}
                                disabled={state.isPrinting}
                                onDebtorClick={(code, billNo) => setState(prev => ({ ...prev, showDebtorForm: true, pendingDebtorBill: { customerCode: code, billNo } }))}
                                billCustomerCode={state.selectedBill?.customerCode}
                                billNo={state.selectedBill?.billNo}
                                selectedBillDebtor={selectedBillDebtor}
                            />
                        </div>

                        {/* Scrollable Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc', position: 'relative', opacity: !state.customerType ? 0.5 : 1, pointerEvents: !state.customerType ? 'none' : 'auto' }}>
                            {!state.customerType && (
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(200,200,200,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: '20px' }}>
                                    <div style={{ background: 'white', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Select customer type above to continue</div>
                                    </div>
                                </div>
                            )}

                            {state.selectedBill ? (
                                <>
                                    {/* Bill Info Card */}
                                    <div style={{ padding: '24px', background: 'white', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                                            <div><div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Bill Number</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>#{state.selectedBill.billNo}</div></div>
                                            <div><div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Customer</div><div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{state.selectedBill.customerCode}</div></div>
                                            <div><span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '30px', fontSize: '12px', fontWeight: '600', background: state.selectedBill.givenAmountApplied === 'Y' ? '#10b981' : '#f59e0b', color: 'white' }}>{state.selectedBill.givenAmountApplied === 'Y' ? '✓ PAID' : '⏳ PENDING'}</span></div>
                                        </div>
                                        {selectedBillDebtor && selectedBillDebtor.Debtor_no && (
                                            <div style={{ marginTop: '12px', padding: '10px 12px', background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', borderRadius: '10px', borderLeft: '4px solid #8b5cf6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#6d28d9' }}>📋 Debtor Number:</div>
                                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#5b21b6', fontFamily: 'monospace' }}>{selectedBillDebtor.Debtor_no}</div>
                                            </div>
                                        )}
                                        {selectedBillDebtor && selectedBillDebtor.remaining_amount > 0 && selectedBillDebtor.credit_amount !== selectedBillDebtor.paid_amount && (
                                            <div style={{ marginTop: '16px', padding: '16px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: '14px', borderLeft: '4px solid #f59e0b' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                                    <div><div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>⚠️ Outstanding Debt</div><div style={{ fontSize: '22px', fontWeight: '700', color: '#dc2626' }}>Rs. {formatDecimal(selectedBillDebtor.remaining_amount)}</div><div style={{ fontSize: '11px', color: '#78350f' }}>Any payment applied to this debt first</div></div>
                                                    <div style={{ padding: '6px 12px', background: selectedBillDebtor.status === 'paid' ? '#10b981' : selectedBillDebtor.status === 'partial' ? '#f59e0b' : '#ef4444', borderRadius: '30px', color: 'white', fontSize: '11px', fontWeight: '600' }}>{selectedBillDebtor.status === 'paid' ? 'PAID' : selectedBillDebtor.status === 'partial' ? 'PARTIAL' : 'PENDING'}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Items Table */}
                                    <div style={{ padding: '24px', background: 'white', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><span>📋</span> Items List</div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                                                <thead><tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '14px 12px', textAlign: 'left' }}>Item</th><th style={{ padding: '14px 12px', textAlign: 'right' }}>Kg</th><th style={{ padding: '14px 12px', textAlign: 'right' }}>Price</th><th style={{ padding: '14px 12px', textAlign: 'center' }}>Packs</th><th style={{ padding: '14px 12px', textAlign: 'right' }}>Total</th></tr></thead>
                                                <tbody>{state.selectedBill.sales.map((s, i) => { const total = (parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0); return (<tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '14px 12px', fontWeight: '500' }}>{s.item_name}<div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.supplier_code || 'ASW'}</div></td><td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatDecimal(s.weight)}</td><td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatDecimal(s.price_per_kg)}</td><td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ background: '#f1f5f9', padding: '2px 10px', borderRadius: '20px', fontSize: '12px' }}>{s.packs}</span></td><td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700', color: '#059669', fontFamily: 'monospace' }}>Rs. {formatDecimal(total)}</td></tr>); })}</tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Totals Card */}
                                    <div style={{ padding: '24px', background: 'white', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#475569' }}><span>Subtotal:</span><span style={{ fontFamily: 'monospace' }}>Rs. {formatDecimal(state.selectedBill.sales.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0))}</span></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#475569' }}><span>Bag Charges:</span><span style={{ fontFamily: 'monospace' }}>Rs. {formatDecimal(state.selectedBill.sales.reduce((sum, s) => sum + ((parseFloat(s.packs) || 0) * (parseFloat(s.CustomerPackCost) || 0)), 0))}</span></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', fontWeight: '700', fontSize: '18px', borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}><span>Total Payable:</span><span style={{ fontFamily: 'monospace', color: '#dc2626' }}>Rs. {formatDecimal(state.selectedBill.totalAmount)}</span></div>
                                            {(state.selectedBill && (state.selectedBill.cashPayments > 0 || state.selectedBill.givenAmount > 0 || getTotalReceived(state.selectedBill) > 0)) && (<div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#059669', fontWeight: '600' }}><span>💰 Total Received:</span><span style={{ fontFamily: 'monospace' }}>Rs. {formatDecimal(getTotalReceived(state.selectedBill))}</span></div>)}
                                            {state.selectedBill.creditAmount > 0 && (<div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#d97706', fontWeight: '600' }}><span>Credit Taken:</span><span style={{ fontFamily: 'monospace' }}>Rs. {formatDecimal(state.selectedBill.creditAmount)}</span></div>)}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', fontSize: '16px', color: '#dc2626', fontWeight: '700', background: '#fef2f2', borderRadius: '12px', marginTop: '8px' }}><span>💰 Remaining:</span><span style={{ fontFamily: 'monospace', fontSize: '18px' }}>Rs. {formatDecimal(Math.max(0, state.selectedBill.totalAmount - getTotalReceived(state.selectedBill)))}</span></div>
                                        </div>
                                    </div>

                                    {/* Payment Section */}
                                    <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '16px' }}>💰 Enter Payment Amount</div>
                                        <input
                                            type="number"
                                            value={state.givenAmountInput}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (val === "") return setState(prev => ({ ...prev, givenAmountInput: "" }));
                                                let num = parseFloat(val);
                                                if (state.selectedBill) {
                                                    // If there's outstanding debt, use that as max, otherwise use remaining bill amount
                                                    const maxAmount = selectedBillDebtor?.remaining_amount > 0
                                                        ? selectedBillDebtor.remaining_amount
                                                        : (state.selectedBill.totalAmount - (state.selectedBill.givenAmount || 0));
                                                    if (num > maxAmount) {
                                                        alert(`Maximum allowed: Rs. ${formatDecimal(maxAmount)}`);
                                                        return;
                                                    }
                                                }
                                                setState(prev => ({ ...prev, givenAmountInput: val }));
                                            }}
                                            placeholder="0.00" disabled={state.isPrinting}
                                            style={{ width: '100%', padding: '16px', border: '2px solid #fbbf24', borderRadius: '14px', fontSize: '20px', fontWeight: '700', textAlign: 'center', background: 'white', fontFamily: 'monospace' }}
                                        />

                                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                                            <button onClick={async () => { const amt = parseFloat(state.givenAmountInput); if (!amt) alert("Enter amount"); else await processPayment(amt); }} disabled={state.isPrinting || !state.givenAmountInput} style={{ flex: 1, padding: '14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: state.isPrinting || !state.givenAmountInput ? 'not-allowed' : 'pointer', opacity: state.isPrinting || !state.givenAmountInput ? 0.5 : 1 }}>💵 Cash</button>
                                            <button onClick={() => { const amt = parseFloat(state.givenAmountInput); if (!amt) alert("Enter amount"); else setState(prev => ({ ...prev, pendingChequeAmount: amt, showChequeModal: true })); }} disabled={state.isPrinting || !state.givenAmountInput} style={{ flex: 1, padding: '14px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: state.isPrinting || !state.givenAmountInput ? 'not-allowed' : 'pointer', opacity: state.isPrinting || !state.givenAmountInput ? 0.5 : 1 }}>💳 Cheque</button>
                                            <button onClick={() => { const amt = parseFloat(state.givenAmountInput); if (!amt) alert("Enter amount"); else setState(prev => ({ ...prev, pendingBankToBankAmount: amt, showBankToBankModal: true })); }} disabled={state.isPrinting || !state.givenAmountInput} style={{ flex: 1, padding: '14px', background: '#ec489a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: state.isPrinting || !state.givenAmountInput ? 'not-allowed' : 'pointer', opacity: state.isPrinting || !state.givenAmountInput ? 0.5 : 1 }}>🏦 Transfer</button>
                                            <button onClick={handleCreditPayment} disabled={state.isPrinting || !state.givenAmountInput || parseFloat(state.givenAmountInput) === 0} style={{ flex: 1, padding: '14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: state.isPrinting || !state.givenAmountInput || parseFloat(state.givenAmountInput) === 0 ? 'not-allowed' : 'pointer', opacity: state.isPrinting || !state.givenAmountInput || parseFloat(state.givenAmountInput) === 0 ? 0.5 : 1 }}>💳 Credit</button>
                                        </div>

                                        {/* Adjustment Type Selection Buttons */}
                                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px dashed #fbbf24' }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '12px' }}>🔧 OR Select Adjustment Type:</div>
                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                <button onClick={() => handleAdjustmentTypeSelect('bag_to_box')} style={{ flex: 1, padding: '12px', background: state.adjustmentType === 'bag_to_box' ? 'linear-gradient(135deg, #10b981, #059669)' : 'white', color: state.adjustmentType === 'bag_to_box' ? 'white' : '#475569', border: state.adjustmentType === 'bag_to_box' ? 'none' : '2px solid #e2e8f0', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><span>📦</span> Bag to Box</button>
                                                <button onClick={() => handleAdjustmentTypeSelect('bill_to_bill')} style={{ flex: 1, padding: '12px', background: state.adjustmentType === 'bill_to_bill' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'white', color: state.adjustmentType === 'bill_to_bill' ? 'white' : '#475569', border: state.adjustmentType === 'bill_to_bill' ? 'none' : '2px solid #e2e8f0', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><span>📄</span> Bill to Bill</button>
                                                <button onClick={() => handleAdjustmentTypeSelect('bad_debt')} style={{ flex: 1, padding: '12px', background: state.adjustmentType === 'bad_debt' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'white', color: state.adjustmentType === 'bad_debt' ? 'white' : '#475569', border: state.adjustmentType === 'bad_debt' ? 'none' : '2px solid #e2e8f0', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><span>⚠️</span> Bad Debt</button>
                                            </div>

                                            {state.adjustmentType === 'bag_to_box' && (
                                                <div style={{ marginTop: '16px', padding: '16px', background: '#fef3c7', borderRadius: '12px' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                        <input type="number" placeholder="Number of Bags" value={state.bagCount} onChange={(e) => setState(prev => ({ ...prev, bagCount: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                                        <input type="number" placeholder="Value per Bag (Rs.)" value={state.bagValue} onChange={(e) => setState(prev => ({ ...prev, bagValue: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                                        <input type="number" placeholder="Number of Boxes" value={state.boxCount} onChange={(e) => setState(prev => ({ ...prev, boxCount: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                                        <input type="number" placeholder="Value per Box (Rs.)" value={state.boxValue} onChange={(e) => setState(prev => ({ ...prev, boxValue: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#92400e' }}>Adjustment Amount: Rs. {calculateBagToBoxAdjustment().toFixed(2)}</div>
                                                </div>
                                            )}

                                            {state.adjustmentType === 'bill_to_bill' && (
                                                <div style={{ marginTop: '16px', padding: '16px', background: '#dbeafe', borderRadius: '12px' }}>
                                                    <input type="text" placeholder="Customer Code" value={state.customerCodeField} onChange={(e) => setState(prev => ({ ...prev, customerCodeField: e.target.value.toUpperCase() }))} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                                    <input type="text" placeholder="Customer Bill No" value={state.customerBillNo} onChange={(e) => setState(prev => ({ ...prev, customerBillNo: e.target.value }))} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                                    <input
                                                        type="number"
                                                        placeholder="Bill Amount (Rs.)"
                                                        value={state.customerBillValue}
                                                        onChange={(e) => {
                                                            let val = e.target.value;
                                                            if (val === "") return setState(prev => ({ ...prev, customerBillValue: "" }));
                                                            let num = parseFloat(val);
                                                            if (state.selectedBill) {
                                                                const maxAmount = selectedBillDebtor?.remaining_amount > 0
                                                                    ? selectedBillDebtor.remaining_amount
                                                                    : (state.selectedBill.totalAmount - (state.selectedBill.givenAmount || 0));
                                                                if (num > maxAmount) {
                                                                    alert(`Maximum allowed: Rs. ${formatDecimal(maxAmount)}`);
                                                                    return;
                                                                }
                                                            }
                                                            setState(prev => ({ ...prev, customerBillValue: val }));
                                                        }}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </div>
                                            )}

                                            {state.adjustmentType === 'bad_debt' && (
                                                <div style={{ marginTop: '16px', padding: '16px', background: '#fee2e2', borderRadius: '12px' }}>
                                                    <input type="text" placeholder="Bad Debt Name/Reference" value={state.badDebtName} onChange={(e) => setState(prev => ({ ...prev, badDebtName: e.target.value }))} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                                    <input
                                                        type="number"
                                                        placeholder="Bad Debt Amount (Rs.)"
                                                        value={state.badDebtAmount}
                                                        onChange={(e) => {
                                                            let val = e.target.value;
                                                            if (val === "") return setState(prev => ({ ...prev, badDebtAmount: "" }));
                                                            let num = parseFloat(val);
                                                            if (state.selectedBill) {
                                                                const maxAmount = selectedBillDebtor?.remaining_amount > 0
                                                                    ? selectedBillDebtor.remaining_amount
                                                                    : (state.selectedBill.totalAmount - (state.selectedBill.givenAmount || 0));
                                                                if (num > maxAmount) {
                                                                    alert(`Maximum allowed: Rs. ${formatDecimal(maxAmount)}`);
                                                                    return;
                                                                }
                                                            }
                                                            setState(prev => ({ ...prev, badDebtAmount: val }));
                                                        }}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </div>
                                            )}

                                            <button onClick={handleAdjustmentPayment} disabled={state.isPrinting} style={{ width: '100%', marginTop: '16px', padding: '14px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: state.isPrinting ? 'not-allowed' : 'pointer', opacity: state.isPrinting ? 0.5 : 1 }}>✅ Apply {state.adjustmentType === 'bag_to_box' ? 'Bag to Box' : state.adjustmentType === 'bill_to_bill' ? 'Bill to Bill' : 'Bad Debt'} Adjustment</button>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <button onClick={handlePrintWithoutUpdate} disabled={state.isPrinting} style={{ width: '100%', padding: '14px', background: '#64748b', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: state.isPrinting ? 'not-allowed' : 'pointer' }}>🖨️ Re-print Bill</button>
                                        <button onClick={handleViewPaymentHistory} style={{ width: '100%', padding: '14px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>📜 View Payment History</button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
                                    <p style={{ fontSize: '16px', fontWeight: '500' }}>Click on any bill to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* RIGHT: Pending Payment */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}><h2 style={styles.panelTitle}><span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '50%' }}></span>{dataSource === 'sales_history' ? 'Archived Pending' : 'Pending Payment'}</h2></div>
                        <div style={{ padding: '12px 16px 0' }}><input type="text" placeholder="🔍 Search pending bills..." value={state.pendingSearchQuery} onChange={(e) => setState(prev => ({ ...prev, pendingSearchQuery: e.target.value.toUpperCase() }))} style={styles.searchInput} /></div>
                        <div style={styles.panelContent}>
                            {filterPendingBills.length === 0 ? <EmptyStateComponent message="No pending bills" /> : filterPendingBills.map(bill => (
                                <div key={bill.billNo} style={{ ...styles.billItem, ...(state.selectedBill?.billNo === bill.billNo && !state.isUpdatingCompletedBill ? styles.billSelected : {}) }} onClick={() => checkAndHandleDebtor(bill)}>
                                    <div style={styles.billRow}>
                                        <div style={styles.billLeft}><div style={styles.billNo}>{bill.billNo}</div><div style={styles.billCustomer}>{bill.customerCode}</div></div>
                                        <div style={styles.billRight}><div style={styles.billTotal}>Rs. {formatDecimal(bill.totalAmount)}</div>{bill.givenAmount > 0 && <div style={styles.billGiven}>Given: {formatDecimal(bill.givenAmount)}</div>}{bill.creditAmount > 0 && <div style={{ fontSize: '10px', color: '#d97706', marginTop: '2px' }}>💳 Credit: {formatDecimal(bill.creditAmount)}</div>}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={styles.statsRow}>
                    <div style={styles.statBox}><div style={styles.statLabel}>Pending</div><div style={styles.statNumber}>{stats.totalPending}</div><div style={styles.statSub}>bills awaiting payment</div></div>
                    <div style={styles.statBox}><div style={styles.statLabel}>Completed</div><div style={styles.statNumber}>{stats.totalApplied}</div><div style={styles.statSub}>bills paid</div></div>
                    <div style={styles.statBox}><div style={styles.statLabel}>Total Amount</div><div style={styles.statNumber}>Rs. {formatDecimal(stats.totalAmount)}</div><div style={styles.statSub}>all bills total</div></div>
                    <div style={styles.statBox}><div style={styles.statLabel}>Total Given</div><div style={styles.statNumber}>Rs. {formatDecimal(stats.totalGiven)}</div><div style={styles.statSub}>amount received</div></div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <nav style={{ backgroundColor: '#004d00', width: '100%', position: 'fixed', bottom: 0, zIndex: 1000, padding: '6px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '25px', alignItems: 'center' }}>
                    <button onClick={() => navigate('/debtor-creditor-report')} style={{ padding: '5px 16px', background: '#e83e8c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>CD Report</button>
                    <button onClick={() => toggleModal('itemReport')} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>එළවළු</button>
                    <button onClick={() => toggleModal('weightReport')} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>බර මත</button>
                    <button onClick={() => toggleModal('salesAdjustmentReport')} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>වෙනස් කිරීම</button>
                    <button onClick={() => window.location.href = `${basePath}/financial-report`} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>ආදායම් / වියදම්</button>
                    <button onClick={() => toggleModal('salesReport')} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>විකුණුම් වාර්තාව</button>
                    <button onClick={() => window.location.href = `${basePath}/supplier-profit`} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>සැපයුම් ලාභ</button>
                    <button onClick={() => window.location.href = `${basePath}/supplierreport`} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>සැපයුම් වාර්තාව</button>
                </div>
            </nav>

            {/* Modals */}
            <ChequeModal isOpen={state.showChequeModal} onClose={() => setState(prev => ({ ...prev, showChequeModal: false, pendingChequeAmount: 0 }))} onConfirm={async (details) => { await processPayment(state.pendingChequeAmount, true, details); }} amount={state.pendingChequeAmount} />
            <BankToBankModal isOpen={state.showBankToBankModal} onClose={() => setState(prev => ({ ...prev, showBankToBankModal: false, pendingBankToBankAmount: 0 }))} onConfirm={async (details) => { await processPayment(state.pendingBankToBankAmount, false, null, true, details); }} amount={state.pendingBankToBankAmount} customerCode={state.selectedBill?.customerCode} customerName={state.customers.find(c => c.short_name?.toUpperCase() === state.selectedBill?.customerCode?.toUpperCase())?.name} />
            <PaymentAdjustmentModal isOpen={state.showAdjustmentModal} onClose={() => setState(prev => ({ ...prev, showAdjustmentModal: false }))} onConfirm={async (data) => { await processPayment(data.amount, false, null, false, null, true, data); }} billNo={state.selectedBill?.billNo} customerCode={state.selectedBill?.customerCode} originalBillTotal={state.selectedBill?.totalAmount || 0} />
            <PaymentHistoryModal isOpen={state.showPaymentHistoryModal} onClose={() => setState(prev => ({ ...prev, showPaymentHistoryModal: false }))} payments={state.currentPayments} totalPaid={state.paymentHistoryTotalPaid} totalBill={state.paymentHistoryTotalBill} remaining={state.paymentHistoryRemaining} />
            <DebtorFormModal isOpen={state.showDebtorForm} onClose={() => setState(prev => ({ ...prev, showDebtorForm: false, pendingDebtorBill: null }))} onSave={handleDebtorSave} customerCode={state.pendingDebtorBill?.customerCode || ''} billNo={state.pendingDebtorBill?.billNo} />
            <DeleteConfirmationModal isOpen={state.showDeleteModal} onClose={() => setState(prev => ({ ...prev, showDeleteModal: false, deleteBillNo: null, deleteCustomerCode: null }))} onConfirm={handleDeleteBillPayments} billNo={state.deleteBillNo} customerCode={state.deleteCustomerCode} />

            {/* Report Modals */}
            <ItemReportModal isOpen={modals.itemReport} onClose={() => toggleModal('itemReport')} onGenerateReport={() => { }} loading={false} />
            <WeightReportModal isOpen={modals.weightReport} onClose={() => toggleModal('weightReport')} />
            <GrnSaleReportModal isOpen={modals.grnSaleReport} onClose={() => toggleModal('grnSaleReport')} />
            <SalesAdjustmentReportModal isOpen={modals.salesAdjustmentReport} onClose={() => toggleModal('salesAdjustmentReport')} />
            <GrnSalesOverviewReport isOpen={modals.grnSalesOverview} onClose={() => toggleModal('grnSalesOverview')} />
            <GrnSalesOverviewReport2 isOpen={modals.grnSalesOverview2} onClose={() => toggleModal('grnSalesOverview2')} />
            <SalesReportModal isOpen={modals.salesReport} onClose={() => toggleModal('salesReport')} />
            <GrnReportModal isOpen={modals.grnReport} onClose={() => toggleModal('grnReport')} />
            <DayProcessModal isOpen={modals.dayProcess} onClose={() => toggleModal('dayProcess')} />
        </div>
    );
}