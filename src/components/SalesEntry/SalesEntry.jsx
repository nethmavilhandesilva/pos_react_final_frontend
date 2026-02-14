import React, { useState, useEffect, useMemo, useRef } from "react";
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
    getCustomerGivenAmount: "/sales/customer/given-amount"
};

// --- Sub-Components ---

const BreakdownDisplay = ({ sale, formatDecimal }) => {
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
};

// --- Admin Modal Component (Popup Window) ---
const AdminDataTableModal = ({ isOpen, onClose, title, sales, type, formatDecimal, billSize = '3inch' }) => {
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
};
const ImagePreviewModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const baseUrl = "https://talentconnect.lk/sms_new_backend/application/public/storage/";

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
};
const CustomerList = React.memo(({ customers, type, searchQuery, onSearchChange, selectedPrintedCustomer, selectedUnprintedCustomer, handleCustomerClick, formatDecimal, allSales, lastUpdate, isCashFilterActive, toggleCashFilter }) => {
    const getPrintedCustomerGroups = () => {
        const groups = {};
        allSales.filter(s => s.bill_printed === 'Y' && s.bill_no).forEach(sale => {

            // --- UPDATED FILTER LOGIC ---
            if (type === "printed") {
                if (isCashFilterActive) {
                    // When ticked: show only 'N' (Cash)
                    if (sale.credit_transaction !== 'Y') return;
                } else {
                    // When unticked (Default): show only 'Y' (Credit)
                    if (sale.credit_transaction !== 'N') return;
                }
            }

            const groupKey = `${sale.customer_code}-${sale.bill_no}`;
            if (!groups[groupKey]) groups[groupKey] = {
                customerCode: sale.customer_code,
                billNo: sale.bill_no,
                displayText: sale.customer_code
            };
        });
        return groups;
    };
    const getUnprintedCustomers = () => {
        const customerMap = {};
        allSales.filter(s => s.bill_printed === 'N').forEach(sale => {
            const customerCode = sale.customer_code;
            const saleTimestamp = new Date(sale.timestamp || sale.created_at || sale.date || sale.id);
            if (!customerMap[customerCode] || saleTimestamp > new Date(customerMap[customerCode].latestTimestamp)) {
                customerMap[customerCode] = { customerCode, latestTimestamp: sale.timestamp || sale.created_at || sale.date || sale.id, originalItem: customerCode };
            }
        });
        return customerMap;
    };

    const printedCustomerGroups = type === "printed" ? getPrintedCustomerGroups() : {};
    const unprintedCustomerMap = type === "unprinted" ? getUnprintedCustomers() : {};

    const filteredPrintedGroups = useMemo(() => {
        if (type !== "printed") return [];
        let groupsArray = Object.values(printedCustomerGroups);
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            groupsArray = groupsArray.filter(g => g.customerCode.toLowerCase().startsWith(lowerQuery) || g.billNo.toString().toLowerCase().startsWith(lowerQuery) || g.displayText.toLowerCase().startsWith(lowerQuery));
        }
        return groupsArray.sort((a, b) => (parseInt(b.billNo) || 0) - (parseInt(a.billNo) || 0));
    }, [printedCustomerGroups, searchQuery, type]);

    const filteredUnprintedCustomers = useMemo(() => {
        if (type !== "unprinted") return [];
        let customersArray = Object.values(unprintedCustomerMap);
        if (searchQuery) customersArray = customersArray.filter(c => c.customerCode.toLowerCase().startsWith(searchQuery.toLowerCase()));
        return customersArray.sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp));
    }, [unprintedCustomerMap, searchQuery, type]);

    const displayItems = type === "printed" ? filteredPrintedGroups : filteredUnprintedCustomers;
    const isSelected = (item) => type === "printed" ? selectedPrintedCustomer === `${item.customerCode}-${item.billNo}` : selectedUnprintedCustomer === item.customerCode;

    return (
        <div key={`${type}-${lastUpdate || ''}`} className="w-full shadow-xl rounded-xl overflow-y-auto border border-black" style={{ backgroundColor: "#1ec139ff", maxHeight: "80.5vh", overflowY: "auto" }}>
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
                            if (type === "printed") {
                                customerCode = item.customerCode;
                                displayText = item.displayText;
                                billSales = allSales.filter(s => s.customer_code === item.customerCode && s.bill_no === item.billNo);
                                totalAmount = billSales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0);
                            } else {
                                customerCode = item.customerCode;
                                displayText = item.customerCode;
                                billSales = allSales.filter(s => s.customer_code === item.customerCode && (s.bill_printed === 'N' || !s.bill_printed || s.bill_printed === ''));
                                totalAmount = billSales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0);
                            }
                            const isItemSelected = isSelected(item);
                            const buttonText = `${displayText.replace(/\n/g, ' ')} - ${formatDecimal(totalAmount)}`;

                            return (
                                <li key={type === "printed" ? `${item.customerCode}-${item.billNo}` : item.customerCode} className="flex">
                                    <button onClick={() => handleCustomerClick(type, customerCode, item.billNo || null, billSales)} className={`py-1 mb-2 rounded-xl border ${isItemSelected ? "border-blue-600" : "bg-gray-50 hover:bg-gray-100 border-gray-200"}`} style={isItemSelected ? { backgroundColor: '#93C5FD', paddingLeft: '05px', width: '280px', textAlign: 'left' } : { paddingLeft: '1px', width: '280px', textAlign: 'left' }}>
                                        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'inherit', width: '100%' }} className={`font-semibold ${isItemSelected ? 'text-black' : 'text-gray-700'}`} title={buttonText}>{buttonText}</span>
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

const ItemSummary = ({ sales }) => {

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
};


const SalesSummaryFooter = ({ sales, formatDecimal }) => {
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

    const finalPayable = totals.billTotal + totals.totalBagPrice + totals.totalLabour;

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
                <span className="font-bold text-sm" style={{ marginLeft: '6px' }}>{formatDecimal(totals.totalLabour)}</span>
            </div>
            <div className="flex flex-row items-center whitespace-nowrap px-4 border-r border-gray-700 h-full ml-auto" style={{ transform: 'translateY(-72px)' }}>
                <span className="text-gray-400 uppercase text-[10px] mr-2" style={{ marginLeft: '480px' }}>ගෙවිය:</span>
                <span className="font-bold text-sm text-yellow-400" style={{ marginLeft: '6px' }}>{formatDecimal(finalPayable)}</span>
            </div>
        </div>
    );
};

// --- Main Export Component ---
const initialFormData = { customer_code: "", customer_name: "", supplier_code: "", code: "", item_code: "", item_name: "", weight: "", price_per_kg: "", pack_due: "", total: "", packs: "", given_amount: "", pack_cost: "", telephone_no: "", };
const fieldOrder = ["telephone_no", "customer_code_input", "customer_code_select", "supplier_code", "item_code_select", "weight", "price_per_kg_grid_item", "packs", "total"];
const skipMap = { telephone_no: "customer_code_input", customer_code_input: "supplier_code", customer_code_select: "supplier_code", given_amount: "supplier_code", supplier_code: "item_code_select", item_code_select: "weight", price_per_kg: "packs", price_per_kg_grid_item: "packs" };

export default function SalesEntry() {
    const refs = {
        telephone_no: useRef(null), customer_code_input: useRef(null), customer_code_select: useRef(null), given_amount: useRef(null),
        supplier_code: useRef(null), item_code_select: useRef(null), item_name: useRef(null),
        weight: useRef(null), price_per_kg: useRef(null), packs: useRef(null), total: useRef(null),
        price_per_kg_grid_item: useRef(null),
    };

    const [state, setState] = useState({
        allSales: [], selectedPrintedCustomer: null, selectedUnprintedCustomer: null, editingSaleId: null,
        searchQueries: { printed: "", unprinted: "", farmerPrinted: "", farmerUnprinted: "" }, errors: {}, loanAmount: 0, isManualClear: false,
        isSubmitting: false, formData: initialFormData, packCost: 0, customerSearchInput: "", itemSearchInput: "",
        supplierSearchInput: "", currentBillNo: null, isLoading: false, customers: [], items: [], suppliers: [],
        forceUpdate: null, windowFocused: null, isPrinting: false, billSize: '3inch', priceManuallyChanged: false,
        gridPricePerKg: "", selectedSaleForBreakdown: null,
        currentUser: null,
        isAdminModalOpen: false, modalTitle: "", modalData: [], modalType: "", isGivenAmountManuallyTouched: false, filterOnlyCash: false, customerProfilePic: null, supplierProfilePic: null, customerNameDisplay: "", supplierNameDisplay: "", isImageModalOpen: false, selectedImageData: { profile: null, nic_front: null, nic_back: null, title: "" },
    });

    const setFormData = (updater) => setState(prev => ({ ...prev, formData: typeof updater === 'function' ? updater(prev.formData) : updater }));
    const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

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
        newSales: allSales.filter(s => s.id && s.bill_printed !== 'Y' && s.bill_printed !== 'N'),
        printedSales: allSales.filter(s => s.bill_printed === 'Y'),
        unprintedSales: allSales.filter(s => s.bill_printed === 'N' || !s.bill_printed || s.bill_printed === '')
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

    const printedCustomers = useMemo(() => filterCustomers(printedSales, searchQueries.printed, true), [printedSales, searchQueries.printed]);
    const unprintedCustomers = useMemo(() => filterCustomers(unprintedSales, searchQueries.unprinted), [unprintedSales, searchQueries.unprinted]);

    const displayedSales = useMemo(() => {
        let sales = newSales;

        if (selectedUnprintedCustomer) {
            // Filter by customer code for unprinted records
            sales = [...sales, ...unprintedSales.filter(s => s.customer_code === selectedUnprintedCustomer)];
        }
        else if (selectedPrintedCustomer) {
            if (selectedPrintedCustomer.includes('-')) {
                // Split the key "CODE-BILLNO" and filter by both fields
                const [cCode, bNo] = selectedPrintedCustomer.split('-');
                sales = [...sales, ...printedSales.filter(s =>
                    s.customer_code === cCode && String(s.bill_no) === String(bNo)
                )];
            } else {
                // Fallback for single code selection
                sales = [...sales, ...printedSales.filter(s => s.customer_code === selectedPrintedCustomer)];
            }
        }

        return sales.slice().reverse();
    }, [newSales, unprintedSales, printedSales, selectedUnprintedCustomer, selectedPrintedCustomer]);

    const autoCustomerCode = useMemo(() => displayedSales.length > 0 && !isManualClear ? displayedSales[0].customer_code || "" : "", [displayedSales, isManualClear]);
    const currentBillNo = useMemo(() => {
        if (selectedPrintedCustomer && selectedPrintedCustomer.includes('-')) return selectedPrintedCustomer.split('-')[1] || "N/A";
        if (selectedPrintedCustomer) return printedSales.find(s => s.customer_code === selectedPrintedCustomer)?.bill_no || "N/A";
        return "";
    }, [selectedPrintedCustomer, printedSales]);

    const formatDecimal = (value) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(value || 0));
    };


    const fetchLoanAmount = async (customerCode) => {
        if (!customerCode) return updateState({ loanAmount: 0 });
        try {
            const response = await api.post(routes.getLoanAmount, { customer_short_name: customerCode });
            updateState({ loanAmount: parseFloat(response.data.total_loan_amount) || 0 });
        } catch { updateState({ loanAmount: 0 }); }
    };

    const fetchInitialData = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('user'));
            const [resSales, resCustomers, resItems, resSuppliers] = await Promise.all([
                api.get(routes.sales), api.get(routes.customers), api.get(routes.items), api.get(routes.suppliers)
            ]);
            const salesData = resSales.data.data || resSales.data.sales || resSales.data || [];
            const customersData = resCustomers.data.data || resCustomers.data.customers || resCustomers.data || [];
            const itemsData = resItems.data.data || resItems.data.items || resItems.data || [];
            const suppliersData = resSuppliers.data.data || resSuppliers.data.suppliers || resSuppliers.data || [];
            updateState({
                allSales: salesData,
                customers: customersData,
                items: itemsData,
                suppliers: suppliersData,
                isLoading: false,
                currentUser: userData
            });
        } catch {
            updateState({ errors: { form: 'Failed to load data. Check console.' } });
        }
    };

    useEffect(() => {
        if (displayedSales.length > 0) {
            const totals = displayedSales.reduce((acc, s) => {
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
            const calculatedFinal = totals.billTotal + totals.totalBagPrice + totals.totalLabour;
            setFormData(prev => prev.given_amount === null || prev.given_amount === "" ? { ...prev, given_amount: calculatedFinal.toFixed(2) } : prev);
        } else {
            setFormData(prev => ({ ...prev, given_amount: "" }));
        }
    }, [displayedSales]);
    useEffect(() => {
        // Determine the code to search for: manually entered, phone-matched, or sidebar-selected
        const code = formData.customer_code || autoCustomerCode;

        if (code && customers.length > 0) {
            const customer = customers.find(c =>
                String(c.short_name).toUpperCase() === String(code).toUpperCase()
            );

            if (customer) {
                const baseUrl = "http://localhost:8000/public/storage";
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
                const baseUrl = "https://talentconnect.lk/sms_new_backend/application/public";
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
        const packs = parseInt(formData.packs) || 0;
        const packDue = parseFloat(formData.pack_due) || 0;
        const total = (w * p);
        setFormData(prev => ({ ...prev, total: Number(total.toFixed(2)) }));
        if (!state.priceManuallyChanged) updateState({ gridPricePerKg: formData.price_per_kg });
    }, [formData.weight, formData.price_per_kg, formData.packs, formData.pack_due]);

    useEffect(() => {
        const handleWindowFocus = () => updateState(prev => ({ ...prev, windowFocused: Date.now() }));
        window.addEventListener('focus', handleWindowFocus);
        return () => window.removeEventListener('focus', handleWindowFocus);
    }, []);

    useEffect(() => { fetchInitialData(); refs.customer_code_input.current?.focus(); }, []);

    const handleKeyDown = async (e, currentFieldName) => {
        if (e.key === "Enter") {
            e.preventDefault();

            // 1. Handle Given Amount
            if (currentFieldName === "given_amount") {
                handleSubmitGivenAmount(e).then(() => handlePrintAndClear());
                return;
            }

            // 2. Handle Item Packs
            if (currentFieldName === "packs") return handleSubmit(e);

            // 3. Logic for TELEPHONE input (Reverse Lookup)
            if (currentFieldName === "telephone_no") {
                const typedPhone = (formData.telephone_no || "").trim();
                if (typedPhone) {
                    const match = customers.find(c => String(c.telephone_no).trim() === typedPhone);
                    if (match) {
                        setFormData(prev => ({
                            ...prev,
                            customer_code: match.short_name,
                            customer_name: match.name
                        }));
                        fetchLoanAmount(match.short_name);
                    }
                }
                refs.customer_code_input.current?.focus();
                return;
            }

            // 4. Logic for CUSTOMER CODE input (Automatic Telephone Fetching)
            if (currentFieldName === "customer_code_input") {
                const code = (formData.customer_code || autoCustomerCode).trim().toUpperCase();
                const currentPhone = (formData.telephone_no || "").trim();

                if (code) {
                    // LOCAL LOOKUP: Find in the loaded 'customers' array based on short_name
                    const match = customers.find(c => String(c.short_name).toUpperCase() === code);

                    if (match) {
                        // Update state immediately with found data
                        setFormData(prev => ({
                            ...prev,
                            telephone_no: match.telephone_no || "",
                            customer_name: match.name || ""
                        }));
                        fetchLoanAmount(code);
                    }

                    // BACKEND SYNC: Keep database record updated or create if new
                    try {
                        const response = await api.post('/customers/check-or-create', {
                            short_name: code,
                            telephone_no: currentPhone || (match ? match.telephone_no : "")
                        });

                        if (response.data.customer) {
                            setFormData(prev => ({
                                ...prev,
                                telephone_no: response.data.customer.telephone_no || prev.telephone_no,
                                customer_name: response.data.customer.name || prev.customer_name
                            }));
                        }
                    } catch (err) {
                        console.error("Customer sync failed", err);
                    }
                }
                refs.supplier_code.current?.focus();
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
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        nextRef.current.focus();
                        if (!nextFieldName.includes("select")) nextRef.current.select();
                    }, 0);
                });
            }
        }
    };

    const salesTotal = displayedSales.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0);
    const packCostTotal = displayedSales.reduce((sum, s) => sum + ((parseFloat(s.CustomerPackCost) || 0) * (parseFloat(s.packs) || 0)), 0);
    const totalSalesValue = salesTotal + packCostTotal;

    const handleInputChange = (field, value) => {
        if (field === 'price_per_kg') {
            setFormData(prev => ({ ...prev, [field]: value }));
            updateState({ priceManuallyChanged: true, gridPricePerKg: value });
        } else if (field === 'price_per_kg_grid_item') {
            setFormData(prev => ({ ...prev, 'price_per_kg': value }));
            updateState({ gridPricePerKg: value, priceManuallyChanged: false });
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }

        if (field === 'customer_code') {
            const trimmedValue = value.trim();
            updateState({ isManualClear: value === '' });
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
        if (field === 'telephone_no') {
            const phoneVal = value.trim();
            setFormData(prev => ({ ...prev, telephone_no: value }));

            if (phoneVal) {
                // Find the customer that matches this phone number
                const match = customers.find(c => String(c.telephone_no).trim() === phoneVal);

                if (match) {
                    const matchedCode = match.short_name;

                    // 1. Update form data with matched code and name
                    setFormData(prev => ({
                        ...prev,
                        customer_code: matchedCode,
                        customer_name: match.name || ""
                    }));

                    // 2. Fetch loan amount immediately for this code
                    fetchLoanAmount(matchedCode);

                    // 3. Set the selection for the right sidebar (Unprinted list)
                    // This ensures the sidebar highlights the customer automatically
                    updateState({ selectedUnprintedCustomer: matchedCode, selectedPrintedCustomer: null, isManualClear: false });

                } else {
                    // If phone number is cleared or doesn't match, clear the customer fields
                    if (formData.customer_code) {
                        setFormData(prev => ({ ...prev, customer_code: "", customer_name: "" }));
                        updateState({ selectedUnprintedCustomer: null, loanAmount: 0 });
                    }
                }
            }
        }

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
            setFormData(prev => ({ ...prev, item_code: item.no, item_name: item.type, pack_due: fetchedPackDue, weight: editingSaleId ? prev.weight : "", price_per_kg: editingSaleId ? prev.price_per_kg : "", packs: editingSaleId ? prev.packs : "", leading_sales_id: editingSaleId ? prev.leading_sales_id : "", total: editingSaleId ? prev.total : "" }));
            updateState({ packCost: fetchedPackCost, itemSearchInput: "", gridPricePerKg: editingSaleId ? formData.price_per_kg : "" });
            setTimeout(() => refs.weight.current?.focus(), 100);
        } else {
            setFormData(prev => ({ ...prev, item_code: "", item_name: "", pack_due: "", price_per_kg: "", weight: "", packs: "", leading_sales_id: "", total: "" }));
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
        setTimeout(() => { refs.price_per_kg.current?.focus(); refs.price_per_kg.current?.select(); }, 100);
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

            setTimeout(() => {
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

        setTimeout(() => {
            refs.weight.current?.focus();
            refs.weight.current?.select();
        }, 0);
    };

    const handleTableRowKeyDown = (e, sale) => { if (e.key === "Enter") { e.preventDefault(); handleEditClick(sale); } };

    const handleClearForm = (clearBillNo = false) => {
        setFormData(initialFormData);
        updateState({ editingSaleId: null, loanAmount: 0, isManualClear: false, packCost: 0, customerSearchInput: "", itemSearchInput: "", supplierSearchInput: "", priceManuallyChanged: false, gridPricePerKg: "", isGivenAmountManuallyTouched: false, selectedSaleForBreakdown: null, ...(clearBillNo && { currentBillNo: null }) });
    };

    const handleDeleteRecord = async (saleId) => {
        if (!saleId || !window.confirm("Are you sure you want to delete this sales record?")) return;
        try {
            await api.delete(`${routes.sales}/${saleId}`);
            updateState({ allSales: allSales.filter(s => s.id !== saleId) });
            if (editingSaleId === saleId) handleClearForm();
        } catch (error) { updateState({ errors: { form: error.response?.data?.message || error.message } }); }
    };

    const handleSubmitGivenAmount = async (e) => {
        if (e) e.preventDefault();
        updateState({ errors: {} });

        const customerCode = formData.customer_code || autoCustomerCode;
        if (!customerCode) return null;

        const salesToUpdate = displayedSales.filter(s => s.id);
        if (salesToUpdate.length === 0) return null;

        try {
            // 1. Get the amount currently typed in the input box
            const currentInputAmount = parseFloat(formData.given_amount) || 0;

            // 2. Calculate what the "Auto-Calculated" total should be right now
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

            const autoCalculatedGrandTotal = totals.billTotal + totals.totalBagPrice + totals.totalLabour;
            const isDifferent = Math.abs(currentInputAmount - autoCalculatedGrandTotal) > 0.01;

            // ✅ Existing condition
            let creditTransaction = isDifferent ? 'Y' : 'N';

            // ✅ NEW CONDITION: if given_amount is 0, force credit_transaction to 'N'
            if (currentInputAmount === 0) {
                creditTransaction = 'N';
            }

            console.log(`Debug: Input(${currentInputAmount}) vs Auto(${autoCalculatedGrandTotal.toFixed(2)}) -> Credit: ${creditTransaction}`);

            const updatePromises = salesToUpdate.map(sale =>
                api.put(`${routes.sales}/${sale.id}/given-amount`, {
                    given_amount: currentInputAmount,
                    credit_transaction: creditTransaction
                })
            );

            const results = await Promise.all(updatePromises);

            // Reset the flag for UI safety
            updateState({ isGivenAmountManuallyTouched: false });

            const updatedSalesFromApi = results.map(response => response.data.sale);
            const updatedSalesMap = {};
            updatedSalesFromApi.forEach(sale => { updatedSalesMap[sale.id] = sale; });
            updateState({ allSales: allSales.map(s => updatedSalesMap[s.id] ? updatedSalesMap[s.id] : s) });

            return updatedSalesFromApi;
        } catch (error) {
            updateState({ errors: { form: error.response?.data?.message || error.message } });
            return null;
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (state.isSubmitting) return;

        // --- NEW VALIDATION LOGIC ---
        // This checks each required field. If one is empty, it focuses it and stops the save.
        const requiredFields = [
            { key: "customer_code", ref: "customer_code_input", label: "Customer Code" },
            { key: "supplier_code", ref: "supplier_code", label: "Supplier Code" },
            { key: "item_code", ref: "item_code_select", label: "Item" },
            { key: "weight", ref: "weight", label: "Weight" },
            { key: "packs", ref: "packs", label: "Packs" }
        ];

        for (const field of requiredFields) {
            const value = formData[field.key];
            // Checks for null, undefined, or empty strings
            if (value === null || value === undefined || value.toString().trim() === "") {
                updateState({ errors: { form: `කරුණාකර ${field.label} ඇතුළත් කරන්න` } }); // Message in Sinhala style

                const targetRef = refs[field.ref];
                if (targetRef?.current) {
                    // Focus the field so the cursor blinks there
                    if (field.ref.includes("select")) {
                        targetRef.current.focus();
                    } else {
                        targetRef.current.focus();
                        targetRef.current.select(); // Highlight existing text to make it easier to edit
                    }
                }
                return; // EXIT function here so it doesn't save to database
            }
        }
        // --- END VALIDATION ---

        updateState({ errors: {}, isSubmitting: true });
        const shouldUpdateRelatedPrice = state.priceManuallyChanged;

        try {
            const customerCode = formData.customer_code || autoCustomerCode;

            const isEditing = editingSaleId !== null;
            if (!isEditing && selectedPrintedCustomer) {
                updateState({
                    errors: { form: "Cannot add new entries to printed bills. Please edit existing records or select an unprinted customer." },
                    isSubmitting: false
                });
                setTimeout(() => updateState({ errors: {} }), 1000);
                return;
            }

            let billPrintedStatus = undefined, billNoToUse = null;
            if (!isEditing) {
                if (state.currentBillNo) {
                    billPrintedStatus = 'Y';
                    billNoToUse = state.currentBillNo;
                } else {
                    if (selectedPrintedCustomer) {
                        billPrintedStatus = 'Y';
                        if (selectedPrintedCustomer.includes('-')) {
                            billNoToUse = selectedPrintedCustomer.split('-')[1];
                        } else {
                            billNoToUse = printedSales.find(s => s.customer_code === selectedPrintedCustomer)?.bill_no;
                        }
                    } else if (selectedUnprintedCustomer) {
                        billPrintedStatus = 'N';
                    }
                }
            }

            const customerSales = allSales.filter(s => s.customer_code === customerCode);
            const isFirstRecordForCustomer = customerSales.length === 0 && !isEditing;

            const payload = {
                supplier_code: formData.supplier_code.toUpperCase(),
                customer_code: customerCode.toUpperCase(),
                customer_name: formData.customer_name,
                item_code: formData.item_code,
                item_name: formData.item_name,
                weight: parseFloat(formData.weight) || 0,
                price_per_kg: parseFloat(formData.price_per_kg) || 0,
                pack_due: parseFloat(formData.pack_due) || 0,
                total: parseFloat(formData.total) || 0,
                packs: parseFloat(formData.packs) || 0,
                given_amount: (isFirstRecordForCustomer || (isEditing && customerSales[0]?.id === editingSaleId))
                    ? (formData.given_amount ? parseFloat(formData.given_amount) : null)
                    : null,
                ...(billPrintedStatus && { bill_printed: billPrintedStatus }),
                ...(billNoToUse && { bill_no: billNoToUse }),
                update_related_price: shouldUpdateRelatedPrice,
            };

            const url = isEditing ? `${routes.sales}/${editingSaleId}` : routes.sales;
            const method = isEditing ? "put" : "post";
            const response = await api[method](url, payload);

            let updatedSales = [];
            if (response.data.sales) updatedSales = response.data.sales;
            else if (response.data.sale) updatedSales = [response.data.sale];
            else if (response.data.data) updatedSales = [response.data.data];
            else if (response.data.id) updatedSales = [response.data];

            if (updatedSales.length === 0) throw new Error("Server response structure is unexpected or empty.");

            const updatedIds = updatedSales.map(s => s.id);
            const newAllSales = allSales.filter(s => !updatedIds.includes(s.id)).concat(updatedSales);

            updateState({
                allSales: newAllSales,
                editingSaleId: null,
                isManualClear: false,
                isSubmitting: false,
                packCost: 0,
                priceManuallyChanged: false,
                gridPricePerKg: "",
                selectedSaleForBreakdown: null
            });

            // Reset form but keep the customer details for the next entry
            setFormData(prevForm => ({
                ...initialFormData,
                customer_code: customerCode,
                customer_name: prevForm.customer_name,
                telephone_no: prevForm.telephone_no,
            }));

            // Move cursor back to supplier code for the next item
            refs.supplier_code.current?.focus();

        } catch (error) {
            updateState({
                errors: { form: error.response?.data?.message || error.message || "An error occurred" },
                isSubmitting: false
            });
        }
    };

    const handleCustomerClick = async (type, customerCode, billNo = null, salesRecords = []) => {
        if (state.isPrinting) return;

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

        // --- LOOKUP CUSTOMER ---
        const customer = customers.find(x => String(x.short_name).toUpperCase() === String(customerCode).toUpperCase());

        // Debugging: Check your console to see if 'telephone_no' exists in this object
        console.log("Found Customer Object:", customer);

        if (!isCurrentlySelected) {
            try {
                let fetchedGivenAmount = "";
                try {
                    const response = await api.get(`${routes.getCustomerGivenAmount}/${customerCode}`);
                    if (response.data && response.data.given_amount !== undefined) {
                        fetchedGivenAmount = response.data.given_amount;
                    }
                } catch (error) {
                    fetchedGivenAmount = salesRecords[0]?.given_amount || "";
                }

                setFormData({
                    ...initialFormData, // Clear previous state
                    customer_code: customerCode,
                    customer_name: customer?.name || "",
                    telephone_no: customer?.telephone_no || "", // Fill the phone field
                    given_amount: fetchedGivenAmount
                });

                fetchLoanAmount(customerCode);
                setTimeout(() => refs.supplier_code.current?.focus(), 50);

            } catch (error) {
                setFormData({
                    ...initialFormData,
                    customer_code: customerCode,
                    customer_name: customer?.name || "",
                    telephone_no: customer?.telephone_no || "",
                    given_amount: salesRecords[0]?.given_amount || ""
                });
                fetchLoanAmount(customerCode);
            }
        } else {
            handleClearForm();
        }

        updateState({ editingSaleId: null, isManualClear: false, customerSearchInput: "", priceManuallyChanged: false, gridPricePerKg: "" });
    };
    const handleMarkAllProcessed = async () => {
        const salesToProcess = [...newSales, ...unprintedSales];
        if (salesToProcess.length === 0) return;
        try {
            const response = await api.post(routes.markAllProcessed, { sales_ids: salesToProcess.map(s => s.id) });
            if (response.data.success) {
                updateState({ allSales: allSales.map(s => salesToProcess.some(ps => ps.id === s.id) ? { ...s, bill_printed: "N" } : s) });
                handleClearForm();
                updateState({ selectedUnprintedCustomer: null, selectedPrintedCustomer: null });
                [50, 100, 150, 200, 250].forEach(timeout => setTimeout(() => refs.customer_code_input.current?.focus(), timeout));
            }
        } catch (err) { console.error("Failed to mark sales as processed:", err.message); }
    };
    const printSingleContent = async (html, customerName) => {
        return new Promise((resolve) => {
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) { alert("Please allow pop-ups for printing"); resolve(); return; }
            printWindow.document.open();
            printWindow.document.write(`<!DOCTYPE html><html><head><title>Print Bill - ${customerName}</title><style>body { margin: 0; padding: 20px; }@media print { body { padding: 0; } }</style></head><body>${html}<script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 1000); }, 500); }; window.onafterprint = function() { setTimeout(function() { window.close(); }, 500); };</script></body></html>`);
            printWindow.document.close();
            const checkPrintWindow = setInterval(() => { if (printWindow.closed) { clearInterval(checkPrintWindow); resolve(); } }, 500);
            setTimeout(() => { clearInterval(checkPrintWindow); if (!printWindow.closed) printWindow.close(); resolve(); }, 10000);
        });
    };

    const buildFullReceiptHTML = (salesData, billNo, customerName, mobile, globalLoanAmount = 0, billSize = '3inch') => {
        const formatNumber = (num) => {
            if (typeof num !== 'number' && typeof num !== 'string') return '0';
            const number = parseFloat(num);
            if (isNaN(number)) return '0';

            // Check if it's a whole number or has decimals
            if (Number.isInteger(number)) {
                return number.toLocaleString('en-US');
            } else {
                // For decimal numbers, format the whole part with commas
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

        // Increased width to 350px for maximum clarity on 3-inch/80mm printers
        const receiptMaxWidth = is4Inch ? '4in' : '350px';

        const fontSizeBody = '25px';
        const fontSizeHeader = '23px';
        const fontSizeTotal = '28px';

        // Optimized column widths for the new 350px width
        const colGroups = `
        <colgroup>
            <col style="width:32%;"> 
            <col style="width:21%;">
            <col style="width:21%;">
            <col style="width:26%;">
        </colgroup>`;

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
    
    <div style="font-size:25px; white-space:nowrap;">
        ${s.supplier_code || "ASW"}
    </div>

    <div style="
        font-weight:900;
        white-space:nowrap;
    ">
        ${formatNumber(value)}
    </div>

</td>


            </tr>`;
        }).join("");

        const totalSales = salesData.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0);
        const totalPackCost = salesData.reduce((sum, s) => sum + ((parseFloat(s.CustomerPackCost) || 0) * (parseFloat(s.packs) || 0)), 0);
        const finalGrandTotal = totalSales + totalPackCost;
        const givenAmount = salesData.find(s => parseFloat(s.given_amount) > 0)?.given_amount || 0;
        // This keeps the calculation the same but ensures the displayed 'remaining' is always positive
        const remaining = givenAmount > 0 ? Math.abs(givenAmount - finalGrandTotal) : 0;
        const loanRow = globalLoanAmount !== 0 ? `
        <tr>
            <td style="font-size:20px; padding-top:8px;">පෙර ණය:</td>
            <td style="text-align:right; font-size:22px; font-weight:bold; padding-top:8px;">
                Rs. ${formatNumber(Math.abs(globalLoanAmount).toFixed(2))}
            </td>
        </tr>
    ` : '';

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


        return `
    <div style="width:${receiptMaxWidth}; margin:0 auto; padding:10px; font-family: 'Courier New', monospace; color:#000; background:#fff;">
        <div style="text-align:center; font-weight:bold;">
            <div style="font-size:24px;">xxxx</div>
            <div style="font-size:20px; margin-bottom:5px;font-weight:bold;">colombage lanka (Pvt) Ltd</div>
            
          <div style="display:flex; justify-content:center; align-items:center; gap:15px; margin:12px 0;">
          <span style="border:2.5px solid #000; padding:5px 12px; font-size:22px;">xx</span>
          <span style="border:2.5px solid #000; padding:5px 12px; font-size:35px;">
          ${customerName.toUpperCase()}
         </span>
          </div>
            
            <div style="font-size:16px;">එළවළු,පළතුරු තොග වෙළෙන්දෝ</div>
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-top:6px; padding:0 5px;">
                <span>බණ්ඩාරවෙල</span>
                <span>${time}</span>
            </div>
        </div>

        <div style="font-size:19px; margin-top:10px; padding:0 5px;">
            <div style="font-weight: bold;">දුර: 0777672838 / 071437115</div>
            <div style="display:flex; justify-content:space-between; margin-top:3px;">
                <span>බිල් අංකය:${billNo}</span>
                <span>දිනය:${date}</span>
            </div>
        </div>

        <hr style="border:none; border-top:2.5px solid #000; margin:10px 0;">

        <table style="width:100%; border-collapse:collapse; font-size:${fontSizeBody}; table-layout: fixed;">
            ${colGroups}
            <thead>
                <tr style="border-bottom:2.5px solid #000; font-weight:bold;">
                    <th style="text-align:left; padding-bottom:8px; font-size:${fontSizeHeader};">වර්ගය<br>මලු</th>
                    <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader}; position: relative; left: -50px; top: 24px;"> කිලෝ </th>
                    <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader}; position: relative; left: -45px;top: 24px;">මිල</th>
                    <th style="text-align:right; padding-bottom:8px; font-size:${fontSizeHeader};">අයිතිය<br>අගය</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr style="border-top:2.5px solid #000; font-weight:bold;">
                    <td style="padding-top:12px; font-size:${fontSizeTotal};">${formatNumber(totalPacksSum)}</td>
                  <td colspan="3" style="padding-top:12px; font-size:${fontSizeTotal};">
    <div style="text-align:right; float:right; white-space:nowrap;">
    ${Number(totalSales).toFixed(2)}
</div>

</td>

                </tr>
            </tfoot>
        </table>

        <table style="width:100%; margin-top:20px; font-weight:bold; font-size:22px; padding:0 5px;">
            <tr>
                <td>මලු:</td>
               <td style="text-align:right; font-weight:bold;">
    ${formatNumber(totalPackCost.toFixed(2))}
</td>

            </tr>
            <tr>
                <td style="font-size:20px; padding-top:8px;">එකතුව:</td>
                <td style="text-align:right; padding-top:8px;">
                <span style="border-bottom:5px double #000; border-top:2px solid #000; font-size:${fontSizeTotal}; padding:5px 10px;">
                ${(Number(finalGrandTotal).toFixed(2))}
                </span>
                </td>
            </tr>
            <!-- ✅ LOAN ROW HERE -->
${loanRow}
            ${givenAmount > 0 ? `
            <tr>
                <td style="font-size:18px; padding-top:18px;">දුන් මුදල:</td>
                <td style="text-align:right; font-size:20px; padding-top:18px; font-weight:bold;">
                ${formatNumber(parseFloat(givenAmount).toFixed(2))}
                </td>
            </tr>
            <tr>
                <td style="font-size:22px;">ඉතිරිය:</td>
                <td style="text-align:right; font-size:26px;">${formatNumber(remaining.toFixed(2))}</td>
            </tr>` : ''}
        </table>

        <table style="width:100%; border-collapse:collapse; margin-top:25px; font-size:14px; text-align:center;">
            ${summaryHtmlContent}
        </table>

        <div style="text-align:center; margin-top:25px; font-size:13px; border-top:2.5px solid #000; padding-top:10px;">
            <p style="margin:4px 0; font-weight:bold;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p>
            <p style="margin:4px 0;">නැවත භාර ගනු නොලැබේ</p>
        </div>
    </div>`;
    };
    const formatReceiptValue = (value) => {
        if (value === null || value === undefined || value === '') return '0.00';
        const num = parseFloat(value);
        if (isNaN(num)) return '0.00';
        return num.toFixed(2);
    };

    const handlePrintAndClear = async () => {
        const currentlyTouched = state.isGivenAmountManuallyTouched;
        const updatedSalesFromApi = await handleSubmitGivenAmount(null, currentlyTouched);

        let salesData = updatedSalesFromApi || displayedSales.filter(s => s.id);

        if (!salesData.length) {
            alert("No sales records to print!");
            return;
        }

        // --- COMMISSION VALIDATION ---
        for (const s of salesData) {
            if (parseFloat(s.price_per_kg) === parseFloat(s.SupplierPricePerKg)) {
                const errorMsg = `Record with Code: ${s.supplier_code} + ${s.item_code}, Weight: ${s.weight}, Packs: ${s.packs} cannot be printed because the commissions have not been deducted. Please check or delete the record.`;
                alert(errorMsg);
                return;
            }
        }

        // --- ZERO PRICE VALIDATION ---
        const hasZeroPrice = salesData.some(s => parseFloat(s.price_per_kg) === 0);
        if (hasZeroPrice) {
            alert("Cannot print! One or more items have a price per kg of 0.");
            return;
        }

        try {
            updateState({ isPrinting: true });

            const customerCode = salesData[0].customer_code || "N/A";
            const customerName =
                state.customerNameDisplay ||
                salesData[0].customer_name ||
                customerCode;

            const mobile = salesData[0].mobile || "0777672838 / 071437115";

            // ✅ Fetch loan amount FIRST (needed for backend bill link)
            let currentLoan = 0;
            try {
                const loanRes = await api.post(routes.getLoanAmount, {
                    customer_short_name: customerCode
                });
                currentLoan = parseFloat(loanRes.data.total_loan_amount) || 0;
            } catch (e) {
                console.warn("Loan fetch failed");
            }

            // ✅ CALL BACKEND (Mark Printed + Create Link + Send SMS)
            const printResponse = await api.post(routes.markPrinted, {
                sales_ids: salesData.map(s => s.id),
                force_new_bill: true,
                telephone_no: formData.telephone_no,
                customer_code: formData.customer_code || autoCustomerCode,
                customer_name: customerName,
                sales_data: salesData,
                loan_amount: currentLoan
            });

            if (printResponse.data.status !== "success") {
                throw new Error(
                    "Printing failed: " +
                    (printResponse.data.message || "Unknown error")
                );
            }

            const billNo = printResponse.data.bill_no || "";

            // ✅ BUILD RECEIPT HTML (THERMAL PRINT)
            const receiptHtml = buildFullReceiptHTML(
                salesData,
                billNo,
                customerName,
                mobile,
                currentLoan,
                billSize
            );

            // ✅ UPDATE LOCAL STATE
            updateState({
                allSales: allSales.map(s =>
                    salesData.some(sd => sd.id === s.id)
                        ? { ...s, bill_printed: "Y", bill_no: billNo }
                        : s
                ),
                selectedPrintedCustomer: null,
                selectedUnprintedCustomer: null,
                isPrinting: false,
                isGivenAmountManuallyTouched: false
            });

            setFormData({
                ...initialFormData,
                customer_code: "",
                customer_name: "",
                given_amount: ""
            });

            // ✅ PRINT WINDOW
            const printWindow = window.open("", "_blank", "width=800,height=600");

            if (!printWindow) {
                alert("Please allow pop-ups for printing");
                window.location.reload();
                return;
            }

            printWindow.document.open();
            printWindow.document.write(`<!DOCTYPE html>
        <html>
        <head>
            <title>Print Bill - ${customerName}</title>
            <style>
                body { margin: 0; padding: 20px; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            ${receiptHtml}
            <script>
                window.onload = function () {
                    if (window.opener && !window.opener.closed) {
                        window.opener.location.reload();
                    }
                    setTimeout(function () {
                        window.print();
                    }, 100);
                };
            </script>
        </body>
        </html>`);
            printWindow.document.close();

        } catch (error) {
            console.error("Printing error:", error);
            const msg = error.response?.data?.message || "Printing failed";
            alert(msg);
            updateState({ isPrinting: false });
            window.location.reload();
        }
    };
    const handleBillSizeChange = (e) => updateState({ billSize: e.target.value });


    useEffect(() => {
        const handleShortcut = (e) => {
            if (e.key === "F10") {
                e.preventDefault();
                // This reloads the entire page from the server
                window.location.reload();
            }
            if (selectedPrintedCustomer && e.key === "F5") { e.preventDefault(); return; }
            if (e.key === "F1") {
                e.preventDefault();

                if (refs.given_amount.current) {

                    // Scroll to the field smoothly
                    refs.given_amount.current.scrollIntoView({
                        behavior: "smooth",
                        block: "center" // or "nearest", "start"
                    });

                    // Focus and select text
                    refs.given_amount.current.focus();
                    refs.given_amount.current.select();
                }
            }
            else if (e.key === "F5") {
                e.preventDefault();
                if (typeof handleMarkAllProcessed === "function") handleMarkAllProcessed();
            }
        };
        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [displayedSales, newSales, selectedPrintedCustomer, handlePrintAndClear, handleMarkAllProcessed, handleSubmitGivenAmount]);

    const hasData = allSales.length > 0 || customers.length > 0 || items.length > 0 || suppliers.length > 0;

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
                            <CustomerList customers={printedCustomers} type="printed" searchQuery={searchQueries.printed} onSearchChange={(value) => updateState({ searchQueries: { ...searchQueries, printed: value } })} selectedPrintedCustomer={selectedPrintedCustomer} selectedUnprintedCustomer={selectedUnprintedCustomer} handleCustomerClick={handleCustomerClick} formatDecimal={formatDecimal} allSales={allSales} lastUpdate={state.forceUpdate || state.windowFocused} isCashFilterActive={state.isCashFilterActive} toggleCashFilter={() => updateState({ isCashFilterActive: !state.isCashFilterActive })} />
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


                    <div className="center-form flex flex-col" style={{ backgroundColor: '#111439ff', padding: '20px', borderRadius: '0.75rem', color: 'white', height: '150.5vh', boxSizing: 'border-box', gridColumnStart: 2, gridColumnEnd: 3 }}>
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
                                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                                        style={{ position: 'absolute', left: '790px', top: '100px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', zIndex: 10 }}>
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
                                                    <input id="telephone_no" ref={refs.telephone_no} name="telephone_no" value={formData.telephone_no || ""} onChange={(e) => handleInputChange("telephone_no", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "telephone_no")} type="text" placeholder="දුරකථන අංකය" disabled={!!selectedPrintedCustomer} className="px-2 py-1 font-bold text-sm w-full border rounded text-black placeholder-gray-500" style={{ backgroundColor: selectedPrintedCustomer ? '#4a5568' : '#f6f6ff', border: '1px solid #4a5568', color: 'white', height: '36px', fontSize: '1rem', padding: '0 0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box', cursor: selectedPrintedCustomer ? 'not-allowed' : 'text', opacity: selectedPrintedCustomer ? 0.7 : 1 }} />
                                                </div>
                                                {/* CUSTOMER CODE FIELD - Stays in its original position */}
                                                <div className="flex-1 min-w-0" style={{ marginTop: '-40px' }}>
                                                    <input id="customer_code_input" ref={refs.customer_code_input} name="customer_code" value={formData.customer_code || autoCustomerCode} onChange={(e) => handleInputChange("customer_code", e.target.value.toUpperCase())} onKeyDown={(e) => handleKeyDown(e, "customer_code_input")} type="text" placeholder="පාරිභෝගික කේතය" className="px-2 py-1 uppercase font-bold text-sm w-full border rounded bg-white text-black placeholder-gray-500" style={{ backgroundColor: '#0d0d4d', border: '1px solid #4a5568', color: 'white', height: '36px', fontSize: '1rem', padding: '0 0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }} />
                                                </div>
                                            </div>
                                            <div style={{ flex: '0 0 150px', minWidth: '120px', marginLeft: '-100px' }}>
                                                <Select id="customer_code_select" ref={refs.customer_code_select} value={formData.customer_code ? { value: formData.customer_code, label: `${formData.customer_code}` } : null} onChange={handleCustomerSelect} options={customers.filter(c => !customerSearchInput || c.short_name.charAt(0).toUpperCase() === customerSearchInput.charAt(0).toUpperCase()).map(c => ({ value: c.short_name, label: `${c.short_name}` }))} onInputChange={(v, { action }) => action === "input-change" && updateState({ customerSearchInput: v.toUpperCase() })} inputValue={customerSearchInput} placeholder="පාරිභෝගිකයා තෝරන්න" isClearable isSearchable styles={{ control: b => ({ ...b, minHeight: "36px", height: "36px", fontSize: "25px", backgroundColor: "white", borderColor: "#4a5568", borderRadius: "0.5rem" }), valueContainer: b => ({ ...b, padding: "0 6px", height: "36px" }), placeholder: b => ({ ...b, fontSize: "12px", color: "#a0aec0" }), input: b => ({ ...b, fontSize: "12px", color: "black", fontWeight: "bold" }), singleValue: b => ({ ...b, color: "black", fontSize: "12px", fontWeight: "bold" }), option: (b, s) => ({ ...b, color: "black", fontWeight: "bold", fontSize: "12px", backgroundColor: s.isFocused ? "#e5e7eb" : "white", cursor: "pointer" }) }} />
                                            </div>
                                            <div style={{ flex: '0 0 60px', minWidth: '120px' }}>
                                                <input id="price_per_kg" ref={refs.price_per_kg} name="price_per_kg" type="text" value={formData.price_per_kg} onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && handleInputChange('price_per_kg', e.target.value)} onKeyDown={(e) => handleKeyDown(e, "price_per_kg")} placeholder="එකවර මිල" className="px-2 py-1 uppercase font-bold text-sm w-full border rounded bg-white text-black placeholder-gray-500" style={{ backgroundColor: '#0d0d4d', border: '1px solid #4a5568', color: 'white', height: '36px', fontSize: '1rem', padding: '0 0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="rounded-lg text-center border relative" style={{ backgroundColor: "white", flex: "0 0 200px", marginLeft: "05px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "10px" }}>
                                                    <span
                                                        className="absolute left-2 text-gray-400 text-[10px] pointer-events-none"
                                                        style={{ top: "1px" }} // Pushes the "Loan Amount" label to the very top
                                                    >
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
                                                <Select
                                                    id="item_code_select"
                                                    ref={refs.item_code_select}
                                                    value={
                                                        formData.item_code
                                                            ? {
                                                                value: formData.item_code,
                                                                label: `${formData.item_code} - ${formData.item_name}`,
                                                                item: {
                                                                    no: formData.item_code,
                                                                    type: formData.item_name,
                                                                    pack_due: formData.pack_due,
                                                                },
                                                            }
                                                            : null
                                                    }
                                                    onChange={handleItemSelect}
                                                    options={[...items]
                                                        .filter(item => {
                                                            if (!state.itemSearchInput) return true;
                                                            const input = state.itemSearchInput.toUpperCase();
                                                            const itemNo = String(item.no).toUpperCase();
                                                            // Only show items whose item_no starts with the typed input
                                                            return itemNo.startsWith(input);
                                                        })
                                                        .sort((a, b) => {
                                                            const isANumeric = !isNaN(a.no);
                                                            const isBNumeric = !isNaN(b.no);

                                                            // Push numeric item numbers to the end
                                                            if (isANumeric && !isBNumeric) return 1;
                                                            if (!isANumeric && isBNumeric) return -1;

                                                            // Otherwise, sort alphabetically by item.no
                                                            return String(a.no).toUpperCase().localeCompare(String(b.no).toUpperCase());
                                                        })
                                                        .map(item => ({
                                                            value: item.no,
                                                            label: `${item.no} - ${item.type}`,
                                                            item,
                                                        }))}
                                                    onInputChange={v => updateState({ itemSearchInput: v.toUpperCase() })}
                                                    inputValue={state.itemSearchInput}
                                                    onKeyDown={e =>
                                                        e.key !== "Enter" && handleKeyDown(e, "item_code_select")
                                                    }
                                                    placeholder="භාණ්ඩය"
                                                    className="react-select-container font-bold text-sm w-full"
                                                    styles={{
                                                        control: b => ({
                                                            ...b,
                                                            height: "44px",
                                                            minHeight: "44px",
                                                            fontSize: "1.25rem",
                                                            backgroundColor: "white",
                                                            borderColor: "#4a5568",
                                                            borderRadius: "0.5rem",
                                                        }),
                                                        valueContainer: b => ({ ...b, padding: "0 1rem", height: "44px" }),
                                                        input: b => ({ ...b, color: "black", fontSize: "1.25rem" }),
                                                        singleValue: b => ({
                                                            ...b,
                                                            color: "black",
                                                            fontWeight: "bold",
                                                            fontSize: "1.25rem",
                                                        }),
                                                        placeholder: b => ({ ...b, color: "#6b7280" }),
                                                        option: (b, s) => ({
                                                            ...b,
                                                            fontWeight: "bold",
                                                            color: "black",
                                                            backgroundColor: s.isFocused ? "#e5e7eb" : "white",
                                                            fontSize: "1rem",
                                                        }),
                                                    }}
                                                />
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
                                        <button type="submit" style={{ display: "none" }}></button>
                                    </form>
                                    {errors.form && <div className="mt-6 p-3 bg-red-100 text-red-700 rounded-xl">{errors.form}</div>}
                                </div>
                                <div className="flex-grow overflow-y-auto mt-1">
                                    {displayedSales.length === 0 ? (<div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">විකුණුම් වාර්තා කිසිවක් හමු නොවීය.</div>) : (
                                        <table className="min-w-full border-gray-200 rounded-xl text-sm" style={{ backgroundColor: '#000000', color: 'white', borderCollapse: 'collapse', margin: '0px 0', width: '100%' }}>
                                            <thead><tr style={{ backgroundColor: '#000000' }}>{['Sup code', 'කේතය', 'අයිතමය', 'බර(kg)', 'මිල', 'අගය', 'මලු', 'Actions'].map((header, index) => (<th key={index} className="px-4 py-2 border" style={{ backgroundColor: '#f5fafb', color: '#000000' }}>{header}</th>))}</tr></thead>
                                            <tbody>{displayedSales.map((s, idx) => (
                                                <tr key={idx} tabIndex={0} className="text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => handleEditClick(s)} onKeyDown={(e) => handleTableRowKeyDown(e, s)}>
                                                    <td className="px-4 py-2 border">{s.supplier_code}</td><td className="px-4 py-2 border">{s.item_code}</td><td className="px-4 py-2 border">{s.item_name}</td><td className="px-2 py-2 border">{formatDecimal(s.weight)}</td><td className="px-2 py-2 border">{formatDecimal(s.price_per_kg)}</td><td className="px-2 py-2 border">{formatDecimal((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0) + (parseFloat(s.packs) || 0) * (parseFloat(s.pack_due) || 0))}</td><td className="px-2 py-2 border">{s.packs}</td>
                                                    <td className="px-2 py-2 border text-center"><button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(s.id); }} className="text-black font-bold p-1 rounded-full bg-white hover:bg-gray-200">🗑️</button></td>
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    )}
                                    {displayedSales.length > 0 && (<SalesSummaryFooter sales={displayedSales} formatDecimal={formatDecimal} />)}
                                    <div
                                        className="flex items-center space-x-3 overflow-x-auto whitespace-nowrap"
                                        style={{ marginTop: "-75px" }}  // adjust value as needed
                                    >
                                        <div style={{ marginLeft: '660px', marginTop: '-2px' }}>
                                            <input id="given_amount" ref={refs.given_amount} name="given_amount" type="text" value={formData.given_amount ? Number(formData.given_amount).toLocaleString() : ""} onChange={(e) => handleInputChange("given_amount", e.target.value.replace(/,/g, ""))} onKeyDown={(e) => handleKeyDown(e, "given_amount")} placeholder="දුන් මුදල" className="px-4 py-2 border rounded-xl text-right bg-white text-black" style={{ width: "180px", fontWeight: "bold", fontSize: "1.1rem" }} />
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start"><ItemSummary sales={displayedSales} formatDecimal={formatDecimal} /><BreakdownDisplay sale={selectedSaleForBreakdown} formatDecimal={formatDecimal} /></div>
                                    <div className="flex items-center justify-between mb-4" style={{ marginTop: "35px" }}>
                                        {/* Red Total Text */}
                                        <div className="flex items-center justify-between mb-4" style={{ marginTop: "35px" }}>
                                            <div className="text-2xl font-bold" style={{ color: 'red' }}>
                                                (විකුණුම්: Rs. {formatDecimal(salesTotal)} + මල්ලක අගය: Rs. {formatDecimal(packCostTotal)} )
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="right-sidebar" style={{ backgroundColor: '#1ec139ff', borderRadius: '0.75rem', maxHeight: '80.5vh', overflowY: 'auto', gridColumnStart: 3, gridColumnEnd: 4 }}>
                        {hasData ? (<CustomerList customers={unprintedCustomers} type="unprinted" searchQuery={searchQueries.unprinted} onSearchChange={(value) => updateState({ searchQueries: { ...searchQueries, unprinted: value } })} selectedPrintedCustomer={selectedPrintedCustomer} selectedUnprintedCustomer={selectedUnprintedCustomer} handleCustomerClick={handleCustomerClick} formatDecimal={formatDecimal} allSales={allSales} lastUpdate={state.forceUpdate || state.windowFocused} />) : (
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