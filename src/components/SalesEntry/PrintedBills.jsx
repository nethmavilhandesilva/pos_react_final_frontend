// src/components/SalesEntry/PrintedBills.jsx
import React, { useState, useEffect, useMemo } from "react";
import api from "../../api";

const routes = {
    sales: "/sales",
    customers: "/customers",
    getAllSales: "/sales/all",
    updateGivenAmountApplied: "/sales/update-given-amount-applied"
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
        <tr>`;
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

    // Payment method display
    const paymentMethodDisplay = paymentMethod === 'cheque' && chequeDetails 
        ? `<div style="font-size:14px; margin-top:5px;">💳 Cheque: ${chequeDetails.bank_name} | No: ${chequeDetails.cheq_no} | Date: ${chequeDetails.cheq_date}</div>`
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

        <table style="width:100%; border-collapse:collapse; margin-top:25px; font-size:14px; text-align:center;">${summaryHtmlContent}</td>

        <div style="text-align:center; margin-top:25px; font-size:13px; border-top:2.5px solid #000; padding-top:10px;">
            <p style="margin:4px 0; font-weight:bold;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p>
            <p style="margin:4px 0;">නැවත භාර ගනු නොලැබේ</p>
        </div>
    </div>`;
};

// ==================== CHEQUE MODAL COMPONENT ====================
const ChequeModal = ({ isOpen, onClose, onConfirm, amount }) => {
    const [chequeDetails, setChequeDetails] = useState({
        cheq_date: '',
        cheq_no: '',
        bank_name: ''
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setChequeDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        if (!chequeDetails.cheq_date || !chequeDetails.cheq_no || !chequeDetails.bank_name) {
            alert("Please fill all cheque details");
            return;
        }
        onConfirm(chequeDetails);
        setChequeDetails({ cheq_date: '', cheq_no: '', bank_name: '' });
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '25px',
                width: '400px',
                maxWidth: '90%',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Cheque Details</h3>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Amount: Rs. {amount.toFixed(2)}</label>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Cheque Date *</label>
                    <input
                        type="date"
                        name="cheq_date"
                        value={chequeDetails.cheq_date}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px'
                        }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Cheque Number *</label>
                    <input
                        type="text"
                        name="cheq_no"
                        value={chequeDetails.cheq_no}
                        onChange={handleChange}
                        placeholder="Enter cheque number"
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px'
                        }}
                    />
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Bank Name *</label>
                    <input
                        type="text"
                        name="bank_name"
                        value={chequeDetails.bank_name}
                        onChange={handleChange}
                        placeholder="Enter bank name"
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{
                        padding: '8px 20px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} style={{
                        padding: '8px 20px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}>
                        Confirm Payment
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== SIMPLE, FULL-WIDTH STYLES ====================
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
    paymentMethodGroup: {
        display: 'flex',
        gap: '20px',
        marginBottom: '15px',
        alignItems: 'center'
    },
    radioLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer'
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
        paymentMethod: "cash",
        showChequeModal: false,
        pendingChequeAmount: 0
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
                isUpdatingCompletedBill: false,
                paymentMethod: "cash"
            }));
        } else {
            setState(prev => ({
                ...prev,
                selectedBill: bill,
                givenAmountInput: bill.givenAmount > 0 ? bill.givenAmount.toString() : "",
                isUpdatingCompletedBill: bill.givenAmountApplied === 'Y',
                paymentMethod: "cash"
            }));
        }
    };

    const handleGivenAmountChange = (e) => {
        setState(prev => ({ ...prev, givenAmountInput: e.target.value }));
    };

    const handlePaymentMethodChange = (method) => {
        setState(prev => ({ ...prev, paymentMethod: method }));
    };

    const processPayment = async (newPaymentAmount, chequeDetails = null) => {
        if (!state.selectedBill || state.isPrinting) return;
        
        setState(prev => ({ ...prev, isPrinting: true }));

        try {
            const totalGivenAmount = state.selectedBill.givenAmount + newPaymentAmount;
            const isFullySettled = totalGivenAmount >= state.selectedBill.totalAmount;
            const creditTransaction = isFullySettled ? 'N' : 'Y';

            const payload = {
                bill_no: state.selectedBill.billNo,
                given_amount: totalGivenAmount,
                given_amount_applied: 'Y',
                credit_transaction: creditTransaction
            };

            // Add cheque details if payment method is cheque
            if (state.paymentMethod === 'cheque' && chequeDetails) {
                payload.cheq_date = chequeDetails.cheq_date;
                payload.cheq_no = chequeDetails.cheq_no;
                payload.bank_name = chequeDetails.bank_name;
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
                    state.paymentMethod,
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

                alert(`✓ Added: Rs. ${formatDecimal(newPaymentAmount)}\nTotal Given: Rs. ${formatDecimal(totalGivenAmount)}\nRemaining: Rs. ${formatDecimal(Math.max(0, state.selectedBill.totalAmount - totalGivenAmount))}`);
                
                setState(prev => ({ 
                    ...prev, 
                    selectedBill: null, 
                    givenAmountInput: "", 
                    paymentMethod: "cash",
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

    const handleProcessPayment = async () => {
        const paymentAmount = parseFloat(state.givenAmountInput) || 0;
        if (paymentAmount === 0) {
            alert("Please enter an amount");
            return;
        }

        if (state.paymentMethod === 'cheque') {
            setState(prev => ({ ...prev, pendingChequeAmount: paymentAmount, showChequeModal: true }));
        } else {
            await processPayment(paymentAmount);
        }
    };

    const handleChequeConfirm = async (chequeDetails) => {
        await processPayment(state.pendingChequeAmount, chequeDetails);
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
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerTop}>
                        <h1 style={styles.title}>Printed Bills</h1>
                        <button style={styles.refreshBtn} onClick={fetchSalesData}>
                            🔄 Refresh
                        </button>
                    </div>
                    <p style={styles.subtitle}>Manage payments and re-print bills</p>
                </div>

                {/* Three Column Full Width Layout */}
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

                    {/* CENTER: Bill Details - WIDER */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}>
                            <h2 style={styles.panelTitle}>
                                Bill Details
                                {state.selectedBill && (
                                    <button 
                                        style={styles.clearBtn}
                                        onClick={() => setState(prev => ({ ...prev, selectedBill: null, givenAmountInput: "", isUpdatingCompletedBill: false, paymentMethod: "cash" }))}
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
                                            {state.isUpdatingCompletedBill ? "💰 Add Additional Payment" : "💰 Enter Payment Amount"}
                                        </div>
                                        
                                        {/* Payment Method Selection */}
                                        {!state.isUpdatingCompletedBill && (
                                            <div style={styles.paymentMethodGroup}>
                                                <label style={styles.radioLabel}>
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="cash"
                                                        checked={state.paymentMethod === 'cash'}
                                                        onChange={() => handlePaymentMethodChange('cash')}
                                                    />
                                                    💵 Cash
                                                </label>
                                                <label style={styles.radioLabel}>
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="cheque"
                                                        checked={state.paymentMethod === 'cheque'}
                                                        onChange={() => handlePaymentMethodChange('cheque')}
                                                    />
                                                    💳 Cheque
                                                </label>
                                            </div>
                                        )}
                                        
                                        <input
                                            type="number"
                                            value={state.givenAmountInput}
                                            onChange={handleGivenAmountChange}
                                            placeholder="0.00"
                                            style={styles.paymentInput}
                                            disabled={state.isPrinting}
                                        />
                                        <div style={styles.remainingBox}>
                                            <span>
                                                {state.isUpdatingCompletedBill ? "New Total Given:" : "After Payment:"}
                                            </span>
                                            <span style={{ fontWeight: 'bold', color: '#15803d' }}>
                                                Rs. {formatDecimal((state.selectedBill.givenAmount + currentGiven))}
                                            </span>
                                        </div>
                                        
                                        {state.isUpdatingCompletedBill ? (
                                            <>
                                                <button 
                                                    onClick={handleProcessPayment} 
                                                    disabled={state.isPrinting || currentGiven === 0}
                                                    style={{ ...styles.printBtn, background: '#3b82f6', color: 'white', border: 'none', marginTop: '12px' }}
                                                >
                                                    ➕ Add Payment
                                                </button>
                                                <div style={styles.hint}>Adds to existing payment (Total will accumulate)</div>
                                            </>
                                        ) : (
                                            <button 
                                                onClick={handleProcessPayment} 
                                                disabled={state.isPrinting || currentGiven === 0}
                                                style={{ ...styles.printBtn, background: '#4CAF50', color: 'white', border: 'none', marginTop: '12px' }}
                                            >
                                                {state.paymentMethod === 'cheque' ? '💳 Pay with Cheque' : '💵 Pay with Cash'}
                                            </button>
                                        )}
                                    </div>

                                    <button 
                                        onClick={handlePrintWithoutUpdate} 
                                        disabled={state.isPrinting} 
                                        style={styles.printBtn}
                                    >
                                        🖨️ Re-print Bill
                                    </button>
                                </>
                            ) : (
                                <EmptyState message="Click on any bill from left or right panel to view details" />
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

                {/* Stats Cards - MOVED TO BOTTOM */}
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
        </div>
    );
}