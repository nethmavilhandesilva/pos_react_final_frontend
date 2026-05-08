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
    paymentHistory: "/sales/payment-history",
    paymentReport: "/sales/payment-report",
    dashboardStats: "/sales/dashboard-stats",
    checkCustomer: "/customers/check-short-name",
    updateDebtorStatus: "/customers/update-debtor-status"
};

// ==================== CUSTOMER TYPE SELECTOR ====================
const CustomerTypeSelector = ({ selectedType, onSelect, disabled = false }) => {
    return (
        <div style={{ marginBottom: '20px', padding: '16px', background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', borderRadius: '16px', border: '2px solid #bae6fd' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '700', fontSize: '13px', color: '#0369a1' }}>
                👤 Customer Type
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
                <button
                    onClick={() => onSelect('walking')}
                    disabled={disabled}
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: selectedType === 'walking' ? 'linear-gradient(135deg, #10b981, #059669)' : 'white',
                        color: selectedType === 'walking' ? 'white' : '#475569',
                        border: selectedType === 'walking' ? 'none' : '2px solid #e2e8f0',
                        borderRadius: '12px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        opacity: disabled ? 0.6 : 1
                    }}
                >
                    🚶 Walking Customer
                </button>
                <button
                    onClick={() => onSelect('debtor')}
                    disabled={disabled}
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: selectedType === 'debtor' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'white',
                        color: selectedType === 'debtor' ? 'white' : '#475569',
                        border: selectedType === 'debtor' ? 'none' : '2px solid #e2e8f0',
                        borderRadius: '12px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        opacity: disabled ? 0.6 : 1
                    }}
                >
                    📋 Debtor
                </button>
            </div>
        </div>
    );
};

// ==================== DEBTOR FORM MODAL ====================
const DebtorFormModal = ({ isOpen, onClose, onSave, customerCode }) => {
    const [formData, setFormData] = useState({
        short_name: '',
        name: '',
        ID_NO: '',
        telephone_no: '',
        address: '',
        credit_limit: '',
        profile_pic: null,
        nic_front: null,
        nic_back: null
    });
    const [loading, setLoading] = useState(false);
    const [previewImages, setPreviewImages] = useState({
        profile_pic: null,
        nic_front: null,
        nic_back: null
    });

    useEffect(() => {
        if (isOpen && customerCode) {
            setFormData(prev => ({ ...prev, short_name: customerCode.toUpperCase() }));
        }
    }, [isOpen, customerCode]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        const file = files[0];
        if (file) {
            setFormData(prev => ({ ...prev, [name]: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImages(prev => ({ ...prev, [name]: reader.result }));
            };
            reader.readAsDataURL(file);
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
            
            if (formData.profile_pic) formDataToSend.append('profile_pic', formData.profile_pic);
            if (formData.nic_front) formDataToSend.append('nic_front', formData.nic_front);
            if (formData.nic_back) formDataToSend.append('nic_back', formData.nic_back);

            const response = await api.post('/customers', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.status === 200 || response.status === 201) {
                alert('Customer registered as Debtor successfully!');
                onSave(true);
                onClose();
            }
        } catch (error) {
            console.error('Error saving debtor:', error);
            alert('Failed to save debtor information. Please try again.');
        } finally {
            setLoading(false);
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
            zIndex: 10001,
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                width: '550px',
                maxWidth: '90%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '20px 20px 0 0',
                }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>📝</span> Register Debtor: {customerCode}
                    </h3>
                </div>

                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    <div style={{
                        background: '#fef3c7',
                        padding: '12px',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        fontSize: '13px',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                    }}>
                        ⚠️ Customer "{customerCode}" not found. Please provide additional information to register as a Debtor.
                        <br /><small>All fields are optional</small>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>Full Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange}
                            placeholder="Enter full name"
                            style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>ID Number</label>
                        <input type="text" name="ID_NO" value={formData.ID_NO} onChange={handleChange}
                            placeholder="Enter NIC/ID number"
                            style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>Telephone Number</label>
                        <input type="tel" name="telephone_no" value={formData.telephone_no} onChange={handleChange}
                            placeholder="Enter phone number"
                            style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>Address</label>
                        <textarea name="address" value={formData.address} onChange={handleChange}
                            placeholder="Enter address" rows="2"
                            style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', resize: 'vertical', outline: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>Credit Limit (Rs.)</label>
                        <input type="number" name="credit_limit" value={formData.credit_limit} onChange={handleChange}
                            placeholder="Enter credit limit"
                            style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>Profile Picture</label>
                        <input type="file" name="profile_pic" onChange={handleFileChange} accept="image/jpeg,image/jpg,image/png"
                            style={{ width: '100%', padding: '8px 12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '13px' }} />
                        {previewImages.profile_pic && <img src={previewImages.profile_pic} alt="Preview" style={{ marginTop: '8px', maxWidth: '100%', maxHeight: '100px', borderRadius: '8px' }} />}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>NIC Front</label>
                            <input type="file" name="nic_front" onChange={handleFileChange} accept="image/jpeg,image/jpg,image/png"
                                style={{ width: '100%', padding: '8px 12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '13px' }} />
                            {previewImages.nic_front && <img src={previewImages.nic_front} alt="NIC Front" style={{ marginTop: '8px', maxWidth: '100%', maxHeight: '100px', borderRadius: '8px' }} />}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#334155' }}>NIC Back</label>
                            <input type="file" name="nic_back" onChange={handleFileChange} accept="image/jpeg,image/jpg,image/png"
                                style={{ width: '100%', padding: '8px 12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '13px' }} />
                            {previewImages.nic_back && <img src={previewImages.nic_back} alt="NIC Back" style={{ marginTop: '8px', maxWidth: '100%', maxHeight: '100px', borderRadius: '8px' }} />}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc', borderRadius: '0 0 20px 20px' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Skip for Now</button>
                    <button onClick={handleSubmit} disabled={loading} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #4CAF50, #45a049)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>{loading ? 'Saving...' : 'Save & Continue'}</button>
                </div>
            </div>
        </div>
    );
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

    if (loading) return <div style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Loading bank accounts...</div>;
    if (error) return <div style={{ padding: '10px', textAlign: 'center', color: '#ef4444', fontSize: '12px' }}>{error}</div>;

    return (
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#334155' }}>Select Bank Account <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={selectedAccountId || ''} onChange={(e) => onSelect(e.target.value ? parseInt(e.target.value) : null)} disabled={disabled}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', cursor: 'pointer' }}>
                <option value="">-- Select Bank Account --</option>
                {banks.map(bank => <option key={bank.id} value={bank.id}>{bank.bank_name} - {bank.branch} (Acc: {bank.account_no})</option>)}
            </select>
        </div>
    );
};

// [Include all your existing modal components here: PaymentHistoryModal, ChequeModal, BankToBankModal, PaymentAdjustmentModal]
// (Keeping them as they are in your original code to save space)

// ==================== RECEIPT HTML BUILDER ====================
const buildFullReceiptHTML = (salesData, billNo, customerName, mobile, globalLoanAmount = 0, givenAmount = 0, paymentMethod = 'cash', paymentDetails = null) => {
    // Keep your existing receipt HTML builder function
    // (Same as in your original code)
    return `<div>Receipt HTML</div>`; // Placeholder - use your existing function
};

// ==================== REPORT DASHBOARD COMPONENT ====================
const ReportDashboard = ({ isOpen, onClose }) => {
    const [period, setPeriod] = useState('today');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchDashboardStats();
            fetchReport();
        }
    }, [isOpen, period]);

    const fetchDashboardStats = async () => {
        try {
            const response = await api.get(routes.dashboardStats);
            if (response.data.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            let url = `${routes.paymentReport}?period=${period}`;
            if (period === 'custom' && startDate && endDate) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            const response = await api.get(url);
            if (response.data.success) {
                setReport(response.data.report);
            }
        } catch (error) {
            console.error('Failed to fetch report:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => `Rs. ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
            zIndex: 20000,
            overflowY: 'auto',
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '24px',
                width: '1100px',
                maxWidth: '95%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>📊</span>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>Payment Collection Report</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'white', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {/* Period Selector */}
                    <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['today', 'week', 'month', 'custom'].map(p => (
                                <button key={p} onClick={() => setPeriod(p)}
                                    style={{
                                        padding: '8px 20px',
                                        background: period === p ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f1f5f9',
                                        color: period === p ? 'white' : '#475569',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '13px',
                                        textTransform: 'capitalize'
                                    }}>
                                    {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'Custom'}
                                </button>
                            ))}
                        </div>
                        {period === 'custom' && (
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }} />
                                <span>to</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }} />
                                <button onClick={fetchReport} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Apply</button>
                            </div>
                        )}
                    </div>

                    {/* Stats Cards */}
                    {stats && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ background: 'linear-gradient(135deg, #dbeafe, #eff6ff)', padding: '16px', borderRadius: '16px' }}>
                                <div style={{ fontSize: '12px', color: '#1e40af', marginBottom: '4px' }}>Pending Bills</div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e3a8a' }}>{stats.pending_bills}</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', padding: '16px', borderRadius: '16px' }}>
                                <div style={{ fontSize: '12px', color: '#065f46', marginBottom: '4px' }}>Total Customers</div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#064e3b' }}>{stats.total_customers}</div>
                                <div style={{ fontSize: '11px', color: '#047857' }}>Debtors: {stats.debtors_count}</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', padding: '16px', borderRadius: '16px' }}>
                                <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px' }}>Today's Collection</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#78350f' }}>{formatCurrency(stats.today?.total_given || 0)}</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', padding: '16px', borderRadius: '16px' }}>
                                <div style={{ fontSize: '12px', color: '#9d174d', marginBottom: '4px' }}>Week's Collection</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#831843' }}>{formatCurrency(stats.week?.total_given || 0)}</div>
                            </div>
                        </div>
                    )}

                    {/* Summary Section */}
                    {report && !loading ? (
                        <>
                            {/* Payment Type Summary */}
                            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>💰 Payment Type Summary</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Cash Collection</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(report.summary.cash_collection)}</div>
                                    </div>
                                    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #8b5cf6' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>💳</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Cheque Collection</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#8b5cf6' }}>{formatCurrency(report.summary.cheque_collection)}</div>
                                    </div>
                                    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #ec489a' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏦</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Bank Transfer</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ec489a' }}>{formatCurrency(report.summary.bank_transfer_collection)}</div>
                                    </div>
                                    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📦</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Bag to Box</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(report.summary.bag_to_box_total)}</div>
                                    </div>
                                    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #3b82f6' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Bill to Bill</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>{formatCurrency(report.summary.bill_to_bill_total)}</div>
                                    </div>
                                    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Bad Debt</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(report.summary.bad_debt_total)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Graph Section */}
                            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>📈 Daily Collection Trend (Last 7 Days)</h4>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '250px', overflowX: 'auto', paddingBottom: '16px' }}>
                                    {report.graph_data.labels.map((label, idx) => {
                                        const maxValue = Math.max(...report.graph_data.cash, ...report.graph_data.cheque, ...report.graph_data.bank_transfer, ...report.graph_data.adjustments, 1);
                                        const cashHeight = (report.graph_data.cash[idx] / maxValue) * 200;
                                        const chequeHeight = (report.graph_data.cheque[idx] / maxValue) * 200;
                                        const bankHeight = (report.graph_data.bank_transfer[idx] / maxValue) * 200;
                                        const adjHeight = (report.graph_data.adjustments[idx] / maxValue) * 200;
                                        
                                        return (
                                            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '200px' }}>
                                                    <div style={{ width: '20px', height: `${cashHeight}px`, background: '#10b981', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} title={`Cash: ${formatCurrency(report.graph_data.cash[idx])}`}></div>
                                                    <div style={{ width: '20px', height: `${chequeHeight}px`, background: '#8b5cf6', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} title={`Cheque: ${formatCurrency(report.graph_data.cheque[idx])}`}></div>
                                                    <div style={{ width: '20px', height: `${bankHeight}px`, background: '#ec489a', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} title={`Bank Transfer: ${formatCurrency(report.graph_data.bank_transfer[idx])}`}></div>
                                                    <div style={{ width: '20px', height: `${adjHeight}px`, background: '#f59e0b', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} title={`Adjustments: ${formatCurrency(report.graph_data.adjustments[idx])}`}></div>
                                                </div>
                                                <div style={{ fontSize: '10px', marginTop: '8px', color: '#64748b' }}>{label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px', display: 'inline-block' }}></span> Cash</span>
                                    <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', background: '#8b5cf6', borderRadius: '2px', display: 'inline-block' }}></span> Cheque</span>
                                    <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', background: '#ec489a', borderRadius: '2px', display: 'inline-block' }}></span> Bank Transfer</span>
                                    <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px', display: 'inline-block' }}></span> Adjustments</span>
                                </div>
                            </div>

                            {/* Totals */}
                            <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '16px', padding: '20px', marginBottom: '24px', color: 'white' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Bill Amount</div>
                                        <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{formatCurrency(report.summary.total_bill_amount)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Given Amount</div>
                                        <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{formatCurrency(report.summary.total_given_amount)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Remaining</div>
                                        <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{formatCurrency(report.summary.total_remaining)}</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '12px' }}>
                                    {report.summary.total_bills} Bills | {report.summary.total_customers} Customers
                                </div>
                            </div>

                            {/* Customer Breakdown Table */}
                            <div style={{ background: '#f8fafc', borderRadius: '16px', overflow: 'hidden' }}>
                                <h4 style={{ margin: 0, padding: '16px 20px', fontSize: '16px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>👥 Customer Breakdown</h4>
                                <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead style={{ background: '#e2e8f0', position: 'sticky', top: 0 }}>
                                            <tr>
                                                <th style={{ padding: '12px', textAlign: 'left' }}>Customer</th>
                                                <th style={{ padding: '12px', textAlign: 'right' }}>Bills</th>
                                                <th style={{ padding: '12px', textAlign: 'right' }}>Total Bill</th>
                                                <th style={{ padding: '12px', textAlign: 'right' }}>Total Paid</th>
                                                <th style={{ padding: '12px', textAlign: 'right' }}>Remaining</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.breakdown_by_customer.slice(0, 20).map((customer, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '10px 12px', fontWeight: '500' }}>{customer.customer_code}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{customer.bill_count}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCurrency(customer.total_bill)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>{formatCurrency(customer.total_given)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: customer.remaining > 0 ? '#ef4444' : '#10b981' }}>{formatCurrency(customer.remaining)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : loading ? (
                        <div style={{ textAlign: 'center', padding: '60px' }}>Loading report data...</div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

// ==================== MAIN COMPONENT ====================
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
        paymentHistoryRemaining: 0,
        customerType: 'walking',
        showDebtorForm: false,
        pendingDebtorBill: null,
        showReportModal: false
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

    const checkAndHandleDebtor = async (bill) => {
        if (state.customerType === 'walking') {
            handleBillClick(bill);
            return;
        }

        try {
            const response = await api.get(`${routes.checkCustomer}/${bill.customerCode}`);
            const data = response.data;

            if (data.exists) {
                if (data.customer && data.customer.Debtor !== 'Y') {
                    await api.put(routes.updateDebtorStatus, {
                        short_name: bill.customerCode,
                        Debtor: 'Y'
                    });
                }
                handleBillClick(bill);
            } else {
                setState(prev => ({
                    ...prev,
                    showDebtorForm: true,
                    pendingDebtorBill: bill
                }));
            }
        } catch (error) {
            console.error('Error checking debtor:', error);
            handleBillClick(bill);
        }
    };

    const handleDebtorSave = async (saved) => {
        if (saved && state.pendingDebtorBill) {
            handleBillClick(state.pendingDebtorBill);
        }
        setState(prev => ({
            ...prev,
            showDebtorForm: false,
            pendingDebtorBill: null
        }));
    };

    const handleBillClick = (bill) => {
        if (state.selectedBill && state.selectedBill.billNo === bill.billNo) {
            setState(prev => ({
                ...prev,
                selectedBill: null,
                givenAmountInput: "",
                isUpdatingCompletedBill: false
            }));
        } else {
            const remainingAmount = Math.max(0, bill.totalAmount - (bill.givenAmount || 0));
            setState(prev => ({
                ...prev,
                selectedBill: bill,
                givenAmountInput: remainingAmount.toString(),
                isUpdatingCompletedBill: bill.givenAmountApplied === 'Y'
            }));
        }
    };

    // [Include all your existing handler functions: processPayment, handleCashPayment, handleChequePayment, etc.]
    // (Keeping them as they are in your original code to save space)

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

    if (state.isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;

    return (
        <div style={{ width: '100vw', minHeight: '100vh', background: '#f1f5f9', margin: 0, padding: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '24px 32px' }}>
                {/* Header with Report Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Bill Management</h1>
                        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Manage customer bills and process payments</p>
                    </div>
                    <button onClick={() => setState(prev => ({ ...prev, showReportModal: true }))}
                        style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📊 View Report Dashboard
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 2fr 0.7fr', gap: '24px', alignItems: 'start' }}>
                    {/* LEFT: Pending Bills */}
                    <div style={{ background: 'white', borderRadius: '20px', border: '2px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: '500px' }}>
                        <div style={{ padding: '16px 20px', background: '#ffffff', borderBottom: '1px solid #eef2ff' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '50%', display: 'inline-block' }}></span>
                                Pending Payment
                            </h2>
                        </div>
                        
                        {/* Customer Type Selector */}
                        <div style={{ padding: '0 16px 12px 16px' }}>
                            <CustomerTypeSelector
                                selectedType={state.customerType}
                                onSelect={(type) => setState(prev => ({ ...prev, customerType: type }))}
                                disabled={state.isPrinting}
                            />
                        </div>
                        
                        <div style={{ padding: '12px 16px 0 16px' }}>
                            <input type="text" placeholder="🔍 Search pending bills..."
                                value={state.pendingSearchQuery}
                                onChange={(e) => setState(prev => ({ ...prev, pendingSearchQuery: e.target.value.toUpperCase() }))}
                                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', outline: 'none' }} />
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                            {state.pendingBills.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>No pending bills</div>
                            ) : (
                                state.pendingBills.map(bill => (
                                    <div key={bill.billNo}
                                        onClick={() => checkAndHandleDebtor(bill)}
                                        style={{
                                            padding: '14px', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer',
                                            background: state.selectedBill?.billNo === bill.billNo && !state.isUpdatingCompletedBill ? '#eff6ff' : '#ffffff',
                                            border: state.selectedBill?.billNo === bill.billNo && !state.isUpdatingCompletedBill ? '1px solid #074ec1' : '1px solid #f1f5f9',
                                            transition: 'all 0.15s'
                                        }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>{bill.billNo}</div>
                                                <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold', marginTop: '2px' }}>{bill.customerCode}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Rs. {formatDecimal(bill.totalAmount)}</div>
                                                {bill.givenAmount > 0 && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Given: {formatDecimal(bill.givenAmount)}</div>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* CENTER: Bill Details - Simplified version */}
                    <div style={{ background: 'white', borderRadius: '20px', border: '2px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: '500px' }}>
                        <div style={{ padding: '16px 20px', background: '#ffffff', borderBottom: '1px solid #eef2ff' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 }}>Bill Details</h2>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            {state.selectedBill ? (
                                <>
                                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>Bill Number</div>
                                                <div style={{ fontSize: '20px', fontWeight: '700' }}>#{state.selectedBill.billNo}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>Customer</div>
                                                <div style={{ fontSize: '18px', fontWeight: '700' }}>{state.selectedBill.customerCode}</div>
                                            </div>
                                            <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', background: state.selectedBill.givenAmountApplied === 'Y' ? '#10b981' : '#f59e0b', color: 'white' }}>
                                                {state.selectedBill.givenAmountApplied === 'Y' ? '✓ PAID' : '⏳ PENDING'}
                                            </span>
                                        </div>
                                        {state.selectedBill.givenAmount > 0 && (
                                            <div style={{ marginTop: '16px', padding: '12px', background: '#d1fae5', borderRadius: '12px' }}>
                                                <div style={{ fontSize: '13px', color: '#065f46', fontWeight: '500' }}>💰 Already Given: Rs. {formatDecimal(state.selectedBill.givenAmount)}</div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '12px' }}>📋 Items</div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ background: '#e2e8f0' }}>
                                                        <th style={{ padding: '8px', textAlign: 'left' }}>Item</th>
                                                        <th style={{ padding: '8px', textAlign: 'right' }}>Wt</th>
                                                        <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                                                        <th style={{ padding: '8px', textAlign: 'center' }}>Packs</th>
                                                        <th style={{ padding: '8px', textAlign: 'right' }}>Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {state.selectedBill.sales.map((sale, idx) => {
                                                        const total = (parseFloat(sale.weight) || 0) * (parseFloat(sale.price_per_kg) || 0);
                                                        return (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                                <td style={{ padding: '8px' }}>{sale.item_name}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatDecimal(sale.weight)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatDecimal(sale.price_per_kg)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'center' }}>{sale.packs}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{formatDecimal(total)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                            <span>Subtotal:</span><span>Rs. {formatDecimal(selectedBillTotals.billTotal)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                            <span>Bag Charges:</span><span>Rs. {formatDecimal(selectedBillTotals.totalBagPrice)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: '8px', fontWeight: '700', borderTop: '2px solid #e2e8f0' }}>
                                            <span>Total Payable:</span><span>Rs. {formatDecimal(finalPayable)}</span>
                                        </div>
                                        {state.selectedBill.givenAmount > 0 && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#059669', fontWeight: 'bold' }}>
                                                    <span>Already Given:</span><span>Rs. {formatDecimal(state.selectedBill.givenAmount)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#d97706', fontWeight: 'bold' }}>
                                                    <span>Remaining to Pay:</span><span>Rs. {formatDecimal(Math.max(0, finalPayable - state.selectedBill.givenAmount))}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div style={{ background: '#fef3c7', borderRadius: '16px', padding: '20px', marginBottom: '12px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '12px' }}>💰 Enter Payment Amount</div>
                                        <input type="number" value={state.givenAmountInput} onChange={(e) => setState(prev => ({ ...prev, givenAmountInput: e.target.value }))}
                                            placeholder="0.00" disabled={state.isPrinting}
                                            style={{ width: '100%', padding: '14px', border: '2px solid #fbbf24', borderRadius: '12px', fontSize: '18px', fontWeight: '600', textAlign: 'center', outline: 'none' }} />
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                            <button style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>💵 Cash</button>
                                            <button style={{ flex: 1, padding: '12px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>💳 Cheque</button>
                                            <button style={{ flex: 1, padding: '12px', background: '#ec489a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>🏦 Bank Transfer</button>
                                        </div>
                                    </div>

                                    <button onClick={() => setState(prev => ({ ...prev, showPaymentHistoryModal: true }))}
                                        style={{ width: '100%', marginBottom: '12px', padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                        📜 View Payment History
                                    </button>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                                    <p>Click on any bill to view details and process payment</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Completed Bills */}
                    <div style={{ background: 'white', borderRadius: '20px', border: '2px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: '500px' }}>
                        <div style={{ padding: '16px 20px', background: '#ffffff', borderBottom: '1px solid #eef2ff' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                                Completed Payments
                            </h2>
                        </div>
                        <div style={{ padding: '12px 16px 0 16px' }}>
                            <input type="text" placeholder="🔍 Search completed bills..."
                                value={state.appliedSearchQuery}
                                onChange={(e) => setState(prev => ({ ...prev, appliedSearchQuery: e.target.value.toUpperCase() }))}
                                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', outline: 'none' }} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                            {state.appliedBills.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>No completed bills</div>
                            ) : (
                                state.appliedBills.map(bill => (
                                    <div key={bill.billNo} onClick={() => handleBillClick(bill)}
                                        style={{
                                            padding: '14px', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer',
                                            background: state.selectedBill?.billNo === bill.billNo && state.isUpdatingCompletedBill ? '#eff6ff' : '#f0fdf4',
                                            border: state.selectedBill?.billNo === bill.billNo && state.isUpdatingCompletedBill ? '1px solid #074ec1' : '1px solid #dcfce7',
                                            transition: 'all 0.15s'
                                        }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>{bill.billNo}</div>
                                                <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold', marginTop: '2px' }}>{bill.customerCode}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Rs. {formatDecimal(bill.totalAmount)}</div>
                                                {bill.givenAmount > 0 && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Given: {formatDecimal(bill.givenAmount)}</div>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <DebtorFormModal
                isOpen={state.showDebtorForm}
                onClose={() => setState(prev => ({ ...prev, showDebtorForm: false, pendingDebtorBill: null }))}
                onSave={handleDebtorSave}
                customerCode={state.pendingDebtorBill?.customerCode || ''}
            />

            <ReportDashboard
                isOpen={state.showReportModal}
                onClose={() => setState(prev => ({ ...prev, showReportModal: false }))}
            />

            <PaymentHistoryModal
                isOpen={state.showPaymentHistoryModal}
                onClose={() => setState(prev => ({ ...prev, showPaymentHistoryModal: false }))}
                payments={state.currentPayments}
                totalPaid={state.paymentHistoryTotalPaid}
                totalBill={state.paymentHistoryTotalBill}
                remaining={state.paymentHistoryRemaining}
            />
            {/* Cheque Modal, BankToBank Modal, PaymentAdjustment Modal (include your existing modals here) */}
        </div>
    );
}