import React, { useState } from 'react';
import bankService from "../../services/bankService";

const BankList = ({ banks, onBankDeleted, onRefresh }) => {
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState('');

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this bank account?')) {
            return;
        }

        setDeletingId(id);
        setError('');

        try {
            await bankService.deleteBank(id);
            if (onBankDeleted) {
                onBankDeleted(id);
            }
            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            setError('Failed to delete bank account. Please try again.');
            console.error('Delete error:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const getBankGradient = (bankName) => {
        const name = bankName.toLowerCase();
        if (name.includes('sbi')) return 'linear-gradient(135deg, #3b82f6, #1e3a8a)';
        if (name.includes('hdfc')) return 'linear-gradient(135deg, #ef4444, #991b1b)';
        if (name.includes('icici')) return 'linear-gradient(135deg, #8b5cf6, #5b21b6)';
        if (name.includes('axis')) return 'linear-gradient(135deg, #f97316, #c2410c)';
        if (name.includes('kotak')) return 'linear-gradient(135deg, #10b981, #065f46)';
        return 'linear-gradient(135deg, #4b5563, #1f2937)';
    };

    const getBankIcon = (bankName) => {
        const name = bankName.toLowerCase();
        if (name.includes('sbi')) return '🏦';
        if (name.includes('hdfc')) return '🏛️';
        if (name.includes('icici')) return '💜';
        if (name.includes('axis')) return '🟠';
        if (name.includes('kotak')) return '💚';
        return '💰';
    };

    const styles = {
        container: {
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden'
        },
        header: {
            background: 'linear-gradient(135deg, #1f2937, #374151)',
            padding: '20px 24px',
            borderBottom: '1px solid #374151'
        },
        headerContent: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
        },
        titleSection: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        titleIcon: {
            fontSize: '28px'
        },
        title: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'white',
            margin: 0
        },
        subtitle: {
            fontSize: '14px',
            color: '#9ca3af',
            marginTop: '4px'
        },
        statsBadge: {
            background: 'rgba(59,130,246,0.2)',
            padding: '8px 16px',
            borderRadius: '12px',
            color: '#60a5fa',
            fontSize: '14px',
            fontWeight: '600'
        },
        errorMessage: {
            margin: '16px',
            padding: '12px',
            background: 'linear-gradient(135deg, #fef2f2, #fce7f3)',
            borderLeft: '4px solid #ef4444',
            borderRadius: '8px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        emptyState: {
            textAlign: 'center',
            padding: '64px 32px',
            background: 'linear-gradient(135deg, #f9fafb, white)'
        },
        emptyIcon: {
            fontSize: '64px',
            marginBottom: '16px',
            opacity: 0.6
        },
        emptyTitle: {
            fontSize: '18px',
            color: '#6b7280',
            marginBottom: '8px'
        },
        emptySubtitle: {
            fontSize: '14px',
            color: '#9ca3af'
        },
        tableWrapper: {
            overflowX: 'auto',
            maxHeight: '600px',
            overflowY: 'auto'
        },
        table: {
            minWidth: '100%',
            borderCollapse: 'collapse'
        },
        thead: {
            background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
            position: 'sticky',
            top: 0,
            zIndex: 10
        },
        th: {
            padding: '16px 20px',
            textAlign: 'left',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#4b5563',
            borderBottom: '2px solid #e5e7eb'
        },
        thRight: {
            padding: '16px 20px',
            textAlign: 'right',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#4b5563',
            borderBottom: '2px solid #e5e7eb'
        },
        tr: {
            transition: 'all 0.2s',
            borderBottom: '1px solid #f3f4f6'
        },
        td: {
            padding: '16px 20px',
            whiteSpace: 'nowrap'
        },
        bankCell: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        bankIconCircle: {
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        bankName: {
            fontWeight: '600',
            color: '#111827',
            fontSize: '14px'
        },
        branchText: {
            fontSize: '14px',
            color: '#6b7280'
        },
        accountText: {
            fontSize: '13px',
            color: '#374151',
            fontFamily: 'monospace',
            background: '#f3f4f6',
            padding: '4px 8px',
            borderRadius: '6px',
            display: 'inline-block'
        },
        deleteButton: {
            background: 'none',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
        }
    };

    if (banks.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <div style={styles.headerContent}>
                        <div>
                            <div style={styles.titleSection}>
                                <span style={styles.titleIcon}>📋</span>
                                <h2 style={styles.title}>Saved Bank Accounts</h2>
                            </div>
                            <p style={styles.subtitle}>Manage your bank accounts</p>
                        </div>
                        <div style={styles.statsBadge}>
                            Total: 0 accounts
                        </div>
                    </div>
                </div>
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>🏦</div>
                    <p style={styles.emptyTitle}>No bank accounts added yet</p>
                    <p style={styles.emptySubtitle}>Add your first bank account using the form above</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <div>
                        <div style={styles.titleSection}>
                            <span style={styles.titleIcon}>📋</span>
                            <h2 style={styles.title}>Saved Bank Accounts</h2>
                        </div>
                        <p style={styles.subtitle}>Manage and track all your bank accounts</p>
                    </div>
                    <div style={styles.statsBadge}>
                        Total: {banks.length} account{banks.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={styles.errorMessage}>
                    <span>❌</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Table */}
            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead style={styles.thead}>
                        <tr>
                            <th style={styles.th}>Bank Name</th>
                            <th style={styles.th}>Branch</th>
                            <th style={styles.th}>Account Number</th>
                            <th style={styles.thRight}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {banks.map((bank, index) => (
                            <tr
                                key={bank.id}
                                style={{
                                    ...styles.tr,
                                    background: index % 2 === 0 ? 'white' : '#fafafa',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f3f4f6';
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafafa';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                }}
                            >
                                {/* Bank Name Cell */}
                                <td style={styles.td}>
                                    <div style={styles.bankCell}>
                                        <div style={{
                                            ...styles.bankIconCircle,
                                            background: getBankGradient(bank.bank_name)
                                        }}>
                                            {getBankIcon(bank.bank_name)}
                                        </div>
                                        <div>
                                            <div style={styles.bankName}>{bank.bank_name}</div>
                                        </div>
                                    </div>
                                </td>

                                {/* Branch Cell */}
                                <td style={styles.td}>
                                    <div style={styles.branchText}>{bank.branch}</div>
                                </td>

                                {/* Account Number Cell */}
                                <td style={styles.td}>
                                    <div style={styles.accountText}>
                                        {bank.account_no}
                                    </div>
                                </td>

                                {/* Actions Cell */}
                                <td style={{ ...styles.td, textAlign: 'right' }}>
                                    <button
                                        onClick={() => handleDelete(bank.id)}
                                        disabled={deletingId === bank.id}
                                        style={{
                                            ...styles.deleteButton,
                                            opacity: deletingId === bank.id ? 0.5 : 1,
                                            cursor: deletingId === bank.id ? 'not-allowed' : 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (deletingId !== bank.id) {
                                                e.currentTarget.style.background = '#fee2e2';
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'none';
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                    >
                                        {deletingId === bank.id ? (
                                            <>
                                                <div style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    border: '2px solid #ef4444',
                                                    borderTopColor: 'transparent',
                                                    borderRadius: '50%',
                                                    animation: 'spin 0.6s linear infinite'
                                                }} />
                                                <span>Deleting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>🗑️</span>
                                                <span>Delete</span>
                                            </>
                                        )}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add spin animation */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default BankList;