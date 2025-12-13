import React, { useState, useEffect, useMemo, useRef } from "react";
import Select from "react-select";
import Layout from "../Layout/Layout";
import '../../App.css';
import api from "../../api"; // Using the dedicated axios instance

// Centralized API routes
const routes = {
    markPrinted: "/sales/mark-printed",
    getLoanAmount: "/get-loan-amount",
    markAllProcessed: "/sales/mark-all-processed",
    givenAmount: "/sales", // Used for PUT /sales/:id/given-amount
    sales: "/sales", // Used for GET/POST/PUT/DELETE /sales and /sales/:id
    customers: "/customers",
    items: "/items",
    suppliers: "/suppliers"
};

// =======================================================
// Rendering the printed and unprinted customer lists
// =======================================================
const CustomerList = React.memo(({
    customers, type, searchQuery, onSearchChange, selectedPrintedCustomer,
    selectedUnprintedCustomer, handleCustomerClick, formatDecimal, allSales,
    lastUpdate // Added prop
}) => {
    const getPrintedCustomerGroups = () => {
        const groups = {};
        allSales
            .filter(s => s.bill_printed === 'Y' && s.bill_no)
            .forEach(sale => {
                const groupKey = `${sale.customer_code}-${sale.bill_no}`;
                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        customerCode: sale.customer_code,
                        billNo: sale.bill_no,
                        displayText: `${sale.customer_code}` // Display Bill No in list
                    };
                }
            });
        return groups;
    };

    const getUnprintedCustomers = () => {
        const customerMap = {};
        allSales
            // FIX: Ensure unprinted sales include 'N' and null/undefined bill_printed status
            .filter(s => s.bill_printed === 'N' || s.bill_printed === null || s.bill_printed === undefined || s.bill_printed === '')
            .forEach(sale => {
                const customerCode = sale.customer_code;
                const saleTimestamp = new Date(sale.timestamp || sale.created_at || sale.date || sale.id);

                // Use the latest timestamp to represent the customer if multiple unprinted sales exist
                if (!customerMap[customerCode] || saleTimestamp > new Date(customerMap[customerCode].latestTimestamp)) {
                    customerMap[customerCode] = {
                        customerCode: customerCode,
                        latestTimestamp: sale.timestamp || sale.created_at || sale.date || sale.id,
                        originalItem: customerCode
                    };
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
            groupsArray = groupsArray.filter(group =>
                group.customerCode.toLowerCase().startsWith(lowerQuery) ||
                group.billNo.toString().toLowerCase().startsWith(lowerQuery) ||
                group.displayText.toLowerCase().startsWith(lowerQuery)
            );
        }
        return groupsArray.sort((a, b) => {
            const billNoA = parseInt(a.billNo) || 0;
            const billNoB = parseInt(b.billNo) || 0;
            return billNoB - billNoA;
        });
    }, [printedCustomerGroups, searchQuery, type]);

    const filteredUnprintedCustomers = useMemo(() => {
        if (type !== "unprinted") return [];
        let customersArray = Object.values(unprintedCustomerMap);
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            customersArray = customersArray.filter(customer =>
                customer.customerCode.toLowerCase().startsWith(lowerQuery)
            );
        }
        return customersArray.sort((a, b) =>
            new Date(b.latestTimestamp) - new Date(a.latestTimestamp)
        );
    }, [unprintedCustomerMap, searchQuery, type]);

    const displayItems = type === "printed" ? filteredPrintedGroups : filteredUnprintedCustomers;

    const isSelected = (item) => {
        if (type === "printed") {
            const selectionKey = `${item.customerCode}-${item.billNo}`;
            return selectedPrintedCustomer === selectionKey;
        } else {
            return selectedUnprintedCustomer === item.customerCode;
        }
    };

    return (
        <div
            key={`${type}-${lastUpdate || ''}`} // Force re-render on updates
            className="w-full shadow-xl rounded-xl overflow-y-auto border border-black"
            style={{
                backgroundColor: "#1ec139ff",
                maxHeight: "80.5vh",
                overflowY: "auto"
            }}
        >
            <div style={{ backgroundColor: "#006400" }} className="p-1 rounded-t-xl">
                <h2
                    className="font-bold text-white mb-1 whitespace-nowrap text-center"
                    style={{ fontSize: '14px' }} // <-- customize this
                >
                    {type === "printed" ? "මුද්‍රණය කළ" : "මුද්‍රණය නොකළ"}
                </h2>
                <input
                    type="text"
                    placeholder={`Search by ${type === "printed" ? "Bill No or Code..." : "Customer Code..."}`}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
                    className="px-4 py-0.5 border rounded-xl focus:ring-2 focus:ring-blue-300 uppercase"
                    style={{ width: '155px' }} // <-- customize this
                />

            </div>

            <div className="py-1">
                {displayItems.length === 0 ? (
                    <p className="text-gray-700">No {type === "printed" ? "printed sales" : "unprinted sales"} found.</p>
                ) : (
                    <ul className="flex flex-col px-1">
                        {displayItems.map((item) => {
                            let customerCode, displayText, totalAmount;

                            if (type === "printed") {
                                customerCode = item.customerCode;
                                displayText = item.displayText;
                                const billSales = allSales.filter(s =>
                                    s.customer_code === item.customerCode && s.bill_no === item.billNo
                                );
                                totalAmount = billSales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0);
                            } else {
                                customerCode = item.customerCode;
                                displayText = item.customerCode;
                                // FIX: Calculate total based ONLY on unprinted sales for display
                                const customerSales = allSales.filter(s =>
                                    s.customer_code === item.customerCode &&
                                    (s.bill_printed === 'N' || s.bill_printed === null || s.bill_printed === undefined || s.bill_printed === '')
                                );
                                totalAmount = customerSales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0);
                            }

                            const isItemSelected = isSelected(item);

                            return (
                                <li key={type === "printed" ? `${item.customerCode}-${item.billNo}` : item.customerCode} className="flex">
                                    <button
                                        onClick={() => {
                                            if (type === "printed") {
                                                const billSales = allSales.filter(s =>
                                                    s.customer_code === item.customerCode && s.bill_no === item.billNo
                                                );
                                                handleCustomerClick(type, item.customerCode, item.billNo, billSales);
                                            } else {
                                                // FIX: Filter sales by customer code AND unprinted status for clicking
                                                const customerSales = allSales.filter(s =>
                                                    s.customer_code === item.customerCode &&
                                                    (s.bill_printed === 'N' || s.bill_printed === null || s.bill_printed === undefined || s.bill_printed === '')
                                                );
                                                handleCustomerClick(type, item.customerCode, null, customerSales);
                                            }
                                        }}
                                        // 🟢 FIX 1: Use inline style for required light blue BG color and fallback classes
                                        className={`w-full py-1 mb-2 rounded-xl border text-left ${isItemSelected
                                            ? "border-blue-600"
                                            : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                                            }`}
                                        style={isItemSelected
                                            ? { backgroundColor: '#93C5FD' } // Light Blue Hex Code (forcing override)
                                            : {}
                                        }
                                    >
                                        <span
                                            // 🟢 FIX 2: Ensure Black Text for visibility on light BG
                                            className={`font-semibold truncate pl-4 text-right ${isItemSelected ? 'text-black' : 'text-gray-700'}`}
                                            style={{ display: 'inline-block', width: '120px' }}
                                        >
                                            {displayText} - {formatDecimal(totalAmount)}
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

// Below the main sales table Item summary Rendering
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
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 w-[100px] mx-auto">
            <h3 className="text-xs font-bold text-gray-700 mb-2 text-center">Item Summary</h3>

            <div className="flex flex-wrap gap-1 justify-center">
                {Object.entries(summary).map(([itemName, data]) => (
                    <div
                        key={itemName}
                        className="px-2 py-1 bg-white border border-gray-300 rounded-full text-[10px] font-medium"
                    >
                        <span className="font-bold text-black">{itemName}:</span>
                        <span className="ml-1 font-extrabold text-black">{data.totalWeight}kg</span>
                        <span className="ml-1 font-extrabold text-black">/</span>
                        <span className="ml-1 font-extrabold text-black">{data.totalPacks}p</span>
                    </div>
                ))}
            </div>
        </div>

    );
};

export default function SalesEntry() {
    // --- Configuration ---
    const initialFormData = {
        customer_code: "", customer_name: "", supplier_code: "", code: "", item_code: "",
        item_name: "", weight: "", price_per_kg: "", pack_due: "", total: "", packs: "",
        given_amount: ""
    };

    // 🚀 FIXED: Renaming refs to match the strings used in fieldOrder array for clarity and reliability
    const refs = {
        customer_code_input: useRef(null),    // 0
        customer_code_select: useRef(null),   // 1
        given_amount: useRef(null),         // 2 (Added ref for given amount)
        supplier_code: useRef(null),      // 3
        item_code_select: useRef(null),     // 4
        item_name: useRef(null),             // 5 (Not used for focus, skipping to 6)
        weight: useRef(null),             // 6
        price_per_kg: useRef(null),         // 7
        packs: useRef(null),              // 8
        total: useRef(null),               // 9 (Not used for focus/skip, last field)
    };

    const fieldOrder = ["customer_code_input", "customer_code_select", "given_amount", "supplier_code", "item_code_select", "weight", "price_per_kg", "packs", "total"];
    // Simplified skip map to jump over the fields that don't need manual text entry/selection
    const skipMap = {
        customer_code_input: "given_amount",
        customer_code_select: "given_amount", // If selected via dropdown, still moves to given amount
        given_amount: "supplier_code",
        supplier_code: "item_code_select",
        item_code_select: "weight"
    };
    // --- End Configuration ---

    const [state, setState] = useState({
        allSales: [],
        selectedPrintedCustomer: null,
        selectedUnprintedCustomer: null,
        editingSaleId: null,
        searchQueries: { printed: "", unprinted: "" },
        errors: {},
        loanAmount: 0,
        isManualClear: false,
        isSubmitting: false,
        formData: initialFormData,
        packCost: 0,
        customerSearchInput: "",
        itemSearchInput: "",
        supplierSearchInput: "",
        currentBillNo: null,
        isLoading: false, // Changed to false initially - no loading screen
        customers: [],
        items: [],
        suppliers: [],
        forceUpdate: null, // Added for forcing re-renders
        windowFocused: null, // Added for window focus tracking
        isPrinting: false, // Added for print status
        // 🚀 NEW STATE: To track the selected bill size
        billSize: '3inch' // Default to 3inch
    });

    const setFormData = (updater) => setState(prev => ({
        ...prev,
        formData: typeof updater === 'function' ? updater(prev.formData) : updater
    }));

    const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

    const { allSales, customerSearchInput, selectedPrintedCustomer, selectedUnprintedCustomer, editingSaleId, searchQueries, errors, loanAmount, isManualClear, formData, packCost,
        isLoading, customers, items, suppliers, isPrinting, billSize
    } = state;

    // --- Derived State (useMemo) ---
    const { newSales, printedSales, unprintedSales } = useMemo(() => ({
        newSales: allSales.filter(s => s.id && s.bill_printed !== 'Y' && s.bill_printed !== 'N'),
        // FIX: unprintedSales definition must include null/undefined status to capture truly new sales
        printedSales: allSales.filter(s => s.bill_printed === 'Y'),
        unprintedSales: allSales.filter(s => s.bill_printed === 'N' || s.bill_printed === null || s.bill_printed === undefined || s.bill_printed === '')
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
            // FIX: Filter unprinted sales accurately for display
            sales = [...sales, ...unprintedSales.filter(s => s.customer_code === selectedUnprintedCustomer)];
        } else if (selectedPrintedCustomer && selectedPrintedCustomer.includes('-')) {
            const [customerCode, billNo] = selectedPrintedCustomer.split('-');
            sales = [...sales, ...printedSales.filter(s =>
                s.customer_code === customerCode && s.bill_no === billNo
            )];
        } else if (selectedPrintedCustomer) {
            sales = [...sales, ...printedSales.filter(s => s.customer_code === selectedPrintedCustomer)];
        }

        return sales.slice().reverse();
    }, [newSales, unprintedSales, printedSales, selectedUnprintedCustomer, selectedPrintedCustomer]);

    const autoCustomerCode = useMemo(() =>
        displayedSales.length > 0 && !isManualClear ? displayedSales[0].customer_code || "" : "",
        [displayedSales, isManualClear]
    );

    const currentBillNo = useMemo(() => {
        if (selectedPrintedCustomer && selectedPrintedCustomer.includes('-')) {
            const [, billNo] = selectedPrintedCustomer.split('-');
            return billNo || "N/A";
        } else if (selectedPrintedCustomer) {
            return printedSales.find(s => s.customer_code === selectedPrintedCustomer)?.bill_no || "N/A";
        }
        return "";
    }, [selectedPrintedCustomer, printedSales]);

    const calculateTotal = (sales) => sales.reduce((acc, s) =>
        acc + (parseFloat(s.total) || parseFloat(s.weight || 0) * parseFloat(s.price_per_kg || 0) || 0), 0
    );

    const mainTotal = calculateTotal(displayedSales);
    const formatDecimal = (val) => (Number.isFinite(parseFloat(val)) ? parseFloat(val).toFixed(2) : "0.00");
    // --- End Derived State ---

    // --- API Helpers ---
    const fetchLoanAmount = async (customerCode) => {
        if (!customerCode) return updateState({ loanAmount: 0 });
        try {
            const response = await api.post(routes.getLoanAmount, {
                customer_short_name: customerCode
            });
            const loanData = response.data;
            updateState({ loanAmount: parseFloat(loanData.total_loan_amount) || 0 });
        } catch (loanError) {
            console.error('Error fetching loan amount:', loanError);
            updateState({ loanAmount: 0 });
        }
    };

    const fetchInitialData = async () => {
        try {
            const [resSales, resCustomers, resItems, resSuppliers] = await Promise.all([
                api.get(routes.sales),
                api.get(routes.customers),
                api.get(routes.items),
                api.get(routes.suppliers)
            ]);

            // Assuming your Laravel API wraps collections in a 'data' key or returns the array directly
            const salesData = resSales.data.data || resSales.data.sales || resSales.data || [];
            const customersData = resCustomers.data.data || resCustomers.data.customers || resCustomers.data || [];
            const itemsData = resItems.data.data || resItems.data.items || resItems.data || [];
            const suppliersData = resSuppliers.data.data || resSuppliers.data.suppliers || resSuppliers.data || [];

            updateState({
                allSales: salesData,
                customers: customersData,
                items: itemsData,
                suppliers: suppliersData,
                isLoading: false
            });
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
            // The api.js interceptor will handle 401 redirect, so we only handle other errors here.
            updateState({ errors: { form: 'Failed to load data. Check console.' } });
        }
    };
    // --- End API Helpers ---

    // --- Effects ---
    // Calculate Total effect
    useEffect(() => {
        const w = parseFloat(formData.weight) || 0;
        const p = parseFloat(formData.price_per_kg) || 0;
        const packs = parseInt(formData.packs) || 0;
        const packDue = parseFloat(formData.pack_due) || 0;

        const total = (w * p) + (packs * packDue);

        setFormData(prev => ({
            ...prev,
            total: Number(total.toFixed(2))    // ALWAYS shows 0.00 instead of ""
        }));
    }, [formData.weight, formData.price_per_kg, formData.packs, formData.pack_due]);


    // Window focus effect for print dialog
    useEffect(() => {
        const handleWindowFocus = () => {
            // When window regains focus (after print dialog), force a state update
            updateState(prev => ({ ...prev, windowFocused: Date.now() }));
        };

        window.addEventListener('focus', handleWindowFocus);

        return () => {
            window.removeEventListener('focus', handleWindowFocus);
        };
    }, []);

    // Initial Data Fetch and Focus on Mount
    useEffect(() => {
        fetchInitialData();
        refs.customer_code_input.current?.focus();
    }, []);
    // --- End Effects ---

    // --- Handlers ---
    const handleKeyDown = (e, currentFieldName) => {
        if (e.key === "Enter") {
            e.preventDefault();

            // 1. Handle special submission logic for 'given_amount' and 'packs'
            if (currentFieldName === "given_amount" && formData.given_amount) {
                return handleSubmitGivenAmount(e);
            }

            if (currentFieldName === "packs") {
                return handleSubmit(e);
            }

            // 2. Determine the next field name based on sequential flow or skip map
            const currentIndex = fieldOrder.indexOf(currentFieldName);
            let nextFieldName = skipMap[currentFieldName];

            if (!nextFieldName) {
                let nextIndex = currentIndex + 1;
                // Skip the dropdown fields after an input is focused on
                // Skip 'item_name' and 'total' as they are derived/read-only
                while (nextIndex < fieldOrder.length &&
                    (fieldOrder[nextIndex] === "customer_code_select" ||
                        fieldOrder[nextIndex] === "item_name" ||
                        fieldOrder[nextIndex] === "total")) {
                    nextIndex++;
                }

                if (nextIndex < fieldOrder.length) {
                    nextFieldName = fieldOrder[nextIndex];
                } else {
                    // Loop back to the start if at the end (or another field if looping is needed)
                    nextFieldName = "customer_code_input";
                }
            }

            // 3. Find the corresponding ref and focus/select
            const nextRef = refs[nextFieldName];

            if (nextRef && nextRef.current) {
                requestAnimationFrame(() => setTimeout(() => {
                    if (nextFieldName.includes("select")) {
                        // For react-select, sometimes focus needs a slight delay or specific handling
                        nextRef.current.focus();
                    } else {
                        // For native inputs, focus and select all text
                        nextRef.current.focus();
                        nextRef.current.select();
                    }
                }, 0));
            } else {
                console.log(`Warning: Could not find ref for next field: ${nextFieldName}`);
            }
        }
    };


    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        if (field === 'customer_code') {
            const trimmedValue = value.trim();
            updateState({ isManualClear: value === '' });

            const matchingCustomer = unprintedCustomers.find(code => code.toLowerCase() === trimmedValue.toLowerCase());
            if (matchingCustomer) {
                updateState({ selectedUnprintedCustomer: matchingCustomer, selectedPrintedCustomer: null });
            } else if (selectedUnprintedCustomer) {
                updateState({ selectedUnprintedCustomer: null });
            }

            if (!trimmedValue) {
                updateState({ loanAmount: 0 });
                setFormData(prev => ({ ...prev, given_amount: "" }));
            }

            const customer = customers.find(c => c.short_name === value);

            const customerSales = allSales.filter(s => s.customer_code === trimmedValue);
            const firstSale = customerSales[0];
            const givenAmount = firstSale?.given_amount || "";

            setFormData(prev => ({
                ...prev,
                customer_name: customer?.name || "",
                given_amount: givenAmount
            }));

            fetchLoanAmount(trimmedValue);
        }

        if (field === 'supplier_code') {
            setFormData(prev => ({ ...prev, supplier_code: value }));
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
                weight: editingSaleId ? prev.weight : "",
                price_per_kg: editingSaleId ? prev.price_per_kg : "",
                packs: editingSaleId ? prev.packs : "",
                leading_sales_id: editingSaleId ? prev.leading_sales_id : "",
                total: editingSaleId ? prev.total : ""
            }));
            updateState({ packCost: fetchedPackCost, itemSearchInput: "" });

            // Focus on weight field after selection (index 6)
            setTimeout(() => refs.weight.current?.focus(), 100);
        } else {
            setFormData(prev => ({
                ...prev,
                item_code: "",
                item_name: "",
                pack_due: "",
                price_per_kg: "",
                weight: "",
                packs: "",
                leading_sales_id: "",
                total: ""
            }));
            updateState({ packCost: 0, itemSearchInput: "" });
        }
    };

    const handleCustomerSelect = (selectedOption) => {
        const short = selectedOption ? selectedOption.value : "";
        const customer = customers.find(x => String(x.short_name) === String(short));

        const hasUnprintedSales = unprintedCustomers.includes(short);
        const hasPrintedSales = printedSales.some(s => s.customer_code === short);

        updateState({
            selectedUnprintedCustomer: hasUnprintedSales ? short : null,
            selectedPrintedCustomer: null, // Clear printed selection
            customerSearchInput: ""
        });

        // Find existing given amount from all sales for this customer
        const existingGivenAmount = allSales.find(s => s.customer_code === short)?.given_amount || "";

        setFormData(prev => ({
            ...prev,
            customer_code: short || "",
            customer_name: customer?.name || "",
            given_amount: existingGivenAmount
        }));

        fetchLoanAmount(short);
        updateState({ isManualClear: false });

        if (hasUnprintedSales) {
            // Immediately save the existing given amount if there are unsaved sales
            // This is handled by a call to handleSubmitGivenAmount 
        }

        // Focus on given_amount after selection (index 2)
        setTimeout(() => {
            refs.given_amount.current?.focus();
            refs.given_amount.current?.select();
        }, 100);
    };

    const handleEditClick = (sale) => {
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
            packs: sale.packs || "",
        });
        updateState({ editingSaleId: sale.id, isManualClear: false });
        setTimeout(() => { refs.weight.current?.focus(); refs.weight.current?.select(); }, 0);
    };

    const handleTableRowKeyDown = (e, sale) => {
        if (e.key === "Enter") { e.preventDefault(); handleEditClick(sale); }
    };

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
            ...(clearBillNo && { currentBillNo: null })
        });
    };

    const handleDeleteClick = async () => {
        if (!editingSaleId || !window.confirm("Are you sure you want to delete this sales record?")) return;

        try {
            await api.delete(`${routes.sales}/${editingSaleId}`);

            updateState({
                allSales: allSales.filter(s => s.id !== editingSaleId)
            });
            handleClearForm();
        } catch (error) {
            updateState({ errors: { form: error.response?.data?.message || error.message } });
        }
    };

    const handleSubmitGivenAmount = async (e) => {
        if (e) e.preventDefault();
        updateState({ errors: {} });

        const customerCode = formData.customer_code || autoCustomerCode;

        if (!customerCode) {
            updateState({ errors: { form: "Please enter or select a customer code first" } });
            refs.customer_code_input.current?.focus();
            return;
        }

        if (!formData.given_amount) {
            updateState({ errors: { form: "Please enter a given amount" } });
            return;
        }

        const salesToUpdate = displayedSales.filter(s => s.id);

        if (salesToUpdate.length === 0) {
            updateState({ errors: { form: "No sales records found to update. Please add sales records first." } });
            return;
        }

        try {
            const givenAmount = parseFloat(formData.given_amount) || 0;

            // Assuming a single endpoint for given amount update: PUT /sales/:id/given-amount
            const updatePromises = salesToUpdate.map(sale => {
                const url = `${routes.sales}/${sale.id}/given-amount`;
                return api.put(url, { given_amount: givenAmount });
            });

            const results = await Promise.all(updatePromises);

            const updatedSalesMap = {};
            results.forEach(response => {
                if (response.data.sale) {
                    updatedSalesMap[response.data.sale.id] = response.data.sale;
                }
            });

            updateState({
                allSales: allSales.map(s =>
                    updatedSalesMap[s.id] ? updatedSalesMap[s.id] : s
                )
            });

            setFormData(prev => ({
                ...prev,
                given_amount: ""
            }));

            refs.supplier_code.current?.focus();

            console.log(`Successfully stored ${givenAmount} in ${salesToUpdate.length} sales records for the current bill`);

        } catch (error) {
            updateState({ errors: { form: error.response?.data?.message || error.message } });
        }
    };

    const { isSubmitting } = state;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) {
            console.log('Submission already in progress...');
            return;
        }

        updateState({ errors: {}, isSubmitting: true });

        try {
            const customerCode = formData.customer_code || autoCustomerCode;

            if (!customerCode) {
                updateState({
                    errors: { form: "Customer code is required" },
                    isSubmitting: false
                });
                refs.customer_code_input.current?.focus();
                return;
            }

            const isEditing = editingSaleId !== null;

            if (!isEditing && selectedPrintedCustomer) {
                updateState({
                    errors: { form: "Cannot add new entries to printed bills. Please edit existing records or select an unprinted customer." },
                    isSubmitting: false
                });

                setTimeout(() => {
                    updateState({ errors: {} });
                }, 1000);

                return;
            }

            let billPrintedStatus = undefined;
            let billNoToUse = null;

            if (!isEditing) {
                if (state.currentBillNo) {
                    billPrintedStatus = 'Y';
                    billNoToUse = state.currentBillNo;
                } else {
                    if (selectedPrintedCustomer) {
                        billPrintedStatus = 'Y';
                        if (selectedPrintedCustomer.includes('-')) {
                            const [, billNo] = selectedPrintedCustomer.split('-');
                            billNoToUse = billNo;
                        } else {
                            const printedSale = printedSales.find(s => s.customer_code === selectedPrintedCustomer);
                            billNoToUse = printedSale?.bill_no;
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

                // 🚀 ADDED: Flag to trigger backend logic for price synchronization
                ...(isEditing && { update_related_price: true }),
            };

            const url = isEditing ? `${routes.sales}/${editingSaleId}` : routes.sales;
            const method = isEditing ? "put" : "post";

            const response = await api[method](url, payload);

            let updatedSales = [];

            // 🟢 MODIFIED: Consolidated Logic to Extract Updated Sales Array (Fixes "newSale is undefined" error)
            if (response.data.sales) {
                // Case 1: Backend returns an array under 'sales' (PUT/Bulk Update)
                updatedSales = response.data.sales;
            } else if (response.data.sale) {
                // Case 2: Backend returns a single object under 'sale' (PUT/Single Update)
                updatedSales = [response.data.sale];
            } else if (response.data.data) {
                // Case 3: Backend returns a single object under 'data' (POST/Laravel Resource)
                updatedSales = [response.data.data];
            } else if (response.data.id) {
                // Case 4: Backend returns the single object directly
                updatedSales = [response.data];
            }

            if (updatedSales.length === 0) {
                // If this is an addition, we expect at least one sale back.
                throw new Error("Server response structure is unexpected or empty.");
            }

            // --- State Merging Logic ---
            const updatedIds = updatedSales.map(s => s.id);

            // Filter out old records by ID, then concatenate the new/updated records
            const newAllSales = allSales
                .filter(s => !updatedIds.includes(s.id))
                .concat(updatedSales);

            updateState({
                allSales: newAllSales
            });

            // The rest of the state/form reset
            setFormData(prevForm => ({
                customer_code: prevForm.customer_code || customerCode,
                customer_name: prevForm.customer_name,
                supplier_code: "", code: "", item_code: "", item_name: "", weight: "", price_per_kg: "", pack_due: "", total: "", packs: "",
                given_amount: ""
            }));

            updateState({
                editingSaleId: null,
                isManualClear: false,
                isSubmitting: false,
                packCost: 0
            });

            // Focus on the supplier code field after successful submission
            refs.supplier_code.current?.focus();
        } catch (error) {
            updateState({ errors: { form: error.response?.data?.message || error.message || error.toString() }, isSubmitting: false });
        }
    };

    const handleCustomerClick = async (type, customerCode, billNo = null, salesRecords = []) => {
        // Prevent interaction if print is in progress
        if (state.isPrinting) return;

        const isPrinted = type === 'printed';
        let selectionKey = customerCode;
        if (isPrinted && billNo) {
            selectionKey = `${customerCode}-${billNo}`;
        }

        const isCurrentlySelected = isPrinted
            ? selectedPrintedCustomer === selectionKey
            : selectedUnprintedCustomer === selectionKey;

        // Immediate UI feedback
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
            setFormData({
                ...initialFormData,
                customer_code: customerCode,
                customer_name: customer?.name || "",
                given_amount: salesRecords[0]?.given_amount || ""
            });

            // Fetch loan amount
            fetchLoanAmount(customerCode);

            // Focus on supplier code after selection
            setTimeout(() => {
                if (refs.supplier_code.current) {
                    refs.supplier_code.current.focus();
                }
            }, 50);
        } else {
            handleClearForm();
            setTimeout(() => {
                if (refs.customer_code_input.current) {
                    refs.customer_code_input.current.focus();
                }
            }, 50);
        }

        updateState({
            editingSaleId: null,
            isManualClear: false,
            customerSearchInput: ""
        });
    };

    const handleMarkAllProcessed = async () => {
        const salesToProcess = [...newSales, ...unprintedSales];
        if (salesToProcess.length === 0) return;

        try {
            const response = await api.post(routes.markAllProcessed, {
                sales_ids: salesToProcess.map(s => s.id)
            });

            if (response.data.success) {
                updateState({
                    allSales: allSales.map(s =>
                        salesToProcess.some(ps => ps.id === s.id)
                            ? { ...s, bill_printed: "N" }
                            : s
                    )
                });
                handleClearForm();
                updateState({ selectedUnprintedCustomer: null, selectedPrintedCustomer: null });
                [50, 100, 150, 200, 250].forEach(timeout =>
                    setTimeout(() => refs.customer_code_input.current?.focus(), timeout)
                );
            }
        } catch (err) {
            console.error("Failed to mark sales as processed:", err.message);
        }
    };

    const handleDeleteRecord = async (saleId) => {
        if (!saleId || !window.confirm("Are you sure you want to delete this sales record?")) return;

        try {
            await api.delete(`${routes.sales}/${saleId}`);

            updateState({
                allSales: allSales.filter(s => s.id !== saleId)
            });

            if (editingSaleId === saleId) {
                handleClearForm();
            }
        } catch (error) {
            updateState({ errors: { form: error.response?.data?.message || error.message } });
        }
    };

    const handleFullRefresh = async () => {
        updateState({ isLoading: true });
        try {
            await fetchInitialData();
        } catch (error) {
            console.error('Refresh failed:', error);
        } finally {
            updateState({ isLoading: false });
        }
    };

    const printSingleContent = async (html, customerName) => {
        return new Promise((resolve) => {
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                alert("Please allow pop-ups for printing");
                resolve();
                return;
            }

            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Bill - ${customerName}</title>
                    <style>
                        body { margin: 0; padding: 20px; }
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    ${html}
                    <script>
                        // Auto-print when window loads
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                // Close window after print or timeout
                                setTimeout(function() {
                                    window.close();
                                }, 1000);
                            }, 500);
                        };
                        
                        // Handle print cancellation
                        window.onafterprint = function() {
                            setTimeout(function() {
                                window.close();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();

            // Monitor the print window
            const checkPrintWindow = setInterval(() => {
                if (printWindow.closed) {
                    clearInterval(checkPrintWindow);
                    resolve();
                }
            }, 500);

            // Fallback timeout
            setTimeout(() => {
                clearInterval(checkPrintWindow);
                if (!printWindow.closed) {
                    printWindow.close();
                }
                resolve();
            }, 10000);
        });
    };

    // 🚀 MODIFIED: Implemented conditional logic to switch between 3inch (original format) and 4inch (one-line item name)
  const buildFullReceiptHTML = (salesData, billNo, customerName, mobile, globalLoanAmount = 0, billSize = '3inch') => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    let totalAmountSum = 0, totalPacksSum = 0;

    // Define styles based on billSize
    const is4Inch = billSize === '4inch';
    const receiptMaxWidth = is4Inch ? '4in' : '300px';
    const fontSizeHeader = is4Inch ? '1.2em' : '1.8em';
    const fontSizeTitle = is4Inch ? '1.4em' : '2.0em';
    const fontSizeText = is4Inch ? '0.8rem' : '0.9rem';
    const fontSizeItems = is4Inch ? '0.9em' : '1.5em';
    const fontSizeTotalLarge = is4Inch ? '1.2em' : '1.5em';

    // Define column widths for both formats
    let colGroups, itemHeader;
    
    if (is4Inch) {
        // 4-inch format: Item+Packs | Weight | Price | Value | Supplier
        colGroups = `
            <colgroup>
                <col style="width:25%;"> <!-- Item + Packs -->
                <col style="width:15%;"> <!-- Weight -->
                <col style="width:15%;"> <!-- Price -->
                <col style="width:20%;"> <!-- Value -->
                <col style="width:25%;"> <!-- Supplier -->
            </colgroup>
        `;
        itemHeader = 'වර්ගය (මලු)';
    } else {
        // 3-inch format: Item | Weight | Price | Value | Supplier
        colGroups = `
            <colgroup>
                <col style="width:30%;"> <!-- Item + Packs below -->
                <col style="width:15%;"> <!-- Weight -->
                <col style="width:15%;"> <!-- Price -->
                <col style="width:20%;"> <!-- Value -->
                <col style="width:20%;"> <!-- Supplier -->
            </colgroup>
        `;
        itemHeader = 'වර්ගය';
    }

    const itemsHtml = salesData.map(s => {
        totalAmountSum += parseFloat(s.total) || 0;
        const packs = parseInt(s.packs) || 0;
        totalPacksSum += packs;
        
        const weight = parseFloat(s.weight) || 0;
        const price = parseFloat(s.price_per_kg) || 0;
        const value = (weight * price).toFixed(2);

        if (is4Inch) {
            // 4-inch: Single line with item name and packs in parentheses
            return `
<tr style="font-size:${fontSizeItems};">
    <td style="text-align:left; padding:2px 4px;">${s.item_name || ""} (${packs})</td>
    <td style="text-align:center; padding:2px 4px;">${weight.toFixed(2)}</td>
    <td style="text-align:center; padding:2px 4px;">${price.toFixed(2)}</td>
    <td style="text-align:right; padding:2px 4px;">${value}</td>
    <td style="text-align:right; padding:2px 4px; font-size:0.8em;">${s.supplier_code || ""}</td>
</tr>`;
        } else {
            // 3-inch: Item name on first line, packs on second line BELOW it
            return `
<tr style="font-size:${fontSizeItems};">
    <td style="text-align:left; padding:2px 4px; vertical-align:top;">
        ${s.item_name || ""}
        <div style="font-size:0.9em; color:#666; margin-top:2px;">${packs}</div>
    </td>
    <td style="text-align:center; padding:2px 4px; vertical-align:top;">${weight.toFixed(2)}</td>
    <td style="text-align:center; padding:2px 4px; vertical-align:top;">${price.toFixed(2)}</td>
    <td style="text-align:right; padding:2px 4px; vertical-align:top;">${value}</td>
    <td style="text-align:right; padding:2px 4px; vertical-align:top; font-size:0.8em;">${s.supplier_code || ""}</td>
</tr>`;
        }
    }).join("");

    const totalPrice = totalAmountSum;
    const totalSalesExcludingPackDue = salesData.reduce(
        (sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0
    );

    const totalPackDueCost = totalPrice - totalSalesExcludingPackDue;

    const givenAmount = salesData.find(s => parseFloat(s.given_amount) > 0)?.given_amount || 0;
    const remaining = parseFloat(givenAmount) - totalPrice;

    const givenAmountRow = givenAmount > 0 ? `
<tr>
    <td style="width:50%; text-align:left; font-size:${fontSizeText}; padding:4px 0;">
        <span style="font-size:0.75rem;">දුන් මුදල: </span>
        <span style="font-weight:bold; font-size:0.9rem;">${parseFloat(givenAmount).toFixed(2)}</span>
    </td>
    <td style="width:50%; text-align:right; padding:4px 0;">
        <span style="font-size:0.8rem;">ඉතිරිය: </span>
        <span style="font-weight:bold; font-size:${fontSizeTotalLarge};">${Math.abs(remaining).toFixed(2)}</span>
    </td>
</tr>` : '';

    const totalAmountWithLoan = Math.abs(globalLoanAmount) + totalPrice;

    const loanRow = globalLoanAmount !== 0 ? `
<tr>
    <td style="font-size:${fontSizeText}; text-align:left; padding:4px 0;">
        පෙර ණය: Rs. 
        <span>${Math.abs(globalLoanAmount).toFixed(2)}</span>
    </td>
    <td style="font-weight:bold; text-align:right; font-size:${fontSizeTotalLarge}; padding:4px 0;">
        Rs. ${Math.abs(totalAmountWithLoan).toFixed(2)}
    </td>
</tr>` : '';

    return `
<div class="receipt-container" style="width:100%; max-width:${receiptMaxWidth}; margin:0 auto; padding:5px; font-family: 'Courier New', monospace;">

    <div style="text-align:center; margin-bottom:5px; border-bottom:1px solid #000;">
        <h3 style="font-size:${fontSizeHeader}; font-weight:bold; margin:0 0 5px 0;">NVDS</h3>
    </div>

    <div style="text-align:left; margin-bottom:5px;">
        <table style="width:100%; font-size:9px; border-collapse:collapse;">
            <tr>
                <td>දිනය: ${date}</td>
                <td style="text-align:right;">${time}</td>
            </tr>
            <tr>
                <td colspan="2">දුර: ${mobile || ''}</td>
            </tr>
            <tr>
                <td>බිල් අංකය: <strong>${billNo}</strong></td>
                <td style="text-align:right;">
                    <strong style="font-size:${fontSizeTitle};">${customerName.toUpperCase()}</strong>
                </td>
            </tr>
        </table>
    </div>

    <hr style="border:1px solid #000; margin:5px 0;">

    <table style="width:100%; font-size:${is4Inch ? '10px' : '9px'}; border-collapse:collapse; table-layout:fixed;">
        ${colGroups}
        <thead>
            <tr style="border-bottom:1px solid #000;">
                ${is4Inch ? `
                <th style="text-align:left; padding:4px; font-size:1.1em;">${itemHeader}</th>
                <th style="text-align:center; padding:4px; font-size:1.1em;">කිලෝ</th>
                <th style="text-align:center; padding:4px; font-size:1.1em;">මිල</th>
                <th style="text-align:right; padding:4px; font-size:1.1em;">අගය</th>
                <th style="text-align:right; padding:4px; font-size:1.1em;">sup code</th>
                ` : `
                <th style="text-align:left; padding:4px; font-size:1.2em;">${itemHeader}</th>
                <th style="text-align:center; padding:4px; font-size:1.2em;">කිලෝ</th>
                <th style="text-align:center; padding:4px; font-size:1.2em;">මිල</th>
                <th style="text-align:right; padding:4px; font-size:1.2em;">අගය</th>
                <th style="text-align:right; padding:4px; font-size:1.2em;">sup code</th>
                `}
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
            <tr style="border-top:1px solid #000;">
                <td colspan="${is4Inch ? '1' : '1'}" style="text-align:left; padding:6px 4px; font-size:${fontSizeItems}; font-weight:bold;">
                    ${totalPacksSum}
                </td>
                <td colspan="3" style="text-align:right; padding:6px 4px; font-size:${fontSizeItems}; font-weight:bold;">
                    ${totalSalesExcludingPackDue.toFixed(2)}
                </td>
            </tr>
        </tbody>
    </table>

    <table style="width:100%; font-size:${is4Inch ? '12px' : '15px'}; border-collapse:collapse; margin-top:10px;">
        <tr>
            <td style="text-align:left; padding:2px 0;">ප්‍රවාහන ගාස්තු:</td>
            <td style="text-align:right; padding:2px 0; font-weight:bold;">00</td>
        </tr>
        <tr>
            <td style="text-align:left; padding:2px 0;">කුලිය:</td>
            <td style="text-align:right; padding:2px 0; font-weight:bold;">${totalPackDueCost.toFixed(2)}</td>
        </tr>
        <tr>
            <td style="text-align:left; padding:2px 0;">අගය:</td>
            <td style="text-align:right; padding:2px 0; font-weight:bold;">
                <span style="display:inline-block; border-top:1px solid #000; border-bottom:3px double #000; padding:4px 8px; min-width:80px; text-align:right; font-size:${fontSizeTotalLarge};">
                    ${totalPrice.toFixed(2)}
                </span>
            </td>
        </tr>
        ${givenAmountRow}
        ${loanRow}
    </table>

    <div style="text-align:center; margin-top:15px; font-size:10px; border-top:1px dashed #000; padding-top:5px;">
        <p style="margin:2px 0;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p>
        <p style="margin:2px 0;">නැවත භාර ගනු නොලැබේ</p>
    </div>

</div>`;
};

    const handlePrintAndClear = async () => {
        const salesData = displayedSales.filter(s => s.id);
        if (!salesData.length) return alert("No sales records to print!");

        const hasZeroPrice = salesData.some(s => parseFloat(s.price_per_kg) === 0);
        if (hasZeroPrice) {
            alert("Cannot print! One or more items have a price per kg of 0.");
            return;
        }

        // Store the original state for restoration
        const originalState = {
            allSales: [...allSales],
            selectedPrintedCustomer,
            selectedUnprintedCustomer,
            formData: { ...formData }
        };

        try {
            const customerCode = salesData[0].customer_code || "N/A";
            const customerName = salesData[0].customer_name || customerCode;
            const mobile = salesData[0].mobile || '0702758908';

            // Set printing flag
            updateState({ isPrinting: true });

            // Step 1: Mark as printed and get bill number
            const printResponse = await api.post(routes.markPrinted, {
                sales_ids: salesData.map(s => s.id),
                force_new_bill: true
            });

            if (printResponse.data.status !== "success") {
                throw new Error(printResponse.data?.message || "Printing failed");
            }

            const billNo = printResponse.data.bill_no || "";

            // Step 2: Get loan amount
            let globalLoanAmount = 0;
            try {
                const loanResponse = await api.post(routes.getLoanAmount, {
                    customer_short_name: customerCode
                });
                globalLoanAmount = parseFloat(loanResponse.data.total_loan_amount) || 0;
            } catch (loanError) {
                console.warn("Loan amount fetch failed:", loanError);
            }

            // Step 3: Update sales to printed status IMMEDIATELY
            const salesIdsToUpdate = salesData.map(s => s.id);
            const updatedAllSales = allSales.map(s => {
                if (salesIdsToUpdate.includes(s.id)) {
                    return {
                        ...s,
                        bill_printed: 'Y',
                        bill_no: billNo
                    };
                }
                return s;
            });

            // Step 4: FULL STATE RESET - Clear everything
            updateState({
                allSales: updatedAllSales,
                selectedPrintedCustomer: null,
                selectedUnprintedCustomer: null,
                currentBillNo: null,
                loanAmount: 0, // Reset loan amount
                editingSaleId: null,
                searchQueries: { printed: "", unprinted: "" }, // Reset search
                customerSearchInput: "",
                itemSearchInput: "",
                supplierSearchInput: "",
                isManualClear: true,
                packCost: 0,
                forceUpdate: Date.now(), // Force re-render
                isPrinting: false // Clear printing flag
            });

            // Reset form completely
            setFormData({
                ...initialFormData,
                customer_code: "",
                customer_name: "",
                given_amount: ""
            });

            // Step 5: Build receipt HTML
            // 🚀 MODIFIED: Pass current billSize to the HTML builder
            const receiptHtml = buildFullReceiptHTML(salesData, billNo, customerName, mobile, globalLoanAmount, billSize);

            // Step 6: Print in separate window
            const printPromise = printSingleContent(receiptHtml, customerName);

            // Focus back on customer code field immediately
            setTimeout(() => {
                if (refs.customer_code_input.current) {
                    refs.customer_code_input.current.focus();
                    refs.customer_code_input.current.select();
                }
            }, 100);

            // Wait for print to complete
            await printPromise;

            // Step 7: Refresh data in background
            setTimeout(async () => {
                try {
                    const response = await api.get(routes.sales);
                    const freshSales = response.data.data || response.data.sales || response.data || [];

                    // Only update if data has changed
                    if (JSON.stringify(freshSales) !== JSON.stringify(updatedAllSales)) {
                        updateState({
                            allSales: freshSales,
                            forceUpdate: Date.now() // Force another re-render
                        });
                    }
                } catch (error) {
                    console.warn("Background refresh failed:", error);
                }
            }, 500);

        } catch (error) {
            console.error("Printing error:", error);
            alert("Printing failed: " + (error.message || error.toString()));

            // Restore original state on error
            updateState({
                allSales: originalState.allSales,
                selectedPrintedCustomer: originalState.selectedPrintedCustomer,
                selectedUnprintedCustomer: originalState.selectedUnprintedCustomer,
                isPrinting: false
            });
            setFormData(originalState.formData);

            // Refocus on customer field
            setTimeout(() => {
                if (refs.customer_code_input.current) {
                    refs.customer_code_input.current.focus();
                }
            }, 100);
        }
    };

    // 🚀 NEW HANDLER: To update billSize state
    const handleBillSizeChange = (e) => {
        updateState({ billSize: e.target.value });
    };

    useEffect(() => {
        const handleShortcut = (e) => {
            if (selectedPrintedCustomer && e.key === "F5") {
                e.preventDefault();
                console.log("F5 blocked - printed customer is selected");
                return;
            }
            if (e.key === "F1") {
                e.preventDefault(); handlePrintAndClear().finally(() => {
                    [100, 200, 300, 500, 800].forEach(timeout => setTimeout(() => refs.customer_code_input.current?.focus(), timeout));
                });
            } else if (e.key === "F5") { e.preventDefault(); handleMarkAllProcessed(); }
            // Note: F10 is for refresh and is manually handled/does not need to be here unless it needs different logic
        };
        window.addEventListener("keydown", handleShortcut);
        // FIX: Ensure cleanup dependencies include state variables used inside handleShortcut
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [displayedSales, newSales, selectedPrintedCustomer, handlePrintAndClear, handleMarkAllProcessed]);

    // Check if we have any data to display
    const hasData = allSales.length > 0 || customers.length > 0 || items.length > 0 || suppliers.length > 0;

    // --- Render ---
    return (
        // 🚀 MODIFIED: Pass state and handler to Layout
        <Layout 
            style={{ backgroundColor: '#99ff99' }}
            billSize={billSize}
            handleBillSizeChange={handleBillSizeChange}
        >
            <div className="sales-layout" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Show subtle loading indicator instead of blocking screen */}
                {isLoading && (
                    <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white py-1 text-center text-sm z-50">
                        Refreshing data...
                    </div>
                )}

                {/* Printing indicator */}
                {state.isPrinting && (
                    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black py-1 text-center text-sm z-50">
                        Printing in progress... Please wait
                    </div>
                )}

                {/* === THREE COLUMN LAYOUT === */}
                <div
                    className="three-column-layout"
                    style={{
                        opacity: isLoading ? 0.7 : 1,
                        // 🚀 Apply explicit grid styles based on CSS definition
                        display: 'grid',
                        gridTemplateColumns: '280px 1fr 280px',
                        gap: '16px',
                        padding: '10px',
                        marginTop: '-149px', // Added from CSS
                    }}
                >

                    {/* Left Sidebar */}
                    <div className="left-sidebar" style={{
                        backgroundColor: '#1ec139ff',
                        borderRadius: '0.75rem',
                        maxHeight: '80.5vh',
                        width: '150px', // Fixed width from CSS
                        overflowY: 'auto',
                        overflowX: 'hidden',
                       
                    }}>
                        {hasData ? (
                            <CustomerList
                                customers={printedCustomers}
                                type="printed"
                                searchQuery={searchQueries.printed}
                                onSearchChange={(value) => updateState({ searchQueries: { ...searchQueries, printed: value } })}
                                selectedPrintedCustomer={selectedPrintedCustomer}
                                selectedUnprintedCustomer={selectedUnprintedCustomer}
                                handleCustomerClick={handleCustomerClick}
                                formatDecimal={formatDecimal}
                                allSales={allSales}
                                lastUpdate={state.forceUpdate || state.windowFocused}
                            />
                        ) : (
                            <div className="w-full shadow-xl rounded-xl overflow-y-auto border border-black p-4 text-center" style={{ backgroundColor: "#1ec139ff", maxHeight: "80.5vh" }}>
                                <div style={{ backgroundColor: "#006400" }} className="p-1 rounded-t-xl">
                                    <h2 className="font-bold text-white mb-1 whitespace-nowrap text-center" style={{ fontSize: '14px' }}>
                                        මුද්‍රණය කළ
                                    </h2>
                                </div>
                                <div className="py-4">
                                    <p className="text-gray-700">No printed customers data available</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Center Form - MODIFIED FOR FIXED TOP SECTION AND SCROLLABLE TABLE */}
                    <div className="center-form flex flex-col" style={{
                        backgroundColor: '#111439ff',
                        padding: '20px',
                        borderRadius: '0.75rem',
                        color: 'white',
                        // 🚀 Apply fixed width and center positioning from CSS
                        width: '886px',
                        minWidth: '886px',
                        maxWidth: '886px',
                        marginLeft: 'calc(50% - 369px)',
                        marginRight: 'auto',
                        // Fixed height for non-jumping behavior
                        height: '150.5vh',
                        boxSizing: 'border-box',
                        // Adjust grid column span since custom margins are used.
                        gridColumnStart: 2, gridColumnEnd: 3
                    }}>

                        {/* === FIXED TOP SECTION (Input Form, Totals, and Buttons) === */}
                        <div className="flex-shrink-0">

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* === ROW 1: BILL NO & TOTAL SALES === */}
                                <div className="w-full flex justify-between items-center">
                                    <div className="text-red-600 font-bold text-lg" style={{ fontSize: '1.25rem' }}>
                                        Bill No: {currentBillNo}
                                    </div>
                                    <div className="text-red-600 font-bold text-xl whitespace-nowrap" style={{ marginLeft: "650px", marginTop: "-30px" }}>
                                        Total Sales: Rs. {formatDecimal(mainTotal)}
                                    </div>
                                </div>

                                {/* === ROW 2: CUSTOMER CODE, SELECT CUSTOMER & LOAN === */}
                                <div className="flex items-end gap-3 w-full">
                                    {/* Customer Code (Inline Compact Style) */}
                                    <div className="flex-1 min-w-0">
                                        <input
                                            id="customer_code_input"
                                            ref={refs.customer_code_input}
                                            name="customer_code"
                                            value={formData.customer_code || autoCustomerCode}
                                            onChange={(e) => {
                                                const value = e.target.value.toUpperCase();
                                                handleInputChange("customer_code", value);
                                                if (value.trim() === "") {
                                                    setFormData(prev => ({ ...prev, customer_code: "", customer_name: "", given_amount: "" }));
                                                    updateState({ selectedPrintedCustomer: null, selectedUnprintedCustomer: null });
                                                }
                                            }}
                                            onKeyDown={(e) => handleKeyDown(e, "customer_code_input")}
                                            type="text"
                                            maxLength={10}
                                            placeholder="CUSTOMER CODE"
                                            className="px-2 py-1 uppercase font-bold text-sm w-full border rounded bg-white text-black placeholder-gray-500"
                                            style={{
                                                backgroundColor: '#0d0d4d', border: '1px solid #4a5568', color: 'white',
                                                height: '36px', fontSize: '1rem', padding: '0 0.75rem', borderRadius: '0.5rem',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    {/* Customer Select (Inline Compact Style) */}
                                    <div style={{ flex: '0 0 250px', minWidth: '250px' }}>
                                        <Select
                                            id="customer_code_select"
                                            ref={refs.customer_code_select}
                                            value={formData.customer_code ? { value: formData.customer_code, label: `${formData.customer_code}` } : null}
                                            onChange={handleCustomerSelect}
                                            options={customers
                                                .filter((c) => !customerSearchInput || c.short_name.charAt(0).toUpperCase() === customerSearchInput.charAt(0).toUpperCase())
                                                .map((c) => ({ value: c.short_name, label: `${c.short_name}` }))
                                            }
                                            onInputChange={(inputValue, { action }) => { if (action === "input-change") updateState({ customerSearchInput: inputValue.toUpperCase() }); }}
                                            inputValue={customerSearchInput}
                                            placeholder="SELECT CUSTOMER"
                                            isClearable
                                            isSearchable
                                            styles={{
                                                control: (base) => ({
                                                    ...base,
                                                    minHeight: "36px", height: "36px", fontSize: "12px",
                                                    backgroundColor: "#0d0d4d", borderColor: "#4a5568", borderRadius: '0.5rem'
                                                }),
                                                valueContainer: (base) => ({ ...base, padding: "0 6px", height: "36px" }),
                                                placeholder: (base) => ({ ...base, fontSize: "12px", color: "#a0aec0", fontWeight: "normal" }),
                                                input: (base) => ({ ...base, fontSize: "12px", color: "white" }),
                                                singleValue: (base) => ({ ...base, color: "white", fontSize: "12px", fontWeight: "bold" }),
                                                option: (base, state) => ({ ...base, color: "black", fontWeight: "bold", fontSize: "12px", backgroundColor: state.isFocused ? "#e5e7eb" : "white", cursor: "pointer" }),
                                            }}
                                        />
                                    </div>

                                    {/* Loan */}
                                    <div className="flex-1 min-w-0">
                                        <div
                                            className="p-2 rounded-lg text-center border relative"
                                            style={{ backgroundColor: "white", flex: "0 0 200px", marginLeft: "80px" }}
                                        >
                                            <span className="absolute left-2 top-1 text-gray-400 text-xs pointer-events-none">
                                                Loan Amount
                                            </span>
                                            <span className="text-black font-bold text-sm">
                                                Rs. {loanAmount < 0 ? formatDecimal(Math.abs(loanAmount)) : formatDecimal(loanAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>


                                {/* === ROW 4: GRID LAYOUT FOR FIELDS (Supplier, Item, Weight, Price, Packs, Total) === */}
                                <div
                                    className="w-full"
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(12, 1fr)",
                                        columnGap: "8px",
                                        alignItems: "end",
                                        marginTop: "8px",
                                    }}
                                >
                                    {/* Supplier */}
                                    <div style={{ gridColumnStart: 1, gridColumnEnd: 3 }}>
                                        <input
                                            id="supplier_code"
                                            ref={refs.supplier_code}
                                            name="supplier_code"
                                            value={formData.supplier_code}
                                            onChange={(e) => handleInputChange("supplier_code", e.target.value.toUpperCase())}
                                            onKeyDown={(e) => handleKeyDown(e, "supplier_code")}
                                            type="text"
                                            placeholder="SUPPLIER"
                                            className="px-2 py-1 uppercase font-bold text-xs border rounded bg-white text-black placeholder-gray-500 w-full"
                                            style={{
                                                width: "150px",
                                                backgroundColor: '#0d0d4d', border: '1px solid #4a5568', color: 'white',
                                                height: '44px', fontSize: '1.25rem', padding: '0 1rem', borderRadius: '0.5rem',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    {/* Item Select */}
                                    <div
                                        style={{
                                            gridColumnStart: 5,
                                            gridColumnEnd: 8,
                                            marginLeft: "-120px",
                                            marginRight: "-02px",
                                        }}
                                    >
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
                                                            pack_due: formData.pack_due,
                                                        },
                                                    }
                                                    : null
                                            }
                                            onChange={handleItemSelect}
                                            options={items
                                                .filter((item) => {
                                                    return (
                                                        !state.itemSearchInput ||
                                                        String(item.no)
                                                            .toLowerCase()
                                                            .startsWith(state.itemSearchInput.toLowerCase()) ||
                                                        String(item.type)
                                                            .toLowerCase()
                                                            .includes(state.itemSearchInput.toLowerCase())
                                                    );
                                                })
                                                .map((item) => ({
                                                    value: item.no,
                                                    label: `${item.type} (${item.no})`,
                                                    item,
                                                }))}
                                            onInputChange={(inputValue) =>
                                                updateState({ itemSearchInput: inputValue.toUpperCase() })
                                            }
                                            inputValue={state.itemSearchInput}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    return; // ★ allow react-select to select highlighted option
                                                }
                                                handleKeyDown(e, "item_code_select");
                                            }}
                                            placeholder="SELECT ITEM"
                                            className="react-select-container font-bold text-sm w-full"
                                            styles={{
                                                control: (base) => ({
                                                    ...base,
                                                    height: "44px",
                                                    minHeight: "44px",
                                                    fontSize: "1.25rem",
                                                    backgroundColor: "#0d0d4d",
                                                    borderColor: "#4a5568",
                                                    borderRadius: "0.5rem",
                                                }),
                                                valueContainer: (base) => ({
                                                    ...base,
                                                    padding: "0 1rem",
                                                    height: "44px",
                                                }),
                                                input: (base) => ({
                                                    ...base,
                                                    color: "white",
                                                    fontSize: "1.25rem",
                                                }),
                                                singleValue: (base) => ({
                                                    ...base,
                                                    color: "white",
                                                    fontWeight: "bold",
                                                    fontSize: "1.25rem",
                                                }),
                                                placeholder: (base) => ({
                                                    ...base,
                                                    color: "#a0aec0",
                                                    fontWeight: "normal",
                                                }),

                                                // ★★ NEW OPTION STYLING — Bold Black Dropdown Items
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


                                    {/* Weight, Price, Packs, Total (White Background Fields) */}
                                    {/* Note: The order of refs passed to the input's ref prop must match the keys in the refs object */}
                                    {[
                                        { id: 'weight', placeholder: "බර", fieldRef: refs.weight, isReadOnly: false },
                                        { id: 'price_per_kg', placeholder: "මිල", fieldRef: refs.price_per_kg, isReadOnly: false },
                                        { id: 'packs', placeholder: "අසුරුම්", fieldRef: refs.packs, isReadOnly: false },
                                        { id: 'total', placeholder: "TOTAL", fieldRef: refs.total, isReadOnly: true }
                                    ].map(({ id, placeholder, fieldRef, isReadOnly }, index) => (
                                        <div key={id} style={{
                                            gridColumnStart: 8 + index,
                                            gridColumnEnd: 9 + index,
                                            ...(id === 'total' && { gridColumnEnd: 14, marginLeft: "10px" })
                                        }}>
                                            <input
                                                id={id}
                                                ref={fieldRef}
                                                name={id}
                                                type="text"
                                                value={formData[id]}
                                                onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) handleInputChange(id, v); }}
                                                onKeyDown={(e) => handleKeyDown(e, id)}
                                                placeholder={placeholder}
                                                readOnly={isReadOnly}
                                                className="px-2 py-1 uppercase font-bold text-xs border rounded bg-white text-black placeholder-gray-500 text-center w-full"
                                                style={{
                                                    backgroundColor: 'white', color: 'black', borderRadius: '0.5rem',
                                                    textAlign: 'right', fontSize: '1.125rem', fontWeight: 600,
                                                    height: '40px', padding: '0.5rem 0.75rem', width: '100%',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Given amount input (Moved here from the bottom section) */}
                                {/* This element needs to be inside the form if the 'Enter' key on it submits a given amount */}
                                <div className="flex justify-end" style={{ marginTop: '20px' }}>

                                </div>


                                {/* Hidden submit button */}
                                <div className="flex space-x-4">
                                    <button type="submit" style={{ display: "none" }}>
                                        {editingSaleId ? "Update Sales Entry" : "Add Sales Entry"}
                                    </button>
                                </div>
                            </form>

                            {/* Form errors */}
                            {errors.form && <div className="mt-6 p-3 bg-red-100 text-red-700 rounded-xl">{errors.form}</div>}

                        </div>
                        {/* === END FIXED TOP SECTION === */}

                        {/* === SCROLLABLE SALES TABLE SECTION === */}
                        <div className="flex-grow overflow-y-auto mt-4">

                            {/* Sales table */}
                            {displayedSales.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                                    No sales records found. Add your first sale above.
                                </div>
                            ) : (
                                <table className="min-w-full border-gray-200 rounded-xl text-sm" style={{
                                    backgroundColor: '#000000', color: 'white', border: 'none', borderCollapse: 'collapse',
                                    margin: '20px 0', marginTop: '05px', width: '100%' // Ensure table takes 100% width of its container
                                }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#000000' }}>
                                            {/* 🚀 Apply table header styles */}
                                            {['Sup code', 'කේතය', 'අයිතමය', 'බර(kg)', 'මිල', 'අගය', 'මලු', 'Actions'].map((header, index) => (
                                                <th key={index} className="px-4 py-2 border" style={{
                                                    backgroundColor: '#f5fafb', fontWeight: 'bold', color: '#000000', padding: '8px 10px',
                                                    border: '1px solid white', whiteSpace: 'nowrap', marginTop: '90px'
                                                }}>
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedSales.map((s, idx) => (
                                            <tr
                                                key={s.id || idx}
                                                tabIndex={0}
                                                className="text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                onClick={() => handleEditClick(s)}
                                                onKeyDown={(e) => handleTableRowKeyDown(e, s)}
                                            >
                                                {/* 🚀 Apply table cell styles */}
                                                <td className="px-4 py-2 border" style={{ backgroundColor: '#000000', border: '1px solid #4a5568', padding: '6px 10px', marginTop: '90px' }}>{s.supplier_code}</td>
                                                <td className="px-4 py-2 border" style={{ backgroundColor: '#000000', border: '1px solid #4a5568', padding: '6px 10px', marginTop: '90px' }}>{s.item_code}</td>
                                                <td className="px-4 py-2 border" style={{ backgroundColor: '#000000', border: '1px solid #4a5568', padding: '6px 10px', marginTop: '90px' }}>{s.item_name}</td>
                                                <td className="px-2 py-2 border w-20" style={{ backgroundColor: '#000000', border: '1px solid #4a5568', padding: '6px 10px', marginTop: '90px' }}>{formatDecimal(s.weight)}</td>
                                                <td className="px-2 py-2 border w-20" style={{ backgroundColor: '#000000', border: '1px solid #4a5568', padding: '6px 10px', marginTop: '90px' }}>{formatDecimal(s.price_per_kg)}</td>
                                                <td className="px-2 py-2 border w-24" style={{ backgroundColor: '#000000', border: '1px solid #4a5568', padding: '6px 10px', marginTop: '90px' }}>{formatDecimal(
                                                    (parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0) +
                                                    (parseFloat(s.packs) || 0) * (parseFloat(s.pack_due) || 0)
                                                )}</td>
                                                <td className="px-2 py-2 border w-16" style={{ backgroundColor: '#000000', border: '1px solid #4a5568', padding: '6px 10px', marginTop: '90px' }}>{s.packs}</td>
                                                <td className="px-2 py-2 border w-16 text-center" style={{ backgroundColor: '#000000', border: '1px solid #4a5568', padding: '6px 10px', marginTop: '90px' }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteRecord(s.id); }}
                                                        className="text-black font-bold p-1 rounded-full hover:bg-gray-200 transition-colors"
                                                        title="Delete record"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Buttons and Summary (Below Table) */}
                            <div className="flex items-center mt-6 space-x-3 overflow-x-auto whitespace-nowrap py-2">

                                {/* Buttons (Styles maintained from previous iteration) */}
                                <button type="button" onClick={() => handlePrintAndClear().finally(() => { [100, 200, 300, 500, 800].forEach(timeout => setTimeout(() => refs.customer_code_input.current?.focus(), timeout)); })} disabled={state.isPrinting || displayedSales.length === 0}
                                    className={`px-4 py-1 text-sm font-bold rounded-xl shadow transition ${state.isPrinting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                                    style={{ backgroundColor: '#059669', color: 'white', opacity: state.isPrinting ? 0.5 : 1 }}>
                                    {state.isPrinting ? 'Printing...' : 'F1-PRINT'}
                                </button>
                                <button type="button" onClick={handleMarkAllProcessed} disabled={selectedPrintedCustomer}
                                    className={`px-4 py-1 text-sm font-bold rounded-xl shadow transition ${selectedPrintedCustomer ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                                    style={!selectedPrintedCustomer ? { backgroundColor: '#2563eb', color: 'white' } : { color: 'white' }}>
                                    F5-HOLD
                                </button>
                                <button type="button" onClick={handleFullRefresh}
                                    className="px-4 py-1 text-sm hover:bg-gray-700 font-bold rounded-xl shadow transition pr-3"
                                    style={{ backgroundColor: '#4b5563', color: 'white' }}>
                                    F10-Refresh
                                </button>
                                <div style={{ marginLeft: '660px', marginTop: '-25px' }}>
                                    <input
                                        id="given_amount"
                                        ref={refs.given_amount}
                                        name="given_amount"
                                        type="number"
                                        step="0.01"
                                        value={formData.given_amount}
                                        onChange={(e) => handleInputChange('given_amount', e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, "given_amount")}
                                        placeholder="Given Amount"
                                        className="px-4 py-2 border rounded-xl text-right w-40"
                                        style={{ backgroundColor: 'white', color: 'black', textAlign: 'right', width: '180px', borderRadius: '0.5rem' }}
                                    />
                                </div>
                                {/* Removed Given Amount input from this section as it was moved above to be inside the form */}
                            </div>

                            {/* Item summary and sales+pack cost in white */}
                            <ItemSummary sales={displayedSales} formatDecimal={formatDecimal} />

                            <div className="flex items-center justify-between mt-6 mb-4">
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center gap-0">
                                        <div className="text-2xl font-bold text-white">
                                            (
                                            <span>
                                                Sales: Rs. {formatDecimal(displayedSales.reduce((sum, s) =>
                                                    sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0)
                                                )}
                                            </span>
                                            <span>
                                                {" "} + Pack Cost: Rs. {formatDecimal(displayedSales.reduce((sum, s) => {
                                                    const itemCost = (parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0);
                                                    const totalCost = parseFloat(s.total) || 0;
                                                    const packCost = totalCost - itemCost;
                                                    return sum + Math.max(0, packCost);
                                                }, 0))}
                                            </span>
                                            )
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                        {/* === END SCROLLABLE SALES TABLE SECTION === */}

                    </div>

                    {/* Right Sidebar */}
                    <div className="right-sidebar" style={{
                        backgroundColor: '#1ec139ff',
                        borderRadius: '0.75rem',
                        maxHeight: '80.5vh',
                        width: '150px', // Fixed width from CSS
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        // 🚀 Apply custom margin-left from CSS
                        marginLeft: '288px',
                        // Adjust grid column span since custom margins are used.
                        gridColumnStart: 3, gridColumnEnd: 4
                    }}>
                        {hasData ? (
                            <CustomerList
                                customers={unprintedCustomers}
                                type="unprinted"
                                searchQuery={searchQueries.unprinted}
                                onSearchChange={(value) => updateState({ searchQueries: { ...searchQueries, unprinted: value } })}
                                selectedPrintedCustomer={selectedPrintedCustomer}
                                selectedUnprintedCustomer={selectedUnprintedCustomer}
                                handleCustomerClick={handleCustomerClick}
                                formatDecimal={formatDecimal}
                                allSales={allSales}
                                lastUpdate={state.forceUpdate || state.windowFocused}
                            />
                        ) : (
                            <div className="w-full shadow-xl rounded-xl overflow-y-auto border border-black p-4 text-center" style={{ backgroundColor: "#1ec139ff", maxHeight: "80.5vh" }}>
                                <div style={{ backgroundColor: "#006400" }} className="p-1 rounded-t-xl">
                                    <h2 className="font-bold text-white mb-1 whitespace-nowrap text-center" style={{ fontSize: '14px' }}>
                                        මුද්‍රණය නොකළ
                                    </h2>
                                </div>
                                <div className="py-4">
                                    <p className="text-gray-700">No unprinted customers data available</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div> {/* End of three-column-layout */}
            </div> {/* End of sales-layout */}
        </Layout>
    );
}