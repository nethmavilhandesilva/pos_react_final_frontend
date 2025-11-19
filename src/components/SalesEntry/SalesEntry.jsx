import React, { useState, useEffect, useMemo, useRef } from "react";
import Select from "react-select";
import Layout from "../Layout/Layout";
import '../../App.css';

//Rendering the printed and unprinted customer lists
const CustomerList = React.memo(({
  customers, type, searchQuery, onSearchChange, selectedPrintedCustomer,
  selectedUnprintedCustomer, handleCustomerClick, formatDecimal, allSales
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
      className="w-full shadow-xl rounded-xl overflow-y-auto border border-black"
      style={{
        backgroundColor: "#1ec139ff",
        maxHeight: "80.5vh",
        overflowY: "auto"
      }}
    >
      <div style={{ backgroundColor: "#006400" }} className="p-1 rounded-t-xl">
        <h2 className="text-base font-bold text-white mb-1 whitespace-nowrap text-center">
          {type === "printed" ? "මුද්‍රණය කළ" : "මුද්‍රණය නොකළ"}
        </h2>
        <input
          type="text"
          placeholder={`Search by ${type === "printed" ? "Bill No or Code..." : "Customer Code..."}`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
          className="w-full px-4 py-0.5 border rounded-xl focus:ring-2 focus:ring-blue-300 uppercase"
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
                    className={`w-full py-1 mb-2 rounded-xl border border-black text-left ${isItemSelected ? "bg-blue-500 text-white border-blue-600" : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                      }`}
                  >
                    <span className="font-semibold truncate pl-4">
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

//Bellow te main sales table Item summary Rendering
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
            <span className="font-semibold">{itemName}:</span>
            <span className="ml-1 text-blue-600">{data.totalWeight}kg</span>
            <span className="mx-1 text-gray-400">/</span>
            <span className="text-green-600">{data.totalPacks}p</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SalesEntry() {
  // 🔹 ADDED: API routes configuration from original
  const routes = {
    markPrinted: "/api/sales/mark-printed",
    getLoanAmount: "/api/get-loan-amount",
    markAllProcessed: "/api/sales/mark-all-processed",
    givenAmount: "/api/sales", // Will be parameterized, e.g., /api/sales/:id/given-amount
    sales: "/api/sales",
    customers: "/api/customers",
    items: "/api/items",
    suppliers: "/api/suppliers" // 🔹 Assuming this is your suppliers route
  };

  // 🔹 REVERTED: Original initialData structure
  const initialData = {
    sales: [],
    printed: [],
    unprinted: [],
    customers: [],
    items: [],
    suppliers: [],
    storeUrl: "/api/sales", // 🔹 This is the POST route
    csrf: document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
    routes: routes
  };

  //Cursor Focussin order metod    
  const refs = {
    customerCode: useRef(null),    // 0
    customerSelect: useRef(null),    // 1
    givenAmount: useRef(null),        // 2
    supplierCode: useRef(null),      // 3
    itemCodeSelect: useRef(null),    // 4
    itemName: useRef(null),          // 5
    weight: useRef(null),        // 6
    pricePerKg: useRef(null),        // 7
    packs: useRef(null),         // 8
    total: useRef(null)            // 9
  };

  const fieldOrder = ["customer_code_input", "customer_code_select", "given_amount", "supplier_code", "item_code_select", "item_name", "weight", "price_per_kg", "packs", "total"];
  const skipMap = { customer_code_input: "supplier_code", supplier_code: "item_code_select", item_code_select: "weight" };

  const initialFormData = {
    customer_code: "", customer_name: "", supplier_code: "", code: "", item_code: "",
    item_name: "", weight: "", price_per_kg: "", pack_due: "", total: "", packs: "",
    given_amount: ""
  };

  // 🔹 REVERTED: State now includes isLoading and empty arrays for fetched data
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
    isLoading: true,
    customers: [],
    items: [],
    suppliers: []
  });

  const setFormData = (updater) => setState(prev => ({
    ...prev,
    formData: typeof updater === 'function' ? updater(prev.formData) : updater
  }));

  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

  // 🔹 REVERTED: customers and items now come from state
  const { allSales, customerSearchInput, selectedPrintedCustomer, selectedUnprintedCustomer, editingSaleId, searchQueries, errors, loanAmount, isManualClear, formData, packCost,
    isLoading, customers, items, suppliers
  } = state;

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

  // 🔹 This is the apiCall from your *second* file, which correctly handles CSRF
  const apiCall = async (url, method, body) => {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": initialData.csrf,
          ...(method !== "DELETE" && { "Accept": "application/json" })
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Server error: " + res.statusText);
      return data;
    } catch (error) { throw error; }
  };

  // 🔹 ADDED: Fetch initial data from Laravel API
  const fetchInitialData = async () => {
    try {
      updateState({ isLoading: true });

      const [salesRes, customersRes, itemsRes, suppliersRes] = await Promise.all([
        fetch(routes.sales).then(r => r.json()),
        fetch(routes.customers).then(r => r.json()),
        fetch(routes.items).then(r => r.json()),
        fetch(routes.suppliers).then(r => r.json())
      ]);

      const salesData = salesRes.data || salesRes.sales || salesRes || [];
      const customersData = customersRes.data || customersRes.customers || customersRes || [];
      const itemsData = itemsRes.data || itemsRes.items || itemsRes || [];
      const suppliersData = suppliersRes.data || suppliersRes.suppliers || suppliersRes || [];

      updateState({
        allSales: salesData,
        customers: customersData,
        items: itemsData,
        suppliers: suppliersData,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      updateState({ isLoading: false, errors: { form: 'Failed to load data' } });
    }
  };

  // 🔹 REVERTED: Use the original apiCall helper
  const fetchLoanAmount = async (customerCode) => {
    if (!customerCode) return updateState({ loanAmount: 0 });
    try {
      const loanData = await apiCall(routes.getLoanAmount, 'POST', {
        customer_short_name: customerCode
      });
      updateState({ loanAmount: parseFloat(loanData.total_loan_amount) || 0 });
    } catch (loanError) {
      console.error('Error fetching loan amount:', loanError);
      updateState({ loanAmount: 0 });
    }
  };

  useEffect(() => {
    const w = parseFloat(formData.weight) || 0;
    const p = parseFloat(formData.price_per_kg) || 0;
    const packs = parseInt(formData.packs) || 0;
    const packDue = parseFloat(formData.pack_due) || 0;
    setFormData(prev => ({ ...prev, total: (w * p) + (packs * packDue) ? Number(((w * p) + (packs * packDue)).toFixed(2)) : "" }));
  }, [formData.weight, formData.price_per_kg, formData.packs, formData.pack_due]);

  // 🔹 REVERTED: Call fetchInitialData on mount
  useEffect(() => {
    fetchInitialData();
    refs.customerCode.current?.focus();
  }, []);

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

      // 🔹 MODIFIED: Use `customers` from state
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

      // 🔹 MODIFIED: Use `customers` from state
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
    // 🔹 MODIFIED: Use `customers` from state
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
      // 🔹 MODIFIED: Use `items` from state
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
      // 🔹 REVERTED: Use routes object
      const url = `${routes.sales}/${editingSaleId}`;
      await apiCall(url, "DELETE");

      updateState({
        allSales: allSales.filter(s => s.id !== editingSaleId)
      });
      handleClearForm();
    } catch (error) {
      updateState({ errors: { form: error.message } });
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

      const updatePromises = salesToUpdate.map(sale => {
        // 🔹 REVERTED: Use routes object
        const url = `${routes.sales}/${sale.id}/given-amount`;
        return apiCall(url, "PUT", { given_amount: givenAmount });
      });

      const results = await Promise.all(updatePromises);

      const updatedSalesMap = {};
      results.forEach(result => {
        if (result.sale) {
          updatedSalesMap[result.sale.id] = result.sale;
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
      updateState({ errors: { form: error.message } });
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

      // 🔹 REVERTED: Use routes object
      const url = isEditing ? `${routes.sales}/${editingSaleId}` : routes.sales;
      const method = isEditing ? "PUT" : "POST";
      const data = await apiCall(url, method, payload);
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
      updateState({ errors: { form: error.message }, isSubmitting: false });
    }
  };

  const handleCustomerClick = async (type, customerCode, billNo = null, salesRecords = []) => {
    const isPrinted = type === 'printed';

    let selectionKey = customerCode;
    if (isPrinted && billNo) {
      selectionKey = `${customerCode}-${billNo}`;
    }

    const isCurrentlySelected = isPrinted
      ? selectedPrintedCustomer === selectionKey
      : selectedUnprintedCustomer === selectionKey;

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

    // 🔹 MODIFIED: Use `customers` from state
    const customer = customers.find(x => String(x.short_name) === String(customerCode));

    const customerSales = salesRecords.length > 0 ? salesRecords :
      (isPrinted && billNo
        ? allSales.filter(s => s.customer_code === customerCode && s.bill_no === billNo)
        : allSales.filter(s => s.customer_code === customerCode));

    const firstSale = customerSales[0];
    const newCustomerCode = isCurrentlySelected ? "" : customerCode;

    if (!isCurrentlySelected) {
      setFormData({
        ...initialFormData,
        customer_code: newCustomerCode,
        customer_name: customer?.name || "",
        given_amount: firstSale?.given_amount || ""
      });
    } else {
      handleClearForm();
    }

    updateState({
      editingSaleId: null,
      isManualClear: false,
      customerSearchInput: ""
    });

    fetchLoanAmount(newCustomerCode);

    if (isCurrentlySelected) {
      refs.customerCode.current?.focus();
      handleClearForm();
    } else {
      refs.supplierCode.current?.focus();
    }
  };

  const handleMarkPrinted = async () => {
    try { await handlePrintAndClear(); } catch (error) { alert("Mark printed failed: " + error.message); }
  };

  const handleMarkAllProcessed = async () => {
    const salesToProcess = [...newSales, ...unprintedSales];
    if (salesToProcess.length === 0) return;

    try {
      // 🔹 REVERTED: Use routes object
      const data = await apiCall(routes.markAllProcessed, "POST", {
        sales_ids: salesToProcess.map(s => s.id)
      });

      if (data.success) {
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
      // 🔹 REVERTED: Use routes object
      const url = `${routes.sales}/${saleId}`;
      await apiCall(url, "DELETE");

      updateState({
        allSales: allSales.filter(s => s.id !== saleId)
      });

      if (editingSaleId === saleId) {
        handleClearForm();
      }
    } catch (error) {
      updateState({ errors: { form: error.message } });
    }
  };

  const handleFullRefresh = () => { window.location.reload(); };

  const printSingleContent = async (html, customerName) => {
    return new Promise((resolve) => {
      const originalContent = document.body.innerHTML;
      document.title = customerName;

      const cleanup = () => {
        document.body.innerHTML = originalContent;
        resolve();
      };

      const tryPrint = () => {
        try {
          window.focus();
          window.print();
        } catch (err) {
          console.error("Print failed:", err);
        } finally {
          resolve();
        }
      };

      const afterPrintHandler = () => {
        window.removeEventListener("afterprint", afterPrintHandler);
        cleanup();
      };
      window.addEventListener("afterprint", afterPrintHandler);

      document.body.innerHTML = html;
      if (document.readyState === "complete") {
        tryPrint();
      } else {
        window.onload = tryPrint;
      }
      setTimeout(cleanup, 3000);
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
      return `<tr style="font-size:1.5em;">
        <td style="text-align:left;">${s.item_name || ""} <br>${packs}</td>
        <td style="text-align:center; padding-right:20px;">${(parseFloat(s.weight) || 0).toFixed(2)}</td>
        <td style="text-align:left;">${(parseFloat(s.price_per_kg) || 0).toFixed(2)}</td>
        <td style="text-align:right;">${((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)).toFixed(2)}</td>
      </tr>`;
    }).join("");

    const totalPrice = totalAmountSum;
    const totalSalesExcludingPackDue = salesData.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0);
    const totalPackDueCost = totalPrice - totalSalesExcludingPackDue;

    const givenAmount = salesData.find(s => parseFloat(s.given_amount) > 0)?.given_amount || 0;
    const remaining = parseFloat(givenAmount) - totalPrice;

    let itemSummaryHtml = '';
    const entries = Object.entries(itemGroups);
    for (let i = 0; i < entries.length; i += 2) {
      const first = entries[i], second = entries[i + 1];
      itemSummaryHtml += '<div style="display:flex; gap:0.5rem; margin-bottom:0.2rem;">';
      itemSummaryHtml += `<span style="padding:0.1rem 0.3rem;border-radius:0.5rem;background-color:#f3f4f6;font-size:0.6rem;">
        <strong>${first[0]}</strong>:${first[1].totalWeight}/${first[1].totalPacks}</span>`;
      if (second) itemSummaryHtml += `<span style="padding:0.1rem 0.3rem;border-radius:0.5rem;background-color:#f3f4f6;font-size:0.6rem;">
        <strong>${second[0]}</strong>:${second[1].totalWeight}/${second[1].totalPacks}</span>`;
      itemSummaryHtml += '</div>';
    }

    const givenAmountRow = givenAmount > 0 ? `<tr>
      <td style="width:50%;text-align:left;white-space:nowrap;"><span style="font-size:0.75rem;">දුන් මුදල: </span><span style="font-weight:bold;font-size:0.9rem;">${parseFloat(givenAmount).toFixed(2)}</span></td>
      <td style="width:50%;text-align:right;white-space:nowrap;font-size:1rem;"><span style="font-size:0.8rem;">ඉතිරිය: </span><span style="font-weight:bold;font-size:1.5rem;">${Math.abs(remaining).toFixed(2)}</span></td>
    </tr>` : '';

    const totalAmount = Math.abs(globalLoanAmount) + totalPrice;

    const loanRow = globalLoanAmount !== 0 ? `<tr>
  <td style="font-weight:normal;font-size:0.9rem;text-align:left; white-space: nowrap;">
  පෙර ණය: Rs. <span>
    ${globalLoanAmount < 0
        ? Math.abs(globalLoanAmount).toFixed(2)
        : globalLoanAmount.toFixed(2)
      }
  </span>
</td>

  <td style="font-weight:bold;text-align:right;font-size:1.5em;">
    Rs. ${Math.abs(totalAmount).toFixed(2)}</td>
</tr>` : '';

    return `<div class="receipt-container" style="width:100%;max-width:300px;margin:0 auto;padding:5px;">
      <div style="text-align:center;margin-bottom:5px;">
        <h3 style="font-size:1.8em;font-weight:bold;margin:0;">NVDS</h3>
        </div>
      <div style="text-align:left;margin-bottom:5px;">
        <table style="width:100%;font-size:9px;border-collapse:collapse;">
          <tr><td style="width:50%;">දිනය : ${date}</td><td style="width:50%;text-align:right;">${time}</td></tr>
          <tr><td colspan="2">දුර : ${mobile || ''}</td></tr>
          <tr><td>බිල් අංකය : <strong>${billNo}</strong></td><td style="text-align:right;"><strong style="font-size:2.0em;">${customerName.toUpperCase()}</strong></td></tr>
        </table>
      </div>
      <hr style="border:1px solid #000;margin:5px 0;opacity:1;">
      <table style="width:100%;font-size:9px;border-collapse:collapse;">
        <thead style="font-size:1.8em;">
          <tr><th style="text-align:left;padding:2px;">වර්ගය<br>මලු</th><th style="padding:2px;">කිලෝ</th><th style="padding:2px;">මිල</th><th style="text-align:right;padding:2px;">අගය</th></tr>
        </thead>
        <tbody>
          <tr><td colspan="4"><hr style="border:1px solid #000;margin:5px 0;opacity:1;"></td></tr>
          ${itemsHtml}
          <tr><td colspan="4"><hr style="border:1px solid #000;margin:5px 0;opacity:1;"></td></tr>
          <tr><td colspan="2" style="text-align:left;font-weight:bold;font-size:1.8em;">${totalPacksSum}</td><td colspan="2" style="text-align:right;font-weight:bold;font-size:1.5em;">${totalSalesExcludingPackDue.toFixed(2)}</td></tr>
        </tbody>
      </table>
      <table style="width:100%;font-size:15px;border-collapse:collapse;">
        <tr><td>ප්‍රවාහන ගාස්තු:</td><td style="text-align:right;font-weight:bold;">00</td></tr>
        <tr><td>කුලිය:</td><td style="text-align:right;font-weight:bold;">${totalPackDueCost.toFixed(2)}</td></tr>
        <tr><td>අගය:</td><td style="text-align:right;font-weight:bold;"><span style="display:inline-block; border-top:1px solid #000; border-bottom:3px double #000; padding:2px 4px; min-width:80px; text-align:right; font-size:1.5em;">${(totalPrice).toFixed(2)}</span></td></tr>
        ${givenAmountRow}${loanRow}
      </table>
      <div style="font-size:10px;">${itemSummaryHtml}</div>
        <tr><td colspan="4"><hr style="border:1px solid #000;margin:5px 0;opacity:1;"></td></tr>
      <div style="text-align:center;margin-top:10px;font-size:10px;">
        <p style="margin:0;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p><p style="margin:0;">නැවත භාර ගනු නොලැබේ</p>
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

    try {
      const [printResponse, loanResponse] = await Promise.allSettled([
        // 🔹 REVERTED: Use routes object
        apiCall(routes.markPrinted, "POST", {
          sales_ids: salesData.map(s => s.id),
          force_new_bill: true
        }),
        // 🔹 REVERTED: Use routes object
        fetch(routes.getLoanAmount, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf },
          body: JSON.stringify({ customer_short_name: salesData[0].customer_code || "N/A" })
        }).then(res => res.json())
      ]);

      if (printResponse.status === 'rejected' || printResponse.value.status !== "success") {
        throw new Error(printResponse.value?.message || "Printing failed");
      }

      const customerCode = salesData[0].customer_code || "N/A";
      const customerName = customerCode;
      const mobile = salesData[0].mobile || '0702758908';
      const billNo = printResponse.value.bill_no || "";

      let globalLoanAmount = 0;
      if (loanResponse.status === 'fulfilled') {
        globalLoanAmount = parseFloat(loanResponse.value.total_loan_amount) || 0;
      }

      const receiptHtml = buildFullReceiptHTML(salesData, billNo, customerName, mobile, globalLoanAmount);
      const copyHtml = `<div style="text-align:center;font-size:2em;font-weight:bold;color:red;margin-bottom:10px;">COPY</div>${receiptHtml}`;

      const printPromises = [
        printSingleContent(receiptHtml, customerName),
      ];

      await Promise.all(printPromises);

      updateState({
        allSales: allSales.map(s => {
          const isPrinted = salesData.some(d => d.id === s.id);
          return isPrinted ? { ...s, bill_printed: 'Y', bill_no: billNo } : s;
        }),
        selectedUnprintedCustomer: null,
        selectedPrintedCustomer: null,
        customerSearchInput: ""
      });
      handleClearForm();

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      alert("Printing failed: " + error.message);
      setTimeout(() => { window.location.reload(); }, 100);
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

  // 🔹 ADDED: isLoading check from original
  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading sales data...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="sales-layout">
        <div className="three-column-layout">

          {/* Left Sidebar */}
          <div className="left-sidebar">
            <CustomerList customers={printedCustomers} type="printed" searchQuery={searchQueries.printed}
              onSearchChange={(value) => updateState({ searchQueries: { ...searchQueries, printed: value } })}
              selectedPrintedCustomer={selectedPrintedCustomer} selectedUnprintedCustomer={selectedUnprintedCustomer}
              handleCustomerClick={handleCustomerClick} unprintedTotal={unprintedTotal} formatDecimal={formatDecimal} allSales={allSales} />
          </div>

          {/* Center Form - MODIFIED FOR VERTICAL STACKING based on image_766b6c.png */}
          <div className="center-form">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* === ROW 1: BILL NO & TOTAL SALES (Horizontal and Fixed) === */}

              <div
                className="w-full flex"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {/* LEFT SIDE — Bill No */}
                <div style={{ flexShrink: 0, color: 'red', fontWeight: 'bold', fontSize: '1.125rem' }}>
                  Bill No: {currentBillNo}
                </div>

                {/* RIGHT SIDE — Total Sales */}
                <div
                  style={{
                    flexShrink: 0,
                    color: 'red',
                    fontWeight: 'bold',
                    fontSize: '1.5rem',
                    whiteSpace: 'nowrap',
                    textAlign: 'right',
                  }}
                >
                  Total Sales: Rs. {formatDecimal(mainTotal)}
                </div>
              </div>

              {/* === ROW 2: CUSTOMER CODE (Stacked) === */}
              <div className="w-full">
                <label htmlFor="customer_code_input" className="block text-sm font-medium mb-1">CUSTOMER CODE</label>
                <input
                  id="customer_code_input"
                  ref={refs.customerCode}
                  name="customer_code"
                  value={formData.customer_code || autoCustomerCode}
                  onChange={(e) => { const value = e.target.value.toUpperCase(); handleInputChange("customer_code", value); if (value.trim() === "") { setFormData(prev => ({ ...prev, customer_code: "", customer_name: "", given_amount: "" })); updateState({ selectedPrintedCustomer: null, selectedUnprintedCustomer: null }); } }}
                  onKeyDown={(e) => handleKeyDown(e, 0)}
                  type="text"
                  maxLength={10}
                  className="px-4 py-2 uppercase font-bold text-[20px] w-full"
                />
              </div>

              {/* === ROW 3: SELECT CUSTOMER (Stacked) === */}
              <div className="w-full">
                <Select
                  id="customer_code_select"
                  ref={refs.customerSelect}
                  value={formData.customer_code ? { value: formData.customer_code, label: `${formData.customer_code}` } : null}
                  onChange={handleCustomerSelect}
                  options={customers.filter(c => !customerSearchInput || c.short_name.charAt(0).toUpperCase() === customerSearchInput.charAt(0).toUpperCase()).map(c => ({ value: c.short_name, label: `${c.short_name}` }))}
                  onInputChange={(inputValue, { action }) => { if (action === "input-change") updateState({ customerSearchInput: inputValue.toUpperCase() }); }}
                  inputValue={customerSearchInput}
                  placeholder="-- Select Customer --"
                  isClearable
                  isSearchable
                  className="react-select-container font-bold text-[20px]"
                  styles={{
                    control: (base) => ({ ...base, minHeight: "44px", height: "44px" }),
                    valueContainer: (base) => ({ ...base, padding: "0 8px", height: "44px" }),
                    placeholder: (base) => ({ ...base, fontSize: "1rem" })
                  }}
                />
              </div>

              {/* === ROW 4: LOAN (Stacked) === */}
              <div className="w-full">
                {/* Loan Display - Yellow BG, Red Text */}
                <div className="bg-yellow-100 p-2 rounded-lg mt-1">
                  <span className="text-red-600 font-bold whitespace-nowrap">
                    Loan: Rs. {loanAmount < 0 ? formatDecimal(Math.abs(loanAmount)) : formatDecimal(loanAmount)}
                  </span>
                </div>
              </div>

              {/* === ROW 5: SUPPLIER (Stacked) === */}
              <div className="w-full">
                <label htmlFor="supplier_code" className="block text-sm font-medium mb-1">SUPPLIER</label>
                <input
                  id="supplier_code"
                  ref={refs.supplierCode}
                  name="supplier_code"
                  value={formData.supplier_code}
                  onChange={(e) => handleInputChange("supplier_code", e.target.value.toUpperCase())}
                  onKeyDown={(e) => handleKeyDown(e, 3)}
                  type="text"
                  className="px-3 py-2 uppercase font-bold text-lg w-full"
                  maxLength={10}
                />
              </div>

              {/* === ROW 6: ITEM SELECT (Stacked) === */}
              <div className="w-full">
                <label className="block text-sm font-medium mb-1">&nbsp;</label>
                <Select
                  id="item_code_select"
                  ref={refs.itemCodeSelect}
                  value={formData.item_code ? { value: formData.item_code, label: `${formData.item_name} (${formData.item_code})`, item: { no: formData.item_code, type: formData.item_name, pack_due: formData.pack_due } } : null}
                  onChange={handleItemSelect}
                  options={items.filter(item => { if (!state.itemSearchInput) return true; const search = state.itemSearchInput.toLowerCase(); return String(item.no).toLowerCase().startsWith(search) || String(item.type).toLowerCase().includes(search); }).map(item => ({ value: item.no, label: `${item.type} (${item.no})`, item }))}
                  onInputChange={inputValue => updateState({ itemSearchInput: inputValue.toUpperCase() })}
                  inputValue={state.itemSearchInput}
                  onKeyDown={e => handleKeyDown(e, 4)}
                  placeholder="-- SELECT ITEM --"
                  isClearable={false}
                  isSearchable
                  className="react-select-container font-bold text-lg"
                  styles={{
                    control: (base) => ({ ...base, minHeight: "42px", height: "42px" }),
                    valueContainer: (base) => ({ ...base, padding: "0 8px", height: "42px", textTransform: "uppercase" }),
                    input: (base) => ({ ...base, textTransform: "uppercase" }),
                    placeholder: (base) => ({ ...base, fontSize: "1rem" }),
                    menuList: (base) => ({ ...base, maxHeight: "300px" })
                  }}
                />
              </div>

              {/* === ROW 7: DATA ENTRY INPUTS (Horizontal for this row only) === */}
              <div className="flex items-start justify-start gap-2 mt-6">

                {/* Weight */}
                <div className="flex flex-col items-center flex-shrink-0 w-24">
                  <div className="bg-white text-black font-bold py-2 px-6 rounded-lg mb-2 w-full text-center">බර</div>
                  <input
                    id="weight" ref={refs.weight} name="weight" type="text"
                    value={formData.weight}
                    onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) handleInputChange('weight', v); }}
                    onKeyDown={(e) => handleKeyDown(e, 6)}
                    className="px-3 py-2 rounded-2xl text-right text-lg font-semibold w-full"
                    maxLength="7"
                  />
                </div>

                {/* Price */}
                <div className="flex flex-col items-center flex-shrink-0 w-24">
                  <div className="bg-white text-black font-bold py-2 px-6 rounded-lg mb-2 w-full text-center">මිල</div>
                  <input
                    id="price_per_kg" ref={refs.pricePerKg} name="price_per_kg" type="text"
                    value={formData.price_per_kg}
                    onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) handleInputChange('price_per_kg', v); }}
                    onKeyDown={(e) => handleKeyDown(e, 7)}
                    className="px-3 py-2 rounded-2xl text-right text-lg font-semibold w-full"
                    maxLength="7"
                  />
                  <span className="text-red-600 font-bold text-sm mt-1 text-center">
                    {formatDecimal(packCost)}
                  </span>
                </div>

                {/* Packs */}
                <div className="flex flex-col items-center flex-shrink-0 w-24">
                  <div className="bg-white text-black font-bold py-2 px-4 rounded-lg mb-2 w-full text-center">අසුරුම්</div>
                  <input
                    id="packs" ref={refs.packs} name="packs" type="text"
                    value={formData.packs}
                    onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) handleInputChange('packs', v); }}
                    onKeyDown={(e) => handleKeyDown(e, 8)}
                    className="px-3 py-2 rounded-2xl text-right text-lg font-semibold w-full"
                    maxLength="4"
                  />
                  <span className="text-sm mt-1 text-center invisible">...</span>
                </div>

                {/* Total */}
                <div className="flex flex-col items-center flex-shrink-0 w-28">
                  <div className="bg-white text-black font-bold py-2 px-6 rounded-lg mb-2 w-full text-center">Total</div>
                  <input
                    id="total" ref={refs.total} name="total" type="number"
                    value={formData.total}
                    readOnly
                    onKeyDown={(e) => handleKeyDown(e, 9)}
                    onInput={(e) => e.target.value.length > 6 && (e.target.value = e.target.value.slice(0, 6))}
                    className="px-3 py-2 rounded-2xl text-right text-lg font-semibold w-full"
                    maxLength="7"
                  />
                  <span className="text-sm mt-1 text-center invisible">...</span>
                </div>
              </div>


              <div className="flex space-x-4">
                <button type="submit" style={{ display: "none" }} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition">
                  {editingSaleId ? "Update Sales Entry" : "Add Sales Entry"}</button>
                <button type="button" onClick={handleClearForm} className="hidden py-3 px-6 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-xl shadow-lg transition">Clear</button>
              </div>
            </form>

            {errors.form && <div className="mt-6 p-3 bg-red-100 text-red-700 rounded-xl">{errors.form}</div>}

            <div className="mt-4">
              <div className="overflow-x-auto">
                <table className="min-w-full border-gray-200 rounded-xl text-sm">
                  <thead>
                    <tr><th className="px-4 py-2 border">කේතය</th><th className="px-4 py-2 border">අයිතමය</th><th className="px-2 py-2 border w-20">බර(kg)</th><th className="px-2 py-2 border w-20">මිල</th><th className="px-2 py-2 border w-24">සමස්ත</th><th className="px-2 py-2 border w-16">මලු</th><th className="px-2 py-2 border w-16">Actions</th></tr>
                  </thead>
                  <tbody>
                    {displayedSales.map((s, idx) => (
                      <tr key={s.id || idx} tabIndex={0} className="text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => handleEditClick(s)} onKeyDown={(e) => handleTableRowKeyDown(e, s)}><td className="px-4 py-2 border">{s.item_code}</td><td className="px-4 py-2 border">{s.item_name}</td><td className="px-2 py-2 border w-20">{formatDecimal(s.weight)}</td><td className="px-2 py-2 border w-20">{formatDecimal(s.price_per_kg)}</td><td className="px-2 py-2 border w-24">{formatDecimal((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0))}</td><td className="px-2 py-2 border w-16">{s.packs}</td><td className="px-2 py-2 border w-16"><button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(s.id); }} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors" title="Delete record"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button></td></tr>
                    ))}
                  </tbody>
                </table>

                {/* === SUMMARY & GIVEN AMOUNT (REBUILT) === */}
                <div className="flex items-center justify-between mt-6 mb-4">
                  <div className="text-lg font-bold text-red-600">
                    (<span>Sales: Rs. {formatDecimal(displayedSales.reduce((sum, s) =>
                      sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0)
                    )}</span><span>+ Pack Cost: Rs. {formatDecimal(displayedSales.reduce((sum, s) => {
                      const itemCost = (parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0);
                      const totalCost = parseFloat(s.total) || 0;
                      const packCost = totalCost - itemCost;
                      return sum + Math.max(0, packCost);
                    }, 0))}</span>)
                  </div>

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
                    className="px-4 py-2 rounded-xl text-right w-40"
                  />
                </div>
              </div>
            </div>

            {/* === BUTTONS (STYLES KEPT) === */}
            <div className="flex justify-between items-center mt-6">
              <div className="flex space-x-3">
                <button type="button" onClick={handleMarkPrinted} className="px-4 py-1 text-sm bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow transition">F1-PRINT</button>
                <button type="button" onClick={handleMarkAllProcessed} disabled={selectedPrintedCustomer} className={`px-4 py-1 text-sm text-white font-bold rounded-xl shadow transition ${selectedPrintedCustomer ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>F5-HOLD</button>
                <button type="button" onClick={handleFullRefresh} className="px-4 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl shadow transition">F10-Refresh</button>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="right-sidebar">
            <CustomerList customers={unprintedCustomers} type="unprinted" searchQuery={searchQueries.unprinted}
              onSearchChange={(value) => updateState({ searchQueries: { ...searchQueries, unprinted: value } })}
              selectedPrintedCustomer={selectedPrintedCustomer} selectedUnprintedCustomer={selectedUnprintedCustomer}
              handleCustomerClick={handleCustomerClick} unprintedTotal={unprintedTotal} formatDecimal={formatDecimal} allSales={allSales} />
          </div>
        </div>
      </div>
    </Layout>
  );
}