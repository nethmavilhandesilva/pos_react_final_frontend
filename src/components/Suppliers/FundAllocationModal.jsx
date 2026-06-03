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
    const [cashBalance, setCashBalance] = useState(0);
    const [bankBreakdown, setBankBreakdown] = useState([]);
    const [totalBalance, setTotalBalance] = useState(0);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    
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

    // Fetch current balance and bank list when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchRemainingBalances();
            fetchBankList();
        }
    }, [isOpen]);

    // Fetch remaining balances from the /remaining-balances endpoint
    const fetchRemainingBalances = async () => {
        setIsLoadingBalance(true);
        try {
            const response = await api.get('/cashier-balance/remaining-balances');
            if (response.data.success) {
                const data = response.data.data;
                setCashBalance(data.cash_remaining || 0);
                setBankBreakdown(data.bank_breakdown || []);
                setTotalBalance(data.total_remaining || 0);
            }
        } catch (error) {
            console.error('Error fetching remaining balances:', error);
        } finally {
            setIsLoadingBalance(false);
        }
    };

    // Fetch bank list from the /bank-list endpoint
    const fetchBankList = async () => {
        setIsLoadingBanks(true);
        try {
            const response = await api.get('/cashier-balance/bank-list');
            if (response.data.success) {
                // Enhance bank list with current balances from bankBreakdown
                const banksWithBalances = response.data.data.map(bank => {
                    const bankKey = bank.name?.toUpperCase().replace(/ /g, '_');
                    const foundBank = bankBreakdown.find(b => b.bank_key === bankKey);
                    return {
                        ...bank,
                        balance: foundBank ? foundBank.amount : (bank.balance || 0)
                    };
                });
                setBankList(banksWithBalances);
            }
        } catch (error) {
            console.error('Error fetching bank list:', error);
            // Fallback: create bank list from bankBreakdown
            const banksFromBreakdown = bankBreakdown.map(bank => ({
                name: bank.bank_name,
                balance: bank.amount,
                bank_key: bank.bank_key
            }));
            setBankList(banksFromBreakdown);
        } finally {
            setIsLoadingBanks(false);
        }
    };

    // Update bank list when bankBreakdown changes
    useEffect(() => {
        if (bankBreakdown.length > 0 && bankList.length === 0) {
            fetchBankList();
        }
    }, [bankBreakdown]);

    if (!isOpen) return null;

    const formatCurrency = (amount) => {
        const numAmount = parseFloat(amount) || 0;
        return `Rs. ${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Helper function to safely extract number from various response formats
    const safeExtractNumber = (value, defaultValue = 0) => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value) || defaultValue;
        if (typeof value === 'object') {
            return safeExtractNumber(value.amount || value.value || value.total || value.balance, defaultValue);
        }
        return defaultValue;
    };

    const handleAllocate = async () => {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        // Check against maxAmount if provided (from income totals)
        if (maxAmount && maxAmount > 0 && amountNum > maxAmount) {
            alert(`Amount exceeds available total income! Maximum available: ${formatCurrency(maxAmount)}`);
            return;
        }

        if (allocationType === 'bank' && !selectedBank) {
            alert('Please select a bank');
            return;
        }

        // Check if amount exceeds available balance for the selected source
        let maxSourceAmount = 0;
        if (allocationType === 'cash') {
            maxSourceAmount = cashBalance;
        } else if (selectedBank) {
            const bankKey = selectedBank.toUpperCase().replace(/ /g, '_');
            const selectedBankData = bankBreakdown.find(b => b.bank_key === bankKey);
            maxSourceAmount = selectedBankData ? selectedBankData.amount : 0;
        }

        if (amountNum > maxSourceAmount && maxSourceAmount > 0) {
            alert(`Amount exceeds available ${allocationType === 'cash' ? 'cash' : 'bank'} balance! Available: ${formatCurrency(maxSourceAmount)}`);
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
                // SAFELY EXTRACT THE REMAINING BALANCE
                let remainingBalance = 0;
                const responseData = response.data.data || {};
                
                // Try multiple possible field names and formats
                if (responseData.remaining_balance !== undefined) {
                    remainingBalance = safeExtractNumber(responseData.remaining_balance);
                } else if (responseData.remaining !== undefined) {
                    remainingBalance = safeExtractNumber(responseData.remaining);
                } else if (responseData.balance !== undefined) {
                    remainingBalance = safeExtractNumber(responseData.balance);
                } else if (responseData.total_remaining !== undefined) {
                    remainingBalance = safeExtractNumber(responseData.total_remaining);
                } else if (responseData.new_balance !== undefined) {
                    remainingBalance = safeExtractNumber(responseData.new_balance);
                } else if (responseData.available_balance !== undefined) {
                    remainingBalance = safeExtractNumber(responseData.available_balance);
                }
                
                // If still 0, try to calculate from previous balance if available
                if (remainingBalance === 0 && responseData.previous_balance !== undefined) {
                    const prevBalance = safeExtractNumber(responseData.previous_balance);
                    remainingBalance = prevBalance - amountNum;
                }
                
                // If all else fails, fetch the updated balance
                if (remainingBalance === 0) {
                    try {
                        const balanceResponse = await api.get('/cashier-balance/remaining-balances');
                        if (balanceResponse.data.success) {
                            remainingBalance = balanceResponse.data.data.total_remaining || 0;
                        }
                    } catch (balError) {
                        console.error('Error fetching updated balance:', balError);
                    }
                }
                
                // Prepare the allocation result object with safe numbers
                const allocationResult = {
                    allocated_amount: amountNum,
                    remaining: remainingBalance,
                    bank_breakdown: Array.isArray(responseData.bank_breakdown) ? responseData.bank_breakdown : [],
                    message: response.data.message || 'Funds allocated successfully!'
                };
                
                // Call the onAllocate callback with the structured data
                if (onAllocate) {
                    onAllocate(allocationResult);
                }
                
                // Refresh balances after successful allocation
                await fetchRemainingBalances();
                
                // Show success message with properly formatted numbers
                alert(`${response.data.message || 'Funds allocated successfully!'}\n\nAllocated Amount: ${formatCurrency(amountNum)}\nRemaining Balance: ${formatCurrency(remainingBalance)}`);
                
                onClose();
                // Reset form
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

    // Handle Enter key navigation
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

    // Get available balance display
    const getAvailableBalanceDisplay = () => {
        if (allocationType === 'cash') {
            return formatCurrency(cashBalance);
        } else if (selectedBank) {
            const bankKey = selectedBank.toUpperCase().replace(/ /g, '_');
            const selectedBankData = bankBreakdown.find(b => b.bank_key === bankKey);
            return formatCurrency(selectedBankData ? selectedBankData.amount : 0);
        }
        return formatCurrency(totalBalance);
    };

    // Get max amount display
    const getMaxAmountDisplay = () => {
        if (maxAmount && maxAmount > 0) {
            return formatCurrency(maxAmount);
        }
        return getAvailableBalanceDisplay();
    };

    // Calculate total bank balance
    const totalBankBalance = bankBreakdown.reduce((sum, bank) => sum + (bank.amount || 0), 0);

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
                borderRadius: '20px',
                width: '420px',
                maxWidth: '90%',
                padding: '0',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden'
            }} onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    padding: '14px 20px',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>💵</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Allocate Funds</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.9 }}>
                                Select source and confirm amount
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 20px' }}>
                    
                    {/* Selected Amount Display */}
                    <div style={{
                        marginBottom: '16px',
                        padding: '12px',
                        background: '#fef3c7',
                        borderRadius: '10px',
                        textAlign: 'center',
                        border: '1px solid #fde68a'
                    }}>
                        <div style={{ fontSize: '10px', color: '#92400e', marginBottom: '4px' }}>
                            Amount to Allocate
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
                            {formatCurrency(parseFloat(amount) || 0)}
                        </div>
                    </div>

                    {/* Balance Summary */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        marginBottom: '16px',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: '10px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>💰 Cash Balance</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                                {isLoadingBalance ? '...' : formatCurrency(cashBalance)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>🏦 Bank Balance</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#3b82f6' }}>
                                {isLoadingBalance ? '...' : formatCurrency(totalBankBalance)}
                            </div>
                        </div>
                    </div>

                    {/* Allocation Type Selection */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>
                            📌 Allocation Source
                        </label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setAllocationType('cash');
                                    setSelectedBank('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: allocationType === 'cash' 
                                        ? 'linear-gradient(135deg, #10b981, #059669)'
                                        : '#f1f5f9',
                                    color: allocationType === 'cash' ? 'white' : '#475569',
                                    border: allocationType === 'cash' ? 'none' : '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>💰</span> Cash
                            </button>
                            <button
                                type="button"
                                onClick={() => setAllocationType('bank')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: allocationType === 'bank'
                                        ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                        : '#f1f5f9',
                                    color: allocationType === 'bank' ? 'white' : '#475569',
                                    border: allocationType === 'bank' ? 'none' : '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>🏦</span> Bank
                            </button>
                        </div>
                    </div>

                    {/* Bank Selection (only for bank allocation) */}
                    {allocationType === 'bank' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>
                                🏦 Select Bank
                            </label>
                            <select
                                ref={bankSelectRef}
                                value={selectedBank}
                                onChange={(e) => setSelectedBank(e.target.value)}
                                onKeyPress={(e) => handleKeyPress(e, amountInputRef)}
                                disabled={isLoadingBanks}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    background: 'white'
                                }}
                            >
                                <option value="">-- Select Bank --</option>
                                {bankBreakdown.map((bank, idx) => (
                                    <option key={idx} value={bank.bank_name}>
                                        {bank.bank_name} ({formatCurrency(bank.amount)})
                                    </option>
                                ))}
                            </select>
                            {isLoadingBanks && (
                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                                    Loading banks...
                                </div>
                            )}
                        </div>
                    )}

                    {/* Available Balance Display */}
                    {allocationType === 'bank' && !selectedBank && (
                        <div style={{
                            marginBottom: '16px',
                            padding: '10px',
                            background: '#e0f2fe',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '10px', color: '#0369a1' }}>
                                Please select a bank to see available balance
                            </div>
                        </div>
                    )}

                    {(allocationType === 'cash' || (allocationType === 'bank' && selectedBank)) && (
                        <div style={{
                            marginBottom: '16px',
                            padding: '10px',
                            background: '#e0f2fe',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '10px', color: '#0369a1' }}>
                                Available {allocationType === 'cash' ? 'Cash' : 'Bank'} Balance
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0284c7' }}>
                                {getAvailableBalanceDisplay()}
                            </div>
                        </div>
                    )}

                    {/* Amount Input */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>
                            💰 Allocation Amount
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
                                padding: '12px 14px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontFamily: 'monospace',
                                fontWeight: 'bold',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: '#f1f5f9',
                                color: '#475569',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px'
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
                                padding: '10px',
                                background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '13px',
                                opacity: isLoading ? 0.6 : 1
                            }}
                        >
                            {isLoading ? 'Allocating...' : '✅ Allocate'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FundAllocationModal;