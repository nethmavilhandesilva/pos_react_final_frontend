import React, { useState, useEffect, useMemo } from "react";
import api from "../../api";

const routes = {
    sales: "/sales",
    customers: "/customers",
    getAllSales: "/sales/all",
    updateGivenAmountApplied: "/sales/update-given-amount-applied",
    getBanks: "/banks",
    applyAdjustment: "/adjustments/apply",
    pendingCustomerBills: "/adjustments/pending-customer-bills",
    pendingFarmerBills: "/adjustments/pending-farmer-bills",
    paymentHistory: "/sales/payment-history"
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

    const modalStyles = {
        overlay: {
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
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '550px',
            maxWidth: '90%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
        },
        title: {
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#0f172a',
        },
        closeBtn: {
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#94a3b8',
        },
        summary: {
            padding: '16px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
        },
        summaryItem: {
            textAlign: 'center',
        },
        summaryLabel: {
            fontSize: '11px',
            color: '#64748b',
            marginBottom: '4px',
        },
        summaryValue: {
            fontSize: '16px',
            fontWeight: 'bold',
        },
        content: {
            padding: '20px',
            overflowY: 'auto',
            flex: 1,
        },
        paymentItem: {
            padding: '12px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        paymentMethod: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500',
        },
        footer: {
            padding: '16px 20px',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'right',
        },
    };

    const getPaymentMethodStyle = (method) => {
        switch (method) {
            case 'Cash':
                return { backgroundColor: '#10b981', color: 'white' };
            case 'Cheque':
                return { backgroundColor: '#8b5cf6', color: 'white' };
            case 'Bank Transfer':
                return { backgroundColor: '#ec489a', color: 'white' };
            case 'bag_to_box':
                return { backgroundColor: '#f59e0b', color: 'white' };
            case 'bill_to_bill':
                return { backgroundColor: '#3b82f6', color: 'white' };
            case 'bad_debt':
                return { backgroundColor: '#ef4444', color: 'white' };
            default:
                return { backgroundColor: '#6b7280', color: 'white' };
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
        <div style={modalStyles.overlay} onClick={onClose}>
            <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={modalStyles.header}>
                    <h3 style={modalStyles.title}>Payment History</h3>
                    <button style={modalStyles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div style={modalStyles.summary}>
                    <div style={modalStyles.summaryItem}>
                        <div style={modalStyles.summaryLabel}>Total Bill</div>
                        <div style={{ ...modalStyles.summaryValue, color: '#ef4444' }}>{formatCurrency(totalBill)}</div>
                    </div>
                    <div style={modalStyles.summaryItem}>
                        <div style={modalStyles.summaryLabel}>Total Paid</div>
                        <div style={{ ...modalStyles.summaryValue, color: '#10b981' }}>{formatCurrency(totalPaid)}</div>
                    </div>
                    <div style={modalStyles.summaryItem}>
                        <div style={modalStyles.summaryLabel}>Remaining</div>
                        <div style={{ ...modalStyles.summaryValue, color: '#f59e0b' }}>{formatCurrency(remaining)}</div>
                    </div>
                </div>

                <div style={modalStyles.content}>
                    {payments && payments.length > 0 ? (
                        payments.map((payment, index) => (
                            <div key={index} style={modalStyles.paymentItem}>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                        Payment #{index + 1}
                                    </div>
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
                                        ...modalStyles.paymentMethod,
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

                <div style={modalStyles.footer}>
                    <button onClick={onClose} style={{
                        padding: '8px 20px',
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                    }}>Close</button>
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

    const modalStyles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '25px',
            width: '450px',
            maxWidth: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        },
        title: {
            margin: '0 0 20px 0',
            color: '#333',
            fontSize: '20px',
            fontWeight: '600',
        },
        formGroup: {
            marginBottom: '15px',
        },
        label: {
            display: 'block',
            marginBottom: '5px',
            fontWeight: '500',
            fontSize: '13px',
            color: '#334155',
        },
        input: {
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
        },
        footer: {
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            marginTop: '20px',
        },
        cancelBtn: {
            padding: '8px 20px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
        },
        confirmBtn: {
            padding: '8px 20px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
        },
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
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <span style={{ fontSize: '24px' }}>💳</span>
                    <h3 style={{
                        margin: 0,
                        color: '#1e293b',
                        fontSize: '18px',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>Cheque Payment</h3>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
                    padding: '10px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    textAlign: 'center'
                }}>
                    <label style={{
                        display: 'block',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#1e40af',
                        marginBottom: '4px'
                    }}>Payment Amount</label>
                    <div style={{
                        fontSize: '22px',
                        fontWeight: '800',
                        color: '#1e3a8a',
                        fontFamily: 'monospace'
                    }}>Rs. {amount.toFixed(2)}</div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#334155'
                    }}>
                        📅 Cheque Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="date"
                        name="cheq_date"
                        value={chequeDetails.cheq_date}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '13px',
                            transition: 'all 0.2s',
                            outline: 'none',
                            fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = '#8b5cf6';
                            e.target.style.boxShadow = '0 0 0 2px rgba(139,92,246,0.1)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = '#e2e8f0';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#334155'
                    }}>
                        🔢 Cheque Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        name="cheq_no"
                        value={chequeDetails.cheq_no}
                        onChange={handleChange}
                        placeholder="Enter cheque number"
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '13px',
                            transition: 'all 0.2s',
                            outline: 'none',
                            fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = '#8b5cf6';
                            e.target.style.boxShadow = '0 0 0 2px rgba(139,92,246,0.1)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = '#e2e8f0';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                </div>

                <div style={{ marginBottom: '18px' }}>
                    <BankAccountSelector
                        selectedAccountId={chequeDetails.bank_account_id}
                        onSelect={handleBankSelect}
                        disabled={false}
                    />
                </div>

                <div style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'flex-end',
                    marginTop: '4px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            background: '#f1f5f9',
                            color: '#475569',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            transition: 'all 0.2s',
                            flex: 1
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#e2e8f0';
                            e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = '#f1f5f9';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            transition: 'all 0.2s',
                            flex: 1,
                            boxShadow: '0 2px 4px -1px rgba(139,92,246,0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 6px -1px rgba(139,92,246,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 4px -1px rgba(139,92,246,0.3)';
                        }}
                    >
                        Confirm Payment
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== BANK TO BANK MODAL ====================
const BankToBankModal = ({ isOpen, onClose, onConfirm, amount, customerCode, customerName }) => {
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
        setTransferDetails({
            bank_account_id: null,
            reference_no: '',
            transfer_date: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const modalStyles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '25px',
            width: '500px',
            maxWidth: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        },
        title: {
            margin: '0 0 20px 0',
            color: '#333',
            fontSize: '20px',
            fontWeight: '600',
        },
        formGroup: {
            marginBottom: '15px',
        },
        label: {
            display: 'block',
            marginBottom: '5px',
            fontWeight: '500',
            fontSize: '13px',
            color: '#334155',
        },
        select: {
            width: '100%',
            padding: '10px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'white',
            cursor: 'pointer',
        },
        input: {
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
        },
        textarea: {
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            resize: 'vertical',
            minHeight: '60px',
        },
        infoBox: {
            background: '#fdf2f8',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px',
            border: '1px solid #fbcfe8',
            color: '#be185d',
        },
        footer: {
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            marginTop: '20px',
        },
        cancelBtn: {
            padding: '8px 20px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
        },
        confirmBtn: {
            padding: '8px 20px',
            background: '#ec489a',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
        },
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
            animation: 'fadeIn 0.3s ease'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                width: '500px',
                maxWidth: '90%',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                animation: 'slideUp 0.3s ease'
            }} onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #ec489a, #db2777)',
                    borderRadius: '20px 20px 0 0',
                    borderBottom: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <span style={{ fontSize: '28px' }}>🏦</span>
                    <h3 style={{
                        margin: 0,
                        color: 'white',
                        fontSize: '20px',
                        fontWeight: '700'
                    }}>Bank to Bank Transfer</h3>
                </div>

                <div style={{ padding: '24px' }}>
                    {/* Payment Details Info Box */}
                    <div style={{
                        background: 'linear-gradient(135deg, #fdf2f8, #fce7f3)',
                        padding: '16px',
                        borderRadius: '14px',
                        marginBottom: '24px',
                        border: '1px solid #fbcfe8'
                    }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#be185d', marginBottom: '10px' }}>💰 Payment Details</div>
                        <div style={{ fontSize: '13px', color: '#9d174d', lineHeight: '1.6' }}>
                            <strong>Amount:</strong> Rs. {amount.toFixed(2)}<br />
                            <strong>Customer:</strong> {customerName || customerCode}
                        </div>
                    </div>

                    {/* Bank Account Selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            fontSize: '13px',
                            color: '#334155'
                        }}>
                            🏦 Select Bank Account <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                            value={transferDetails.bank_account_id || ''}
                            onChange={(e) => handleBankSelect(e.target.value)}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '14px',
                                background: 'white',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                opacity: loading ? 0.6 : 1
                            }}
                            onFocus={(e) => {
                                if (!loading) {
                                    e.target.style.borderColor = '#ec489a';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(236,72,153,0.1)';
                                }
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e2e8f0';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <option value="">-- Select Bank Account --</option>
                            {banks.map(bank => (
                                <option key={bank.id} value={bank.id}>
                                    {bank.bank_name} - {bank.branch} (Acc: {bank.account_no})
                                </option>
                            ))}
                        </select>
                        {loading && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                                ⏳ Loading bank accounts...
                            </div>
                        )}
                    </div>

                    {/* Transaction Reference Number */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            fontSize: '13px',
                            color: '#334155'
                        }}>
                            🔢 Transaction Reference Number <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text"
                            name="reference_no"
                            value={transferDetails.reference_no}
                            onChange={handleChange}
                            placeholder="Enter transaction ID / Reference"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                outline: 'none',
                                fontFamily: 'monospace'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#ec489a';
                                e.target.style.boxShadow = '0 0 0 3px rgba(236,72,153,0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e2e8f0';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    {/* Transfer Date */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            fontSize: '13px',
                            color: '#334155'
                        }}>
                            📅 Transfer Date <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="date"
                            name="transfer_date"
                            value={transferDetails.transfer_date}
                            onChange={handleChange}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                outline: 'none',
                                fontFamily: 'monospace'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#ec489a';
                                e.target.style.boxShadow = '0 0 0 3px rgba(236,72,153,0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e2e8f0';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    {/* Notes */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            fontSize: '13px',
                            color: '#334155'
                        }}>
                            📝 Notes (Optional)
                        </label>
                        <textarea
                            name="notes"
                            value={transferDetails.notes}
                            onChange={handleChange}
                            placeholder="Additional notes about the transfer..."
                            rows="3"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                outline: 'none',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#ec489a';
                                e.target.style.boxShadow = '0 0 0 3px rgba(236,72,153,0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e2e8f0';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    {/* Footer Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end',
                        paddingTop: '8px',
                        borderTop: '1px solid #e2e8f0'
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
                        <button onClick={handleSubmit} style={{
                            padding: '10px 24px',
                            background: 'linear-gradient(135deg, #ec489a, #db2777)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(236,72,153,0.3)'
                        }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 12px rgba(236,72,153,0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(236,72,153,0.3)';
                            }}>
                            Confirm Transfer
                        </button>
                    </div>
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

// ==================== PAYMENT ADJUSTMENT MODAL ====================
const PaymentAdjustmentModal = ({ isOpen, onClose, onConfirm, billNo, customerCode, originalBillTotal }) => {
    const [adjustmentType, setAdjustmentType] = useState('bag_to_box');

    // Bag to Box fields
    const [bagCount, setBagCount] = useState('');
    const [boxCount, setBoxCount] = useState('');
    const [bagValue, setBagValue] = useState('');
    const [boxValue, setBoxValue] = useState('');

    // Bill to Bill fields
    const [customerCodeField, setCustomerCodeField] = useState('');
    const [customerBillNo, setCustomerBillNo] = useState('');
    const [customerBillValue, setCustomerBillValue] = useState('');
    const [farmerCode, setFarmerCode] = useState('');
    const [farmerBillNo, setFarmerBillNo] = useState('');
    const [farmerBillValue, setFarmerBillValue] = useState('');
    const [pendingCustomerBills, setPendingCustomerBills] = useState([]);
    const [pendingFarmerBills, setPendingFarmerBills] = useState([]);
    const [loadingBills, setLoadingBills] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [farmerSearchTerm, setFarmerSearchTerm] = useState('');

    // Bad Debt fields
    const [badDebtName, setBadDebtName] = useState('');
    const [badDebtAmount, setBadDebtAmount] = useState('');

    if (!isOpen) return null;

    const calculateBagToBoxAdjustment = () => {
        const totalBagValue = (parseInt(bagCount) || 0) * (parseFloat(bagValue) || 0);
        const totalBoxValue = (parseInt(boxCount) || 0) * (parseFloat(boxValue) || 0);
        return totalBagValue - totalBoxValue;
    };

    const calculateBillToBillTotal = () => {
        return (parseFloat(customerBillValue) || 0) + (parseFloat(farmerBillValue) || 0);
    };

    const handleSearchCustomerBills = async () => {
        if (!customerCodeField) {
            alert('Please enter customer code');
            return;
        }

        setLoadingBills(true);
        try {
            const response = await api.get(`${routes.pendingCustomerBills}?customer_code=${customerCodeField}`);
            if (response.data.success) {
                setPendingCustomerBills(response.data.data);
            }
        } catch (error) {
            alert('Failed to fetch pending bills');
        } finally {
            setLoadingBills(false);
        }
    };

    const handleSearchFarmerBills = async () => {
        if (!farmerCode) {
            alert('Please enter farmer/supplier code');
            return;
        }

        setLoadingBills(true);
        try {
            const response = await api.get(`${routes.pendingFarmerBills}?supplier_code=${farmerCode}`);
            if (response.data.success) {
                setPendingFarmerBills(response.data.data);
            }
        } catch (error) {
            alert('Failed to fetch farmer bills');
        } finally {
            setLoadingBills(false);
        }
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
        }

        if (adjustmentType === 'bill_to_bill') {
            if (!customerCodeField || !customerBillNo || !customerBillValue || !farmerCode || !farmerBillNo || !farmerBillValue) {
                alert('Please fill all bill to bill fields');
                return;
            }
            adjustmentData.customer_code = customerCodeField;
            adjustmentData.customer_bill_no = customerBillNo;
            adjustmentData.customer_bill_value = parseFloat(customerBillValue);
            adjustmentData.farmer_code = farmerCode;
            adjustmentData.farmer_bill_no = farmerBillNo;
            adjustmentData.farmer_bill_value = parseFloat(farmerBillValue);
            adjustmentData.amount = calculateBillToBillTotal();
        }

        if (adjustmentType === 'bad_debt') {
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

    const filteredCustomerBills = pendingCustomerBills.filter(bill =>
        bill.bill_no.toString().includes(customerSearchTerm.toLowerCase())
    );

    const filteredFarmerBills = pendingFarmerBills.filter(bill =>
        bill.supplier_bill_no.toString().includes(farmerSearchTerm.toLowerCase())
    );

    const modalStyles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '750px',
            maxWidth: '90%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
        },
        title: {
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#0f172a',
        },
        closeBtn: {
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#94a3b8',
        },
        content: {
            padding: '20px',
            overflowY: 'auto',
            flex: 1,
        },
        formGroup: {
            marginBottom: '16px',
        },
        label: {
            display: 'block',
            marginBottom: '6px',
            fontWeight: '500',
            fontSize: '13px',
            color: '#334155',
        },
        input: {
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
        },
        select: {
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'white',
        },
        row: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '16px',
        },
        infoBox: {
            background: '#f0fdf4',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px',
            border: '1px solid #dcfce7',
            color: '#166534',
        },
        warningBox: {
            background: '#fef3c7',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px',
            border: '1px solid #fde68a',
            color: '#92400e',
        },
        searchRow: {
            display: 'flex',
            gap: '10px',
            marginBottom: '10px',
        },
        searchBtn: {
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
        },
        billList: {
            maxHeight: '150px',
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px',
            marginTop: '8px',
            marginBottom: '16px',
        },
        billItem: {
            padding: '10px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            border: '1px solid #e2e8f0',
        },
        billSelected: {
            background: '#eff6ff',
            borderColor: '#3b82f6',
        },
        section: {
            marginBottom: '20px',
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
        },
        sectionTitle: {
            fontSize: '14px',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid #e2e8f0',
        },
        footer: {
            padding: '16px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
        },
        cancelBtn: {
            padding: '8px 20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
        },
        confirmBtn: {
            padding: '8px 20px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
        },
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

                    {/* Bill to Bill Section */}
                    {adjustmentType === 'bill_to_bill' && (
                        <>
                            {/* Customer Section */}
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
                                    borderBottom: '2px solid #3b82f6',
                                    display: 'inline-block'
                                }}>🏢 Customer Bill Transfer</div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontWeight: '600',
                                        fontSize: '12px',
                                        color: '#334155'
                                    }}>Customer Code</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            value={customerCodeField}
                                            onChange={(e) => setCustomerCodeField(e.target.value.toUpperCase())}
                                            placeholder="Enter customer code"
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                transition: 'all 0.2s',
                                                outline: 'none'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#3b82f6';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                        <button onClick={handleSearchCustomerBills} style={{
                                            padding: '10px 20px',
                                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                            🔍 Search Bills
                                        </button>
                                    </div>
                                </div>

                                {loadingBills && (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                        <span>⏳ Loading bills...</span>
                                    </div>
                                )}

                                {pendingCustomerBills.length > 0 && (
                                    <div style={{
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '10px',
                                        marginBottom: '16px',
                                        background: 'white'
                                    }}>
                                        <input
                                            type="text"
                                            placeholder="🔍 Search bills..."
                                            value={customerSearchTerm}
                                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                marginBottom: '10px',
                                                outline: 'none'
                                            }}
                                        />
                                        {filteredCustomerBills.map(bill => (
                                            <div
                                                key={bill.bill_no}
                                                style={{
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '6px',
                                                    border: '2px solid',
                                                    borderColor: customerBillNo === bill.bill_no ? '#3b82f6' : '#e2e8f0',
                                                    background: customerBillNo === bill.bill_no ? '#eff6ff' : 'white',
                                                    transition: 'all 0.2s'
                                                }}
                                                onClick={() => {
                                                    setCustomerBillNo(bill.bill_no);
                                                    setCustomerBillValue(bill.total_amount);
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (customerBillNo !== bill.bill_no) {
                                                        e.currentTarget.style.background = '#f8fafc';
                                                        e.currentTarget.style.borderColor = '#94a3b8';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (customerBillNo !== bill.bill_no) {
                                                        e.currentTarget.style.background = 'white';
                                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                                    }
                                                }}
                                            >
                                                <div>
                                                    <strong style={{ color: '#1e293b' }}>Bill #{bill.bill_no}</strong>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{bill.customer_code}</div>
                                                </div>
                                                <div style={{ fontWeight: 'bold', color: '#059669' }}>
                                                    Rs. {parseFloat(bill.total_amount).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '16px'
                                }}>
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '6px',
                                            fontWeight: '600',
                                            fontSize: '12px',
                                            color: '#334155'
                                        }}>Selected Bill No</label>
                                        <input
                                            type="text"
                                            value={customerBillNo}
                                            onChange={(e) => setCustomerBillNo(e.target.value)}
                                            placeholder="Bill number"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                background: '#f8fafc',
                                                outline: 'none'
                                            }}
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '6px',
                                            fontWeight: '600',
                                            fontSize: '12px',
                                            color: '#334155'
                                        }}>Bill Value (Rs.)</label>
                                        <input
                                            type="number"
                                            value={customerBillValue}
                                            onChange={(e) => setCustomerBillValue(e.target.value)}
                                            placeholder="Bill value"
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
                                                e.target.style.borderColor = '#3b82f6';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Farmer Section */}
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
                                }}>🌾 Farmer/Supplier Bill Transfer</div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontWeight: '600',
                                        fontSize: '12px',
                                        color: '#334155'
                                    }}>Farmer/Supplier Code</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            value={farmerCode}
                                            onChange={(e) => setFarmerCode(e.target.value.toUpperCase())}
                                            placeholder="Enter farmer/supplier code"
                                            style={{
                                                flex: 1,
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
                                        <button onClick={handleSearchFarmerBills} style={{
                                            padding: '10px 20px',
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                            🔍 Search Bills
                                        </button>
                                    </div>
                                </div>

                                {pendingFarmerBills.length > 0 && (
                                    <div style={{
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '10px',
                                        marginBottom: '16px',
                                        background: 'white'
                                    }}>
                                        <input
                                            type="text"
                                            placeholder="🔍 Search bills..."
                                            value={farmerSearchTerm}
                                            onChange={(e) => setFarmerSearchTerm(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                marginBottom: '10px',
                                                outline: 'none'
                                            }}
                                        />
                                        {filteredFarmerBills.map(bill => (
                                            <div
                                                key={bill.supplier_bill_no}
                                                style={{
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '6px',
                                                    border: '2px solid',
                                                    borderColor: farmerBillNo === bill.supplier_bill_no ? '#10b981' : '#e2e8f0',
                                                    background: farmerBillNo === bill.supplier_bill_no ? '#ecfdf5' : 'white',
                                                    transition: 'all 0.2s'
                                                }}
                                                onClick={() => {
                                                    setFarmerBillNo(bill.supplier_bill_no);
                                                    setFarmerBillValue(bill.total_amount);
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (farmerBillNo !== bill.supplier_bill_no) {
                                                        e.currentTarget.style.background = '#f8fafc';
                                                        e.currentTarget.style.borderColor = '#94a3b8';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (farmerBillNo !== bill.supplier_bill_no) {
                                                        e.currentTarget.style.background = 'white';
                                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                                    }
                                                }}
                                            >
                                                <div>
                                                    <strong style={{ color: '#1e293b' }}>Bill #{bill.supplier_bill_no}</strong>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{bill.supplier_code}</div>
                                                </div>
                                                <div style={{ fontWeight: 'bold', color: '#059669' }}>
                                                    Rs. {parseFloat(bill.total_amount).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '16px'
                                }}>
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '6px',
                                            fontWeight: '600',
                                            fontSize: '12px',
                                            color: '#334155'
                                        }}>Selected Bill No</label>
                                        <input
                                            type="text"
                                            value={farmerBillNo}
                                            onChange={(e) => setFarmerBillNo(e.target.value)}
                                            placeholder="Bill number"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                background: '#f8fafc',
                                                outline: 'none'
                                            }}
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '6px',
                                            fontWeight: '600',
                                            fontSize: '12px',
                                            color: '#334155'
                                        }}>Bill Value (Rs.)</label>
                                        <input
                                            type="number"
                                            value={farmerBillValue}
                                            onChange={(e) => setFarmerBillValue(e.target.value)}
                                            placeholder="Bill value"
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
                                    Customer Bill Amount: <strong>Rs. {(parseFloat(customerBillValue) || 0).toLocaleString()}</strong><br />
                                    Farmer Bill Amount: <strong>Rs. {(parseFloat(farmerBillValue) || 0).toLocaleString()}</strong><br />
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#065f46' }}>
                                        Total Transfer Amount: Rs. {calculateBillToBillTotal().toLocaleString()}
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

// ==================== RECEIPT HTML BUILDER ====================
const buildFullReceiptHTML = (salesData, billNo, customerName, mobile, globalLoanAmount = 0, givenAmount = 0, paymentMethod = 'cash', paymentDetails = null) => {
    const formatNumber = (num) => {
        if (typeof num !== 'number' && typeof num !== 'string') return '0';
        const number = parseFloat(num);
        if (isNaN(number)) return '0';
        if (Number.isInteger(number)) {
            return number.toLocaleString('en-US');
        } else {
            const parts = number.toFixed(2).split('.');
            const wholePart = parseInt(parts[0]).toLocaleString('en-US');
            return `${wholePart}.${parts[1]}`;
        }
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

    const totalPacksSum = Object.values(consolidatedSummary).reduce((sum, item) => sum + item.totalPacks, 0);
    const fontSizeBody = '25px';
    const fontSizeHeader = '23px';
    const fontSizeTotal = '28px';

    const colGroups = `<colgroup><col style="width:32%;"><col style="width:21%;"><col style="width:21%;"><col style="width:26%;"></colgroup>`;

    const itemsHtml = salesData.map(s => {
        const packs = parseInt(s.packs) || 0;
        const weight = parseFloat(s.weight) || 0;
        const price = parseFloat(s.price_per_kg) || 0;
        const value = (weight * price).toFixed(2);

        return `
        <tr style="font-size:${fontSizeBody}; font-weight:900; vertical-align: bottom;">
            <td style="text-align:left; padding:10px 0; white-space: nowrap;">
                ${s.item_name || ""}<br>${formatNumber(packs)}
            </td>
            <td style="text-align:right; padding:10px 2px; position: relative; left: -70px;">
               ${formatNumber(weight.toFixed(2))}
            </td>
            <td style="text-align:right; padding:10px 2px; position: relative; left: -55px;">${formatNumber(price.toFixed(2))}</td>
            <td style="padding:10px 0; display:flex; flex-direction:column; align-items:flex-end;">
                <div style="font-size:25px; white-space:nowrap;">${s.supplier_code || "ASW"}</div>
                <div style="font-weight:900; white-space:nowrap;">${formatNumber(value)}</div>
            </td>
        </tr>`;
    }).join("");

    const totalSales = salesData.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0);
    const totalPackCost = salesData.reduce((sum, s) => sum + ((parseFloat(s.CustomerPackCost) || 0) * (parseFloat(s.packs) || 0)), 0);
    const finalGrandTotal = totalSales + totalPackCost;
    const remaining = givenAmount > 0 ? Math.abs(givenAmount - finalGrandTotal) : 0;

    const loanRow = globalLoanAmount !== 0 ? `
    <tr>
        <td style="font-size:20px; padding-top:8px;">පෙර ණය:</td>
        <td style="text-align:right; font-size:22px; font-weight:bold; padding-top:8px;">Rs. ${formatNumber(Math.abs(globalLoanAmount).toFixed(2))}</td>
    </tr>` : '';

    const summaryEntries = Object.entries(consolidatedSummary);
    let summaryHtmlContent = '';
    for (let i = 0; i < summaryEntries.length; i += 2) {
        const [name1, d1] = summaryEntries[i];
        const [name2, d2] = summaryEntries[i + 1] || [null, null];
        const text1 = `${name1}:${formatNumber(d1.totalWeight)}/${formatNumber(d1.totalPacks)}`;
        const text2 = d2 ? `${name2}:${formatNumber(d2.totalWeight)}/${formatNumber(d2.totalPacks)}` : '';
        summaryHtmlContent += `
        <tr>
            <td style="padding:6px; width:50%; font-weight:bold; white-space:nowrap;">${text1}</td>
            <td style="padding:6px; width:50%; font-weight:bold; white-space:nowrap;">${text2}</td>
        </tr>`;
    }

    let paymentMethodDisplay = '<div style="font-size:14px; margin-top:5px;">💰 Payment: Cash</div>';

    if (paymentMethod === 'cheque' && paymentDetails) {
        paymentMethodDisplay = `<div style="font-size:14px; margin-top:5px;">💳 Cheque: ${paymentDetails.bank_name || 'Bank'} | No: ${paymentDetails.cheq_no} | Date: ${paymentDetails.cheq_date}</div>`;
    } else if (paymentMethod === 'bank_to_bank' && paymentDetails) {
        paymentMethodDisplay = `<div style="font-size:14px; margin-top:5px;">🏦 Bank Transfer: ${paymentDetails.bank_name || 'Bank'} | Ref: ${paymentDetails.reference_no} | Date: ${paymentDetails.transfer_date}</div>`;
    } else if (paymentMethod === 'adjustment' && paymentDetails) {
        if (paymentDetails.type === 'bag_to_box') {
            paymentMethodDisplay = `<div style="font-size:14px; margin-top:5px;">📦 Bag to Box Adjustment: Rs. ${paymentDetails.amount.toFixed(2)}<br>${paymentDetails.bag_count} bags @ Rs.${paymentDetails.bag_value} → ${paymentDetails.box_count} boxes @ Rs.${paymentDetails.box_value}</div>`;
        } else if (paymentDetails.type === 'bill_to_bill') {
            paymentMethodDisplay = `<div style="font-size:14px; margin-top:5px;">📄 Bill to Bill Transfer: Rs. ${paymentDetails.amount.toFixed(2)}<br>Customer Bill: ${paymentDetails.customer_bill_no} | Farmer Bill: ${paymentDetails.farmer_bill_no}</div>`;
        } else if (paymentDetails.type === 'bad_debt') {
            paymentMethodDisplay = `<div style="font-size:14px; margin-top:5px;">⚠️ Bad Debt Write-off: Rs. ${paymentDetails.amount.toFixed(2)}<br>${paymentDetails.name}</div>`;
        }
    }

    return `
    <div style="width:350px; margin:0 auto; padding:10px; font-family: 'Courier New', monospace; color:#000; background:#fff;">
        <div style="text-align:center; font-weight:bold;">
            <div style="font-size:24px;">මංජු සහ සහෝදරයෝ</div>
            <div style="font-size:20px; margin-bottom:5px; font-weight:bold;">colombage lanka (Pvt) Ltd</div>
            <div style="display:flex; justify-content:center; align-items:center; gap:15px; margin:12px 0;">
                <span style="border:2.5px solid #000; padding:5px 12px; font-size:22px;">N66</span>
                <span style="border:2.5px solid #000; padding:5px 12px; font-size:35px;">${customerName.toUpperCase()}</span>
            </div>
            <div style="font-size:16px;">එළවළු,පළතුරු තොග වෙළෙන්දෝ</div>
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-top:6px; padding:0 5px;">
                <span>බණ්ඩාරවෙල</span>
                <span>${time}</span>
            </div>
        </div>

        <div style="font-size:19px; margin-top:10px; padding:0 5px;">
            <div style="font-weight: bold;">දුර: ${mobile || '0777672838 / 071437115'}</div>
            <div style="display:flex; justify-content:space-between; margin-top:3px;">
                <span>බිල් අංකය:<strong style="color: #000; font-weight: bold;">${billNo}</strong></span>
                <span>දිනය:<strong style="color: #000; font-weight: bold;">${date}</strong></span>
            </div>
        </div>

        <hr style="border:none; border-top:2.5px solid #000; margin:10px 0;">

        <table style="width:100%; border-collapse:collapse; font-size:${fontSizeBody}; table-layout: fixed;">
            ${colGroups}
            <thead>
                <tr style="border-bottom:2.5px solid #000; font-weight:bold;">
                    <th style="text-align:left; padding-bottom:8px; font-size:${fontSizeHeader};">වර්ගය<br>මලු</th>
                    <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader}; position: relative; left: -50px; top: 24px;">කිලෝ</th>
                    <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader}; position: relative; left: -45px;top: 24px;">මිල</th>
                    <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader};">අයිතිය<br>අගය</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
                <tr style="border-top:2.5px solid #000; font-weight:bold;">
                    <td style="padding-top:12px; font-size:${fontSizeTotal};">${formatNumber(totalPacksSum)}</td>
                    <td colspan="3" style="padding-top:12px; font-size:${fontSizeTotal};">
                        <div style="text-align:right; float:right; white-space:nowrap;">${Number(totalSales).toFixed(2)}</div>
                    </td>
                </tr>
            </tfoot>
        </table>

        <table style="width:100%; margin-top:20px; font-weight:bold; font-size:22px; padding:0 5px;">
            <tr><td style="font-size:20px;">මලු:</td><td style="text-align:right;">${formatNumber(totalPackCost.toFixed(2))}</td></tr>
            <tr><td style="font-size:20px; padding-top:8px;">එකතුව:</td>
                <td style="text-align:right; padding-top:8px;">
                    <span style="border-bottom:5px double #000; border-top:2px solid #000; font-size:${fontSizeTotal}; padding:5px 10px;">${Number(finalGrandTotal).toFixed(2)}</span>
                </td>
            </tr>
            ${loanRow}
            ${givenAmount > 0 ? `
            <tr><td style="font-size:18px; padding-top:18px;">දුන් මුදල:</td>
                <td style="text-align:right; font-size:20px; padding-top:18px; font-weight:bold;">${formatNumber(parseFloat(givenAmount).toFixed(2))}</td>
            </tr>
            <tr><td style="font-size:22px;">ඉතිරිය:</td>
                <td style="text-align:right; font-size:26px;">${formatNumber(remaining.toFixed(2))}</td>
            </tr>
            ${paymentMethodDisplay}
            ` : ''}
        </table>

        <table style="width:100%; border-collapse:collapse; margin-top:25px; font-size:14px; text-align:center;">${summaryHtmlContent}</table>

        <div style="text-align:center; margin-top:25px; font-size:13px; border-top:2.5px solid #000; padding-top:10px;">
            <p style="margin:4px 0; font-weight:bold;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p>
            <p style="margin:4px 0;">නැවත භාර ගනු නොලැබේ</p>
        </div>
    </div>`;
};

// ==================== STYLES ====================
const styles = {
    app: {
        width: '100vw',
        minHeight: '100vh',
        background: '#0dea77',
        margin: 0,
        padding: 0,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    container: {
        width: '100%',
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '24px 32px',
    },
    header: {
        marginBottom: '28px',
    },
    headerTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
        margin: 0,
    },
    refreshBtn: {
        background: 'white',
        border: '1px solid #e2e8f0',
        padding: '8px 18px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    subtitle: {
        color: '#64748b',
        fontSize: '14px',
        marginTop: '4px',
    },
    statsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginTop: '28px',
        marginBottom: '0',
    },
    statBox: {
        background: 'white',
        borderRadius: '16px',
        padding: '18px 20px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
    },
    statLabel: {
        fontSize: '13px',
        fontWeight: '500',
        color: '#64748b',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    statNumber: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#0f172a',
    },
    statSub: {
        fontSize: '12px',
        color: '#94a3b8',
        marginTop: '4px',
    },
    searchInput: {
        width: '100%',
        padding: '10px 14px',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '13px',
        background: 'white',
        outline: 'none',
        transition: 'all 0.2s',
    },
    threeColumns: {
        display: 'grid',
        gridTemplateColumns: '0.7fr 2fr 0.7fr',
        gap: '24px',
        alignItems: 'start',
        width: '100%',
    },
    panel: {
        background: '#11ba2d',  // <-- ADD THIS FOR A WARM YELLOW BACKGROUND
        borderRadius: '20px',
        border: '4px solid #000000',  // <-- CHANGE TO THICK BLACK BORDER
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 320px)',
        minHeight: '500px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    panelHeader: {
        padding: '16px 20px',
        background: '#ffffff',
        borderBottom: '1px solid #eef2ff',
    },
    panelTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    panelContent: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
    },
    billItem: {
        padding: '14px',
        borderRadius: '12px',
        marginBottom: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        border: '1px solid transparent',
    },
    billPending: {
        background: '#ffffff',
        borderColor: '#f1f5f9',
    },
    billSelected: {
        background: '#eff6ff',
        borderColor: '#074ec1',
    },
    billApplied: {
        background: '#f0fdf4',
        borderColor: '#dcfce7',
    },
    billRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    billLeft: {
        flex: 1,
    },
    billNo: {
        fontWeight: '700',
        fontSize: '15px',
        color: '#0f172a',
    },
    billCustomer: {
        fontSize: '12px',
        color: '#000000',   // black
        fontWeight: 'bold', // make it bold
        marginTop: '2px',
    },
    billRight: {
        textAlign: 'right',
    },
    billTotal: {
        fontWeight: '700',
        fontSize: '15px',
        color: '#0f172a',
    },
    billGiven: {
        fontSize: '11px',
        color: '#64748b',
        marginTop: '2px',
    },
    badge: {
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '500',
        marginTop: '6px',
    },
    badgePending: {
        background: '#fef3c7',
        color: '#d97706',
    },
    badgeApplied: {
        background: '#dcfce7',
        color: '#15803d',
    },
    detailSection: {
        padding: '16px',
        borderBottom: '1px solid #f1f5f9',
    },
    detailLabel: {
        fontSize: '11px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px',
    },
    detailValue: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    itemsTable: {
        width: '100%',
        fontSize: '16px',
        borderCollapse: 'collapse',
        fontWeight: 'bold',
        color: 'black',
    },
    tableHeader: {
        textAlign: 'left',
        padding: '8px 6px',
        color: '#64748b',
        fontWeight: '600',
        borderBottom: '1px solid #e2e8f0',
    },
    tableCell: {
        padding: '8px 6px',
        borderBottom: '1px solid #f1f5f9',
        color: '#334155',
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        fontSize: '13px',
    },
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderTop: '2px solid #e2e8f0',
        marginTop: '8px',
        fontWeight: '700',
        fontSize: '15px',
        color: '#0f172a',
    },
    paymentBox: {
        background: '#f8fafc',
        borderRadius: '16px',
        padding: '18px',
        margin: '16px',
    },
    paymentLabel: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#334155',
        marginBottom: '8px',
    },
    paymentInput: {
        width: '100%',
        padding: '14px',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: '600',
        textAlign: 'center',
        background: 'white',
        outline: 'none',
    },
    remainingBox: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '12px',
        padding: '10px 0',
        fontSize: '14px',
    },
    hint: {
        fontSize: '11px',
        color: '#94a3b8',
        marginTop: '8px',
        textAlign: 'center',
    },
    printBtn: {
        width: 'calc(100% - 32px)',
        margin: '0 16px 16px 16px',
        padding: '12px',
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#94a3b8',
    },
    clearBtn: {
        background: 'transparent',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        fontSize: '12px',
        padding: '4px 8px',
        borderRadius: '6px',
        transition: 'all 0.2s',
    },
    adjustmentBtn: {
        width: 'calc(100% - 32px)',
        margin: '0 16px 8px 16px',
        padding: '12px',
        background: '#f59e0b',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    cashPaymentBtn: {
        width: 'calc(33.33% - 8px)',
        margin: '0',
        padding: '12px',
        background: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    chequePaymentBtn: {
        width: 'calc(33.33% - 8px)',
        margin: '0',
        padding: '12px',
        background: '#8b5cf6',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    bankToBankPaymentBtn: {
        width: 'calc(33.33% - 8px)',
        margin: '0',
        padding: '12px',
        background: '#ec489a',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    paymentHistoryBtn: {
        width: 'calc(100% - 32px)',
        margin: '0 16px 8px 16px',
        padding: '12px',
        background: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    paymentButtonsContainer: {
        display: 'flex',
        gap: '12px',
        marginTop: '12px',
        flexWrap: 'wrap',
    },
    paymentTypeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '10px',
        fontWeight: '500',
        marginTop: '4px',
    }
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

export default function PrintedBills() {
    const [state, setState] = useState({
        pendingBills: [],
        appliedBills: [],
        customers: [],
        pendingSearchQuery: "",
        appliedSearchQuery: "",
        selectedBill: null,
        isLoading: true,
        isPrinting: false,
        givenAmountInput: "",
        isUpdatingCompletedBill: false,
        showChequeModal: false,
        pendingChequeAmount: 0,
        showAdjustmentModal: false,
        showBankToBankModal: false,
        pendingBankToBankAmount: 0,
        showPaymentHistoryModal: false,
        currentPayments: [],
        paymentHistoryTotalPaid: 0,
        paymentHistoryTotalBill: 0,
        paymentHistoryRemaining: 0
    });

    const formatDecimal = (value) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(value || 0));
    };

    const fetchSalesData = async () => {
        try {
            const [salesRes, customersRes] = await Promise.all([
                api.get(routes.getAllSales),
                api.get(routes.customers)
            ]);

            const salesData = salesRes.data.sales || salesRes.data || [];
            const customersData = customersRes.data.data || customersRes.data.customers || customersRes.data || [];

            const pendingMap = {};
            const appliedMap = {};

            salesData
                .filter(s => s.bill_printed === 'Y' && s.bill_no)
                .forEach(sale => {
                    const billNo = sale.bill_no;
                    const isApplied = sale.given_amount_applied === 'Y';
                    const targetMap = isApplied ? appliedMap : pendingMap;

                    if (!targetMap[billNo]) {
                        targetMap[billNo] = {
                            billNo: billNo,
                            customerCode: sale.customer_code,
                            sales: [],
                            totalAmount: 0,
                            givenAmount: sale.given_amount || 0,
                            givenAmountApplied: sale.given_amount_applied || 'N',
                            paymentAdjustmentType: sale.payment_adjustment_type || null,
                            createdAt: sale.created_at,
                            chequeDetails: sale.cheq_no ? { cheq_no: sale.cheq_no, cheq_date: sale.cheq_date, bank_name: sale.bank_name } : null,
                            transferDetails: sale.transfer_reference_no ? { reference_no: sale.transfer_reference_no, transfer_date: sale.transfer_date } : null
                        };
                    }
                    targetMap[billNo].sales.push(sale);
                    targetMap[billNo].totalAmount += (parseFloat(sale.total) || 0) + ((parseFloat(sale.packs) || 0) * (parseFloat(sale.CustomerPackCost) || 0));
                });

            const pendingBillsArray = Object.values(pendingMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const appliedBillsArray = Object.values(appliedMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setState(prev => ({
                ...prev,
                pendingBills: pendingBillsArray,
                appliedBills: appliedBillsArray,
                customers: customersData,
                isLoading: false
            }));
        } catch (error) {
            console.error("Error fetching data:", error);
            setState(prev => ({ ...prev, isLoading: false }));
        }
    };

    const fetchPaymentHistory = async (billNo) => {
        try {
            const response = await api.get(`${routes.paymentHistory}/${billNo}`);
            if (response.data.success) {
                setState(prev => ({
                    ...prev,
                    currentPayments: response.data.payments || [],
                    paymentHistoryTotalPaid: response.data.total_paid || 0,
                    paymentHistoryTotalBill: response.data.total_bill || 0,
                    paymentHistoryRemaining: response.data.remaining || 0,
                    showPaymentHistoryModal: true
                }));
            }
        } catch (error) {
            console.error('Error fetching payment history:', error);
            alert('Failed to fetch payment history');
        }
    };

    useEffect(() => {
        fetchSalesData();
        const interval = setInterval(fetchSalesData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleBillClick = (bill) => {
        if (state.selectedBill && state.selectedBill.billNo === bill.billNo) {
            setState(prev => ({
                ...prev,
                selectedBill: null,
                givenAmountInput: "",
                isUpdatingCompletedBill: false
            }));
        } else {
            setState(prev => ({
                ...prev,
                selectedBill: bill,
                givenAmountInput: "",
                isUpdatingCompletedBill: bill.givenAmountApplied === 'Y'
            }));
        }
    };

    const handleGivenAmountChange = (e) => {
        setState(prev => ({ ...prev, givenAmountInput: e.target.value }));
    };

    const processPayment = async (paymentAmount, isCheque = false, chequeDetails = null, isBankTransfer = false, bankTransferDetails = null, isAdjustment = false, adjustmentDetails = null) => {
        if (!state.selectedBill || state.isPrinting) return;

        setState(prev => ({ ...prev, isPrinting: true }));

        try {
            const currentGiven = state.selectedBill.givenAmount || 0;
            const totalGivenAmount = currentGiven + paymentAmount;
            const isFullySettled = totalGivenAmount >= state.selectedBill.totalAmount;
            const creditTransaction = isFullySettled ? 'N' : 'Y';
            const givenAmountApplied = isFullySettled ? 'Y' : 'N';

            // Determine payment method
            let paymentMethod = 'Cash';
            if (isAdjustment && adjustmentDetails) {
                paymentMethod = adjustmentDetails.type;
            } else if (isBankTransfer) {
                paymentMethod = 'Bank Transfer';
            } else if (isCheque) {
                paymentMethod = 'Cheque';
            }

            const payload = {
                bill_no: state.selectedBill.billNo,
                given_amount: totalGivenAmount,
                given_amount_applied: givenAmountApplied,
                credit_transaction: creditTransaction,
                payment_amount: paymentAmount,
                payment_method: paymentMethod
            };

            let paymentMethodText = 'Cash';
            let paymentDetailsForReceipt = null;

            // Handle Adjustment (Bag to Box, Bill to Bill, Bad Debt)
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
                    payload.target_supplier_code = adjustmentDetails.farmer_code;
                    payload.target_supplier_bill_no = adjustmentDetails.farmer_bill_no;
                    payload.target_supplier_bill_value = adjustmentDetails.farmer_bill_value;
                    payload.adjustment_amount = adjustmentDetails.amount;
                    paymentMethodText = 'Bill to Bill';
                    paymentDetailsForReceipt = {
                        type: 'bill_to_bill',
                        amount: adjustmentDetails.amount,
                        customer_bill_no: adjustmentDetails.customer_bill_no,
                        farmer_bill_no: adjustmentDetails.farmer_bill_no
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
            }
            // Handle Bank Transfer
            else if (isBankTransfer && bankTransferDetails) {
                payload.bank_account_id = bankTransferDetails.bank_account_id;
                payload.transfer_reference_no = bankTransferDetails.reference_no;
                payload.transfer_date = bankTransferDetails.transfer_date;
                payload.transfer_notes = bankTransferDetails.notes;
                paymentMethodText = 'Bank Transfer';
                paymentDetailsForReceipt = {
                    reference_no: bankTransferDetails.reference_no,
                    transfer_date: bankTransferDetails.transfer_date
                };
            }
            // Handle Cheque
            else if (isCheque && chequeDetails) {
                payload.cheq_date = chequeDetails.cheq_date;
                payload.cheq_no = chequeDetails.cheq_no;
                payload.bank_account_id = chequeDetails.bank_account_id;
                paymentMethodText = 'Cheque';
                paymentDetailsForReceipt = {
                    cheq_no: chequeDetails.cheq_no,
                    cheq_date: chequeDetails.cheq_date
                };
            }

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

                if (paymentDetailsForReceipt && response.data.data.bank_name) {
                    paymentDetailsForReceipt.bank_name = response.data.data.bank_name;
                }

                const receiptHtml = buildFullReceiptHTML(
                    state.selectedBill.sales,
                    state.selectedBill.billNo,
                    customer?.name || state.selectedBill.customerCode,
                    customer?.telephone_no || "",
                    0,
                    totalGivenAmount,
                    isAdjustment ? 'adjustment' : (isBankTransfer ? 'bank_to_bank' : (isCheque ? 'cheque' : 'cash')),
                    paymentDetailsForReceipt
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
                            setTimeout(() => window.close(), 1000); 
                        };
                    <\/script>
                    </body>
                    </html>
                `);
                printWindow.document.close();

                const statusMessage = givenAmountApplied === 'Y'
                    ? `✅ Payment Complete!\n\nPayment Method: ${paymentMethodText}\nAmount Paid: Rs. ${formatDecimal(paymentAmount)}\nTotal Given: Rs. ${formatDecimal(totalGivenAmount)}\nBill is now FULLY PAID and moved to Completed Payments.`
                    : `✓ Payment Added!\n\nPayment Method: ${paymentMethodText}\nAmount Paid: Rs. ${formatDecimal(paymentAmount)}\nTotal Given: Rs. ${formatDecimal(totalGivenAmount)}\nRemaining: Rs. ${formatDecimal(Math.max(0, state.selectedBill.totalAmount - totalGivenAmount))}`;



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

    const handleCashPayment = async () => {
        const paymentAmount = parseFloat(state.givenAmountInput) || 0;
        if (paymentAmount === 0) {
            alert("Please enter an amount");
            return;
        }
        await processPayment(paymentAmount, false, null, false, null, false, null);
    };

    const handleChequePayment = async () => {
        const paymentAmount = parseFloat(state.givenAmountInput) || 0;
        if (paymentAmount === 0) {
            alert("Please enter an amount");
            return;
        }
        setState(prev => ({ ...prev, pendingChequeAmount: paymentAmount, showChequeModal: true }));
    };

    const handleChequeConfirm = async (chequeDetails) => {
        await processPayment(state.pendingChequeAmount, true, chequeDetails, false, null, false, null);
    };

    const handleBankToBankPayment = async () => {
        const paymentAmount = parseFloat(state.givenAmountInput) || 0;
        if (paymentAmount === 0) {
            alert("Please enter an amount");
            return;
        }
        setState(prev => ({ ...prev, pendingBankToBankAmount: paymentAmount, showBankToBankModal: true }));
    };

    const handleBankToBankConfirm = async (transferDetails) => {
        await processPayment(state.pendingBankToBankAmount, false, null, true, transferDetails, false, null);
    };

    const handlePrintWithoutUpdate = async () => {
        if (!state.selectedBill || state.isPrinting) return;

        setState(prev => ({ ...prev, isPrinting: true }));

        try {
            const customer = state.customers.find(c =>
                String(c.short_name).toUpperCase() === String(state.selectedBill.customerCode).toUpperCase()
            );

            let paymentMethod = 'cash';
            let paymentDetails = null;

            if (state.selectedBill.paymentAdjustmentType === 'Cheque') {
                paymentMethod = 'cheque';
                paymentDetails = {
                    cheq_no: state.selectedBill.chequeDetails?.cheq_no,
                    cheq_date: state.selectedBill.chequeDetails?.cheq_date,
                    bank_name: state.selectedBill.chequeDetails?.bank_name
                };
            } else if (state.selectedBill.paymentAdjustmentType === 'Bank Transfer') {
                paymentMethod = 'bank_to_bank';
                paymentDetails = {
                    reference_no: state.selectedBill.transferDetails?.reference_no,
                    transfer_date: state.selectedBill.transferDetails?.transfer_date,
                    bank_name: state.selectedBill.bank_name
                };
            }

            const receiptHtml = buildFullReceiptHTML(
                state.selectedBill.sales,
                state.selectedBill.billNo,
                customer?.name || state.selectedBill.customerCode,
                customer?.telephone_no || "",
                0,
                state.selectedBill.givenAmount || 0,
                paymentMethod,
                paymentDetails
            );

            const printWindow = window.open("", "_blank", "width=800,height=600");
            if (!printWindow) {
                alert("Please allow pop-ups for printing");
                return;
            }

            printWindow.document.write(`
                <html>
                    <head><title>Print Bill - ${state.selectedBill.billNo}</title>
                    <style>body { margin: 0; padding: 20px; font-family: 'Courier New', monospace; } @media print { body { padding: 0; margin: 0; } }</style>
                    </head>
                    <body>${receiptHtml}<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); };</script></body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            alert("Error printing bill");
        } finally {
            setState(prev => ({ ...prev, isPrinting: false }));
        }
    };

    const handleApplyAdjustment = async (adjustmentData) => {
        try {
            // Calculate the adjustment amount
            let adjustmentAmount = 0;

            if (adjustmentData.adjustment_type === 'bag_to_box') {
                adjustmentAmount = Math.abs((adjustmentData.bag_count * adjustmentData.bag_value) - (adjustmentData.box_count * adjustmentData.box_value));
            } else if (adjustmentData.adjustment_type === 'bill_to_bill') {
                adjustmentAmount = adjustmentData.customer_bill_value + adjustmentData.farmer_bill_value;
            } else if (adjustmentData.adjustment_type === 'bad_debt') {
                adjustmentAmount = adjustmentData.bad_debt_amount;
            }

            if (adjustmentAmount === 0) {
                alert("Adjustment amount is zero");
                return;
            }

            // Process as adjustment payment
            await processPayment(
                adjustmentAmount,
                false,
                null,
                false,
                null,
                true,
                {
                    type: adjustmentData.adjustment_type,
                    amount: adjustmentAmount,
                    ...adjustmentData
                }
            );

            setState(prev => ({ ...prev, showAdjustmentModal: false }));
        } catch (error) {
            alert('Failed to apply adjustment: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleViewPaymentHistory = () => {
        if (state.selectedBill) {
            fetchPaymentHistory(state.selectedBill.billNo);
        }
    };

    const filterPendingBills = useMemo(() => {
        if (!state.pendingSearchQuery) return state.pendingBills;
        const q = state.pendingSearchQuery.toLowerCase();
        return state.pendingBills.filter(bill =>
            bill.billNo.toString().includes(q) ||
            bill.customerCode.toLowerCase().includes(q)
        );
    }, [state.pendingBills, state.pendingSearchQuery]);

    const filterAppliedBills = useMemo(() => {
        if (!state.appliedSearchQuery) return state.appliedBills;
        const q = state.appliedSearchQuery.toLowerCase();
        return state.appliedBills.filter(bill =>
            bill.billNo.toString().includes(q) ||
            bill.customerCode.toLowerCase().includes(q)
        );
    }, [state.appliedBills, state.appliedSearchQuery]);

    const stats = useMemo(() => {
        const totalPending = filterPendingBills.length;
        const totalApplied = filterAppliedBills.length;
        const pendingAmount = filterPendingBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
        const appliedAmount = filterAppliedBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
        const pendingGiven = filterPendingBills.reduce((sum, bill) => sum + (bill.givenAmount || 0), 0);
        const appliedGiven = filterAppliedBills.reduce((sum, bill) => sum + (bill.givenAmount || 0), 0);

        return {
            totalPending, totalApplied,
            totalAmount: pendingAmount + appliedAmount,
            totalGiven: pendingGiven + appliedGiven,
        };
    }, [filterPendingBills, filterAppliedBills]);

    const getPaymentTypeBadge = (type) => {
        const badges = {
            'Cash': { icon: '💰', text: 'Cash', color: '#10b981' },
            'Cheque': { icon: '💳', text: 'Cheque', color: '#8b5cf6' },
            'Bank Transfer': { icon: '🏦', text: 'Bank Transfer', color: '#ec489a' },
            'bag_to_box': { icon: '📦', text: 'Bag to Box', color: '#f59e0b' },
            'bill_to_bill': { icon: '📄', text: 'Bill to Bill', color: '#3b82f6' },
            'bad_debt': { icon: '⚠️', text: 'Bad Debt', color: '#ef4444' }
        };
        return badges[type] || badges['Cash'];
    };

   

  const selectedBillTotals = state.selectedBill ? state.selectedBill.sales.reduce((acc, s) => {
    const weight = parseFloat(s.weight) || 0;
    const price = parseFloat(s.price_per_kg) || 0;
    const packs = parseFloat(s.packs) || 0;
    const packCost = parseFloat(s.CustomerPackCost) || 0;
    acc.billTotal += (weight * price);
    acc.totalBagPrice += (packs * packCost);
    return acc;
}, { billTotal: 0, totalBagPrice: 0 }) : { billTotal: 0, totalBagPrice: 0 };

const finalPayable = selectedBillTotals.billTotal + selectedBillTotals.totalBagPrice;
const currentGiven = parseFloat(state.givenAmountInput) || 0;

// ✅ Auto-set the remaining amount when a bill is selected
useEffect(() => {
    if (state.selectedBill && !state.isUpdatingCompletedBill) {
        const remainingAmount = Math.max(0, finalPayable - (state.selectedBill.givenAmount || 0));
        // Only auto-set if the input is empty or zero
        if (!state.givenAmountInput || parseFloat(state.givenAmountInput) === 0) {
            setState(prev => ({ ...prev, givenAmountInput: remainingAmount.toString() }));
        }
    }
}, [state.selectedBill, finalPayable, state.selectedBill?.givenAmount]);
 if (state.isLoading) return <LoadingSkeleton />;

    return (
        <div style={styles.app}>
            <div style={styles.container}>


                <div style={styles.threeColumns}>
                    {/* LEFT: Pending Bills */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}>
                            <h2 style={styles.panelTitle}>
                                <span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '50%', display: 'inline-block' }}></span>
                                Pending Payment
                            </h2>
                        </div>
                        <div style={{ padding: '12px 16px 0 16px' }}>
                            <input
                                type="text"
                                placeholder="🔍 Search pending bills..."
                                value={state.pendingSearchQuery}
                                onChange={(e) =>
                                    setState(prev => ({
                                        ...prev,
                                        pendingSearchQuery: e.target.value.toUpperCase()
                                    }))
                                }
                                style={styles.searchInput}
                            />
                        </div>
                        <div style={styles.panelContent}>
                            {filterPendingBills.length === 0 ? (
                                <EmptyState message="No pending bills" />
                            ) : (
                                filterPendingBills.map(bill => {
                                    const paymentBadge = getPaymentTypeBadge(bill.paymentAdjustmentType);
                                    return (
                                        <div
                                            key={bill.billNo}
                                            style={{
                                                ...styles.billItem,
                                                ...styles.billPending,
                                                ...(state.selectedBill?.billNo === bill.billNo && !state.isUpdatingCompletedBill ? styles.billSelected : {})
                                            }}
                                            onClick={() => handleBillClick(bill)}
                                        >
                                            <div style={styles.billRow}>
                                                <div style={styles.billLeft}>
                                                    <div style={styles.billNo}>{bill.billNo}</div>
                                                    <div style={styles.billCustomer}>{bill.customerCode}</div>
                                                </div>
                                                <div style={styles.billRight}>
                                                    <div style={styles.billTotal}>Rs. {formatDecimal(bill.totalAmount)}</div>
                                                    {bill.givenAmount > 0 && <div style={styles.billGiven}>Given: {formatDecimal(bill.givenAmount)}</div>}
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
                        background: 'white',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'calc(100vh - 320px)',
                        minHeight: '500px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.02)',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderBottom: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '20px 20px 0 0'
                        }}>
                            <h2 style={{
                                fontSize: '16px',
                                fontWeight: '600',
                                color: 'white',
                                margin: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span style={{
                                    width: '10px',
                                    height: '10px',
                                    background: '#fbbf24',
                                    borderRadius: '50%',
                                    display: 'inline-block',
                                    boxShadow: '0 0 8px #fbbf24'
                                }}></span>
                                Bill Details
                                {state.selectedBill && (
                                    <button
                                        style={{
                                            background: 'rgba(255,255,255,0.2)',
                                            border: 'none',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            transition: 'all 0.2s',
                                            marginLeft: 'auto'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                                        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                                        onClick={() => setState(prev => ({ ...prev, selectedBill: null, givenAmountInput: "", isUpdatingCompletedBill: false }))}
                                    >
                                        ✕ Clear
                                    </button>
                                )}
                            </h2>
                        </div>

                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                        }}>
                            {state.selectedBill ? (
                                <>
                                    <div style={{
                                        padding: '20px',
                                        background: 'white',
                                        borderRadius: '16px',
                                        marginBottom: '16px',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                    Bill Number
                                                </div>
                                                <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                    #{state.selectedBill.billNo}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                    Customer
                                                </div>
                                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                                                    {state.selectedBill.customerCode}
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 14px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: '500',
                                                    background: state.selectedBill.givenAmountApplied === 'Y' ? '#10b981' : '#f59e0b',
                                                    color: 'white',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}>
                                                    {state.selectedBill.givenAmountApplied === 'Y' ? '✓ PAID' : '⏳ PENDING'}
                                                </span>
                                            </div>
                                        </div>

                                        {state.selectedBill.givenAmount > 0 && (
                                            <div style={{
                                                marginTop: '16px',
                                                padding: '12px',
                                                background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                                                borderRadius: '12px',
                                                borderLeft: '4px solid #10b981'
                                            }}>
                                                <div style={{ fontSize: '13px', color: '#065f46', fontWeight: '500' }}>
                                                    💰 Already Given: Rs. {formatDecimal(state.selectedBill.givenAmount)}
                                                    {state.selectedBill.paymentAdjustmentType && (
                                                        <div style={{ fontSize: '11px', marginTop: '6px', color: '#047857' }}>
                                                            Payment Type: {
                                                                state.selectedBill.paymentAdjustmentType === 'Cheque' ? '💳 Cheque Payment' :
                                                                    state.selectedBill.paymentAdjustmentType === 'Bank Transfer' ? '🏦 Bank Transfer' :
                                                                        state.selectedBill.paymentAdjustmentType === 'bag_to_box' ? '📦 Bag to Box Adjustment' :
                                                                            state.selectedBill.paymentAdjustmentType === 'bill_to_bill' ? '📄 Bill to Bill Transfer' :
                                                                                state.selectedBill.paymentAdjustmentType === 'bad_debt' ? '⚠️ Bad Debt Write-off' : '💰 Cash Payment'
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{
                                        padding: '20px',
                                        background: 'white',
                                        borderRadius: '16px',
                                        marginBottom: '16px',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                    }}>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                                            📋 Items
                                        </div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{
                                                width: '100%',
                                                fontSize: '16px',
                                                borderCollapse: 'collapse'
                                            }}>
                                                <thead>
                                                    <tr style={{ background: '#f1f5f9' }}>
                                                        <th style={{ padding: '10px 8px', textAlign: 'left', color: '#475569', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Sup Code</th>
                                                        <th style={{ padding: '10px 8px', textAlign: 'left', color: '#475569', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Item</th>
                                                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#475569', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Wt (kg)</th>
                                                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#475569', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Price/kg</th>
                                                        <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Packs</th>
                                                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#475569', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {state.selectedBill.sales.map((sale, idx) => {
                                                        const total = (parseFloat(sale.weight) || 0) * (parseFloat(sale.price_per_kg) || 0);
                                                        return (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                                                                <td style={{ padding: '10px 8px', color: '#334155' }}>{sale.supplier_code}</td>
                                                                <td style={{ padding: '10px 8px', color: '#334155', fontWeight: '500' }}>{sale.item_name}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#334155' }}>{formatDecimal(sale.weight)}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#334155' }}>{formatDecimal(sale.price_per_kg)}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'center', color: '#334155' }}>{sale.packs}</td>
                                                                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{formatDecimal(total)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '20px',
                                        background: 'white',
                                        borderRadius: '16px',
                                        marginBottom: '16px',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', color: '#475569' }}>
                                            <span>Subtotal:</span>
                                            <span>Rs. {formatDecimal(selectedBillTotals.billTotal)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', color: '#475569' }}>
                                            <span>Bag Charges:</span>
                                            <span>Rs. {formatDecimal(selectedBillTotals.totalBagPrice)}</span>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '12px 0',
                                            marginTop: '8px',
                                            fontWeight: '700',
                                            fontSize: '16px',
                                            color: '#0f172a',
                                            borderTop: '2px solid #e2e8f0',
                                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent'
                                        }}>
                                            <span>Total Payable:</span>
                                            <span>Rs. {formatDecimal(finalPayable)}</span>
                                        </div>
                                        {state.selectedBill.givenAmount > 0 && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', color: '#059669', fontWeight: 'bold', marginTop: '8px' }}>
                                                    <span>Already Given:</span>
                                                    <span>Rs. {formatDecimal(state.selectedBill.givenAmount)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#d97706', fontWeight: 'bold' }}>
                                                    <span>Remaining to Pay:</span>
                                                    <span>Rs. {formatDecimal(Math.max(0, finalPayable - state.selectedBill.givenAmount))}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Payment Section */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        marginBottom: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                    }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '12px' }}>
                                            💰 Enter Payment Amount
                                        </div>

                                        <input
                                            type="number"
                                            value={state.givenAmountInput}
                                            onChange={handleGivenAmountChange}
                                            placeholder="0.00"
                                            disabled={state.isPrinting}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                border: '2px solid #fbbf24',
                                                borderRadius: '12px',
                                                fontSize: '18px',
                                                fontWeight: '600',
                                                textAlign: 'center',
                                                background: 'white',
                                                outline: 'none',
                                                transition: 'all 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                                            onBlur={(e) => e.target.style.borderColor = '#fbbf24'}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '10px 0', fontSize: '14px' }}>
                                            <span>After Payment:</span>
                                            <span style={{ fontWeight: 'bold', color: '#065f46', fontSize: '16px' }}>
                                                Rs. {formatDecimal((state.selectedBill.givenAmount + currentGiven))}
                                            </span>
                                        </div>

                                        {/* Payment Buttons */}
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={handleCashPayment}
                                                disabled={state.isPrinting || currentGiven === 0}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    fontWeight: '600',
                                                    fontSize: '13px',
                                                    cursor: currentGiven === 0 ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.2s',
                                                    opacity: currentGiven === 0 ? 0.5 : 1
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (currentGiven !== 0) e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                💵 Cash
                                            </button>
                                            <button
                                                onClick={handleChequePayment}
                                                disabled={state.isPrinting || currentGiven === 0}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    fontWeight: '600',
                                                    fontSize: '13px',
                                                    cursor: currentGiven === 0 ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.2s',
                                                    opacity: currentGiven === 0 ? 0.5 : 1
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (currentGiven !== 0) e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                💳 Cheque
                                            </button>
                                            <button
                                                onClick={handleBankToBankPayment}
                                                disabled={state.isPrinting || currentGiven === 0}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    background: 'linear-gradient(135deg, #ec489a, #db2777)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    fontWeight: '600',
                                                    fontSize: '13px',
                                                    cursor: currentGiven === 0 ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.2s',
                                                    opacity: currentGiven === 0 ? 0.5 : 1
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (currentGiven !== 0) e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                🏦 Bank Transfer
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePrintWithoutUpdate}
                                        disabled={state.isPrinting}
                                        style={{
                                            width: 'calc(100% - 0px)',
                                            marginBottom: '12px',
                                            padding: '12px',
                                            background: 'linear-gradient(135deg, #64748b, #475569)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        🖨️ Re-print Bill
                                    </button>

                                    <button
                                        onClick={() => setState(prev => ({ ...prev, showAdjustmentModal: true }))}
                                        style={{
                                            width: 'calc(100% - 0px)',
                                            marginBottom: '12px',
                                            padding: '12px',
                                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 4px 6px -1px rgba(245,158,11,0.3)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        🔧 Payment Adjustment
                                    </button>

                                    <button
                                        onClick={handleViewPaymentHistory}
                                        style={{
                                            width: 'calc(100% - 0px)',
                                            marginBottom: '0',
                                            padding: '12px',
                                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 4px 6px -1px rgba(99,102,241,0.3)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        📜 View Payment History
                                    </button>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                                    <p style={{ margin: 0, fontSize: '14px' }}>Click on any bill to view details and process payment</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Completed Bills */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}>
                            <h2 style={styles.panelTitle}>
                                <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                                Completed Payments
                            </h2>
                        </div>
                        <div style={{ padding: '12px 16px 0 16px' }}>
                            <input
                                type="text"
                                placeholder="🔍 Search completed bills..."
                                value={state.appliedSearchQuery}
                                onChange={(e) =>
                                    setState(prev => ({
                                        ...prev,
                                        appliedSearchQuery: e.target.value.toUpperCase()
                                    }))
                                }
                                style={styles.searchInput}
                            />
                        </div>
                        <div style={styles.panelContent}>
                            {filterAppliedBills.length === 0 ? (
                                <EmptyState message="No completed bills" />
                            ) : (
                                filterAppliedBills.map(bill => {
                                    const paymentBadge = getPaymentTypeBadge(bill.paymentAdjustmentType);
                                    return (
                                        <div
                                            key={bill.billNo}
                                            style={{
                                                ...styles.billItem,
                                                ...styles.billApplied,
                                                ...(state.selectedBill?.billNo === bill.billNo && state.isUpdatingCompletedBill ? styles.billSelected : {})
                                            }}
                                            onClick={() => handleBillClick(bill)}
                                        >
                                            <div style={styles.billRow}>
                                                <div style={styles.billLeft}>
                                                    <div style={styles.billNo}>{bill.billNo}</div>
                                                    <div style={styles.billCustomer}>{bill.customerCode}</div>
                                                </div>
                                                <div style={styles.billRight}>
                                                    <div style={styles.billTotal}>Rs. {formatDecimal(bill.totalAmount)}</div>
                                                    {bill.givenAmount > 0 && <div style={styles.billGiven}>Given: {formatDecimal(bill.givenAmount)}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={styles.statsRow}>
                    <div style={styles.statBox}>
                        <div style={styles.statLabel}>Pending</div>
                        <div style={styles.statNumber}>{stats.totalPending}</div>
                        <div style={styles.statSub}>bills awaiting payment</div>
                    </div>
                    <div style={styles.statBox}>
                        <div style={styles.statLabel}>Completed</div>
                        <div style={styles.statNumber}>{stats.totalApplied}</div>
                        <div style={styles.statSub}>bills paid</div>
                    </div>
                    <div style={styles.statBox}>
                        <div style={styles.statLabel}>Total Amount</div>
                        <div style={styles.statNumber}>Rs. {formatDecimal(stats.totalAmount)}</div>
                        <div style={styles.statSub}>all bills total</div>
                    </div>
                    <div style={styles.statBox}>
                        <div style={styles.statLabel}>Total Given</div>
                        <div style={styles.statNumber}>Rs. {formatDecimal(stats.totalGiven)}</div>
                        <div style={styles.statSub}>amount received</div>
                    </div>
                </div>
            </div>

            {/* Cheque Modal */}
            <ChequeModal
                isOpen={state.showChequeModal}
                onClose={() => setState(prev => ({ ...prev, showChequeModal: false, pendingChequeAmount: 0 }))}
                onConfirm={handleChequeConfirm}
                amount={state.pendingChequeAmount}
            />

            {/* Bank to Bank Modal */}
            <BankToBankModal
                isOpen={state.showBankToBankModal}
                onClose={() => setState(prev => ({ ...prev, showBankToBankModal: false, pendingBankToBankAmount: 0 }))}
                onConfirm={handleBankToBankConfirm}
                amount={state.pendingBankToBankAmount}
                customerCode={state.selectedBill?.customerCode}
                customerName={state.selectedBill ? state.customers.find(c =>
                    String(c.short_name).toUpperCase() === String(state.selectedBill.customerCode).toUpperCase()
                )?.name : ''}
            />

            {/* Payment Adjustment Modal */}
            <PaymentAdjustmentModal
                isOpen={state.showAdjustmentModal}
                onClose={() => setState(prev => ({ ...prev, showAdjustmentModal: false }))}
                onConfirm={handleApplyAdjustment}
                billNo={state.selectedBill?.billNo}
                customerCode={state.selectedBill?.customerCode}
                originalBillTotal={state.selectedBill?.totalAmount || 0}
            />

            {/* Payment History Modal */}
            <PaymentHistoryModal
                isOpen={state.showPaymentHistoryModal}
                onClose={() => setState(prev => ({ ...prev, showPaymentHistoryModal: false }))}
                payments={state.currentPayments}
                totalPaid={state.paymentHistoryTotalPaid}
                totalBill={state.paymentHistoryTotalBill}
                remaining={state.paymentHistoryRemaining}
            />
        </div>
    );
}