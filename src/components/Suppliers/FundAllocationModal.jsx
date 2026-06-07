// src/components/Suppliers/FundAllocationModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';

const FundAllocationModal = ({ isOpen, onClose, onAllocate, selectedAmount, maxAmount }) => {
    const [allocationType, setAllocationType] = useState('cash');
    const [amount, setAmount] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [selectedCashier, setSelectedCashier] = useState('all');
    const [cashiers, setCashiers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCashiers, setIsLoadingCashiers] = useState(false);
    
    // Store remaining balances
    const [cashRemaining, setCashRemaining] = useState(0);
    const [bankRemainingBreakdown, setBankRemainingBreakdown] = useState([]);
    const [totalBankRemaining, setTotalBankRemaining] = useState(0);
    
    // Auto-refresh timer reference
    const refreshTimerRef = useRef(null);
    
    // Refs for Enter key navigation
    const cashierSelectRef = useRef(null);
    const amountInputRef = useRef(null);
    const bankSelectRef = useRef(null);
    const confirmButtonRef = useRef(null);

    // Set amount from selectedAmount prop when modal opens
    useEffect(() => {
        if (isOpen) {
            if (selectedAmount && selectedAmount > 0) {
                setAmount(selectedAmount.toString());
            } else {
                setAmount('');
            }
            setSelectedCashier('all');
            setTimeout(() => {
                if (cashierSelectRef.current) {
                    cashierSelectRef.current.focus();
                }
            }, 100);
        }
    }, [isOpen, selectedAmount]);

    // Fetch cashiers list when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchCashiers();
        }
    }, [isOpen]);

    // Fetch remaining balances when modal opens OR cashier changes
    useEffect(() => {
        if (isOpen) {
            fetchRemainingBalances();
            startAutoRefresh();
        }
        
        return () => {
            stopAutoRefresh();
        };
    }, [isOpen, selectedCashier]);

    // Start auto-refresh timer
    const startAutoRefresh = () => {
        stopAutoRefresh();
        refreshTimerRef.current = setInterval(() => {
            console.log('Auto-refreshing remaining balances for cashier:', selectedCashier);
            fetchRemainingBalances();
        }, 10000);
    };

    // Stop auto-refresh timer
    const stopAutoRefresh = () => {
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    };

    // Fetch available cashiers
    const fetchCashiers = async () => {
        setIsLoadingCashiers(true);
        try {
            const response = await api.get('/cashier-balance/detailed-balance');
            if (response.data.success) {
                const cashierNames = response.data.data.cashier_names || [];
                setCashiers(cashierNames);
            }
        } catch (error) {
            console.error('Error fetching cashiers:', error);
        } finally {
            setIsLoadingCashiers(false);
        }
    };

    // Fetch remaining balances
    const fetchRemainingBalances = async () => {
        try {
            const url = `/cashier-balance/remaining-balances${selectedCashier !== 'all' ? `?cashier_name=${encodeURIComponent(selectedCashier)}` : ''}`;
            const response = await api.get(url);
            
            if (response.data.success) {
                const data = response.data.data;
                
                // Only show balances if a specific cashier is selected
                if (selectedCashier !== 'all') {
                    setCashRemaining(data.cash_remaining || 0);
                    const bankBreakdown = data.bank_breakdown || [];
                    setBankRemainingBreakdown(bankBreakdown);
                    const totalBank = data.total_bank_remaining || 0;
                    setTotalBankRemaining(totalBank);
                } else {
                    // When "All Cashiers" is selected, show 0 or hide balances
                    setCashRemaining(0);
                    setBankRemainingBreakdown([]);
                    setTotalBankRemaining(0);
                }
            }
        } catch (error) {
            console.error('Error fetching remaining balances:', error);
            setCashRemaining(0);
            setBankRemainingBreakdown([]);
            setTotalBankRemaining(0);
        }
    };

    if (!isOpen) return null;

    const formatCurrency = (amount) => {
        const numAmount = parseFloat(amount) || 0;
        return `Rs. ${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

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
        return 0;
    };

    const handleAllocate = async () => {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        if (selectedCashier === 'all') {
            alert('Please select a specific cashier to allocate funds');
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
                amount: amountNum,
                cashier_name: selectedCashier
            };
            
            if (allocationType === 'bank') {
                payload.bank_name = selectedBank;
            }

            console.log('Sending allocation payload:', payload);

            const response = await api.post('/cashier-balance/allocate-funds', payload);
            
            if (response.data.success) {
                await fetchRemainingBalances();
                
                let remainingBalance = 0;
                if (allocationType === 'cash') {
                    remainingBalance = cashRemaining - amountNum;
                } else if (allocationType === 'bank' && selectedBank) {
                    const bank = bankRemainingBreakdown.find(b => b.bank_name === selectedBank);
                    remainingBalance = (bank ? bank.amount : 0) - amountNum;
                }
                
                const allocationResult = {
                    allocated_amount: amountNum,
                    remaining: remainingBalance,
                    cashier_name: selectedCashier,
                    message: response.data.message || 'Funds allocated successfully!'
                };
                
                if (onAllocate) {
                    onAllocate(allocationResult);
                }
                
                alert(`✅ Funds allocated successfully!\n\nCashier: ${selectedCashier}\nAmount: ${formatCurrency(amountNum)}\nRemaining: ${formatCurrency(remainingBalance)}`);
                
                onClose();
                setAmount('');
                setSelectedBank('');
                setAllocationType('cash');
                setSelectedCashier('all');
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
                borderRadius: '20px',
                width: '450px',
                maxWidth: '90%',
                padding: '0',
                boxShadow: '0 20px 40px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden'
            }} onClick={(e) => e.stopPropagation()}>
                
                {/* Header - More Compact */}
                <div style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    padding: '14px 20px',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>💵</span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Allocate Funds</h3>
                            </div>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: 'white',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>×</button>
                    </div>
                </div>

                {/* Content - More Compact */}
                <div style={{ padding: '20px' }}>
                    {/* Cashier Filter Dropdown */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>
                            👤 Select Cashier <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                            ref={cashierSelectRef}
                            value={selectedCashier}
                            onChange={(e) => {
                                setSelectedCashier(e.target.value);
                                setSelectedBank('');
                            }}
                            onKeyPress={(e) => handleKeyPress(e, amountInputRef)}
                            disabled={isLoadingCashiers}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '13px',
                                background: 'white',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            <option value="all">-- Select a Cashier --</option>
                            {cashiers.map((cashier, idx) => (
                                <option key={idx} value={cashier}>
                                    👤 {cashier}
                                </option>
                            ))}
                        </select>
                        {selectedCashier === 'all' && (
                            <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px' }}>
                                ⚠️ Please select a specific cashier to view balances and allocate funds
                            </div>
                        )}
                    </div>

                    {/* Balance Summary - Only show when specific cashier selected */}
                    {selectedCashier !== 'all' && (
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginBottom: '16px',
                            padding: '10px',
                            background: '#f8fafc',
                            borderRadius: '10px'
                        }}>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>💰 Cash Available</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                                    {formatCurrency(cashRemaining)}
                                </div>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>🏦 Bank Available</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                                    {formatCurrency(totalBankRemaining)}
                                </div>
                            </div>
                        </div>
                    )}

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
                                    padding: '8px',
                                    background: allocationType === 'cash' 
                                        ? 'linear-gradient(135deg, #10b981, #059669)'
                                        : '#f1f5f9',
                                    color: allocationType === 'cash' ? 'white' : '#475569',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '12px'
                                }}
                            >
                                💰 Cash
                            </button>
                            <button
                                type="button"
                                onClick={() => setAllocationType('bank')}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: allocationType === 'bank'
                                        ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                        : '#f1f5f9',
                                    color: allocationType === 'bank' ? 'white' : '#475569',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '12px'
                                }}
                            >
                                🏦 Bank
                            </button>
                        </div>
                    </div>

                    {/* Bank Selection - Only show for bank allocation */}
                    {allocationType === 'bank' && selectedCashier !== 'all' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>
                                🏦 Select Bank
                            </label>
                            <select
                                ref={bankSelectRef}
                                value={selectedBank}
                                onChange={(e) => setSelectedBank(e.target.value)}
                                onKeyPress={(e) => handleKeyPress(e, amountInputRef)}
                                disabled={bankRemainingBreakdown.length === 0}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    background: 'white'
                                }}
                            >
                                <option value="">-- Select Bank --</option>
                                {bankRemainingBreakdown.map((bank, idx) => (
                                    <option key={idx} value={bank.bank_name}>
                                        {bank.bank_name} ({formatCurrency(bank.amount)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Amount Input */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>
                            💰 Amount to Allocate
                        </label>
                        <input
                            ref={amountInputRef}
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onKeyPress={handleLastFieldKeyPress}
                            placeholder="Enter amount"
                            step="0.01"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1.5px solid #e2e8f0',
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
                        >
                            Cancel
                        </button>
                        <button
                            ref={confirmButtonRef}
                            onClick={handleAllocate}
                            disabled={isLoading || selectedCashier === 'all'}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: (isLoading || selectedCashier === 'all') ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: (isLoading || selectedCashier === 'all') ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '13px',
                                opacity: (isLoading || selectedCashier === 'all') ? 0.6 : 1
                            }}
                        >
                            {isLoading ? 'Allocating...' : 'Allocate Funds'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FundAllocationModal;