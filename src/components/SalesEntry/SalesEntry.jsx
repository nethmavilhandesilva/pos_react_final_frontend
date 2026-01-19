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
const AdminDataTableModal = ({ isOpen, onClose, title, sales, type, formatDecimal }) => {
    if (!isOpen) return null;

    // Inline Styles for guaranteed layout
    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)', // Blurs the background
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
    };

    const modalStyle = {
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
    };

    const headerStyle = {
        padding: '20px',
        backgroundColor: '#111827',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={headerStyle}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>{title}</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>
                            {type === 'farmer' ? 'සැපයුම්කරු සටහන්' : 'පාරිභෝගිකයින්ගේ සටහන්'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Table Content */}
                <div style={{ padding: '20px', overflowY: 'auto', backgroundColor: '#f9fafb', flexGrow: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', fontSize: '14px', borderRadius: '8px', overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '12px' }}>බිල් අං</th>
                                <th style={{ padding: '12px' }}>අයිතම කේතය</th>
                                <th style={{ padding: '12px' }}>අයිතම නාමය</th>
                                {type === 'farmer' ? (
                                    <>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>බර</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>මිල</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>එකතුව</th>
                                        <th style={{ padding: '12px', textAlign: 'right', backgroundColor: '#fefce8' }}>ලාභය</th>
                                    </>
                                ) : (
                                    <>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>බර</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>මිල</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>එකතුව</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>මලු</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {sales && sales.length > 0 ? sales.map((s, i) => {
                                const sw = parseFloat(s.SupplierWeight) || 0;
                                const sp = parseFloat(s.SupplierPricePerKg) || 0;
                                const st = parseFloat(s.SupplierTotal) || (sw * sp);
                                const totalVal = parseFloat(s.total) || 0;
                                const profit = totalVal - st;
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#2563eb' }}>
                                            #{type === 'farmer' ? s.supplier_bill_no || 'N/A' : s.bill_no || 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px' }}>{s.item_code}</td>
                                        <td style={{ padding: '12px' }}>{s.item_name}</td>
                                        {type === 'farmer' ? (
                                            <>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>{formatDecimal(sw)} kg</td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>{formatDecimal(sp)}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{formatDecimal(st)}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900', color: profit < 0 ? '#dc2626' : '#15803d', backgroundColor: '#fffbeb' }}>
                                                    {formatDecimal(profit)}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>{formatDecimal(s.weight)} kg</td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>{formatDecimal(s.price_per_kg)}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{formatDecimal(totalVal)}</td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>{s.packs}</td>
                                            </>
                                        )}
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px', backgroundColor: '#f3f4f6', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '8px 24px', backgroundColor: '#111827', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    >
                        සම්පූර්ණයි
                    </button>
                </div>
            </div>
        </div>
    );
};

const CustomerList = React.memo(({ customers, type, searchQuery, onSearchChange, selectedPrintedCustomer, selectedUnprintedCustomer, handleCustomerClick, formatDecimal, allSales, lastUpdate }) => {
    const getPrintedCustomerGroups = () => {
        const groups = {};
        allSales.filter(s => s.bill_printed === 'Y' && s.bill_no).forEach(sale => {
            const groupKey = `${sale.customer_code}-${sale.bill_no}`;
            if (!groups[groupKey]) groups[groupKey] = { customerCode: sale.customer_code, billNo: sale.bill_no, displayText: sale.customer_code };
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
                <h2 className="font-bold text-white mb-1 whitespace-nowrap text-center" style={{ fontSize: '14px' }}>{type === "printed" ? "මුද්‍රණය කළ" : "මුද්‍රණය නොකළ"}</h2>
                <input type="text" placeholder={`සෙවීම ${type === "printed" ? "බිල්පත් අංකය/කේතය..." : "ගනුදෙනු කේතය..."}`} value={searchQuery} onChange={(e) => onSearchChange(e.target.value.toUpperCase())} className="px-4 py-0.5 border rounded-xl focus:ring-2 focus:ring-blue-300 uppercase" style={{ width: '169px' }} />
            </div>
            <div className="py-1">
                {displayItems.length === 0 ? (<p className="text-gray-700">No {type === "printed" ? "printed sales" : "unprinted sales"} found.</p>) : (
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
            <div className="flex items-center gap-2 px-3 border-r border-gray-700 flex-1 justify-center">
                <span className="text-gray-400 uppercase text-[10px] whitespace-nowrap">එකතුව:</span>
                <span className="text-white text-sm whitespace-nowrap">Rs.{formatDecimal(totals.billTotal)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 border-r border-gray-700 flex-1 justify-center" style={{ marginLeft: '20px', transform: 'translateY(-24px)' }}>
                <span className="text-gray-400 uppercase text-[10px] whitespace-nowrap" style={{ marginLeft: '140px' }}>බෑග් මිල:</span>
                <span className="text-white text-sm whitespace-nowrap" style={{ marginLeft: '5px' }}>Rs.{formatDecimal(totals.totalBagPrice)}</span>
            </div>
            <div className="flex flex-row items-center whitespace-nowrap px-4 border-r border-gray-700 h-full ml-auto" style={{ transform: 'translateY(-48px)' }}>
                <span className="text-gray-400 uppercase text-[10px] mr-2" style={{ marginLeft: '310px' }}>කාම්කරු:</span>
                <span className="font-bold text-sm" style={{ marginLeft: '5px' }}>Rs.{formatDecimal(totals.totalLabour)}</span>
            </div>
            <div className="flex flex-row items-center whitespace-nowrap px-4 border-r border-gray-700 h-full ml-auto" style={{ transform: 'translateY(-72px)' }}>
                <span className="text-gray-400 uppercase text-[10px] mr-2" style={{ marginLeft: '480px' }}>ගෙවිය:</span>
                <span className="font-bold text-sm text-yellow-400" style={{ marginLeft: '5px' }}>Rs.{formatDecimal(finalPayable)}</span>
            </div>
        </div>
    );
};

// --- Main Export Component ---

const initialFormData = { customer_code: "", customer_name: "", supplier_code: "", code: "", item_code: "", item_name: "", weight: "", price_per_kg: "", pack_due: "", total: "", packs: "", given_amount: "", pack_cost: "" };
const fieldOrder = ["customer_code_input", "customer_code_select", "supplier_code", "item_code_select", "weight", "price_per_kg_grid_item", "packs", "total"];
const skipMap = { customer_code_input: "supplier_code", customer_code_select: "supplier_code", given_amount: "supplier_code", supplier_code: "item_code_select", item_code_select: "weight", price_per_kg: "packs", price_per_kg_grid_item: "packs" };

export default function SalesEntry() {
    const refs = {
        customer_code_input: useRef(null), customer_code_select: useRef(null), given_amount: useRef(null),
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
        isAdminModalOpen: false, modalTitle: "", modalData: [], modalType: ""
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

    const formatDecimal = (val) => (Number.isFinite(parseFloat(val)) ? parseFloat(val).toFixed(2) : "0.00");

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

    const handleKeyDown = (e, currentFieldName) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (currentFieldName === "given_amount") {
                handleSubmitGivenAmount(e).then(() => handlePrintAndClear());
                return;
            }
            if (currentFieldName === "packs") return handleSubmit(e);
            let nextFieldName = skipMap[currentFieldName];
            if (!nextFieldName) {
                const currentIndex = fieldOrder.indexOf(currentFieldName);
                let nextIndex = currentIndex + 1;
                while (nextIndex < fieldOrder.length && (fieldOrder[nextIndex] === "customer_code_select" || fieldOrder[nextIndex] === "item_name" || fieldOrder[nextIndex] === "total")) nextIndex++;
                nextFieldName = nextIndex < fieldOrder.length ? fieldOrder[nextIndex] : "customer_code_input";
            }
            const nextRef = refs[nextFieldName];
            if (nextRef?.current) {
                requestAnimationFrame(() => setTimeout(() => {
                    if (nextFieldName.includes("select")) nextRef.current.focus();
                    else { nextRef.current.focus(); nextRef.current.select(); }
                }, 0));
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
            if (!trimmedValue) { updateState({ loanAmount: 0 }); setFormData(prev => ({ ...prev, given_amount: "" })); }
            const customer = customers.find(c => c.short_name === value);
            const customerSales = allSales.filter(s => s.customer_code === trimmedValue);
            const firstSale = customerSales[0];
            const givenAmount = firstSale?.given_amount || "";
            setFormData(prev => ({ ...prev, customer_name: customer?.name || "", given_amount: givenAmount }));
            fetchLoanAmount(trimmedValue);
        }
        if (field === 'supplier_code') setFormData(prev => ({ ...prev, supplier_code: value }));
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

    const handleEditClick = (sale) => {

        // If same record clicked again → clear fields EXCEPT customer fields
        if (state.editingSaleId === sale.id) {

            setFormData((prev) => ({
                ...prev,
                customer_code: sale.customer_code || "",
                customer_name: sale.customer_name || "",
                supplier_code: "",     // clear this one
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

        // === Normal behavior when selecting a new record ===
        let fetchedPackDue = sale.pack_due || "";
        if (sale.item_code) {
            const matchingItem = items.find(i => String(i.no) === String(sale.item_code));
            fetchedPackDue = parseFloat(matchingItem?.pack_due) || sale.pack_due || "";
        }

        setFormData({
            ...sale,
            item_name: sale.item_name || "",
            customer_code: sale.customer_code || "",
            customer_name: sale.customer_name || "",
            supplier_code: sale.supplier_code || "",
            item_code: sale.item_code || "",
            weight: sale.weight || "",
            price_per_kg: sale.price_per_kg || "",
            pack_due: fetchedPackDue,
            total: sale.total || "",
            packs: sale.packs || ""
        });

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
        updateState({ editingSaleId: null, loanAmount: 0, isManualClear: false, packCost: 0, customerSearchInput: "", itemSearchInput: "", supplierSearchInput: "", priceManuallyChanged: false, gridPricePerKg: "", selectedSaleForBreakdown: null, ...(clearBillNo && { currentBillNo: null }) });
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
        if (!customerCode) { updateState({ errors: { form: "Please enter or select a customer code first" } }); refs.customer_code_input.current?.focus(); return null; }
        if (!formData.given_amount) { updateState({ errors: { form: "Please enter a given amount" } }); return null; }
        const salesToUpdate = displayedSales.filter(s => s.id);
        if (salesToUpdate.length === 0) return null;

        try {
            const givenAmount = parseFloat(formData.given_amount) || 0;
            const updatePromises = salesToUpdate.map(sale => api.put(`${routes.sales}/${sale.id}/given-amount`, { given_amount: givenAmount }));
            const results = await Promise.all(updatePromises);
            const updatedSalesFromApi = results.map(response => response.data.sale);
            const updatedSalesMap = {};
            updatedSalesFromApi.forEach(sale => { updatedSalesMap[sale.id] = sale; });
            updateState({ allSales: allSales.map(s => updatedSalesMap[s.id] ? updatedSalesMap[s.id] : s) });
            refs.supplier_code.current?.focus();
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
            { key: "price_per_kg", ref: "price_per_kg_grid_item", label: "Price" },
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
                customer_name: prevForm.customer_name
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

        // --- NEW ADMIN MODAL LOGIC ---
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

        const customer = customers.find(x => String(x.short_name) === String(customerCode));

        if (!isCurrentlySelected) {
            try {
                // Fetch given amount from API
                let fetchedGivenAmount = "";
                try {
                    const response = await api.get(`${routes.getCustomerGivenAmount}/${customerCode}`);
                    if (response.data && response.data.given_amount !== undefined) {
                        fetchedGivenAmount = response.data.given_amount;
                    }
                } catch (error) {
                    console.warn("Could not fetch given amount from API, using local data:", error);
                    // Fallback to local data if API call fails
                    fetchedGivenAmount = salesRecords[0]?.given_amount || "";
                }

                setFormData({
                    ...initialFormData,
                    customer_code: customerCode,
                    customer_name: customer?.name || "",
                    given_amount: fetchedGivenAmount
                });

                fetchLoanAmount(customerCode);
                setTimeout(() => {
                    if (refs.supplier_code.current) refs.supplier_code.current.focus();
                }, 50);

            } catch (error) {
                console.error("Error in handleCustomerClick:", error);
                // Fallback to existing behavior on error
                setFormData({
                    ...initialFormData,
                    customer_code: customerCode,
                    customer_name: customer?.name || "",
                    given_amount: salesRecords[0]?.given_amount || ""
                });
                fetchLoanAmount(customerCode);
                setTimeout(() => {
                    if (refs.supplier_code.current) refs.supplier_code.current.focus();
                }, 50);
            }
        } else {
            handleClearForm();
            setTimeout(() => {
                if (refs.customer_code_input.current) refs.customer_code_input.current.focus();
            }, 50);
        }

        updateState({
            editingSaleId: null,
            isManualClear: false,
            customerSearchInput: "",
            priceManuallyChanged: false,
            gridPricePerKg: ""
        });
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
        const receiptMaxWidth = is4Inch ? '4in' : '240px';
        const fontSizeHeader = is4Inch ? '1.2em' : '1.8em';
        const fontSizeTitle = is4Inch ? '1.4em' : '2.0em';
        const fontSizeText = is4Inch ? '1.0rem' : '1.7rem';
        const fontSizeItems = is4Inch ? '1.1em' : '1.7em';
        const fontSizeTotalLarge = is4Inch ? '1.2em' : '1.5em';

        let colGroups, itemHeader;
        if (is4Inch) {
            colGroups = `<colgroup><col style="width:30%;"><col style="width:15%;"><col style="width:15%;"><col style="width:25%;"><col style="width:15%;"></colgroup>`;
            itemHeader = 'වර්ගය <br> (මලු)';
        } else {
            colGroups = `<colgroup><col style="width:35%;"><col style="width:15%;"><col style="width:15%;"><col style="width:20%;"><col style="width:15%;"></colgroup>`;
            itemHeader = '<span style="font-size:16px; font-weight:bold;">වර්ගය <br> (මලු)</span>';

        }

        const itemsHtml = salesData.map(s => {
            const packs = parseInt(s.packs) || 0;
            const weight = parseFloat(s.weight) || 0;
            const price = parseFloat(s.price_per_kg) || 0;
            const value = (weight * price).toFixed(2);
            const formattedWeight = formatReceiptValue(weight);
            const formattedPrice = formatReceiptValue(price);
            const formattedValue = formatReceiptValue(value);

            if (is4Inch) {
                return `<tr style="font-size:${fontSizeItems}; font-weight:bold; color:black;">
                <td style="text-align:left; padding:2px 4px;">${s.item_name || ""} <br> ${packs}</td>
                <td style="text-align:center; padding:2px 4px;">${formattedWeight}</td>
                <td style="padding:2px 4px;"><div style="display:inline-block; margin-left:50px;">${formattedPrice}</div></td>
                <td style="text-align:right; padding:2px 4px;"><div style="display:flex; flex-direction:column; margin-left:98px; text-align:right; align-items:flex-end;"><div style="font-size:0.9em;">${s.supplier_code || ""}</div><div style="font-size:0.8em; margin-top:2px;">${formattedValue}</div></div></td>
                <td style="text-align:right; padding:2px 4px;"></td></tr>`;
            } else {
                return `<tr style="font-size:${fontSizeItems}; font-weight:bold; color:black;">
               <td style="text-align:left; padding:2px 4px; white-space:normal; word-wrap:break-word; max-width:120px;">
    ${s.item_name || ""}<br>${packs}
</td>

                <td style="padding:2px 4px; vertical-align: top;">
  <div style="display:inline-block; margin-left:-10px; margin-top:5px;">${formattedWeight}</div>
</td>


                <td style="padding:2px 4px; vertical-align: top;">
  <div style="display:inline-block; margin-left:20px; margin-top:5px;">${formattedPrice}</div>
</td>

                <td style="text-align:right; padding:2px 4px; vertical-align: top;">
  <div style="display:flex; flex-direction:column; margin-left:89px; margin-top:3px; text-align:right; align-items:flex-end;">
    <div style="font-size:0.9em;">${s.supplier_code || ""}</div>
    <div style="font-size:0.9em; margin-top:2px;">${formattedValue}</div>
  </div>
</td>

                <td style="text-align:right; padding:2px 4px;"></td></tr>`;
            }
        }).join("");

        const totalPrice = totalAmountSum;
        const totalSalesExcludingPackDue = salesData.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0);
        const totalPackDueCost = salesData.reduce((sum, s) => sum + ((parseFloat(s.CustomerPackCost) || 0) * (parseFloat(s.packs) || 0)), 0);
        const givenAmount = salesData.find(s => parseFloat(s.given_amount) > 0)?.given_amount || 0;



        const formattedTotalSalesExcludingPackDue = formatReceiptValue(totalSalesExcludingPackDue);
        const formattedTotalPackDueCost = formatReceiptValue(totalPackDueCost);
        const formattedTotalPrice = formatReceiptValue(totalPrice + totalPackDueCost);
        // Ensure both are converted to numbers before addition
        const totalAmountWithLoan = Math.abs(globalLoanAmount) + parseFloat(formattedTotalPrice);
        const remaining = parseFloat(givenAmount) - formattedTotalPrice;
        const formattedGivenAmount = formatReceiptValue(givenAmount);
        const formattedRemaining = formatReceiptValue(Math.abs(remaining));
        const formattedGlobalLoanAmount = formatReceiptValue(Math.abs(globalLoanAmount));
        const formattedTotalAmountWithLoan = formatReceiptValue(Math.abs(totalAmountWithLoan));

        const givenAmountRow = givenAmount > 0 ? `<tr><td style="width:50%; text-align:left; font-size:${fontSizeText}; padding:4px 0;"><span style="font-size:0.9rem;font-weight:bold;">දුන් මුදල: </span><span style="font-weight:bold; font-size:0.9rem;">${formattedGivenAmount}</span></td><td style="width:50%; text-align:right; padding:4px 0;"><span style="font-size:0.9rem;font-weight:bold;">ඉතිරිය: </span><span style="font-weight:bold; font-size:${fontSizeTotalLarge};">${formattedRemaining}</span></td></tr>` : '';
        const loanRow = globalLoanAmount !== 0 ?
            `<tr>
        <td style="font-size:17px; text-align:left; padding:4px 0;">පෙර ණය: Rs. <span>${formattedGlobalLoanAmount}</span></td>
        <td style="font-weight:bold; text-align:right; font-size:17px; padding:4px 0;">Rs. ${formattedTotalAmountWithLoan}</td>
        </tr>`
            : '';
        const formatSmartValue = (value) => {
            if (value === null || value === undefined || value === '') return '0';
            const num = parseFloat(value);
            if (isNaN(num)) return '0';

            // If it's a whole number (e.g., 50.00), return '50'
            // If it has decimals (e.g., 50.50), return '50.50'
            return Number.isInteger(num) ? num.toString() : num.toFixed(2);
        };

        const summaryEntries = Object.entries(consolidatedSummary);
        let summaryHtmlContent = '';
        for (let i = 0; i < summaryEntries.length; i += 2) {
            const [itemName1, data1] = summaryEntries[i];
            const [itemName2, data2] = summaryEntries[i + 1] || [null, null];
            const item1Text = `${itemName1}:${formatSmartValue(data1.totalWeight)}/${formatSmartValue(data1.totalPacks)}`;
            const item2Text = data2 ? `${itemName2}:${formatSmartValue(data2.totalWeight)}/${formatSmartValue(data2.totalPacks)}` : '';
            summaryHtmlContent += `<tr style="font-size:${fontSizeText};"><td style="width:50%; text-align:left; padding:2px 0; border:1px solid #000; padding:2px 4px; margin-top:1px;">${item1Text}</td><td style="width:50%; text-align:left; padding:2px 4px; border:1px solid #000; margin-top:1px;">${item2Text}</td></tr>`;
        }

        const itemSummaryHtml = `<div style="margin-top: 10px; text-align: center; font-size: 12px; text-transform: lowercase;">${summaryHtmlContent}</div>`;

        return `<div class="receipt-container" style="width:90%; max-width:${receiptMaxWidth}; margin:0 auto; padding:5px; font-family: 'Courier New', monospace;font-size:12px;">
     <div style="margin-bottom:5px; border-bottom:1px solid #000;">
   <h3 style="text-align:center; font-size:15px; font-weight:bold; margin:0 0 5px 0;">මංජු සහ සහෝදරයෝ</h3>
      <h3 style="text-align:center; font-size:12px; font-weight:bold; margin:0 0 5px 0;">colombage lanka (Pvt) Ltd</h3>
    <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
        <div style="display:flex; justify-content:center; align-items:center; gap:10px;">
            <div style="border:1px solid #000; padding:2px 6px;"><strong style="font-size:16px;">H-39</strong></div>
            <div style="border:1px solid #000; padding:2px 6px;"><strong style="font-size:16px;">${customerName.toUpperCase()}</strong></div>
        </div>
        <strong style="font-size:12px; text-align:center; display:block; margin-top:0;">එළවළු,පළතුරු තොග වෙළෙන්දෝ
            <div style="display:flex; align-items:center;"><span style="display:inline-block; text-align:left; margin-left:-10px;">බණ්ඩාරවෙල</span><span style="background:none; font-weight:normal; color:inherit; padding:0; margin-left:auto;">${time}</span></div></strong>
    </div>
    <div style="text-align:left; margin-bottom:5px;">
        <table style="width:70%; font-size:9px; border-collapse:collapse; margin:auto;">
            <tr><td style="padding-right:5px; white-space:nowrap;">දුර: ${mobile || ''}</td></tr>
            <tr><td style="padding-right:5px;">බිල් අංකය: <strong>${billNo}</strong></td><td style="text-align:right; padding-left:5px;">දිනය: ${date}</td></tr>
        </table>
    </div>
    <hr style="border:1px solid #000; margin:5px 0;">
    <table style="width:100%; font-size:${is4Inch ? '10px' : '9px'}; border-collapse:collapse; table-layout:fixed;">${colGroups}<thead><tr style="border-bottom:1px solid #000;">
    ${is4Inch ? `<th style="text-align:left; padding:4px; font-size:1.1em;">${itemHeader}</th><th style="text-align:center; padding:4px; font-size:1.1em;">කිලෝ</th><th style="text-align:center; padding:4px; font-size:1.1em;"><span style="display:inline-block; margin-left:50px;">මිල</span></th><th style="text-align:right; padding:4px; font-size:1.1em;"><div style="display:flex; flex-direction:column; align-items:flex-end; margin-left:100px; text-align:right;"><div>අයිතිය</div><div style="font-size:0.9em; margin-top:2px;">අගය</div></div></th><th style="text-align:right; padding:4px; font-size:1.1em;"></th>` : `<th style="text-align:left; padding:4px; font-size:1.2em;">${itemHeader}</th><th style="text-align:center; padding:4px; font-size:1.7em;">කිලෝ</th><th style="text-align:center; padding:4px; font-size:1.7em;"><span style="display:inline-block; margin-left:30px;">මිල</span></th><th style="text-align:right; padding:4px; font-size:1.7em;"><div style="display:flex; flex-direction:column; align-items:flex-end; margin-left:83px; text-align:right;"><div>අයිතිය</div><div style="font-size:0.9em; margin-top:2px;">අගය</div></div></th><th style="text-align:right; padding:4px; font-size:1.2em;"></th>`}</tr></thead>
    <tbody>${itemsHtml}<tr style="border-top:1px solid #000;"><td colspan="3" style="text-align:left; padding:6px 4px; font-size:${fontSizeItems}; font-weight:bold;">${totalPacksSum}</td><td style="text-align:right; padding:6px 4px; font-size:${fontSizeItems}; font-weight:bold;"><div style="display:flex; flex-direction:column; align-items:flex-end;"><div style="font-size:0.9em;"></div></div></td><td style="text-align:right; padding:6px 4px; font-size:${fontSizeItems}; font-weight:bold;"><span style="display:inline-block; transform: translateX(-48px);">${formattedTotalSalesExcludingPackDue}</span></td></tr></tbody></table>
    <table style="width:100%; font-size:${is4Inch ? '12px' : '15px'}; border-collapse:collapse; margin-top:10px;"><tr></tr>
    <tr><td style="text-align:left; padding:2px 0; font-size:14px; font-weight:bold;">මලු:</td>
<td style="text-align:right; padding:2px 0; font-weight:bold;">${formattedTotalPackDueCost}</td></tr>
    <tr><td style="text-align:left; font-size:16px; font-weight:bold; padding:2px 0;">එකතුව:</td>
 <td style="text-align:right; padding:2px 0; font-weight:bold;"><span style="display:inline-block; border-top:1px solid #000; border-bottom:3px double #000; padding:4px 8px; min-width:80px; text-align:right; font-size:${fontSizeTotalLarge};">${formattedTotalPrice}</span></td></tr>${givenAmountRow}${loanRow}</table>
    ${itemSummaryHtml}
    <div style="text-align:center; margin-top:15px; font-size:10px; border-top:1px dashed #000; padding-top:5px;"><p style="margin:2px 0;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p><p style="margin:2px 0;">නැවත භාර ගනු නොලැබේ</p></div></div>`;
    };
    const formatReceiptValue = (value) => {
        if (value === null || value === undefined || value === '') return '0.00';
        const num = parseFloat(value);
        if (isNaN(num)) return '0.00';
        return num.toFixed(2);
    };

    const handlePrintAndClear = async () => {
        // 1. Submit given amount to the API first and get the updated records
        const updatedSalesFromApi = await handleSubmitGivenAmount();

        // Use the data returned from the API if available, otherwise fallback to current display
        let salesData = updatedSalesFromApi || displayedSales.filter(s => s.id);

        if (!salesData.length) {
            alert("No sales records to print!");
            return;
        }

        const hasZeroPrice = salesData.some(s => parseFloat(s.price_per_kg) === 0);
        if (hasZeroPrice) {
            alert("Cannot print! One or more items have a price per kg of 0.");
            return;
        }

        try {
            updateState({ isPrinting: true });

            const customerCode = salesData[0].customer_code || "N/A";
            const customerName = salesData[0].customer_name || customerCode;
            const mobile = salesData[0].mobile || '0777672838 / 071437115';

            // 2. Mark as printed in DB and get official bill number
            const printResponse = await api.post(routes.markPrinted, {
                sales_ids: salesData.map(s => s.id),
                force_new_bill: true
            });

            if (printResponse.data.status !== "success") {
                throw new Error("Printing failed: " + (printResponse.data.message || "Unknown error"));
            }

            const billNo = printResponse.data.bill_no || "";

            // 3. Get latest loan amount
            let globalLoanAmount = 0;
            try {
                const loanResponse = await api.post(routes.getLoanAmount, {
                    customer_short_name: customerCode
                });
                globalLoanAmount = parseFloat(loanResponse.data.total_loan_amount) || 0;
            } catch (error) {
                console.warn("Could not fetch loan amount");
            }
            // We pass the salesData which now contains the given_amount from Step 1
            const receiptHtml = buildFullReceiptHTML(
                salesData,
                billNo,
                customerName,
                mobile,
                globalLoanAmount,
                billSize
            );

            // 5. Update UI State
            updateState({
                allSales: allSales.map(s =>
                    salesData.some(sd => sd.id === s.id) ? { ...s, bill_printed: 'Y', bill_no: billNo } : s
                ),
                selectedPrintedCustomer: null,
                selectedUnprintedCustomer: null,
                isPrinting: false
            });

            // 6. Clear form and trigger browser print
            setFormData({ ...initialFormData, customer_code: "", customer_name: "", given_amount: "" });
            await printSingleContent(receiptHtml, customerName);

            setTimeout(() => refs.customer_code_input.current?.focus(), 200);

        } catch (error) {
            console.error("Printing error:", error);
            alert("Printing failed");
            updateState({ isPrinting: false });
        }
    };
    const handleBillSizeChange = (e) => updateState({ billSize: e.target.value });


    useEffect(() => {
        const handleShortcut = (e) => {
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
                        {hasData ? (<CustomerList customers={printedCustomers} type="printed" searchQuery={searchQueries.printed} onSearchChange={(value) => updateState({ searchQueries: { ...searchQueries, printed: value } })} selectedPrintedCustomer={selectedPrintedCustomer} selectedUnprintedCustomer={selectedUnprintedCustomer} handleCustomerClick={handleCustomerClick} formatDecimal={formatDecimal} allSales={allSales} lastUpdate={state.forceUpdate || state.windowFocused} />) : (
                            <div className="w-full shadow-xl rounded-xl overflow-y-auto border border-black p-4 text-center" style={{ backgroundColor: "#1ec139ff", maxHeight: "80.5vh" }}>
                                <div style={{ backgroundColor: "#006400" }} className="p-1 rounded-t-xl"><h2 className="font-bold text-white mb-1 whitespace-nowrap text-center" style={{ fontSize: '14px' }}>මුද්‍රණය කළ</h2></div><div className="py-4"><p className="text-gray-700">මුද්‍රණය කළ ගනුදෙනු දත්ත නොමැත.</p></div>
                            </div>
                        )}
                    </div>

                    <div className="center-form flex flex-col" style={{ backgroundColor: '#111439ff', padding: '20px', borderRadius: '0.75rem', color: 'white', height: '150.5vh', boxSizing: 'border-box', gridColumnStart: 2, gridColumnEnd: 3 }}>
                        {currentUser?.role === 'Admin' ? (
                            <div className="admin-farmer-view h-full flex flex-col gap-4">
                                <div
                                    className="flex flex-row gap-4 flex-grow overflow-hidden"
                                    style={{ minHeight: "60vh", position: "relative" }}
                                >
                                    {/* Left Column: Unprinted Farmers */}
                                    <div
                                        style={{ width: "300px", height: "850px" }}
                                        className="flex flex-col bg-gray-800 rounded-xl border border-gray-600 overflow-hidden"
                                    >
                                        <div className="bg-red-800 p-2 text-center font-bold">
                                            මුද්‍රණය නොකළ ගොවීන්
                                        </div>

                                        <div
                                            className="p-2 flex-grow"
                                            style={{
                                                height: "calc(100% - 48px)", // Subtract the header height
                                                overflowY: "scroll"
                                            }}
                                        >
                                            <input
                                                type="text"
                                                placeholder="සොයන්න..."
                                                className="w-full p-2 mb-2 rounded bg-white text-black text-sm"
                                                style={{ textTransform: "uppercase" }}   // 🔥 force uppercase visibly
                                                value={searchQueries.farmerUnprinted || ""} // 🔥 maintain uppercase text
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
                                                    .filter(
                                                        (f) =>
                                                            !searchQueries.farmerUnprinted ||
                                                            f.supplier_code.includes(searchQueries.farmerUnprinted)
                                                    )
                                                    .map((f) => (
                                                        <div
                                                            key={f.supplier_code}
                                                            onClick={() =>
                                                                updateState({
                                                                    isAdminModalOpen: true,
                                                                    modalType: "farmer",
                                                                    modalTitle: `ගොවියා: ${f.supplier_code}`,
                                                                    modalData: allSales.filter(
                                                                        (s) =>
                                                                            s.supplier_code === f.supplier_code &&
                                                                            s.supplier_bill_printed !== "Y"
                                                                    ),
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

                                    {/* Right Column: Printed Farmers */}
                                    <div
                                        style={{
                                            width: "300px",
                                            marginLeft: "540px",
                                            marginTop: "-848px",
                                            height: "850px",
                                        }}
                                        className="flex flex-col bg-gray-800 rounded-xl border border-gray-600 overflow-hidden"
                                    >
                                        <div className="bg-green-800 p-2 text-center font-bold">
                                            මුද්‍රණය කළ ගොවීන්
                                        </div>

                                        <div
                                            className="p-2 flex-grow"
                                            style={{ height: "790px", overflowY: "auto" }}
                                        >
                                            <input
                                                type="text"
                                                placeholder="සොයන්න..."
                                                className="w-full p-2 mb-2 rounded bg-white text-black text-sm"
                                                style={{ textTransform: "uppercase" }}
                                                onChange={(e) =>
                                                    updateState({
                                                        searchQueries: {
                                                            ...searchQueries,
                                                            farmerPrinted: e.target.value.toUpperCase(),
                                                        },
                                                    })
                                                }
                                            />

                                            {printedFarmers.length > 0 ? (
                                                printedFarmers
                                                    .filter(
                                                        (f) =>
                                                            !searchQueries.farmerPrinted ||
                                                            f.supplier_code.includes(searchQueries.farmerPrinted)
                                                    )
                                                    .map((f) => (
                                                        <div
                                                            key={f.supplier_code}
                                                            onClick={() =>
                                                                updateState({
                                                                    isAdminModalOpen: true,
                                                                    modalType: "farmer",
                                                                    modalTitle: `ගොවියා: ${f.supplier_code}`,
                                                                    modalData: allSales.filter(
                                                                        (s) =>
                                                                            s.supplier_code === f.supplier_code &&
                                                                            s.supplier_bill_printed === "Y"
                                                                    ),
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

                                </div>
                            </div>

                        ) : (
                            <div className="pos-sales-view flex flex-col h-full">
                                <div className="flex-shrink-0">
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="w-full flex justify-between items-center">
                                            <div className="font-bold text-lg" style={{ color: 'red', fontSize: '1.35rem' }}>බිල් අං: {currentBillNo}</div>
                                            <div className="font-bold text-xl whitespace-nowrap" style={{ color: 'red', marginLeft: "550px", marginTop: "-30px", fontSize: '1.15rem' }}>මුළු විකුණුම්: Rs. {formatDecimal(totalSalesValue)}</div>
                                        </div>
                                        <div className="flex items-end gap-3 w-full">
                                            <div className="flex-1 min-w-0">
                                                <input id="customer_code_input" ref={refs.customer_code_input} name="customer_code" value={formData.customer_code || autoCustomerCode} onChange={(e) => handleInputChange("customer_code", e.target.value.toUpperCase())} onKeyDown={(e) => handleKeyDown(e, "customer_code_input")} type="text" placeholder="පාරිභෝගික කේතය" className="px-2 py-1 uppercase font-bold text-sm w-full border rounded bg-white text-black placeholder-gray-500" style={{ backgroundColor: '#0d0d4d', border: '1px solid #4a5568', color: 'white', height: '36px', fontSize: '1rem', padding: '0 0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }} />
                                            </div>
                                            <div style={{ flex: '0 0 250px', minWidth: '250px' }}>
                                                <Select id="customer_code_select" ref={refs.customer_code_select} value={formData.customer_code ? { value: formData.customer_code, label: `${formData.customer_code}` } : null} onChange={handleCustomerSelect} options={customers.filter(c => !customerSearchInput || c.short_name.charAt(0).toUpperCase() === customerSearchInput.charAt(0).toUpperCase()).map(c => ({ value: c.short_name, label: `${c.short_name}` }))} onInputChange={(v, { action }) => action === "input-change" && updateState({ customerSearchInput: v.toUpperCase() })} inputValue={customerSearchInput} placeholder="පාරිභෝගිකයා තෝරන්න" isClearable isSearchable styles={{ control: b => ({ ...b, minHeight: "36px", height: "36px", fontSize: "25px", backgroundColor: "white", borderColor: "#4a5568", borderRadius: "0.5rem" }), valueContainer: b => ({ ...b, padding: "0 6px", height: "36px" }), placeholder: b => ({ ...b, fontSize: "12px", color: "#a0aec0" }), input: b => ({ ...b, fontSize: "12px", color: "black", fontWeight: "bold" }), singleValue: b => ({ ...b, color: "black", fontSize: "12px", fontWeight: "bold" }), option: (b, s) => ({ ...b, color: "black", fontWeight: "bold", fontSize: "12px", backgroundColor: s.isFocused ? "#e5e7eb" : "white", cursor: "pointer" }) }} />
                                            </div>
                                            <div style={{ flex: '0 0 60px', minWidth: '120px' }}>
                                                <input id="price_per_kg" ref={refs.price_per_kg} name="price_per_kg" type="text" value={formData.price_per_kg} onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && handleInputChange('price_per_kg', e.target.value)} onKeyDown={(e) => handleKeyDown(e, "price_per_kg")} placeholder="එකවර මිල" className="px-2 py-1 uppercase font-bold text-sm w-full border rounded bg-white text-black placeholder-gray-500" style={{ backgroundColor: '#0d0d4d', border: '1px solid #4a5568', color: 'white', height: '36px', fontSize: '1rem', padding: '0 0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="p-2 rounded-lg text-center border relative" style={{ backgroundColor: "white", flex: "0 0 200px", marginLeft: "05px" }}>
                                                    <span className="absolute left-2 top-1 text-gray-400 text-xs pointer-events-none">Loan Amount</span>
                                                    <span className="text-black font-bold text-sm">Rs. {loanAmount < 0 ? formatDecimal(Math.abs(loanAmount)) : formatDecimal(loanAmount)}</span>
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
                                <div className="flex-grow overflow-y-auto mt-4">
                                    {displayedSales.length === 0 ? (<div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">විකුණුම් වාර්තා කිසිවක් හමු නොවීය.</div>) : (
                                        <table className="min-w-full border-gray-200 rounded-xl text-sm" style={{ backgroundColor: '#000000', color: 'white', borderCollapse: 'collapse', margin: '20px 0', width: '100%' }}>
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
                                        <div style={{ marginLeft: '660px', marginTop: '-2px' }}><input id="given_amount" ref={refs.given_amount} name="given_amount" type="number" value={formData.given_amount} onChange={(e) => handleInputChange('given_amount', e.target.value)} onKeyDown={(e) => handleKeyDown(e, "given_amount")} placeholder="දුන් මුදල" className="px-4 py-2 border rounded-xl text-right bg-white text-black" style={{ width: '180px' }} /></div>
                                    </div>
                                    <div className="flex gap-4 items-start"><ItemSummary sales={displayedSales} formatDecimal={formatDecimal} /><BreakdownDisplay sale={selectedSaleForBreakdown} formatDecimal={formatDecimal} /></div>
                                    <div className="flex items-center justify-between mb-4" style={{ marginTop: "35px" }}>
                                        <div className="text-2xl font-bold" style={{ color: 'red' }}>(විකුණුම්: Rs. {formatDecimal(salesTotal)} + මල්ලක අගය: Rs. {formatDecimal(packCostTotal)} )</div></div>
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