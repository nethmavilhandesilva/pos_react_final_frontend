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
    suppliers: "/suppliers"
};

// --- NEW COMPONENT: BREAKDOWN DISPLAY ---
const BreakdownDisplay = ({ sale, formatDecimal }) => {
    if (!sale || !sale.breakdown_history) return null;

    let history = [];
    try {
        history = typeof sale.breakdown_history === 'string'
            ? JSON.parse(sale.breakdown_history)
            : sale.breakdown_history;
    } catch (e) { return null; }

    if (!Array.isArray(history) || history.length < 2) return null;

    return (
        <div className="mt-4 p-3 bg-white rounded-lg border-2 border-blue-500 shadow-sm" style={{ width: '450px', margin: '10px auto' }}>
            <h3 className="text-xs font-bold text-black mb-2 text-center uppercase border-b pb-1">
                Weight & Packs Breakdown
            </h3>
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
                <input type="text" placeholder={`Search by ${type === "printed" ? "Bill No or Code..." : "Customer Code..."}`} value={searchQuery} onChange={(e) => onSearchChange(e.target.value.toUpperCase())} className="px-4 py-0.5 border rounded-xl focus:ring-2 focus:ring-blue-300 uppercase" style={{ width: '169px' }} />
            </div>
            <div className="py-1">
                {displayItems.length === 0 ? (<p className="text-gray-700">No {type === "printed" ? "printed sales" : "unprinted sales"} found.</p>) : (
                    <ul className="flex flex-col px-1">
                        {displayItems.map((item) => {
                            let customerCode, displayText, totalAmount;
                            if (type === "printed") {
                                customerCode = item.customerCode;
                                displayText = item.displayText;
                                const billSales = allSales.filter(s => s.customer_code === item.customerCode && s.bill_no === item.billNo);
                                totalAmount = billSales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0);
                            } else {
                                customerCode = item.customerCode;
                                displayText = item.customerCode;
                                const customerSales = allSales.filter(s => s.customer_code === item.customerCode && (s.bill_printed === 'N' || !s.bill_printed || s.bill_printed === ''));
                                totalAmount = customerSales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0);
                            }
                            const isItemSelected = isSelected(item);
                            return (
                                <li key={type === "printed" ? `${item.customerCode}-${item.billNo}` : item.customerCode} className="flex">
                                    <button
                                        onClick={() => {
                                            if (type === "printed") {
                                                const billSales = allSales.filter(
                                                    s => s.customer_code === item.customerCode && s.bill_no === item.billNo
                                                );
                                                handleCustomerClick(type, item.customerCode, item.billNo, billSales);
                                            } else {
                                                const customerSales = allSales.filter(
                                                    s =>
                                                        s.customer_code === item.customerCode &&
                                                        (s.bill_printed === 'N' || !s.bill_printed || s.bill_printed === '')
                                                );
                                                handleCustomerClick(type, item.customerCode, null, customerSales);
                                            }
                                        }}
                                        className={`py-1 mb-2 rounded-xl border ${isItemSelected
                                            ? "border-blue-600"
                                            : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                                            }`}
                                        style={
                                            isItemSelected
                                                ? {
                                                    backgroundColor: '#93C5FD',
                                                    paddingLeft: '05px',
                                                    width: '280px',  // Fixed width
                                                    textAlign: 'left'  // Text alignment
                                                }
                                                : {
                                                    paddingLeft: '1px',
                                                    width: '280px',  // Fixed width
                                                    textAlign: 'left'  // Text alignment
                                                }
                                        }
                                    >
                                        <span
                                            style={{
                                                display: 'block',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                textAlign: 'inherit',  // Inherits from button
                                                width: '100%'
                                            }}
                                            className={`font-semibold ${isItemSelected ? 'text-black' : 'text-gray-700'
                                                }`}
                                            title={`${displayText} - ${formatDecimal(totalAmount)}`}
                                        >
                                            {`${displayText.replace(/\n/g, ' ')} - ${formatDecimal(totalAmount)}`}
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

const ItemSummary = ({ sales, formatDecimal }) => {
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

    return (
        <div
            className="mt-4"
            style={{
                width: '450px',
                margin: '0 auto',
                boxSizing: 'border-box'
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)', // 4 items per row
                    gap: '12px',
                    textAlign: 'left' // left-align all content
                }}
            >
                {Object.entries(summary).map(([itemName, data]) => (
                    <div key={itemName}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px' // space between name and values
                            }}
                        >
                            <span
                                className="font-bold text-white"
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                {itemName}
                            </span>

                            <span
                                className="font-extrabold text-white"
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                {formatDecimal(data.totalWeight)}kg / {data.totalPacks}p
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>


    );
};

export default function SalesEntry() {
    const initialFormData = { customer_code: "", customer_name: "", supplier_code: "", code: "", item_code: "", item_name: "", weight: "", price_per_kg: "", pack_due: "", total: "", packs: "", given_amount: "", pack_cost: "" };

    const refs = {
        customer_code_input: useRef(null),
        customer_code_select: useRef(null),
        given_amount: useRef(null),
        supplier_code: useRef(null),
        item_code_select: useRef(null),
        item_name: useRef(null),
        weight: useRef(null),
        price_per_kg: useRef(null),
        packs: useRef(null),
        total: useRef(null),
        price_per_kg_grid_item: useRef(null),
    };

    const fieldOrder = ["customer_code_input", "customer_code_select", "supplier_code", "item_code_select", "weight", "price_per_kg_grid_item", "packs", "total"];

    const skipMap = {
        customer_code_input: "supplier_code",
        customer_code_select: "supplier_code",
        given_amount: "supplier_code",
        supplier_code: "item_code_select",
        item_code_select: "weight",
        price_per_kg: "packs",
        price_per_kg_grid_item: "packs"
    };

    const [state, setState] = useState({
        allSales: [], selectedPrintedCustomer: null, selectedUnprintedCustomer: null, editingSaleId: null, searchQueries: { printed: "", unprinted: "" }, errors: {}, loanAmount: 0, isManualClear: false,
        isSubmitting: false, formData: initialFormData, packCost: 0, customerSearchInput: "", itemSearchInput: "", supplierSearchInput: "", currentBillNo: null, isLoading: false, customers: [], items: [],
        suppliers: [], forceUpdate: null, windowFocused: null, isPrinting: false, billSize: '3inch',
        priceManuallyChanged: false,
        gridPricePerKg: "",
        selectedSaleForBreakdown: null // ⭐ NEW STATE for breakdown
    });

    const setFormData = (updater) => setState(prev => ({ ...prev, formData: typeof updater === 'function' ? updater(prev.formData) : updater }));
    const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

    const { allSales, customerSearchInput, selectedPrintedCustomer, selectedUnprintedCustomer, editingSaleId, searchQueries, errors, loanAmount, isManualClear, formData, packCost, isLoading, customers, items, suppliers, isPrinting, billSize, gridPricePerKg, selectedSaleForBreakdown } = state;

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
        if (selectedUnprintedCustomer) sales = [...sales, ...unprintedSales.filter(s => s.customer_code === selectedUnprintedCustomer)];
        else if (selectedPrintedCustomer && selectedPrintedCustomer.includes('-')) {
            const [customerCode, billNo] = selectedPrintedCustomer.split('-');
            sales = [...sales, ...printedSales.filter(s => s.customer_code === customerCode && s.bill_no === billNo)];
        } else if (selectedPrintedCustomer) sales = [...sales, ...printedSales.filter(s => s.customer_code === selectedPrintedCustomer)];
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
            const [resSales, resCustomers, resItems, resSuppliers] = await Promise.all([api.get(routes.sales), api.get(routes.customers), api.get(routes.items), api.get(routes.suppliers)]);
            const salesData = resSales.data.data || resSales.data.sales || resSales.data || [];
            const customersData = resCustomers.data.data || resCustomers.data.customers || resCustomers.data || [];
            const itemsData = resItems.data.data || resItems.data.items || resItems.data || [];
            const suppliersData = resSuppliers.data.data || resSuppliers.data.suppliers || resSuppliers.data || [];
            updateState({ allSales: salesData, customers: customersData, items: itemsData, suppliers: suppliersData, isLoading: false });
        } catch {
            updateState({ errors: { form: 'Failed to load data. Check console.' } });
        }
    };

    // --- NEW LOGIC: AUTO-SET GIVEN AMOUNT TO FINAL PAYABLE ---
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

            // ❗ Update only if database value is NULL or empty
            setFormData(prev => {
                if (prev.given_amount === null || prev.given_amount === "") {
                    return { ...prev, given_amount: calculatedFinal.toFixed(2) };
                }
                return prev; // keep existing value
            });

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

        if (!state.priceManuallyChanged) {
            updateState({ gridPricePerKg: formData.price_per_kg });
        }
    }, [formData.weight, formData.price_per_kg, formData.packs, formData.pack_due]);

    useEffect(() => {
        const handleWindowFocus = () => updateState(prev => ({ ...prev, windowFocused: Date.now() }));
        window.addEventListener('focus', handleWindowFocus);
        return () => window.removeEventListener('focus', handleWindowFocus);
    }, []);

    useEffect(() => {
        fetchInitialData();
        refs.customer_code_input.current?.focus();
    }, []);

    const handleKeyDown = (e, currentFieldName) => {
        if (e.key === "Enter") {
            e.preventDefault();

            // ⭐ TRIGGER PRINT when Enter is pressed inside given_amount field
            if (currentFieldName === "given_amount") {
                handleSubmitGivenAmount(e).then(() => {
                    handlePrintAndClear();
                });
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

    const salesTotal = displayedSales.reduce(
        (sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)),
        0
    );

    const packCostTotal = displayedSales.reduce(
        (sum, s) => {
            const labourCost = (parseFloat(s.CustomerPackCost) || 0) * (parseFloat(s.packs) || 0);
            return sum + labourCost;
        },
        0
    );
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

                {/* Bill Total */}
                <div className="flex items-center gap-2 px-3 border-r border-gray-700 flex-1 justify-center">
                    <span className="text-gray-400 uppercase text-[10px] whitespace-nowrap">Bill Total</span>
                    <span className="text-white text-sm whitespace-nowrap">Rs.{formatDecimal(totals.billTotal)}</span>
                </div>

                {/* Bag Price */}
                <div
                    className="flex items-center gap-2 px-3 border-r border-gray-700 flex-1 justify-center"
                    style={{
                        marginLeft: '20px',        // moves the block to the right
                        transform: 'translateY(-24px)' // moves the block 5px up
                    }}
                >
                    <span
                        className="text-gray-400 uppercase text-[10px] whitespace-nowrap"
                        style={{ marginLeft: '140px' }} // pushes "Bag Price" further right inside the block
                    >
                        Bag Price
                    </span>
                    <span
                        className="text-white text-sm whitespace-nowrap"
                        style={{ marginLeft: '5px' }} // pushes the amount a bit further right
                    >
                        Rs.{formatDecimal(totals.totalBagPrice)}
                    </span>
                </div>



                <div
                    className="flex flex-row items-center whitespace-nowrap px-4 border-r border-gray-700 h-full ml-auto"
                    style={{
                        transform: 'translateY(-48px)' // moves the block 5px upwards
                    }}
                >
                    <span
                        className="text-gray-400 uppercase text-[10px] mr-2"
                        style={{ marginLeft: '310px' }} // pushes "Labour:" further right
                    >
                        Labour:
                    </span>
                    <span
                        className="font-bold text-sm"
                        style={{ marginLeft: '5px' }} // small gap before the amount
                    >
                        Rs.{formatDecimal(totals.totalLabour)}
                    </span>
                </div>



                {/* Net Payable (no outer box, Labour-style layout) */}
                <div className="flex flex-row items-center whitespace-nowrap px-4 border-r border-gray-700 h-full ml-auto"
                    style={{ transform: 'translateY(-72px)' }}   // optional: move slightly up
                >
                    <span
                        className="text-gray-400 uppercase text-[10px] mr-2"
                        style={{ marginLeft: '480px' }}               // move label to right
                    >
                        Net Payable:
                    </span>

                    <span
                        className="font-bold text-sm text-yellow-400"
                        style={{ marginLeft: '5px' }}
                    >
                        Rs.{formatDecimal(finalPayable)}
                    </span>
                </div>

            </div>
        );
    };

    const totalSales = salesTotal + packCostTotal;


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
        const hasUnprintedSales = unprintedCustomers.includes(short);
        const hasPrintedSales = printedSales.some(s => s.customer_code === short);
        updateState({ selectedUnprintedCustomer: hasUnprintedSales ? short : null, selectedPrintedCustomer: null, customerSearchInput: "" });
        const existingGivenAmount = allSales.find(s => s.customer_code === short)?.given_amount || "";
        setFormData(prev => ({ ...prev, customer_code: short || "", customer_name: customer?.name || "", given_amount: existingGivenAmount }));
        fetchLoanAmount(short);
        updateState({ isManualClear: false });
        setTimeout(() => { refs.price_per_kg.current?.focus(); refs.price_per_kg.current?.select(); }, 100);
    };

    const handleEditClick = (sale) => {
        let fetchedPackDue = sale.pack_due || "";
        if (sale.item_code) {
            const matchingItem = items.find(i => String(i.no) === String(sale.item_code));
            fetchedPackDue = parseFloat(matchingItem?.pack_due) || sale.pack_due || "";
        }
        setFormData({ ...sale, item_name: sale.item_name || "", customer_code: sale.customer_code || "", customer_name: sale.customer_name || "", supplier_code: sale.supplier_code || "", item_code: sale.item_code || "", weight: sale.weight || "", price_per_kg: sale.price_per_kg || "", pack_due: fetchedPackDue, total: sale.total || "", packs: sale.packs || "" });
        updateState({ editingSaleId: sale.id, isManualClear: false, priceManuallyChanged: false, gridPricePerKg: sale.price_per_kg || "", selectedSaleForBreakdown: sale }); // ⭐ Set breakdown
        setTimeout(() => { refs.weight.current?.focus(); refs.weight.current?.select(); }, 0);
    };

    const handleTableRowKeyDown = (e, sale) => { if (e.key === "Enter") { e.preventDefault(); handleEditClick(sale); } };

    const handleClearForm = (clearBillNo = false) => {
        setFormData(initialFormData);
        updateState({ editingSaleId: null, loanAmount: 0, isManualClear: false, packCost: 0, customerSearchInput: "", itemSearchInput: "", supplierSearchInput: "", priceManuallyChanged: false, gridPricePerKg: "", selectedSaleForBreakdown: null, ...(clearBillNo && { currentBillNo: null }) });
    };

    const handleDeleteClick = async () => {
        if (!editingSaleId || !window.confirm("Are you sure you want to delete this sales record?")) return;
        try {
            await api.delete(`${routes.sales}/${editingSaleId}`);
            updateState({ allSales: allSales.filter(s => s.id !== editingSaleId) });
            handleClearForm();
        } catch (error) { updateState({ errors: { form: error.response?.data?.message || error.message } }); }
    };

    const handleSubmitGivenAmount = async (e) => {
        if (e) e.preventDefault();
        updateState({ errors: {} });

        const customerCode = formData.customer_code || autoCustomerCode;
        if (!customerCode) {
            updateState({ errors: { form: "Please enter or select a customer code first" } });
            refs.customer_code_input.current?.focus();
            return null;
        }

        if (!formData.given_amount) {
            updateState({ errors: { form: "Please enter a given amount" } });
            return null;
        }

        const salesToUpdate = displayedSales.filter(s => s.id);
        if (salesToUpdate.length === 0) return null;

        try {
            const givenAmount = parseFloat(formData.given_amount) || 0;
            const updatePromises = salesToUpdate.map(sale =>
                api.put(`${routes.sales}/${sale.id}/given-amount`, { given_amount: givenAmount })
            );

            const results = await Promise.all(updatePromises);

            // Extract the updated sale objects from the responses
            const updatedSalesFromApi = results.map(response => response.data.sale);

            // Update the global state so the UI stays in sync
            const updatedSalesMap = {};
            updatedSalesFromApi.forEach(sale => { updatedSalesMap[sale.id] = sale; });

            updateState({
                allSales: allSales.map(s => updatedSalesMap[s.id] ? updatedSalesMap[s.id] : s)
            });

            refs.supplier_code.current?.focus();

            // Return this fresh data to the caller (the print function)
            return updatedSalesFromApi;
        } catch (error) {
            updateState({ errors: { form: error.response?.data?.message || error.message } });
            return null;
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (state.isSubmitting) return;
        updateState({ errors: {}, isSubmitting: true });

        const shouldUpdateRelatedPrice = state.priceManuallyChanged;

        try {
            const customerCode = formData.customer_code || autoCustomerCode;
            if (!customerCode) { updateState({ errors: { form: "Customer code is required" }, isSubmitting: false }); refs.customer_code_input.current?.focus(); return; }
            const isEditing = editingSaleId !== null;
            if (!isEditing && selectedPrintedCustomer) {
                updateState({ errors: { form: "Cannot add new entries to printed bills. Please edit existing records or select an unprinted customer." }, isSubmitting: false });
                setTimeout(() => updateState({ errors: {} }), 1000);
                return;
            }
            let billPrintedStatus = undefined, billNoToUse = null;
            if (!isEditing) {
                if (state.currentBillNo) { billPrintedStatus = 'Y'; billNoToUse = state.currentBillNo; } else {
                    if (selectedPrintedCustomer) {
                        billPrintedStatus = 'Y';
                        if (selectedPrintedCustomer.includes('-')) billNoToUse = selectedPrintedCustomer.split('-')[1];
                        else billNoToUse = printedSales.find(s => s.customer_code === selectedPrintedCustomer)?.bill_no;
                    } else if (selectedUnprintedCustomer) billPrintedStatus = 'N';
                }
            }
            const customerSales = allSales.filter(s => s.customer_code === customerCode);
            const isFirstRecordForCustomer = customerSales.length === 0 && !isEditing;

            const payload = {
                supplier_code: formData.supplier_code.toUpperCase(), customer_code: customerCode.toUpperCase(), customer_name: formData.customer_name, item_code: formData.item_code, item_name: formData.item_name,
                weight: parseFloat(formData.weight) || 0, price_per_kg: parseFloat(formData.price_per_kg) || 0, pack_due: parseFloat(formData.pack_due) || 0, total: parseFloat(formData.total) || 0, packs: parseFloat(formData.packs) || 0,
                given_amount: (isFirstRecordForCustomer || (isEditing && customerSales[0]?.id === editingSaleId)) ? (formData.given_amount ? parseFloat(formData.given_amount) : null) : null,
                ...(billPrintedStatus && { bill_printed: billPrintedStatus }), ...(billNoToUse && { bill_no: billNoToUse }),
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

            updateState({ allSales: newAllSales, editingSaleId: null, isManualClear: false, isSubmitting: false, packCost: 0, priceManuallyChanged: false, gridPricePerKg: "", selectedSaleForBreakdown: null });
            setFormData(prevForm => ({ ...initialFormData, customer_code: customerCode, customer_name: prevForm.customer_name }));

            refs.supplier_code.current?.focus();
        } catch (error) { updateState({ errors: { form: error.response?.data?.message || error.message || error.toString() }, isSubmitting: false }); }
    };

    const handleCustomerClick = async (type, customerCode, billNo = null, salesRecords = []) => {
        if (state.isPrinting) return;
        const isPrinted = type === 'printed';
        let selectionKey = customerCode;
        if (isPrinted && billNo) selectionKey = `${customerCode}-${billNo}`;
        const isCurrentlySelected = isPrinted ? selectedPrintedCustomer === selectionKey : selectedUnprintedCustomer === selectionKey;
        if (isPrinted) updateState({ selectedPrintedCustomer: isCurrentlySelected ? null : selectionKey, selectedUnprintedCustomer: null, currentBillNo: isCurrentlySelected ? null : billNo });
        else updateState({ selectedUnprintedCustomer: isCurrentlySelected ? null : selectionKey, selectedPrintedCustomer: null, currentBillNo: null });
        const customer = customers.find(x => String(x.short_name) === String(customerCode));
        if (!isCurrentlySelected) {
            setFormData({ ...initialFormData, customer_code: customerCode, customer_name: customer?.name || "", given_amount: salesRecords[0]?.given_amount || "" });
            fetchLoanAmount(customerCode);
            setTimeout(() => { if (refs.supplier_code.current) refs.supplier_code.current.focus(); }, 50);
        } else {
            handleClearForm();
            setTimeout(() => { if (refs.customer_code_input.current) refs.customer_code_input.current.focus(); }, 50);
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

    const handleDeleteRecord = async (saleId) => {
        if (!saleId || !window.confirm("Are you sure you want to delete this sales record?")) return;
        try {
            await api.delete(`${routes.sales}/${saleId}`);
            updateState({ allSales: allSales.filter(s => s.id !== saleId) });
            if (editingSaleId === saleId) handleClearForm();
        } catch (error) { updateState({ errors: { form: error.response?.data?.message || error.message } }); }
    };

    const handleFullRefresh = async () => {
        updateState({ isLoading: true });
        try { await fetchInitialData(); } catch (error) { console.error('Refresh failed:', error); } finally { updateState({ isLoading: false }); }
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
        // --- New Receipt-Specific Formatting Function ---
        const formatReceiptValue = (val) => {
            const num = parseFloat(val);
            if (!Number.isFinite(num)) return "";

            // Use Math.round to handle floating point precision issues when checking for decimals
            const roundedNum = Math.round(num * 100) / 100;

            // Check if the number is an integer (e.g., 50.00 should show as 50)
            if (roundedNum === Math.floor(roundedNum)) {
                return Math.floor(roundedNum).toString();
            }
            // Otherwise, show up to two decimal places
            return roundedNum.toFixed(2);
        };

        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();
        let totalAmountSum = 0;

        // --- 1. Calculate Consolidated Item Summary & totalAmountSum ---
        const consolidatedSummary = {};
        salesData.forEach(s => {
            const itemName = s.item_name || 'Unknown';
            if (!consolidatedSummary[itemName]) {
                consolidatedSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
            }
            consolidatedSummary[itemName].totalWeight += parseFloat(s.weight) || 0;
            consolidatedSummary[itemName].totalPacks += parseInt(s.packs) || 0;
            totalAmountSum += parseFloat(s.total) || 0;
        });


        // Total Packs for the table footer, calculated from the summary
        const totalPacksSum = Object.values(consolidatedSummary).reduce((sum, item) => sum + item.totalPacks, 0);

        const is4Inch = billSize === '4inch';
        const receiptMaxWidth = is4Inch ? '4in' : '240px';
        const fontSizeHeader = is4Inch ? '1.2em' : '1.8em';
        const fontSizeTitle = is4Inch ? '1.4em' : '2.0em';
        const fontSizeText = is4Inch ? '1.0rem' : '1.7rem';
        const fontSizeItems = is4Inch ? '1.1em' : '1.5em';
        const fontSizeTotalLarge = is4Inch ? '1.2em' : '1.5em';

        let colGroups, itemHeader;
        if (is4Inch) {
            colGroups = `<colgroup><col style="width:30%;"><col style="width:15%;"><col style="width:15%;"><col style="width:25%;"><col style="width:15%;"></colgroup>`;
            itemHeader = 'වර්ගය <br> (මලු)';
        } else {
            colGroups = `<colgroup><col style="width:35%;"><col style="width:15%;"><col style="width:15%;"><col style="width:20%;"><col style="width:15%;"></colgroup>`;
            itemHeader = 'වර්ගය <br> (මලු)';
        }

        // HTML for the detailed item list
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
                <td style="padding:2px 4px;">
               <div style="display:inline-block; margin-left:50px;">${formattedPrice}</div>
               </td>

                <td style="text-align:right; padding:2px 4px;">
                   <div style="display:flex; flex-direction:column; margin-left:98px; text-align:right; align-items:flex-end;">
                        <div style="font-size:0.9em;">${s.supplier_code || ""}</div>
                        <div style="font-size:0.8em; margin-top:2px;">${formattedValue}</div>
                    </div>
                </td>
                <td style="text-align:right; padding:2px 4px;"></td>
            </tr>`;
            } else {
                return `<tr style="font-size:${fontSizeItems}; font-weight:bold; color:black;">
               <td style="text-align:left; padding:2px 4px; white-space:nowrap;">${s.item_name || ""} <br> ${packs}</td>
                <td style="text-align:center; padding:2px 4px;">${formattedWeight}</td>
                <td style="padding:2px 4px;">
  <div style="display:inline-block; margin-left:20px;">${formattedPrice}</div>
</td>
                <td style="text-align:right; padding:2px 4px;">
                   <div style="display:flex; flex-direction:column; margin-left:70px; text-align:right; align-items:flex-end;">
                        <div style="font-size:0.9em;">${s.supplier_code || ""}</div>
                        <div style="font-size:0.8em; margin-top:2px;">${formattedValue}</div>
                    </div>
                </td>
                <td style="text-align:right; padding:2px 4px;"></td>
            </tr>`;
            }
        }).join("");

        const totalPrice = totalAmountSum;
        const totalSalesExcludingPackDue = salesData.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0);
        const totalPackDueCost = salesData.reduce((sum, s) => {
            const packCharge = (parseFloat(s.CustomerPackCost) || 0) * (parseFloat(s.packs) || 0);
            return sum + packCharge;
        }, 0);
        const givenAmount = salesData.find(s => parseFloat(s.given_amount) > 0)?.given_amount || 0;
        const remaining = parseFloat(givenAmount) - totalPrice;

        // ⭐ FIX: Calculate totalAmountWithLoan BEFORE it is used in loanRow
        const totalAmountWithLoan = Math.abs(globalLoanAmount) + totalPrice;

        // --- Apply Receipt Formatting to Summary Values ---
        const formattedTotalSalesExcludingPackDue = formatReceiptValue(totalSalesExcludingPackDue);
        const formattedTotalPackDueCost = formatReceiptValue(totalPackDueCost);
        const formattedTotalPrice = formatReceiptValue(totalPrice + totalPackDueCost);
        const formattedGivenAmount = formatReceiptValue(givenAmount);
        const formattedRemaining = formatReceiptValue(Math.abs(remaining));
        const formattedGlobalLoanAmount = formatReceiptValue(Math.abs(globalLoanAmount));
        const formattedTotalAmountWithLoan = formatReceiptValue(Math.abs(totalAmountWithLoan));

        // Calculate total of all values in the last column (sum of all item values)
        const totalValuesSum = salesData.reduce((sum, s) => {
            const weight = parseFloat(s.weight) || 0;
            const price = parseFloat(s.price_per_kg) || 0;
            return sum + (weight * price);
        }, 0);
        const formattedTotalValuesSum = formatReceiptValue(totalValuesSum);

        const givenAmountRow = givenAmount > 0 ? `<tr><td style="width:50%; text-align:left; font-size:${fontSizeText}; padding:4px 0;"><span style="font-size:0.75rem;">දුන් මුදල: </span><span style="font-weight:bold; font-size:0.9rem;">${formattedGivenAmount}</span></td><td style="width:50%; text-align:right; padding:4px 0;"><span style="font-size:0.8rem;">ඉතිරිය: </span><span style="font-weight:bold; font-size:${fontSizeTotalLarge};">${formattedRemaining}</span></td></tr>` : '';

        // ⭐ FIX: loanRow now uses the correctly initialized totalAmountWithLoan
        const loanRow = globalLoanAmount !== 0 ? `<tr><td style="font-size:${fontSizeText}; text-align:left; padding:4px 0;">පෙර ණය: Rs. <span>${formattedGlobalLoanAmount}</span></td><td style="font-weight:bold; text-align:right; font-size:${fontSizeTotalLarge}; padding:4px 0;">Rs. ${formattedTotalAmountWithLoan}</td></tr>` : '';

        // --- 3. Format Consolidated Item Summary HTML (Two items per row, no units) ---
        const summaryEntries = Object.entries(consolidatedSummary);
        let summaryHtmlContent = '';

        for (let i = 0; i < summaryEntries.length; i += 2) {
            const [itemName1, data1] = summaryEntries[i];
            const [itemName2, data2] = summaryEntries[i + 1] || [null, null]; // Second item in the pair

            const item1Text = `${itemName1}:${formatReceiptValue(data1.totalWeight)}/${formatReceiptValue(data1.totalPacks)}`;
            const item2Text = data2 ?`${itemName2}:${formatReceiptValue(data2.totalWeight)}/${formatReceiptValue(data2.totalPacks)}` : '';

            summaryHtmlContent += `
        <tr style="font-size:${fontSizeText};">
            <td style="width:50%; text-align:left; padding:2px 0; border:1px solid #000; padding:2px 4px; margin-top:1px;">${item1Text}</td>
            <td style="width:50%; text-align:left; padding:2px 4px; border:1px solid #000; margin-top:1px;">${item2Text}</td>
        </tr>
    `;
        }

        const itemSummaryHtml = `
    <div style="margin-top: 10px; text-align: center; font-size: 12px; text-transform: lowercase;">
${summaryHtmlContent}
</div>

`;
        // --- Final HTML Structure ---
        return `<div class="receipt-container" style="width:90%; max-width:${receiptMaxWidth}; margin:0 auto; padding:5px; font-family: 'Courier New', monospace;">
<div style="margin-bottom:5px; border-bottom:1px solid #000;">
    <h3 style="text-align:center; font-size:${fontSizeHeader}; font-weight:bold; margin:0 0 5px 0;">
        NVDS TRADERS
    </h3>

  <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">

    <div style="display:flex; justify-content:center; align-items:center; gap:10px;">
        <div style="border:1px solid #000; padding:2px 6px;">
            <strong style="font-size:16px;">H-39</strong>
        </div>

        <div style="border:1px solid #000; padding:2px 6px;">
            <strong style="font-size:16px;">
                ${customerName.toUpperCase()}
            </strong>
        </div>
    </div>

    <strong style="font-size:12px; text-align:center; display:block; margin-top:0;">
    එළවළු හා පළතුරු තොග 
  <div style="display:flex; align-items:center;">
  <span style="display:inline-block; text-align:left; margin-left:-18px;">
    වෙළෙන්දන්
  </span>

  <span style="background:none; font-weight:normal; color:inherit; padding:0; margin-left:auto;">
    ${time}
  </span>
</div>


</strong>


</div>


<div style="text-align:left; margin-bottom:5px;">
    <table style="width:70%; font-size:9px; border-collapse:collapse; margin:auto;">
        
        <tr>
        <td style="padding-right:5px; white-space:nowrap;">
  දුර: ${mobile || ''}
</td>

           
        </tr>

        <tr>
            <td style="padding-right:5px;">බිල් අංකය: <strong>${billNo}</strong></td>
            <td style="text-align:right; padding-left:5px;">දිනය: ${date}</td>
        </tr>

    </table>
</div>



<hr style="border:1px solid #000; margin:5px 0;">
<table style="width:100%; font-size:${is4Inch ? '10px' : '9px'}; border-collapse:collapse; table-layout:fixed;">${colGroups}<thead><tr style="border-bottom:1px solid #000;">
${is4Inch ?
                `<th style="text-align:left; padding:4px; font-size:1.1em;">${itemHeader}</th>
     <th style="text-align:center; padding:4px; font-size:1.1em;">කිලෝ</th>
     <th style="text-align:center; padding:4px; font-size:1.1em;">
 <span style="display:inline-block; margin-left:${is4Inch ? '50px' : '10px'};">මිල</span>

</th>

     <th style="text-align:right; padding:4px; font-size:1.1em;">
       <div style="display:flex; flex-direction:column; align-items:flex-end; margin-left:${is4Inch ? '100px' : '80px'}; text-align:right;">
    <div>අයිතිය</div>
    <div style="font-size:0.9em; margin-top:2px;">අගය</div>
</div>

     </th>
     <th style="text-align:right; padding:4px; font-size:1.1em;"></th>` :
                `<th style="text-align:left; padding:4px; font-size:1.2em;">${itemHeader}</th>
     <th style="text-align:center; padding:4px; font-size:1.2em;">කිලෝ</th>
     <th style="text-align:center; padding:4px; font-size:1.2em;">
 <span style="display:inline-block; margin-left:30px;">මිල</span>
</th>
     <th style="text-align:right; padding:4px; font-size:1.2em;">
       <div style="display:flex; flex-direction:column; align-items:flex-end; margin-left:80px; text-align:right;">
    <div>අයිතිය</div>
    <div style="font-size:0.9em; margin-top:2px;">අගය</div>
</div>
     </th>
     <th style="text-align:right; padding:4px; font-size:1.2em;"></th>`}
</tr></thead>
<tbody>${itemsHtml}
<tr style="border-top:1px solid #000;">
    <td colspan="3" style="text-align:left; padding:6px 4px; font-size:${fontSizeItems}; font-weight:bold;">${totalPacksSum}</td>
    <td style="text-align:right; padding:6px 4px; font-size:${fontSizeItems}; font-weight:bold;">
        <div style="display:flex; flex-direction:column; align-items:flex-end;">
            <div style="font-size:0.9em;"></div>
        </div>
    </td>
  <td style="
    text-align:right;
    padding:6px 4px;
    font-size:${fontSizeItems};
    font-weight:bold;
">
    <span style="display:inline-block; transform: translateX(-10px);">
        ${formattedTotalSalesExcludingPackDue}
    </span>
</td>


</tr>
</tbody></table>



<table style="width:100%; font-size:${is4Inch ? '12px' : '15px'}; border-collapse:collapse; margin-top:10px;"><tr></tr>
<tr><td style="text-align:left; padding:2px 0;">මලු:</td><td style="text-align:right; padding:2px 0; font-weight:bold;">${formattedTotalPackDueCost}</td></tr>
<tr><td style="text-align:left; padding:2px 0;">එකතුව:</td><td style="text-align:right; padding:2px 0; font-weight:bold;"><span style="display:inline-block; border-top:1px solid #000; border-bottom:3px double #000; padding:4px 8px; min-width:80px; text-align:right; font-size:${fontSizeTotalLarge};">${formattedTotalPrice}</span></td></tr>${givenAmountRow}${loanRow}</table>
    ${itemSummaryHtml}
<div style="text-align:center; margin-top:15px; font-size:10px; border-top:1px dashed #000; padding-top:5px;"><p style="margin:2px 0;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p><p style="margin:2px 0;">නැවත භාර ගනු නොලැබේ</p></div></div>`;
    };

    const handlePrintAndClear = async () => {
        // 1. Trigger the amount save and WAIT for the response
        const freshData = await handleSubmitGivenAmount();

        // 2. Use the fresh data (with the new amount) if it exists, otherwise use existing state
        const salesData = freshData || displayedSales.filter(s => s.id);

        if (!salesData.length) return alert("No sales records to print!");

        const hasZeroPrice = salesData.some(s => parseFloat(s.price_per_kg) === 0);
        if (hasZeroPrice) {
            alert("Cannot print! One or more items have a price per kg of 0.");
            return;
        }

        const originalState = {
            allSales: [...allSales],
            selectedPrintedCustomer,
            selectedUnprintedCustomer,
            formData: { ...formData }
        };

        try {
            const customerCode = salesData[0].customer_code || "N/A";
            const customerName = salesData[0].customer_name || customerCode;
            const mobile = salesData[0].mobile || '0702758908 / 0702758300';


            updateState({ isPrinting: true });

            // Mark as printed in the DB
            const printResponse = await api.post(routes.markPrinted, {
                sales_ids: salesData.map(s => s.id),
                force_new_bill: true
            });

            if (printResponse.data.status !== "success") throw new Error("Printing failed");

            const billNo = printResponse.data.bill_no || "";
            let globalLoanAmount = 0;
            try {
                const loanResponse = await api.post(routes.getLoanAmount, { customer_short_name: customerCode });
                globalLoanAmount = parseFloat(loanResponse.data.total_loan_amount) || 0;
            } catch { }

            // 3. Build HTML using the 'salesData' we retrieved at the start of this function
            const receiptHtml = buildFullReceiptHTML(salesData, billNo, customerName, mobile, globalLoanAmount, billSize);

            // Reset form and UI
            updateState({
                allSales: allSales.map(s => salesData.some(sd => sd.id === s.id) ? { ...s, bill_printed: 'Y', bill_no: billNo } : s),
                selectedPrintedCustomer: null,
                selectedUnprintedCustomer: null,
                isPrinting: false,
                currentBillNo: null // Added to clear the red Bill No display
            });

            setFormData({ ...initialFormData, customer_code: "", customer_name: "", given_amount: "" });

            // Execute Print (Wait for the print window to finish)
            await printSingleContent(receiptHtml, customerName);

            // ⭐ NEW: Focus back to customer code input after printing
            setTimeout(() => {
                if (refs.customer_code_input.current) {
                    refs.customer_code_input.current.focus();
                    refs.customer_code_input.current.select(); // Optional: selects text if any remains
                }
            }, 200);

        } catch (error) {
            console.error("Printing error:", error);
            alert("Printing failed");
            updateState({ isPrinting: false });

            // Ensure focus even on failure
            setTimeout(() => refs.customer_code_input.current?.focus(), 200);
        }
    };

    const handleBillSizeChange = (e) => updateState({ billSize: e.target.value });

    useEffect(() => {
        const handleShortcut = (e) => {

            if (selectedPrintedCustomer && e.key === "F5") {
                e.preventDefault();
                return;
            }

            // ⭐ F1 → focus given_amount
            if (e.key === "F1") {
                e.preventDefault();
                if (refs.given_amount.current) {
                    refs.given_amount.current.focus();
                    refs.given_amount.current.select();
                }
            }

            // ⭐ F5 → First submit given amount, then mark processed OR print
            else if (e.key === "F5") {
                e.preventDefault();

                // FIRST: submit given amount
                if (typeof handleSubmitGivenAmount === "function") {
                    handleSubmitGivenAmount();
                }

                // THEN: perform mark processed
                if (typeof handleMarkAllProcessed === "function") {
                    handleMarkAllProcessed();
                }

                // THEN: perform print
                if (typeof handlePrintAndClear === "function") {
                    handlePrintAndClear();
                }
            }
        };

        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);

    }, [
        displayedSales,
        newSales,
        selectedPrintedCustomer,
        handlePrintAndClear,
        handleMarkAllProcessed,
        handleSubmitGivenAmount // ⭐ MUST BE INCLUDED IN DEPENDENCY ARRAY
    ]);


    const hasData = allSales.length > 0 || customers.length > 0 || items.length > 0 || suppliers.length > 0;

    return (
        <Layout style={{ backgroundColor: '#99ff99' }} billSize={billSize} handleBillSizeChange={handleBillSizeChange}>
            <div className="sales-layout" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {isLoading && (<div className="fixed top-0 left-0 right-0 bg-blue-500 text-white py-1 text-center text-sm z-50">Refreshing data...</div>)}
                {state.isPrinting && (<div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black py-1 text-center text-sm z-50">Printing in progress... Please wait</div>)}
                <div
                    className="three-column-layout"
                    style={{
                        opacity: isLoading ? 0.7 : 1,
                        display: 'grid',
                        gridTemplateColumns: '200px 1fr 200px',
                        gap: '16px',
                        padding: '10px',
                        marginTop: '-149px'
                    }}
                >
                    <div className="left-sidebar" style={{ backgroundColor: '#1ec139ff', borderRadius: '0.75rem', maxHeight: '80.5vh', overflowY: 'auto' }}>
                        {hasData ? (<CustomerList customers={printedCustomers} type="printed" searchQuery={searchQueries.printed} onSearchChange={(value) => updateState({ searchQueries: { ...searchQueries, printed: value } })} selectedPrintedCustomer={selectedPrintedCustomer} selectedUnprintedCustomer={selectedUnprintedCustomer} handleCustomerClick={handleCustomerClick} formatDecimal={formatDecimal} allSales={allSales} lastUpdate={state.forceUpdate || state.windowFocused} />) : (
                            <div className="w-full shadow-xl rounded-xl overflow-y-auto border border-black p-4 text-center" style={{ backgroundColor: "#1ec139ff", maxHeight: "80.5vh" }}>
                                <div style={{ backgroundColor: "#006400" }} className="p-1 rounded-t-xl"><h2 className="font-bold text-white mb-1 whitespace-nowrap text-center" style={{ fontSize: '14px' }}>මුද්‍රණය කළ</h2></div><div className="py-4"><p className="text-gray-700">No printed customers data available</p></div>
                            </div>
                        )}
                    </div>
                    <div className="center-form flex flex-col" style={{ backgroundColor: '#111439ff', padding: '20px', borderRadius: '0.75rem', color: 'white', height: '150.5vh', boxSizing: 'border-box', gridColumnStart: 2, gridColumnEnd: 3 }}>
                        <div className="flex-shrink-0">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="w-full flex justify-between items-center">
                                    <div className="font-bold text-lg" style={{ color: 'red', fontSize: '1.35rem' }}>Bill No: {currentBillNo}</div>
                                    <div className="font-bold text-xl whitespace-nowrap" style={{ color: 'red', marginLeft: "550px", marginTop: "-30px", fontSize: '1.15rem' }}>මුළු විකුණුම්: Rs. {formatDecimal(totalSales)}</div>
                                </div>
                                <div className="flex items-end gap-3 w-full">
                                    <div className="flex-1 min-w-0">
                                        <input id="customer_code_input" ref={refs.customer_code_input} name="customer_code" value={formData.customer_code || autoCustomerCode} onChange={(e) => { const value = e.target.value.toUpperCase(); handleInputChange("customer_code", value); }} onKeyDown={(e) => handleKeyDown(e, "customer_code_input")} type="text" maxLength={10} placeholder="පාරිභෝගික කේතය" className="px-2 py-1 uppercase font-bold text-sm w-full border rounded bg-white text-black placeholder-gray-500" style={{ backgroundColor: '#0d0d4d', border: '1px solid #4a5568', color: 'white', height: '36px', fontSize: '1rem', padding: '0 0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ flex: '0 0 250px', minWidth: '250px' }}>
                                        <Select id="customer_code_select" ref={refs.customer_code_select} value={formData.customer_code ? { value: formData.customer_code, label: `${formData.customer_code}` } : null} onChange={handleCustomerSelect} options={customers.filter(c => !customerSearchInput || c.short_name.charAt(0).toUpperCase() === customerSearchInput.charAt(0).toUpperCase()).map(c => ({ value: c.short_name, label: `${c.short_name}` }))} onInputChange={(inputValue, { action }) => { if (action === "input-change") updateState({ customerSearchInput: inputValue.toUpperCase() }); }} inputValue={customerSearchInput} placeholder="පාරිභෝගිකයා තෝරන්න" isClearable isSearchable styles={{ control: base => ({ ...base, minHeight: "36px", height: "36px", fontSize: "25px", backgroundColor: "white", borderColor: "#4a5568", borderRadius: "0.5rem" }), valueContainer: base => ({ ...base, padding: "0 6px", height: "36px" }), placeholder: base => ({ ...base, fontSize: "12px", color: "#a0aec0", fontWeight: "normal" }), input: base => ({ ...base, fontSize: "12px", color: "black", fontWeight: "bold" }), singleValue: base => ({ ...base, color: "black", fontSize: "12px", fontWeight: "bold" }), option: (base, state) => ({ ...base, color: "black", fontWeight: "bold", fontSize: "12px", backgroundColor: state.isFocused ? "#e5e7eb" : "white", cursor: "pointer" }) }} />
                                    </div>
                                    <div style={{ flex: '0 0 60px', minWidth: '120px' }}>
                                        <input id="price_per_kg" ref={refs.price_per_kg} name="price_per_kg" type="text" value={formData.price_per_kg} onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) handleInputChange('price_per_kg', v); }} onKeyDown={(e) => handleKeyDown(e, "price_per_kg")} placeholder="එකවර මිල" className="px-2 py-1 uppercase font-bold text-sm w-full border rounded bg-white text-black placeholder-gray-500" style={{ backgroundColor: '#0d0d4d', border: '1px solid #4a5568', color: 'white', height: '36px', fontSize: '1rem', padding: '0 0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }} />
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
                                                        label: `${formData.item_name} (${formData.item_code})`,
                                                        item: {
                                                            no: formData.item_code,
                                                            type: formData.item_name,
                                                            pack_due: formData.pack_due
                                                        }
                                                    }
                                                    : null
                                            }
                                            onChange={handleItemSelect}
                                            options={
                                                [...items]
                                                    .filter(
                                                        item =>
                                                            !state.itemSearchInput ||
                                                            String(item.no).toLowerCase().startsWith(state.itemSearchInput.toLowerCase()) ||
                                                            String(item.type).toLowerCase().includes(state.itemSearchInput.toLowerCase())
                                                    )
                                                    .sort((a, b) =>
                                                        String(a.no).localeCompare(String(b.no), undefined, { sensitivity: "base" })
                                                    )
                                                    .map(item => ({
                                                        value: item.no,
                                                        label: `${item.type} (${item.no})`,
                                                        item
                                                    }))
                                            }
                                            onInputChange={v => updateState({ itemSearchInput: v.toUpperCase() })}
                                            inputValue={state.itemSearchInput}
                                            onKeyDown={e => e.key !== "Enter" && handleKeyDown(e, "item_code_select")}
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
                                                    borderRadius: "0.5rem"
                                                }),
                                                valueContainer: b => ({
                                                    ...b,
                                                    padding: "0 1rem",
                                                    height: "44px"
                                                }),
                                                input: b => ({
                                                    ...b,
                                                    color: "black",
                                                    fontSize: "1.25rem"
                                                }),
                                                singleValue: b => ({
                                                    ...b,
                                                    color: "black",
                                                    fontWeight: "bold",
                                                    fontSize: "1.25rem"
                                                }),
                                                placeholder: b => ({ ...b, color: "#6b7280" }),
                                                option: (b, s) => ({
                                                    ...b,
                                                    fontWeight: "bold",
                                                    color: "black",
                                                    backgroundColor: s.isFocused ? "#e5e7eb" : "white",
                                                    fontSize: "1rem"
                                                })
                                            }}
                                        />

                                    </div>
                                    {[
                                        { id: 'weight', placeholder: "බර", fieldRef: refs.weight },
                                        { id: 'price_per_kg_grid_item', placeholder: "මිල", fieldRef: refs.price_per_kg_grid_item },
                                        { id: 'packs', placeholder: "අසුරුම්", fieldRef: refs.packs },
                                        { id: 'total', placeholder: "TOTAL", fieldRef: refs.total, isReadOnly: true }
                                    ].map(({ id, placeholder, fieldRef, isReadOnly = false }, index) => (
                                        <div key={id} style={{
                                            ...(id === 'weight' && {
                                                gridColumnStart: 8,
                                                gridColumnEnd: 9,
                                                marginLeft: "-70px",
                                                width: "100px"  // Make this same as price_per_kg_grid_item
                                            }),
                                            ...(id === 'price_per_kg_grid_item' && {
                                                gridColumnStart: 9,
                                                gridColumnEnd: 10,
                                                marginLeft: "-30px",
                                                width: "100px"  // Same as weight field
                                            }),
                                            ...(id === 'packs' && {
                                                gridColumnStart: 10,
                                                gridColumnEnd: 11
                                            }),
                                            ...(id === 'total' && {
                                                gridColumnStart: 11,
                                                gridColumnEnd: 14,
                                                marginLeft: "10px"
                                            })
                                        }}>
                                            <input id={id} ref={fieldRef} name={id} type="text" value={id === 'price_per_kg_grid_item' ? gridPricePerKg : formData[id]} onChange={(e) => { const v = e.target.value; if (id === 'price_per_kg_grid_item') handleInputChange(id, v); else if (/^\d*\.?\d*$/.test(v)) handleInputChange(id, v); }} onKeyDown={(e) => handleKeyDown(e, id)} placeholder={placeholder} readOnly={isReadOnly} className="px-2 py-1 uppercase font-bold text-xs border rounded bg-white text-black placeholder-gray-500 text-center w-full" style={{ backgroundColor: isReadOnly ? '#e2e8f0' : 'white', borderRadius: '0.5rem', textAlign: 'right', fontSize: '1.125rem', height: '40px', boxSizing: 'border-box', ...((id === 'weight' || id === 'price_per_kg_grid_item') && { maxWidth: '100px' }) }} />
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
                                        <tr key={s.id || idx} tabIndex={0} className="text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => handleEditClick(s)} onKeyDown={(e) => handleTableRowKeyDown(e, s)}>
                                            <td className="px-4 py-2 border">{s.supplier_code}</td><td className="px-4 py-2 border">{s.item_code}</td><td className="px-4 py-2 border">{s.item_name}</td><td className="px-2 py-2 border">{formatDecimal(s.weight)}</td><td className="px-2 py-2 border">{formatDecimal(s.price_per_kg)}</td><td className="px-2 py-2 border">{formatDecimal((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0) + (parseFloat(s.packs) || 0) * (parseFloat(s.pack_due) || 0))}</td><td className="px-2 py-2 border">{s.packs}</td>
                                            <td className="px-2 py-2 border text-center">
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(s.id); }} className="text-black font-bold p-1 rounded-full bg-white hover:bg-gray-200">🗑️</button>
                                            </td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            )}
                            {/* --- ADD THIS NEW FOOTER HERE --- */}
                            {/* End of Sales Table */}
                            {displayedSales.length > 0 && (
                                <SalesSummaryFooter
                                    sales={displayedSales}
                                    formatDecimal={formatDecimal}
                                />
                            )}
                            <div className="flex items-center mt-6 space-x-3 overflow-x-auto whitespace-nowrap py-2">
                                <button type="button" onClick={() => handlePrintAndClear()} disabled={state.isPrinting || displayedSales.length === 0} className={`px-4 py-1 text-sm font-bold rounded-xl shadow transition ${state.isPrinting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`} style={{ backgroundColor: '#059669', color: 'white' }}>{state.isPrinting ? 'Printing...' : 'F1-මුද්‍රණය'}</button>
                                <button type="button" onClick={handleMarkAllProcessed} disabled={selectedPrintedCustomer} className={`px-4 py-1 text-sm font-bold rounded-xl shadow transition ${selectedPrintedCustomer ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`} style={!selectedPrintedCustomer ? { backgroundColor: '#2563eb', color: 'white' } : { color: 'white' }}>F5-පසුව මුද්‍රණය</button>

                                <div style={{ marginLeft: '660px', marginTop: '-25px' }}>
                                    <input id="given_amount" ref={refs.given_amount} name="given_amount" type="number" value={formData.given_amount} onChange={(e) => handleInputChange('given_amount', e.target.value)} onKeyDown={(e) => handleKeyDown(e, "given_amount")} placeholder="දුන් මුදල" className="px-4 py-2 border rounded-xl text-right bg-white text-black" style={{ width: '180px' }} />
                                </div>
                            </div>
                            <div className="flex gap-4 items-start">
                                <ItemSummary sales={displayedSales} formatDecimal={formatDecimal} />
                                <BreakdownDisplay sale={selectedSaleForBreakdown} formatDecimal={formatDecimal} />
                            </div>
                            <div className="flex items-center justify-between mt-6 mb-4">
                                <div className="text-2xl font-bold" style={{ color: 'red' }}>
                                    (විකුණුම්: Rs. {formatDecimal(salesTotal)} + මල්ලක අගය: Rs. {formatDecimal(packCostTotal)} )
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="right-sidebar" style={{ backgroundColor: '#1ec139ff', borderRadius: '0.75rem', maxHeight: '80.5vh', overflowY: 'auto', gridColumnStart: 3, gridColumnEnd: 4 }}>
                        {hasData ? (<CustomerList customers={unprintedCustomers} type="unprinted" searchQuery={searchQueries.unprinted} onSearchChange={(value) => updateState({ searchQueries: { ...searchQueries, unprinted: value } })} selectedPrintedCustomer={selectedPrintedCustomer} selectedUnprintedCustomer={selectedUnprintedCustomer} handleCustomerClick={handleCustomerClick} formatDecimal={formatDecimal} allSales={allSales} lastUpdate={state.forceUpdate || state.windowFocused} />) : (
                            <div className="w-full shadow-xl rounded-xl overflow-y-auto border border-black p-4 text-center" style={{ backgroundColor: "#1ec139ff", maxHeight: "80.5vh" }}>
                                <div style={{ backgroundColor: "#006400" }} className="p-1 rounded-t-xl"><h2 className="font-bold text-white mb-1 whitespace-nowrap text-center" style={{ fontSize: '14px' }}>මුද්‍රණය නොකළ</h2></div><div className="py-4"><p className="text-gray-700">No unprinted customers data available</p></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}