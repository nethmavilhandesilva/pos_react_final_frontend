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

// Rendering the printed and unprinted customer lists
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
                        displayText: `${sale.customer_code}`
                    };
                }
            });
        return groups;
    };

    const getUnprintedCustomers = () => {
        const customerMap = {};
        allSales
            .filter(s => s.bill_printed === 'N')
            .forEach(sale => {
                const customerCode = sale.customer_code;
                const saleTimestamp = new Date(sale.timestamp || sale.created_at || sale.date || sale.id);

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
                                const customerSales = allSales.filter(s => s.customer_code === item.customerCode);
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
                                                const customerSales = allSales.filter(s => s.customer_code === item.customerCode);
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
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-2 text-center">Item Summary</h3>
            <div className="flex flex-wrap gap-2 justify-center">
                {Object.entries(summary).map(([itemName, data]) => (
                    <div key={itemName} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium">
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
    const initialData = {
        csrf: document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        routes: routes
    };
    const initialFormData = {
        customer_code: "", customer_name: "", supplier_code: "", code: "", item_code: "",
        item_name: "", weight: "", price_per_kg: "", pack_due: "", total: "", packs: "",
        given_amount: ""
    };
    const refs = {
        customerCode: useRef(null),    // 0
        customerSelect: useRef(null),    // 1
        givenAmount: useRef(null),        // 2
        supplierCode: useRef(null),      // 3
        itemCodeSelect: useRef(null),    // 4
        itemName: useRef(null),          // 5
        weight: useRef(null),        // 6
        pricePerKg: useRef(null),        // 7
        packs: useRef(null),          // 8
        total: useRef(null),           // 9
    };
    const fieldOrder = ["customer_code_input", "customer_code_select", "given_amount", "supplier_code", "item_code_select", "item_name", "weight", "price_per_kg", "packs", "total"];
    const skipMap = { customer_code_input: "supplier_code", supplier_code: "item_code_select", item_code_select: "weight" };
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
        isPrinting: false // Added for print status
    });

    const setFormData = (updater) => setState(prev => ({
        ...prev,
        formData: typeof updater === 'function' ? updater(prev.formData) : updater
    }));

    const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

    const { allSales, customerSearchInput, selectedPrintedCustomer, selectedUnprintedCustomer, editingSaleId, searchQueries, errors, loanAmount, isManualClear, formData, packCost,
        isLoading, customers, items, suppliers, isPrinting
    } = state;

    // --- Derived State (useMemo) ---
    const { newSales, printedSales, unprintedSales } = useMemo(() => ({
        newSales: allSales.filter(s => s.id && s.bill_printed !== 'Y' && s.bill_printed !== 'N'),
        printedSales: allSales.filter(s => s.bill_printed === 'Y'),
        unprintedSales: allSales.filter(s => s.bill_printed === 'N')
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
    const unprintedTotal = calculateTotal(unprintedSales);
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
        setFormData(prev => ({ ...prev, total: (w * p) + (packs * packDue) ? Number(((w * p) + (packs * packDue)).toFixed(2)) : "" }));
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
        refs.customerCode.current?.focus();
    }, []);
    // --- End Effects ---

    // --- Handlers ---
    const handleKeyDown = (e, currentFieldIndex) => {
        if (e.key === "Enter") {
            const fieldName = fieldOrder[currentFieldIndex];
            if (fieldName === "item_code_select" || fieldName === "customer_code_select") {
                return;
            }

            e.preventDefault();

            if (fieldOrder[currentFieldIndex] === "given_amount" && formData.given_amount) {
                return handleSubmitGivenAmount(e);
            }

            if (fieldOrder[currentFieldIndex] === "packs") {
                return handleSubmit(e);
            }

            if (fieldOrder[currentFieldIndex] === "price_per_kg") {
                const packsIndex = fieldOrder.findIndex(f => f === "packs");
                requestAnimationFrame(() => setTimeout(() => {
                    const packsRef = Object.values(refs)[packsIndex];
                    packsRef?.current?.focus?.() || packsRef?.current?.select?.();
                }, 0));
                return;
            }

            let nextIndex = currentFieldIndex + 1;
            if (skipMap[fieldOrder[currentFieldIndex]]) {
                const targetIndex = fieldOrder.findIndex(f => f === skipMap[fieldOrder[currentFieldIndex]]);
                if (targetIndex !== -1) nextIndex = targetIndex;
            }

            requestAnimationFrame(() => setTimeout(() => {
                const nextRef = Object.values(refs)[nextIndex];
                nextRef?.current?.focus?.() || nextRef?.current?.select?.();
            }, 0));
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
                total: editingSaleId ? prev.total : ""
            }));
            updateState({ packCost: fetchedPackCost, itemSearchInput: "" });

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
            selectedPrintedCustomer: hasPrintedSales ? short : null,
            customerSearchInput: ""
        });

        setFormData(prev => ({
            ...prev,
            customer_code: short || "",
            customer_name: customer?.name || "",
            given_amount: hasUnprintedSales || hasPrintedSales
                ? (allSales.find(s => s.customer_code === short)?.given_amount || "")
                : ""
        }));

        fetchLoanAmount(short);
        updateState({ isManualClear: false });

        if (hasUnprintedSales) {
            handleSubmitGivenAmount();
        }

        setTimeout(() => {
            refs.supplierCode.current?.focus();
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
            refs.customerCode.current?.focus();
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
            // Since there's no dedicated route in Laravel, we'll use the one from your previous code:
            // PUT /sales/{sale}/given-amount
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

            refs.supplierCode.current?.focus();

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
                refs.customerCode.current?.focus();
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
                ...(billNoToUse && { bill_no: billNoToUse })
            };

            const url = isEditing ? `${routes.sales}/${editingSaleId}` : routes.sales;
            const method = isEditing ? "put" : "post";
            const response = await api[method](url, payload);
            let data = response.data;
            let newSale = isEditing ? data.sale : data.data || {};

            if (!isEditing) {
                if (billNoToUse && !newSale.bill_no) {
                    newSale = { ...newSale, bill_printed: 'Y', bill_no: billNoToUse };
                } else if (billPrintedStatus && !newSale.bill_printed) {
                    newSale = { ...newSale, bill_printed: billPrintedStatus };
                }
            }

            updateState({
                allSales: isEditing ? allSales.map(s => s.id === newSale.id ? newSale : s) : [...allSales, newSale]
            });

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

            refs.supplierCode.current?.focus();
        } catch (error) {
            updateState({ errors: { form: error.response?.data?.message || error.message }, isSubmitting: false });
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
                if (refs.supplierCode.current) {
                    refs.supplierCode.current.focus();
                }
            }, 50);
        } else {
            handleClearForm();
            setTimeout(() => {
                if (refs.customerCode.current) {
                    refs.customerCode.current.focus();
                }
            }, 50);
        }

        updateState({
            editingSaleId: null,
            isManualClear: false,
            customerSearchInput: ""
        });
    };

    const handleMarkPrinted = async () => {
        try { await handlePrintAndClear(); } catch (error) { alert("Mark printed failed: " + error.message); }
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
                    setTimeout(() => refs.customerCode.current?.focus(), timeout)
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

    const buildFullReceiptHTML = (salesData, billNo, customerName, mobile, globalLoanAmount = 0) => {
        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();
        let totalAmountSum = 0, totalPacksSum = 0;
        const itemGroups = {};

        const itemsHtml = salesData.map(s => {
            totalAmountSum += parseFloat(s.total) || 0;
            const packs = parseInt(s.packs) || 0;
            totalPacksSum += packs;

            if (!itemGroups[s.item_name]) itemGroups[s.item_name] = { totalWeight: 0, totalPacks: 0 };
            itemGroups[s.item_name].totalWeight += parseFloat(s.weight) || 0;
            itemGroups[s.item_name].totalPacks += packs;

            // 🔧 FIXED ALIGNMENT ROW
            return `
<tr style="font-size:1.5em;">

  <td style="text-align:left;">${s.item_name || ""}<br>${packs}</td>
  <td style="text-align:center;">${(parseFloat(s.weight) || 0).toFixed(2)}</td>
  <td style="text-align:center;">${(parseFloat(s.price_per_kg) || 0).toFixed(2)}</td>
  <td style="text-align:right;">${((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)).toFixed(2)}</td>
   <td style="text-align:right;">${s.supplier_code || ""}</td>
</tr>`;
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
  <td style="width:50%; text-align:left;">
    <span style="font-size:0.75rem;">දුන් මුදල: </span>
    <span style="font-weight:bold; font-size:0.9rem;">${parseFloat(givenAmount).toFixed(2)}</span>
  </td>
  <td style="width:50%; text-align:right;">
    <span style="font-size:0.8rem;">ඉතිරිය: </span>
    <span style="font-weight:bold; font-size:1.5rem;">${Math.abs(remaining).toFixed(2)}</span>
  </td>
</tr>` : '';

        const totalAmount = Math.abs(globalLoanAmount) + totalPrice;

        const loanRow = globalLoanAmount !== 0 ? `
<tr>
  <td style="font-size:0.9rem; text-align:left;">
    පෙර ණය: Rs. 
    <span>${Math.abs(globalLoanAmount).toFixed(2)}</span>
  </td>
  <td style="font-weight:bold; text-align:right; font-size:1.5em;">
    Rs. ${Math.abs(totalAmount).toFixed(2)}
  </td>
</tr>` : '';

        return `
<div class="receipt-container" style="width:100%; max-width:300px; margin:0 auto; padding:5px;">

  <div style="text-align:center; margin-bottom:5px;">
    <h3 style="font-size:1.8em; font-weight:bold; margin:0;">NVDS</h3>
  </div>

  <div style="text-align:left; margin-bottom:5px;">
    <table style="width:100%; font-size:9px; border-collapse:collapse;">
      <tr><td>දිනය : ${date}</td><td style="text-align:right;">${time}</td></tr>
      <tr><td colspan="2">දුර : ${mobile || ''}</td></tr>
      <tr>
        <td>බිල් අංකය : <strong>${billNo}</strong></td>
        <td style="text-align:right;">
          <strong style="font-size:2.0em;">${customerName.toUpperCase()}</strong>
        </td>
      </tr>
    </table>
  </div>

  <hr style="border:1px solid #000; margin:5px 0; opacity:1;">

  <!-- 🔧 UPDATED ITEMS TABLE (FULL ALIGNMENT FIXED) -->
  <table style="width:100%; font-size:9px; border-collapse:collapse; table-layout:fixed;">
    <colgroup>
      <col style="width:22%;">
      <col style="width:28%;">
      <col style="width:15%;">
      <col style="width:15%;">
      <col style="width:20%;">
    </colgroup>

    <thead style="font-size:1.6em;">
      <tr>
       
        <th style="text-align:left;">වර්ගය<br>මලු</th>
        <th style="text-align:center;">කිලෝ</th>
        <th style="text-align:center;">මිල</th>
        <th style="text-align:right;">අගය</th>
        <th style="text-align:right;">sup code</th>
      </tr>
    </thead>

    <tbody>
      <tr><td colspan="5"><hr style="border:1px solid #000; margin:5px 0; opacity:1;"></td></tr>

      ${itemsHtml}

      <tr><td colspan="5"><hr style="border:1px solid #000; margin:5px 0; opacity:1;"></td></tr>

      <tr style="font-size:1.6em; font-weight:bold;">
        <td colspan="3" style="text-align:left;">${totalPacksSum}</td>
        <td colspan="2" style="text-align:right;">${totalSalesExcludingPackDue.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <!-- 🔧 UPDATED SUMMARY TABLE -->
  <table style="width:100%; font-size:15px; border-collapse:collapse; table-layout:fixed;">
    <tr>
      <td style="text-align:left;">ප්‍රවාහන ගාස්තු:</td>
      <td style="text-align:right; font-weight:bold;">00</td>
    </tr>
    <tr>
      <td style="text-align:left;">කුලිය:</td>
      <td style="text-align:right; font-weight:bold;">${totalPackDueCost.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="text-align:left;">අගය:</td>
      <td style="text-align:right; font-weight:bold;">
        <span style="display:inline-block; border-top:1px solid #000; border-bottom:3px double #000; padding:2px 4px; min-width:80px; text-align:right; font-size:1.5em;">
          ${(totalPrice).toFixed(2)}
        </span>
      </td>
    </tr>

    ${givenAmountRow}
    ${loanRow}
  </table>

  <div style="text-align:center; margin-top:10px; font-size:10px;">
    <p style="margin:0;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p>
    <p style="margin:0;">නැවත භාර ගනු නොලැබේ</p>
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
            const receiptHtml = buildFullReceiptHTML(salesData, billNo, customerName, mobile, globalLoanAmount);
            
            // Step 6: Print in separate window
            const printPromise = printSingleContent(receiptHtml, customerName);
            
            // Focus back on customer code field immediately
            setTimeout(() => {
                if (refs.customerCode.current) {
                    refs.customerCode.current.focus();
                    refs.customerCode.current.select();
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
                if (refs.customerCode.current) {
                    refs.customerCode.current.focus();
                }
            }, 100);
        }
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
                    [100, 200, 300, 500, 800].forEach(timeout => setTimeout(() => refs.customerCode.current?.focus(), timeout));
                });
            } else if (e.key === "F5") { e.preventDefault(); handleMarkAllProcessed(); }
        };
        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [displayedSales, newSales]);

    // Check if we have any data to display
    const hasData = allSales.length > 0 || customers.length > 0 || items.length > 0 || suppliers.length > 0;

    // --- Render ---
    return (
        <Layout>
            <div className="sales-layout">
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

                <div className="three-column-layout" style={{ opacity: isLoading ? 0.7 : 1 }}>

                    {/* Left Sidebar */}
                    <div className="left-sidebar">
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

                    {/* Center Form */}
                   <div className="center-form" style={{ marginRight: "-20px" }}>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* === ROW 1: BILL NO & TOTAL SALES === */}
                            <div className="w-full flex justify-between items-center">
                                <div className="text-red-600 font-bold text-lg">
                                    Bill No: {currentBillNo}
                                </div>
                                <div className="text-red-600 font-bold text-xl whitespace-nowrap" style={{ marginLeft: "650px", marginTop: "-30px" }}>
                                    Total Sales: Rs. {formatDecimal(mainTotal)}
                                </div>

                            </div>

                            {/* === ROW 2: CUSTOMER CODE, SELECT CUSTOMER & LOAN === */}
                            <div className="flex items-end gap-3 w-full">
                                {/* Customer Code */}
                                <div className="flex-1 min-w-0">
                                    <input
                                        id="customer_code_input"
                                        ref={refs.customerCode}
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
                                        onKeyDown={(e) => handleKeyDown(e, 0)}
                                        type="text"
                                        maxLength={10}
                                        placeholder="CUSTOMER CODE"
                                        className="px-2 py-1 uppercase font-bold text-sm w-full border rounded bg-white text-black placeholder-gray-500"
                                    />
                                </div>

                                {/* Customer Select */}
                                <div style={{ flex: '0 0 250px', minWidth: '250px' }}>
                                    <Select
                                        id="customer_code_select"
                                        ref={refs.customerSelect}
                                        value={
                                            formData.customer_code
                                                ? { value: formData.customer_code, label: `${formData.customer_code}` }
                                                : null
                                        }
                                        onChange={handleCustomerSelect}
                                        options={customers
                                            .filter(
                                                (c) =>
                                                    !customerSearchInput ||
                                                    c.short_name.charAt(0).toUpperCase() ===
                                                    customerSearchInput.charAt(0).toUpperCase()
                                            )
                                            .map((c) => ({ value: c.short_name, label: `${c.short_name}` }))
                                        }
                                        onInputChange={(inputValue, { action }) => {
                                            if (action === "input-change")
                                                updateState({ customerSearchInput: inputValue.toUpperCase() });
                                        }}
                                        inputValue={customerSearchInput}
                                        placeholder="SELECT CUSTOMER"
                                        isClearable
                                        isSearchable
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                minHeight: "36px",
                                                height: "36px",
                                                fontSize: "12px",
                                                backgroundColor: "white",
                                                borderColor: "#4a5568",
                                            }),
                                            valueContainer: (base) => ({
                                                ...base,
                                                padding: "0 6px",
                                                height: "36px",
                                            }),
                                            placeholder: (base) => ({
                                                ...base,
                                                fontSize: "12px",
                                                color: "gray",
                                            }),
                                            input: (base) => ({
                                                ...base,
                                                fontSize: "12px",
                                                color: "black",
                                            }),
                                            singleValue: (base) => ({
                                                ...base,
                                                color: "black",
                                                fontSize: "12px",
                                                fontWeight: "bold",
                                            }),

                                            // ⭐ ADDING BOLD + BLACK DROPDOWN OPTIONS HERE
                                            option: (base, state) => ({
                                                ...base,
                                                color: "black",
                                                fontWeight: "bold",
                                                fontSize: "12px",
                                                backgroundColor: state.isFocused ? "#e5e7eb" : "white",
                                                cursor: "pointer",
                                            }),
                                        }}
                                    />

                                </div>

                                {/* Loan */}
                                <div className="flex-1 min-w-0">
                                    <div
                                        className="p-2 rounded-lg text-center border relative"
                                        style={{
                                            backgroundColor: "white",
                                            flex: "0 0 200px",
                                            marginLeft: "80px"
                                        }}
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



                            {/* === ROW 4: GRID LAYOUT FOR FIELDS === */}
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
                                        ref={refs.supplierCode}
                                        name="supplier_code"
                                        value={formData.supplier_code}
                                        onChange={(e) => handleInputChange("supplier_code", e.target.value.toUpperCase())}
                                        onKeyDown={(e) => handleKeyDown(e, 3)}
                                        type="text"
                                        placeholder="SUPPLIER"
                                        className="px-2 py-1 uppercase font-bold text-xs border rounded bg-white text-black placeholder-gray-500 w-full"
                                        style={{ width: "150px" }}
                                    />
                                </div>

                                {/* Item */}
                                <div style={{ gridColumnStart: 5, gridColumnEnd: 8, marginLeft: "-120px",marginRight: "-02px"}}>
                                    <Select
                                        id="item_code_select"
                                        ref={refs.itemCodeSelect}
                                        value={formData.item_code ? {
                                            value: formData.item_code,
                                            label: `${formData.item_name} (${formData.item_code})`,
                                            item: { no: formData.item_code, type: formData.item_name, pack_due: formData.pack_due },
                                        } : null}
                                        onChange={handleItemSelect}
                                        options={items
                                            .filter(item => {
                                                if (!state.itemSearchInput) return true;
                                                const search = state.itemSearchInput.toLowerCase();
                                                return (
                                                    String(item.no).toLowerCase().startsWith(search) ||
                                                    String(item.type).toLowerCase().includes(search)
                                                );
                                            })
                                            .map(item => ({
                                                value: item.no,
                                                label: `${item.type} (${item.no})`,
                                                item,
                                            }))
                                        }
                                        onInputChange={(inputValue) =>
                                            updateState({ itemSearchInput: inputValue.toUpperCase() })
                                        }
                                        inputValue={state.itemSearchInput}
                                        onKeyDown={(e) => handleKeyDown(e, 4)}
                                        placeholder="SELECT ITEM"
                                        className="react-select-container font-bold text-sm w-full"
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                minHeight: "32px",
                                                height: "32px",
                                            }),
                                            option: (base, state) => ({
                                                ...base,
                                                color: "black",
                                                fontWeight: "bold",
                                                backgroundColor: state.isFocused ? "#e5e7eb" : "white", // optional hover color
                                                cursor: "pointer",
                                            }),
                                            singleValue: (base) => ({
                                                ...base,
                                                fontWeight: "bold",
                                                color: "black"
                                            })
                                        }}
                                    />

                                </div>

                                {/* Weight */}
                                <div style={{ gridColumnStart: 8, gridColumnEnd: 9 }}>
                                    <input
                                        id="weight"
                                        ref={refs.weight}
                                        name="weight"
                                        type="text"
                                        value={formData.weight}
                                        onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) handleInputChange('weight', v); }}
                                        onKeyDown={(e) => handleKeyDown(e, 6)}
                                        placeholder="බර"
                                        className="px-2 py-1 uppercase font-bold text-xs border rounded bg-white text-black placeholder-gray-500 text-center w-full"
                                    />
                                </div>

                                {/* Price */}
                                <div style={{ gridColumnStart: 9, gridColumnEnd: 10 }}>
                                    <input
                                        id="price_per_kg"
                                        ref={refs.pricePerKg}
                                        name="price_per_kg"
                                        type="text"
                                        value={formData.price_per_kg}
                                        onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) handleInputChange('price_per_kg', v); }}
                                        onKeyDown={(e) => handleKeyDown(e, 7)}
                                        placeholder="මිල"
                                        className="px-2 py-1 uppercase font-bold text-xs border rounded bg-white text-black placeholder-gray-500 text-center w-full"
                                    />
                                </div>

                                {/* Packs */}
                                <div style={{ gridColumnStart: 10, gridColumnEnd: 11 }}>
                                    <input
                                        id="packs"
                                        ref={refs.packs}
                                        name="packs"
                                        type="text"
                                        value={formData.packs}
                                        onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) handleInputChange('packs', v); }}
                                        onKeyDown={(e) => handleKeyDown(e, 8)}
                                        placeholder="අසුරුම්"
                                        className="px-2 py-1 uppercase font-bold text-xs border rounded bg-white text-black placeholder-gray-500 text-center w-full"
                                    />
                                </div>

                                {/* Total */}
                                <div style={{ gridColumnStart: 11, gridColumnEnd: 14, marginLeft: "10px" }}>
                                    <input
                                        id="total"
                                        ref={refs.total}
                                        name="total"
                                        type="number"
                                        value={formData.total}
                                        readOnly
                                        placeholder="TOTAL"
                                        className="px-2 py-1 uppercase font-bold text-xs border rounded bg-white text-black placeholder-gray-500 text-center w-full"
                                    />
                                </div>
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

                        {/* Sales table */}
                        <div className="mt-4 overflow-x-auto">
                            {displayedSales.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                                    No sales records found. Add your first sale above.
                                </div>
                            ) : (
                                <table className="min-w-full border-gray-200 rounded-xl text-sm">
                                    <thead>
                                        <tr>
                                             <th className="px-4 py-2 border">Sup code</th>
                                            <th className="px-4 py-2 border">කේතය</th>
                                            <th className="px-4 py-2 border">අයිතමය</th>
                                            <th className="px-2 py-2 border w-20">බර(kg)</th>
                                            <th className="px-2 py-2 border w-20">මිල</th>
                                            <th className="px-2 py-2 border w-24">අගය</th>
                                            <th className="px-2 py-2 border w-16">මලු</th>
                                            <th className="px-2 py-2 border w-16" style={{ paddingLeft: '16px' }}>Actions</th>
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
                                                 <td className="px-4 py-2 border">{s.supplier_code}</td>
                                                <td className="px-4 py-2 border">{s.item_code}</td>
                                                <td className="px-4 py-2 border">{s.item_name}</td>
                                                <td className="px-2 py-2 border w-20">{formatDecimal(s.weight)}</td>
                                                <td className="px-2 py-2 border w-20">{formatDecimal(s.price_per_kg)}</td>
                                                <td className="px-2 py-2 border w-24">{formatDecimal((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0))}</td>
                                                <td className="px-2 py-2 border w-16">{s.packs}</td>
                                                <td className="px-2 py-2 border w-16 text-center">
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

                        <div className="flex items-center mt-6 space-x-3 overflow-x-auto whitespace-nowrap py-2">

                            {/* Buttons */}
                            <button
                                type="button"
                                onClick={handlePrintAndClear}
                                disabled={state.isPrinting || displayedSales.length === 0}
                                className={`px-4 py-1 text-sm font-bold rounded-xl shadow transition ${state.isPrinting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                                style={{ 
                                    backgroundColor: '#059669', 
                                    color: 'white',
                                    opacity: state.isPrinting ? 0.5 : 1
                                }}
                            >
                                {state.isPrinting ? 'Printing...' : 'F1-PRINT'}
                            </button>
                            <button
                                type="button"
                                onClick={handleMarkAllProcessed}
                                disabled={selectedPrintedCustomer}
                                // 🟢 MODIFIED CLASSNAME: Removed conditional text class and kept the base text-white
                                className={`px-4 py-1 text-sm font-bold rounded-xl shadow transition ${selectedPrintedCustomer
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                                // 🚀 CUSTOM PIXEL OVERRIDE: Using inline style to force white text and 
                                // blue background when active to ensure the styles are applied correctly 
                                // over any inherited styles from .center-form.
                                style={!selectedPrintedCustomer
                                    ? { backgroundColor: '#2563eb', color: 'white' } // Active: Blue BG, White Text
                                    : { color: 'white' } // Disabled: Gray BG (from class), White Text
                                }
                            >
                                F5-HOLD
                            </button>

                            {/* Add a gap here */}
                            <button
                                type="button"
                                onClick={handleFullRefresh}
                                // Removed bg-gray-600 and text-white from className to use inline styles for high precedence
                                className="px-4 py-1 text-sm hover:bg-gray-700 font-bold rounded-xl shadow transition pr-3"
                                // 🚀 CUSTOM PIXEL OVERRIDE: Force Ash background and White text
                                style={{ backgroundColor: '#4b5563', color: 'white' }} // #4b5563 is the hex code for Tailwind's gray-600
                            >
                                F10-Refresh
                            </button>

                            {/* Given amount input (Pushed right with ml-auto) */}
                            <div
                                style={{ marginLeft: '660px', marginTop: '-25px' }} // Custom margin to keep it slightly off the right edge of its outer container
                                className="ml-auto" // Pushes this div and its content to the far right
                            >
                                <input
                                    id="given_amount"
                                    ref={refs.givenAmount}
                                    name="given_amount"
                                    type="number"
                                    step="0.01"
                                    value={formData.given_amount}
                                    onChange={(e) => handleInputChange('given_amount', e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, 2)}
                                    placeholder="Given Amount"
                                    // The custom margin-right has been moved to the wrapping div above for control.
                                    // We use className for the basic styling now.
                                    className="px-4 py-2 border rounded-xl text-right w-40"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar */}
                    <div className="right-sidebar">
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