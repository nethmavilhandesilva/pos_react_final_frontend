import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const DebtorCreditorReport = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('debtors');
    const [debtors, setDebtors] = useState([]);
    const [creditors, setCreditors] = useState([]);
    const [debtorSummary, setDebtorSummary] = useState({});
    const [creditorSummary, setCreditorSummary] = useState({});
    const [combinedSummary, setCombinedSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [limit, setLimit] = useState(50);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    const fetchCombinedReport = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/debtor-creditor/combined', {
                params: { search: searchTerm, limit }
            });
            if (response.data.success) {
                setDebtors(response.data.debtors);
                setCreditors(response.data.creditors);
                setDebtorSummary(response.data.debtor_summary);
                setCreditorSummary(response.data.creditor_summary);
                setCombinedSummary(response.data.combined_summary);
            }
        } catch (error) {
            console.error('Error fetching combined report:', error);
            alert('Failed to load report data');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, limit]);

    useEffect(() => {
        fetchCombinedReport();
    }, [fetchCombinedReport]);

    const fetchDebtorDetails = async (code) => {
        setModalLoading(true);
        setShowDetailsModal(true);
        try {
            const response = await api.get(`/debtor-creditor/debtor/${code}`);
            if (response.data.success) {
                setModalData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching debtor details:', error);
            alert('Failed to load debtor details');
        } finally {
            setModalLoading(false);
        }
    };

    const fetchCreditorDetails = async (code) => {
        setModalLoading(true);
        setShowDetailsModal(true);
        try {
            const response = await api.get(`/debtor-creditor/creditor/${code}`);
            if (response.data.success) {
                setModalData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching creditor details:', error);
            alert('Failed to load creditor details');
        } finally {
            setModalLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return `Rs. ${(amount || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Helper function to get image URL
    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
            return imagePath;
        }
        const baseUrl = 'https://goviraju.lk/sms_new_backend_50500/application/public/storage';
        const cleanPath = imagePath.replace(/^\/+/, '');
        return `${baseUrl}/${cleanPath}`;
    };

    const filteredDebtors = useMemo(() => {
        if (!searchTerm) return debtors;
        const term = searchTerm.toLowerCase();
        return debtors.filter(d =>
            d.code?.toLowerCase().includes(term) ||
            d.name?.toLowerCase().includes(term) ||
            d.telephone?.includes(term) ||
            d.debtor_no?.toLowerCase().includes(term)
        );
    }, [debtors, searchTerm]);

    const filteredCreditors = useMemo(() => {
        if (!searchTerm) return creditors;
        const term = searchTerm.toLowerCase();
        return creditors.filter(c =>
            c.code?.toLowerCase().includes(term) ||
            c.name?.toLowerCase().includes(term) ||
            c.telephone?.includes(term)
        );
    }, [creditors, searchTerm]);

    const currentData = activeTab === 'debtors' ? filteredDebtors : filteredCreditors;
    const currentSummary = activeTab === 'debtors' ? debtorSummary : creditorSummary;

    // Function to get payment method icon and color
    const getPaymentMethodStyle = (method) => {
        const methods = {
            'Cash': { icon: '💰', color: '#10b981' },
            'Cheque': { icon: '💳', color: '#8b5cf6' },
            'Bank Transfer': { icon: '🏦', color: '#ec489a' },
            'bag_to_box': { icon: '📦', color: '#f59e0b' },
            'bill_to_bill': { icon: '📄', color: '#3b82f6' },
            'bad_debt': { icon: '⚠️', color: '#ef4444' },
            'Credit': { icon: '💳', color: '#f59e0b' }
        };
        return methods[method] || { icon: '💰', color: '#6b7280' };
    };

    if (loading) {
        return (
            <div style={styles.fullScreenContainer}>
                <div style={styles.loadingContainer}>
                    <div style={styles.loadingSpinner}>⏳</div>
                    <p style={styles.loadingText}>Loading report data...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.fullScreenContainer}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    <span style={styles.headerIcon}>💰</span>
                    <span>Debtor & Creditor Report</span>
                </div>
                <div style={styles.headerSubtitle}>
                    Comprehensive report of all debtors and creditors with their transaction details
                </div>
            </div>

            {/* Combined Summary Cards */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total Debtors</div>
                    <div style={styles.statValue}>{combinedSummary.total_debtors || 0}</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total Creditors</div>
                    <div style={styles.statValue}>{combinedSummary.total_creditors || 0}</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Debtor Outstanding</div>
                    <div style={styles.statValue}>{formatCurrency(combinedSummary.total_debtor_outstanding)}</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Creditor Outstanding</div>
                    <div style={styles.statValue}>{formatCurrency(combinedSummary.total_creditor_outstanding)}</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabsContainer}>
                <button
                    style={{
                        ...styles.tabButton,
                        ...(activeTab === 'debtors' ? styles.tabButtonActive : {})
                    }}
                    onClick={() => setActiveTab('debtors')}
                >
                    🧾 Debtors ({debtors.length})
                </button>
                <button
                    style={{
                        ...styles.tabButton,
                        ...(activeTab === 'creditors' ? styles.tabButtonActive : {})
                    }}
                    onClick={() => setActiveTab('creditors')}
                >
                    🏪 Creditors ({creditors.length})
                </button>
            </div>

            {/* Search and Filters */}
            <div style={styles.searchBar}>
                <input
                    type="text"
                    placeholder="🔍 Search by code, name, telephone, or debtor number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                    onFocus={(e) => {
                        e.target.style.borderColor = '#667eea';
                        e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                    }}
                />
                <select
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    style={styles.select}
                >
                    <option value={20}>Show 20</option>
                    <option value={50}>Show 50</option>
                    <option value={100}>Show 100</option>
                    <option value={200}>Show 200</option>
                </select>
                <button
                    onClick={fetchCombinedReport}
                    style={styles.refreshBtn}
                    onMouseEnter={(e) => e.target.style.background = '#45a049'}
                    onMouseLeave={(e) => e.target.style.background = '#4CAF50'}
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Summary for active tab */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total {activeTab === 'debtors' ? 'Debtors' : 'Creditors'}</div>
                    <div style={styles.statValue}>{currentSummary[`total_${activeTab}`] || 0}</div>
                </div>

                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total {activeTab === 'debtors' ? 'Sales' : 'Supplier'} Amount</div>
                    <div style={styles.statValue}>
                        {formatCurrency(currentSummary[`total_${activeTab === 'debtors' ? 'sales_amount' : 'supplier_amount'}`])}
                    </div>
                </div>

                {/* Total Paid Card with Conditional Logic */}
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total Paid</div>
                    <div style={styles.statValue}>
                        {(() => {
                            const totalSales = currentSummary[`total_${activeTab === 'debtors' ? 'sales_amount' : 'supplier_amount'}`] || 0;
                            const totalPaid = currentSummary.total_paid_amount || 0;
                            const totalCreditDeductions = currentSummary.total_credit_deductions || 0;

                            // Apply same logic: if paid > sales, subtract credit deductions
                            let displayPaid;
                            if (totalPaid > totalSales) {
                                displayPaid = totalPaid - totalCreditDeductions;
                            } else {
                                displayPaid = totalPaid;
                            }

                            return formatCurrency(displayPaid);
                        })()}
                    </div>
                    {/* Optional: Show adjustment indicator */}
                    {(() => {
                        const totalSales = currentSummary[`total_${activeTab === 'debtors' ? 'sales_amount' : 'supplier_amount'}`] || 0;
                        const totalPaid = currentSummary.total_paid_amount || 0;
                        if (totalPaid > totalSales && activeTab === 'debtors') {
                            return (
                                <div style={{ fontSize: '11px', color: '#8b5cf6', marginTop: '4px' }}>
                                    (Adjusted: -{formatCurrency(currentSummary.total_credit_deductions)})
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>

                {/* Credit Deductions Card */}
                {activeTab === 'debtors' && currentSummary.total_credit_deductions !== undefined && (
                    <div style={styles.statCard}>
                        <div style={styles.statLabel}>Credit Deductions</div>
                        <div style={{ ...styles.statValue, color: '#f59e0b' }}>
                            {formatCurrency(currentSummary.total_credit_deductions)}
                        </div>
                    </div>
                )}

                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total {activeTab === 'debtors' ? 'Remaining' : 'Outstanding'}</div>
                    <div style={styles.statValue}>{formatCurrency(currentSummary.total_remaining_amount)}</div>
                </div>
            </div>

            {/* Data Table */}
            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Debtor No</th>
                            <th style={styles.th}>Code</th>
                            <th style={styles.th}>Name</th>
                            <th style={styles.th}>Telephone</th>
                            <th style={styles.th}>Total Sales</th>
                            <th style={styles.th}>Paid</th>
                            {activeTab === 'debtors' && <th style={styles.th}>Credit</th>}
                            <th style={styles.th}>Remaining</th>
                            <th style={styles.th}>Bills</th>
                            <th style={styles.th}>Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {currentData.length === 0 ? (
                            <tr>
                                <td colSpan={activeTab === 'debtors' ? 10 : 9} style={styles.emptyState}>
                                    No {activeTab} found
                                </td>
                            </tr>
                        ) : (
                            currentData.map((item, idx) => {
                                // Calculate values safely
                                const totalSales = activeTab === 'debtors'
                                    ? (item.total_sales || 0)
                                    : (item.total_supplier_amount || 0);

                                const paidAmount = item.total_paid || 0;
                                const creditDeduction = item.credit_deductions || 0;

                                // ✅ CORRECTED CONDITION: 
                                // If paidAmount is greater than totalSales, subtract credit deductions
                                // Otherwise show the regular paidAmount
                                let displayPaid;
                                if (paidAmount > totalSales) {
                                    displayPaid = paidAmount - creditDeduction;
                                } else {
                                    displayPaid = paidAmount;
                                }

                                return (
                                    <tr
                                        key={idx}
                                        style={styles.tableRow}
                                        onClick={() =>
                                            activeTab === 'debtors'
                                                ? fetchDebtorDetails(item.code)
                                                : fetchCreditorDetails(item.code)
                                        }
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#f8fafc';
                                            e.currentTarget.style.cursor = 'pointer';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white';
                                        }}
                                    >
                                        <td style={styles.td}>
                                            <strong>{item.debtor_no || '-'}</strong>
                                        </td>

                                        <td style={styles.td}>
                                            <strong>{item.code}</strong>
                                        </td>

                                        <td style={styles.td}>{item.name || '-'}</td>
                                        <td style={styles.td}>{item.telephone || '-'}</td>

                                        <td style={styles.td}>
                                            <strong>{formatCurrency(totalSales)}</strong>
                                        </td>

                                        {/* ✅ PAID COLUMN WITH CONDITION */}
                                        <td style={styles.td}>
                                            {formatCurrency(displayPaid)}
                                        </td>

                                        {activeTab === 'debtors' && (
                                            <td style={styles.td}>
                                                <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                                                    {formatCurrency(creditDeduction)}
                                                </span>
                                            </td>
                                        )}

                                        <td style={styles.td}>
                                            <span style={{
                                                color: item.total_remaining > 0 ? '#dc2626' : '#10b981'
                                            }}>
                                                {formatCurrency(item.total_remaining)}
                                            </span>
                                        </td>

                                        <td style={styles.td}>{item.bill_count || 0}</td>

                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.statusBadge,
                                                ...(item.status === 'Fully Paid' || item.status === 'Fully Settled'
                                                    ? styles.statusPaid
                                                    : styles.statusPending)
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Details Modal */}
            {showDetailsModal && (
                <div style={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={styles.modalTitle}>
                                    {activeTab === 'debtors' ? '🧾 Debtor Details' : '🏪 Creditor Details'}
                                </h3>
                                <p style={styles.modalSubtitle}>
                                    {modalData?.code} {modalData?.debtor_no && `| Debtor No: ${modalData.debtor_no}`}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                style={styles.modalCloseBtn}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                            >
                                ×
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            {modalLoading ? (
                                <div style={styles.modalLoading}>
                                    <div style={styles.loadingSpinner}>⏳</div>
                                    <p>Loading details...</p>
                                </div>
                            ) : modalData && (
                                <>
                                    {/* Profile Section */}
                                    <div style={styles.profileSection}>
                                        {modalData.profile_pic ? (
                                            <img
                                                src={getImageUrl(modalData.profile_pic)}
                                                alt="Profile"
                                                style={styles.profilePic}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.innerHTML += '<div style="width: 90px; height: 90px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; font-size: 40px; color: white;">👤</div>';
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '90px',
                                                height: '90px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '40px',
                                                color: 'white'
                                            }}>
                                                👤
                                            </div>
                                        )}
                                        <div style={styles.profileInfo}>
                                            <h4 style={styles.profileName}>{modalData.name || 'N/A'}</h4>
                                            <p style={styles.profileDetail}>📞 {modalData.telephone || 'No phone'}</p>
                                            <p style={styles.profileDetail}>📍 {modalData.address || 'No address'}</p>
                                            {modalData.debtor_no && (
                                                <p style={styles.profileDetail}>🔢 Debtor Number: <strong>{modalData.debtor_no}</strong></p>
                                            )}
                                            {activeTab === 'debtors' && modalData.credit_limit > 0 && (
                                                <p style={styles.profileDetail}>💳 Credit Limit: {formatCurrency(modalData.credit_limit)}</p>
                                            )}
                                            {activeTab === 'creditors' && modalData.advance_amount > 0 && (
                                                <p style={styles.profileDetail}>💰 Advance Amount: {formatCurrency(modalData.advance_amount)}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bills Section - Only shows actual sales */}
                                    <h4 style={styles.sectionTitle}>📋 Bills & Transactions</h4>
                                    <div style={styles.tableWrapper}>
                                        <table style={styles.detailsTable}>
                                            <thead>
                                                <tr style={styles.detailsTableHeader}>
                                                    <th style={styles.detailsTh}>Bill No</th>
                                                    <th style={styles.detailsTh}>Date</th>
                                                    <th style={styles.detailsTh}>Total</th>
                                                    <th style={styles.detailsTh}>Paid</th>
                                                    <th style={styles.detailsTh}>Remaining</th>
                                                    <th style={styles.detailsTh}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(modalData.bills || []).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" style={styles.emptyState}>
                                                            No bills found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (() => {
                                                        // Group bills by bill_no
                                                        const groupedBills = {};

                                                        (modalData.bills || []).forEach(bill => {
                                                            const billNo = bill.bill_no;
                                                            if (!groupedBills[billNo]) {
                                                                groupedBills[billNo] = {
                                                                    bill_no: billNo,
                                                                    created_at: bill.created_at,
                                                                    total_amount: 0,
                                                                    paid_amount: 0,  // Will be set once, not summed
                                                                    remaining: 0
                                                                };
                                                            }

                                                            // Sum total amounts for the bill
                                                            const totalAmount = bill.total_amount || bill.total || 0;
                                                            groupedBills[billNo].total_amount += totalAmount;

                                                            // DON'T sum paid_amount - use the paid_amount from the bill directly
                                                            // (should be the same for all entries of same bill_no)
                                                            if (groupedBills[billNo].paid_amount === 0) {
                                                                const paidAmount = bill.paid_amount || bill.given_amount || 0;
                                                                groupedBills[billNo].paid_amount = paidAmount;
                                                            }
                                                        });

                                                        // Calculate remaining for each grouped bill
                                                        Object.values(groupedBills).forEach(group => {
                                                            group.remaining = group.total_amount - group.paid_amount;
                                                        });

                                                        // Convert to array and sort
                                                        const groupedBillsArray = Object.values(groupedBills).sort((a, b) =>
                                                            new Date(b.created_at) - new Date(a.created_at)
                                                        );

                                                        return groupedBillsArray.map((group, groupIdx) => {
                                                            const isFullyPaid = group.remaining <= 0;

                                                            return (
                                                                <tr key={groupIdx} style={styles.detailsTableRow}>
                                                                    <td style={styles.detailsTd}>
                                                                        <strong>{group.bill_no}</strong>
                                                                    </td>
                                                                    <td style={styles.detailsTd}>
                                                                        {formatDate(group.created_at)}
                                                                    </td>
                                                                    <td style={styles.detailsTd}>
                                                                        <strong>{formatCurrency(group.total_amount)}</strong>
                                                                    </td>
                                                                    <td style={styles.detailsTd}>
                                                                        <strong style={{ color: '#059669' }}>
                                                                            {formatCurrency(group.paid_amount)}
                                                                        </strong>
                                                                    </td>
                                                                    <td style={styles.detailsTd}>
                                                                        <span style={{
                                                                            color: group.remaining > 0 ? '#dc2626' : '#10b981'
                                                                        }}>
                                                                            {formatCurrency(group.remaining)}
                                                                        </span>
                                                                    </td>
                                                                    <td style={styles.detailsTd}>
                                                                        <span style={{
                                                                            ...styles.statusBadge,
                                                                            ...(isFullyPaid ? styles.statusPaid : styles.statusPending)
                                                                        }}>
                                                                            {isFullyPaid ? 'Paid' : 'Pending'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()
                                                )}
                                            </tbody>
                                            {modalData.total_paid_amount > 0 && (
                                                <tfoot>
                                                    {(() => {
                                                        // Calculate proper totals from grouped bills
                                                        let groupedTotalAmount = 0;
                                                        let groupedPaidAmount = 0;

                                                        // Group bills first to get correct paid amount (not summed)
                                                        const tempGroupedBills = {};
                                                        (modalData.bills || []).forEach(bill => {
                                                            const billNo = bill.bill_no;
                                                            if (!tempGroupedBills[billNo]) {
                                                                tempGroupedBills[billNo] = {
                                                                    total_amount: 0,
                                                                    paid_amount: bill.paid_amount || bill.given_amount || 0
                                                                };
                                                            }
                                                            const totalAmount = bill.total_amount || bill.total || 0;
                                                            tempGroupedBills[billNo].total_amount += totalAmount;
                                                        });

                                                        // Calculate totals from grouped data
                                                        Object.values(tempGroupedBills).forEach(group => {
                                                            groupedTotalAmount += group.total_amount;
                                                            groupedPaidAmount += group.paid_amount;
                                                        });

                                                        const groupedRemaining = groupedTotalAmount - groupedPaidAmount;

                                                        return (
                                                            <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                                                                <td colSpan="2" style={{ ...styles.detailsTd, textAlign: 'right' }}>Summary (Grouped):</td>
                                                                <td style={styles.detailsTd}>{formatCurrency(groupedTotalAmount)}</td>
                                                                <td style={styles.detailsTd}>{formatCurrency(groupedPaidAmount)}</td>
                                                                <td style={styles.detailsTd}>{formatCurrency(groupedRemaining)}</td>
                                                                <td style={styles.detailsTd}></td>
                                                            </tr>
                                                        );
                                                    })()}
                                                </tfoot>
                                            )}
                                        </table>
                                    </div>

                                    {/* Payment History Section */}
                                    <h4 style={styles.sectionTitle}>📜 Payment History</h4>
                                    <div style={styles.tableWrapper}>
                                        <table style={styles.detailsTable}>
                                            <thead>
                                                <tr style={styles.detailsTableHeader}>
                                                    <th style={styles.detailsTh}>Bill No</th>
                                                    <th style={styles.detailsTh}>Total Paid</th>
                                                    <th style={styles.detailsTh}>Payment Methods</th>
                                                    <th style={styles.detailsTh}>Number of Payments</th>
                                                    <th style={styles.detailsTh}>Last Payment Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(modalData.payments || []).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" style={styles.emptyState}>
                                                            No payment records found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (() => {
                                                        // Group payments by bill_no
                                                        const groupedPayments = {};

                                                        (modalData.payments || []).forEach(payment => {
                                                            const billNo = payment.bill_no || 'No Bill No';
                                                            if (!groupedPayments[billNo]) {
                                                                groupedPayments[billNo] = {
                                                                    bill_no: billNo,
                                                                    total_amount: 0,
                                                                    payment_methods: new Set(),
                                                                    payment_count: 0,
                                                                    last_payment_date: null,
                                                                    method_icons: new Set()
                                                                };
                                                            }

                                                            groupedPayments[billNo].total_amount += payment.amount || 0;
                                                            groupedPayments[billNo].payment_methods.add(payment.method_display || payment.method);
                                                            groupedPayments[billNo].method_icons.add(getPaymentMethodStyle(payment.method).icon);
                                                            groupedPayments[billNo].payment_count++;

                                                            const paymentDate = payment.date;
                                                            if (!groupedPayments[billNo].last_payment_date ||
                                                                new Date(paymentDate) > new Date(groupedPayments[billNo].last_payment_date)) {
                                                                groupedPayments[billNo].last_payment_date = paymentDate;
                                                            }
                                                        });

                                                        // Convert to array and sort by last payment date
                                                        const groupedPaymentsArray = Object.values(groupedPayments)
                                                            .sort((a, b) => new Date(b.last_payment_date) - new Date(a.last_payment_date));

                                                        return groupedPaymentsArray.map((group, groupIdx) => {
                                                            const paymentMethods = Array.from(group.payment_methods).join(', ');
                                                            const methodIcons = Array.from(group.method_icons).join(' ');

                                                            return (
                                                                <tr key={groupIdx} style={styles.detailsTableRow}>
                                                                    <td style={styles.detailsTd}>
                                                                        <strong>{group.bill_no}</strong>
                                                                    </td>
                                                                    <td style={styles.detailsTd}>
                                                                        <strong style={{ color: '#059669' }}>
                                                                            {formatCurrency(group.total_amount)}
                                                                        </strong>
                                                                    </td>
                                                                    <td style={styles.detailsTd}>
                                                                        <span style={{ fontSize: '13px' }}>
                                                                            {methodIcons} {paymentMethods}
                                                                        </span>
                                                                    </td>
                                                                    <td style={styles.detailsTd}>
                                                                        {group.payment_count} payment{group.payment_count !== 1 ? 's' : ''}
                                                                    </td>
                                                                    <td style={styles.detailsTd}>
                                                                        {formatDate(group.last_payment_date)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    fullScreenContainer: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: '#f0f2f5',
        overflowY: 'auto',
        padding: '20px 30px',
        margin: 0,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box',
        zIndex: 999
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100%'
    },
    loadingSpinner: {
        fontSize: '48px',
        marginBottom: '16px',
        animation: 'spin 1s linear infinite'
    },
    loadingText: {
        fontSize: '16px',
        color: '#64748b'
    },
    header: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '24px 32px',
        borderRadius: '20px',
        color: 'white',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    },
    headerTitle: {
        fontSize: '28px',
        fontWeight: '700',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    headerIcon: {
        fontSize: '32px'
    },
    headerSubtitle: {
        fontSize: '14px',
        opacity: 0.9,
        marginTop: '8px'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
    },
    statCard: {
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer'
    },
    statLabel: {
        fontSize: '12px',
        color: '#64748b',
        marginBottom: '8px',
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: '0.5px'
    },
    statValue: {
        fontSize: '32px',
        fontWeight: '800',
        color: '#1e293b'
    },
    tabsContainer: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        background: 'white',
        padding: '8px',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    tabButton: {
        padding: '12px 28px',
        border: 'none',
        background: 'transparent',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        borderRadius: '12px',
        transition: 'all 0.2s',
        color: '#475569'
    },
    tabButtonActive: {
        background: '#667eea',
        color: 'white',
        boxShadow: '0 2px 4px rgba(102,126,234,0.3)'
    },
    searchBar: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        alignItems: 'center',
        flexWrap: 'wrap',
        background: 'white',
        padding: '16px',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    searchInput: {
        flex: 1,
        padding: '12px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.2s',
        minWidth: '200px',
        background: 'white'
    },
    select: {
        padding: '12px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        background: 'white',
        cursor: 'pointer',
        fontSize: '14px',
        outline: 'none'
    },
    refreshBtn: {
        padding: '12px 24px',
        background: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        transition: 'all 0.2s'
    },
    tableWrapper: {
        overflowX: 'auto',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        background: 'white'
    },
    table: {
        width: '100%',
        background: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        borderCollapse: 'collapse'
    },
    th: {
        padding: '16px 20px',
        textAlign: 'left',
        background: '#f8fafc',
        fontWeight: '600',
        color: '#475569',
        borderBottom: '2px solid #e2e8f0',
        fontSize: '14px'
    },
    td: {
        padding: '14px 20px',
        borderBottom: '1px solid #f1f5f9',
        fontSize: '14px',
        color: '#334155'
    },
    tableRow: {
        transition: 'background 0.2s'
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px',
        color: '#94a3b8',
        fontSize: '14px'
    },
    statusBadge: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '500'
    },
    statusPaid: {
        background: '#d1fae5',
        color: '#065f46'
    },
    statusPending: {
        background: '#fed7aa',
        color: '#9a3412'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000
    },
    modalContent: {
        background: 'white',
        borderRadius: '24px',
        width: '90%',
        maxWidth: '1200px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        animation: 'slideUp 0.3s ease'
    },
    modalHeader: {
        padding: '20px 28px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '24px 24px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalTitle: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700'
    },
    modalSubtitle: {
        margin: '4px 0 0 0',
        opacity: 0.9,
        fontSize: '13px'
    },
    modalCloseBtn: {
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        fontSize: '28px',
        cursor: 'pointer',
        color: 'white',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    },
    modalBody: {
        padding: '28px',
        overflowY: 'auto',
        flex: 1
    },
    modalLoading: {
        textAlign: 'center',
        padding: '60px',
        color: '#64748b'
    },
    profileSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '28px',
        paddingBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
        flexWrap: 'wrap'
    },
    profilePic: {
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '4px solid white',
        boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
    },
    profileInfo: {
        flex: 1
    },
    profileName: {
        margin: '0 0 6px 0',
        fontSize: '22px',
        fontWeight: '700',
        color: '#1e293b'
    },
    profileDetail: {
        margin: '4px 0',
        color: '#64748b',
        fontSize: '13px'
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '18px',
        marginTop: '24px',
        color: '#1e293b',
        paddingBottom: '8px',
        borderBottom: '2px solid #667eea',
        display: 'inline-block'
    },
    detailsTable: {
        width: '100%',
        fontSize: '13px',
        borderCollapse: 'collapse',
        marginBottom: '24px'
    },
    detailsTableHeader: {
        background: '#f1f5f9'
    },
    detailsTh: {
        padding: '12px 16px',
        textAlign: 'left',
        fontWeight: '600',
        color: '#475569',
        borderBottom: '1px solid #e2e8f0'
    },
    detailsTd: {
        padding: '12px 16px',
        borderBottom: '1px solid #e2e8f0',
        color: '#334155'
    },
    detailsTableRow: {
        transition: 'background 0.2s'
    },
    paymentMethodBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '500'
    }
};

// Add keyframes animation to the document head
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
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
`;
document.head.appendChild(styleSheet);

export default DebtorCreditorReport;