// src/components/Suppliers/FundAllocationModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';

const FundAllocationModal = ({ isOpen, onClose, onAllocate, selectedAmount, maxAmount }) => {
    const [allocationType, setAllocationType] = useState('cash');
    const [amount, setAmount] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [bankList, setBankList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);
    
    // NEW: Store remaining balances directly from the 'remaining' column
    const [cashRemaining, setCashRemaining] = useState(0);
    const [bankRemainingBreakdown, setBankRemainingBreakdown] = useState([]);
    const [totalBankRemaining, setTotalBankRemaining] = useState(0);
    const [totalRemaining, setTotalRemaining] = useState(0);
    
    // Refs for Enter key navigation
    const amountInputRef = useRef(null);
    const bankSelectRef = useRef(null);
    const confirmButtonRef = useRef(null);

    // Set amount from selectedAmount prop when modal opens (if provided)
    useEffect(() => {
        if (isOpen) {
            if (selectedAmount && selectedAmount > 0) {
                setAmount(selectedAmount.toString());
            } else {
                setAmount('');
            }
            setTimeout(() => {
                if (amountInputRef.current) {
                    amountInputRef.current.focus();
                }
            }, 100);
        }
    }, [isOpen, selectedAmount]);

    // Fetch remaining balances and bank list when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchRemainingBalances();
            fetchBankList();
        }
    }, [isOpen]);

    // Fetch remaining balances directly from the 'remaining' column
    const fetchRemainingBalances = async () => {
        try {
            const response = await api.get('/cashier-balance/remaining-balances');
            console.log('Remaining balances response:', response.data);
            
            if (response.data.success) {
                const data = response.data.data;
                
                // Set cash remaining
                setCashRemaining(data.cash_remaining || 0);
                
                // Set bank breakdown from remaining column
                const bankBreakdown = data.bank_breakdown || [];
                setBankRemainingBreakdown(bankBreakdown);
                
                // Calculate total bank remaining
                const totalBank = data.total_bank_remaining || 0;
                setTotalBankRemaining(totalBank);
                
                // Set total remaining
                setTotalRemaining(data.total_remaining || 0);
                
                console.log('Remaining balances loaded:', {
                    cash_remaining: data.cash_remaining,
                    bank_breakdown: bankBreakdown,
                    total_bank_remaining: totalBank,
                    total_remaining: data.total_remaining
                });
            }
        } catch (error) {
            console.error('Error fetching remaining balances:', error);
        }
    };

    const fetchBankList = async () => {
        setIsLoadingBanks(true);
        try {
            const response = await api.get('/cashier-balance/bank-list');
            if (response.data.success) {
                setBankList(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching bank list:', error);
        } finally {
            setIsLoadingBanks(false);
        }
    };

    if (!isOpen) return null;

    const formatCurrency = (amount) => {
        const numAmount = typeof amount === 'object' ? 0 : (parseFloat(amount) || 0);
        return `Rs. ${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Get available remaining balance for selected source
    const getAvailableBalanceDisplay = () => {
        if (allocationType === 'cash') {
            return formatCurrency(cashRemaining);
        } else if (allocationType === 'bank' && selectedBank) {
            // Find the selected bank in the remaining breakdown
            const bank = bankRemainingBreakdown.find(b => b.bank_name === selectedBank);
            return formatCurrency(bank ? bank.amount : 0);
        }
        return formatCurrency(totalRemaining);
    };

    // Get max amount for allocation validation
    const getMaxAllowedAmount = () => {
        if (maxAmount && maxAmount > 0) {
            return maxAmount;
        }
        if (allocationType === 'cash') {
            return cashRemaining;
        } else if (allocationType === 'bank' && selectedBank) {
            const bank = bankRemainingBreakdown.find(b => b.bank_name === selectedBank);
            return bank ? bank.amount : 0;
        }
        return totalRemaining;
    };

    const handleAllocate = async () => {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const maxAllowed = getMaxAllowedAmount();
        if (amountNum > maxAllowed && maxAllowed > 0) {
            alert(`Amount exceeds available ${allocationType === 'cash' ? 'cash' : 'bank'} remaining balance! Available: ${formatCurrency(maxAllowed)}`);
            return;
        }

        if (allocationType === 'bank' && !selectedBank) {
            alert('Please select a bank');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                allocation_type: allocationType,
                amount: amountNum
            };
            
            if (allocationType === 'bank') {
                payload.bank_name = selectedBank;
            }

            const response = await api.post('/cashier-balance/allocate-funds', payload);
            
            if (response.data.success) {
                // Refresh remaining balances after allocation
                await fetchRemainingBalances();
                
                // Get updated remaining balance from response
                let remainingBalance = totalRemaining - amountNum;
                if (response.data.data?.remaining) {
                    const remainingData = response.data.data.remaining;
                    if (allocationType === 'cash') {
                        remainingBalance = remainingData.cash || 0;
                    } else if (allocationType === 'bank' && selectedBank) {
                        const bankKey = selectedBank.toUpperCase().replace(/ /g, '_');
                        remainingBalance = remainingData[bankKey] || 0;
                    }
                }
                
                const allocationResult = {
                    allocated_amount: amountNum,
                    remaining: remainingBalance,
                    message: response.data.message || 'Funds allocated successfully!'
                };
                
                if (onAllocate) {
                    onAllocate(allocationResult);
                }
                
                alert(`${response.data.message || 'Funds allocated successfully!'}\n\nAllocated Amount: ${formatCurrency(amountNum)}\nRemaining Balance: ${formatCurrency(remainingBalance)}`);
                
                onClose();
                setAmount('');
                setSelectedBank('');
                setAllocationType('cash');
            } else {
                alert(response.data.message || 'Failed to allocate funds');
            }
        } catch (error) {
            console.error('Error allocating funds:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to allocate funds';
            alert('Failed to allocate funds: ' + errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e, nextFieldRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldRef && nextFieldRef.current) {
                nextFieldRef.current.focus();
            }
        }
    };

    const handleLastFieldKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAllocate();
        }
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
            zIndex: 20010
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '24px',
                width: '500px',
                maxWidth: '90%',
                padding: '0',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden'
            }} onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    padding: '20px 24px',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>💵</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Allocate Funds</h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                                Select source and confirm allocation amount
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {/* Selected Amount Display */}
                    <div style={{
                        marginBottom: '20px',
                        padding: '16px',
                        background: '#fef3c7',
                        borderRadius: '12px',
                        textAlign: 'center',
                        border: '1px solid #fde68a'
                    }}>
                        <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>
                            Amount to Allocate
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>
                            {formatCurrency(parseFloat(amount) || 0)}
                        </div>
                    </div>

                    {/* Balance Summary - FROM REMAINING COLUMN */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '20px',
                        padding: '12px',
                        background: '#f8fafc',
                        borderRadius: '12px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>💰 Cash Remaining</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                                {formatCurrency(cashRemaining)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>🏦 Bank Remaining</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                                {formatCurrency(totalBankRemaining)}
                            </div>
                        </div>
                    </div>

                    {/* Allocation Type Selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#334155' }}>
                            📌 Allocation Source <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setAllocationType('cash');
                                    setSelectedBank('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: allocationType === 'cash' 
                                        ? 'linear-gradient(135deg, #10b981, #059669)'
                                        : '#f1f5f9',
                                    color: allocationType === 'cash' ? 'white' : '#475569',
                                    border: allocationType === 'cash' ? 'none' : '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span>💰</span> Cash
                            </button>
                            <button
                                type="button"
                                onClick={() => setAllocationType('bank')}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: allocationType === 'bank'
                                        ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                        : '#f1f5f9',
                                    color: allocationType === 'bank' ? 'white' : '#475569',
                                    border: allocationType === 'bank' ? 'none' : '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span>🏦</span> Bank
                            </button>
                        </div>
                    </div>

                    {/* Bank Selection (only for bank allocation) - Using remaining balances */}
                    {allocationType === 'bank' && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#334155' }}>
                                🏦 Select Bank <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                                ref={bankSelectRef}
                                value={selectedBank}
                                onChange={(e) => setSelectedBank(e.target.value)}
                                onKeyPress={(e) => handleKeyPress(e, amountInputRef)}
                                disabled={isLoadingBanks}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    background: 'white'
                                }}
                            >
                                <option value="">-- Select Bank --</option>
                                {bankRemainingBreakdown.map((bank, idx) => (
                                    <option key={idx} value={bank.bank_name}>
                                        {bank.bank_name} (Remaining: {formatCurrency(bank.amount)})
                                    </option>
                                ))}
                            </select>
                            {bankRemainingBreakdown.length === 0 && !isLoadingBanks && (
                                <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
                                    No bank balances available
                                </div>
                            )}
                            {isLoadingBanks && (
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                    Loading banks...
                                </div>
                            )}
                        </div>
                    )}

                    {/* Amount Input */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#334155' }}>
                            💰 Allocation Amount <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            ref={amountInputRef}
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onKeyPress={(e) => {
                                if (allocationType === 'cash') {
                                    handleLastFieldKeyPress(e);
                                } else {
                                    handleKeyPress(e, confirmButtonRef);
                                }
                            }}
                            placeholder="Enter amount"
                            step="0.01"
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '16px',
                                fontFamily: 'monospace',
                                fontWeight: 'bold',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    {/* Info Message */}
                    <div style={{
                        marginBottom: '20px',
                        padding: '10px',
                        background: '#fef3c7',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#92400e',
                        textAlign: 'center'
                    }}>
                        💡 Available amounts shown are from the remaining column (total received minus allocated funds)
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: '#f1f5f9',
                                color: '#475569',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        >
                            Cancel
                        </button>
                        <button
                            ref={confirmButtonRef}
                            onClick={handleAllocate}
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                opacity: isLoading ? 0.6 : 1,
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading) {
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            {isLoading ? 'Allocating...' : '✅ Allocate Funds'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FundAllocationModal;