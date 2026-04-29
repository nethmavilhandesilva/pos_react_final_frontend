// src/components/SalesEntry/PrintedBills.jsx
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
    pendingFarmerBills: "/adjustments/pending-farmer-bills"
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

// ==================== CHEQUE MODAL WITH BANK ACCOUNT SELECTION ====================
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
        <div style={modalStyles.overlay} onClick={onClose}>
            <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
                <h3 style={modalStyles.title}>Cheque Payment</h3>
                <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Amount: Rs. {amount.toFixed(2)}</label>
                </div>
                <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Cheque Date *</label>
                    <input
                        type="date"
                        name="cheq_date"
                        value={chequeDetails.cheq_date}
                        onChange={handleChange}
                        style={modalStyles.input}
                    />
                </div>
                <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Cheque Number *</label>
                    <input
                        type="text"
                        name="cheq_no"
                        value={chequeDetails.cheq_no}
                        onChange={handleChange}
                        placeholder="Enter cheque number"
                        style={modalStyles.input}
                    />
                </div>
                <div style={modalStyles.formGroup}>
                    <BankAccountSelector
                        selectedAccountId={chequeDetails.bank_account_id}
                        onSelect={handleBankSelect}
                        disabled={false}
                    />
                </div>
                <div style={modalStyles.footer}>
                    <button onClick={onClose} style={modalStyles.cancelBtn}>Cancel</button>
                    <button onClick={handleSubmit} style={modalStyles.confirmBtn}>Confirm Payment</button>
                </div>
            </div>
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

    const handleSubmit = () => {
        const adjustmentData = {
            bill_no: billNo,
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
        }

        if (adjustmentType === 'bad_debt') {
            if (!badDebtName || !badDebtAmount) {
                alert('Please enter bad debt name and amount');
                return;
            }
            adjustmentData.bad_debt_name = badDebtName;
            adjustmentData.bad_debt_amount = parseFloat(badDebtAmount);
        }

        onConfirm(adjustmentData);
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
        <div style={modalStyles.overlay} onClick={onClose}>
            <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={modalStyles.header}>
                    <h3 style={modalStyles.title}>Payment Adjustment</h3>
                    <button style={modalStyles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div style={modalStyles.content}>
                    <div style={modalStyles.formGroup}>
                        <label style={modalStyles.label}>Adjustment Type</label>
                        <select
                            value={adjustmentType}
                            onChange={(e) => setAdjustmentType(e.target.value)}
                            style={modalStyles.select}
                        >
                            <option value="bag_to_box">Bag to Box Conversion</option>
                            <option value="bill_to_bill">Bill to Bill Transfer</option>
                            <option value="bad_debt">Bad Debt Write-off</option>
                        </select>
                    </div>

                    {adjustmentType === 'bag_to_box' && (
                        <>
                            <div style={modalStyles.row}>
                                <div style={modalStyles.formGroup}>
                                    <label style={modalStyles.label}>Number of Bags</label>
                                    <input
                                        type="number"
                                        value={bagCount}
                                        onChange={(e) => setBagCount(e.target.value)}
                                        placeholder="Enter bag count"
                                        style={modalStyles.input}
                                    />
                                </div>
                                <div style={modalStyles.formGroup}>
                                    <label style={modalStyles.label}>Value per Bag (Rs.)</label>
                                    <input
                                        type="number"
                                        value={bagValue}
                                        onChange={(e) => setBagValue(e.target.value)}
                                        placeholder="Bag value"
                                        style={modalStyles.input}
                                    />
                                </div>
                            </div>
                            <div style={modalStyles.row}>
                                <div style={modalStyles.formGroup}>
                                    <label style={modalStyles.label}>Number of Boxes</label>
                                    <input
                                        type="number"
                                        value={boxCount}
                                        onChange={(e) => setBoxCount(e.target.value)}
                                        placeholder="Enter box count"
                                        style={modalStyles.input}
                                    />
                                </div>
                                <div style={modalStyles.formGroup}>
                                    <label style={modalStyles.label}>Value per Box (Rs.)</label>
                                    <input
                                        type="number"
                                        value={boxValue}
                                        onChange={(e) => setBoxValue(e.target.value)}
                                        placeholder="Box value"
                                        style={modalStyles.input}
                                    />
                                </div>
                            </div>
                            <div style={modalStyles.infoBox}>
                                <strong>Adjustment Summary:</strong><br />
                                Total Bag Value: Rs. {(parseInt(bagCount) * parseFloat(bagValue) || 0).toFixed(2)}<br />
                                Total Box Value: Rs. {(parseInt(boxCount) * parseFloat(boxValue) || 0).toFixed(2)}<br />
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#166534' }}>
                                    Adjustment Amount: Rs. {calculateBagToBoxAdjustment().toFixed(2)}
                                </span><br />
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    This amount will be deducted from the remaining payment
                                </span>
                            </div>
                        </>
                    )}

                    {adjustmentType === 'bill_to_bill' && (
                        <>
                            {/* Customer Bill Section */}
                            <div style={modalStyles.section}>
                                <div style={modalStyles.sectionTitle}>Customer Bill Transfer</div>
                                <div style={modalStyles.formGroup}>
                                    <label style={modalStyles.label}>Customer Code</label>
                                    <div style={modalStyles.searchRow}>
                                        <input
                                            type="text"
                                            value={customerCodeField}
                                            onChange={(e) => setCustomerCodeField(e.target.value.toUpperCase())}
                                            placeholder="Enter customer code"
                                            style={{ ...modalStyles.input, flex: 1 }}
                                        />
                                        <button onClick={handleSearchCustomerBills} style={modalStyles.searchBtn}>
                                            Search Bills
                                        </button>
                                    </div>
                                </div>

                                {loadingBills && <div style={{ textAlign: 'center', padding: '10px', color: '#64748b' }}>Loading bills...</div>}

                                {pendingCustomerBills.length > 0 && (
                                    <div style={modalStyles.billList}>
                                        <input
                                            type="text"
                                            placeholder="Search bills..."
                                            value={customerSearchTerm}
                                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                            style={{ ...modalStyles.input, marginBottom: '10px' }}
                                        />
                                        {filteredCustomerBills.map(bill => (
                                            <div
                                                key={bill.bill_no}
                                                style={{
                                                    ...modalStyles.billItem,
                                                    ...(customerBillNo === bill.bill_no ? modalStyles.billSelected : {})
                                                }}
                                                onClick={() => {
                                                    setCustomerBillNo(bill.bill_no);
                                                    setCustomerBillValue(bill.total_amount);
                                                }}
                                            >
                                                <div>
                                                    <strong>Bill #{bill.bill_no}</strong>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{bill.customer_code}</div>
                                                </div>
                                                <div style={{ fontWeight: 'bold' }}>
                                                    Rs. {parseFloat(bill.total_amount).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={modalStyles.row}>
                                    <div style={modalStyles.formGroup}>
                                        <label style={modalStyles.label}>Selected Bill No</label>
                                        <input
                                            type="text"
                                            value={customerBillNo}
                                            onChange={(e) => setCustomerBillNo(e.target.value)}
                                            placeholder="Bill number"
                                            style={modalStyles.input}
                                            readOnly
                                        />
                                    </div>
                                    <div style={modalStyles.formGroup}>
                                        <label style={modalStyles.label}>Bill Value (Rs.)</label>
                                        <input
                                            type="number"
                                            value={customerBillValue}
                                            onChange={(e) => setCustomerBillValue(e.target.value)}
                                            placeholder="Bill value"
                                            style={modalStyles.input}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Farmer Bill Section */}
                            <div style={modalStyles.section}>
                                <div style={modalStyles.sectionTitle}>Farmer/Supplier Bill Transfer</div>
                                <div style={modalStyles.formGroup}>
                                    <label style={modalStyles.label}>Farmer/Supplier Code</label>
                                    <div style={modalStyles.searchRow}>
                                        <input
                                            type="text"
                                            value={farmerCode}
                                            onChange={(e) => setFarmerCode(e.target.value.toUpperCase())}
                                            placeholder="Enter farmer/supplier code"
                                            style={{ ...modalStyles.input, flex: 1 }}
                                        />
                                        <button onClick={handleSearchFarmerBills} style={modalStyles.searchBtn}>
                                            Search Bills
                                        </button>
                                    </div>
                                </div>

                                {pendingFarmerBills.length > 0 && (
                                    <div style={modalStyles.billList}>
                                        <input
                                            type="text"
                                            placeholder="Search bills..."
                                            value={farmerSearchTerm}
                                            onChange={(e) => setFarmerSearchTerm(e.target.value)}
                                            style={{ ...modalStyles.input, marginBottom: '10px' }}
                                        />
                                        {filteredFarmerBills.map(bill => (
                                            <div
                                                key={bill.supplier_bill_no}
                                                style={{
                                                    ...modalStyles.billItem,
                                                    ...(farmerBillNo === bill.supplier_bill_no ? modalStyles.billSelected : {})
                                                }}
                                                onClick={() => {
                                                    setFarmerBillNo(bill.supplier_bill_no);
                                                    setFarmerBillValue(bill.total_amount);
                                                }}
                                            >
                                                <div>
                                                    <strong>Bill #{bill.supplier_bill_no}</strong>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{bill.supplier_code}</div>
                                                </div>
                                                <div style={{ fontWeight: 'bold' }}>
                                                    Rs. {parseFloat(bill.total_amount).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={modalStyles.row}>
                                    <div style={modalStyles.formGroup}>
                                        <label style={modalStyles.label}>Selected Bill No</label>
                                        <input
                                            type="text"
                                            value={farmerBillNo}
                                            onChange={(e) => setFarmerBillNo(e.target.value)}
                                            placeholder="Bill number"
                                            style={modalStyles.input}
                                            readOnly
                                        />
                                    </div>
                                    <div style={modalStyles.formGroup}>
                                        <label style={modalStyles.label}>Bill Value (Rs.)</label>
                                        <input
                                            type="number"
                                            value={farmerBillValue}
                                            onChange={(e) => setFarmerBillValue(e.target.value)}
                                            placeholder="Bill value"
                                            style={modalStyles.input}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={modalStyles.infoBox}>
                                <strong>Transfer Summary:</strong><br />
                                Customer Bill Amount: Rs. {(parseFloat(customerBillValue) || 0).toLocaleString()}<br />
                                Farmer Bill Amount: Rs. {(parseFloat(farmerBillValue) || 0).toLocaleString()}<br />
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#166534' }}>
                                    Total Transfer Amount: Rs. {calculateBillToBillTotal().toLocaleString()}
                                </span><br />
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    This amount will be deducted from the remaining payment
                                </span>
                            </div>
                        </>
                    )}

                    {adjustmentType === 'bad_debt' && (
                        <>
                            <div style={modalStyles.formGroup}>
                                <label style={modalStyles.label}>Bad Debt Name/Reference</label>
                                <input
                                    type="text"
                                    value={badDebtName}
                                    onChange={(e) => setBadDebtName(e.target.value)}
                                    placeholder="Enter customer name or reference"
                                    style={modalStyles.input}
                                />
                            </div>
                            <div style={modalStyles.formGroup}>
                                <label style={modalStyles.label}>Bad Debt Amount (Rs.)</label>
                                <input
                                    type="number"
                                    value={badDebtAmount}
                                    onChange={(e) => setBadDebtAmount(e.target.value)}
                                    placeholder="Enter amount to write off"
                                    style={modalStyles.input}
                                />
                            </div>
                            <div style={modalStyles.warningBox}>
                                ⚠️ Bad debt adjustment will write off Rs. {(parseFloat(badDebtAmount) || 0).toLocaleString()} from this bill.<br />
                                This action cannot be undone and will deduct this amount from the remaining payment.
                            </div>
                        </>
                    )}
                </div>

                <div style={modalStyles.footer}>
                    <button onClick={onClose} style={modalStyles.cancelBtn}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} style={modalStyles.confirmBtn}>
                        Apply Adjustment
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== RECEIPT HTML BUILDER ====================
const buildFullReceiptHTML = (salesData, billNo, customerName, mobile, globalLoanAmount = 0, givenAmount = 0, paymentMethod = 'cash', chequeDetails = null) => {
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

    const paymentMethodDisplay = paymentMethod === 'cheque' && chequeDetails 
        ? `<div style="font-size:14px; margin-top:5px;">💳 Cheque: ${chequeDetails.bank_name || 'Bank'} | No: ${chequeDetails.cheq_no} | Date: ${chequeDetails.cheq_date}</div>`
        : '<div style="font-size:14px; margin-top:5px;">💰 Payment: Cash</div>';

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
            <tr><td style="font-size:20px;">මලු:</td><td style="text-align:right;">${formatNumber(totalPackCost.toFixed(2))}ERC20
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

        <table style="width:100%; border-collapse:collapse; margin-top:25px; font-size:14px; text-align:center;">${summaryHtmlContent}</td>

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
        background: '#f8fafc',
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
        background: 'white',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
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
        borderColor: '#3b82f6',
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
        color: '#64748b',
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
        fontSize: '12px',
        borderCollapse: 'collapse',
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
        width: 'calc(100% - 32px)',
        margin: '0 16px 8px 16px',
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
        width: 'calc(100% - 32px)',
        margin: '0 16px 8px 16px',
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
    }
};

const LoadingSkeleton = () => (
    <div style={styles.app}>
        <div style={styles.container}>
            <div style={{ height: '40px', background: '#e2e8f0', borderRadius: '12px', width: '200px', marginBottom: '24px' }}></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '24px' }}>
                {[1,2,3].map(i => <div key={i} style={{ background: 'white', borderRadius: '20px', height: '500px' }}></div>)}
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
        showAdjustmentModal: false
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
                            createdAt: sale.created_at
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

    const processPayment = async (paymentAmount, isCheque = false, chequeDetails = null) => {
        if (!state.selectedBill || state.isPrinting) return;
        
        setState(prev => ({ ...prev, isPrinting: true }));

        try {
            const totalGivenAmount = state.selectedBill.givenAmount + paymentAmount;
            const isFullySettled = totalGivenAmount >= state.selectedBill.totalAmount;
            const creditTransaction = isFullySettled ? 'N' : 'Y';
            const givenAmountApplied = totalGivenAmount >= state.selectedBill.totalAmount ? 'Y' : 'N';

            const payload = {
                bill_no: state.selectedBill.billNo,
                given_amount: totalGivenAmount,
                given_amount_applied: givenAmountApplied,
                credit_transaction: creditTransaction
            };

            // Add cheque details if payment method is cheque
            if (isCheque && chequeDetails) {
                payload.cheq_date = chequeDetails.cheq_date;
                payload.cheq_no = chequeDetails.cheq_no;
                payload.bank_account_id = chequeDetails.bank_account_id;
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

                const receiptHtml = buildFullReceiptHTML(
                    state.selectedBill.sales,
                    state.selectedBill.billNo,
                    customer?.name || state.selectedBill.customerCode,
                    customer?.telephone_no || "",
                    0,
                    totalGivenAmount,
                    isCheque ? 'cheque' : 'cash',
                    chequeDetails
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
                    </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();

                const statusMessage = givenAmountApplied === 'Y' 
                    ? `✅ Payment Complete!\n\nAmount Paid: Rs. ${formatDecimal(paymentAmount)}\nTotal Given: Rs. ${formatDecimal(totalGivenAmount)}\nBill is now FULLY PAID and moved to Completed Payments.`
                    : `✓ Payment Added!\n\nAmount Paid: Rs. ${formatDecimal(paymentAmount)}\nTotal Given: Rs. ${formatDecimal(totalGivenAmount)}\nRemaining: Rs. ${formatDecimal(Math.max(0, state.selectedBill.totalAmount - totalGivenAmount))}`;
                
                alert(statusMessage);
                
                setState(prev => ({ 
                    ...prev, 
                    selectedBill: null, 
                    givenAmountInput: "", 
                    showChequeModal: false
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
        await processPayment(paymentAmount, false, null);
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
        await processPayment(state.pendingChequeAmount, true, chequeDetails);
    };

    const handlePrintWithoutUpdate = async () => {
        if (!state.selectedBill || state.isPrinting) return;
        
        setState(prev => ({ ...prev, isPrinting: true }));

        try {
            const customer = state.customers.find(c =>
                String(c.short_name).toUpperCase() === String(state.selectedBill.customerCode).toUpperCase()
            );

            const receiptHtml = buildFullReceiptHTML(
                state.selectedBill.sales,
                state.selectedBill.billNo,
                customer?.name || state.selectedBill.customerCode,
                customer?.telephone_no || "",
                0,
                state.selectedBill.givenAmount || 0
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
            const response = await api.post(routes.applyAdjustment, adjustmentData);
            if (response.data.success) {
                const data = response.data.data;
                alert(`Adjustment applied successfully!\n\nAdjustment Amount: Rs. ${formatDecimal(data.adjustment_amount)}\nNew Given Amount: Rs. ${formatDecimal(data.new_given_amount)}\nRemaining: Rs. ${formatDecimal(data.remaining)}`);
                setState(prev => ({ ...prev, showAdjustmentModal: false }));
                await fetchSalesData();
            }
        } catch (error) {
            alert('Failed to apply adjustment: ' + (error.response?.data?.message || error.message));
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

    if (state.isLoading) return <LoadingSkeleton />;

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

    return (
        <div style={styles.app}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <div style={styles.headerTop}>
                        <h1 style={styles.title}>Printed Bills</h1>
                        <button style={styles.refreshBtn} onClick={fetchSalesData}>
                            🔄 Refresh
                        </button>
                    </div>
                    <p style={styles.subtitle}>Manage payments, re-print bills, and apply adjustments</p>
                </div>

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
                                onChange={(e) => setState(prev => ({ ...prev, pendingSearchQuery: e.target.value }))} 
                                style={styles.searchInput} 
                            />
                        </div>
                        <div style={styles.panelContent}>
                            {filterPendingBills.length === 0 ? (
                                <EmptyState message="No pending bills" />
                            ) : (
                                filterPendingBills.map(bill => (
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
                                                <div style={styles.billNo}>#{bill.billNo}</div>
                                                <div style={styles.billCustomer}>{bill.customerCode}</div>
                                                <span style={{ ...styles.badge, ...styles.badgePending }}>Pending</span>
                                            </div>
                                            <div style={styles.billRight}>
                                                <div style={styles.billTotal}>Rs. {formatDecimal(bill.totalAmount)}</div>
                                                {bill.givenAmount > 0 && <div style={styles.billGiven}>Given: {formatDecimal(bill.givenAmount)}</div>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* CENTER: Bill Details */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}>
                            <h2 style={styles.panelTitle}>
                                Bill Details
                                {state.selectedBill && (
                                    <button 
                                        style={styles.clearBtn}
                                        onClick={() => setState(prev => ({ ...prev, selectedBill: null, givenAmountInput: "", isUpdatingCompletedBill: false }))}
                                    >
                                        ✕ Clear
                                    </button>
                                )}
                            </h2>
                        </div>
                        <div style={styles.panelContent}>
                            {state.selectedBill ? (
                                <>
                                    <div style={styles.detailSection}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={styles.detailLabel}>Bill Number</div>
                                                <div style={styles.detailValue}>#{state.selectedBill.billNo}</div>
                                            </div>
                                            <div>
                                                <div style={styles.detailLabel}>Customer</div>
                                                <div style={styles.detailValue}>{state.selectedBill.customerCode}</div>
                                            </div>
                                            <div>
                                                <span style={state.selectedBill.givenAmountApplied === 'Y' ? { ...styles.badge, ...styles.badgeApplied } : { ...styles.badge, ...styles.badgePending }}>
                                                    {state.selectedBill.givenAmountApplied === 'Y' ? 'PAID' : 'PENDING'}
                                                </span>
                                            </div>
                                        </div>
                                        {state.selectedBill.givenAmount > 0 && (
                                            <div style={{ marginTop: '12px', padding: '8px', background: '#f0fdf4', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '13px', color: '#15803d' }}>
                                                    💰 Already Given: Rs. {formatDecimal(state.selectedBill.givenAmount)}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={styles.detailSection}>
                                        <div style={styles.detailLabel}>Items</div>
                                        <table style={styles.itemsTable}>
                                            <thead>
                                                <tr>
                                                    <th style={styles.tableHeader}>Item</th>
                                                    <th style={styles.tableHeader}>Wt (kg)</th>
                                                    <th style={styles.tableHeader}>Price/kg</th>
                                                    <th style={styles.tableHeader}>Packs</th>
                                                    <th style={styles.tableHeader}>Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {state.selectedBill.sales.map((sale, idx) => {
                                                    const total = (parseFloat(sale.weight) || 0) * (parseFloat(sale.price_per_kg) || 0);
                                                    return (
                                                        <tr key={idx}>
                                                            <td style={styles.tableCell}>{sale.item_name}</td>
                                                            <td style={styles.tableCell}>{formatDecimal(sale.weight)}</td>
                                                            <td style={styles.tableCell}>{formatDecimal(sale.price_per_kg)}</td>
                                                            <td style={styles.tableCell}>{sale.packs}</td>
                                                            <td style={styles.tableCell}>{formatDecimal(total)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div style={styles.detailSection}>
                                        <div style={styles.summaryRow}>
                                            <span>Subtotal:</span>
                                            <span>Rs. {formatDecimal(selectedBillTotals.billTotal)}</span>
                                        </div>
                                        <div style={styles.summaryRow}>
                                            <span>Bag Charges:</span>
                                            <span>Rs. {formatDecimal(selectedBillTotals.totalBagPrice)}</span>
                                        </div>
                                        <div style={styles.totalRow}>
                                            <span>Total Payable:</span>
                                            <span>Rs. {formatDecimal(finalPayable)}</span>
                                        </div>
                                        {state.selectedBill.givenAmount > 0 && (
                                            <>
                                                <div style={{ ...styles.summaryRow, color: '#15803d', fontWeight: 'bold', marginTop: '8px' }}>
                                                    <span>Already Given:</span>
                                                    <span>Rs. {formatDecimal(state.selectedBill.givenAmount)}</span>
                                                </div>
                                                <div style={{ ...styles.summaryRow, color: '#eab308', fontWeight: 'bold' }}>
                                                    <span>Remaining to Pay:</span>
                                                    <span>Rs. {formatDecimal(Math.max(0, finalPayable - state.selectedBill.givenAmount))}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Payment Section */}
                                    <div style={styles.paymentBox}>
                                        <div style={styles.paymentLabel}>
                                            💰 Enter Payment Amount
                                        </div>
                                        
                                        <input
                                            type="number"
                                            value={state.givenAmountInput}
                                            onChange={handleGivenAmountChange}
                                            placeholder="0.00"
                                            style={styles.paymentInput}
                                            disabled={state.isPrinting}
                                        />
                                        <div style={styles.remainingBox}>
                                            <span>After Payment:</span>
                                            <span style={{ fontWeight: 'bold', color: '#15803d' }}>
                                                Rs. {formatDecimal((state.selectedBill.givenAmount + currentGiven))}
                                            </span>
                                        </div>

                                        {/* Payment Buttons */}
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                            <button 
                                                onClick={handleCashPayment}
                                                disabled={state.isPrinting || currentGiven === 0}
                                                style={styles.cashPaymentBtn}
                                            >
                                                💵 Pay with Cash
                                            </button>
                                            <button 
                                                onClick={handleChequePayment}
                                                disabled={state.isPrinting || currentGiven === 0}
                                                style={styles.chequePaymentBtn}
                                            >
                                                💳 Pay with Cheque
                                            </button>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handlePrintWithoutUpdate} 
                                        disabled={state.isPrinting} 
                                        style={styles.printBtn}
                                    >
                                        🖨️ Re-print Bill
                                    </button>

                                    <button 
                                        onClick={() => setState(prev => ({ ...prev, showAdjustmentModal: true }))}
                                        style={styles.adjustmentBtn}
                                    >
                                        🔧 Payment Adjustment
                                    </button>
                                </>
                            ) : (
                                <EmptyState message="Click on any bill to view details and process payment" />
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
                                onChange={(e) => setState(prev => ({ ...prev, appliedSearchQuery: e.target.value }))} 
                                style={styles.searchInput} 
                            />
                        </div>
                        <div style={styles.panelContent}>
                            {filterAppliedBills.length === 0 ? (
                                <EmptyState message="No completed bills" />
                            ) : (
                                filterAppliedBills.map(bill => (
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
                                                <div style={styles.billNo}>#{bill.billNo}</div>
                                                <div style={styles.billCustomer}>{bill.customerCode}</div>
                                                <span style={{ ...styles.badge, ...styles.badgeApplied }}>Paid</span>
                                            </div>
                                            <div style={styles.billRight}>
                                                <div style={styles.billTotal}>Rs. {formatDecimal(bill.totalAmount)}</div>
                                                {bill.givenAmount > 0 && <div style={styles.billGiven}>Given: {formatDecimal(bill.givenAmount)}</div>}
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

            {/* Payment Adjustment Modal */}
            <PaymentAdjustmentModal
                isOpen={state.showAdjustmentModal}
                onClose={() => setState(prev => ({ ...prev, showAdjustmentModal: false }))}
                onConfirm={handleApplyAdjustment}
                billNo={state.selectedBill?.billNo}
                customerCode={state.selectedBill?.customerCode}
                originalBillTotal={state.selectedBill?.totalAmount || 0}
            />
        </div>
    );
}