// src/components/SalesEntry/PaymentAdjustmentModal.jsx
import React, { useState } from 'react';
import BankAccountSelector from './BankAccountSelector';
import bankService from '../../services/bankService';

const PaymentAdjustmentModal = ({ isOpen, onClose, onConfirm, billNo, customerCode }) => {
    const [adjustmentType, setAdjustmentType] = useState('bag_to_box');
    const [bagCount, setBagCount] = useState('');
    const [boxCount, setBoxCount] = useState('');
    const [bagValue, setBagValue] = useState('');
    const [boxValue, setBoxValue] = useState('');
    const [targetCustomerCode, setTargetCustomerCode] = useState('');
    const [targetBillNo, setTargetBillNo] = useState('');
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [pendingBills, setPendingBills] = useState([]);
    const [loadingBills, setLoadingBills] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const handleSearchCustomerBills = async () => {
        if (!targetCustomerCode) {
            alert('Please enter customer code');
            return;
        }
        
        setLoadingBills(true);
        try {
            const response = await bankService.getPendingCustomerBills(targetCustomerCode);
            if (response.success) {
                setPendingBills(response.data);
            }
        } catch (error) {
            alert('Failed to fetch pending bills');
        } finally {
            setLoadingBills(false);
        }
    };

    const handleSubmit = () => {
        if (!adjustmentAmount || parseFloat(adjustmentAmount) <= 0) {
            alert('Please enter a valid adjustment amount');
            return;
        }

        const adjustmentData = {
            bill_no: billNo,
            adjustment_type: adjustmentType,
            adjustment_amount: parseFloat(adjustmentAmount)
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
            if (!targetCustomerCode || !targetBillNo) {
                alert('Please select target customer and bill');
                return;
            }
            adjustmentData.target_customer_code = targetCustomerCode;
            adjustmentData.target_bill_no = targetBillNo;
        }

        onConfirm(adjustmentData);
    };

    const filteredBills = pendingBills.filter(bill =>
        bill.bill_no.toString().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.header}>
                    <h3 style={styles.title}>Payment Adjustment</h3>
                    <button style={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div style={styles.content}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Adjustment Type</label>
                        <select
                            value={adjustmentType}
                            onChange={(e) => setAdjustmentType(e.target.value)}
                            style={styles.select}
                        >
                            <option value="bag_to_box">Bag to Box Conversion</option>
                            <option value="bill_to_bill">Bill to Bill Transfer</option>
                            <option value="bad_debt">Bad Debt Write-off</option>
                        </select>
                    </div>

                    {adjustmentType === 'bag_to_box' && (
                        <>
                            <div style={styles.row}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Number of Bags</label>
                                    <input
                                        type="number"
                                        value={bagCount}
                                        onChange={(e) => setBagCount(e.target.value)}
                                        placeholder="Enter bag count"
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Value per Bag (Rs.)</label>
                                    <input
                                        type="number"
                                        value={bagValue}
                                        onChange={(e) => setBagValue(e.target.value)}
                                        placeholder="Bag value"
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                            <div style={styles.row}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Number of Boxes</label>
                                    <input
                                        type="number"
                                        value={boxCount}
                                        onChange={(e) => setBoxCount(e.target.value)}
                                        placeholder="Enter box count"
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Value per Box (Rs.)</label>
                                    <input
                                        type="number"
                                        value={boxValue}
                                        onChange={(e) => setBoxValue(e.target.value)}
                                        placeholder="Box value"
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                            <div style={styles.infoBox}>
                                Total Bag Value: Rs. {(parseInt(bagCount) * parseFloat(bagValue) || 0).toFixed(2)}<br />
                                Total Box Value: Rs. {(parseInt(boxCount) * parseFloat(boxValue) || 0).toFixed(2)}<br />
                                Difference: Rs. {((parseInt(bagCount) * parseFloat(bagValue) || 0) - (parseInt(boxCount) * parseFloat(boxValue) || 0)).toFixed(2)}
                            </div>
                        </>
                    )}

                    {adjustmentType === 'bill_to_bill' && (
                        <>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Target Customer Code</label>
                                <div style={styles.searchRow}>
                                    <input
                                        type="text"
                                        value={targetCustomerCode}
                                        onChange={(e) => setTargetCustomerCode(e.target.value.toUpperCase())}
                                        placeholder="Enter customer code"
                                        style={{ ...styles.input, flex: 1 }}
                                    />
                                    <button onClick={handleSearchCustomerBills} style={styles.searchBtn}>
                                        Search
                                    </button>
                                </div>
                            </div>

                            {loadingBills && <div style={styles.loading}>Loading pending bills...</div>}

                            {pendingBills.length > 0 && (
                                <div style={styles.billList}>
                                    <input
                                        type="text"
                                        placeholder="Search bills..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ ...styles.input, marginBottom: '10px' }}
                                    />
                                    {filteredBills.map(bill => (
                                        <div
                                            key={bill.bill_no}
                                            style={{
                                                ...styles.billItem,
                                                ...(targetBillNo === bill.bill_no ? styles.billSelected : {})
                                            }}
                                            onClick={() => setTargetBillNo(bill.bill_no)}
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
                        </>
                    )}

                    {adjustmentType === 'bad_debt' && (
                        <div style={styles.warningBox}>
                            ⚠️ Bad debt adjustment will write off this amount. This action cannot be undone.
                        </div>
                    )}

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Adjustment Amount (Rs.)</label>
                        <input
                            type="number"
                            value={adjustmentAmount}
                            onChange={(e) => setAdjustmentAmount(e.target.value)}
                            placeholder="Enter adjustment amount"
                            style={styles.input}
                        />
                    </div>
                </div>

                <div style={styles.footer}>
                    <button onClick={onClose} style={styles.cancelBtn}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} style={styles.confirmBtn}>
                        Apply Adjustment
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
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
        width: '600px',
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
        maxHeight: '200px',
        overflowY: 'auto',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '8px',
        marginTop: '8px',
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
    loading: {
        textAlign: 'center',
        padding: '20px',
        color: '#64748b',
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

export default PaymentAdjustmentModal;