import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import Select from "react-select";
import Layout from "../Layout/Layout";
import '../../App.css';
import api from "../../api";


const routes = {
    markPrinted: "/sales/mark-printed",
    getLoanAmount: "/get-loan-amount",
    markAllProcessed: "/sales/mark-all-processed",
    givenAmount: "/sales",
    sales: "/sales",
    customers: "/customers",
    items: "/items",
    suppliers: "/suppliers",
    getCustomerGivenAmount: "/sales/customer/given-amount",
    getSalesByBillNo: "/sales/by-bill",
};

// Hard cap on every API request so a hung network call can never leave the page
// stuck waiting forever during an all-day session.
const API_TIMEOUT_MS = 15000;
// POS submit must fail/recover fast — operators press Enter hundreds of times a day.
const SUBMIT_TIMEOUT_MS = 8000;
// How long the submit lock may stay held before we treat it as stuck and unlock.
const SUBMIT_LOCK_MAX_MS = 9000;
// Print dialog / popup can hang; unlock UI well before an all-day session feels frozen.
const PRINT_LOCK_MAX_MS = 30000;
// Cheap sales-list fingerprint — avoids JSON.stringify of the full array every poll.
const buildSalesSignature = (sales) => {
    if (!Array.isArray(sales) || sales.length === 0) return '0';
    let sig = String(sales.length);
    for (let i = 0; i < sales.length; i++) {
        const s = sales[i];
        if (!s) continue;
        sig += `|${s.id ?? ''}:${s.weight ?? ''}:${s.price_per_kg ?? ''}:${s.packs ?? ''}:${s.bill_printed ?? ''}:${s.given_amount ?? ''}:${s.updated_at ?? s.timestamp ?? ''}`;
    }
    return sig;
};

// Hoisted formatter: creating Intl.NumberFormat per call is expensive inside render loops.
const decimalFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
const formatDecimal = (value) => decimalFormatter.format(Number(value || 0));

// Stable function identity whose body always sees the latest render's values.
// Prevents global listeners / memoized children from being torn down on every render.
const useStableCallback = (fn) => {
    const fnRef = useRef(fn);
    fnRef.current = fn;
    return useCallback((...args) => fnRef.current(...args), []);
};

// --- Sub-Components ---

const BreakdownDisplay = React.memo(({ sale, formatDecimal }) => {
    if (!sale?.breakdown_history) return null;
    let history = [];
    try {
        history = typeof sale.breakdown_history === 'string' ? JSON.parse(sale.breakdown_history) : sale.breakdown_history;
    } catch (e) { return null; }
    if (!Array.isArray(history) || history.length < 2) return null;

    return (
        <div className="mt-4 p-3 bg-white rounded-lg border-2 border-blue-500 shadow-sm" style={{ width: '450px', margin: '10px auto' }}>
            <div style={{ maxHeight: '150px' }}>
                <table className="w-full text-xs text-black" style={{ marginTop: "-6px" }}>
                    <thead>
                        <tr className="text-gray-500 border-b">
                            <th className="text-left py-1">(වේලාව)</th>
                            <th className="text-right py-1">(බර)</th>
                            <th className="text-right py-1">(මලු)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((entry, i) => (
                            <tr key={i} className="border-b border-gray-50 last:border-0">
                                <td className="py-1 text-white">{entry.time}</td>
                                <td className="py-1 text-right font-bold text-white">{formatDecimal(entry.weight)} kg</td>
                                <td className="py-1 text-right font-bold text-white">{entry.packs}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-2 pt-1 border-t-2 border-blue-200 text-right font-black text-sm text-black">
                Total: {formatDecimal(sale.weight)}kg / {sale.packs}p
            </div>
        </div>
    );
});

// --- Admin Modal Component (Popup Window) ---
const AdminDataTableModal = React.memo(({ isOpen, onClose, title, sales, type, formatDecimal, billSize = '3inch' }) => {
    if (!isOpen || !sales || sales.length === 0) return null;

    const isFarmer = type === 'farmer';
    const is4Inch = billSize === '4inch';

    // Exact width for thermal preview
    const receiptMaxWidth = is4Inch ? '4in' : '350px';

    // --- REPLICATED FORMATTING LOGIC ---
    // Farmer uses maxDecimals = 3, Customer uses fixed 2 decimals
    const formatNumber = (value) => {
        if (typeof value !== 'number' && typeof value !== 'string') return '0';
        const number = parseFloat(value);
        if (isNaN(number)) return '0';

        if (Number.isInteger(number)) {
            return number.toLocaleString('en-US');
        } else {
            const maxD = isFarmer ? 3 : 2;
            const parts = number.toFixed(maxD).split('.');
            // For farmers, we strip trailing zeros as per your getBillContent logic
            const processedDecimals = isFarmer ? parts[1].replace(/0+$/, '') : parts[1];
            const wholePart = parseInt(parts[0]).toLocaleString('en-US');
            return processedDecimals ? `${wholePart}.${processedDecimals}` : wholePart;
        }
    };

    // --- DATA PROCESSING ---
    const date = isFarmer ? new Date().toLocaleDateString('si-LK') : new Date().toLocaleDateString();
    const time = isFarmer ? new Date().toLocaleTimeString('si-LK') : new Date().toLocaleTimeString();
    const mobile = '0777672838/071437115';
    const displayName = isFarmer ? sales[0].supplier_code : (sales[0].customer_code || "").toUpperCase();
    const billNo = isFarmer ? (sales[0].supplier_bill_no || 'N/A') : (sales[0].bill_no || 'N/A');

    // Consolidated Summary Logic
    const consolidatedSummary = {};
    sales.forEach(s => {
        const itemName = s.item_name || 'Unknown';
        if (!consolidatedSummary[itemName]) consolidatedSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
        consolidatedSummary[itemName].totalWeight += parseFloat(isFarmer ? s.SupplierWeight : s.weight) || 0;
        consolidatedSummary[itemName].totalPacks += parseInt(s.packs) || 0;
    });

    const totalPacksSum = Object.values(consolidatedSummary).reduce((sum, item) => sum + item.totalPacks, 0);

    // Value Calculation logic differs for Farmer vs Customer
    const totalSalesSum = sales.reduce((sum, s) => {
        const w = parseFloat(isFarmer ? s.SupplierWeight : s.weight) || 0;
        const p = parseFloat(isFarmer ? s.SupplierPricePerKg : s.price_per_kg) || 0;
        const total = isFarmer ? (parseFloat(s.SupplierTotal) || (w * p)) : (w * p);
        return sum + total;
    }, 0);

    const totalPackCost = isFarmer ? 0 : sales.reduce((sum, s) => sum + ((parseFloat(s.CustomerPackCost) || 0) * (parseFloat(s.packs) || 0)), 0);
    const finalGrandTotal = totalSalesSum + totalPackCost;

    const givenAmount = !isFarmer ? (sales.find(s => parseFloat(s.given_amount) > 0)?.given_amount || 0) : 0;
    const remaining = givenAmount > 0 ? Math.abs(givenAmount - finalGrandTotal) : 0;

    // Style Constants
    const fontSizeBody = '25px';
    const fontSizeHeader = '23px';
    const fontSizeTotal = '28px';

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '95%', maxWidth: '450px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>

                <div style={{ padding: '12px', background: '#111827', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>බිල්පත් පෙරදසුන ({isFarmer ? 'ගොවියා' : 'පාරිභෝගිකයා'})</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>✕</button>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', backgroundColor: '#e5e7eb', flexGrow: 1 }}>
                    <div style={{ width: receiptMaxWidth, margin: '0 auto', padding: '10px', backgroundColor: 'white', fontFamily: "'Courier New', monospace", color: '#000', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>

                        {/* HEADER SECTION */}
                        <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                            <div style={{ fontSize: '24px' }}>මංජු සහ සහෝදරයෝ</div>
                            {!isFarmer && <div style={{ fontSize: '20px', marginBottom: '5px' }}>colombage lanka (Pvt) Ltd</div>}

                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', margin: '12px 0' }}>
                                <span style={{ border: '2.5px solid #000', padding: '5px 12px', fontSize: '22px' }}>N66</span>
                                {isFarmer ? (
                                    <div style={{ fontSize: '18px' }}>ගොවියා: <span style={{ border: '2.5px solid #000', padding: '5px 10px', fontSize: '22px' }}>{displayName}</span></div>
                                ) : (
                                    <span style={{ border: '2.5px solid #000', padding: '5px 12px', fontSize: '22px' }}>{displayName}</span>
                                )}
                            </div>

                            <div style={{ fontSize: '16px' }}>{isFarmer ? 'එළවළු තොග වෙළෙන්දෝ බණ්ඩාරවෙල' : 'එළවළු,පළතුරු තොග වෙළෙන්දෝ'}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '6px', padding: '0 5px' }}>
                                <span>බණ්ඩාරවෙල</span>
                                <span>{time}</span>
                            </div>
                        </div>

                        <div style={{ fontSize: '19px', marginTop: '10px', padding: '0 5px' }}>
                            <div style={{ fontWeight: 'bold' }}>දුර: {mobile}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                                <span>බිල් අංකය: {billNo}</span>
                                <span>දිනය: {date}</span>
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '2.5px solid #000', margin: '10px 0' }} />

                        {/* ITEMS TABLE */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <colgroup>
                                <col style={{ width: '32%' }} /><col style={{ width: '21%' }} /><col style={{ width: '21%' }} /><col style={{ width: '26%' }} />
                            </colgroup>
                            <thead>
                                <tr style={{ borderBottom: '2.5px solid #000', fontWeight: 'bold' }}>
                                    <th style={{ textAlign: 'left', paddingBottom: '8px', fontSize: fontSizeHeader }}>වර්ගය<br />මලු</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '8px', fontSize: fontSizeHeader, position: 'relative', left: '-50px', top: '24px' }}>කිලෝ</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '8px', fontSize: fontSizeHeader, position: 'relative', left: '-45px', top: '24px' }}>මිල</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '8px', fontSize: fontSizeHeader }}>{isFarmer ? 'කේතය' : 'අයිතිය'}<br />අගය</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((s, i) => {
                                    const w = parseFloat(isFarmer ? s.SupplierWeight : s.weight) || 0;
                                    const p = parseFloat(isFarmer ? s.SupplierPricePerKg : s.price_per_kg) || 0;
                                    const itemTotal = isFarmer ? (parseFloat(s.SupplierTotal) || (w * p)) : (w * p);
                                    const code = isFarmer ? s.customer_code?.toUpperCase() : s.supplier_code;

                                    return (
                                        <tr key={i} style={{ fontSize: fontSizeBody, fontWeight: 'bold', verticalAlign: 'bottom' }}>
                                            <td style={{ textAlign: 'left', padding: '10px 0', whiteSpace: 'nowrap' }}>
                                                {s.item_name}<br />{formatNumber(parseInt(s.packs))}
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '10px 2px', position: 'relative', left: '-70px' }}>
                                                {formatNumber(w)}
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '10px 2px', position: 'relative', left: '-65px' }}>
                                                {formatNumber(p)}
                                            </td>
                                            <td style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <div style={{ fontSize: '25px', whiteSpace: 'nowrap' }}>{code}</div>
                                                <div style={{ fontWeight: '900', whiteSpace: 'nowrap' }}>{formatNumber(itemTotal)}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2.5px solid #000', fontWeight: 'bold' }}>
                                    <td style={{ paddingTop: '12px', fontSize: fontSizeTotal }}>{formatNumber(totalPacksSum)}</td>
                                    <td colSpan="3" style={{ paddingTop: '12px', fontSize: fontSizeTotal }}>
                                        <div style={{ textAlign: 'right', float: 'right', whiteSpace: 'nowrap' }}>{formatNumber(totalSalesSum)}</div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* TOTALS SECTION */}
                        <table style={{ width: '100%', marginTop: '20px', fontWeight: 'bold', fontSize: '22px', padding: '0 5px' }}>
                            {!isFarmer && (
                                <tr>
                                    <td>මලු:</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(totalPackCost)}</td>
                                </tr>
                            )}
                            <tr>
                                <td style={{ fontSize: isFarmer ? '15px' : '20px', paddingTop: '8px', whiteSpace: 'nowrap', position: isFarmer ? 'relative' : 'static', left: isFarmer ? '-15px' : '0' }}>
                                    {isFarmer ? 'මෙම බිලට ගෙවන්න:' : 'එකතුව:'}
                                </td>
                                <td style={{ textAlign: 'right', paddingTop: '8px' }}>
                                    <span style={{ borderBottom: '5px double #000', borderTop: '2px solid #000', fontSize: fontSizeTotal, padding: '5px 10px', paddingLeft: isFarmer ? '25px' : '10px' }}>
                                        {formatNumber(isFarmer ? totalSalesSum : finalGrandTotal)}
                                    </span>
                                </td>
                            </tr>
                            {!isFarmer && givenAmount > 0 && (
                                <>
                                    <tr>
                                        <td style={{ fontSize: '18px', paddingTop: '18px' }}>දුන් මුදල:</td>
                                        <td style={{ textAlign: 'right', fontSize: '20px', paddingTop: '18px', fontWeight: 'bold' }}>{formatNumber(parseFloat(givenAmount))}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontSize: '22px' }}>ඉතිරිය:</td>
                                        <td style={{ textAlign: 'right', fontSize: '26px' }}>{formatNumber(remaining)}</td>
                                    </tr>
                                </>
                            )}
                        </table>

                        {/* SUMMARY GRID */}
                        <div style={{ marginTop: '25px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'center' }}>
                                <tbody>
                                    {Object.entries(consolidatedSummary).reduce((rows, key, index) => {
                                        if (index % 2 === 0) rows.push([key]);
                                        else rows[rows.length - 1].push(key);
                                        return rows;
                                    }, []).map((row, i) => (
                                        <tr key={i}>
                                            {row.map(([name, data]) => (
                                                <td key={name} style={{ padding: '6px', width: '50%', fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '14px' }}>
                                                    {name}:{formatNumber(data.totalWeight)}/{formatNumber(data.totalPacks)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* FOOTER */}
                        <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '13px', borderTop: '2.5px solid #000', paddingTop: '10px' }}>
                            <p style={{ margin: '4px 0', fontWeight: 'bold' }}>භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p>
                            <p style={{ margin: '4px 0' }}>නැවත භාර ගනු නොලැබේ</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
const ImagePreviewModal = React.memo(({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const baseUrl = "https://goviraju.lk/sms_new_backend_50500/application/public/storage/";

    const formatUrl = (path) => {
        if (!path) return null;
        return path.startsWith('http') ? path : `${baseUrl}${path}`;
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: '#1f2937',
                    borderRadius: '20px',
                    width: '95%',
                    maxWidth: '1000px',
                    maxHeight: '95vh',
                    padding: '25px',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                    border: '1px solid #4b5563',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Area */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #374151', paddingBottom: '15px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                        {data.title} -({data.type === 'customer' ? 'ගනුදෙනුකරු' : 'සැපයුම්කරු'})
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ background: '#374151', border: 'none', color: 'white', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Larger Images Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: '20px', overflowY: 'auto', padding: '5px' }}>
                    {/* Profile Picture */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>ප්‍රධාන රූපය</span>
                        <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #3b82f6', backgroundColor: '#111827', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                            {data.profile ? (
                                <img src={data.profile} style={{ width: '100%', height: 'auto', display: 'block' }} alt="Profile" />
                            ) : (
                                <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>ඡායාරූපයක් නොමැත</div>
                            )}
                        </div>
                    </div>

                    {/* NIC Front */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>NIC ඉදිරිපස</span>
                        <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #4b5563', backgroundColor: '#111827', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                            {data.nic_front ? (
                                <img src={formatUrl(data.nic_front)} style={{ width: '100%', height: 'auto', maxHeight: '500px', display: 'block', objectFit: 'contain' }} alt="NIC Front" />
                            ) : (
                                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>ඡායාරූපයක් නොමැත</div>
                            )}
                        </div>
                    </div>

                    {/* NIC Back */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>NIC පසුපස</span>
                        <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #4b5563', backgroundColor: '#111827', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                            {data.nic_back ? (
                                <img src={formatUrl(data.nic_back)} style={{ width: '100%', height: 'auto', maxHeight: '500px', display: 'block', objectFit: 'contain' }} alt="NIC Back" />
                            ) : (
                                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>ඡායාරූපයක් නොමැත</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Area */}
                <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #374151', paddingTop: '15px' }}>
                    <button
                        onClick={onClose}
                        style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
});
const CustomerList = React.memo(({ type, searchQuery, onSearchChange, selectedPrintedCustomer, selectedUnprintedCustomer, handleCustomerClick, allSales, isCashFilterActive, toggleCashFilter }) => {
    const filteredPrintedGroups = useMemo(() => {
        if (type !== "printed") return [];

        const groups = new Map();
        allSales.forEach((sale) => {
            if (sale.bill_printed !== 'Y' || !sale.bill_no) return;

            if (isCashFilterActive) {
                if (sale.credit_transaction !== 'Y') return;
            } else if (sale.credit_transaction !== 'N') {
                return;
            }

            const groupKey = `${sale.customer_code}-${sale.bill_no}`;
            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    customerCode: sale.customer_code,
                    billNo: sale.bill_no,
                    displayText: sale.customer_code,
                    hasGivenAmountApplied: false,
                    totalAmount: 0,
                    billSales: []
                });
            }

            const group = groups.get(groupKey);
            group.billSales.push(sale);
            group.totalAmount += parseFloat(sale.total) || 0;
            if (sale.given_amount_applied && sale.given_amount_applied.trim() !== '') {
                group.hasGivenAmountApplied = true;
            }
        });

        let groupsArray = Array.from(groups.values());
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            groupsArray = groupsArray.filter(g =>
                g.customerCode.toLowerCase().startsWith(lowerQuery) ||
                String(g.billNo || '').toLowerCase().startsWith(lowerQuery) ||
                g.displayText.toLowerCase().startsWith(lowerQuery)
            );
        }

        return groupsArray.sort((a, b) => (parseInt(b.billNo, 10) || 0) - (parseInt(a.billNo, 10) || 0));
    }, [allSales, type, isCashFilterActive, searchQuery]);

 const filteredUnprintedCustomers = useMemo(() => {
    if (type !== "unprinted") return [];

    const customerMap = new Map();
    allSales.forEach((sale) => {
        const status = String(sale.bill_printed ?? '').trim().toUpperCase();
        if (!(status === 'N' || status === '' || status === 'NULL' || status === 'UNDEFINED')) return;

        const customerCode = sale.customer_code;
        const latestTimestamp = sale.timestamp || sale.created_at || sale.date || sale.id;
        const existing = customerMap.get(customerCode);

        if (!existing || new Date(latestTimestamp) > new Date(existing.latestTimestamp)) {
            customerMap.set(customerCode, {
                customerCode,
                latestTimestamp,
                displayText: customerCode,
                billSales: []
            });
        }
    });

    allSales.forEach((sale) => {
        const status = String(sale.bill_printed ?? '').trim().toUpperCase();
        if (!(status === 'N' || status === '' || status === 'NULL' || status === 'UNDEFINED')) return;
        const existing = customerMap.get(sale.customer_code);
        if (existing) {
            existing.billSales.push(sale);
        }
    });

    let customersArray = Array.from(customerMap.values());
    if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        customersArray = customersArray.filter(c => c.customerCode.toLowerCase().startsWith(lower));
    }

    // CHANGE THIS LINE - Sort alphabetically A to Z
    return customersArray.sort((a, b) => a.customerCode.localeCompare(b.customerCode));
}, [allSales, type, searchQuery]);

    const displayItems = type === "printed" ? filteredPrintedGroups : filteredUnprintedCustomers;
    const isSelected = (item) => type === "printed" ? selectedPrintedCustomer === `${item.customerCode}-${item.billNo}` : selectedUnprintedCustomer === item.customerCode;

    return (
        <div className="w-full shadow-xl rounded-xl overflow-y-auto border border-black" style={{ backgroundColor: "#1ec139ff", maxHeight: "80.5vh", overflowY: "auto" }}>
            <div style={{ backgroundColor: "#006400" }} className="p-1 rounded-t-xl">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <h2 className="font-bold text-white whitespace-nowrap" style={{ fontSize: '14px' }}>
                        {type === "printed" ? "මුද්‍රණය කළ" : "මුද්‍රණය නොකළ"}
                    </h2>

                    {/* Only show the checkbox for the "printed" column */}
                    {type === "printed" && (
                        <div
                            onClick={() => toggleCashFilter()}
                            className="cursor-pointer transition-all border border-white rounded"
                            style={{
                                width: '18px',
                                height: '18px',
                                backgroundColor: isCashFilterActive ? '#2563eb' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginLeft: '90px',
                                marginTop: '-22px',
                            }}
                        >
                            {isCashFilterActive && <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                        </div>
                    )}
                </div>

                <input
                    type="text"
                    placeholder={`සෙවීම ${type === "printed" ? "බිල්පත් අංකය/කේතය..." : "ගනුදෙනු කේතය..."}`}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
                    className="px-4 py-0.5 border rounded-xl focus:ring-2 focus:ring-blue-300 uppercase block mx-auto"
                    style={{ width: '169px' }}
                />
            </div>
            <div className="py-1">
                {displayItems.length === 0 ? (<p className="text-gray-700 p-2 text-center text-xs">වාර්තා නොමැත.</p>) : (
                    <ul className="flex flex-col px-1">
                        {displayItems.map((item) => {
                            let customerCode, displayText, totalAmount, billSales;
                            let shouldShowRed = false; // ADD THIS LINE

                            if (type === "printed") {
                                customerCode = item.customerCode;
                                displayText = `${item.customerCode}-${item.billNo}`;
                                billSales = item.billSales;
                                totalAmount = item.totalAmount;
                                shouldShowRed = !item.hasGivenAmountApplied;
                            } else {
                                customerCode = item.customerCode;
                                displayText = item.customerCode;
                                billSales = item.billSales;
                                totalAmount = billSales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0);
                            }
                            const isItemSelected = isSelected(item);
                            const buttonText = displayText.replace(/\n/g, ' ');

                            return (
                                <li key={type === "printed" ? `${item.customerCode}-${item.billNo}` : item.customerCode} className="flex">
                                    <button
                                        onClick={() => handleCustomerClick(type, customerCode, item.billNo || null, billSales)}
                                        className={`py-1 mb-2 rounded-xl border ${isItemSelected ? "border-blue-600" : "bg-gray-50 hover:bg-gray-100 border-gray-200"}`}
                                        style={isItemSelected ? { backgroundColor: '#93C5FD', paddingLeft: '05px', width: '280px', textAlign: 'left', fontSize: '12px' } : { paddingLeft: '1px', width: '280px', textAlign: 'left', fontSize: '12px' }}
                                    >
                                        <span
                                            style={{
                                                display: 'block',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                textAlign: 'inherit',
                                                width: '100%',
                                                // ADD THESE STYLES - Apply red color for printed bills without given_amount_applied
                                                color: shouldShowRed ? '#dc2626' : (isItemSelected ? 'black' : '#374151'),
                                                fontWeight: shouldShowRed ? 'bold' : 'normal'
                                            }}
                                            className={`font-semibold ${isItemSelected ? 'text-black' : 'text-gray-700'}`}
                                            title={buttonText}
                                        >
                                            {buttonText}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
});

const ItemSummary = React.memo(({ sales }) => {

    const formatWeight = (value) => {
        if (!value) return "0";
        const num = parseFloat(value);
        return num % 1 === 0 ? num.toString() : num.toFixed(1);
    };

    const formatPacks = (value) => {
        if (!value) return "0";
        return parseInt(value).toString();
    };

    const summary = useMemo(() => {
        const result = {};
        sales.forEach(sale => {
            const itemName = sale.item_name || 'Unknown';
            if (!result[itemName]) result[itemName] = { totalWeight: 0, totalPacks: 0 };
            result[itemName].totalWeight += parseFloat(sale.weight) || 0;
            result[itemName].totalPacks += parseInt(sale.packs) || 0;
        });
        return result;
    }, [sales]);

    if (Object.keys(summary).length === 0) return null;

    const items = Object.entries(summary);

    const rows = [];
    for (let i = 0; i < items.length; i += 3) {
        rows.push(items.slice(i, i + 3));
    }

    return (
        <div style={{
            width: '100%',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontFamily: "'Segoe UI', Tahoma",
            marginTop: '10px'
        }}>
            <div style={{
                textAlign: 'center',
                marginBottom: '10px'
            }}>
                <span style={{ fontSize: '18px', fontWeight: '800' }}>Item Summary</span>
            </div>

            {rows.map((row, rowIndex) => (
                <div
                    key={rowIndex}
                    style={{
                        display: 'flex',
                        gap: '10px',
                        marginBottom: '5px',
                        backgroundColor: '#ffffff'
                    }}
                >
                    {row.map(([itemName, data]) => (
                        <div key={itemName} style={{ flex: 1 }}>

                            {/* Compact format */}
                            <span style={{
                                fontSize: '16px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block'
                            }}>
                                {itemName}: {formatWeight(data.totalWeight)}kg/{formatPacks(data.totalPacks)}p
                            </span>

                        </div>
                    ))}

                    {row.length < 3 &&
                        Array.from({ length: 3 - row.length }).map((_, idx) => (
                            <div key={idx} style={{ flex: 1 }} />
                        ))
                    }
                </div>
            ))}
        </div>
    );
});


const SalesSummaryFooter = React.memo(({ sales, formatDecimal }) => {
    const totals = useMemo(() => {
        return sales.reduce((acc, s) => {
            const weight = parseFloat(s.weight) || 0;
            const price = parseFloat(s.price_per_kg) || 0;
            const packs = parseFloat(s.packs) || 0;
            const packCost = parseFloat(s.CustomerPackCost) || 0;
            const packLabour = parseFloat(s.CustomerPackLabour) || 0;
            acc.billTotal += (weight * price);
            acc.totalBagPrice += (packs * packCost);
            acc.totalLabour += (packs * packLabour);
            return acc;
        }, { billTotal: 0, totalBagPrice: 0, totalLabour: 0 });
    }, [sales]);

    const finalPayable = totals.billTotal + totals.totalBagPrice;

    return (
        <div className="flex flex-row flex-nowrap items-center justify-between w-full p-2 mt-2 rounded-xl border-2 border-blue-500 bg-gray-900 text-white font-bold shadow-lg overflow-hidden">
            <div className="flex items-center gap-4 px-3 border-r border-gray-700 flex-1 justify-center">
                <span className="text-gray-400 uppercase text-[10px] whitespace-nowrap">එකතුව:</span>
                <span className="text-white text-sm whitespace-nowrap" style={{ marginLeft: '6px' }}>
                    {formatDecimal(totals.billTotal)}
                </span>

            </div>
            <div className="flex items-center gap-2 px-3 border-r border-gray-700 flex-1 justify-center" style={{ marginLeft: '20px', transform: 'translateY(-24px)' }}>
                <span className="text-gray-400 uppercase text-[10px] whitespace-nowrap" style={{ marginLeft: '140px' }}>බෑග් මිල:</span>
                <span className="text-white text-sm whitespace-nowrap" style={{ marginLeft: '6px' }}>{formatDecimal(totals.totalBagPrice)}</span>
            </div>
            <div className="flex flex-row items-center whitespace-nowrap px-4 border-r border-gray-700 h-full ml-auto" style={{ transform: 'translateY(-48px)' }}>
                <span className="text-gray-400 uppercase text-[10px] mr-2" style={{ marginLeft: '310px' }}>කාම්කරු:</span>
                <span className="font-bold text-sm" style={{ marginLeft: '6px' }}>0</span>
            </div>
            <div className="flex flex-row items-center whitespace-nowrap px-4 border-r border-gray-700 h-full ml-auto" style={{ transform: 'translateY(-72px)' }}>
                <span className="text-gray-400 uppercase text-[10px] mr-2" style={{ marginLeft: '480px' }}>ගෙවිය:</span>
                <span className="font-bold text-sm text-yellow-400" style={{ marginLeft: '6px' }}>{formatDecimal(finalPayable)}</span>
            </div>
        </div>
    );
});

// --- Main Export Component ---
const initialFormData = { customer_code: "", customer_name: "", supplier_code: "", code: "", item_code: "", item_name: "", weight: "", price_per_kg: "", pack_due: "", total: "", packs: "", given_amount: "", pack_cost: "", telephone_no: "", };
const fieldOrder = ["telephone_no", "customer_code_input", "customer_code_select", "supplier_code", "item_code_select", "weight", "price_per_kg_grid_item", "packs", "total"];
const skipMap = { telephone_no: "customer_code_input", customer_code_input: "supplier_code", customer_code_select: "supplier_code", given_amount: "supplier_code", supplier_code: "item_code_select", item_code_select: "weight", price_per_kg: "packs", price_per_kg_grid_item: "packs" };

export default function SalesEntry() {
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);
    const submitStartedAtRef = useRef(0);
    const lastSubmitSignatureRef = useRef('');
    const lastSubmitAtRef = useRef(0);
    const submitGenerationRef = useRef(0);
    const refreshInFlightRef = useRef(false);
    const pendingForceRefreshRef = useRef(false);
    const lastRefreshAtRef = useRef(0);
    const recentSubmittedSalesRef = useRef(new Map());
    const deletedSaleIdsRef = useRef(new Set());
    const refreshAbortRef = useRef(null);
    const initAbortRef = useRef(null);
    const loanAbortRef = useRef(null);
    const submitAbortRef = useRef(null);
    const printInFlightRef = useRef(false);
    const printStartedAtRef = useRef(0);
    const givenAmountInFlightRef = useRef(false);
    const customerClickGenerationRef = useRef(0);
    const loanCacheRef = useRef(new Map());
    const lastUserActivityAtRef = useRef(Date.now());
    const activeIntervalsRef = useRef(new Set());
    const activeTimeoutsRef = useRef(new Set());
    const referenceRefreshStartedAtRef = useRef(0);

    // Atomic submit lock: 1 Enter = 1 submit. Extra Enter presses are ignored.
    // If a previous request left the lock stuck, auto-recover after SUBMIT_LOCK_MAX_MS.
    const tryAcquireSubmitLock = useCallback(() => {
        const now = Date.now();
        if (isSubmittingRef.current) {
            if (now - submitStartedAtRef.current < SUBMIT_LOCK_MAX_MS) {
                return false;
            }
            // Stuck lock recovery — abort anything still hanging, then unlock.
            if (submitAbortRef.current) {
                try { submitAbortRef.current.abort(); } catch (_) { /* ignore */ }
                submitAbortRef.current = null;
            }
            isSubmittingRef.current = false;
        }
        isSubmittingRef.current = true;
        submitStartedAtRef.current = now;
        submitGenerationRef.current += 1;
        return true;
    }, []);

    const releaseSubmitLock = useCallback(() => {
        isSubmittingRef.current = false;
        submitStartedAtRef.current = 0;
    }, []);

    // Blocks late/stale focus() calls that yank the cursor back to supplier
    // after the operator has already moved on to the item select (Enter).
    const suppressSupplierFocusUntilRef = useRef(0);

    // Single stable refs container: keeps identity constant across renders so
    // effects/listeners depending on it never re-subscribe.
    const refs = useRef({
        telephone_no: { current: null }, customer_code_input: { current: null }, customer_code_select: { current: null }, given_amount: { current: null },
        supplier_code: { current: null }, item_code_select: { current: null }, item_name: { current: null },
        weight: { current: null }, price_per_kg: { current: null }, packs: { current: null }, total: { current: null },
        price_per_kg_grid_item: { current: null },
    }).current;

    const isFocusInItemEntryFields = useCallback(() => {
        const active = document.activeElement;
        if (!active || active === document.body) return false;

        if (
            active === refs.weight.current ||
            active === refs.price_per_kg_grid_item.current ||
            active === refs.price_per_kg.current
        ) {
            return true;
        }

        // Item react-select (or its inner input / menu)
        if (active.closest?.('.react-select-container')) return true;

        const select = refs.item_code_select.current;
        const itemInput =
            select?.inputRef ||
            select?.select?.inputRef ||
            select?.controlRef?.querySelector?.('input');
        return !!(itemInput && active === itemInput);
    }, []);

    const focusSupplierCode = useCallback(() => {
        if (Date.now() < suppressSupplierFocusUntilRef.current) return;
        // Never yank focus back if the operator already moved to item/weight/price.
        if (isFocusInItemEntryFields()) return;

        const el = refs.supplier_code.current;
        if (!el) return;
        el.focus();
        el.select?.();
    }, [isFocusInItemEntryFields]);

    const focusItemCodeSelect = useCallback(() => {
        // Block late post-submit supplier.focus() for long enough to cover slow API returns.
        suppressSupplierFocusUntilRef.current = Date.now() + 2500;
        const select = refs.item_code_select.current;
        if (!select) return;

        if (typeof select.focus === 'function') {
            select.focus();
        }

        // Keep the menu open so the operator can type the item code immediately.
        if (typeof select.setState === 'function') {
            select.setState({ menuIsOpen: true });
        } else if (typeof select.onMenuOpen === 'function') {
            select.onMenuOpen();
        }

        // Focus the real <input> inside react-select (version-safe).
        const inputEl =
            select.inputRef ||
            select.select?.inputRef ||
            select.controlRef?.querySelector?.('input') ||
            document.querySelector('.react-select-container input');
        if (inputEl && typeof inputEl.focus === 'function') {
            inputEl.focus();
        }
    }, []);

    const [state, setState] = useState({
        allSales: [], selectedPrintedCustomer: null, selectedUnprintedCustomer: null, editingSaleId: null,
        searchQueries: { printed: "", unprinted: "", farmerPrinted: "", farmerUnprinted: "" }, errors: {}, loanAmount: 0, isManualClear: false,
        isSubmitting: false, formData: initialFormData, packCost: 0, customerSearchInput: "", itemSearchInput: "",
        supplierSearchInput: "", currentBillNo: null, isLoading: false, customers: [], items: [], suppliers: [],
        isPrinting: false, billSize: '3inch', priceManuallyChanged: false,
        gridPricePerKg: "", selectedSaleForBreakdown: null, showSavePhoneButton: false,
        currentUser: null,
        isAdminModalOpen: false, modalTitle: "", modalData: [], modalType: "", isGivenAmountManuallyTouched: false, filterOnlyCash: false, isCashFilterActive: false, customerProfilePic: null, supplierProfilePic: null, customerNameDisplay: "", supplierNameDisplay: "", isImageModalOpen: false, selectedImageData: { profile: null, nic_front: null, nic_back: null, title: "" },
    });

    const setFormData = useCallback((updater) => {
        if (!isMountedRef.current) return;
        setState(prev => ({
            ...prev,
            formData: typeof updater === 'function' ? updater(prev.formData) : updater
        }));
    }, []);

    const updateState = useCallback((updates) => {
        if (!isMountedRef.current) return;
        setState(prev => {
            // Skip the re-render entirely when nothing actually changed.
            // Many effects call updateState on every keystroke with identical values.
            let changed = false;
            for (const key in updates) {
                if (!Object.is(prev[key], updates[key])) { changed = true; break; }
            }
            return changed ? { ...prev, ...updates } : prev;
        });
    }, []);

    const setManagedTimeout = useCallback((fn, delay) => {
        const id = window.setTimeout(() => {
            activeTimeoutsRef.current.delete(id);
            fn();
        }, delay);
        activeTimeoutsRef.current.add(id);
        return id;
    }, []);

    const setManagedInterval = useCallback((fn, delay) => {
        const id = window.setInterval(fn, delay);
        activeIntervalsRef.current.add(id);
        return id;
    }, []);

    const clearManagedInterval = useCallback((id) => {
        if (!id) return;
        window.clearInterval(id);
        activeIntervalsRef.current.delete(id);
    }, []);

    const { allSales, customerSearchInput, selectedPrintedCustomer, selectedUnprintedCustomer, editingSaleId,
        searchQueries, errors, loanAmount, isManualClear, formData, packCost, isLoading, customers,
        items, suppliers, isPrinting, billSize, gridPricePerKg, selectedSaleForBreakdown, currentUser,
        isAdminModalOpen, modalTitle, modalData, modalType } = state;

    // --- Logic for Farmer Lists (Admin View) ---
    const printedFarmers = useMemo(() => {
        const groups = {};
        allSales.filter(s => s.supplier_bill_printed === 'Y').forEach(sale => {
            const code = sale.supplier_code;
            if (code && !groups[code]) groups[code] = { supplier_code: code };
        });
        return Object.values(groups);
    }, [allSales]);
    const unprintedFarmers = useMemo(() => {
        const groups = {};
        allSales.filter(s => s.supplier_bill_printed === 'N' || !s.supplier_bill_printed).forEach(sale => {
            const code = sale.supplier_code;
            if (code && !groups[code]) groups[code] = { supplier_code: code };
        });
        return Object.values(groups);
    }, [allSales]);

    const { newSales, printedSales, unprintedSales } = useMemo(() => ({
        newSales: allSales.filter((s) => {
            const status = String(s.bill_printed ?? '').trim().toUpperCase();
            return s.id && status !== 'Y' && status !== 'N';
        }),
        printedSales: allSales.filter((s) => String(s.bill_printed ?? '').trim().toUpperCase() === 'Y'),
        unprintedSales: allSales.filter((s) => {
            const status = String(s.bill_printed ?? '').trim().toUpperCase();
            return status === 'N' || status === '' || status === 'NULL' || status === 'UNDEFINED';
        })
    }), [allSales]);

    const filterCustomers = (sales, query, searchByBillNo = false) => {
        const allCustomers = [...new Set(sales.map(s => s.customer_code))];
        if (!query) return allCustomers;
        const lowerQuery = query.toLowerCase();
        if (searchByBillNo) {
            const byBillNo = sales.filter(s => (s.bill_no?.toString() || '').toLowerCase().includes(lowerQuery)).map(s => s.customer_code);
            const byCode = allCustomers.filter(code => code.toLowerCase().includes(lowerQuery));
            return [...new Set([...byBillNo, ...byCode])];
        }
        return allCustomers.filter(code => code.toLowerCase().includes(lowerQuery));
    };

    const unprintedCustomers = useMemo(() => filterCustomers(unprintedSales, searchQueries.unprinted), [unprintedSales, searchQueries.unprinted]);

    const displayedSales = useMemo(() => {
        const normalizeCode = (value) => String(value || '').trim().toUpperCase();
        const normalizedStatus = (sale) => String(sale?.bill_printed ?? '').trim().toUpperCase();
        const isPrintedSale = (sale) => normalizedStatus(sale) === 'Y';
        const isPendingSale = (sale) => !isPrintedSale(sale);
        let sales = [];

        if (selectedUnprintedCustomer) {
            const selectedCode = normalizeCode(selectedUnprintedCustomer);
            sales = allSales.filter((s) => normalizeCode(s.customer_code) === selectedCode && isPendingSale(s));
        }
        else if (selectedPrintedCustomer) {
            if (selectedPrintedCustomer.includes('-')) {
                const separatorIndex = selectedPrintedCustomer.lastIndexOf('-');
                const cCode = separatorIndex >= 0 ? selectedPrintedCustomer.slice(0, separatorIndex) : selectedPrintedCustomer;
                const bNo = separatorIndex >= 0 ? selectedPrintedCustomer.slice(separatorIndex + 1) : '';
                sales = allSales.filter((s) => {
                    const sameCustomer = normalizeCode(s.customer_code) === normalizeCode(cCode);
                    const sameBill = String(s.bill_no ?? '').trim() === String(bNo ?? '').trim();
                    return sameCustomer && (sameBill || isPendingSale(s));
                });
            } else {
                const selectedCode = normalizeCode(selectedPrintedCustomer);
                sales = allSales.filter((s) => normalizeCode(s.customer_code) === selectedCode);
            }
        } else {
            const activeCustomerCode = normalizeCode(formData.customer_code);
            if (activeCustomerCode) {
                sales = allSales.filter((s) => normalizeCode(s.customer_code) === activeCustomerCode && isPendingSale(s));
            } else {
                // Default POS view remains scoped to "new" rows when no active customer is selected.
                sales = newSales;
            }
        }

        // De-duplicate rows because some responses can contain repeated entries.
        const dedupedSales = [];
        const seenKeys = new Set();
        sales.forEach((sale) => {
            if (!sale) return;
            const uniqueKey = sale.id
                ? `id:${sale.id}`
                : `tmp:${normalizeCode(sale.customer_code)}:${normalizeCode(sale.item_code)}:${sale.weight}:${sale.price_per_kg}:${sale.packs}`;
            if (seenKeys.has(uniqueKey)) return;
            seenKeys.add(uniqueKey);
            dedupedSales.push(sale);
        });

        return dedupedSales;
    }, [allSales, selectedUnprintedCustomer, selectedPrintedCustomer, formData.customer_code]);

    const autoCustomerCode = useMemo(() => displayedSales.length > 0 && !isManualClear ? displayedSales[0].customer_code || "" : "", [displayedSales, isManualClear]);
    const currentBillNo = useMemo(() => {
        if (selectedPrintedCustomer && selectedPrintedCustomer.includes('-')) return selectedPrintedCustomer.split('-')[1] || "N/A";
        if (selectedPrintedCustomer) return printedSales.find(s => s.customer_code === selectedPrintedCustomer)?.bill_no || "N/A";
        return "";
    }, [selectedPrintedCustomer, printedSales]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            if (refreshAbortRef.current) refreshAbortRef.current.abort();
            if (initAbortRef.current) initAbortRef.current.abort();
            if (loanAbortRef.current) loanAbortRef.current.abort();
            if (submitAbortRef.current) submitAbortRef.current.abort();

            activeIntervalsRef.current.forEach((id) => window.clearInterval(id));
            activeIntervalsRef.current.clear();
            activeTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
            activeTimeoutsRef.current.clear();

            isMountedRef.current = false;
        };
    }, []);
    // Add this useEffect after the existing keyboard shortcut useEffect
    useEffect(() => {
        const handleF6Clear = (e) => {
            if (e.key === "F6") {
                e.preventDefault();

                // Clear all form data
                setFormData({
                    ...initialFormData,
                    telephone_no: "",
                    customer_code: "",
                    customer_name: "",
                    supplier_code: "",
                    item_code: "",
                    item_name: "",
                    weight: "",
                    price_per_kg: "",
                    pack_due: "",
                    total: "",
                    packs: "",
                    given_amount: ""
                });

                // CRITICAL: Clear selected printed and unprinted customers
                updateState({
                    editingSaleId: null,
                    isManualClear: false,
                    priceManuallyChanged: false,
                    gridPricePerKg: "",
                    selectedSaleForBreakdown: null,
                    isGivenAmountManuallyTouched: false,
                    // Clear sidebar selections
                    selectedPrintedCustomer: null,
                    selectedUnprintedCustomer: null,
                    currentBillNo: null,
                    // Clear search queries if needed
                    searchQueries: {
                        printed: "",
                        unprinted: "",
                        farmerPrinted: "",
                        farmerUnprinted: ""
                    },
                    // Clear loan amount
                    loanAmount: 0,
                    // Clear any errors
                    errors: {},
                    // Clear customer/supplier profile pics
                    customerProfilePic: null,
                    supplierProfilePic: null,
                    customerNameDisplay: "",
                    supplierNameDisplay: ""
                });

                // Clear the loan cache for this customer
                loanCacheRef.current.clear();

                // Focus on customer_code_input with a small delay to ensure state updates
                setManagedTimeout(() => {
                    if (refs.customer_code_input.current) {
                        refs.customer_code_input.current.focus();
                        refs.customer_code_input.current.select();
                    }
                }, 50);
            }
        };

        window.addEventListener("keydown", handleF6Clear);

        return () => {
            window.removeEventListener("keydown", handleF6Clear);
        };
    }, [setFormData, updateState, setManagedTimeout, refs]);

    // Clear loan cache after long inactivity to avoid stale/accumulated entries in all-day sessions.
    useEffect(() => {
        const markActivity = () => {
            lastUserActivityAtRef.current = Date.now();
        };

        const inactivityInterval = setManagedInterval(() => {
            const idleMs = Date.now() - lastUserActivityAtRef.current;
            if (idleMs >= 30 * 60 * 1000 && loanCacheRef.current.size > 0) {
                loanCacheRef.current.clear();
            }
        }, 5 * 60 * 1000);

        window.addEventListener('mousemove', markActivity);
        window.addEventListener('keydown', markActivity);
        window.addEventListener('touchstart', markActivity);
        window.addEventListener('focus', markActivity);

        return () => {
            window.removeEventListener('mousemove', markActivity);
            window.removeEventListener('keydown', markActivity);
            window.removeEventListener('touchstart', markActivity);
            window.removeEventListener('focus', markActivity);
            clearManagedInterval(inactivityInterval);
        };
    }, [setManagedInterval, clearManagedInterval]);
    // Add this useEffect after the existing keyboard shortcut useEffect
    useEffect(() => {
        const handleF6Clear = (e) => {
            if (e.key === "F6") {
                e.preventDefault();

                // Clear all form data
                setFormData({
                    ...initialFormData,
                    // Preserve telephone number if you want, or clear it too
                    telephone_no: "",
                    customer_code: "",
                    customer_name: "",
                    supplier_code: "",
                    item_code: "",
                    item_name: "",
                    weight: "",
                    price_per_kg: "",
                    pack_due: "",
                    total: "",
                    packs: "",
                    given_amount: ""
                });

                // Reset other state variables
                updateState({
                    editingSaleId: null,
                    isManualClear: false,
                    priceManuallyChanged: false,
                    gridPricePerKg: "",
                    selectedSaleForBreakdown: null,
                    isGivenAmountManuallyTouched: false,
                    // Optionally clear sidebar selections
                    // selectedPrintedCustomer: null,
                    // selectedUnprintedCustomer: null,
                    // currentBillNo: null
                });

                // Focus on customer_code_input with a small delay to ensure state updates
                setManagedTimeout(() => {
                    if (refs.customer_code_input.current) {
                        refs.customer_code_input.current.focus();
                        refs.customer_code_input.current.select();
                    }
                }, 50);
            }
        };

        window.addEventListener("keydown", handleF6Clear);

        return () => {
            window.removeEventListener("keydown", handleF6Clear);
        };
    }, [setFormData, updateState, setManagedTimeout, refs]);

    const refreshStartedAtRef = useRef(0);
    const lastSalesSignatureRef = useRef('');

    const refreshSalesData = useCallback(async (force = false) => {
        if (!isMountedRef.current) return;
        if (refreshInFlightRef.current) {
            if (Date.now() - refreshStartedAtRef.current < API_TIMEOUT_MS + 5000) {
                if (force) pendingForceRefreshRef.current = true;
                return;
            }
            refreshInFlightRef.current = false;
        }

        const now = Date.now();
        if (!force && now - lastRefreshAtRef.current < 3000) return;

        if (refreshAbortRef.current) {
            refreshAbortRef.current.abort();
        }
        const controller = new AbortController();
        refreshAbortRef.current = controller;

        refreshInFlightRef.current = true;
        refreshStartedAtRef.current = now;
        try {
            const response = await api.get(routes.sales, { signal: controller.signal, timeout: API_TIMEOUT_MS });
            if (!isMountedRef.current) return;

            const salesData = response.data.data || response.data.sales || response.data || [];
            const nowTs = Date.now();
            const rawList = Array.isArray(salesData) ? salesData : [];

            // Cap tombstones if refresh has been failing
            if (deletedSaleIdsRef.current.size > 500) {
                const trimmed = [...deletedSaleIdsRef.current].slice(-250);
                deletedSaleIdsRef.current = new Set(trimmed);
            }

            // FIX: REMOVE the pruning logic that removes IDs from the deleted set
            // Instead, we'll filter out deleted IDs AND keep them in the set permanently
            // Only remove them after a certain time has passed (e.g., 30 seconds)

            const serverSales = rawList.filter((sale) => {
                const saleId = sale?.id;
                // If this ID is in the deleted set, filter it out
                if (deletedSaleIdsRef.current.has(saleId)) {
                    return false;
                }
                return true;
            });

            const baseIds = new Set(serverSales.map((s) => s?.id).filter(Boolean));

            // Keep just-submitted rows for a short window
            recentSubmittedSalesRef.current.forEach((entry, id) => {
                if (!entry || !id) return;
                const ageMs = nowTs - entry.at;
                if (ageMs > 15000) {
                    recentSubmittedSalesRef.current.delete(id);
                    return;
                }
                if (!baseIds.has(id) && !deletedSaleIdsRef.current.has(id)) {
                    serverSales.push(entry.sale);
                    baseIds.add(id);
                }
            });

            lastRefreshAtRef.current = Date.now();

            setState((prev) => {
                const mergedSalesData = serverSales.slice();
                const fetchedIds = new Set(baseIds);
                const optimisticRows = (prev.allSales || []).filter(
                    (sale) => sale?._optimistic || String(sale?.id || '').startsWith('tmp-')
                );
                optimisticRows.forEach((sale) => {
                    const id = sale?.id;
                    if (!id || fetchedIds.has(id)) return;
                    mergedSalesData.push(sale);
                    fetchedIds.add(id);
                });

                const signature = buildSalesSignature(mergedSalesData);
                if (signature === lastSalesSignatureRef.current) return prev;
                lastSalesSignatureRef.current = signature;
                return { ...prev, allSales: mergedSalesData };
            });

            // After successfully refreshing, clean up old deleted IDs (older than 5 minutes)
            // This prevents the set from growing indefinitely
            try {
                const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                const storedDeletes = JSON.parse(localStorage.getItem('deletedSaleIds') || '[]');
                const freshDeletes = storedDeletes.filter(item => {
                    // If you store with timestamp, use it
                    if (item.timestamp && item.timestamp > fiveMinutesAgo) return true;
                    // Otherwise keep IDs that are still in the deleted set
                    return deletedSaleIdsRef.current.has(item.id);
                });
                localStorage.setItem('deletedSaleIds', JSON.stringify(freshDeletes));
            } catch (e) {
                // Ignore localStorage errors
            }

        } catch (error) {
            if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || error?.name === 'AbortError') {
                return;
            }
            console.error("Failed to refresh sales data:", error);
        } finally {
            if (refreshAbortRef.current === controller) {
                refreshAbortRef.current = null;
            }
            refreshInFlightRef.current = false;
            if (pendingForceRefreshRef.current && isMountedRef.current) {
                pendingForceRefreshRef.current = false;
                setManagedTimeout(() => refreshSalesData(true), 0);
            }
        }
    }, [setManagedTimeout]);
    // Listen for updates from PrintedBills page and cross-tab storage updates.
    useEffect(() => {
        const handleSalesUpdate = () => {
            refreshSalesData(true);
        };

        const handleStorageChange = (event) => {
            if (event.key === 'salesDataUpdated') {
                refreshSalesData(true);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshSalesData();
            }
        };

        window.addEventListener('salesDataUpdated', handleSalesUpdate);
        window.addEventListener('storage', handleStorageChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('salesDataUpdated', handleSalesUpdate);
            window.removeEventListener('storage', handleStorageChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshSalesData]);

    // Keep periodic refresh lightweight to avoid excessive re-renders on large datasets.
    useEffect(() => {
        const interval = setManagedInterval(() => {
            if (document.visibilityState === 'visible') {
                refreshSalesData();
            }
        }, 30000);

        return () => clearManagedInterval(interval);
    }, [refreshSalesData, setManagedInterval, clearManagedInterval]);

    // Reference data (customers/items/suppliers) also goes stale over an all-day session;
    // refresh it quietly every 10 minutes without touching the sales list or the form.
    const referenceRefreshInFlightRef = useRef(false);
    useEffect(() => {
        const interval = setManagedInterval(async () => {
            if (document.visibilityState !== 'visible') return;
            if (referenceRefreshInFlightRef.current) {
                // Stuck-lock recovery if a prior refresh never cleared the flag.
                if (Date.now() - referenceRefreshStartedAtRef.current < API_TIMEOUT_MS + 5000) return;
                referenceRefreshInFlightRef.current = false;
            }
            referenceRefreshInFlightRef.current = true;
            referenceRefreshStartedAtRef.current = Date.now();
            const controller = new AbortController();
            try {
                const reqConfig = { signal: controller.signal, timeout: API_TIMEOUT_MS };
                const [resCustomers, resItems, resSuppliers] = await Promise.all([
                    api.get(routes.customers, reqConfig),
                    api.get(routes.items, reqConfig),
                    api.get(routes.suppliers, reqConfig)
                ]);
                if (!isMountedRef.current) return;
                updateState({
                    customers: resCustomers.data.data || resCustomers.data.customers || resCustomers.data || [],
                    items: resItems.data.data || resItems.data.items || resItems.data || [],
                    suppliers: resSuppliers.data.data || resSuppliers.data.suppliers || resSuppliers.data || [],
                });
            } catch {
                // A failed background refresh is harmless; existing data stays usable.
            } finally {
                referenceRefreshInFlightRef.current = false;
            }
        }, 10 * 60 * 1000);

        return () => clearManagedInterval(interval);
    }, [updateState, setManagedInterval, clearManagedInterval]);


    const fetchLoanAmount = useCallback(async (customerCode) => {
        if (!customerCode) return updateState({ loanAmount: 0 });

        const normalized = String(customerCode).trim().toUpperCase();
        if (loanCacheRef.current.has(normalized)) {
            updateState({ loanAmount: loanCacheRef.current.get(normalized) });
            return;
        }

        if (loanAbortRef.current) {
            loanAbortRef.current.abort();
        }
        const controller = new AbortController();
        loanAbortRef.current = controller;

        try {
            const response = await api.post(routes.getLoanAmount, { customer_short_name: customerCode }, { signal: controller.signal, timeout: API_TIMEOUT_MS });
            const value = parseFloat(response.data.total_loan_amount) || 0;
            // Prevent unbounded cache growth during long-running sessions.
            if (!loanCacheRef.current.has(normalized) && loanCacheRef.current.size >= 200) {
                const oldestKey = loanCacheRef.current.keys().next().value;
                if (oldestKey !== undefined) {
                    loanCacheRef.current.delete(oldestKey);
                }
            }
            loanCacheRef.current.set(normalized, value);
            updateState({ loanAmount: value });
        } catch (error) {
            if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || error?.name === 'AbortError') {
                return;
            }
            updateState({ loanAmount: 0 });
        } finally {
            if (loanAbortRef.current === controller) {
                loanAbortRef.current = null;
            }
        }
    }, [updateState]);

    const fetchInitialData = useCallback(async (attempt = 0) => {
        if (initAbortRef.current) {
            initAbortRef.current.abort();
        }
        const controller = new AbortController();
        initAbortRef.current = controller;

        try {
            let userData = null;
            try { userData = JSON.parse(localStorage.getItem('user')); } catch { /* corrupt storage should not block the page */ }
            const reqConfig = { signal: controller.signal, timeout: API_TIMEOUT_MS };
            const [resSales, resCustomers, resItems, resSuppliers] = await Promise.all([
                api.get(routes.sales, reqConfig),
                api.get(routes.customers, reqConfig),
                api.get(routes.items, reqConfig),
                api.get(routes.suppliers, reqConfig)
            ]);

            if (!isMountedRef.current) return;

            const salesData = resSales.data.data || resSales.data.sales || resSales.data || [];
            const customersData = resCustomers.data.data || resCustomers.data.customers || resCustomers.data || [];
            const itemsData = resItems.data.data || resItems.data.items || resItems.data || [];
            const suppliersData = resSuppliers.data.data || resSuppliers.data.suppliers || resSuppliers.data || [];
            updateState({
                allSales: Array.isArray(salesData)
                    ? salesData.filter((sale) => !deletedSaleIdsRef.current.has(sale?.id))
                    : [],
                customers: customersData,
                items: itemsData,
                suppliers: suppliersData,
                isLoading: false,
                currentUser: userData
            });
        } catch (error) {
            if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || error?.name === 'AbortError') {
                return;
            }
            updateState({ errors: { form: 'Failed to load data. Retrying…' } });
            // Auto-retry with backoff so a brief network blip at page open doesn't leave
            // the operator with an empty screen for the rest of the day.
            if (attempt < 5 && isMountedRef.current) {
                setManagedTimeout(() => fetchInitialData(attempt + 1), Math.min(30000, 2000 * (attempt + 1)));
            }
        } finally {
            if (initAbortRef.current === controller) {
                initAbortRef.current = null;
            }
        }
    }, [updateState, setManagedTimeout]);

    useEffect(() => {
        // Only clear given_amount when the customer selection is gone — not when
        // displayedSales briefly goes empty during a refresh/filter flicker.
        const hasCustomer = !!(formData.customer_code || autoCustomerCode || selectedUnprintedCustomer || selectedPrintedCustomer);
        if (!hasCustomer) {
            setFormData(prev => (prev.given_amount === "" ? prev : { ...prev, given_amount: "" }));
        }
    }, [formData.customer_code, autoCustomerCode, selectedUnprintedCustomer, selectedPrintedCustomer, setFormData]);
    useEffect(() => {
        // Determine the code to search for: manually entered, phone-matched, or sidebar-selected
        const code = formData.customer_code || autoCustomerCode;

        if (code && customers.length > 0) {
            const customer = customers.find(c =>
                String(c.short_name).toUpperCase() === String(code).toUpperCase()
            );

            if (customer) {
                const baseUrl = "https://goviraju.lk/sms_new_backend_50500/application/public";
                let fileName = customer.profile_pic;
                let fullPath = null;

                if (fileName) {
                    if (fileName.startsWith('http')) {
                        fullPath = fileName;
                    } else {
                        const cleanFileName = fileName.replace('public/', '');
                        const subPath = cleanFileName.includes('customers')
                            ? cleanFileName
                            : `customers/${cleanFileName}`;

                        fullPath = `${baseUrl}/storage/${subPath}`;
                    }
                }

                updateState({
                    customerProfilePic: fullPath,
                    customerNameDisplay: customer.name || ""
                });
            } else {
                updateState({ customerProfilePic: null, customerNameDisplay: "" });
            }
        } else {
            updateState({ customerProfilePic: null, customerNameDisplay: "" });
        }
    }, [formData.customer_code, autoCustomerCode, customers]);
    // useEffect to fetch Supplier profile pic
    useEffect(() => {
        const code = formData.supplier_code;
        if (code && suppliers.length > 0) {
            const supplier = suppliers.find(s =>
                String(s.code).toUpperCase() === String(code).toUpperCase()
            );

            if (supplier) {
                // Root path where the 'storage' symlink is located
                const baseUrl = "https://goviraju.lk/sms_new_backend_50500/application/public";
                let fileName = supplier.profile_pic;

                let fullPath = null;

                if (fileName) {
                    if (fileName.startsWith('http')) {
                        // Use directly if it's already a full URL
                        fullPath = fileName;
                    } else {
                        // Check if 'suppliers/profiles' is already in the filename string from DB
                        // If not, we manually add it to match your folder structure
                        const subPath = fileName.includes('suppliers/profiles')
                            ? fileName.replace('public/', '')
                            : `suppliers/profiles/${fileName.replace('public/', '')}`;

                        fullPath = `${baseUrl}/storage/${subPath}`;
                    }
                }

                updateState({
                    supplierProfilePic: fullPath,
                    supplierNameDisplay: supplier.name || ""
                });
            } else {
                updateState({ supplierProfilePic: null, supplierNameDisplay: "" });
            }
        } else {
            updateState({ supplierProfilePic: null, supplierNameDisplay: "" });
        }
    }, [formData.supplier_code, suppliers]);
    useEffect(() => {
        const w = parseFloat(formData.weight) || 0;
        const p = parseFloat(formData.price_per_kg) || 0;
        const total = Number((w * p).toFixed(2));
        // Bail when the value is already correct so this effect doesn't trigger an extra
        // render for every keystroke in unrelated fields.
        setFormData(prev => (prev.total === total ? prev : { ...prev, total }));
        if (!state.priceManuallyChanged) updateState({ gridPricePerKg: formData.price_per_kg });
    }, [formData.weight, formData.price_per_kg, formData.packs, formData.pack_due]);

    useEffect(() => {
        fetchInitialData();
        refs.customer_code_input.current?.focus();
    }, [fetchInitialData]);

    const buildSubmissionFormData = useCallback((formOverrides = {}) => {
        const resolvedPricePerKg = refs.price_per_kg_grid_item.current?.value
            ?? refs.price_per_kg.current?.value
            ?? formData.price_per_kg;
        const nextFormData = {
            ...formData,
            customer_code: refs.customer_code_input.current?.value ?? formData.customer_code,
            supplier_code: refs.supplier_code.current?.value ?? formData.supplier_code,
            weight: refs.weight.current?.value ?? formData.weight,
            price_per_kg: resolvedPricePerKg,
            packs: refs.packs.current?.value ?? formData.packs,
            ...formOverrides,
        };

        const computedTotal = (parseFloat(nextFormData.weight) || 0) * (parseFloat(nextFormData.price_per_kg) || 0);
        return {
            ...nextFormData,
            total: Number(computedTotal.toFixed(2)),
        };
    }, [formData]);

    const handleKeyDown = async (e, currentFieldName) => {
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();

            // Ignore key auto-repeat so one physical Enter press triggers one submit flow.
            if (e.repeat) return;

            // NEW: Handle ONLY the specific price_per_kg field (not the grid item)
            if (currentFieldName === "price_per_kg") {
                // Optional: Quick validation to ensure required fields are filled
                if (!formData.item_code) {
                    refs.item_code_select.current?.focus();
                    updateState({ errors: { form: 'Please select an item first' } });
                    return;
                }
                if (!formData.weight) {
                    refs.weight.current?.focus();
                    updateState({ errors: { form: 'Please enter weight' } });
                    return;
                }
                if (!formData.packs) {
                    refs.packs.current?.focus();
                    updateState({ errors: { form: 'Please enter packs' } });
                    return;
                }
                await handleSubmit(e, {}, { bypassSignatureThrottle: true });
                return;
            }

            // 1. Handle Given Amount
            if (currentFieldName === "given_amount") {
                const success = await handleSubmitGivenAmount(e);
                if (success) {
                    handlePrintAndClear();
                }
                return;
            }

            // 2. Packs Enter → submit exactly once. Extra Enter presses are ignored while locked.
            if (currentFieldName === "packs") {
                const submitFormData = buildSubmissionFormData();

                if (!submitFormData.item_code) {
                    refs.item_code_select.current?.focus();
                    updateState({ errors: { form: 'Please select an item first' } });
                    return;
                }
                if (!submitFormData.weight) {
                    refs.weight.current?.focus();
                    updateState({ errors: { form: 'Please enter weight' } });
                    return;
                }

                if (!submitFormData.packs || submitFormData.packs.toString().trim() === '') {
                    updateState({ errors: { form: 'Please enter packs' } });
                    refs.packs.current?.focus();
                    return;
                }

                // Do NOT early-return on isSubmittingRef here — that was the all-day stuck bug.
                // handleSubmit owns the lock + stuck-lock recovery.
                await handleSubmit(e, submitFormData, { bypassSignatureThrottle: true });
                return;
            }

            // 3. Logic for TELEPHONE input (Reverse Lookup)
            if (currentFieldName === "telephone_no") {
                // Hide save button when navigating away
                updateState({ showSavePhoneButton: false });
                refs.customer_code_input.current?.focus();
                return;
            }

            // 4. Logic for CUSTOMER CODE input - MODIFIED: Removed auto-save
            if (currentFieldName === "customer_code_input") {
                const code = (formData.customer_code || autoCustomerCode).trim().toUpperCase();

                if (code) {
                    // LOCAL LOOKUP ONLY - NO AUTO-SAVE
                    const match = customers.find(c => String(c.short_name).toUpperCase() === code);

                    if (match) {
                        // Only update customer_name
                        setFormData(prev => ({
                            ...prev,
                            customer_name: match.name || ""
                        }));
                        fetchLoanAmount(code);
                    } else {
                        // Optionally show a message that customer doesn't exist
                        // but don't auto-create
                        console.log("Customer not found in local data");
                    }
                }

                refs.supplier_code.current?.focus();
                return;
            }

            // supplier_code → item select. Defer focus until after this Enter keydown
            // fully settles; sync focus during keydown lets some browsers bounce focus
            // back to supplier (and late post-submit focusSupplierCode can too).
            if (currentFieldName === "supplier_code") {
                suppressSupplierFocusUntilRef.current = Date.now() + 2500;
                refs.supplier_code.current?.blur();
                requestAnimationFrame(() => {
                    setManagedTimeout(() => {
                        focusItemCodeSelect();
                    }, 0);
                });
                return;
            }

            // 5. General Navigation Logic
            let nextFieldName = skipMap[currentFieldName];
            if (!nextFieldName) {
                const currentIndex = fieldOrder.indexOf(currentFieldName);
                let nextIndex = currentIndex + 1;
                while (nextIndex < fieldOrder.length &&
                    ["customer_code_select", "item_name", "total"].includes(fieldOrder[nextIndex])) {
                    nextIndex++;
                }
                nextFieldName = nextIndex < fieldOrder.length ? fieldOrder[nextIndex] : "customer_code_input";
            }

            const nextRef = refs[nextFieldName];
            if (nextRef?.current) {
                if (nextFieldName === "item_code_select") {
                    focusItemCodeSelect();
                    return;
                }
                requestAnimationFrame(() => {
                    setManagedTimeout(() => {
                        nextRef.current.focus();
                        if (!nextFieldName.includes("select")) nextRef.current.select();
                    }, 0);
                });
            }
        }
    };

    const { salesTotal, packCostTotal, totalSalesValue } = useMemo(() => {
        const totals = displayedSales.reduce((acc, s) => {
            acc.sales += ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0));
            acc.pack += ((parseFloat(s.CustomerPackCost) || 0) * (parseFloat(s.packs) || 0));
            return acc;
        }, { sales: 0, pack: 0 });

        return {
            salesTotal: totals.sales,
            packCostTotal: totals.pack,
            totalSalesValue: totals.sales + totals.pack,
        };
    }, [displayedSales]);

    const handleInputChange = (field, value) => {
        if (field === 'price_per_kg') {
            setFormData(prev => ({ ...prev, [field]: value }));
            updateState({ priceManuallyChanged: true, gridPricePerKg: value });
        } else if (field === 'price_per_kg_grid_item') {
            setFormData(prev => ({ ...prev, 'price_per_kg': value }));
            updateState({ gridPricePerKg: value, priceManuallyChanged: false });
        } else if (field === 'telephone_no') {
            // Only allow numbers and limit to 10 digits
            const cleaned = value.replace(/\D/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, telephone_no: cleaned }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }

        if (field === 'customer_code') {
            const trimmedValue = value.trim();
            updateState({ isManualClear: value === '', selectedPrintedCustomer: null });
            const matchingCustomer = unprintedCustomers.find(code => code.toLowerCase() === trimmedValue.toLowerCase());

            if (matchingCustomer) updateState({ selectedUnprintedCustomer: matchingCustomer, selectedPrintedCustomer: null });
            else if (selectedUnprintedCustomer) updateState({ selectedUnprintedCustomer: null });

            if (!trimmedValue) {
                updateState({ loanAmount: 0 });
                setFormData(prev => ({ ...prev, given_amount: "" }));
            }

            const customer = customers.find(c => c.short_name === value);
            const customerSales = allSales.filter(s => s.customer_code === trimmedValue);
            const firstSale = customerSales[0];
            const givenAmount = firstSale?.given_amount || "";
            setFormData(prev => ({ ...prev, customer_name: customer?.name || "", given_amount: givenAmount }));
            fetchLoanAmount(trimmedValue);
        }

        // --- UPDATED TELEPHONE LOGIC (FOR AUTOMATIC SELECTION & IMAGE) ---

        if (field === 'supplier_code') setFormData(prev => ({ ...prev, supplier_code: value }));
        if (field === "given_amount") {
            updateState({ isGivenAmountManuallyTouched: true });
        }
    };
    const handleItemSelect = (selectedOption) => {
        if (selectedOption) {
            const { item } = selectedOption;
            const fetchedPackDue = parseFloat(item?.pack_due) || 0;
            const fetchedPackCost = parseFloat(item?.pack_cost) || 0;

            setFormData(prev => ({
                ...prev,
                item_code: item.no,
                item_name: item.type,
                pack_due: fetchedPackDue,
                // Keep existing values, don't reset them
                weight: prev.weight || "",
                price_per_kg: prev.price_per_kg || "",
                packs: prev.packs || "",
                leading_sales_id: prev.leading_sales_id || "",
                total: prev.total || ""
            }));

            updateState({
                packCost: fetchedPackCost,
                itemSearchInput: "",
                gridPricePerKg: formData.price_per_kg || ""
            });

            // Focus on weight field
            setManagedTimeout(() => refs.weight.current?.focus(), 100);
        } else {
            // Only clear everything if explicitly deselecting
            setFormData(prev => ({
                ...prev,
                item_code: "",
                item_name: "",
                pack_due: "",
                // Keep the values when deselecting? Or clear them?
                // If you want to keep them, use prev.weight, etc.
                // If you want to clear them, use ""
                weight: "",  // Change to prev.weight if you want to keep
                price_per_kg: "",  // Change to prev.price_per_kg if you want to keep
                packs: "",  // Change to prev.packs if you want to keep
                leading_sales_id: "",
                total: ""
            }));
            updateState({ packCost: 0, itemSearchInput: "", gridPricePerKg: "" });
        }
    };

    const handleCustomerSelect = (selectedOption) => {
        const short = selectedOption ? selectedOption.value : "";
        const customer = customers.find(x => String(x.short_name) === String(short));
        updateState({ selectedUnprintedCustomer: unprintedCustomers.includes(short) ? short : null, selectedPrintedCustomer: null, customerSearchInput: "" });
        const existingGivenAmount = allSales.find(s => s.customer_code === short)?.given_amount || "";
        setFormData(prev => ({ ...prev, customer_code: short || "", customer_name: customer?.name || "", given_amount: existingGivenAmount }));
        fetchLoanAmount(short);
        updateState({ isManualClear: false });
        setManagedTimeout(() => { refs.price_per_kg.current?.focus(); refs.price_per_kg.current?.select(); }, 100);
    };
    //function to display customer image
    const handleImageClick = (entityType) => {
        const code = entityType === 'customer' ? (formData.customer_code || autoCustomerCode) : formData.supplier_code;
        const list = entityType === 'customer' ? customers : suppliers;

        const person = list.find(p =>
            String(entityType === 'customer' ? p.short_name : p.code).toUpperCase() === String(code).toUpperCase()
        );

        if (person) {
            updateState({
                isImageModalOpen: true,
                selectedImageData: {
                    profile: entityType === 'customer' ? state.customerProfilePic : state.supplierProfilePic,
                    nic_front: person.nic_front,
                    nic_back: person.nic_back,
                    title: person.name || code,
                    type: entityType // <--- ADD THIS LINE
                }
            });
        }
    };
    // Show Save button when telephone number has 10 digits
    useEffect(() => {
        const phoneNumber = formData.telephone_no || "";
        // Check if phone number has exactly 10 digits (only numbers)
        const isValidPhone = /^\d{10}$/.test(phoneNumber);

        // Also check if we have a customer code
        const customerCode = formData.customer_code || autoCustomerCode;

        if (isValidPhone && customerCode && !selectedPrintedCustomer) {
            updateState({ showSavePhoneButton: true });
        } else {
            updateState({ showSavePhoneButton: false });
        }
    }, [formData.telephone_no, formData.customer_code, autoCustomerCode, selectedPrintedCustomer]);

    const handleEditClick = (sale) => {
        // If same record clicked again → clear fields EXCEPT customer/contact fields
        if (state.editingSaleId === sale.id) {
            setFormData((prev) => ({
                ...prev,
                customer_code: sale.customer_code || "",
                customer_name: sale.customer_name || "",
                // PRESERVE TELEPHONE:
                telephone_no: prev.telephone_no || "",
                supplier_code: "",
                item_code: "",
                item_name: "",
                weight: "",
                price_per_kg: "",
                pack_due: "",
                total: "",
                packs: ""
            }));

            updateState({
                editingSaleId: null,
                isManualClear: true,
                priceManuallyChanged: false,
                gridPricePerKg: "",
                selectedSaleForBreakdown: null
            });

            setManagedTimeout(() => {
                refs.supplier_code?.current?.focus();
                refs.supplier_code?.current?.select();
            }, 0);

            return;
        }

        // === Normal behavior when selecting a record to edit ===
        let fetchedPackDue = sale.pack_due || "";
        if (sale.item_code) {
            const matchingItem = items.find(i => String(i.no) === String(sale.item_code));
            fetchedPackDue = parseFloat(matchingItem?.pack_due) || sale.pack_due || "";
        }

        setFormData((prev) => ({
            ...sale,
            // Ensure we explicitly map these so they don't get lost
            item_name: sale.item_name || "",
            customer_code: sale.customer_code || "",
            customer_name: sale.customer_name || "",
            // PRESERVE TELEPHONE from the current form state or the sale object
            telephone_no: sale.telephone_no || prev.telephone_no || "",
            supplier_code: sale.supplier_code || "",
            item_code: sale.item_code || "",
            weight: sale.weight || "",
            price_per_kg: sale.price_per_kg || "",
            pack_due: fetchedPackDue,
            total: sale.total || "",
            packs: sale.packs || ""
        }));

        updateState({
            editingSaleId: sale.id,
            isManualClear: false,
            priceManuallyChanged: false,
            gridPricePerKg: sale.price_per_kg || "",
            selectedSaleForBreakdown: sale
        });

        // CHANGE THIS PART - Focus on price field instead of weight
        setManagedTimeout(() => {
            refs.price_per_kg_grid_item.current?.focus();
            refs.price_per_kg_grid_item.current?.select();
        }, 0);
    };

    const handleTableRowKeyDown = (e, sale) => { if (e.key === "Enter") { e.preventDefault(); handleEditClick(sale); } };

    const handleClearForm = (clearBillNo = false) => {
        setFormData(initialFormData);
        updateState({
            editingSaleId: null,
            loanAmount: 0,
            isManualClear: false,
            packCost: 0,
            customerSearchInput: "",
            itemSearchInput: "",
            supplierSearchInput: "",
            priceManuallyChanged: false,
            gridPricePerKg: "",
            isGivenAmountManuallyTouched: false,
            selectedSaleForBreakdown: null,
            ...(clearBillNo && { currentBillNo: null })
        });
        // REMOVED: setTimeout(() => { refs.supplier_code?.current?.focus(); }, 0);
    };

    const handleDeleteRecord = async (saleId) => {
        if (!saleId) {
            updateState({ errors: { form: "Invalid sale ID" } });
            return;
        }

        if (!window.confirm("Are you sure you want to delete this sales record?")) {
            return;
        }

        const removedSale = allSales.find((sale) => sale.id === saleId) || null;

        if (!removedSale) {
            updateState({ errors: { form: "Record not found" } });
            return;
        }

        // Add to deleted IDs set with timestamp
        deletedSaleIdsRef.current.add(saleId);

        // Store with timestamp for cleanup
        try {
            const deletedIds = JSON.parse(localStorage.getItem('deletedSaleIds') || '[]');
            // Add with timestamp
            deletedIds.push({
                id: saleId,
                timestamp: Date.now()
            });
            // Keep only last 100 entries to prevent unbounded growth
            if (deletedIds.length > 100) {
                deletedIds.splice(0, deletedIds.length - 100);
            }
            localStorage.setItem('deletedSaleIds', JSON.stringify(deletedIds));
        } catch (e) {
            // Ignore localStorage errors
        }

        // Immediately remove from state (optimistic update)
        flushSync(() => {
            setState((prev) => ({
                ...prev,
                allSales: prev.allSales.filter((sale) => sale.id !== saleId),
            }));
        });

        // Clear form if editing the deleted record
        if (editingSaleId === saleId) {
            handleClearForm();
        }

        try {
            // Call API to delete
            await api.delete(`${routes.sales}/${saleId}`, { timeout: API_TIMEOUT_MS });

            // Force refresh but with a delay to let backend process
            setTimeout(() => {
                refreshSalesData(true);
            }, 1000);

        } catch (error) {
            // If delete fails, remove from deleted set and restore the record
            deletedSaleIdsRef.current.delete(saleId);

            // Also remove from localStorage
            try {
                const deletedIds = JSON.parse(localStorage.getItem('deletedSaleIds') || '[]');
                const updated = deletedIds.filter(item => item.id !== saleId);
                localStorage.setItem('deletedSaleIds', JSON.stringify(updated));
            } catch (e) {
                // Ignore localStorage errors
            }

            if (removedSale) {
                setState((prev) => ({
                    ...prev,
                    allSales: [...prev.allSales, removedSale],
                }));
            }

            updateState({
                errors: {
                    form: error.response?.data?.message || error.message || "Failed to delete record"
                }
            });
        }
    };

    const handleSubmitGivenAmount = async (e) => {
        if (e) e.preventDefault();
        // Prevent parallel Enter presses from firing duplicate given-amount + print flows.
        if (givenAmountInFlightRef.current) return null;
        givenAmountInFlightRef.current = true;
        updateState({ errors: {} });

        try {
            const customerCode = (formData.customer_code || autoCustomerCode).trim().toUpperCase();
            if (!customerCode) return null;

            const salesToUpdate = displayedSales.filter(s => s.id);
            if (salesToUpdate.length === 0) return null;

            // 1. Get the entered amount
            const currentInputAmount = parseFloat(String(formData.given_amount ?? "").replace(/,/g, "")) || 0;

            // 2. DETECT CREDIT STATUS based on your calculated logic
            // We calculate it here to know if we should block the process before the API call
            const totals = salesToUpdate.reduce((acc, s) => {
                const weight = parseFloat(s.weight) || 0;
                const price = parseFloat(s.price_per_kg) || 0;
                const packs = parseFloat(s.packs) || 0;
                const pCost = parseFloat(s.CustomerPackCost) || 0;
                const pLabour = parseFloat(s.CustomerPackLabour) || 0;
                acc.billTotal += (weight * price);
                acc.totalBagPrice += (packs * pCost);
                acc.totalLabour += (packs * pLabour);
                return acc;
            }, { billTotal: 0, totalBagPrice: 0, totalLabour: 0 });

            const autoCalculatedGrandTotal = totals.billTotal + totals.totalBagPrice;
            const isCredit = Math.abs(currentInputAmount - autoCalculatedGrandTotal) > 0.01;
            const creditTransactionStatus = isCredit ? 'Y' : 'N';

            // 4. PROCEED: Update database with the determined status
            const updatePromises = salesToUpdate.map(sale =>
                api.put(`${routes.sales}/${sale.id}/given-amount`, {
                    given_amount: currentInputAmount,
                    credit_transaction: creditTransactionStatus
                }, { timeout: API_TIMEOUT_MS })
            );

            const results = await Promise.all(updatePromises);
            if (!isMountedRef.current) return null;
            updateState({ isGivenAmountManuallyTouched: false });

            const updatedSalesFromApi = results.map(response => response.data.sale);
            const updatedSalesMap = {};
            updatedSalesFromApi.forEach(sale => { updatedSalesMap[sale.id] = sale; });

            // Functional update: `allSales` captured at render time may be stale after the
            // await above (a background refresh could have replaced it).
            setState(prev => ({
                ...prev,
                allSales: prev.allSales.map(s => updatedSalesMap[s.id] ? updatedSalesMap[s.id] : s)
            }));

            return updatedSalesFromApi;
        } catch (error) {
            if (isMountedRef.current) {
                updateState({ errors: { form: error.response?.data?.message || error.message } });
            }
            return null;
        } finally {
            givenAmountInFlightRef.current = false;
        }
    };
    const handleSubmit = async (e, formOverrides = {}, options = {}) => {
        const { bypassSignatureThrottle = false } = options;
        if (e?.preventDefault) e.preventDefault();
        const now = Date.now();

        // Acquire lock FIRST — before any await — so 100 Enter presses = 1 submit.
        if (!tryAcquireSubmitLock()) {
            return;
        }
        const myGeneration = submitGenerationRef.current;

        const effectiveFormData = buildSubmissionFormData(formOverrides);
        const submitSignature = [
            editingSaleId || 'new',
            String(effectiveFormData.customer_code || '').trim().toUpperCase(),
            String(effectiveFormData.supplier_code || '').trim().toUpperCase(),
            String(effectiveFormData.item_code || '').trim().toUpperCase(),
            String(effectiveFormData.weight || '').trim(),
            String(effectiveFormData.price_per_kg || '').trim(),
            String(effectiveFormData.packs || '').trim(),
        ].join('|');

        // Prevent accidental double submit from rapid Enter on the same payload
        // (packs path uses bypassSignatureThrottle; other paths still get this guard).
        if (!bypassSignatureThrottle && submitSignature === lastSubmitSignatureRef.current && now - lastSubmitAtRef.current < 1200) {
            releaseSubmitLock();
            return;
        }

        // --- 1. VALIDATION LOGIC ---
        const requiredFields = [
            { key: "customer_code", ref: "customer_code_input", label: "Customer Code" },
            { key: "supplier_code", ref: "supplier_code", label: "Supplier Code" },
            { key: "item_code", ref: "item_code_select", label: "Item" },
            { key: "weight", ref: "weight", label: "Weight" },
            { key: "packs", ref: "packs", label: "Packs" }
        ];

        for (const field of requiredFields) {
            const value = effectiveFormData[field.key];
            if (value === null || value === undefined || value.toString().trim() === "") {
                updateState({ errors: { form: `කරුණාකර ${field.label} ඇතුළත් කරන්න` } });
                const targetRef = refs[field.ref];
                if (targetRef?.current) {
                    targetRef.current.focus();
                    if (!field.ref.includes("select")) targetRef.current.select();
                }
                releaseSubmitLock();
                return;
            }
        }

        // --- 2. PRE-FLIGHT PREPARATION ---
        lastSubmitSignatureRef.current = submitSignature;
        lastSubmitAtRef.current = now;
        updateState({ errors: {}, isSubmitting: true });

        const customerCode = (effectiveFormData.customer_code || autoCustomerCode).toUpperCase();
        const currentSupplierCode = effectiveFormData.supplier_code;
        const currentCustomerName = effectiveFormData.customer_name;
        const currentTelephone = effectiveFormData.telephone_no;
        const shouldUpdateRelatedPrice = state.priceManuallyChanged;
        const normalizedWeight = parseFloat(effectiveFormData.weight) || 0;
        const normalizedPricePerKg = parseFloat(effectiveFormData.price_per_kg) || 0;
        const normalizedPacks = parseFloat(effectiveFormData.packs) || 0;
        const computedTotal = Number((normalizedWeight * normalizedPricePerKg).toFixed(2));
        const editingIdAtStart = editingSaleId;
        const previousEditedSale = editingIdAtStart !== null
            ? (allSales.find((sale) => sale.id === editingIdAtStart) || null)
            : null;
        const tempId = editingIdAtStart ? null : `tmp-${Date.now()}-${myGeneration}`;
        let submitTimeoutId = null;
        let submitController = null;

        try {
            const isEditing = editingIdAtStart !== null;

            if (submitAbortRef.current) {
                try { submitAbortRef.current.abort(); } catch (_) { /* ignore */ }
            }
            submitController = new AbortController();
            submitAbortRef.current = submitController;
            submitTimeoutId = window.setTimeout(() => {
                if (submitAbortRef.current === submitController) {
                    submitController.abort();
                }
            }, SUBMIT_TIMEOUT_MS);

            // --- 3. BILLING LOGIC ---
            let billPrintedStatus = undefined, billNoToUse = null;
            if (!isEditing) {
                if (state.currentBillNo) {
                    billPrintedStatus = 'Y';
                    billNoToUse = state.currentBillNo;
                } else if (selectedPrintedCustomer) {
                    billPrintedStatus = 'Y';
                    billNoToUse = selectedPrintedCustomer.includes('-')
                        ? selectedPrintedCustomer.split('-')[1]
                        : printedSales.find(s => s.customer_code === selectedPrintedCustomer)?.bill_no;
                } else if (selectedUnprintedCustomer) {
                    billPrintedStatus = 'N';
                    billNoToUse = null;
                } else {
                    billPrintedStatus = 'N';
                    billNoToUse = null;
                }
            }

            const payload = {
                supplier_code: currentSupplierCode.toUpperCase(),
                customer_code: customerCode,
                customer_name: currentCustomerName,
                item_code: effectiveFormData.item_code,
                item_name: effectiveFormData.item_name,
                weight: normalizedWeight,
                price_per_kg: normalizedPricePerKg,
                pack_due: parseFloat(effectiveFormData.pack_due) || 0,
                total: computedTotal,
                packs: normalizedPacks,
                given_amount: effectiveFormData.given_amount ? parseFloat(effectiveFormData.given_amount) : null,
                ...(billPrintedStatus && { bill_printed: billPrintedStatus }),
                ...(billNoToUse && { bill_no: billNoToUse }),
                update_related_price: shouldUpdateRelatedPrice,
            };

            const url = isEditing ? `${routes.sales}/${editingIdAtStart}` : routes.sales;
            const method = isEditing ? "put" : "post";

            // --- Optimistic UI: clear form + show row immediately so Enter feels instant ---
            if (isEditing && previousEditedSale) {
                const optimisticSale = {
                    ...previousEditedSale,
                    ...payload,
                    id: editingIdAtStart,
                };
                setState((prev) => ({
                    ...prev,
                    allSales: prev.allSales.map((sale) =>
                        sale.id === editingIdAtStart ? optimisticSale : sale
                    ),
                    formData: {
                        ...initialFormData,
                        customer_code: customerCode,
                        customer_name: currentCustomerName || prev.formData.customer_name,
                        telephone_no: currentTelephone || prev.formData.telephone_no,
                        supplier_code: currentSupplierCode || "",
                    },
                    editingSaleId: null,
                    isManualClear: false,
                    isSubmitting: true,
                    priceManuallyChanged: false,
                    gridPricePerKg: "",
                    selectedSaleForBreakdown: null,
                }));
            } else if (!isEditing && tempId) {
                const optimisticSale = {
                    ...payload,
                    id: tempId,
                    bill_printed: billPrintedStatus || 'N',
                    CustomerPackCost: packCost || 0,
                    _optimistic: true,
                };
                // Register immediately so a silent refresh mid-submit cannot drop the row.
                recentSubmittedSalesRef.current.set(tempId, { sale: optimisticSale, at: Date.now() });
                setState((prev) => {
                    let keepUnprinted = prev.selectedUnprintedCustomer;
                    let keepPrinted = prev.selectedPrintedCustomer;
                    if (!keepUnprinted && !keepPrinted && customerCode) {
                        keepUnprinted = customerCode;
                    }
                    return {
                        ...prev,
                        allSales: [...prev.allSales, optimisticSale],
                        formData: {
                            ...initialFormData,
                            customer_code: customerCode,
                            customer_name: currentCustomerName || prev.formData.customer_name,
                            telephone_no: currentTelephone || prev.formData.telephone_no,
                            supplier_code: currentSupplierCode || "",
                        },
                        editingSaleId: null,
                        isManualClear: false,
                        isSubmitting: true,
                        priceManuallyChanged: false,
                        gridPricePerKg: "",
                        selectedUnprintedCustomer: keepUnprinted,
                        selectedPrintedCustomer: keepPrinted,
                        selectedSaleForBreakdown: null,
                    };
                });
            }

            // Packs Enter completed a valid submit: cancel the earlier supplier-navigation
            // suppression and focus/select the supplier immediately, without waiting for the API.
            suppressSupplierFocusUntilRef.current = 0;
            focusSupplierCode();
            requestAnimationFrame(() => {
                focusSupplierCode();
            });

            // --- 4. API EXECUTION (with hard timeout — never hangs all day) ---
            const response = await api[method](url, payload, {
                signal: submitController.signal,
                timeout: SUBMIT_TIMEOUT_MS,
            });

            // If a newer submit started (should not happen with the lock), ignore this result.
            if (myGeneration !== submitGenerationRef.current) {
                return;
            }

            // --- 5. DATA SYNC ---
            const updatedSales = response.data.sales || [response.data.sale || response.data.data || response.data];
            const trackAt = Date.now();
            if (tempId) {
                recentSubmittedSalesRef.current.delete(tempId);
            }
            updatedSales.forEach((sale) => {
                if (sale?.id) {
                    recentSubmittedSalesRef.current.set(sale.id, { sale, at: trackAt });
                    // Cap map growth across a full day of entries.
                    if (recentSubmittedSalesRef.current.size > 100) {
                        const oldest = recentSubmittedSalesRef.current.keys().next().value;
                        recentSubmittedSalesRef.current.delete(oldest);
                    }
                }
            });

            if (isMountedRef.current) {
                setState(prev => {
                    const updatedSalesById = new Map(updatedSales.filter((sale) => sale?.id).map((sale) => [sale.id, sale]));
                    let uniqueMergedSales = prev.allSales
                        .filter((sale) => sale?.id !== tempId)
                        .map((sale) => updatedSalesById.get(sale.id) || sale);

                    const existingIds = new Set(uniqueMergedSales.map((sale) => sale?.id).filter(Boolean));
                    updatedSales.forEach((sale) => {
                        if (!sale?.id || existingIds.has(sale.id)) return;
                        uniqueMergedSales.push(sale);
                        existingIds.add(sale.id);
                    });

                    const currentCustomerCode = prev.formData.customer_code || customerCode;
                    let keepUnprinted = prev.selectedUnprintedCustomer;
                    let keepPrinted = prev.selectedPrintedCustomer;

                    if (prev.selectedUnprintedCustomer) {
                        keepUnprinted = prev.selectedUnprintedCustomer;
                    } else if (prev.selectedPrintedCustomer) {
                        keepPrinted = prev.selectedPrintedCustomer;
                    } else if (currentCustomerCode) {
                        const hasUnprinted = uniqueMergedSales.some(s =>
                            normalizeCode(s.customer_code) === normalizeCode(currentCustomerCode) &&
                            s.bill_printed !== 'Y'
                        );
                        if (hasUnprinted) {
                            keepUnprinted = currentCustomerCode;
                        }
                    }

                    // CRITICAL: never rewrite formData here — the operator may already be
                    // typing the next line after the optimistic clear above.
                    return {
                        ...prev,
                        allSales: uniqueMergedSales,
                        editingSaleId: null,
                        isManualClear: false,
                        isSubmitting: false,
                        selectedUnprintedCustomer: keepUnprinted,
                        selectedPrintedCustomer: keepPrinted,
                        searchQueries: prev.searchQueries,
                    };
                });
            }

            // Re-focus only if a re-render stole focus to body — never if the operator
            // already moved on to item/weight after the optimistic supplier focus above.
            if (!isFocusInItemEntryFields()) {
                const active = document.activeElement;
                if (!active || active === document.body || active === refs.packs.current) {
                    focusSupplierCode();
                }
            }

        } catch (error) {
            // Stale abort from a recovered stuck lock must not clobber a newer submit.
            if (myGeneration !== submitGenerationRef.current) {
                return;
            }

            // Roll back optimistic create / edit
            if (tempId) {
                recentSubmittedSalesRef.current.delete(tempId);
                if (isMountedRef.current) {
                    setState((prev) => ({
                        ...prev,
                        allSales: prev.allSales.filter((sale) => sale.id !== tempId),
                        isSubmitting: false,
                    }));
                }
            } else if (editingIdAtStart !== null && previousEditedSale) {
                if (isMountedRef.current) {
                    setState((prev) => ({
                        ...prev,
                        allSales: prev.allSales.map((sale) =>
                            sale.id === editingIdAtStart ? previousEditedSale : sale
                        ),
                        isSubmitting: false,
                    }));
                }
            }

            const isAbort = error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || error?.name === 'AbortError';
            if (isMountedRef.current) {
                updateState({
                    errors: {
                        form: isAbort
                            ? "Request timed out. Please press Enter again."
                            : (error.response?.data?.message || error.message || "An error occurred")
                    },
                    isSubmitting: false
                });
            }
        } finally {
            if (submitTimeoutId) {
                window.clearTimeout(submitTimeoutId);
            }
            if (submitAbortRef.current === submitController) {
                submitAbortRef.current = null;
            }
            // Always unlock — even if a newer generation took over, only the owner of
            // this generation should release if still matching; otherwise force unlock
            // when we are still the active generation.
            if (myGeneration === submitGenerationRef.current) {
                releaseSubmitLock();
                if (isMountedRef.current) {
                    updateState({ isSubmitting: false });
                }
            }
        }
    };
    const handleCustomerClick = useStableCallback(async (type, customerCode, billNo = null, salesRecords = []) => {
        // Do not block sidebar selection while a print dialog is open — that made the
        // page feel frozen for up to PRINT_LOCK_MAX_MS after F1.

        // --- ADMIN MODAL LOGIC ---
        if (currentUser?.role === 'Admin') {
            updateState({
                isAdminModalOpen: true,
                modalType: 'customer',
                modalTitle: `Customer: ${customerCode} ${billNo ? `(Bill: ${billNo})` : ''}`,
                modalData: salesRecords
            });
            return;
        }

        const isPrinted = type === 'printed';
        let selectionKey = customerCode;
        if (isPrinted && billNo) selectionKey = `${customerCode}-${billNo}`;
        const isCurrentlySelected = isPrinted ? selectedPrintedCustomer === selectionKey : selectedUnprintedCustomer === selectionKey;

        if (isPrinted) {
            updateState({
                selectedPrintedCustomer: isCurrentlySelected ? null : selectionKey,
                selectedUnprintedCustomer: null,
                currentBillNo: isCurrentlySelected ? null : billNo
            });
        } else {
            updateState({
                selectedUnprintedCustomer: isCurrentlySelected ? null : selectionKey,
                selectedPrintedCustomer: null,
                currentBillNo: null
            });
        }

        const customer = customers.find(x => String(x.short_name).toUpperCase() === String(customerCode).toUpperCase());

        if (!isCurrentlySelected) {
            // --- NEW CALCULATION LOGIC FOR GIVEN AMOUNT ---
            // We calculate the sum of the records that are about to be displayed
            const totals = salesRecords.reduce((acc, s) => {
                const weight = parseFloat(s.weight) || 0;
                const price = parseFloat(s.price_per_kg) || 0;
                const packs = parseFloat(s.packs) || 0;
                const pCost = parseFloat(s.CustomerPackCost) || 0;

                acc.billTotal += (weight * price);
                acc.totalBagPrice += (packs * pCost);

                return acc;
            }, { billTotal: 0, totalBagPrice: 0, totalLabour: 0 });

            const calculatedFinal = totals.billTotal + totals.totalBagPrice;
            const clickGeneration = ++customerClickGenerationRef.current;

            // Apply form immediately so a slow given-amount API cannot leave the UI blank.
            setFormData({
                ...initialFormData,
                customer_code: customerCode,
                customer_name: customer?.name || "",
                telephone_no: customer?.telephone_no || "",
                given_amount: isPrinted ? "" : calculatedFinal.toFixed(2),
            });
            fetchLoanAmount(customerCode);
            setManagedTimeout(() => focusSupplierCode(), 50);

            try {
                let fetchedGivenAmount = calculatedFinal.toFixed(2);

                // If it's a printed bill, try to fetch the amount already stored
                if (isPrinted) {
                    try {
                        let response;
                        if (billNo) {
                            response = await api.get(`${routes.getCustomerGivenAmount}/${customerCode}/${billNo}`, { timeout: API_TIMEOUT_MS });
                            fetchedGivenAmount = response.data?.given_amount ?? calculatedFinal.toFixed(2);
                        } else {
                            response = await api.get(`${routes.getCustomerGivenAmount}/${customerCode}`, { timeout: API_TIMEOUT_MS });

                            if (response.data?.by_bill_no && billNo) {
                                fetchedGivenAmount = response.data.by_bill_no[billNo] ?? calculatedFinal.toFixed(2);
                            } else if (response.data?.all_entries) {
                                const matchingEntry = response.data.all_entries.find(entry => entry.bill_no === billNo);
                                fetchedGivenAmount = matchingEntry?.given_amount ?? calculatedFinal.toFixed(2);
                            } else {
                                fetchedGivenAmount = response.data?.given_amount ?? calculatedFinal.toFixed(2);
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching given amount:', error);
                        const matchingRecord = salesRecords.find(record => record.bill_no === billNo);
                        fetchedGivenAmount = matchingRecord?.given_amount || calculatedFinal.toFixed(2);
                    }
                }

                // Ignore late responses if the operator already clicked another customer
                // or started typing a different sale.
                if (
                    clickGeneration !== customerClickGenerationRef.current ||
                    !isMountedRef.current
                ) {
                    return;
                }

                setFormData(prev => {
                    const stillSameCustomer =
                        String(prev.customer_code || '').toUpperCase() === String(customerCode).toUpperCase();
                    if (!stillSameCustomer) return prev;
                    return {
                        ...prev,
                        customer_name: customer?.name || prev.customer_name,
                        telephone_no: customer?.telephone_no || prev.telephone_no,
                        given_amount: fetchedGivenAmount,
                    };
                });

            } catch (error) {
                console.error('Error in customer selection:', error);
                if (clickGeneration !== customerClickGenerationRef.current || !isMountedRef.current) {
                    return;
                }
                setFormData(prev => {
                    const stillSameCustomer =
                        String(prev.customer_code || '').toUpperCase() === String(customerCode).toUpperCase();
                    if (!stillSameCustomer) return prev;
                    return {
                        ...prev,
                        given_amount: calculatedFinal.toFixed(2),
                    };
                });
            }
        } else {
            handleClearForm();
        }

        updateState({ editingSaleId: null, isManualClear: false, customerSearchInput: "", priceManuallyChanged: false, gridPricePerKg: "" });
    });
    // Helper function for normalizing codes
    const normalizeCode = useCallback((value) => {
        return String(value || '').trim().toUpperCase();
    }, []);
const handleMarkAllProcessed = useStableCallback(async () => {
    // Get sales to process - but do it synchronously without heavy filtering
    const salesToProcess = [...newSales, ...unprintedSales];

    if (salesToProcess.length === 0) {
        // If no sales to process, just focus the customer code input
        refs.customer_code_input.current?.focus();
        refs.customer_code_input.current?.select();
        return;
    }

    // ✅ IMMEDIATELY focus the customer code field FIRST
    // This happens before any other operations
    refs.customer_code_input.current?.focus();
    refs.customer_code_input.current?.select();

    // Then clear the form and update state
    handleClearForm();
    updateState({
        selectedUnprintedCustomer: null,
        selectedPrintedCustomer: null,
        isSubmitting: true // Show loading state
    });

    try {
        // Prepare the payload with all sale IDs
        const saleIds = salesToProcess.map(s => s.id);

        // Make the API call with a shorter timeout for faster response
        const response = await api.post(routes.markAllProcessed,
            { sales_ids: saleIds },
            { timeout: 5000 }
        );

        if (response.data.success) {
            // Update the state optimistically - mark all as processed
            const processedIds = new Set(saleIds);
            setState(prev => ({
                ...prev,
                allSales: prev.allSales.map(s =>
                    processedIds.has(s.id) ? { ...s, bill_printed: "N" } : s
                ),
                isSubmitting: false
            }));

            // Focus back to customer code input again after state updates
            setManagedTimeout(() => {
                refs.customer_code_input.current?.focus();
                refs.customer_code_input.current?.select();
            }, 50);
        } else {
            await refreshSalesData(true);
            updateState({ isSubmitting: false });
            // Refocus after refresh
            setManagedTimeout(() => {
                refs.customer_code_input.current?.focus();
                refs.customer_code_input.current?.select();
            }, 100);
        }
    } catch (err) {
        console.error("Failed to mark sales as processed:", err);
        await refreshSalesData(true);
        updateState({ isSubmitting: false });
        // Refocus after error
        setManagedTimeout(() => {
            refs.customer_code_input.current?.focus();
            refs.customer_code_input.current?.select();
        }, 100);
    }
});
    const printSingleContent = async (html, customerName) => {
        return new Promise((resolve) => {
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) { alert("Please allow pop-ups for printing"); resolve(); return; }
            printWindow.document.open();
            printWindow.document.write(`<!DOCTYPE html><html><head><title>Print Bill - ${customerName}</title><style>body { margin: 0; padding: 20px; }@media print { body { padding: 0; } }</style></head><body>${html}<script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 1000); }, 500); }; window.onafterprint = function() { setTimeout(function() { window.close(); }, 500); };</script></body></html>`);
            printWindow.document.close();
            const checkPrintWindow = setManagedInterval(() => {
                if (printWindow.closed) {
                    clearManagedInterval(checkPrintWindow);
                    resolve();
                }
            }, 500);
            setManagedTimeout(() => {
                clearManagedInterval(checkPrintWindow);
                if (!printWindow.closed) printWindow.close();
                resolve();
            }, 10000);
        });
    };

  const buildFullReceiptHTML = (salesData, billNo, customerName, mobile, globalLoanAmount = 0, billSize = '3inch') => {
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
    let totalAmountSum = 0;
    const consolidatedSummary = {};

    salesData.forEach(s => {
        const itemName = s.item_name || 'Unknown';
        if (!consolidatedSummary[itemName]) consolidatedSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
        consolidatedSummary[itemName].totalWeight += parseFloat(s.weight) || 0;
        consolidatedSummary[itemName].totalPacks += parseInt(s.packs) || 0;
        totalAmountSum += parseFloat(s.total) || 0;
    });

    const totalPacksSum = Object.values(consolidatedSummary).reduce((sum, item) => sum + item.totalPacks, 0);
    const is4Inch = billSize === '4inch';

    // CLEAN FONT SETTINGS - 80mm paper
    const receiptMaxWidth = '80mm';
    const contentWidth = '72mm';

    const fontSizeBody = '16px';
    const fontSizeHeader = '16px';
    const fontSizeTotal = '20px';
    const fontSizeSmall = '13px';
    const fontSizeXSmall = '11px';

    const itemsHtml = salesData.map(s => {
        const packs = parseInt(s.packs) || 0;
        const weight = parseFloat(s.weight) || 0;
        const price = parseFloat(s.price_per_kg) || 0;
        const value = (weight * price).toFixed(2);

        return `
<tr style="font-size:${fontSizeBody}; font-weight:900; vertical-align: middle; line-height:1.4; page-break-inside: avoid;">
    <td style="text-align:left; padding:3px 2px; white-space: nowrap;">
    <span style="font-size:${fontSizeBody};">
        ${s.item_name || ""}
    </span><br>
    <span style="font-size:${fontSizeXSmall}; font-weight:bold;">
        ${formatNumber(packs)} 
    </span>
</td>
    <td style="text-align:right; padding:3px 2px; white-space: nowrap; min-width: 25px; font-size:${fontSizeBody};">
        ${formatNumber(weight.toFixed(2))}
    </td>
    <td style="text-align:right; padding:3px 2px; white-space: nowrap; min-width: 25px; font-size:${fontSizeBody};">
        ${formatNumber(price.toFixed(2))}
    </td>
    <td style="text-align:right; padding:3px 2px; white-space: nowrap; min-width: 30px;">
        <div style="font-size:${fontSizeXSmall}; font-weight:bold; white-space:nowrap; color:#555;">${s.supplier_code || "ASW"}</div>
        <div style="font-size:${fontSizeBody}; font-weight:900; white-space:nowrap;">${formatNumber(value)}</div>
    </td>
</tr>`;
    }).join("");

    const totalSales = salesData.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0);
    const totalPackCost = salesData.reduce((sum, s) => sum + ((parseFloat(s.CustomerPackCost) || 0) * (parseFloat(s.packs) || 0)), 0);
    const finalGrandTotal = totalSales + totalPackCost;
    const givenAmount = salesData.find(s => parseFloat(s.given_amount) > 0)?.given_amount || 0;
    const remaining = givenAmount > 0 ? Math.abs(givenAmount - finalGrandTotal) : 0;

    const loanRow = globalLoanAmount !== 0 ? `
<tr>
    <td style="font-size:${fontSizeSmall}; padding-top:4px; white-space: nowrap; font-weight:bold;">පෙර ණය:</td>
    <td style="text-align:right; font-size:${fontSizeSmall}; font-weight:bold; padding-top:4px; white-space: nowrap;">
        Rs. ${formatNumber(Math.abs(globalLoanAmount).toFixed(2))}
    </td>
</tr>` : '';

    const summaryEntries = Object.entries(consolidatedSummary);
    let summaryHtmlContent = '';
    for (let i = 0; i < summaryEntries.length; i += 2) {
        const [name1, d1] = summaryEntries[i];
        const [name2, d2] = summaryEntries[i + 1] || [null, null];
        const text1 = `${name1}:${formatNumber(d1.totalWeight)}/${formatNumber(d1.totalPacks)}`;
        const text2 = d2 ? `${name2}:${formatNumber(d2.totalWeight)}/${formatNumber(d2.totalPacks)}` : '';
        const combinedText = d2 ? `${text1}  ${text2}` : text1;
        summaryHtmlContent += `
<tr>
    <td style="padding:3px 2px; width:100%; font-weight:bold; white-space:nowrap; text-align:center; font-size:${fontSizeXSmall};" colspan="2">${combinedText}</td>
</tr>`;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Print Receipt</title>
    <style>
        /* CRITICAL: Reset all margins for thermal printer */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        /* XP-80 Thermal Printer Settings */
        @page {
            size: ${receiptMaxWidth} auto;
            margin: 0;
            padding: 0;
        }
        
        @media print {
            html, body {
                margin: 0;
                padding: 0;
                width: ${receiptMaxWidth};
                background: white;
                font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            }
            
            .receipt-content {
                width: ${contentWidth};
                margin: 0 auto;
                padding: 3px 4px;
                background: #fff;
                font-size: ${fontSizeBody};
                box-sizing: border-box;
                overflow: hidden;
                page-break-after: avoid;
                page-break-inside: avoid;
            }
            
            .receipt-content * {
                max-width: 100%;
                box-sizing: border-box;
                font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            }
            
            .no-break {
                page-break-inside: avoid;
                page-break-after: avoid;
            }
            
            .total-section {
                page-break-inside: avoid;
                page-break-after: avoid;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                page-break-inside: auto;
            }
            
            /* ===== CRITICAL FIX: Prevent table header from repeating on each page ===== */
            /* This forces the browser to treat the header as a normal row group */
            thead {
                display: table-row-group !important;
                page-break-after: avoid;
                page-break-inside: avoid;
            }
            
            /* Override the default repeating header behavior */
            table {
                page-break-inside: auto;
            }
            
            /* Make tbody work normally */
            tbody {
                display: table-row-group;
                page-break-inside: auto;
            }
            
            /* Remove the conflicting header-row-fix class */
            /* .header-row-fix {
                display: table-row;
            } */
            /* ===== END CRITICAL FIX ===== */
            
            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
            
            td, th {
                padding: 2px 3px;
                font-size: ${fontSizeBody};
            }
            
            .divider {
                border: none;
                border-top: 2px solid #000;
                margin: 4px 0;
                width: 100%;
            }
            
            .footer-section {
                margin-top: 8px;
                padding-top: 6px;
                border-top: 2px solid #000;
                width: 100%;
                page-break-after: avoid;
                page-break-inside: avoid;
            }
            
            .cut-marker {
                text-align: center;
                font-size: 10px;
                color: #999;
                margin-top: 10px;
                padding-top: 6px;
                border-top: 1px dotted #ccc;
                letter-spacing: 2px;
                page-break-after: avoid;
            }
            
            .net-payable {
                color: #000;
                font-size: ${fontSizeTotal};
                font-weight: 900;
                border-bottom: 3px double #000;
                border-top: 2px solid #000;
                padding: 3px 8px;
                display: inline-block;
                white-space: nowrap;
                letter-spacing: 0.5px;
            }
            
            .no-extra-space {
                height: 0;
                margin: 0;
                padding: 0;
            }
            
            .space-before-footer {
                height: 8px;
                margin: 0;
                padding: 0;
            }
            
            .header-title {
                font-size: 22px;
                font-weight: 900;
                white-space: nowrap;
                letter-spacing: 1px;
            }
            
            .header-subtitle {
                font-size: ${fontSizeXSmall};
                font-weight: bold;
                font-style: italic;
                white-space: nowrap;
                color: #333;
            }
            
            .header-code {
                border: 2px solid #000;
                padding: 2px 8px;
                font-size: 24px;
                font-weight: 900;
                white-space: nowrap;
            }
            
            .header-name {
                border: 2px solid #000;
                padding: 2px 8px;
                font-size: 22px;
                font-weight: 900;
                white-space: nowrap;
                max-width: 60%;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .bill-info {
                font-size: ${fontSizeSmall};
                font-weight: bold;
                padding: 2px 2px;
                width: 100%;
            }
            
            .bill-info span {
                font-weight: normal;
            }
            
            .table-header th {
                font-size: ${fontSizeHeader};
                font-weight: 900;
                text-align: left;
                padding: 2px 2px;
                border-bottom: 2px solid #000;
            }
            
            .table-header th:not(:first-child) {
                text-align: right;
            }
            
            .summary-text {
                font-size: ${fontSizeXSmall};
                font-weight: bold;
            }
            
            .total-label {
                font-size: ${fontSizeTotal};
                font-weight: 900;
                padding: 2px 2px;
                white-space: nowrap;
            }
            
            .total-amount {
                text-align: right;
                padding: 2px 2px;
            }
            
            .footer-text {
                margin: 2px 0;
                font-weight: bold;
                white-space: nowrap;
                text-align: center;
                font-size: ${fontSizeSmall};
            }
            
            .footer-text-small {
                margin: 2px 0;
                white-space: nowrap;
                text-align: center;
                font-size: ${fontSizeXSmall};
            }
        }
        
        /* Print-specific fixes */
        @media print and (min-width: 0px) {
            table {
                page-break-inside: auto;
            }
            
            tr {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
<div class="receipt-content">
    <!-- HEADER -->
    <div class="no-break">
        <div style="text-align:center; font-weight:bold; padding:2px 0; width:100%;">
            <div class="header-title">මංජු සහ සහෝදරයෝ</div>
            <div class="header-subtitle">colombage lanka (Pvt) Ltd</div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin:4px 0; width:100%;">
                <span class="header-code">N66</span>
                <span class="header-name">${(salesData[0]?.customer_code || 'CUSTOMER').toUpperCase()}</span>
            </div>
            
            <div style="font-size:${fontSizeXSmall}; white-space:nowrap; font-weight:bold; color:#444;">එළවළු, පළතුරු තොග වෙළෙන්දෝ</div>
            <div style="display:flex; justify-content:space-between; font-size:${fontSizeSmall}; padding:2px 2px; width:100%; font-weight:bold;">
                <span style="white-space:nowrap;">බණ්ඩාරවෙල</span>
                <span style="white-space:nowrap;">${time}</span>
            </div>
        </div>

        <!-- CONTACT & BILL INFO -->
        <div class="bill-info">
            <div style="font-weight:bold; white-space:nowrap;">දුර: 0777672838 / 0714371115</div>
            <div style="display:flex; justify-content:space-between; width:100%;">
                <span style="white-space:nowrap;">බිල් අං: <strong>${billNo}</strong></span>
                <span style="white-space:nowrap;">දිනය: <strong>${date}</strong></span>
            </div>
        </div>

        <hr class="divider">

        <!-- ITEMS TABLE -->
        <table style="width:100%; border-collapse:collapse; font-size:${fontSizeBody}; table-layout: fixed;">
            <colgroup>
                <col style="width: 32%;">
                <col style="width: 20%;">
                <col style="width: 20%;">
                <col style="width: 28%;">
            </colgroup>
            <thead class="table-header" style="page-break-after: avoid; display: table-header-group;">
                <tr style="border-bottom:2px solid #000; font-weight:bold; page-break-after: avoid;">
                    <th style="text-align:left; padding:2px 2px;">වර්ගය<br>මලු</th>
                    <th style="text-align:right; padding:2px 2px;">කිලෝ</th>
                    <th style="text-align:right; padding:2px 2px;">මිල</th>
                    <th style="text-align:right; padding:2px 2px;">අයිතිය<br>අගය</th>
                </tr>
            </thead>
            <tbody style="page-break-inside: auto;">
                ${itemsHtml}
            </tbody>
        </table>

        <!-- SUMMARY -->
        <div style="margin-top:4px; border-top:2px solid #000; padding-top:3px; width:100%;">
            <table style="width:100%; border-collapse:collapse; font-size:${fontSizeXSmall}; text-align:center;">
                <tbody>
                    ${summaryHtmlContent || '<tr><td colspan="2" style="padding:2px; font-weight:bold;">No items</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- TOTALS -->
    <div class="total-section">
        <table style="width:100%; margin-top:4px; font-weight:bold; border-collapse:collapse;">
            <colgroup>
                <col style="width: 50%;">
                <col style="width: 50%;">
            </colgroup>
            <tbody>
                <tr>
                    <td style="font-size:${fontSizeSmall}; padding:2px 2px; white-space:nowrap;">මලු:</td>
                    <td style="text-align:right; font-size:${fontSizeSmall}; padding:2px 2px; white-space:nowrap;">
                        ${formatNumber(totalPackCost.toFixed(2))}
                    </td>
                </tr>
                <tr>
                    <td class="total-label">එකතුව:</td>
                    <td class="total-amount">
                        <span class="net-payable">Rs. ${Number(finalGrandTotal || 0).toFixed(2)}</span>
                    </td>
                </tr>
                ${loanRow}
                ${givenAmount > 0 ? `
                <tr>
                    <td style="font-size:${fontSizeSmall}; padding:2px 2px; white-space:nowrap;">දුන් මුදල:</td>
                    <td style="text-align:right; font-size:${fontSizeSmall}; padding:2px 2px; font-weight:bold; white-space:nowrap;">
                        ${formatNumber((0).toFixed(2))}
                    </td>
                </tr>
                <tr>
                    <td style="font-size:${fontSizeSmall}; white-space:nowrap;">ඉතිරිය:</td>
                    <td style="text-align:right; font-size:${fontSizeSmall}; white-space:nowrap;">${formatNumber((0).toFixed(2))}</td>
                </tr>` : ''}
            </tbody>
        </table>

        <!-- FOOTER WITH SPACE BEFORE CUT -->
        <div class="space-before-footer"></div>
        
        <div class="footer-section">
            <p class="footer-text">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p>
            <p class="footer-text-small">නැවත භාර ගනු නොලැබේ</p>
        </div>
        
        <!-- CUT MARKER with extra space -->
        <div class="cut-marker">- - - - - - - - - - - - - - - - - - - - - -</div>
        <div style="height: 6px; margin: 0; padding: 0;"></div>
    </div>
</div>
</body>
</html>`;
};
    const formatReceiptValue = (value) => {
        if (value === null || value === undefined || value === '') return '0.00';
        const num = parseFloat(value);
        if (isNaN(num)) return '0.00';
        return num.toFixed(2);
    };

    const handlePrintAndClear = useStableCallback(async (preOpenedPrintWindow = null, prefetch = null) => {
        // Ref-based guard is synchronous: repeated F1 presses cannot open duplicate dialogs
        // before React has rendered the isPrinting state update.
        if (printInFlightRef.current) {
            // Stuck print lock recovery — a hung popup must not block F1 all day.
            if (Date.now() - printStartedAtRef.current < PRINT_LOCK_MAX_MS) {
                if (preOpenedPrintWindow && !preOpenedPrintWindow.closed) preOpenedPrintWindow.close();
                return;
            }
            printInFlightRef.current = false;
            updateState({ isPrinting: false });
        }
        printInFlightRef.current = true;
        printStartedAtRef.current = Date.now();
        updateState({ isPrinting: true });

        const finishPrintFlow = (closePreparedWindow = false) => {
            printInFlightRef.current = false;
            printStartedAtRef.current = 0;
            updateState({ isPrinting: false });
            if (closePreparedWindow && preOpenedPrintWindow && !preOpenedPrintWindow.closed) {
                preOpenedPrintWindow.close();
            }
        };

        let customerCode = "";
        let customerName = "";
        let billNo = prefetch?.billNo || "";

        // --- STEP 1: Determine which customer/sales to print ---
        // Prefer rows already resolved on F1 so we can print without a second by-bill round trip.
        let salesToProcess = Array.isArray(prefetch?.salesToProcess) ? prefetch.salesToProcess : [];

        if (salesToProcess.length === 0) {
            if (selectedPrintedCustomer) {
                if (selectedPrintedCustomer.includes('-')) {
                    const [cCode, bNo] = selectedPrintedCustomer.split('-');
                    customerCode = cCode;
                    billNo = bNo;
                    salesToProcess = allSales.filter(s =>
                        String(s.customer_code || '').toUpperCase() === String(cCode).toUpperCase() &&
                        String(s.bill_no || '') === String(bNo)
                    );
                } else {
                    salesToProcess = allSales.filter(s =>
                        s.customer_code === selectedPrintedCustomer &&
                        s.bill_printed === 'Y'
                    );
                    if (salesToProcess.length > 0) {
                        billNo = salesToProcess[0].bill_no || "";
                    }
                }
            } else if (selectedUnprintedCustomer) {
                salesToProcess = allSales.filter(s =>
                    s.customer_code === selectedUnprintedCustomer &&
                    (s.bill_printed === 'N' || !s.bill_printed || s.bill_printed === '')
                );
                const saleWithBillNo = salesToProcess.find(s => s.bill_no);
                if (saleWithBillNo) {
                    billNo = saleWithBillNo.bill_no;
                }
            } else {
                salesToProcess = displayedSales.filter(s => s.id);
                const saleWithBillNo = salesToProcess.find(s => s.bill_no);
                if (saleWithBillNo) {
                    billNo = saleWithBillNo.bill_no;
                }
            }
        } else if (!billNo) {
            const saleWithBillNo = salesToProcess.find(s => s.bill_no);
            if (saleWithBillNo) billNo = saleWithBillNo.bill_no;
            if (selectedPrintedCustomer && selectedPrintedCustomer.includes('-')) {
                billNo = selectedPrintedCustomer.split('-')[1] || billNo;
            }
        }

        // --- STEP 2: Group sales by customer to ensure ALL are marked ---
        const salesByCustomer = new Map();
        salesToProcess.forEach(sale => {
            const custCode = sale.customer_code;
            if (!salesByCustomer.has(custCode)) {
                salesByCustomer.set(custCode, []);
            }
            salesByCustomer.get(custCode).push(sale);
        });

        // --- STEP 3: If no bill_no, generate one ---
        if (!billNo && salesToProcess.length > 0) {
            try {
                customerCode = salesToProcess[0].customer_code;
                customerName = salesToProcess[0].customer_name || customerCode;

                // Collect ALL sale IDs from ALL customers
                const allSaleIds = [];
                for (const [custCode, sales] of salesByCustomer) {
                    sales.forEach(s => allSaleIds.push(s.id));
                }

                const printResponse = prefetch?.markPrintedPromise
                    ? await prefetch.markPrintedPromise
                    : await api.post(routes.markPrinted, {
                        sales_ids: allSaleIds,  // ALL sales, not just first group
                        telephone_no: formData.telephone_no,
                        customer_code: customerCode,
                        customer_name: customerName,
                        loan_amount: 0
                    }, { timeout: API_TIMEOUT_MS });

                if (printResponse.data.status !== "success") {
                    throw new Error("මුද්‍රණය අසාර්ථකයි");
                }

                billNo = printResponse.data.customer_bill_no || "";

                if (!billNo) {
                    alert("බිල්පත් අංකය උත්පාදනය කිරීමට නොහැකි විය");
                    finishPrintFlow(true);
                    return;
                }
            } catch (error) {
                console.error("Error generating bill:", error);
                alert("බිල්පත සෑදීමේදී දෝෂයක් ඇති විය: " + error.message);
                finishPrintFlow(true);
                return;
            }
        }

        // --- STEP 4: VALIDATE we have a bill_no ---
        if (!billNo) {
            alert("මුද්‍රණය කිරීමට බිල්පත් අංකයක් නොමැත! කරුණාකර පළමුව බිල්පතක් සාදන්න.");
            finishPrintFlow(true);
            return;
        }

        // --- STEP 5: Use already-loaded rows; avoid a redundant by-bill network round trip ---
        // allSales is kept fresh by the page refresh loop. Printing from it makes F1 near-instant
        // instead of waiting on getSalesByBillNo after the dialog already opened.
        let salesData = salesToProcess;

        if (!salesData || salesData.length === 0) {
            // Rare fallback only when local rows are missing (e.g. deep-linked bill).
            try {
                const response = await api.get(`${routes.getSalesByBillNo}/${billNo}`, {
                    timeout: API_TIMEOUT_MS
                });
                salesData = response.data;
            } catch (error) {
                console.error("Error fetching sales data by bill_no:", error);
                alert("දත්ත ලබා ගැනීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.");
                finishPrintFlow(true);
                return;
            }
        }

        if (!salesData || salesData.length === 0) {
            alert(`බිල්පත් අංකය ${billNo} සඳහා දත්ත සොයාගත නොහැක`);
            finishPrintFlow(true);
            return;
        }

        customerCode = salesData[0].customer_code;
        customerName = salesData[0].customer_name || customerCode;

        // --- STEP 6: EARLY VALIDATION - Check for zero/one price ---
        const hasZeroOrOnePrice = salesData.some(s => parseFloat(s.price_per_kg) === 0 || parseFloat(s.price_per_kg) === 1);
        if (hasZeroOrOnePrice) {
            alert("මිල 0 හෝ 1 ලෙස ඇති අයිතම මුද්‍රණය කළ නොහැක.");
            finishPrintFlow(true);
            return;
        }

        // --- STEP 7: COMMISSION VALIDATION ---
        for (const s of salesData) {
            if (parseFloat(s.price_per_kg) === parseFloat(s.SupplierPricePerKg)) {
                const errorMsg = `කේතය: ${s.supplier_code} හි කොමිස් මුදල් අඩුකර නොමැත. කරුණාකර පාරිභෝගිකයා පද්ධතියට ඇතුළත් කර අදාළ ඡායාරූප (Profile, NIC) එක් කරන්න.`;
                alert(errorMsg);
                finishPrintFlow(true);
                return;
            }
        }

        // --- STEP 8: Prepare for printing ---
        try {
            const mobile = salesData[0].mobile || "0777672838 / 071437115";

            // --- STEP 9: Loan data (already cached on customer select) ---
            const normalizedCustomerCode = String(customerCode || '').trim().toUpperCase();
            const currentLoan = loanCacheRef.current.has(normalizedCustomerCode)
                ? loanCacheRef.current.get(normalizedCustomerCode)
                : (parseFloat(loanAmount) || 0);

            // --- STEP 10: CHECK IF REPRINT ---
            const isReprint = salesData.some(s => s.bill_printed === 'Y');

            // --- STEP 11: GENERATE RECEIPT HTML ---
            const receiptHtml = buildFullReceiptHTML(
                salesData,
                billNo,
                customerName,
                mobile,
                currentLoan,
                billSize
            );

            // --- STEP 12: OPEN / FILL PRINT WINDOW ---
            const printWindow = preOpenedPrintWindow || window.open("", "_blank", "width=800,height=600");
            if (!printWindow) {
                alert("Please allow pop-ups for printing");
                finishPrintFlow();
                return;
            }

            printWindow.document.open();
            printWindow.document.write(`
        <html>
            <head>
                <title>Print Bill - ${isReprint ? 'Reprint' : 'New Bill'}</title>
                <style>
                    body { margin: 0; padding: 20px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                ${receiptHtml}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 100);
                    };
                <\/script>
            </body>
        </html>
    `);
            printWindow.document.close();

            // --- STEP 13: CLEANUP ---
            updateState({
                selectedPrintedCustomer: null,
                selectedUnprintedCustomer: null,
                isPrinting: false
            });

            handleClearForm(true);
            setManagedTimeout(() => refreshSalesData(true), 1500);

            // Monitor print window
            let printSafetyTimeoutId = null;
            const checkWindowClosed = setManagedInterval(() => {
                if (printWindow.closed) {
                    clearManagedInterval(checkWindowClosed);
                    if (printSafetyTimeoutId) {
                        window.clearTimeout(printSafetyTimeoutId);
                        activeTimeoutsRef.current.delete(printSafetyTimeoutId);
                    }
                    finishPrintFlow();
                    if (refs.customer_code_input.current) {
                        refs.customer_code_input.current.focus();
                        refs.customer_code_input.current.select();
                    }
                }
            }, 500);

            printSafetyTimeoutId = setManagedTimeout(() => {
                clearManagedInterval(checkWindowClosed);
                finishPrintFlow();
            }, PRINT_LOCK_MAX_MS);

        } catch (error) {
            console.error("Printing error:", error);
            alert("මුද්‍රණය කිරීමේදී දෝෂයක් ඇති විය. Error: " + error.message);
            finishPrintFlow(true);
        }
    });
    const handleBillSizeChange = useStableCallback((e) => updateState({ billSize: e.target.value }));


    // Subscribe once for the lifetime of the page; the stable callback always sees fresh
    // Subscribe once for the lifetime of the page; the stable callback always sees fresh
    // state, so this listener no longer detaches/re-attaches on every keystroke's render.
    const handleShortcut = useStableCallback((e) => {
        if (e.key === "F10") {
            e.preventDefault();
            // This reloads the entire page from the server
            window.location.reload();
        }

        if (e.key === "F1") {
            e.preventDefault();
            if (e.repeat) return;
            if (printInFlightRef.current) {
                if (Date.now() - printStartedAtRef.current < PRINT_LOCK_MAX_MS) return;
                printInFlightRef.current = false;
                updateState({ isPrinting: false });
            }

            // --- GATHER SALES DATA FOR VALIDATION ---
            let salesDataToValidate = [];
            let billNo = "";

            if (selectedPrintedCustomer) {
                if (selectedPrintedCustomer.includes('-')) {
                    const [cCode, bNo] = selectedPrintedCustomer.split('-');
                    billNo = bNo || "";
                    salesDataToValidate = allSales.filter(s =>
                        String(s.customer_code || '').toUpperCase() === String(cCode).toUpperCase() &&
                        String(s.bill_no || '') === String(bNo)
                    );
                } else {
                    salesDataToValidate = allSales.filter(s =>
                        s.customer_code === selectedPrintedCustomer &&
                        s.bill_printed === 'Y'
                    );
                    billNo = salesDataToValidate[0]?.bill_no || "";
                }
            } else if (selectedUnprintedCustomer) {
                salesDataToValidate = allSales.filter(s =>
                    s.customer_code === selectedUnprintedCustomer &&
                    (s.bill_printed === 'N' || !s.bill_printed || s.bill_printed === '')
                );
                billNo = salesDataToValidate.find(s => s.bill_no)?.bill_no || "";
            } else {
                salesDataToValidate = displayedSales.filter(s => s.id);
                billNo = salesDataToValidate.find(s => s.bill_no)?.bill_no || "";
            }

            if (salesDataToValidate.length === 0) {
                alert("මුද්‍රණය කිරීමට දත්ත නොමැත!");
                return;
            }

            // --- VALIDATION 1: Check for zero or one price ---
            const hasZeroOrOnePrice = salesDataToValidate.some(s =>
                parseFloat(s.price_per_kg) === 0 || parseFloat(s.price_per_kg) === 1
            );

            if (hasZeroOrOnePrice) {
                alert("මිල 0 හෝ 1 ලෙස ඇති අයිතම මුද්‍රණය කළ නොහැක.");
                return;
            }

            // --- VALIDATION 2: Check for missing commission ---
            for (const s of salesDataToValidate) {
                if (parseFloat(s.price_per_kg) === parseFloat(s.SupplierPricePerKg)) {
                    alert(`කේතය: ${s.supplier_code} හි කොමිස් මුදල් අඩුකර නොමැත. කරුණාකර පාරිභෝගිකයා පද්ධතියට ඇතුළත් කර අදාළ ඡායාරූප (Profile, NIC) එක් කරන්න.`);
                    return;
                }
            }

            // Fire markPrinted immediately (before window.open) so the network round trip
            // overlaps with opening the print dialog — bill is ready as soon as possible.
            let markPrintedPromise = null;
            if (!billNo) {
                const customerCode = salesDataToValidate[0].customer_code;
                const customerName = salesDataToValidate[0].customer_name || customerCode;
                markPrintedPromise = api.post(routes.markPrinted, {
                    sales_ids: salesDataToValidate.map(s => s.id),
                    telephone_no: formData.telephone_no,
                    customer_code: customerCode,
                    customer_name: customerName,
                    loan_amount: 0
                }, { timeout: API_TIMEOUT_MS });
            }

            // Open synchronously inside the keyboard event so browsers don't treat it as a popup.
            const printWindow = window.open("", "_blank", "width=800,height=600");
            if (!printWindow) {
                if (markPrintedPromise) void markPrintedPromise.catch(() => { });
                alert("Please allow pop-ups for printing");
                return;
            }
            printWindow.document.open();
            printWindow.document.write(`
                <!doctype html>
                <html>
                    <head><title>Preparing bill…</title></head>
                    <body style="font-family:Arial,sans-serif;text-align:center;padding:40px">
                        <strong>Preparing bill…</strong>
                    </body>
                </html>
            `);
            printWindow.document.close();

            handlePrintAndClear(printWindow, {
                salesToProcess: salesDataToValidate,
                billNo,
                markPrintedPromise
            });
            return;
        }

        if (selectedPrintedCustomer && e.key === "F5") {
            e.preventDefault();
            return;
        }

        // In the handleShortcut function, update the F5 handler:
        if (e.key === "F5") {
            e.preventDefault();
            // Call the function directly without any delays
            handleMarkAllProcessed();
            return;
        }
    });

    useEffect(() => {
        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [handleShortcut]);

    //new function to save phone no 
    const savePhoneNumber = async () => {
        const phoneNumber = formData.telephone_no;
        const customerCode = formData.customer_code || autoCustomerCode;

        if (!phoneNumber || !customerCode) {
            alert("Please enter both phone number and customer code");
            return;
        }

        try {
            const response = await api.post('/customers/check-or-create', {
                short_name: customerCode,
                telephone_no: phoneNumber
            }, { timeout: API_TIMEOUT_MS });

            if (response.data.customer) {
                // Update the customer name if returned
                setFormData(prev => ({
                    ...prev,
                    customer_name: response.data.customer.name || prev.customer_name
                }));
                // Hide the save button after saving
                updateState({ showSavePhoneButton: false });

                // Focus on given_amount field after saving
                setManagedTimeout(() => {
                    if (refs.given_amount.current) {
                        refs.given_amount.current.focus();
                        refs.given_amount.current.select();
                    }
                }, 100);
            }
        } catch (err) {
            console.error("Failed to save phone number:", err);
            alert("Failed to save phone number. Please try again.");
        }
    };

    const hasData = allSales.length > 0 || customers.length > 0 || items.length > 0 || suppliers.length > 0;

    // Stable props for the memoized sidebar lists; inline arrows here would defeat
    // React.memo and re-render both full lists on every keystroke in the form.
    const handlePrintedSearchChange = useStableCallback((value) => updateState({ searchQueries: { ...searchQueries, printed: value } }));
    const handleUnprintedSearchChange = useStableCallback((value) => updateState({ searchQueries: { ...searchQueries, unprinted: value } }));
    const toggleCashFilter = useStableCallback(() => updateState({ isCashFilterActive: !state.isCashFilterActive }));

    // Option lists for the two react-selects. These were rebuilt (filter + sort + map over
    // the whole catalog) inside JSX on every render, i.e. on every keystroke of any field.
    const customerSelectOptions = useMemo(() => (
        customers
            .filter(c => !customerSearchInput || String(c.short_name).charAt(0).toUpperCase() === customerSearchInput.charAt(0).toUpperCase())
            .map(c => ({ value: c.short_name, label: `${c.short_name}` }))
    ), [customers, customerSearchInput]);

    const itemSelectOptions = useMemo(() => {
        const input = (state.itemSearchInput || "").toUpperCase();
        return items
            .filter(item => !input || String(item.no).toUpperCase().startsWith(input))
            .sort((a, b) => {
                const isANumeric = !isNaN(a.no);
                const isBNumeric = !isNaN(b.no);
                if (isANumeric && !isBNumeric) return 1;
                if (!isANumeric && isBNumeric) return -1;
                return String(a.no).toUpperCase().localeCompare(String(b.no).toUpperCase());
            })
            .map(item => ({
                value: item.no,
                label: `${item.no} - ${item.type}`,
                item,
            }));
    }, [items, state.itemSearchInput]);

    return (
        <Layout style={{ backgroundColor: '#99ff99' }} billSize={billSize} handleBillSizeChange={handleBillSizeChange}>
            <div className="sales-layout" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {isLoading && (<div className="fixed top-0 left-0 right-0 bg-blue-500 text-white py-1 text-center text-sm z-50">Refreshing data...</div>)}
                {state.isPrinting && (<div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black py-1 text-center text-sm z-50">Printing in progress... Please wait</div>)}

                {/* --- ADDED ADMIN MODAL --- */}
                <AdminDataTableModal
                    isOpen={isAdminModalOpen}
                    onClose={() => updateState({ isAdminModalOpen: false })}
                    title={modalTitle}
                    sales={modalData}
                    type={modalType}
                    formatDecimal={formatDecimal}
                />

                <div className="three-column-layout" style={{ opacity: isLoading ? 0.7 : 1, display: 'grid', gridTemplateColumns: '200px 1fr 200px', gap: '16px', padding: '10px', marginTop: '-149px' }}>
                    <div className="left-sidebar" style={{ backgroundColor: '#1ec139ff', borderRadius: '0.75rem', maxHeight: '80.5vh', overflowY: 'auto' }}>

                        {hasData ? (
                            <CustomerList type="printed" searchQuery={searchQueries.printed} onSearchChange={handlePrintedSearchChange} selectedPrintedCustomer={selectedPrintedCustomer} selectedUnprintedCustomer={selectedUnprintedCustomer} handleCustomerClick={handleCustomerClick} allSales={allSales} isCashFilterActive={state.isCashFilterActive} toggleCashFilter={toggleCashFilter} />
                        ) : (
                            <div className="w-full shadow-xl rounded-xl overflow-y-auto border border-black p-4 text-center" style={{ backgroundColor: "#1ec139ff", maxHeight: "80.5vh" }}>
                                <div style={{ backgroundColor: "#006400" }} className="p-1 rounded-t-xl">
                                    <h2 className="font-bold text-white mb-1 whitespace-nowrap text-center" style={{ fontSize: '14px' }}>
                                        මුද්‍රණය කළ
                                    </h2>
                                </div>
                                <div className="py-4">
                                    <p className="text-gray-700">මුද්‍රණය කළ ගනුදෙනු දත්ත නොමැත.</p>
                                </div>
                            </div>
                        )}
                    </div>


                    <div className="center-form flex flex-col" style={{ backgroundColor: '#111439ff', padding: '20px', borderRadius: '0.75rem', color: 'white', minHeight: '100vh', height: 'auto', boxSizing: 'border-box', gridColumnStart: 2, gridColumnEnd: 3 }}>
                        {currentUser?.role === 'Admin' ? (
                            <div className="admin-farmer-view h-full flex flex-col">
                                <div className="flex flex-row overflow-hidden" style={{ minHeight: "60vh", width: "100%", display: "flex", flexDirection: "row", justifyContent: "center", gap: "20px" }}>
                                    {/* --- Left Column: Printed Farmers --- */}
                                    <div
                                        style={{ width: "300px", height: "850px", flexShrink: 0 }}
                                        className="flex flex-col bg-gray-800 rounded-xl border border-gray-600 overflow-hidden"
                                    >
                                        <div className="bg-green-800 p-2 text-center font-bold">
                                            මුද්‍රණය කළ ගොවීන්
                                        </div>

                                        <div
                                            className="p-2 flex-grow"
                                            style={{ height: "calc(100% - 48px)", overflowY: "auto" }}
                                        >
                                            <input type="text" placeholder="සොයන්න..." className="w-full p-2 mb-2 rounded bg-white text-black text-sm" style={{ textTransform: "uppercase" }} value={searchQueries.farmerPrinted || ""} onChange={e => updateState({ searchQueries: { ...searchQueries, farmerPrinted: e.target.value.toUpperCase() } })} />
                                            {printedFarmers.length > 0 ? (
                                                printedFarmers
                                                    .filter((f) => !searchQueries.farmerPrinted || f.supplier_code.includes(searchQueries.farmerPrinted))
                                                    .map((f) => (
                                                        <div
                                                            key={f.supplier_code}
                                                            onClick={() =>
                                                                updateState({
                                                                    isAdminModalOpen: true,
                                                                    modalType: "farmer",
                                                                    modalTitle: `ගොවියා: ${f.supplier_code}`,
                                                                    modalData: allSales.filter(s => s.supplier_code === f.supplier_code && s.supplier_bill_printed === "Y"),
                                                                })
                                                            }
                                                            className="p-1 mb-2 bg-white text-black font-bold rounded-lg border-l-4 border-green-500 shadow hover:bg-gray-100 cursor-pointer"
                                                        >
                                                            Code: {f.supplier_code}
                                                        </div>
                                                    ))
                                            ) : (
                                                <p className="text-center text-gray-400 mt-4">No data found</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* --- Right Column: Unprinted Farmers --- */}
                                    <div
                                        style={{ width: "300px", height: "850px", flexShrink: 0 }}
                                        className="flex flex-col bg-gray-800 rounded-xl border border-gray-600 overflow-hidden"
                                    >
                                        <div className="bg-red-800 p-2 text-center font-bold">
                                            මුද්‍රණය නොකළ ගොවීන්
                                        </div>

                                        <div
                                            className="p-2 flex-grow"
                                            style={{ height: "calc(100% - 48px)", overflowY: "scroll" }}
                                        >
                                            <input
                                                type="text"
                                                placeholder="සොයන්න..."
                                                className="w-full p-2 mb-2 rounded bg-white text-black text-sm"
                                                style={{ textTransform: "uppercase" }}
                                                value={searchQueries.farmerUnprinted || ""}
                                                onChange={(e) => {
                                                    const upper = e.target.value.toUpperCase();
                                                    updateState({
                                                        searchQueries: {
                                                            ...searchQueries,
                                                            farmerUnprinted: upper,
                                                        },
                                                    });
                                                }}
                                            />

                                            {unprintedFarmers.length > 0 ? (
                                                unprintedFarmers
                                                    .filter((f) => !searchQueries.farmerUnprinted || f.supplier_code.includes(searchQueries.farmerUnprinted))
                                                    .map((f) => (
                                                        <div
                                                            key={f.supplier_code}
                                                            onClick={() =>
                                                                updateState({
                                                                    isAdminModalOpen: true,
                                                                    modalType: "farmer",
                                                                    modalTitle: `ගොවියා: ${f.supplier_code}`,
                                                                    modalData: allSales.filter(s => s.supplier_code === f.supplier_code && s.supplier_bill_printed !== "Y"),
                                                                })
                                                            }
                                                            className="p-1 mb-2 bg-white text-black font-bold rounded-lg border-l-4 border-red-500 shadow hover:bg-gray-100 cursor-pointer"
                                                        >
                                                            Code: {f.supplier_code}
                                                        </div>
                                                    ))
                                            ) : (
                                                <p className="text-center text-gray-400 mt-4">No data found</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="pos-sales-view flex flex-col h-full">
                                <div className="flex-shrink-0">
                                    <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
                                        <div className="w-full flex justify-between items-center">
                                            {/* --- TEXT SECTION (Moved Up Independently) --- */}
                                            <div style={{ position: 'relative', top: '-20px', display: 'flex', alignItems: 'center', zIndex: 20 }}>
                                                <div className="font-bold text-lg" style={{ color: 'red', fontSize: '1.35rem' }}>
                                                    බිල් අං: {currentBillNo}
                                                </div>
                                                <div className="font-bold text-xl whitespace-nowrap" style={{ color: 'red', marginLeft: '100px', fontSize: '1.15rem' }}>

                                                    මුළු විකුණුම්: Rs. {formatDecimal(totalSalesValue)}
                                                </div>
                                            </div>
                                            {/* --- PHOTO SECTION (Stays in original position) --- */}
                                            <div className="flex gap-10 items-center justify-start mt-4 mb-4 relative" style={{ minHeight: '150px' }}>
                                                {/* CUSTOMER PHOTO */}
                                                {state.customerProfilePic && (
                                                    <div onClick={() => handleImageClick('customer')}
                                                        className="cursor-pointer hover:scale-105 transition-transform"
                                                        style={{ position: 'absolute', left: '805px', top: '100px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', zIndex: 10 }}>
                                                        <span className="text-xs text-gray-400">ගැ</span>
                                                        <div style={{ width: '100px', height: '100px', backgroundColor: 'white', border: '5px solid #1ec139', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                            <img src={state.customerProfilePic} alt="Customer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* SUPPLIER PHOTO */}
                                                {state.supplierProfilePic && (
                                                    <div onClick={() => handleImageClick('supplier')}
                                                        className="cursor-pointer hover:scale-105 transition-transform"
                                                        style={{ position: 'absolute', left: '940px', top: '100px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                                                        <span className="text-xs text-gray-400">සැ</span>
                                                        <div style={{ width: '100px', height: '100px', backgroundColor: 'white', border: '5px solid #3b82f6', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                            <img src={state.supplierProfilePic} alt="Supplier Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        </div>
                                                    </div>
                                                )}

                                                <ImagePreviewModal
                                                    isOpen={state.isImageModalOpen}
                                                    onClose={() => updateState({ isImageModalOpen: false })}
                                                    data={state.selectedImageData}
                                                />
                                            </div>
                                        </div>
                                        <div
                                            className="flex items-end gap-3 w-full"
                                            style={{ marginTop: '-160px' }} // Adjust this number until it looks perfect
                                        >
                                            {/* STACK TELEPHONE + CUSTOMER CODE VERTICALLY */}
                                            <div className="flex flex-col gap-2 w-full">
                                                {/* TELEPHONE NUMBER FIELD - Moved up independently using relative positioning */}
                                                <div className="flex-1 min-w-0" style={{ position: 'relative', top: '-50px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input
                                                            id="telephone_no"
                                                            ref={refs.telephone_no}
                                                            name="telephone_no"
                                                            value={formData.telephone_no || ""}
                                                            type="text"
                                                            placeholder="දුරකථන අංකය"
                                                            disabled={true}
                                                            className="px-2 py-1 font-bold text-sm w-full border rounded text-black placeholder-gray-500"
                                                        />
                                                        {state.showSavePhoneButton && (
                                                            <button
                                                                onClick={savePhoneNumber}
                                                                style={{
                                                                    backgroundColor: '#4CAF50',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '8px 16px',
                                                                    borderRadius: '0.5rem',
                                                                    cursor: 'pointer',
                                                                    fontWeight: 'bold',
                                                                    fontSize: '0.9rem',
                                                                    whiteSpace: 'nowrap',
                                                                    height: '36px'
                                                                }}
                                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                                                            >
                                                                Save
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* CUSTOMER CODE FIELD - Stays in its original position */}
                                                <div className="flex-1 min-w-0" style={{ marginTop: '-40px' }}>
                                                    <input id="customer_code_input" ref={refs.customer_code_input} name="customer_code" value={formData.customer_code || autoCustomerCode} onChange={(e) => handleInputChange("customer_code", e.target.value.toUpperCase())} onKeyDown={(e) => handleKeyDown(e, "customer_code_input")} type="text" placeholder="පාරිභෝගික කේතය" className="px-2 py-1 uppercase font-bold text-sm w-full border rounded bg-white text-black placeholder-gray-500" style={{ backgroundColor: '#0d0d4d', border: '1px solid #4a5568', color: 'white', height: '36px', fontSize: '1rem', padding: '0 0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }} />
                                                </div>
                                            </div>
                                            <div style={{ flex: '0 0 150px', minWidth: '120px', marginLeft: '-100px' }}>
                                                <Select id="customer_code_select" ref={refs.customer_code_select} value={formData.customer_code ? { value: formData.customer_code, label: `${formData.customer_code}` } : null} onChange={handleCustomerSelect} options={customerSelectOptions} onInputChange={(v, { action }) => action === "input-change" && updateState({ customerSearchInput: v.toUpperCase() })} inputValue={customerSearchInput} placeholder="පාරිභෝගිකයා තෝරන්න" isClearable isSearchable styles={{ control: b => ({ ...b, minHeight: "36px", height: "36px", fontSize: "25px", backgroundColor: "white", borderColor: "#4a5568", borderRadius: "0.5rem" }), valueContainer: b => ({ ...b, padding: "0 6px", height: "36px" }), placeholder: b => ({ ...b, fontSize: "12px", color: "#a0aec0" }), input: b => ({ ...b, fontSize: "12px", color: "black", fontWeight: "bold" }), singleValue: b => ({ ...b, color: "black", fontSize: "12px", fontWeight: "bold" }), option: (b, s) => ({ ...b, color: "black", fontWeight: "bold", fontSize: "12px", backgroundColor: s.isFocused ? "#e5e7eb" : "white", cursor: "pointer" }) }} />
                                            </div>
                                            <div style={{ flex: '0 0 60px', minWidth: '120px' }}>
                                                <input id="price_per_kg" ref={refs.price_per_kg} name="price_per_kg" type="text" value={formData.price_per_kg} onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && handleInputChange('price_per_kg', e.target.value)} onKeyDown={(e) => handleKeyDown(e, "price_per_kg")} placeholder="එකවර මිල" className="px-2 py-1 uppercase font-bold text-sm w-full border rounded bg-white text-black placeholder-gray-500" style={{ backgroundColor: '#0d0d4d', border: '1px solid #4a5568', color: 'white', height: '36px', fontSize: '1rem', padding: '0 0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="rounded-lg border relative bg-white flex items-center justify-start pl-2 pt-2.5" style={{ flex: "0 0 100px", marginLeft: "5px", height: "36px" }}>
                                                    <span className="absolute left-2 top-1 text-gray-400 text-[10px] pointer-events-none">
                                                        Loan Amount
                                                    </span>
                                                    <span className="text-black font-bold text-sm">
                                                        Rs. {loanAmount < 0 ? formatDecimal(Math.abs(loanAmount)) : formatDecimal(loanAmount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", columnGap: "8px", alignItems: "end", marginTop: "8px" }}>
                                            <div style={{ gridColumnStart: 1, gridColumnEnd: 3 }}>
                                                <input id="supplier_code" ref={refs.supplier_code} name="supplier_code" value={formData.supplier_code} onChange={(e) => handleInputChange("supplier_code", e.target.value.toUpperCase())} onKeyDown={(e) => handleKeyDown(e, "supplier_code")} type="text" placeholder="සැපයුම්කරු" className="px-2 py-1 uppercase font-bold text-xs border rounded bg-white text-black placeholder-gray-500 w-full" style={{ width: "150px", backgroundColor: '#0d0d4d', border: '1px solid #4a5568', color: 'white', height: '44px', fontSize: '1.25rem', padding: '0 1rem', borderRadius: '0.5rem', boxSizing: 'border-box' }} />
                                            </div>
                                            <div style={{ gridColumnStart: 5, gridColumnEnd: 7, marginLeft: "-120px", marginRight: "-2px" }}>
                                                {(() => {
                                                    const currentFilteredOptions = itemSelectOptions;

                                                    return (
                                                        <div
                                                            onKeyDown={(e) => {
                                                                // This wrapper captures Enter before React Select
                                                                if (e.key === "Enter" && state.itemSearchInput !== "+") {
                                                                    const select = refs.item_code_select.current;
                                                                    if (select && select.state.menuIsOpen) {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();

                                                                        // Get the highlighted index from the select's state
                                                                        let idx = select.state.highlightedIndex;

                                                                        // If highlightedIndex is -1 or undefined, try to get it from the focused option
                                                                        if (idx === undefined || idx === -1) {
                                                                            const focusedOption = select.state.focusedOption || select.state.highlightedOption;
                                                                            if (focusedOption && typeof focusedOption === 'object') {
                                                                                idx = currentFilteredOptions.findIndex(
                                                                                    opt => opt.value === focusedOption.value
                                                                                );
                                                                            }
                                                                        }

                                                                        // If we still don't have a valid index and there's only one option, use it
                                                                        if ((idx === undefined || idx === -1) && currentFilteredOptions.length === 1) {
                                                                            idx = 0;
                                                                        }

                                                                        // If we have a valid index, select that option
                                                                        if (idx !== undefined && idx !== -1 && idx < currentFilteredOptions.length) {
                                                                            const optionToSelect = currentFilteredOptions[idx];
                                                                            if (optionToSelect) {
                                                                                // Manually trigger the selection
                                                                                handleItemSelect(optionToSelect);
                                                                                updateState({ itemSearchInput: "" });

                                                                                // Force close the menu
                                                                                select.setState({
                                                                                    menuIsOpen: false,
                                                                                    inputValue: ""
                                                                                });

                                                                                // Focus on weight field
                                                                                setManagedTimeout(() => {
                                                                                    refs.weight.current?.focus();
                                                                                    refs.weight.current?.select();
                                                                                }, 50);
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <Select
                                                                ref={refs.item_code_select}
                                                                openMenuOnFocus
                                                                isSearchable
                                                                tabSelectsValue={false}   // important for POS
                                                                closeMenuOnSelect
                                                                blurInputOnSelect={false}
                                                                inputValue={state.itemSearchInput}
                                                                options={currentFilteredOptions}
                                                                placeholder="භාණ්ඩය"

                                                                value={
                                                                    formData.item_code
                                                                        ? {
                                                                            value: formData.item_code,
                                                                            label: `${formData.item_code} - ${formData.item_name}`,
                                                                        }
                                                                        : null
                                                                }

                                                                onInputChange={(value, meta) => {
                                                                    if (meta.action === "input-change") {
                                                                        updateState({ itemSearchInput: value.toUpperCase() });
                                                                    }
                                                                }}

                                                                onChange={(selectedOption) => {
                                                                    if (!selectedOption) return;

                                                                    handleItemSelect(selectedOption);
                                                                    updateState({ itemSearchInput: "" });

                                                                    setManagedTimeout(() => {
                                                                        refs.weight.current?.focus();
                                                                        refs.weight.current?.select();
                                                                    }, 50);
                                                                }}

                                                                onKeyDown={(e) => {
                                                                    // 🔥 "+" shortcut for last sale from displayedSales (sorted by date)
                                                                    if (e.key === "Enter" && state.itemSearchInput === "+") {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();

                                                                        // Get the latest sale by sorting the displayedSales by timestamp/date
                                                                        const sortedSales = [...displayedSales].sort((a, b) => {
                                                                            const dateA = new Date(a.timestamp || a.created_at || a.date || 0);
                                                                            const dateB = new Date(b.timestamp || b.created_at || b.date || 0);
                                                                            return dateB - dateA;
                                                                        });

                                                                        const lastSale = sortedSales[0];

                                                                        if (lastSale) {
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                item_code: lastSale.item_code,
                                                                                item_name: lastSale.item_name,
                                                                                pack_due: lastSale.pack_due || 0,
                                                                                price_per_kg: lastSale.price_per_kg || ''
                                                                            }));

                                                                            updateState({
                                                                                itemSearchInput: "",
                                                                                gridPricePerKg: lastSale.price_per_kg || ""
                                                                            });

                                                                            setManagedTimeout(() => {
                                                                                refs.weight.current?.focus();
                                                                                refs.weight.current?.select();
                                                                            }, 50);
                                                                        } else {
                                                                            console.log("No sales available");
                                                                        }
                                                                        return;
                                                                    }

                                                                    // IMPORTANT: Let the wrapper div handle Enter for selection
                                                                    // For regular Enter, the wrapper div will handle it
                                                                    // Allow other keys to work normally (arrow keys, etc.)
                                                                    // Don't prevent default for other keys
                                                                }}

                                                                className="react-select-container font-bold text-sm w-full"

                                                                styles={{
                                                                    control: base => ({
                                                                        ...base,
                                                                        height: "44px",
                                                                        minHeight: "44px",
                                                                        fontSize: "1.25rem",
                                                                        backgroundColor: "white",
                                                                        borderColor: "#4a5568",
                                                                        borderRadius: "0.5rem",
                                                                    }),
                                                                    valueContainer: base => ({
                                                                        ...base,
                                                                        padding: "0 1rem",
                                                                        height: "44px"
                                                                    }),
                                                                    input: base => ({
                                                                        ...base,
                                                                        color: "black",
                                                                        fontSize: "1.25rem"
                                                                    }),
                                                                    singleValue: base => ({
                                                                        ...base,
                                                                        color: "black",
                                                                        fontWeight: "bold",
                                                                        fontSize: "1.25rem",
                                                                    }),
                                                                    option: (base, state) => ({
                                                                        ...base,
                                                                        fontWeight: "bold",
                                                                        color: "black",
                                                                        backgroundColor: state.isFocused ? "#e5e7eb" : "white",
                                                                        fontSize: "1rem",
                                                                    }),
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {[{ id: 'weight', placeholder: "බර", fieldRef: refs.weight },
                                            { id: 'price_per_kg_grid_item', placeholder: "මිල", fieldRef: refs.price_per_kg_grid_item },
                                            { id: 'packs', placeholder: "අසුරුම්", fieldRef: refs.packs },
                                            { id: 'total', placeholder: "TOTAL", fieldRef: refs.total, isReadOnly: true }].map(({ id, placeholder, fieldRef, isReadOnly = false }) => (
                                                <div key={id} style={{ ...(id === 'weight' && { gridColumnStart: 8, gridColumnEnd: 9, marginLeft: "-70px", width: "100px" }), ...(id === 'price_per_kg_grid_item' && { gridColumnStart: 9, gridColumnEnd: 10, marginLeft: "-30px", width: "105px" }), ...(id === 'packs' && { gridColumnStart: 10, gridColumnEnd: 11 }), ...(id === 'total' && { gridColumnStart: 11, gridColumnEnd: 14, marginLeft: "10px" }) }}>
                                                    <input id={id} ref={fieldRef} name={id} type="text" value={id === 'price_per_kg_grid_item' ? gridPricePerKg : formData[id]} onChange={(e) => id === 'price_per_kg_grid_item' ? handleInputChange(id, e.target.value) : (/^\d*\.?\d*$/.test(e.target.value) && handleInputChange(id, e.target.value))} onKeyDown={(e) => handleKeyDown(e, id)} placeholder={placeholder} readOnly={isReadOnly} className="px-2 py-1 uppercase font-bold text-xs border rounded bg-white text-black placeholder-gray-500 text-center" style={{ backgroundColor: isReadOnly ? '#e2e8f0' : 'white', borderRadius: '0.5rem', textAlign: 'right', fontSize: '1.125rem', height: '40px', boxSizing: 'border-box', width: '100%' }} />
                                                </div>
                                            ))}
                                        </div>
                                        <button type="button" tabIndex={-1} style={{ display: "none" }} aria-hidden="true"></button>
                                    </form>
                                    {errors.form && <div className="mt-6 p-3 bg-red-100 text-red-700 rounded-xl">{errors.form}</div>}
                                </div>
                                <div className="flex-grow overflow-y-auto mt-1">
                                    {displayedSales.length === 0 ? (<div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">විකුණුම් වාර්තා කිසිවක් හමු නොවීය.</div>) : (
                                        <table className="min-w-full border-gray-200 rounded-xl" style={{ backgroundColor: '#000000', color: 'white', borderCollapse: 'collapse', margin: '0px 0', width: '100%', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#000000' }}>
                                                    {['Sup code', 'කේතය', 'අයිතමය', 'බර(kg)', 'මිල', 'අගය', 'මලු', 'Actions'].map((header, index) => (
                                                        <th key={index} className="border" style={{ backgroundColor: '#f5fafb', color: '#000000', padding: '6px 8px', fontSize: '11px', fontWeight: 'bold' }}>{header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {displayedSales.map((s, idx) => {
                                                    const isZeroPrice = parseFloat(s.price_per_kg) === 1;
                                                    const cellStyle = {
                                                        padding: '6px 8px',
                                                        fontSize: '12px',
                                                        color: isZeroPrice ? '#FF0000' : 'white',
                                                        // Remove backgroundColor or set it to transparent
                                                        backgroundColor: 'transparent'
                                                    };
                                                    return (
                                                        <tr key={s.id || `${s.customer_code || 'sale'}-${s.item_code || 'item'}-${idx}`}
                                                            tabIndex={0}
                                                            className="text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            onClick={() => handleEditClick(s)}
                                                            onKeyDown={(e) => handleTableRowKeyDown(e, s)}>
                                                            <td className="border" style={cellStyle}>{s.supplier_code}</td>
                                                            <td className="border" style={cellStyle}>{s.item_code}</td>
                                                            <td className="border" style={{ padding: '6px 8px', fontSize: '16px', fontFamily: 'inherit', fontWeight: 'normal', color: isZeroPrice ? '#FF0000' : '#FFFFFF', textTransform: 'none', backgroundColor: 'transparent' }}>{s.item_name}</td>
                                                            <td className="border" style={cellStyle}>{formatDecimal(s.weight)}</td>
                                                            <td className="border" style={cellStyle}>{formatDecimal(s.price_per_kg)}</td>
                                                            <td className="border" style={cellStyle}>{formatDecimal((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0) + (parseFloat(s.packs) || 0) * (parseFloat(s.pack_due) || 0))}</td>
                                                            <td className="border" style={cellStyle}>{s.packs}</td>
                                                            <td className="border text-center" style={{ padding: '6px 8px', backgroundColor: 'transparent' }}>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(s.id); }} className="text-black font-bold rounded-full bg-white hover:bg-gray-200" style={{ padding: '2px 6px', fontSize: '11px' }}>
                                                                    🗑️
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                    {displayedSales.length > 0 && (<SalesSummaryFooter sales={displayedSales} formatDecimal={formatDecimal} />)}
                                    <div
                                        className="flex items-center space-x-3 overflow-x-auto whitespace-nowrap"
                                        style={{ marginTop: "-75px" }}  // adjust value as needed
                                    >
                                        <div style={{ marginLeft: '660px', marginTop: '-2px', display: "none" }}>
                                            <input id="given_amount" ref={refs.given_amount} name="given_amount_field" type="tel" inputMode="numeric" autoComplete="new-password" value={formData.given_amount ? Number(formData.given_amount).toLocaleString() : ""} onChange={(e) => handleInputChange("given_amount", e.target.value.replace(/,/g, ""))} onKeyDown={(e) => handleKeyDown(e, "given_amount")} placeholder="දුන් මුදල" className="px-4 py-2 border rounded-xl text-right bg-white text-black" style={{ width: "180px", fontWeight: "bold", fontSize: "1.1rem" }} />
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start"><ItemSummary sales={displayedSales} formatDecimal={formatDecimal} /><BreakdownDisplay sale={selectedSaleForBreakdown} formatDecimal={formatDecimal} /></div>
                                    <div className="flex items-center justify-between mb-4" style={{ marginTop: "35px" }}>
                                        {/* Red Total Text */}
                                        <div className="flex items-center justify-between mb-4" style={{ marginTop: "35px" }}>
                                            {/* Red Total Text - Only show when displayedSales has records */}
                                            {displayedSales.length > 0 && (
                                                <div className="text-2xl font-bold" style={{ color: 'red' }}>
                                                    (විකුණුම්: Rs. {formatDecimal(salesTotal)} + මල්ලක අගය: Rs. {formatDecimal(packCostTotal)} )
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="right-sidebar" style={{ backgroundColor: '#1ec139ff', borderRadius: '0.75rem', maxHeight: '80.5vh', overflowY: 'auto', gridColumnStart: 3, gridColumnEnd: 4 }}>
                        {hasData ? (<CustomerList type="unprinted" searchQuery={searchQueries.unprinted} onSearchChange={handleUnprintedSearchChange} selectedPrintedCustomer={selectedPrintedCustomer} selectedUnprintedCustomer={selectedUnprintedCustomer} handleCustomerClick={handleCustomerClick} allSales={allSales} />) : (
                            <div className="w-full shadow-xl rounded-xl overflow-y-auto border border-black p-4 text-center" style={{ backgroundColor: "#1ec139ff", maxHeight: "80.5vh" }}>
                                <div style={{ backgroundColor: "#006400" }} className="p-1 rounded-t-xl"><h2 className="font-bold text-white mb-1 whitespace-nowrap text-center" style={{ fontSize: '14px' }}>මුද්‍රණය නොකළ</h2></div><div className="py-4"><p className="text-gray-700">මුද්‍රණය නොකළ විකුණුම් කිසිවක් සොයාගත නොහැක</p></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}