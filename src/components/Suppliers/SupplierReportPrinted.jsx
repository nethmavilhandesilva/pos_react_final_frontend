import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import api from "../../api";

const routes = {
    getSuppliers: "/suppliers/supplierloans",
    getSupplierBillDetails: "/suppliers/bill",
    getUnprintedDetails: "/suppliers/unprinted-details",
    getBanks: "/banks",
    paymentHistory: "/supplier-loan/payment-history",
    deleteSupplierLoan: "/suppliers/delete-loan-record",
    updateGivenAmountApplied: "/suppliers/update-loan-payment",
    pendingCustomerBills: "/pending-customer-bills",
    pendingFarmerBills: "/pending-farmer-bills",
    printBill: "/suppliers/print-bill",
    checkOrCreateCreditor: "/suppliers/check-or-create-creditor",
    getSupplierByCode: "/suppliers/check-creditor"
};

// ==================== BANK ACCOUNT SELECTOR COMPONENT ====================
const BankAccountSelector = ({ selectedAccountId, onSelect, disabled = false }) => {
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        setLoading(true);
        try {
            const response = await api.get(routes.getBanks);
            if (response.data.success) {
                setBanks(response.data.data);
            } else {
                setError('Failed to load bank accounts');
            }
        } catch (error) {
            setError('Unable to load bank accounts');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Loading bank accounts...</div>;
    }

    if (error) {
        return <div style={{ padding: '10px', textAlign: 'center', color: '#ef4444', fontSize: '12px' }}>{error}</div>;
    }

    return (
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#334155' }}>
                Select Bank Account <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
                value={selectedAccountId || ''}
                onChange={(e) => onSelect(e.target.value ? parseInt(e.target.value) : null)}
                disabled={disabled}
                style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    cursor: 'pointer'
                }}
            >
                <option value="">-- Select Bank Account --</option>
                {banks.map(bank => (
                    <option key={bank.id} value={bank.id}>
                        {bank.bank_name} - {bank.branch} (Acc: {bank.account_no})
                    </option>
                ))}
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

    const formatCurrency = (amount) => {
        return `Rs. ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10001,
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                width: '550px',
                maxWidth: '90%',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: '1px solid #e2e8f0',
                }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>Payment History</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                </div>

                <div style={{
                    padding: '16px 20px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Total Bill</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(totalBill)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Total Paid</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalPaid)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Remaining</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(remaining)}</div>
                    </div>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {payments && payments.length > 0 ? (
                        payments.map((payment, index) => (
                            <div key={index} style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '14px' }}>Payment #{index + 1}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                        {new Date(payment.date).toLocaleString()}
                                    </div>
                                    {payment.reference && (
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                            Ref: {payment.reference}
                                        </div>
                                    )}
                                    {payment.running_balance && (
                                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                            Balance after: {formatCurrency(payment.running_balance)}
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        ...getPaymentMethodStyle(payment.method)
                                    }}>
                                        {getPaymentIcon(payment.method)} {getMethodDisplayName(payment.method)}
                                    </span>
                                    <div style={{ fontWeight: 'bold', marginTop: '8px', fontSize: '14px' }}>
                                        {formatCurrency(payment.amount)}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            No payment history available
                        </div>
                    )}
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <button onClick={onClose} style={{ padding: '8px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        </div>
    );
};

// ==================== CHEQUE MODAL ====================
const ChequeModal = ({ isOpen, onClose, onConfirm, amount }) => {
    const [chequeDetails, setChequeDetails] = useState({
        cheq_date: '',
        cheq_no: '',
        bank_account_id: null
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setChequeDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleBankSelect = (bankId) => {
        setChequeDetails(prev => ({ ...prev, bank_account_id: bankId }));
    };

    const handleSubmit = () => {
        if (!chequeDetails.cheq_date || !chequeDetails.cheq_no || !chequeDetails.bank_account_id) {
            alert("Please fill all cheque details and select a bank account");
            return;
        }
        onConfirm(chequeDetails);
        setChequeDetails({ cheq_date: '', cheq_no: '', bank_account_id: null });
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '20px',
                width: '380px',
                maxWidth: '90%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '24px' }}>💳</span>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: '700' }}>Cheque Payment</h3>
                </div>

                <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center' }}>
                    <label style={{ display: 'block', fontWeight: '600', fontSize: '12px', color: '#1e40af', marginBottom: '4px' }}>Payment Amount</label>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e3a8a', fontFamily: 'monospace' }}>Rs. {amount.toFixed(2)}</div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>📅 Cheque Date <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="date" name="cheq_date" value={chequeDetails.cheq_date} onChange={handleChange}
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none' }} />
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>🔢 Cheque Number <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" name="cheq_no" value={chequeDetails.cheq_no} onChange={handleChange}
                        placeholder="Enter cheque number"
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none' }} />
                </div>

                <div style={{ marginBottom: '18px' }}>
                    <BankAccountSelector selectedAccountId={chequeDetails.bank_account_id} onSelect={handleBankSelect} disabled={false} />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', flex: 1 }}>Cancel</button>
                    <button onClick={handleSubmit} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', flex: 1 }}>Confirm Payment</button>
                </div>
            </div>
        </div>
    );
};

// ==================== BANK TO BANK MODAL ====================
const BankToBankModal = ({ isOpen, onClose, onConfirm, amount, supplierCode }) => {
    const [transferDetails, setTransferDetails] = useState({
        bank_account_id: null,
        reference_no: '',
        transfer_date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchBanks();
        }
    }, [isOpen]);

    const fetchBanks = async () => {
        setLoading(true);
        try {
            const response = await api.get(routes.getBanks);
            if (response.data.success) {
                setBanks(response.data.data);
            } else {
                setError('Failed to load bank accounts');
            }
        } catch (error) {
            setError('Unable to load bank accounts');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTransferDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleBankSelect = (bankId) => {
        setTransferDetails(prev => ({ ...prev, bank_account_id: bankId ? parseInt(bankId) : null }));
    };

    const handleSubmit = () => {
        if (!transferDetails.bank_account_id) {
            alert("Please select a bank account");
            return;
        }
        if (!transferDetails.reference_no) {
            alert("Please enter transaction reference number");
            return;
        }
        onConfirm(transferDetails);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                width: '500px',
                maxWidth: '90%',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #ec489a, #db2777)',
                    borderRadius: '20px 20px 0 0',
                }}>
                    <span style={{ fontSize: '28px' }}>🏦</span>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: '700' }}>Bank to Bank Transfer</h3>
                </div>

                <div style={{ padding: '24px' }}>
                    <div style={{ background: '#fdf2f8', padding: '16px', borderRadius: '14px', marginBottom: '24px', border: '1px solid #fbcfe8' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#be185d', marginBottom: '10px' }}>💰 Payment Details</div>
                        <div style={{ fontSize: '13px', color: '#9d174d', lineHeight: '1.6' }}>
                            <strong>Amount:</strong> Rs. {amount.toFixed(2)}<br />
                            <strong>Supplier:</strong> {supplierCode}
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#334155' }}>🏦 Select Bank Account <span style={{ color: '#ef4444' }}>*</span></label>
                        <select value={transferDetails.bank_account_id || ''} onChange={(e) => handleBankSelect(e.target.value)} disabled={loading}
                            style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', background: 'white' }}>
                            <option value="">-- Select Bank Account --</option>
                            {banks.map(bank => <option key={bank.id} value={bank.id}>{bank.bank_name} - {bank.branch} (Acc: {bank.account_no})</option>)}
                        </select>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#334155' }}>🔢 Transaction Reference Number <span style={{ color: '#ef4444' }}>*</span></label>
                        <input type="text" name="reference_no" value={transferDetails.reference_no} onChange={handleChange}
                            placeholder="Enter transaction ID / Reference"
                            style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', outline: 'none', fontFamily: 'monospace' }} />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#334155' }}>📅 Transfer Date <span style={{ color: '#ef4444' }}>*</span></label>
                        <input type="date" name="transfer_date" value={transferDetails.transfer_date} onChange={handleChange}
                            style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', outline: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#334155' }}>📝 Notes (Optional)</label>
                        <textarea name="notes" value={transferDetails.notes} onChange={handleChange}
                            placeholder="Additional notes about the transfer..." rows="3"
                            style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', outline: 'none', resize: 'vertical' }} />
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
const PaymentAdjustmentModal = ({ isOpen, onClose, onConfirm, billNo, supplierCode, originalBillTotal }) => {
    const [adjustmentType, setAdjustmentType] = useState('bag_to_box');

    // Bag to Box fields
    const [bagCount, setBagCount] = useState('');
    const [boxCount, setBoxCount] = useState('');
    const [bagValue, setBagValue] = useState('');
    const [boxValue, setBoxValue] = useState('');

    // Bill to Bill fields (Simplified - only supplier fields)
    const [targetSupplierCode, setTargetSupplierCode] = useState('');
    const [targetSupplierBillNo, setTargetSupplierBillNo] = useState('');
    const [targetSupplierBillValue, setTargetSupplierBillValue] = useState('');

    // Bad Debt fields
    const [badDebtName, setBadDebtName] = useState('');
    const [badDebtAmount, setBadDebtAmount] = useState('');

    if (!isOpen) return null;

    const calculateBagToBoxAdjustment = () => {
        const totalBagValue = (parseInt(bagCount) || 0) * (parseFloat(bagValue) || 0);
        const totalBoxValue = (parseInt(boxCount) || 0) * (parseFloat(boxValue) || 0);
        return totalBagValue - totalBoxValue;
    };

    const handleConfirm = () => {
        const adjustmentData = {
            adjustment_type: adjustmentType,
            original_bill_total: originalBillTotal
        };

        if (adjustmentType === 'bag_to_box') {
            if (!bagCount || !boxCount || !bagValue || !boxValue) {
                alert('Please fill all bag/box fields');
                return;
            }
            adjustmentData.bag_count = parseInt(bagCount);
            adjustmentData.box_count = parseInt(boxCount);
            adjustmentData.bag_value = parseFloat(bagValue);
            adjustmentData.box_value = parseFloat(boxValue);
            adjustmentData.amount = Math.abs(calculateBagToBoxAdjustment());
        } else if (adjustmentType === 'bill_to_bill') {
            // Only validate supplier fields
            if (!targetSupplierCode || !targetSupplierBillNo || !targetSupplierBillValue) {
                alert('Please fill all bill to bill fields (Supplier Code, Bill No, and Amount)');
                return;
            }
            adjustmentData.target_supplier_code = targetSupplierCode;
            adjustmentData.target_supplier_bill_no = targetSupplierBillNo;
            adjustmentData.target_supplier_bill_value = parseFloat(targetSupplierBillValue);
            adjustmentData.amount = parseFloat(targetSupplierBillValue);
        } else if (adjustmentType === 'bad_debt') {
            if (!badDebtName || !badDebtAmount) {
                alert('Please enter bad debt name and amount');
                return;
            }
            adjustmentData.bad_debt_name = badDebtName;
            adjustmentData.bad_debt_amount = parseFloat(badDebtAmount);
            adjustmentData.amount = parseFloat(badDebtAmount);
        }

        onConfirm(adjustmentData);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.3s ease'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '24px',
                width: '750px',
                maxWidth: '90%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                animation: 'slideUp 0.3s ease'
            }} onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '24px 24px 0 0',
                    borderBottom: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>🔧</span>
                        <h3 style={{
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: '700',
                            color: 'white'
                        }}>Payment Adjustment</h3>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: 'white',
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}>
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto',
                    flex: 1,
                }}>
                    {/* Adjustment Type Selector */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            fontSize: '13px',
                            color: '#334155'
                        }}>Adjustment Type</label>
                        <select
                            value={adjustmentType}
                            onChange={(e) => setAdjustmentType(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '14px',
                                background: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: '500'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e2e8f0';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <option value="bag_to_box">📦 Bag to Box Conversion</option>
                            <option value="bill_to_bill">📄 Bill to Bill Transfer</option>
                            <option value="bad_debt">⚠️ Bad Debt Write-off</option>
                        </select>
                    </div>

                    {/* Bag to Box Section */}
                    {adjustmentType === 'bag_to_box' && (
                        <>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '16px',
                                marginBottom: '16px'
                            }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontWeight: '600',
                                        fontSize: '12px',
                                        color: '#334155'
                                    }}>📦 Number of Bags</label>
                                    <input
                                        type="number"
                                        value={bagCount}
                                        onChange={(e) => setBagCount(e.target.value)}
                                        placeholder="Enter bag count"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            transition: 'all 0.2s',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#f59e0b';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e2e8f0';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontWeight: '600',
                                        fontSize: '12px',
                                        color: '#334155'
                                    }}>💰 Value per Bag (Rs.)</label>
                                    <input
                                        type="number"
                                        value={bagValue}
                                        onChange={(e) => setBagValue(e.target.value)}
                                        placeholder="Bag value"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            transition: 'all 0.2s',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#f59e0b';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e2e8f0';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '16px',
                                marginBottom: '16px'
                            }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontWeight: '600',
                                        fontSize: '12px',
                                        color: '#334155'
                                    }}>📦 Number of Boxes</label>
                                    <input
                                        type="number"
                                        value={boxCount}
                                        onChange={(e) => setBoxCount(e.target.value)}
                                        placeholder="Enter box count"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            transition: 'all 0.2s',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#f59e0b';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e2e8f0';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontWeight: '600',
                                        fontSize: '12px',
                                        color: '#334155'
                                    }}>💰 Value per Box (Rs.)</label>
                                    <input
                                        type="number"
                                        value={boxValue}
                                        onChange={(e) => setBoxValue(e.target.value)}
                                        placeholder="Box value"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            transition: 'all 0.2s',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#f59e0b';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e2e8f0';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{
                                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                                padding: '16px',
                                borderRadius: '12px',
                                marginBottom: '20px',
                                border: '1px solid #fbbf24'
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '10px' }}>📊 Adjustment Summary</div>
                                <div style={{ fontSize: '12px', color: '#78350f', lineHeight: '1.6' }}>
                                    Total Bag Value: <strong>Rs. {(parseInt(bagCount) * parseFloat(bagValue) || 0).toFixed(2)}</strong><br />
                                    Total Box Value: <strong>Rs. {(parseInt(boxCount) * parseFloat(boxValue) || 0).toFixed(2)}</strong><br />
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#065f46' }}>
                                        Adjustment Amount: Rs. {Math.abs(calculateBagToBoxAdjustment()).toFixed(2)}
                                    </span><br />
                                    <span style={{ fontSize: '11px', color: '#78716c' }}>
                                        This amount will be deducted from the remaining payment
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Bill to Bill Section - Simplified (Supplier only) */}
                    {adjustmentType === 'bill_to_bill' && (
                        <>
                            <div style={{
                                marginBottom: '24px',
                                padding: '16px',
                                background: '#f8fafc',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '12px',
                                    paddingBottom: '8px',
                                    borderBottom: '2px solid #10b981',
                                    display: 'inline-block'
                                }}>🏪 Supplier Bill Transfer</div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '16px',
                                    marginBottom: '16px'
                                }}>
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '6px',
                                            fontWeight: '600',
                                            fontSize: '12px',
                                            color: '#334155'
                                        }}>Supplier Code</label>
                                        <input
                                            type="text"
                                            value={targetSupplierCode}
                                            onChange={(e) => setTargetSupplierCode(e.target.value.toUpperCase())}
                                            placeholder="Enter supplier code"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                transition: 'all 0.2s',
                                                outline: 'none'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#10b981';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '6px',
                                            fontWeight: '600',
                                            fontSize: '12px',
                                            color: '#334155'
                                        }}>Supplier Bill No</label>
                                        <input
                                            type="text"
                                            value={targetSupplierBillNo}
                                            onChange={(e) => setTargetSupplierBillNo(e.target.value)}
                                            placeholder="Enter supplier bill number"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                transition: 'all 0.2s',
                                                outline: 'none'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#10b981';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontWeight: '600',
                                        fontSize: '12px',
                                        color: '#334155'
                                    }}>Bill Amount (Rs.)</label>
                                    <input
                                        type="number"
                                        value={targetSupplierBillValue}
                                        onChange={(e) => setTargetSupplierBillValue(e.target.value)}
                                        placeholder="Enter bill amount"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            transition: 'all 0.2s',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#10b981';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e2e8f0';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Transfer Summary */}
                            <div style={{
                                background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
                                padding: '16px',
                                borderRadius: '12px',
                                marginBottom: '20px',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af', marginBottom: '10px' }}>📊 Transfer Summary</div>
                                <div style={{ fontSize: '12px', color: '#1e3a8a', lineHeight: '1.6' }}>
                                    Supplier Bill Amount: <strong>Rs. {(parseFloat(targetSupplierBillValue) || 0).toLocaleString()}</strong><br />
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#065f46' }}>
                                        Total Transfer Amount: Rs. {(parseFloat(targetSupplierBillValue) || 0).toLocaleString()}
                                    </span><br />
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                        This amount will be deducted from the remaining payment
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Bad Debt Section */}
                    {adjustmentType === 'bad_debt' && (
                        <>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    color: '#334155'
                                }}>Bad Debt Name/Reference</label>
                                <input
                                    type="text"
                                    value={badDebtName}
                                    onChange={(e) => setBadDebtName(e.target.value)}
                                    placeholder="Enter customer name or reference"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#ef4444';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e2e8f0';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    color: '#334155'
                                }}>Bad Debt Amount (Rs.)</label>
                                <input
                                    type="number"
                                    value={badDebtAmount}
                                    onChange={(e) => setBadDebtAmount(e.target.value)}
                                    placeholder="Enter amount to write off"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#ef4444';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e2e8f0';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                            <div style={{
                                background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
                                padding: '16px',
                                borderRadius: '12px',
                                marginBottom: '20px',
                                border: '1px solid #f87171'
                            }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>
                                    ⚠️ Warning: Bad Debt Write-off
                                </div>
                                <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
                                    Bad debt adjustment will write off <strong>Rs. {(parseFloat(badDebtAmount) || 0).toLocaleString()}</strong> from this bill.<br />
                                    This action cannot be undone and will deduct this amount from the remaining payment.
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    background: '#f8fafc',
                    borderRadius: '0 0 24px 24px'
                }}>
                    <button onClick={onClose} style={{
                        padding: '10px 24px',
                        background: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#e2e8f0';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}>
                        Cancel
                    </button>
                    <button onClick={handleConfirm} style={{
                        padding: '10px 24px',
                        background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
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
                        }}>
                        Apply Adjustment
                    </button>
                </div>
            </div>

            <style>{`
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `}</style>
        </div>
    );
};

// ==================== DELETE CONFIRMATION MODAL ====================
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, supplierCode, billNo }) => {
    const [loading, setLoading] = useState(false);
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 20001,
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                width: '450px',
                maxWidth: '90%',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '48px' }}>⚠️</span>
                    <h3 style={{ margin: '10px 0 5px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Delete Payment Record</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Are you sure you want to delete this payment record?</p>
                </div>
                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: '#92400e', border: '1px solid #fde68a' }}>
                    <strong>Supplier:</strong> {supplierCode}<br />
                    <strong>Bill No:</strong> {billNo || 'N/A'}<br />
                    <strong>Warning:</strong> This action cannot be undone!
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Cancel</button>
                    <button onClick={() => onConfirm(supplierCode, billNo)} disabled={loading} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px', opacity: loading ? 0.6 : 1 }}>{loading ? 'Deleting...' : 'Yes, Delete'}</button>
                </div>
            </div>
        </div>
    );
};

// ==================== PRINT BILL MODAL ====================
const PrintBillModal = ({ isOpen, onClose, billContent, billSize, setBillSize, onPrint }) => {
    const printRef = useRef();

    if (!isOpen) return null;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Bill</title>
                    <style>
                        @media print {
                            @page { margin: 0; }
                            body { margin: 0; padding: 0; }
                        }
                    </style>
                </head>
                <body>${billContent}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
        onPrint();
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 20002,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '500px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
                <h3>Print Bill</h3>
                <div style={{ marginBottom: '16px' }}>
                    <label>Bill Size: </label>
                    <select value={billSize} onChange={(e) => setBillSize(e.target.value)} style={{ padding: '8px', marginLeft: '12px', borderRadius: '8px' }}>
                        <option value="4inch">4 Inch (Thermal)</option>
                        <option value="a4">A4 Paper</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px' }}>Cancel</button>
                    <button onClick={handlePrint} style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px' }}>Print Bill</button>
                </div>
            </div>
        </div>
    );
};

// ==================== CREDITOR MODAL ====================
const CreditorModal = ({ isOpen, onClose, onConfirm }) => {
    const [supplierCode, setSupplierCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSupplierForm, setShowSupplierForm] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        dob: '',
        address: '',
        telephone_no: '',
        profile_pic: null,
        nic_front: null,
        nic_back: null
    });

    if (!isOpen) return null;

    const handleCheckCreditor = async () => {
        if (!supplierCode) {
            alert('Please enter supplier code');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(routes.checkOrCreateCreditor, {
                supplier_code: supplierCode
            });

            if (response.data.exists) {
                onConfirm(response.data.supplier);
                onClose();
            } else {
                setShowSupplierForm(true);
            }
        } catch (error) {
            alert('Error checking supplier: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        const { name, value, files } = e.target;
        if (files) {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCreateSupplier = async () => {
        const submitData = new FormData();
        submitData.append('code', formData.code.toUpperCase());
        submitData.append('name', formData.name);
        submitData.append('dob', formData.dob);
        submitData.append('address', formData.address);
        submitData.append('telephone_no', formData.telephone_no);
        if (formData.profile_pic) submitData.append('profile_pic', formData.profile_pic);
        if (formData.nic_front) submitData.append('nic_front', formData.nic_front);
        if (formData.nic_back) submitData.append('nic_back', formData.nic_back);

        setLoading(true);
        try {
            const response = await api.post('/suppliers', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onConfirm(response.data.supplier);
            onClose();
        } catch (error) {
            alert('Error creating supplier: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (showSupplierForm) {
        return (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 20001, overflowY: 'auto'
            }} onClick={onClose}>
                <div style={{
                    backgroundColor: 'white', borderRadius: '20px',
                    width: '500px', maxWidth: '90%', margin: '50px auto',
                    padding: '24px'
                }} onClick={(e) => e.stopPropagation()}>
                    <h3>Create New Supplier (Creditor)</h3>
                    <form onSubmit={(e) => { e.preventDefault(); handleCreateSupplier(); }}>
                        <input type="text" name="code" placeholder="Supplier Code *" required onChange={handleFormChange} style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '8px' }} />
                        <input type="text" name="name" placeholder="Supplier Name *" required onChange={handleFormChange} style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '8px' }} />
                        <input type="date" name="dob" required onChange={handleFormChange} style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '8px' }} />
                        <textarea name="address" placeholder="Address *" required onChange={handleFormChange} style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '8px' }} />
                        <input type="text" name="telephone_no" placeholder="Telephone No *" required onChange={handleFormChange} style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '8px' }} />
                        <input type="file" name="profile_pic" accept="image/*" onChange={handleFormChange} style={{ width: '100%', padding: '10px', margin: '8px 0' }} />
                        <input type="file" name="nic_front" accept="image/*" onChange={handleFormChange} style={{ width: '100%', padding: '10px', margin: '8px 0' }} />
                        <input type="file" name="nic_back" accept="image/*" onChange={handleFormChange} style={{ width: '100%', padding: '10px', margin: '8px 0' }} />
                        <button type="submit" disabled={loading} style={{ padding: '12px 24px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', marginTop: '16px' }}>Create Supplier</button>
                    </form>
                    <button onClick={() => setShowSupplierForm(false)} style={{ marginTop: '12px', padding: '8px', background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '100%' }}>Back</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 20001,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '400px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
                <h3>Creditor Mode</h3>
                <p>Enter supplier code to mark as creditor:</p>
                <input type="text" value={supplierCode} onChange={(e) => setSupplierCode(e.target.value.toUpperCase())}
                    placeholder="Enter Supplier Code" autoFocus
                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }} />
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px' }}>Cancel</button>
                    <button onClick={handleCheckCreditor} disabled={loading} style={{ flex: 1, padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px' }}>{loading ? 'Checking...' : 'Continue'}</button>
                </div>
            </div>
        </div>
    );
};

// ==================== STYLES ====================
const styles = {
    app: { width: '100vw', minHeight: '100vh', background: '#0dea77', margin: 0, padding: 0, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
    container: { width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '24px 32px' },
    threeColumns: { display: 'grid', gridTemplateColumns: '0.7fr 2fr 0.7fr', gap: '24px', alignItems: 'start', width: '100%' },
    panel: { background: '#11ba2d', borderRadius: '20px', border: '4px solid #000000', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 320px)', minHeight: '500px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    panelHeader: { padding: '16px 20px', background: '#ffffff', borderBottom: '1px solid #eef2ff' },
    panelTitle: { fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' },
    panelContent: { flex: 1, overflowY: 'auto', padding: '16px' },
    searchInput: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', background: 'white', outline: 'none' },
    billItem: { padding: '14px', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer', transition: 'all 0.15s', border: '1px solid transparent' },
    billPending: { background: '#ffffff', borderColor: '#f1f5f9' },
    billSelected: { background: '#eff6ff', borderColor: '#074ec1' },
    billApplied: { background: '#f0fdf4', borderColor: '#dcfce7' },
    billRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    billLeft: { flex: 1 },
    billNo: { fontWeight: '700', fontSize: '15px', color: '#0f172a' },
    billCustomer: { fontSize: '12px', color: '#000000', fontWeight: 'bold', marginTop: '2px' },
    billRight: { textAlign: 'right' },
    billTotal: { fontWeight: '700', fontSize: '15px', color: '#0f172a' },
    billGiven: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '28px', marginBottom: '0' },
    statBox: { background: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
    statLabel: { fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    statNumber: { fontSize: '32px', fontWeight: '700', color: '#0f172a' },
    statSub: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
    emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' },
    modeSelector: { display: 'flex', gap: '12px', marginBottom: '20px' },
    modeButton: { flex: 1, padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' },
    modeButtonActive: { background: '#4CAF50', color: 'white', borderColor: '#4CAF50' },
    paymentBox: { background: '#f8fafc', borderRadius: '16px', padding: '18px', margin: '0 0 16px 0' },
    paymentButtonsContainer: { display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' },
    cashPaymentBtn: { flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    chequePaymentBtn: { flex: 1, padding: '12px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    bankToBankPaymentBtn: { flex: 1, padding: '12px', background: '#ec489a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    adjustmentBtn: { width: '100%', marginBottom: '12px', padding: '12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }
};

const LoadingSkeleton = () => (
    <div style={styles.app}>
        <div style={styles.container}>
            <div style={{ height: '40px', background: '#e2e8f0', borderRadius: '12px', width: '200px', marginBottom: '24px' }}></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '24px' }}>
                {[1, 2, 3].map(i => <div key={i} style={{ background: 'white', borderRadius: '20px', height: '500px' }}></div>)}
            </div>
        </div>
    </div>
);

const EmptyState = ({ message }) => (
    <div style={styles.emptyState}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
        <p style={{ margin: 0, fontSize: '13px' }}>{message}</p>
    </div>
);

// ==================== MAIN COMPONENT ====================
export default function SupplierReport() {
    const [state, setState] = useState({
        pendingSuppliers: [],
        completedSuppliers: [],
        selectedSupplier: null,
        selectedBillNo: null,
        supplierDetails: [],
        isLoading: true,
        isPrinting: false,
        paymentAmount: "",
        searchPendingQuery: "",
        searchCompletedQuery: "",
        showChequeModal: false,
        pendingChequeAmount: 0,
        showBankToBankModal: false,
        pendingBankToBankAmount: 0,
        showAdjustmentModal: false,
        showPaymentHistoryModal: false,
        currentPayments: [],
        paymentHistoryTotalPaid: 0,
        paymentHistoryTotalBill: 0,
        paymentHistoryRemaining: 0,
        showDeleteModal: false,
        deleteSupplierCode: null,
        deleteBillNo: null,
        paymentMethod: 'Cash',
        isUpdatingCompletedBill: false,
        currentPaidAmount: 0,
        showCreditorModal: false,
        selectedMode: 'walking_seller',
        showPrintModal: false,
        printBillContent: '',
        billSize: '4inch',
        paymentBreakdown: []
    });

    const formatDecimal = (value) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(value || 0));
    };

    const fetchSupplierData = async () => {
        try {
            const response = await api.get(routes.getSuppliers);
            if (response.data) {
                const pending = response.data.unprinted || [];
                const completed = response.data.printed || [];
                setState(prev => ({ ...prev, pendingSuppliers: pending, completedSuppliers: completed, isLoading: false }));
            }
        } catch (error) {
            console.error("Error fetching supplier data:", error);
            setState(prev => ({ ...prev, isLoading: false }));
        }
    };

    const fetchPaymentHistory = async (supplierCode, billNo) => {
        try {
            const response = await api.get(`${routes.paymentHistory}?code=${supplierCode}&bill_no=${billNo || ''}`);
            if (response.data.success) {
                setState(prev => ({
                    ...prev,
                    currentPayments: response.data.data.payments || [],
                    paymentHistoryTotalPaid: response.data.data.total_paid || 0,
                    paymentHistoryTotalBill: response.data.data.total_paid + response.data.data.remaining_balance,
                    paymentHistoryRemaining: response.data.data.remaining_balance || 0,
                    showPaymentHistoryModal: true
                }));
            }
        } catch (error) {
            console.error('Error fetching payment history:', error);
            alert('Failed to fetch payment history');
        }
    };

    useEffect(() => {
        fetchSupplierData();
        const interval = setInterval(fetchSupplierData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleModeChange = (mode) => {
        setState(prev => ({ ...prev, selectedMode: mode }));
        if (mode === 'creditor') {
            setState(prev => ({ ...prev, showCreditorModal: true }));
        }
    };

    const handleCreditorConfirm = async (supplier) => {
        alert(`Supplier ${supplier.code} marked as creditor successfully!`);
        await fetchSupplierData();
        handleSupplierClick(supplier.code, null);
    };

    const handleSupplierClick = async (supplierCode, billNo = null) => {
        if (state.selectedSupplier === supplierCode && state.selectedBillNo === billNo) {
            setState(prev => ({ ...prev, selectedSupplier: null, selectedBillNo: null, supplierDetails: [], paymentAmount: "", currentPaidAmount: 0, paymentBreakdown: [] }));
            return;
        }

        setState(prev => ({ ...prev, isPrinting: true, selectedSupplier: supplierCode, selectedBillNo: billNo }));
        try {
            let url, response;
            if (billNo) {
                url = `${routes.getSupplierBillDetails}/${billNo}/details?supplier_code=${supplierCode}`;
                response = await api.get(url);
            } else {
                url = `${routes.getUnprintedDetails}/${supplierCode}`;
                response = await api.get(url);
            }

            const total = response.data.reduce((sum, s) => sum + (parseFloat(s.SupplierTotal) || 0), 0);
            let currentPaid = 0;
            let paymentBreakdown = [];

            if (billNo) {
                try {
                    const loanRes = await api.get(`/supplier-loan/search?code=${supplierCode}&bill_no=${billNo}`);
                    if (loanRes.data) {
                        currentPaid = parseFloat(loanRes.data.loan_amount) || 0;
                        paymentBreakdown = loanRes.data.payment_details || [];
                        const isFullyPaid = (total - currentPaid) <= 0;
                        setState(prev => ({ ...prev, isUpdatingCompletedBill: isFullyPaid }));
                    }
                } catch (loanError) {
                    console.log('No existing loan record found');
                    setState(prev => ({ ...prev, isUpdatingCompletedBill: false }));
                }
            }

            setState(prev => ({
                ...prev,
                supplierDetails: response.data || [],
                paymentAmount: (total - currentPaid).toString(),
                currentPaidAmount: currentPaid,
                paymentBreakdown: paymentBreakdown,
                isPrinting: false
            }));
        } catch (error) {
            console.error("Error fetching supplier details:", error);
            alert(`Failed to load supplier details: ${error.response?.data?.message || error.message}`);
            setState(prev => ({ ...prev, isPrinting: false, supplierDetails: [] }));
        }
    };

    const generateBillContent = async (billNo) => {
        try {
            // Fetch bill details
            const response = await api.get(`${routes.getSupplierBillDetails}/${billNo}/details?supplier_code=${state.selectedSupplier}`);
            const details = response.data;

            // Fetch payment breakdown from the loan record
            let paymentBreakdown = [];
            let currentPaidAmount = 0;
            try {
                const loanRes = await api.get(`/supplier-loan/search?code=${state.selectedSupplier}&bill_no=${billNo}`);
                if (loanRes.data) {
                    currentPaidAmount = parseFloat(loanRes.data.loan_amount) || 0;
                    paymentBreakdown = loanRes.data.payment_details || [];
                }
            } catch (loanError) {
                console.log('No loan record found for payment breakdown');
            }

            // Calculate totals from details
            let totalsupplierSales = 0;
            let totalPacksSum = 0;
            const itemSummaryData = {};

            details.forEach(record => {
                const total = parseFloat(record.SupplierTotal) || 0;
                const weight = parseFloat(record.weight) || 0;
                const packs = parseInt(record.packs) || 0;
                const itemName = record.item_name || '';

                totalsupplierSales += total;
                totalPacksSum += packs;

                if (!itemSummaryData[itemName]) {
                    itemSummaryData[itemName] = { totalWeight: 0, totalPacks: 0 };
                }
                itemSummaryData[itemName].totalWeight += weight;
                itemSummaryData[itemName].totalPacks += packs;
            });

            const date = new Date().toLocaleDateString('si-LK');
            const mobile = '0775097620/0761042808';
            const is4Inch = state.billSize === '4inch';
            const receiptMaxWidth = is4Inch ? '4in' : '350px';
            const fontSizeBody = '25px';
            const fontSizeHeader = '23px';
            const fontSizeTotal = '28px';

            const paidAmountValue = currentPaidAmount;
            const remainingAfterPayment = Math.max(0, totalsupplierSales - paidAmountValue);
            const advanceAmount = 0;

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

            const detailedItemsHtml = details.map(record => {
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

            // Generate payment breakdown HTML - FIXED to show properly
            let paymentBreakdownHtml = '';
            if (paymentBreakdown && paymentBreakdown.length > 0) {
                paymentBreakdownHtml = paymentBreakdown.map((p, idx) => {
                    // Handle method name formatting
                    let methodName = p.method;
                    if (methodName === 'bag_to_box') methodName = 'Bag to Box';
                    if (methodName === 'bill_to_bill') methodName = 'Bill to Bill';
                    if (methodName === 'bad_debt') methodName = 'Bad Debt';

                    const amount = parseFloat(p.amount) || 0;
                    const paymentDate = p.date ? new Date(p.date).toLocaleDateString() : new Date().toLocaleDateString();

                    return `
                <tr style="font-size:16px;">
                    <td style="padding:8px; text-align:center; border-bottom:1px solid #ddd;">${idx + 1}</td>
                    <td style="padding:8px; border-bottom:1px solid #ddd;">${methodName}</td>
                    <td style="padding:8px; text-align:right; border-bottom:1px solid #ddd;">Rs. ${formatNumber(amount)}</td>
                    <td style="padding:8px; border-bottom:1px solid #ddd;">${paymentDate}</td>
                </tr>`;
                }).join('');
            }

            const summaryEntries = Object.entries(itemSummaryData);
            let itemSummaryHtml = '';
            for (let i = 0; i < summaryEntries.length; i += 2) {
                const [name1, d1] = summaryEntries[i];
                const [name2, d2] = summaryEntries[i + 1] || [null, null];
                const text1 = `${name1}:${formatNumber(d1.totalWeight)}/${formatNumber(d1.totalPacks)}`;
                const text2 = d2 ? `${name2}:${formatNumber(d2.totalWeight)}/${formatNumber(d2.totalPacks)}` : '';
                itemSummaryHtml += `<tr><td style="padding:6px; width:50%; font-weight:bold; white-space:nowrap; font-size:14px;">${text1}</td><td style="padding:6px; width:50%; font-weight:bold; white-space:nowrap; font-size:14px;">${text2}</td></tr>`;
            }

            const netPayable = totalsupplierSales - advanceAmount - paidAmountValue;

            return `
        <div style="width:${receiptMaxWidth}; margin:0 auto; padding:10px; font-family:'Courier New', monospace; color:#000; background:#fff;">
            <div style="text-align:center; font-weight:bold;">
                <div style="font-size:24px;">Manju</div>
                <div style="display:flex; justify-content:center; align-items:center; gap:15px; margin:12px 0;">
                    <span style="border:2.5px solid #000; padding:5px 12px; font-size:22px;">xx</span>
                    <div style="font-size:18px;">ගොවියා: <span style="border:2.5px solid #000; padding:5px 10px; font-size:22px;">${state.selectedSupplier}</span></div>
                </div>
                <div style="font-size:16px; white-space: nowrap;">එළවළු තොග වෙළෙන්දෝ බණ්ඩාරවෙල</div>
            </div>
            <div style="font-size:19px; margin-top:10px; padding:0 5px;">
                <div style="font-weight: bold;">දුර:${mobile}</div>
                <div style="display:flex; justify-content:space-between; margin-top:3px;">
                    <span>බිල් අංකය:${billNo}</span>
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
                
                ${paidAmountValue > 0 ? `
                <tr style="font-size:18px;">
                    <td style="font-size:15px; padding-top:10px;">ගෙවූ මුදල (Paid):</td>
                    <td style="text-align:right; padding-top:10px; color:#000;">- ${paidAmountValue.toFixed(2)}</td>
                </tr>
                <tr style="font-size:18px;">
                    <td style="font-size:15px; padding-top:5px;">ඉතිරි මුදල (Remaining):</td>
                    <td style="text-align:right; padding-top:5px; color:#000;">${remainingAfterPayment.toFixed(2)}</td>
                </tr>
                <tr><td colspan="2" style="border-top:1px dashed #000; padding: 5px 0;"></td></tr>
                ` : ''}

                <tr style="font-size:18px;">
                    <td style="font-size:15px; padding-top:5px;">අත්තිකාරම්</td>
                    <td style="text-align:right; padding-top:5px; color:#000;">- ${advanceAmount.toFixed(2)}</td>
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

            ${paymentBreakdownHtml ? `
            <div style="margin-top:25px; border-top:1px solid #000; padding-top:10px;">
                <div style="font-weight:bold; font-size:18px; text-align:center; margin-bottom:10px;">Payment Details</div>
                <table style="width:100%; border-collapse:collapse; font-size:14px;">
                    <thead>
                        <tr style="border-bottom:1px solid #000;">
                            <th style="padding:5px; text-align:center;">#</th>
                            <th style="padding:5px; text-align:left;">Method</th>
                            <th style="padding:5px; text-align:right;">Amount</th>
                            <th style="padding:5px; text-align:left;">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentBreakdownHtml}
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid #000; font-weight:bold;">
                            <td colspan="2" style="padding:8px;"><strong>Total Paid:</strong></td>
                            <td style="padding:8px; text-align:right;"><strong>Rs. ${formatNumber(paidAmountValue)}</strong></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            ` : ''}

            <div style="margin-top:25px; border-top:1px dashed #000; padding-top:10px;">
                <table style="width:100%; border-collapse:collapse; font-size:14px; text-align:center;">${itemSummaryHtml}</table>
            </div>
            
            <div style="text-align:center; margin-top:20px; font-size:16px;">
                <p>Thank you!</p>
            </div>
        </div>`;
        } catch (error) {
            console.error('Error generating bill:', error);
            return '<div>Error generating bill</div>';
        }
    };

  const processPayment = async (paymentAmount, isCheque = false, chequeDetails = null, isBankTransfer = false, bankTransferDetails = null, isAdjustment = false, adjustmentDetails = null) => {
    if (!state.selectedSupplier || state.isPrinting) return;

    setState(prev => ({ ...prev, isPrinting: true }));

    try {
        const totalPayable = state.supplierDetails.reduce((sum, s) => sum + (parseFloat(s.SupplierTotal) || 0), 0);
        const currentPaid = state.currentPaidAmount;
        const newTotalPaid = currentPaid + paymentAmount;
        const isFullySettled = newTotalPaid >= totalPayable;
        const newRemaining = Math.max(0, totalPayable - newTotalPaid);

        let paymentMethod = 'Cash';
        if (isAdjustment && adjustmentDetails) {
            paymentMethod = adjustmentDetails.type === 'bag_to_box' ? 'Bag to Box' :
                (adjustmentDetails.type === 'bill_to_bill' ? 'Bill to Bill' : 'Bad Debt');
        } else if (isBankTransfer) {
            paymentMethod = 'Bank Transfer';
        } else if (isCheque) {
            paymentMethod = 'Cheque';
        }

        // Create payment record
        const paymentRecord = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            amount: paymentAmount,
            method: paymentMethod,
            running_balance: newRemaining,
            reference: paymentMethod === 'Cash' ? null : (chequeDetails?.cheq_no || bankTransferDetails?.reference_no || adjustmentDetails?.reference),
            details: {}
        };

        // Add payment method specific details
        if (isCheque && chequeDetails) {
            paymentRecord.reference = chequeDetails.cheq_no;
            paymentRecord.details = { cheque_no: chequeDetails.cheq_no, cheque_date: chequeDetails.cheq_date };
        } else if (isBankTransfer && bankTransferDetails) {
            paymentRecord.reference = bankTransferDetails.reference_no;
            paymentRecord.details = { reference_no: bankTransferDetails.reference_no, transfer_date: bankTransferDetails.transfer_date };
        } else if (isAdjustment && adjustmentDetails) {
            if (adjustmentDetails.type === 'bag_to_box') {
                paymentRecord.reference = `${adjustmentDetails.bag_count} bags to ${adjustmentDetails.box_count} boxes`;
                paymentRecord.details = {
                    bag_count: adjustmentDetails.bag_count,
                    box_count: adjustmentDetails.box_count,
                    bag_value: adjustmentDetails.bag_value,
                    box_value: adjustmentDetails.box_value
                };
            } else if (adjustmentDetails.type === 'bill_to_bill') {
                paymentRecord.reference = adjustmentDetails.target_supplier_bill_no;
                paymentRecord.details = {
                    target_supplier_code: adjustmentDetails.target_supplier_code,
                    target_supplier_bill_no: adjustmentDetails.target_supplier_bill_no,
                    target_supplier_bill_value: adjustmentDetails.target_supplier_bill_value
                };
            } else if (adjustmentDetails.type === 'bad_debt') {
                paymentRecord.reference = adjustmentDetails.bad_debt_name;
                paymentRecord.details = {
                    bad_debt_name: adjustmentDetails.bad_debt_name,
                    bad_debt_amount: adjustmentDetails.bad_debt_amount
                };
            }
        }

        const allPaymentDetails = [...state.paymentBreakdown, paymentRecord];

        // Build payload
        const payload = {
            code: state.selectedSupplier,
            bill_no: state.selectedBillNo,
            loan_amount: paymentAmount,
            total_amount: newRemaining,
            type: paymentMethod,
            transaction_ids: state.supplierDetails.map(record => record.id),
            payment_details: allPaymentDetails
        };

        // Add payment-specific fields
        if (isCheque && chequeDetails) {
            payload.bank_name = chequeDetails.bank_name;
            payload.cheque_no = chequeDetails.cheq_no;
            payload.realized_date = chequeDetails.cheq_date;
            payload.bank_account_id = chequeDetails.bank_account_id;
        } else if (isBankTransfer && bankTransferDetails) {
            payload.bank_account_id = bankTransferDetails.bank_account_id;
            payload.transfer_reference_no = bankTransferDetails.reference_no;
            payload.transfer_date = bankTransferDetails.transfer_date;
            payload.transfer_notes = bankTransferDetails.notes;
        } else if (isAdjustment && adjustmentDetails) {
            if (adjustmentDetails.type === 'bag_to_box') {
                payload.bag_count = adjustmentDetails.bag_count;
                payload.box_count = adjustmentDetails.box_count;
                payload.bag_value = adjustmentDetails.bag_value;
                payload.box_value = adjustmentDetails.box_value;
                payload.adjustment_amount = adjustmentDetails.amount;
            } else if (adjustmentDetails.type === 'bill_to_bill') {
                payload.target_supplier_code = adjustmentDetails.target_supplier_code;
                payload.target_supplier_bill_no = adjustmentDetails.target_supplier_bill_no;
                payload.target_supplier_bill_value = adjustmentDetails.target_supplier_bill_value;
                payload.adjustment_amount = adjustmentDetails.amount;
            } else if (adjustmentDetails.type === 'bad_debt') {
                payload.bad_debt_name = adjustmentDetails.bad_debt_name;
                payload.bad_debt_amount = adjustmentDetails.bad_debt_amount;
                payload.adjustment_amount = adjustmentDetails.amount;
            }
        }

        const response = await api.post('/supplier-loan', payload);

        if (response.data.success) {
            await fetchSupplierData();

            if (isFullySettled && state.selectedBillNo) {
                const billContent = await generateBillContent(state.selectedBillNo);
                setState(prev => ({ ...prev, printBillContent: billContent, showPrintModal: true }));
            }

            alert(isFullySettled ? `✅ Payment Complete!\nPayment: ${paymentMethod} - Rs. ${formatDecimal(paymentAmount)}` : `✓ Payment Added: ${paymentMethod} - Rs. ${formatDecimal(paymentAmount)}`);

            setState(prev => ({
                ...prev,
                selectedSupplier: null,
                selectedBillNo: null,
                supplierDetails: [],
                paymentAmount: "",
                currentPaidAmount: 0,
                paymentBreakdown: [],
                showChequeModal: false,
                showBankToBankModal: false,
                showAdjustmentModal: false,
                isPrinting: false
            }));
        }
    } catch (error) {
        console.error("Payment error:", error);
        alert('Failed to record payment: ' + (error.response?.data?.message || error.message));
        setState(prev => ({ ...prev, isPrinting: false }));
    }
};

    const handleCashPayment = async () => {
        const paymentAmount = parseFloat(state.paymentAmount);
        if (paymentAmount === 0 || isNaN(paymentAmount)) {
            alert("Please enter an amount");
            return;
        }
        await processPayment(paymentAmount);
    };

    const handleChequePayment = async () => {
        const paymentAmount = parseFloat(state.paymentAmount);
        if (paymentAmount === 0 || isNaN(paymentAmount)) {
            alert("Please enter an amount");
            return;
        }
        setState(prev => ({ ...prev, pendingChequeAmount: paymentAmount, showChequeModal: true }));
    };

    const handleChequeConfirm = async (chequeDetails) => {
        await processPayment(state.pendingChequeAmount, true, chequeDetails);
    };

    const handleBankToBankPayment = async () => {
        const paymentAmount = parseFloat(state.paymentAmount);
        if (paymentAmount === 0 || isNaN(paymentAmount)) {
            alert("Please enter an amount");
            return;
        }
        setState(prev => ({ ...prev, pendingBankToBankAmount: paymentAmount, showBankToBankModal: true }));
    };

    const handleBankToBankConfirm = async (transferDetails) => {
        await processPayment(state.pendingBankToBankAmount, false, null, true, transferDetails);
    };

    const handleApplyAdjustment = async (adjustmentData) => {
        let adjustmentAmount = 0;
        if (adjustmentData.adjustment_type === 'bag_to_box') {
            adjustmentAmount = Math.abs((adjustmentData.bag_count * adjustmentData.bag_value) - (adjustmentData.box_count * adjustmentData.box_value));
        } else if (adjustmentData.adjustment_type === 'bill_to_bill') {
            adjustmentAmount = adjustmentData.target_supplier_bill_value;  // Use only supplier bill value
        } else if (adjustmentData.adjustment_type === 'bad_debt') {
            adjustmentAmount = adjustmentData.bad_debt_amount;
        }
        if (adjustmentAmount === 0) return alert("Adjustment amount is zero");
        await processPayment(adjustmentAmount, false, null, false, null, true, {
            type: adjustmentData.adjustment_type,
            amount: adjustmentAmount,
            ...adjustmentData
        });
        setState(prev => ({ ...prev, showAdjustmentModal: false }));
    };

    const handleDeletePayment = async (supplierCode, billNo) => {
        setState(prev => ({ ...prev, isPrinting: true }));
        try {
            const response = await api.post(routes.deleteSupplierLoan, { code: supplierCode, bill_no: billNo });
            if (response.data.success) {
                await fetchSupplierData();
                if (state.selectedSupplier === supplierCode) {
                    setState(prev => ({ ...prev, selectedSupplier: null, selectedBillNo: null, supplierDetails: [] }));
                }
                alert('Payment record deleted successfully!');
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert('Failed to delete payment record');
        } finally {
            setState(prev => ({ ...prev, isPrinting: false, showDeleteModal: false, deleteSupplierCode: null, deleteBillNo: null }));
        }
    };

    const handleContextMenu = (e, supplierCode, billNo) => {
        e.preventDefault();
        setState(prev => ({ ...prev, showDeleteModal: true, deleteSupplierCode: supplierCode, deleteBillNo: billNo }));
    };

    const filterPendingSuppliers = useMemo(() => {
        if (!state.searchPendingQuery) return state.pendingSuppliers;
        const q = state.searchPendingQuery.toLowerCase();
        return state.pendingSuppliers.filter(item =>
            item.supplier_code?.toLowerCase().includes(q) ||
            (item.supplier_bill_no && item.supplier_bill_no.toString().toLowerCase().includes(q))
        );
    }, [state.pendingSuppliers, state.searchPendingQuery]);

    const filterCompletedSuppliers = useMemo(() => {
        if (!state.searchCompletedQuery) return state.completedSuppliers;
        const q = state.searchCompletedQuery.toLowerCase();
        return state.completedSuppliers.filter(item =>
            item.supplier_code?.toLowerCase().includes(q) ||
            (item.supplier_bill_no && item.supplier_bill_no.toString().toLowerCase().includes(q))
        );
    }, [state.completedSuppliers, state.searchCompletedQuery]);

    const stats = useMemo(() => {
        const totalPending = filterPendingSuppliers.length;
        const totalCompleted = filterCompletedSuppliers.length;
        return { totalPending, totalCompleted };
    }, [filterPendingSuppliers, filterCompletedSuppliers]);

    const totalPayable = state.supplierDetails.reduce((sum, s) => sum + (parseFloat(s.SupplierTotal) || 0), 0);
    const currentGiven = parseFloat(state.paymentAmount) || 0;
    const remainingAfterPayment = Math.max(0, totalPayable - (state.currentPaidAmount + currentGiven));

    useEffect(() => {
        if (state.selectedSupplier && !state.isUpdatingCompletedBill && state.supplierDetails.length > 0) {
            if (!state.paymentAmount || parseFloat(state.paymentAmount) === 0) {
                const remaining = Math.max(0, totalPayable - state.currentPaidAmount);
                setState(prev => ({ ...prev, paymentAmount: remaining.toString() }));
            }
        }
    }, [state.selectedSupplier, totalPayable, state.supplierDetails, state.currentPaidAmount]);

    if (state.isLoading) return <LoadingSkeleton />;

    return (
        <div style={styles.app}>
            <div style={styles.container}>
                <div style={styles.modeSelector}>
                    <button
                        onClick={() => handleModeChange('walking_seller')}
                        style={{ ...styles.modeButton, ...(state.selectedMode === 'walking_seller' ? styles.modeButtonActive : {}) }}
                    >
                        🚶 Walking Seller
                    </button>
                    <button
                        onClick={() => handleModeChange('creditor')}
                        style={{ ...styles.modeButton, ...(state.selectedMode === 'creditor' ? styles.modeButtonActive : {}) }}
                    >
                        💰 Creditor Mode
                    </button>
                </div>

                <div style={styles.threeColumns}>
                    {/* LEFT: Not Settled */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}>
                            <h2 style={styles.panelTitle}>
                                <span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '50%', display: 'inline-block' }}></span>
                                Not Settled
                            </h2>
                        </div>
                        <div style={{ padding: '12px 16px 0 16px' }}>
                            <input type="text" placeholder="🔍 Search not settled..." value={state.searchPendingQuery} onChange={(e) => setState(prev => ({ ...prev, searchPendingQuery: e.target.value.toUpperCase() }))} style={styles.searchInput} />
                        </div>
                        <div style={styles.panelContent}>
                            {filterPendingSuppliers.length === 0 ? (
                                <EmptyState message="No pending suppliers" />
                            ) : (
                                filterPendingSuppliers.map((item, index) => {
                                    const remaining = item.total_amount || 0;
                                    const displayBillNo = item.supplier_bill_no || 'Pending';
                                    return (
                                        <div
                                            key={index}
                                            style={{ ...styles.billItem, ...styles.billPending, ...(state.selectedSupplier === item.supplier_code && state.selectedBillNo === displayBillNo ? styles.billSelected : {}) }}
                                            onClick={() => handleSupplierClick(item.supplier_code, displayBillNo)}
                                            onContextMenu={(e) => handleContextMenu(e, item.supplier_code, displayBillNo)}
                                        >
                                            <div style={styles.billRow}>
                                                <div style={styles.billLeft}>
                                                    <div style={styles.billNo}>{item.supplier_code}</div>
                                                    <div style={styles.billCustomer}>Bill: {displayBillNo}</div>
                                                </div>
                                                <div style={styles.billRight}>
                                                    <div style={styles.billTotal}>Rs. {formatDecimal(remaining)}</div>
                                                    {item.loan_amount > 0 && <div style={styles.billGiven}>Paid: {formatDecimal(item.loan_amount)}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* CENTER: Bill Details */}
                    <div style={{
                        background: 'white', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        height: 'calc(100vh - 320px)', minHeight: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                    }}>
                        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderBottom: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px 20px 0 0' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ width: '10px', height: '10px', background: '#fbbf24', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #fbbf24' }}></span>
                                Supplier Details
                                {state.selectedSupplier && (
                                    <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px', padding: '4px 12px', borderRadius: '20px', marginLeft: 'auto' }}
                                        onClick={() => setState(prev => ({ ...prev, selectedSupplier: null, selectedBillNo: null, supplierDetails: [], paymentAmount: "", currentPaidAmount: 0, paymentBreakdown: [] }))}>
                                        ✕ Clear
                                    </button>
                                )}
                            </h2>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
                            {state.selectedSupplier ? (
                                <>
                                    <div style={{ padding: '20px', background: 'white', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Supplier Code</div>
                                                <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{state.selectedSupplier}</div>
                                            </div>
                                            {state.selectedBillNo && (
                                                <div>
                                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Bill Number</div>
                                                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{state.selectedBillNo}</div>
                                                </div>
                                            )}
                                            <div>
                                                <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', background: state.isUpdatingCompletedBill ? '#10b981' : '#f59e0b', color: 'white' }}>
                                                    {state.isUpdatingCompletedBill ? '✓ PAID' : '⏳ PENDING'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>


                                    <div style={{ padding: '20px', background: 'white', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '12px' }}>📋 Items</div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ background: '#f1f5f9' }}>
                                                        <th style={{ padding: '8px', textAlign: 'left' }}>Customer</th>
                                                        <th style={{ padding: '8px', textAlign: 'left' }}>Item</th>
                                                        <th style={{ padding: '8px', textAlign: 'right' }}>Wt (kg)</th>
                                                        <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                                                        <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {state.supplierDetails.map((sale, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                            <td style={{ padding: '8px' }}>{sale.customer_code}</td>
                                                            <td style={{ padding: '8px' }}>{sale.item_name}</td>
                                                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatDecimal(sale.weight)}</td>
                                                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatDecimal(sale.SupplierPricePerKg)}</td>
                                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{formatDecimal(sale.SupplierTotal)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div style={{ padding: '20px', background: 'white', borderRadius: '16px', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                            <span>Total Payable:</span>
                                            <span>Rs. {formatDecimal(totalPayable)}</span>
                                        </div>
                                        {state.currentPaidAmount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#059669', fontWeight: 'bold' }}>
                                                <span>Already Paid:</span>
                                                <span>Rs. {formatDecimal(state.currentPaidAmount)}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: '8px', fontWeight: '700', fontSize: '16px', borderTop: '2px solid #e2e8f0' }}>
                                            <span>Remaining:</span>
                                            <span>Rs. {formatDecimal(Math.max(0, totalPayable - state.currentPaidAmount))}</span>
                                        </div>
                                    </div>

                                    {!state.isUpdatingCompletedBill && (
                                        <div style={styles.paymentBox}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '12px' }}>💰 Enter Payment Amount</div>
                                            <input type="number" value={state.paymentAmount} onChange={(e) => setState(prev => ({ ...prev, paymentAmount: e.target.value }))}
                                                placeholder="0.00" disabled={state.isPrinting}
                                                style={{ width: '100%', padding: '14px', border: '2px solid #fbbf24', borderRadius: '12px', fontSize: '18px', fontWeight: '600', textAlign: 'center', background: 'white' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '10px 0', fontSize: '14px' }}>
                                                <span>After Payment:</span>
                                                <span style={{ fontWeight: 'bold', color: remainingAfterPayment === 0 ? '#10b981' : '#065f46', fontSize: '16px' }}>
                                                    Rs. {formatDecimal(remainingAfterPayment === 0 ? 0 : remainingAfterPayment)}
                                                </span>
                                            </div>
                                            <div style={styles.paymentButtonsContainer}>
                                                <button onClick={handleCashPayment} disabled={state.isPrinting || !state.paymentAmount} style={{ ...styles.cashPaymentBtn, opacity: (!state.paymentAmount || parseFloat(state.paymentAmount) === 0) ? 0.5 : 1 }}>💵 Cash</button>
                                                <button onClick={handleChequePayment} disabled={state.isPrinting || !state.paymentAmount} style={{ ...styles.chequePaymentBtn, opacity: (!state.paymentAmount || parseFloat(state.paymentAmount) === 0) ? 0.5 : 1 }}>💳 Cheque</button>
                                                <button onClick={handleBankToBankPayment} disabled={state.isPrinting || !state.paymentAmount} style={{ ...styles.bankToBankPaymentBtn, opacity: (!state.paymentAmount || parseFloat(state.paymentAmount) === 0) ? 0.5 : 1 }}>🏦 Bank Transfer</button>
                                            </div>
                                        </div>
                                    )}

                                    {!state.isUpdatingCompletedBill && (
                                        <button onClick={() => setState(prev => ({ ...prev, showAdjustmentModal: true }))} style={styles.adjustmentBtn}>🔧 Payment Adjustment</button>
                                    )}
                                    <button onClick={() => fetchPaymentHistory(state.selectedSupplier, state.selectedBillNo)} style={{ width: '100%', marginBottom: '0', padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>📜 View Payment History</button>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                                    <p>Click on any supplier to view details and process payment</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Fully Settled */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}>
                            <h2 style={styles.panelTitle}>
                                <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                                Fully Settled
                            </h2>
                        </div>
                        <div style={{ padding: '12px 16px 0 16px' }}>
                            <input type="text" placeholder="🔍 Search settled..." value={state.searchCompletedQuery} onChange={(e) => setState(prev => ({ ...prev, searchCompletedQuery: e.target.value.toUpperCase() }))} style={styles.searchInput} />
                        </div>
                        <div style={styles.panelContent}>
                            {filterCompletedSuppliers.length === 0 ? (
                                <EmptyState message="No settled payments" />
                            ) : (
                                filterCompletedSuppliers.map((item, index) => (
                                    <div key={index} style={{ ...styles.billItem, ...styles.billApplied, ...(state.selectedSupplier === item.supplier_code && state.selectedBillNo === item.supplier_bill_no ? styles.billSelected : {}) }}
                                        onClick={() => handleSupplierClick(item.supplier_code, item.supplier_bill_no)} onContextMenu={(e) => handleContextMenu(e, item.supplier_code, item.supplier_bill_no)}>
                                        <div style={styles.billRow}>
                                            <div style={styles.billLeft}>
                                                <div style={styles.billNo}>{item.supplier_code}</div>
                                                <div style={styles.billCustomer}>Bill: {item.supplier_bill_no || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={styles.statsRow}>
                    <div style={styles.statBox}>
                        <div style={styles.statLabel}>Not Settled</div>
                        <div style={styles.statNumber}>{stats.totalPending}</div>
                        <div style={styles.statSub}>bills awaiting payment</div>
                    </div>
                    <div style={styles.statBox}>
                        <div style={styles.statLabel}>Fully Settled</div>
                        <div style={styles.statNumber}>{stats.totalCompleted}</div>
                        <div style={styles.statSub}>bills paid in full</div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <CreditorModal isOpen={state.showCreditorModal} onClose={() => setState(prev => ({ ...prev, showCreditorModal: false, selectedMode: 'walking_seller' }))} onConfirm={handleCreditorConfirm} />
            <PrintBillModal isOpen={state.showPrintModal} onClose={() => setState(prev => ({ ...prev, showPrintModal: false }))} billContent={state.printBillContent} billSize={state.billSize} setBillSize={(size) => setState(prev => ({ ...prev, billSize: size }))} onPrint={() => setState(prev => ({ ...prev, showPrintModal: false }))} />
            <ChequeModal isOpen={state.showChequeModal} onClose={() => setState(prev => ({ ...prev, showChequeModal: false, pendingChequeAmount: 0 }))} onConfirm={handleChequeConfirm} amount={state.pendingChequeAmount} />
            <BankToBankModal isOpen={state.showBankToBankModal} onClose={() => setState(prev => ({ ...prev, showBankToBankModal: false, pendingBankToBankAmount: 0 }))} onConfirm={handleBankToBankConfirm} amount={state.pendingBankToBankAmount} supplierCode={state.selectedSupplier} />
            <PaymentAdjustmentModal isOpen={state.showAdjustmentModal} onClose={() => setState(prev => ({ ...prev, showAdjustmentModal: false }))} onConfirm={handleApplyAdjustment} billNo={state.selectedBillNo} supplierCode={state.selectedSupplier} originalBillTotal={totalPayable} />
            <PaymentHistoryModal isOpen={state.showPaymentHistoryModal} onClose={() => setState(prev => ({ ...prev, showPaymentHistoryModal: false }))} payments={state.currentPayments} totalPaid={state.paymentHistoryTotalPaid} totalBill={state.paymentHistoryTotalBill} remaining={state.paymentHistoryRemaining} />
            <DeleteConfirmationModal isOpen={state.showDeleteModal} onClose={() => setState(prev => ({ ...prev, showDeleteModal: false, deleteSupplierCode: null, deleteBillNo: null }))} onConfirm={handleDeletePayment} supplierCode={state.deleteSupplierCode} billNo={state.deleteBillNo} />
        </div>
    );
}