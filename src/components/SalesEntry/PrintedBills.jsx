import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import api from "../../api";
import ItemReportModal from '../Itemrepo/ItemReportModal';
import WeightReportModal from '../WeightReport/WeightReportModal';
import GrnSaleReportModal from '../GrnSale/ReportModal';
import GrnReportModal from '../GrnReport/GrnReportModal';
import SalesAdjustmentReportModal from '../SalesAdjustmentReport/SalesAdjustmentReportModal';
import GrnSalesOverviewReport from '../GrnSalesOverview/GrnSalesOverviewReport';
import GrnSalesOverviewReport2 from '../GrnSalesOverview/GrnSalesOverviewReport2';
import SalesReportModal from '../SalesReport/SalesReportModal';
import DayProcessModal from '../Modals/DayProcessModal';
import { useNavigate } from 'react-router-dom';

const routes = {
    sales: "/sales",
    customers: "/customers",
    getAllSales: "/sales/all",
    getArchivedSales: "/sales/archived",
    updateGivenAmountApplied: "/sales/update-given-amount-applied",
    getBanks: "/banks",
    applyAdjustment: "/adjustments/apply",
    pendingCustomerBills: "/adjustments/pending-customer-bills",
    pendingFarmerBills: "/adjustments/pending-farmer-bills",
    paymentHistory: "/sales/payment-history",
    checkCustomer: "/customers/check-short-name",
    updateDebtorStatus: "/customers/update-debtor-status",
    paymentReport: "/sales/payment-report",
    dashboardStats: "/sales/dashboard-stats",
    debtors: {
        create: "/debtors/create",
        updatePayment: "/debtors/update-payment",
        getByBill: "/debtors",
        getByCustomer: "/debtors/customer",
        getPending: "/debtors/pending/all"
    }
};

// ==================== HELPER FUNCTIONS ====================
const formatDecimal = (value) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value || 0));
};
// ADD THIS DEBUG FUNCTION RIGHT HERE
const debugCreditChanges = (billNo, previousCredit, newCredit, source) => {
    console.log(`🔍 CREDIT DEBUG - Bill: ${billNo}`);
    console.log(`   Previous Credit: ${previousCredit}`);
    console.log(`   New Credit: ${newCredit}`);
    console.log(`   Source: ${source}`);
    console.log(`   Changed: ${previousCredit !== newCredit ? 'YES ⚠️' : 'NO ✓'}`);
    if (previousCredit !== newCredit) {
        console.trace('Credit change stack trace:');
    }
};


const processBillData = (salesData) => {
    const pendingMap = {};
    const appliedMap = {};

    salesData.filter(s => s.bill_printed === 'Y' && s.bill_no).forEach(sale => {
        const billNo = sale.bill_no;
        let paymentHistory = [];
        if (sale.payment_history) {
            try {
                paymentHistory = typeof sale.payment_history === 'string' ? JSON.parse(sale.payment_history) : sale.payment_history;
                if (!Array.isArray(paymentHistory)) paymentHistory = [];
            } catch (e) { paymentHistory = []; }
        }

        let totalCreditAmount = 0;  // Total credit taken
        let totalCashPaid = 0;      // Total cash/cheque/transfer payments (not credit)
        let totalGivenAmount = 0;

        // Process payment history - track total credit taken
        paymentHistory.forEach(payment => {
            const amount = parseFloat(payment.amount) || 0;
            totalGivenAmount += amount;

            if (payment.method === 'Credit') {
                totalCreditAmount += amount;
            } else if (['Cash', 'Cheque', 'Bank Transfer'].includes(payment.method)) {
                totalCashPaid += amount;
            }
        });

        // IMPORTANT: Do NOT calculate remainingCredit from payment history
        // The remaining credit should come from the debtor table, not from payment history calculation
        // We'll set remainingCredit to totalCreditAmount for now, and it will be updated separately

        // Debug logging
        if (totalCreditAmount > 0) {
            console.log(`Bill ${billNo}: Credit Taken: ${totalCreditAmount}, Cash Paid: ${totalCashPaid}`);
        }

        const finalGivenAmount = totalGivenAmount;
        const finalCashPayments = totalCashPaid;
        const finalCreditAmount = totalCreditAmount;

        // Initialize remainingCredit as totalCreditAmount (will be updated when we fetch debtor data)
        let finalRemainingCredit = totalCreditAmount;

        const isApplied = sale.given_amount_applied === 'Y';
        const targetMap = isApplied ? appliedMap : pendingMap;

        if (!targetMap[billNo]) {
            targetMap[billNo] = {
                billNo,
                customerCode: sale.customer_code,
                sales: [],
                totalAmount: 0,
                givenAmount: finalGivenAmount,
                cashPayments: finalCashPayments,
                creditAmount: finalCreditAmount,
                remainingCredit: finalRemainingCredit,
                givenAmountApplied: sale.given_amount_applied || 'N',
                paymentAdjustmentType: sale.payment_adjustment_type || null,
                createdAt: sale.created_at,
                chequeDetails: sale.cheq_no ? { cheq_no: sale.cheq_no, cheq_date: sale.cheq_date, bank_name: sale.bank_name } : null,
                transferDetails: sale.transfer_reference_no ? { reference_no: sale.transfer_reference_no, transfer_date: sale.transfer_date } : null,
                paymentHistory
            };
        }
        targetMap[billNo].sales.push(sale);
        targetMap[billNo].totalAmount += (parseFloat(sale.total) || 0) + ((parseFloat(sale.packs) || 0) * (parseFloat(sale.CustomerPackCost) || 0));
    });

    return {
        pendingBills: Object.values(pendingMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        appliedBills: Object.values(appliedMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    };
};
// ==================== CUSTOMER TYPE SELECTOR ====================
// Replace your existing CustomerTypeSelector component with this updated version:

const CustomerTypeSelector = ({ selectedType, onSelect, disabled = false, onDebtorClick, onUnlockScreen, billCustomerCode = null, billNo = null, selectedBillDebtor = null, customers = [], viewOldBills = false }) => {
    const [showDebtorConfirm, setShowDebtorConfirm] = useState(false);
    const [customerCode, setCustomerCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [matchingCustomers, setMatchingCustomers] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [allCustomers, setAllCustomers] = useState(customers);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [selectedFromDropdown, setSelectedFromDropdown] = useState(false);
    const [customersLoaded, setCustomersLoaded] = useState(!!customers.length);
    const [updatingCustomerCode, setUpdatingCustomerCode] = useState(false);

    // Check if bill has an existing debtor number
    const billHasDebtor = selectedBillDebtor?.Debtor_no;

    // Update allCustomers when customers prop changes
    useEffect(() => {
        setAllCustomers(customers);
        if (customers.length) {
            setCustomersLoaded(true);
        }
    }, [customers]);

    const fetchAllCustomers = async () => {
        if (customers.length && customersLoaded) return;

        setIsLoadingCustomers(true);
        try {
            const response = await api.get(routes.customers);
            let customersData = [];
            if (Array.isArray(response.data)) customersData = response.data;
            else if (response.data.data && Array.isArray(response.data.data)) customersData = response.data.data;
            else if (response.data.customers && Array.isArray(response.data.customers)) customersData = response.data.customers;
            setAllCustomers(customersData);
            setCustomersLoaded(true);
        } catch (error) { console.error('Error fetching customers:', error); alert('Failed to load customers list.'); }
        finally { setIsLoadingCustomers(false); }
    };

    // Initial fetch if no customers from parent
    useEffect(() => {
        if (!customers.length && !customersLoaded) {
            fetchAllCustomers();
        }
    }, []);

    // Fetch customers when modal opens if needed
    useEffect(() => {
        if (showDebtorConfirm && !customersLoaded) fetchAllCustomers();
    }, [showDebtorConfirm]);

    // Auto-populate customer code when modal opens
    useEffect(() => {
        if (showDebtorConfirm && billCustomerCode) {
            setCustomerCode(billCustomerCode);
            setSelectedFromDropdown(false);
            const timer = setTimeout(() => {
                if (allCustomers.length) {
                    searchMatchingCustomers(billCustomerCode);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showDebtorConfirm, billCustomerCode, allCustomers.length]);

    const searchMatchingCustomers = (searchTerm) => {
        if (!searchTerm?.trim()) {
            setMatchingCustomers([]);
            setShowSuggestions(false);
            return;
        }
        // Get only the FIRST character of the search term
        const firstLetter = searchTerm.charAt(0).toUpperCase();

        // Find ALL customers whose short_name STARTS WITH that first letter
        const matches = allCustomers.filter(c =>
            (c.short_name || '').toUpperCase().startsWith(firstLetter)
        ).slice(0, 15);

        setMatchingCustomers(matches);
        setShowSuggestions(matches.length > 0);
    };

    const handleCustomerCodeChange = (e) => {
        const value = e.target.value.toUpperCase();
        setCustomerCode(value);
        setSelectedFromDropdown(false);
        searchMatchingCustomers(value);
    };

    const handleSelectCustomer = (customer) => {
        setCustomerCode(customer.short_name);
        setSelectedFromDropdown(true);
        setShowSuggestions(false);
        const msg = customer.Debtor === 'Y' && customer.Debtor_no
            ? `✅ Customer "${customer.short_name}" selected!\n📋 Debtor Number: ${customer.Debtor_no}`
            : `👤 Customer "${customer.short_name}" selected!`;
        alert(msg);

        // Call this to process the customer selection and unlock the screen
        setTimeout(() => handleCheckCustomerWithCode(customer.short_name, true, customer), 100);
    };
    // UPDATED FUNCTION: Update customer code and debtor_no for all records with same bill_no
    const updateCustomerCodeAndDebtorForBill = async (newCustomerCode, newDebtorNo, originalCustomerCode) => {
        setUpdatingCustomerCode(true);
        try {
            console.log(`Updating customer_code from "${originalCustomerCode}" to "${newCustomerCode}" for bill #${billNo}`);
            console.log(`Updating debtor_no to "${newDebtorNo || 'NULL'}" for bill #${billNo}`);

            const response = await api.put('/sales/update-customer-and-debtor', {
                bill_no: billNo,
                old_customer_code: originalCustomerCode,
                new_customer_code: newCustomerCode,
                debtor_no: newDebtorNo || null
            });

            if (response.data.success) {
                console.log('Customer code and debtor_no updated successfully:', response.data);
                let message = `✅ Customer code updated from "${originalCustomerCode}" to "${newCustomerCode}" for Bill #${billNo}\n\n📊 Updated ${response.data.updated_count} records.`;

                if (newDebtorNo) {
                    message += `\n📋 Debtor Number: ${newDebtorNo}`;
                }

                alert(message);

                // Refresh the page data to reflect changes
                window.dispatchEvent(new CustomEvent('salesDataUpdated', {
                    detail: { billNo, customerCode: newCustomerCode, debtorNo: newDebtorNo, timestamp: Date.now() }
                }));

                return true;
            } else {
                throw new Error(response.data.message || 'Failed to update');
            }
        } catch (error) {
            console.error('Error updating customer code and debtor:', error);
            alert(`❌ Failed to update: ${error.response?.data?.message || error.message}`);
            return false;
        } finally {
            setUpdatingCustomerCode(false);
        }
    };

    const handleCheckCustomerWithCode = async (code, useExisting = false, selectedCustomerData = null) => {
        if (!code.trim()) { alert('Please enter a customer code'); return; }

        // Check if this is a different customer code than the original
        const isDifferentCustomer = billCustomerCode && code.toUpperCase() !== billCustomerCode.toUpperCase();

        // Get the debtor number from selected customer if available
        const newDebtorNo = selectedCustomerData?.Debtor_no || null;
        const hasDebtorNo = newDebtorNo && newDebtorNo !== '';

        if (isDifferentCustomer) {
            console.log(`Customer code changed from "${billCustomerCode}" to "${code}"`);
            let confirmMessage = `⚠️ CUSTOMER CODE CHANGE DETECTED ⚠️\n\n` +
                `Original Customer Code: ${billCustomerCode}\n` +
                `New Customer Code: ${code.toUpperCase()}\n\n`;

            if (hasDebtorNo) {
                confirmMessage += `📋 This customer has a DEBTOR NUMBER: ${newDebtorNo}\n` +
                    `This will be assigned to Bill #${billNo}\n\n`;
            }

            confirmMessage += `This will update ALL records with Bill #${billNo} to use the new customer code.\n` +
                `This action cannot be undone easily.\n\n` +
                `Are you sure you want to proceed?`;

            const confirmChange = window.confirm(confirmMessage);

            if (!confirmChange) {
                // Reset to original customer code
                setCustomerCode(billCustomerCode);
                return;
            }
        }

        setLoading(true);
        try {
            let customerData, selectedDebtorNo, selectedCustomerId;
            if (selectedCustomerData) {
                customerData = { exists: true, customer: selectedCustomerData };
                selectedDebtorNo = selectedCustomerData.Debtor_no;
                selectedCustomerId = selectedCustomerData.id;
            } else {
                const response = await api.get(`${routes.checkCustomer}/${code}`);
                customerData = response.data;
                selectedDebtorNo = customerData.customer?.Debtor_no;
                selectedCustomerId = customerData.customer?.id;
            }

            if (customerData.exists && (selectedFromDropdown || useExisting)) {
                // First update the customer code and debtor_no if it's different
                if (isDifferentCustomer) {
                    const updated = await updateCustomerCodeAndDebtorForBill(code.toUpperCase(), selectedDebtorNo, billCustomerCode);
                    if (!updated) {
                        setLoading(false);
                        return;
                    }
                }

                const updateResponse = await api.put(routes.updateDebtorStatus, {
                    short_name: code,
                    customer_id: selectedCustomerId,
                    Debtor: 'Y',
                    bill_no: billNo
                });
                const debtorNo = updateResponse.data.debtor_no || selectedDebtorNo;
                alert(updateResponse.data.was_new_record_created
                    ? `✅ New debtor record created for Bill #${billNo}\n📋 Debtor Number: ${debtorNo}`
                    : `✅ Using EXISTING Debtor!\n📋 Customer: ${code}\n📋 Debtor Number: ${debtorNo || 'N/A'}`);
                setShowDebtorConfirm(false);
                resetCustomerState();

                // ✅ IMPORTANT: Call onSelect to set the customer type to 'debtor'
                if (onSelect) {
                    console.log('Setting customer type to debtor via onSelect');
                    onSelect('debtor');
                }

                // Also call onUnlockScreen as backup
                if (onUnlockScreen) {
                    console.log('Calling onUnlockScreen after successful debtor selection');
                    onUnlockScreen();
                }
            } else if (customerData.exists) {
                const confirmNew = window.confirm(`⚠️ Customer "${code}" exists but not selected from dropdown.\nDo you want to CREATE a NEW debtor record?`);
                if (confirmNew) {
                    // First update the customer code if it's different
                    if (isDifferentCustomer) {
                        const updated = await updateCustomerCodeAndDebtorForBill(code.toUpperCase(), null, billCustomerCode);
                        if (!updated) {
                            setLoading(false);
                            return;
                        }
                    }

                    alert(`✅ Creating NEW debtor record for "${code}".`);
                    setShowDebtorConfirm(false);
                    onDebtorClick(code, billNo);
                    resetCustomerState();

                    // ✅ IMPORTANT: Call onSelect to set customer type
                    if (onSelect) {
                        console.log('Setting customer type to debtor via onSelect (new debtor)');
                        onSelect('debtor');
                    }
                    if (onUnlockScreen) {
                        console.log('Calling onUnlockScreen after new debtor creation');
                        onUnlockScreen();
                    }
                } else {
                    // First update the customer code if it's different
                    if (isDifferentCustomer) {
                        const updated = await updateCustomerCodeAndDebtorForBill(code.toUpperCase(), selectedDebtorNo, billCustomerCode);
                        if (!updated) {
                            setLoading(false);
                            return;
                        }
                    }

                    await api.put(routes.updateDebtorStatus, {
                        short_name: code,
                        customer_id: selectedCustomerId,
                        Debtor: 'Y',
                        bill_no: billNo
                    });
                    alert(`✅ Using EXISTING debtor record for "${code}".`);
                    setShowDebtorConfirm(false);
                    resetCustomerState();

                    // ✅ IMPORTANT: Call onSelect to set customer type
                    if (onSelect) {
                        console.log('Setting customer type to debtor via onSelect (existing)');
                        onSelect('debtor');
                    }
                    if (onUnlockScreen) {
                        console.log('Calling onUnlockScreen after using existing debtor');
                        onUnlockScreen();
                    }
                }
            } else {
                // First update the customer code if it's different
                if (isDifferentCustomer) {
                    const updated = await updateCustomerCodeAndDebtorForBill(code.toUpperCase(), null, billCustomerCode);
                    if (!updated) {
                        setLoading(false);
                        return;
                    }
                }

                setShowDebtorConfirm(false);
                onDebtorClick(code, billNo);
                resetCustomerState();

                // ✅ IMPORTANT: Call onSelect to set customer type
                if (onSelect) {
                    console.log('Setting customer type to debtor via onSelect (new registration)');
                    onSelect('debtor');
                }
                if (onUnlockScreen) {
                    console.log('Calling onUnlockScreen for new customer registration');
                    onUnlockScreen();
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to check customer.');
            setShowDebtorConfirm(false);
            resetCustomerState();
        }
        finally { setLoading(false); }
    };
    const resetCustomerState = () => {
        setCustomerCode('');
        setMatchingCustomers([]);
        setShowSuggestions(false);
        setSelectedFromDropdown(false);
    };

    const handleSkip = () => { setShowDebtorConfirm(false); resetCustomerState(); };

    // Check if no type is selected AND there's no existing debtor
    const noTypeSelected = !selectedType && !billHasDebtor;

    // For old bills, we don't show the warning or block functionality
    const shouldShowWarning = !viewOldBills && noTypeSelected && !billHasDebtor;

    return (
        <>
            <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', borderRadius: '12px', border: '2px solid #bae6fd' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '12px', color: '#0369a1' }}>👤 Customer Type</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { onSelect('walking'); if (billNo) { localStorage.setItem(`customer_type_${billNo}`, 'walking'); } if (onUnlockScreen) onUnlockScreen(); }} disabled={disabled || (!!billHasDebtor && !viewOldBills) || updatingCustomerCode} style={{ flex: 1, padding: '10px', background: selectedType === 'walking' ? 'linear-gradient(135deg, #10b981, #059669)' : 'white', color: selectedType === 'walking' ? 'white' : '#475569', border: selectedType === 'walking' ? 'none' : '2px solid #e2e8f0', borderRadius: '10px', cursor: (disabled || (!!billHasDebtor && !viewOldBills) || updatingCustomerCode) ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', opacity: (disabled || (!!billHasDebtor && !viewOldBills) || updatingCustomerCode) ? 0.6 : 1 }}>🚶 Walking Customer</button>
                    <button
                        onClick={() => setShowDebtorConfirm(true)}
                        disabled={disabled || (!!billHasDebtor && !viewOldBills) || updatingCustomerCode}
                        style={{
                            flex: 1, padding: '10px',
                            background: selectedType === 'debtor' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'white',
                            color: selectedType === 'debtor' ? 'white' : '#475569',
                            border: selectedType === 'debtor' ? 'none' : '2px solid #e2e8f0',
                            borderRadius: '10px',
                            cursor: (disabled || (!!billHasDebtor && !viewOldBills) || updatingCustomerCode) ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            opacity: (disabled || (!!billHasDebtor && !viewOldBills) || updatingCustomerCode) ? 0.6 : 1
                        }}
                    >
                        📋 Debtor
                    </button>
                </div>

                {updatingCustomerCode && (
                    <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '8px', textAlign: 'center', fontWeight: '500' }}>
                        ⏳ Updating customer records...
                    </div>
                )}

                {/* Show warning ONLY when NOT viewing old bills AND no type selected AND no existing debtor */}
                {shouldShowWarning && (
                    <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '8px', textAlign: 'center', fontWeight: '500' }}>
                        ⚠️ Please select customer type to continue
                    </div>
                )}

                {/* Show success message when bill has existing debtor */}
                {billHasDebtor && (
                    <div style={{ fontSize: '10px', color: '#059669', marginTop: '8px', textAlign: 'center', fontWeight: '500', background: '#d1fae5', padding: '6px', borderRadius: '8px' }}>
                        ✅ Debtor Bill - Customer Type: Debtor (Auto-selected)
                    </div>
                )}

                {/* Show selected type message when not auto-selected and not viewing old bills */}
                {!noTypeSelected && !billHasDebtor && !viewOldBills && (
                    <div style={{ fontSize: '10px', color: '#0369a1', marginTop: '8px', textAlign: 'center' }}>
                        ✅ Customer type selected: {selectedType === 'walking' ? 'Walking Customer' : 'Debtor'}
                    </div>
                )}
            </div>

            {showDebtorConfirm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20000 }} onClick={() => setShowDebtorConfirm(false)}>
                    <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '500px', maxWidth: '90%', padding: '24px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <span style={{ fontSize: '48px' }}>📋</span>
                            <h3 style={{ margin: '10px 0 5px', fontSize: '18px', fontWeight: '700' }}>{billCustomerCode ? `Register Debtor: ${billCustomerCode}` : 'Enter Customer Code'}</h3>
                            {billNo && <p style={{ fontSize: '11px', color: '#92400e' }}>Bill Number: {billNo}</p>}
                        </div>

                        {/* Show warning if customer code is being changed */}
                        {billCustomerCode && customerCode && customerCode !== billCustomerCode && (
                            <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#92400e', borderLeft: '4px solid #f59e0b' }}>
                                ⚠️ You are changing the customer code from <strong>{billCustomerCode}</strong> to <strong>{customerCode}</strong><br />
                                This will update ALL records with Bill #{billNo} to use the new customer code.
                            </div>
                        )}

                        <div style={{ marginBottom: '20px', position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>Customer Code</label>
                            <input type="text" value={customerCode} onChange={handleCustomerCodeChange} placeholder="Enter customer code" autoFocus style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', outline: 'none', fontFamily: 'monospace', fontWeight: 'bold' }} onKeyPress={e => e.key === 'Enter' && handleCheckCustomerWithCode(customerCode)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} />
                            {isLoadingCustomers && <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px' }}>⏳ Loading customers...</div>}
                            {!isLoadingCustomers && showSuggestions && matchingCustomers.length > 0 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 20001, maxHeight: '300px', overflowY: 'auto', marginTop: '4px' }}>
                                    {matchingCustomers.map((c, i) => (
                                        <div key={i} onClick={() => handleSelectCustomer(c)} style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: i < matchingCustomers.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{c.short_name}</div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>{c.name || 'No name'}</div>
                                            </div>
                                            <div style={{ background: c.Debtor === 'Y' ? '#fef3c7' : '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: c.Debtor === 'Y' ? '#92400e' : '#64748b' }}>
                                                {c.Debtor === 'Y' ? `📋 Debtor: ${c.Debtor_no || 'N/A'}` : '👤 Regular'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ background: '#e0f2fe', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
                            <strong>📌 How it works:</strong><br />• <strong>Select from dropdown</strong> → Use existing customer (same Debtor No)<br />• <strong>Type & click Continue</strong> → Create NEW debtor (different Debtor No)<br />
                            {billCustomerCode && <><strong>⚠️ Note:</strong> If you enter a different customer code, ALL records with Bill #{billNo} will be updated to use the new code.</>}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={handleSkip} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Cancel</button>
                            <button onClick={() => handleCheckCustomerWithCode(customerCode)} disabled={loading || updatingCustomerCode} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '10px', cursor: (loading || updatingCustomerCode) ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px', opacity: (loading || updatingCustomerCode) ? 0.6 : 1 }}>
                                {(loading || updatingCustomerCode) ? (updatingCustomerCode ? 'Updating...' : 'Checking...') : 'Continue'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
// ==================== DEBTOR FORM MODAL ====================
const DebtorFormModal = ({ isOpen, onClose, onSave, customerCode, billNo = null }) => {
    const [formData, setFormData] = useState({
        name: '',
        ID_NO: '',
        telephone_no: '',
        address: '',
        credit_limit: '',
        credit_period: '',  // Keep as string
        introducer: '',     // NEW: Introducer field
        profile_pic: null,
        nic_front: null,
        nic_back: null
    });
    const [loading, setLoading] = useState(false);
    const [previewImages, setPreviewImages] = useState({ profile_pic: null, nic_front: null, nic_back: null });
    const [generatedDebtorNo, setGeneratedDebtorNo] = useState(null);

    // Create refs for all form fields
    const nameRef = useRef(null);
    const idNoRef = useRef(null);
    const telephoneRef = useRef(null);
    const addressRef = useRef(null);
    const creditLimitRef = useRef(null);
    const creditPeriodRef = useRef(null);
    const introducerRef = useRef(null);  // NEW: Ref for introducer
    const profilePicRef = useRef(null);
    const nicFrontRef = useRef(null);
    const nicBackRef = useRef(null);
    const skipButtonRef = useRef(null);
    const saveButtonRef = useRef(null);

    useEffect(() => {
        if (isOpen && customerCode) {
            setGeneratedDebtorNo(null);
            // Reset form data when modal opens
            setFormData({
                name: '',
                ID_NO: '',
                telephone_no: '',
                address: '',
                credit_limit: '',
                credit_period: '',
                introducer: '',     // NEW: Reset introducer
                profile_pic: null,
                nic_front: null,
                nic_back: null
            });
            setPreviewImages({ profile_pic: null, nic_front: null, nic_back: null });
            // Auto-focus the name field when modal opens
            setTimeout(() => {
                if (nameRef.current) {
                    nameRef.current.focus();
                }
            }, 100);
        }
    }, [isOpen, customerCode]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Debug log
        if (name === 'credit_period') {
            console.log('Credit period changed:', value);
        }
        if (name === 'introducer') {
            console.log('Introducer changed:', value);
        }
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (files[0]) {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
            const reader = new FileReader();
            reader.onloadend = () => setPreviewImages(prev => ({ ...prev, [name]: reader.result }));
            reader.readAsDataURL(files[0]);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('short_name', customerCode.toUpperCase());
            if (formData.name) formDataToSend.append('name', formData.name);
            if (formData.ID_NO) formDataToSend.append('ID_NO', formData.ID_NO);
            if (formData.telephone_no) formDataToSend.append('telephone_no', formData.telephone_no);
            if (formData.address) formDataToSend.append('address', formData.address);
            if (formData.credit_limit) formDataToSend.append('credit_limit', formData.credit_limit);

            // NEW: Add introducer if provided
            if (formData.introducer && formData.introducer.trim() !== '') {
                formDataToSend.append('introducer', formData.introducer.trim());
                console.log('✅ Appending introducer:', formData.introducer.trim());
            }

            // DEBUG: Log credit period value
            console.log('=== CREDIT PERIOD DEBUG ===');
            console.log('Raw credit_period value:', formData.credit_period);
            console.log('Credit period type:', typeof formData.credit_period);
            console.log('Credit period length:', formData.credit_period?.length);

            // Append credit_period only if it has a value
            if (formData.credit_period && formData.credit_period.trim() !== '') {
                const trimmedValue = formData.credit_period.trim();
                formDataToSend.append('credit_period', trimmedValue);
                console.log('✅ Appending credit_period:', trimmedValue);
            } else {
                console.log('⚠️ Credit period is empty, not appending');
            }

            formDataToSend.append('Debtor', 'Y');
            if (billNo) formDataToSend.append('bill_no', billNo);
            if (formData.profile_pic) formDataToSend.append('profile_pic', formData.profile_pic);
            if (formData.nic_front) formDataToSend.append('nic_front', formData.nic_front);
            if (formData.nic_back) formDataToSend.append('nic_back', formData.nic_back);

            // Log all FormData entries for debugging
            console.log('=== ALL FORM DATA BEING SENT ===');
            for (let pair of formDataToSend.entries()) {
                console.log(pair[0] + ':', pair[1]);
            }

            const response = await api.post('/customers', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            console.log('Response from server:', response.data);

            if (response.status === 200 || response.status === 201) {
                const debtorNo = response.data.Debtor_no;
                setGeneratedDebtorNo(debtorNo);
                let message = `Customer registered as Debtor successfully!\nDebtor Number: ${debtorNo}${billNo ? `\nBill No: ${billNo}` : ''}`;
                if (formData.credit_period) {
                    message += `\nCredit Period: ${formData.credit_period}`;
                }
                if (formData.introducer) {
                    message += `\nIntroducer: ${formData.introducer}`;
                }
                alert(message);
                onSave(true, debtorNo);
                onClose();
            }
        } catch (error) {
            console.error('Error saving debtor:', error);
            console.error('Error response:', error.response?.data);
            alert('Failed to save debtor information. Please check the console for details.');
        }
        finally { setLoading(false); }
    };

    // Handle Enter key navigation
    const handleKeyPress = (e, nextFieldRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldRef && nextFieldRef.current) {
                setTimeout(() => {
                    nextFieldRef.current.focus();
                }, 50);
            }
        }
    };

    // Handle Enter key for textarea
    const handleTextareaKeyPress = (e, nextFieldRef) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (nextFieldRef && nextFieldRef.current) {
                setTimeout(() => {
                    nextFieldRef.current.focus();
                }, 50);
            }
        }
    };

    // Handle Enter key for file inputs (they behave differently)
    const handleFileKeyPress = (e, nextFieldRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldRef && nextFieldRef.current) {
                setTimeout(() => {
                    nextFieldRef.current.focus();
                }, 50);
            }
        }
    };

    // Handle Enter key for last field - submit the form
    const handleLastFieldKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Handle button Enter key
    const handleButtonKeyPress = (e, action) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            action();
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '500px', maxWidth: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '20px 20px 0 0' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📝</span> Register Debtor: {customerCode}
                        {billNo && <span style={{ fontSize: '12px' }}>(Bill: {billNo})</span>}
                    </h3>
                </div>
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {generatedDebtorNo && (
                        <div style={{ background: '#d1fae5', padding: '12px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#065f46' }}>Debtor Number</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#047857' }}>{generatedDebtorNo}</div>
                        </div>
                    )}
                    <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#92400e' }}>
                        ⚠️ Customer "{customerCode}" not found. Please provide information to register as Debtor.
                        <br /><small>All fields are optional. A unique Debtor Number will be automatically generated.
                            {billNo && <><br /><small>This debtor will be linked to Bill No: {billNo}</small></>}</small>
                    </div>

                    {/* Full Name Field */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>Full Name</label>
                        <input
                            ref={nameRef}
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            onKeyPress={(e) => handleKeyPress(e, idNoRef)}
                            autoFocus
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                        />
                    </div>

                    {/* ID Number Field */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>ID Number</label>
                        <input
                            ref={idNoRef}
                            type="text"
                            name="ID_NO"
                            value={formData.ID_NO}
                            onChange={handleChange}
                            onKeyPress={(e) => handleKeyPress(e, telephoneRef)}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                        />
                    </div>

                    {/* Telephone Number Field */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>Telephone Number</label>
                        <input
                            ref={telephoneRef}
                            type="text"
                            name="telephone_no"
                            value={formData.telephone_no}
                            onChange={handleChange}
                            onKeyPress={(e) => handleKeyPress(e, addressRef)}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                        />
                    </div>

                    {/* Address Field */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>Address</label>
                        <textarea
                            ref={addressRef}
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            onKeyPress={(e) => handleTextareaKeyPress(e, creditLimitRef)}
                            rows="2"
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', resize: 'vertical' }}
                        />
                    </div>

                    {/* Credit Limit Field */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>Credit Limit (Rs.)</label>
                        <input
                            ref={creditLimitRef}
                            type="number"
                            name="credit_limit"
                            value={formData.credit_limit}
                            onChange={handleChange}
                            onKeyPress={(e) => handleKeyPress(e, creditPeriodRef)}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                        />
                    </div>

                    {/* Credit Period Field - As text input */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>
                            Credit Period
                            <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px' }}>(Optional)</span>
                        </label>
                        <input
                            ref={creditPeriodRef}
                            type="text"
                            name="credit_period"
                            value={formData.credit_period}
                            onChange={handleChange}
                            onKeyPress={(e) => handleKeyPress(e, introducerRef)}  // CHANGED: Now goes to introducer
                            placeholder="e.g., 2 days, 1 week, 30 days, 1 month"
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '13px',
                                backgroundColor: 'white'
                            }}
                        />
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                            💡 Examples: "2 days", "1 week", "30 days", "1 month", "2 months", "90 days"
                        </div>
                    </div>

                    {/* NEW: Introducer Field */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>
                            Introducer
                            <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px' }}>(Optional)</span>
                        </label>
                        <input
                            ref={introducerRef}
                            type="text"
                            name="introducer"
                            value={formData.introducer}
                            onChange={handleChange}
                            onKeyPress={(e) => handleKeyPress(e, profilePicRef)}
                            placeholder="Enter introducer name or reference"
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '13px',
                                backgroundColor: 'white'
                            }}
                        />
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                            💡 Person who introduced this customer (optional)
                        </div>
                    </div>

                    {/* Profile Picture Field */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>Profile Picture</label>
                        <input
                            ref={profilePicRef}
                            type="file"
                            name="profile_pic"
                            onChange={handleFileChange}
                            accept="image/jpeg,image/jpg,image/png"
                            onKeyPress={(e) => handleFileKeyPress(e, nicFrontRef)}
                            style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                        />
                        {previewImages.profile_pic && <img src={previewImages.profile_pic} alt="Preview" style={{ marginTop: '6px', maxWidth: '100%', maxHeight: '80px', borderRadius: '6px' }} />}
                    </div>

                    {/* NIC Front Field */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>NIC Front</label>
                        <input
                            ref={nicFrontRef}
                            type="file"
                            name="nic_front"
                            onChange={handleFileChange}
                            accept="image/jpeg,image/jpg,image/png"
                            onKeyPress={(e) => handleFileKeyPress(e, nicBackRef)}
                            style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                        />
                        {previewImages.nic_front && <img src={previewImages.nic_front} alt="Preview" style={{ marginTop: '6px', maxWidth: '100%', maxHeight: '80px', borderRadius: '6px' }} />}
                    </div>

                    {/* NIC Back Field (Last Field - Submits on Enter) */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '11px' }}>NIC Back</label>
                        <input
                            ref={nicBackRef}
                            type="file"
                            name="nic_back"
                            onChange={handleFileChange}
                            accept="image/jpeg,image/jpg,image/png"
                            onKeyPress={(e) => handleLastFieldKeyPress(e)}
                            style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                        />
                        {previewImages.nic_back && <img src={previewImages.nic_back} alt="Preview" style={{ marginTop: '6px', maxWidth: '100%', maxHeight: '80px', borderRadius: '6px' }} />}
                    </div>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc', borderRadius: '0 0 20px 20px' }}>
                    <button
                        ref={skipButtonRef}
                        onClick={onClose}
                        onKeyPress={(e) => handleButtonKeyPress(e, onClose)}
                        style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
                    >
                        Skip
                    </button>
                    <button
                        ref={saveButtonRef}
                        onClick={handleSubmit}
                        disabled={loading}
                        onKeyPress={(e) => handleButtonKeyPress(e, handleSubmit)}
                        style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #4CAF50, #45a049)', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '12px', opacity: loading ? 0.6 : 1 }}
                    >
                        {loading ? 'Saving...' : 'Save & Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
};
// ==================== BANK ACCOUNT SELECTOR ====================
const BankAccountSelector = React.forwardRef(({ selectedAccountId, onSelect, disabled = false, onKeyDown }, ref) => {
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => { fetchBanks(); }, []);

    const fetchBanks = async () => {
        setLoading(true);
        try {
            const response = await api.get(routes.getBanks);
            if (response.data.success) setBanks(response.data.data);
            else setError('Failed to load bank accounts');
        } catch (error) { setError('Unable to load bank accounts'); }
        finally { setLoading(false); }
    };

    if (loading) return <div style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Loading bank accounts...</div>;
    if (error) return <div style={{ padding: '10px', textAlign: 'center', color: '#ef4444', fontSize: '12px' }}>{error}</div>;

    return (
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#334155' }}>Select Bank Account <span style={{ color: '#ef4444' }}>*</span></label>
            <select
                ref={ref}  // ← THIS IS THE KEY CHANGE - forward the ref to the select element
                value={selectedAccountId || ''}
                onChange={(e) => onSelect(e.target.value ? parseInt(e.target.value) : null)}
                onKeyDown={onKeyDown}  // ← Add this to handle Enter key
                disabled={disabled}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', cursor: 'pointer' }}
            >
                <option value="">-- Select Bank Account --</option>
                {banks.map(bank => (<option key={bank.id} value={bank.id}>{bank.bank_name} - {bank.branch} (Acc: {bank.account_no})</option>))}
            </select>
        </div>
    );
});
// ==================== PAYMENT HISTORY MODAL ====================
const PaymentHistoryModal = ({ isOpen, onClose, payments, totalPaid, totalBill, remaining }) => {
    if (!isOpen) return null;

    const getPaymentMethodStyle = (method) => {
        switch (method) {
            case 'Cash': return { backgroundColor: '#10b981', color: 'white' };
            case 'Cheque': return { backgroundColor: '#8b5cf6', color: 'white' };
            case 'Bank Transfer': return { backgroundColor: '#ec489a', color: 'white' };
            case 'bag_to_box': return { backgroundColor: '#f59e0b', color: 'white' };
            case 'bill_to_bill': return { backgroundColor: '#3b82f6', color: 'white' };
            case 'bad_debt': return { backgroundColor: '#ef4444', color: 'white' };
            default: return { backgroundColor: '#6b7280', color: 'white' };
        }
    };

    const getPaymentIcon = (method) => {
        switch (method) {
            case 'Cash': return '💰';
            case 'Cheque': return '💳';
            case 'Bank Transfer': return '🏦';
            case 'bag_to_box': return '📦';
            case 'bill_to_bill': return '📄';
            case 'bad_debt': return '⚠️';
            default: return '💵';
        }
    };

    const getMethodDisplayName = (method) => {
        switch (method) {
            case 'bag_to_box': return 'Bag to Box';
            case 'bill_to_bill': return 'Bill to Bill';
            case 'bad_debt': return 'Bad Debt';
            default: return method;
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '550px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Payment History</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#64748b' }}>Total Bill</div><div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(totalBill)}</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#64748b' }}>Total Paid</div><div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalPaid)}</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#64748b' }}>Remaining</div><div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(remaining)}</div></div>
                </div>
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {payments && payments.length > 0 ? payments.map((payment, index) => (
                        <div key={index} style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: '600' }}>Payment #{index + 1}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(payment.date).toLocaleString()}</div>
                                {payment.reference && <div style={{ fontSize: '11px', color: '#64748b' }}>Ref: {payment.reference}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', ...getPaymentMethodStyle(payment.method) }}>{getPaymentIcon(payment.method)} {getMethodDisplayName(payment.method)}</span>
                                <div style={{ fontWeight: 'bold', marginTop: '8px' }}>{formatCurrency(payment.amount)}</div>
                            </div>
                        </div>
                    )) : <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No payment history available</div>}
                </div>
                <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <button onClick={onClose} style={{ padding: '8px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        </div>
    );
};

const formatCurrency = (amount) => `Rs. ${formatDecimal(amount)}`;

// ==================== CHEQUE MODAL ====================
const ChequeModal = ({ isOpen, onClose, onConfirm, amount }) => {
    const [chequeDetails, setChequeDetails] = useState({ cheq_date: '', cheq_no: '', bank_account_id: null });
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(false);

    // Create refs for each input field
    const dateInputRef = useRef(null);
    const chequeNoInputRef = useRef(null);
    const bankSelectRef = useRef(null);

    // Fetch banks when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchBanks();
        }
    }, [isOpen]);

    const fetchBanks = async () => {
        setLoading(true);
        try {
            const response = await api.get(routes.getBanks);
            if (response.data.success) {
                setBanks(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!chequeDetails.cheq_date || !chequeDetails.cheq_no || !chequeDetails.bank_account_id) {
            alert("Please fill all cheque details and select a bank account");
            return;
        }

        // Get bank name from selected bank
        const selectedBank = banks.find(b => b.id === chequeDetails.bank_account_id);
        const bankName = selectedBank ? selectedBank.bank_name : null;

        // Pass both cheque details AND bank name
        onConfirm(chequeDetails, bankName);
        setChequeDetails({ cheq_date: '', cheq_no: '', bank_account_id: null });
    };

    // Handle Enter key for input fields
    const handleKeyPress = (e, nextFieldRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldRef && nextFieldRef.current) {
                setTimeout(() => {
                    nextFieldRef.current.focus();
                }, 50);
            }
        }
    };

    // Handle Enter key for select element
    const handleSelectKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', width: '380px', maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '24px' }}>💳</span>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Cheque Payment</h3>
                </div>
                <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '12px' }}>Payment Amount</div>
                    <div style={{ fontSize: '22px', fontWeight: '800' }}>Rs. {amount.toFixed(2)}</div>
                </div>

                {/* Cheque Date Field */}
                <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>📅 Cheque Date <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                        ref={dateInputRef}
                        type="date"
                        name="cheq_date"
                        value={chequeDetails.cheq_date}
                        onChange={(e) => setChequeDetails(prev => ({ ...prev, cheq_date: e.target.value }))}
                        onKeyPress={(e) => handleKeyPress(e, chequeNoInputRef)}
                        autoFocus
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px' }}
                    />
                </div>

                {/* Cheque Number Field */}
                <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>🔢 Cheque Number <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                        ref={chequeNoInputRef}
                        type="text"
                        name="cheq_no"
                        value={chequeDetails.cheq_no}
                        onChange={(e) => setChequeDetails(prev => ({ ...prev, cheq_no: e.target.value }))}
                        onKeyPress={(e) => handleKeyPress(e, bankSelectRef)}
                        placeholder="Enter cheque number"
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px' }}
                    />
                </div>

                {/* Bank Account Selector Field */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#334155' }}>Select Bank Account <span style={{ color: '#ef4444' }}>*</span></label>
                    {loading ? (
                        <div style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Loading banks...</div>
                    ) : (
                        <select
                            ref={bankSelectRef}
                            value={chequeDetails.bank_account_id || ''}
                            onChange={(e) => setChequeDetails(prev => ({ ...prev, bank_account_id: e.target.value ? parseInt(e.target.value) : null }))}
                            onKeyDown={handleSelectKeyDown}
                            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', cursor: 'pointer' }}
                        >
                            <option value="">-- Select Bank Account --</option>
                            {banks.map(bank => (
                                <option key={bank.id} value={bank.id}>
                                    {bank.bank_name} - {bank.branch} (Acc: {bank.account_no})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', flex: 1 }}>Cancel</button>
                    <button onClick={handleSubmit} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', flex: 1 }}>Confirm Payment</button>
                </div>
            </div>
        </div>
    );
};
// ==================== BANK TO BANK MODAL ====================
const BankToBankModal = ({ isOpen, onClose, onConfirm, amount, customerCode, customerName }) => {
    const [transferDetails, setTransferDetails] = useState({ bank_account_id: null, reference_no: '', transfer_date: new Date().toISOString().split('T')[0], notes: '' });
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);

    const bankSelectRef = useRef(null);
    const referenceNoRef = useRef(null);
    const transferDateRef = useRef(null);
    const notesRef = useRef(null);

    useEffect(() => {
        if (isOpen) fetchBanks();
    }, [isOpen]);

    const fetchBanks = async () => {
        setLoading(true);
        try {
            const response = await api.get(routes.getBanks);
            if (response.data.success) setBanks(response.data.data);
        } catch (error) { console.error('Error fetching banks:', error); }
        finally { setLoading(false); }
    };

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!transferDetails.bank_account_id) { alert("Please select a bank account"); return; }
        if (!transferDetails.reference_no) { alert("Please enter transaction reference number"); return; }

        // Get bank name from selected bank
        const selectedBank = banks.find(b => b.id === transferDetails.bank_account_id);
        const bankName = selectedBank ? selectedBank.bank_name : null;

        // Pass both transfer details AND bank name
        onConfirm(transferDetails, bankName);
        setTransferDetails({ bank_account_id: null, reference_no: '', transfer_date: new Date().toISOString().split('T')[0], notes: '' });
    };

    const handleKeyPress = (e, nextFieldRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldRef && nextFieldRef.current) {
                setTimeout(() => nextFieldRef.current.focus(), 50);
            }
        }
    };

    const handleSelectKeyDown = (e, nextFieldRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldRef && nextFieldRef.current) {
                setTimeout(() => nextFieldRef.current.focus(), 50);
            } else {
                handleSubmit();
            }
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '500px', maxWidth: '90%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #ec489a, #db2777)', borderRadius: '20px 20px 0 0' }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: '700' }}>🏦 Bank to Bank Transfer</h3>
                </div>
                <div style={{ padding: '24px' }}>
                    <div style={{ background: '#fdf2f8', padding: '16px', borderRadius: '14px', marginBottom: '24px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>💰 Payment Details</div>
                        <div style={{ fontSize: '13px' }}><strong>Amount:</strong> Rs. {amount.toFixed(2)}<br /><strong>Customer:</strong> {customerName || customerCode}</div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>🏦 Select Bank Account <span style={{ color: '#ef4444' }}>*</span></label>
                        <select
                            ref={bankSelectRef}
                            value={transferDetails.bank_account_id || ''}
                            onChange={(e) => setTransferDetails(prev => ({ ...prev, bank_account_id: e.target.value ? parseInt(e.target.value) : null }))}
                            onKeyDown={(e) => handleSelectKeyDown(e, referenceNoRef)}
                            disabled={loading}
                            autoFocus
                            style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }}
                        >
                            <option value="">-- Select Bank Account --</option>
                            {banks.map(bank => (<option key={bank.id} value={bank.id}>{bank.bank_name} - {bank.branch} (Acc: {bank.account_no})</option>))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>🔢 Transaction Reference Number <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            ref={referenceNoRef}
                            type="text"
                            value={transferDetails.reference_no}
                            onChange={(e) => setTransferDetails(prev => ({ ...prev, reference_no: e.target.value }))}
                            onKeyPress={(e) => handleKeyPress(e, transferDateRef)}
                            placeholder="Enter transaction ID"
                            style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>📅 Transfer Date <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            ref={transferDateRef}
                            type="date"
                            value={transferDetails.transfer_date}
                            onChange={(e) => setTransferDetails(prev => ({ ...prev, transfer_date: e.target.value }))}
                            onKeyPress={(e) => handleKeyPress(e, notesRef)}
                            style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>📝 Notes (Optional)</label>
                        <textarea
                            ref={notesRef}
                            value={transferDetails.notes}
                            onChange={(e) => setTransferDetails(prev => ({ ...prev, notes: e.target.value }))}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            rows="3"
                            style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                        <button onClick={onClose} style={{ padding: '10px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Cancel</button>
                        <button onClick={handleSubmit} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #ec489a, #db2777)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Confirm Transfer</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
// ==================== PAYMENT ADJUSTMENT MODAL ====================
const PaymentAdjustmentModal = ({ isOpen, onClose, onConfirm, billNo, customerCode, originalBillTotal }) => {
    const [adjustmentType, setAdjustmentType] = useState('bag_to_box');
    const [bagCount, setBagCount] = useState('');
    const [boxCount, setBoxCount] = useState('');
    const [bagValue, setBagValue] = useState('');
    const [boxValue, setBoxValue] = useState('');
    const [customerCodeField, setCustomerCodeField] = useState('');
    const [customerBillNo, setCustomerBillNo] = useState('');
    const [customerBillValue, setCustomerBillValue] = useState('');
    const [badDebtName, setBadDebtName] = useState('');
    const [badDebtAmount, setBadDebtAmount] = useState('');

    if (!isOpen) return null;

    const calculateBagToBoxAdjustment = () => {
        const amount = ((parseInt(state.bagCount) || 0) * (parseFloat(state.bagValue) || 0)) +
            ((parseInt(state.boxCount) || 0) * (parseFloat(state.boxValue) || 0));
        const maxAmount = state.selectedBill ? getRemainingBillAmount(state.selectedBill) : Infinity;
        if (amount > maxAmount) {
            setTimeout(() => alert(`Adjustment amount cannot exceed maximum allowed amount of Rs. ${formatDecimal(maxAmount)}`), 100);
            return 0;
        }
        return amount;
    };

    const handleConfirm = () => {
        const adjustmentData = { adjustment_type: adjustmentType, original_bill_total: originalBillTotal };

        if (adjustmentType === 'bag_to_box') {
            if (!bagCount || !boxCount || !bagValue || !boxValue) {
                alert('Please fill all bag/box fields');
                return;
            }
            adjustmentData.type = 'bag_to_box';
            adjustmentData.bag_count = parseInt(bagCount);
            adjustmentData.box_count = parseInt(boxCount);
            adjustmentData.bag_value = parseFloat(bagValue);
            adjustmentData.box_value = parseFloat(boxValue);
            adjustmentData.amount = Math.abs(calculateBagToBoxAdjustment());
        }
        else if (adjustmentType === 'bill_to_bill') {
            if (!customerCodeField || !customerBillNo || !customerBillValue) {
                alert('Please fill all bill to bill fields');
                return;
            }
            adjustmentData.type = 'bill_to_bill';
            adjustmentData.customer_code = customerCodeField;
            adjustmentData.customer_bill_no = customerBillNo;
            adjustmentData.customer_bill_value = parseFloat(customerBillValue);
            adjustmentData.amount = parseFloat(customerBillValue);
        }
        else if (adjustmentType === 'bad_debt') {
            if (!badDebtName || !badDebtAmount) {
                alert('Please enter bad debt name and amount');
                return;
            }
            adjustmentData.type = 'bad_debt';
            adjustmentData.bad_debt_name = badDebtName;
            adjustmentData.bad_debt_amount = parseFloat(badDebtAmount);
            adjustmentData.amount = parseFloat(badDebtAmount);
        }

        onConfirm(adjustmentData);
        onClose();
    };

    const handleTypeSelect = (type) => {
        setAdjustmentType(type);
        // Reset form fields when switching types
        setBagCount('');
        setBoxCount('');
        setBagValue('');
        setBoxValue('');
        setCustomerCodeField('');
        setCustomerBillNo('');
        setCustomerBillValue('');
        setBadDebtName('');
        setBadDebtAmount('');
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '750px', maxWidth: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '24px 24px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>🔧 Payment Adjustment</h3>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'white', width: '34px', height: '34px', borderRadius: '50%' }}>×</button>
                </div>
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {/* Three Buttons for Adjustment Types - REPLACES THE DROPDOWN */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => handleTypeSelect('bag_to_box')}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: adjustmentType === 'bag_to_box' ? 'linear-gradient(135deg, #10b981, #059669)' : '#f1f5f9',
                                color: adjustmentType === 'bag_to_box' ? 'white' : '#475569',
                                border: adjustmentType === 'bag_to_box' ? 'none' : '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '13px',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>📦</span> Bag to Box Conversion
                        </button>
                        <button
                            onClick={() => handleTypeSelect('bill_to_bill')}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: adjustmentType === 'bill_to_bill' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#f1f5f9',
                                color: adjustmentType === 'bill_to_bill' ? 'white' : '#475569',
                                border: adjustmentType === 'bill_to_bill' ? 'none' : '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '13px',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>📄</span> Bill to Bill Transfer
                        </button>
                        <button
                            onClick={() => handleTypeSelect('bad_debt')}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: adjustmentType === 'bad_debt' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#f1f5f9',
                                color: adjustmentType === 'bad_debt' ? 'white' : '#475569',
                                border: adjustmentType === 'bad_debt' ? 'none' : '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '13px',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>⚠️</span> Bad Debt Write-off
                        </button>
                    </div>

                    {/* Conditional Form Fields based on selected adjustment type */}
                    {adjustmentType === 'bag_to_box' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>📦 Number of Bags</label><input type="number" value={bagCount} onChange={(e) => setBagCount(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                                <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>💰 Value per Bag (Rs.)</label><input type="number" value={bagValue} onChange={(e) => setBagValue(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>📦 Number of Boxes</label><input type="number" value={boxCount} onChange={(e) => setBoxCount(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                                <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>💰 Value per Box (Rs.)</label><input type="number" value={boxValue} onChange={(e) => setBoxValue(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                            </div>
                            <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600' }}>📊 Adjustment Summary</div>
                                <div style={{ fontSize: '12px' }}>Adjustment Amount: Rs. {Math.abs(calculateBagToBoxAdjustment()).toFixed(2)}</div>
                            </div>
                        </>
                    )}

                    {adjustmentType === 'bill_to_bill' && (
                        <>
                            <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>🏢 Customer Bill Transfer</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>Customer Code</label><input type="text" value={customerCodeField} onChange={(e) => setCustomerCodeField(e.target.value.toUpperCase())} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                                    <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>Customer Bill No</label><input type="text" value={customerBillNo} onChange={(e) => setCustomerBillNo(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                                </div>
                                <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>Bill Amount (Rs.)</label><input type="number" value={customerBillValue} onChange={(e) => setCustomerBillValue(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px' }} /></div>
                            </div>
                            <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600' }}>📊 Transfer Summary</div>
                                <div style={{ fontSize: '12px' }}>Transfer Amount: Rs. {(parseFloat(customerBillValue) || 0).toLocaleString()}</div>
                            </div>
                        </>
                    )}

                    {adjustmentType === 'bad_debt' && (
                        <>
                            <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>Bad Debt Name/Reference</label><input type="text" value={badDebtName} onChange={(e) => setBadDebtName(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px' }} /></div>
                            <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>Bad Debt Amount (Rs.)</label><input type="number" value={badDebtAmount} onChange={(e) => setBadDebtAmount(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px' }} /></div>
                            <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '600' }}>⚠️ Bad Debt Write-off: Rs. {(parseFloat(badDebtAmount) || 0).toLocaleString()}</div>
                            </div>
                        </>
                    )}
                </div>
                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={onClose} style={{ padding: '10px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                    <button onClick={handleConfirm} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #4CAF50, #45a049)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Apply Adjustment</button>
                </div>
            </div>
        </div>
    );
};

// ==================== BUILD RECEIPT HTML ====================
const buildFullReceiptHTML = (salesData, billNo, customerCode, mobile, globalLoanAmount = 0, givenAmount = 0, paymentMethod = 'cash', paymentDetails = null, billSize = '3inch', cashGivenAmount = 0) => {
    const formatNumber = (num) => {
        if (typeof num !== 'number' && typeof num !== 'string') return '0';
        const number = parseFloat(num);
        if (isNaN(number)) return '0';
        if (Number.isInteger(number)) return number.toLocaleString('en-US');
        const parts = number.toFixed(2).split('.');
        const wholePart = parseInt(parts[0]).toLocaleString('en-US');
        return `${wholePart}.${parts[1]}`;
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

    const totalSales = salesData.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0);
    const totalPackCost = salesData.reduce((sum, s) => sum + ((parseFloat(s.CustomerPackCost) || 0) * (parseFloat(s.packs) || 0)), 0);
    const finalGrandTotal = totalSales + totalPackCost;
    const displayGivenAmount = cashGivenAmount > 0 ? cashGivenAmount : givenAmount;
    const remaining = displayGivenAmount > 0 ? Math.abs(displayGivenAmount - finalGrandTotal) : 0;

    const itemsHtml = salesData.map(s => {
        const packs = parseInt(s.packs) || 0;
        const weight = parseFloat(s.weight) || 0;
        const price = parseFloat(s.price_per_kg) || 0;
        const value = (weight * price).toFixed(2);
        return `<tr><td style="padding:5px 0;">${s.item_name || ""}<br>${formatNumber(packs)}</td><td style="text-align:right;">${formatNumber(weight.toFixed(2))}</td><td style="text-align:right;">${formatNumber(price.toFixed(2))}</td><td style="text-align:right;">${s.supplier_code || "ASW"}<br>${formatNumber(value)}</td></tr>`;
    }).join("");

    let paymentMethodDisplay = '';
    if (paymentMethod === 'cheque' && paymentDetails) {
        paymentMethodDisplay = `<div style="font-size:12px; margin-top:8px; text-align:center;">💳 Cheque: ${paymentDetails.bank_name || 'Bank'} | No: ${paymentDetails.cheq_no}</div>`;
    } else if (paymentMethod === 'bank_to_bank' && paymentDetails) {
        paymentMethodDisplay = `<div style="font-size:12px; margin-top:8px; text-align:center;">🏦 Bank Transfer: Ref: ${paymentDetails.reference_no}</div>`;
    } else if (paymentMethod === 'credit') {
        paymentMethodDisplay = `<div style="font-size:12px; margin-top:8px; text-align:center; background:#fef3c7; padding:8px;">💳 CREDIT PAYMENT: Rs. ${(paymentDetails?.amount || 0).toFixed(2)}</div>`;
    } else {
        paymentMethodDisplay = `<div style="font-size:12px; margin-top:8px; text-align:center;">💰 Cash Payment</div>`;
    }

    const displayCode = customerCode ? customerCode.toUpperCase() : 'WALKING';

    return `
        <div style="width:350px; margin:0 auto; padding:10px; font-family: monospace;">
            <div style="text-align:center; font-weight:bold;">
                <div style="font-size:20px;">Manju Colombage Lanka (Pvt) Ltd</div>
                <div style="font-size:14px;">එළවළු,පළතුරු තොග වෙළෙන්දෝ</div>
                <div style="font-size:18px; margin:10px 0;">Bill No: ${billNo}</div>
                <div>Customer: ${displayCode}</div>
                <div>Date: ${date} | Time: ${time}</div>
            </div>
            <hr/>
            <table style="width:100%; border-collapse:collapse;">
                <thead><tr><th>Item</th><th>Kg</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <hr/>
            <div><strong>Total: Rs. ${formatNumber(finalGrandTotal.toFixed(2))}</strong></div>
            <div>Paid: Rs. ${formatNumber(displayGivenAmount.toFixed(2))}</div>
            <div>Balance: Rs. ${formatNumber(remaining.toFixed(2))}</div>
            ${paymentMethodDisplay}
            <hr/>
            <div style="text-align:center; font-size:12px;">Thank you! Come again.</div>
        </div>
    `;
};

// ==================== STYLES ====================
const styles = {
    app: { width: '100vw', minHeight: '100vh', background: '#0dea77', margin: 0, padding: 0, fontFamily: "'Inter', sans-serif" },
    container: { width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '24px 32px' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '28px' },
    statBox: { background: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
    statLabel: { fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' },
    statNumber: { fontSize: '32px', fontWeight: '700', color: '#0f172a' },
    statSub: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
    searchInput: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', background: 'white' },
    threeColumns: { display: 'grid', gridTemplateColumns: '0.7fr 2fr 0.7fr', gap: '24px', alignItems: 'start' },
    panel: { background: '#11ba2d', borderRadius: '20px', border: '4px solid #000000', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 320px)', minHeight: '500px' },
    panelHeader: { padding: '16px 20px', background: '#ffffff', borderBottom: '1px solid #eef2ff' },
    panelTitle: { fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' },
    panelContent: { flex: 1, overflowY: 'auto', padding: '16px' },
    billItem: { padding: '14px', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer', background: '#ffffff', border: '1px solid #f1f5f9' },
    billSelected: { background: '#eff6ff', borderColor: '#074ec1' },
    billApplied: { background: '#f0fdf4', borderColor: '#dcfce7' },
    billRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    billNo: { fontWeight: '700', fontSize: '15px', color: '#0f172a' },
    billCustomer: { fontSize: '12px', color: '#000000', fontWeight: 'bold', marginTop: '2px' },
    billTotal: { fontWeight: '700', fontSize: '15px', color: '#0f172a' },
    billGiven: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
    emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' },
    oldBillsBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', padding: '16px', background: 'white', borderRadius: '16px', flexWrap: 'wrap', gap: '12px' },
    datePickerContainer: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px' },
    dateInput: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' },
    viewTypeIndicator: { padding: '6px 12px', background: '#fef3c7', borderRadius: '20px', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }
};

const LoadingSkeleton = () => (
    <div style={styles.app}><div style={styles.container}><div style={{ height: '40px', background: '#e2e8f0', borderRadius: '12px', width: '200px', marginBottom: '24px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '24px' }}>{[1, 2, 3].map(i => <div key={i} style={{ background: 'white', borderRadius: '20px', height: '500px' }}></div>)}</div>
    </div></div>
);

const EmptyStateComponent = ({ message }) => (<div style={styles.emptyState}><div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div><p>{message}</p></div>);

// ==================== DELETE CONFIRMATION MODAL ====================
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, billNo, customerCode }) => {
    const [loading, setLoading] = useState(false);
    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20001 }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '450px', maxWidth: '90%', padding: '24px' }} onClick={e => e.stopPropagation()}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '48px' }}>⚠️</span>
                    <h3 style={{ margin: '10px 0 5px' }}>Delete Payment Record</h3>
                    <p>Are you sure you want to delete all payment records for Bill #{billNo}?</p>
                </div>
                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px' }}>
                    <strong>Warning:</strong> This will reverse all payments made and cannot be undone!
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onConfirm(billNo)} disabled={loading} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>{loading ? 'Deleting...' : 'Yes, Delete'}</button>
                </div>
            </div>
        </div>
    );
};

// ==================== MAIN COMPONENT ====================
export default function PrintedBills() {
    const navigate = useNavigate();
    const basePath = window.location.hostname === 'goviraju.lk' ? '/sms_new_frontend_50500' : '';

    // Add these with your other useState declarations
    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshTimeoutRef = useRef(null);
    const isMountedRef = useRef(true);
    const modalOpenRef = useRef(false);
    //use efects to enter key navigation
    const bagCountRef = useRef(null);
    const bagValueRef = useRef(null);
    const boxCountRef = useRef(null);
    const boxValueRef = useRef(null);
    const customerCodeRef = useRef(null);
    const customerBillNoRef = useRef(null);
    const customerBillValueRef = useRef(null);
    const badDebtNameRef = useRef(null);
    const badDebtAmountRef = useRef(null);

    // Replace your existing useEffect with this one (around line 1440)
    useEffect(() => {
        isMountedRef.current = true;

        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));

        // Initial load with loading indicator
        const initialLoad = async () => {
            setState(prev => ({ ...prev, isLoading: true }));
            await fetchSalesData();
            setState(prev => ({ ...prev, isLoading: false }));

            // After initial data load, fetch supplier loan data
            // This will be done inside fetchSalesData or after it completes
            // You can also add a call here:
            // await fetchAdjustedSupplierLoan(stats.totalFunds);
        };
        initialLoad();

        // Set up interval for silent refresh every 3 seconds
        const intervalId = setInterval(() => {
            // Only refresh if:
            // 1. Not already refreshing
            // 2. Component is mounted
            // 3. No modal is open
            if (!isRefreshingRef.current && isMountedRef.current && !modalOpenRef.current) {
                silentRefresh();
            }
        }, 3000); // 3 seconds

        // Cleanup on unmount
        return () => {
            isMountedRef.current = false;
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
            clearInterval(intervalId);
        };
    }, []); // Empty dependency array - runs once on mount
    const getTotalReceived = (bill) => {
        if (!bill) return 0;

        let total = 0;
        const history = bill.paymentHistory || bill.payment_history;
        if (history) {
            let payments = typeof history === 'string' ? JSON.parse(history) : history;
            if (Array.isArray(payments)) {
                payments.forEach(p => {
                    // Exclude Credit payments from total received (they're debt, not actual received cash)
                    if (p.method !== 'Credit') {
                        total += parseFloat(p.amount) || 0;
                    }
                });
            }
        }
        return total;
    };
    const getRemainingBillAmount = (bill) => {
        if (!bill) return 0;

        // Check if this is a completed bill (in applied section)
        const isAppliedSection = bill.givenAmountApplied === 'Y';

        if (isAppliedSection) {
            // COMPLETED SECTION: Maximum allowed is the unsettled credit amount
            return bill.remainingCredit || 0;
        } else {
            // PENDING SECTION: Maximum allowed is bill total - all payments (including credit)
            let totalAllPayments = 0;
            const history = bill.paymentHistory || bill.payment_history;
            if (history) {
                let payments = typeof history === 'string' ? JSON.parse(history) : history;
                if (Array.isArray(payments)) {
                    payments.forEach(p => {
                        totalAllPayments += parseFloat(p.amount) || 0;
                    });
                }
            }
            return Math.max(0, bill.totalAmount - totalAllPayments);
        }
    };
    // Handle Enter key navigation for adjustment fields
    const handleAdjustmentKeyPress = (e, nextFieldRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldRef && nextFieldRef.current) {
                setTimeout(() => {
                    nextFieldRef.current.focus();
                }, 50);
            }
        }
    };

    // Handle Enter key for the last field to submit
    const handleLastFieldKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdjustmentPayment();
        }
    };
    const getAdjustmentTotals = (history) => {
        let totals = { bag_to_box: 0, bill_to_bill: 0, bad_debt: 0 };
        if (!history) return totals;
        let payments = typeof history === 'string' ? JSON.parse(history) : (history || []);
        payments.forEach(p => { if (totals[p.method] !== undefined) totals[p.method] += parseFloat(p.amount) || 0; });
        return totals;
    };

    // Get the remaining amount to display based on bill status
    const getDisplayRemaining = (bill, isAppliedSection) => {
        if (!bill) return 0;

        if (isAppliedSection) {
            // COMPLETED SECTION: Show only the unsettled credit amount
            // Use the remainingCredit from the bill (which should be updated from debtor table)
            return bill.remainingCredit || 0;
        } else {
            // PENDING SECTION: Show total remaining (bill total - ALL payments including credit)
            let totalAllPayments = 0;
            const history = bill.paymentHistory || bill.payment_history;
            if (history) {
                let payments = typeof history === 'string' ? JSON.parse(history) : history;
                if (Array.isArray(payments)) {
                    payments.forEach(p => {
                        totalAllPayments += parseFloat(p.amount) || 0;
                    });
                }
            }
            return Math.max(0, bill.totalAmount - totalAllPayments);
        }
    };

    // Report Modal States
    const [modals, setModals] = useState({
        itemReport: false, weightReport: false, grnSaleReport: false, salesAdjustmentReport: false,
        grnSalesOverview: false, grnSalesOverview2: false, salesReport: false, grnReport: false, dayProcess: false
    });

    const toggleModal = (name) => setModals(prev => ({ ...prev, [name]: !prev[name] }));

    // Old Bills States
    // Old Bills States - Initialize from localStorage immediately
    const [viewOldBills, setViewOldBills] = useState(() => {
        const saved = localStorage.getItem('printedBills_viewOldBills');
        return saved === 'true';
    });
    const [startDate, setStartDate] = useState(() => {
        return localStorage.getItem('printedBills_startDate') || '';
    });
    const [endDate, setEndDate] = useState(() => {
        return localStorage.getItem('printedBills_endDate') || '';
    });
    const [archivedData, setArchivedData] = useState({ pendingBills: [], appliedBills: [], isLoading: false });
    const [dataSource, setDataSource] = useState(() => {
        return localStorage.getItem('printedBills_dataSource') || 'sales';
    });

    const [state, setState] = useState({
        pendingBills: [], appliedBills: [], customers: [], pendingSearchQuery: "", appliedSearchQuery: "",
        selectedBill: null, isLoading: true, isPrinting: false, givenAmountInput: "", isUpdatingCompletedBill: false,
        showChequeModal: false, pendingChequeAmount: 0, showAdjustmentModal: false, showBankToBankModal: false,
        pendingBankToBankAmount: 0, showPaymentHistoryModal: false, currentPayments: [], paymentHistoryTotalPaid: 0,
        paymentHistoryTotalBill: 0, paymentHistoryRemaining: 0, customerType: null, showDebtorForm: false,
        pendingDebtorBill: null, showDeleteModal: false, deleteBillNo: null, deleteCustomerCode: null, adjustmentType: 'bag_to_box', // Track selected adjustment type
        bagCount: '', boxCount: '', bagValue: '', boxValue: '',
        customerCodeField: '', customerBillNo: '', customerBillValue: '',
        badDebtName: '', badDebtAmount: ''
    });
    // Add these refs to track current values for silent refresh
    const viewOldBillsRef = useRef(viewOldBills);
    const startDateRef = useRef(startDate);
    const endDateRef = useRef(endDate);
    const [showSupplierLoanModal, setShowSupplierLoanModal] = useState(false);

    // Update refs when state changes
    useEffect(() => {
        viewOldBillsRef.current = viewOldBills;
    }, [viewOldBills]);

    useEffect(() => {
        startDateRef.current = startDate;
    }, [startDate]);

    useEffect(() => {
        endDateRef.current = endDate;
    }, [endDate]);
    const [selectedBillDebtor, setSelectedBillDebtor] = useState(null);
    const [user, setUser] = useState(null);
    const [isChangingFilter, setIsChangingFilter] = useState(false);
    const filterChangeTimeoutRef = useRef(null);
    const lastSelectedCodeRef = useRef('all');
    const [uniqueCodes, setUniqueCodes] = useState([]);
    const [selectedUniqueCode, setSelectedUniqueCode] = useState(() => {
        return localStorage.getItem('printedBills_selectedUniqueCode') || 'all';
    });
    const [isLoadingUniqueCodes, setIsLoadingUniqueCodes] = useState(false);
    const selectedUniqueCodeRef = useRef(selectedUniqueCode);
    const isRefreshingRef = useRef(false);

    useEffect(() => {
        selectedUniqueCodeRef.current = selectedUniqueCode;
    }, [selectedUniqueCode]);

    useEffect(() => {
        isRefreshingRef.current = isRefreshing;
    }, [isRefreshing]);

    //cashier balance route
    // ==================== RECORD CASHIER BALANCE ====================
 // Find this function in your code and update it to pass the selected cashier name
const recordCashierTransaction = async (paymentData) => {
    try {
        console.log('📝 Recording cashier transaction:', paymentData);

        // Get the currently selected cashier from the dropdown
        const selectedCashier = selectedUniqueCode === 'all' ? null : selectedUniqueCode;

        const response = await api.post('/cashier-balance/record-payment', {
            payment_amount: paymentData.paymentAmount,
            payment_method: paymentData.paymentMethod,
            bill_no: paymentData.billNo,
            customer_code: paymentData.customerCode,
            bank_name: paymentData.bankName || null,
            cheque_number: paymentData.chequeNumber || null,
            transfer_reference: paymentData.transferReference || null,
            cashier_name: selectedCashier  // ← Pass the selected dropdown value
        });

        if (response.data.success) {
            console.log('✅ Cashier balance updated:', response.data.data);
            if (response.data.data.bank_balance_formatted) {
                console.log('   🏦 Bank Balances:', response.data.data.bank_balance_formatted);
            }
            console.log('   💰 Cash Balance: Rs.', response.data.data.cash_balance);
            console.log('   🏦 Bank Balance:', response.data.data.bank_balance);
            return response.data.data;
        }
    } catch (error) {
        console.error('❌ Failed to record cashier transaction:', error);
        if (error.response) {
            console.error('   Server response:', error.response.data);
        }
        return null;
    }
};
    //cashier categorization
    // Add this function to fetch unique codes
    const fetchUniqueCodes = useCallback(async () => {
        setIsLoadingUniqueCodes(true);
        try {
            const response = await api.get('/sales/unique-codes');
            if (response.data.success) {
                setUniqueCodes(response.data.unique_codes);
            }
        } catch (error) {
            console.error('Error fetching unique codes:', error);
        } finally {
            setIsLoadingUniqueCodes(false);
        }
    }, []);

    // Fetch unique codes on component mount
    useEffect(() => {
        fetchUniqueCodes();
    }, [fetchUniqueCodes]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
        fetchSalesData();
        const interval = setInterval(fetchSalesData, 30000);
        return () => clearInterval(interval);
    }, []);
    const handleAdjustmentTypeSelect = (type) => {
        setState(prev => ({
            ...prev,
            adjustmentType: type,
            // Reset all adjustment fields
            bagCount: '', boxCount: '', bagValue: '', boxValue: '',
            customerCodeField: '', customerBillNo: '', customerBillValue: '',
            badDebtName: '', badDebtAmount: ''
        }));
    };

    const calculateBagToBoxAdjustment = () => {
        return ((parseInt(state.bagCount) || 0) * (parseFloat(state.bagValue) || 0)) +
            ((parseInt(state.boxCount) || 0) * (parseFloat(state.boxValue) || 0));
    };
    //ne fund shoing
    // Add these with your other state declarations
    const [remainingBalances, setRemainingBalances] = useState({
        cash_remaining: 0,
        bank_breakdown: [],
        total_bank_remaining: 0,
        total_remaining: 0
    });
    const [isLoadingRemaining, setIsLoadingRemaining] = useState(false);
    const [showBankBreakdownModal, setShowBankBreakdownModal] = useState(false);
    // Fetch remaining balances from cashier_balances table
const fetchRemainingBalances = useCallback(async (cashierName) => {
    setIsLoadingRemaining(true);
    try {
        const params = {};

        // Use explicit caller-provided cashierName when available,
        // otherwise fall back to the ref (keeps value correct during immediate calls)
        const cashier = (typeof cashierName !== 'undefined' && cashierName !== null)
            ? cashierName
            : (selectedUniqueCodeRef.current || 'all');

        if (cashier && cashier !== 'all') {
            params.cashier_name = cashier;
        }

        console.log('🔍 Fetching balances for cashier (param/ref):', { cashier, params });

        const response = await api.get('/cashier-balance/remaining-balances', { params });

        console.log('📊 Response received:', response.data);

        if (response.data.success) {
            setRemainingBalances(response.data.data);
            console.log('✅ Balances updated:', response.data.data);
        }
    } catch (error) {
        console.error('❌ Error fetching remaining balances:', error);
    } finally {
        setIsLoadingRemaining(false);
    }
}, []); // stable - uses ref when needed
    // Fetch remaining balances on component mount
    
useEffect(() => {
    fetchRemainingBalances();

    // Refresh remaining balances every 30 seconds
    const remainingBalanceInterval = setInterval(() => {
        if (!modalOpenRef.current) {
            fetchRemainingBalances();
        }
    }, 30000);

    return () => clearInterval(remainingBalanceInterval);
}, [fetchRemainingBalances]); // Add fetchRemainingBalances as dependency


    const handleAdjustmentPayment = async () => {
        let paymentAmount = parseFloat(state.givenAmountInput);
        if (!paymentAmount || paymentAmount <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        if (!state.selectedBill) {
            alert("Please select a bill first");
            return;
        }

        const maxAllowed = getRemainingBillAmount(state.selectedBill);

        if (paymentAmount > maxAllowed) {
            alert(`Amount exceeds maximum allowed!\n\nMaximum: Rs. ${formatDecimal(maxAllowed)}\nEntered: Rs. ${formatDecimal(paymentAmount)}`);
            return;
        }

        let adjustmentDetails = null;

        if (state.adjustmentType === 'bag_to_box') {
            if (!state.bagCount || !state.boxCount || !state.bagValue || !state.boxValue) {
                alert('Please fill all bag/box fields');
                return;
            }
            adjustmentDetails = {
                type: 'bag_to_box',
                amount: Math.abs(calculateBagToBoxAdjustment()),
                bag_count: parseInt(state.bagCount),
                box_count: parseInt(state.boxCount),
                bag_value: parseFloat(state.bagValue),
                box_value: parseFloat(state.boxValue)
            };
        } else if (state.adjustmentType === 'bill_to_bill') {
            if (!state.customerCodeField || !state.customerBillNo || !state.customerBillValue) {
                alert('Please fill all bill to bill fields');
                return;
            }
            adjustmentDetails = {
                type: 'bill_to_bill',
                amount: parseFloat(state.customerBillValue),
                customer_code: state.customerCodeField,
                customer_bill_no: state.customerBillNo,
                customer_bill_value: parseFloat(state.customerBillValue)
            };
        } else if (state.adjustmentType === 'bad_debt') {
            if (!state.badDebtName || !state.badDebtAmount) {
                alert('Please enter bad debt name and amount');
                return;
            }
            adjustmentDetails = {
                type: 'bad_debt',
                amount: parseFloat(state.badDebtAmount),
                bad_debt_name: state.badDebtName,
                bad_debt_amount: parseFloat(state.badDebtAmount)
            };
        }

        await processPayment(paymentAmount, false, null, false, null, true, adjustmentDetails);

        // Clear all adjustment fields after submission
        setState(prev => ({
            ...prev,
            givenAmountInput: "",
            bagCount: '',
            boxCount: '',
            bagValue: '',
            boxValue: '',
            customerCodeField: '',
            customerBillNo: '',
            customerBillValue: '',
            badDebtName: '',
            badDebtAmount: '',
            adjustmentType: 'bag_to_box',
            customerType: null
        }));
    };
    const updateCreditAmountsFromDebtorTable = useCallback(async (bills, source = 'unknown', isAppliedSection = false) => {
        if (!bills || bills.length === 0) return bills || [];

        const updatedBills = [...bills];

        for (let i = 0; i < updatedBills.length; i++) {
            const bill = updatedBills[i];
            if (!bill || !bill.billNo) continue;

            const previousCredit = bill.remainingCredit;

            if (isAppliedSection) {
                // For COMPLETED section: Get actual remaining credit from debtor table
                try {
                    const response = await api.get(`/debtors/${bill.billNo}`);
                    if (response.data.success && response.data.data) {
                        const debtor = response.data.data;
                        updatedBills[i].remainingCredit = debtor.remaining_amount || 0;
                        console.log(`[COMPLETED] Bill ${bill.billNo}: Unsettled credit = ${debtor.remaining_amount}`);
                    } else {
                        updatedBills[i].remainingCredit = 0;
                        console.log(`[COMPLETED] Bill ${bill.billNo}: No debtor record, credit = 0`);
                    }
                } catch (e) {
                    updatedBills[i].remainingCredit = 0;
                    console.log(`[COMPLETED] Bill ${bill.billNo}: Error fetching debtor: ${e.message}`);
                }
            } else {
                // For PENDING section: Always show the FULL credit amount, never reduced
                updatedBills[i].remainingCredit = bill.creditAmount || 0;
                console.log(`[PENDING] Bill ${bill.billNo}: Full credit amount = ${bill.creditAmount}`);
            }

            debugCreditChanges(bill.billNo, previousCredit, updatedBills[i].remainingCredit, `${source} - ${isAppliedSection ? 'completed' : 'pending'}`);
        }

        return updatedBills;
    }, []);
    // Bank Breakdown Modal Component
    const BankBreakdownModal = ({ isOpen, onClose, bankBreakdown }) => {
        if (!isOpen) return null;

        const formatCurrency = (amount) => {
            return `Rs. ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 20007
            }} onClick={onClose}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    width: '400px',
                    maxWidth: '90%',
                    padding: '24px',
                    maxHeight: '80vh',
                    overflowY: 'auto'
                }} onClick={(e) => e.stopPropagation()}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '28px' }}>🏦</span>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Bank Balance Breakdown</h3>
                        </div>
                        <button onClick={onClose} style={{
                            background: '#f1f5f9',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%'
                        }}>×</button>
                    </div>

                    {bankBreakdown.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            <span style={{ fontSize: '48px' }}>🏦</span>
                            <p style={{ marginTop: '12px' }}>No bank balances available</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {bankBreakdown.map((bank, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '14px 16px',
                                    background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
                                    borderRadius: '12px',
                                    borderLeft: '4px solid #3b82f6'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '24px' }}>🏦</span>
                                        <span style={{ fontWeight: '600', color: '#1e40af' }}>{bank.bank_name}</span>
                                    </div>
                                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>
                                        {formatCurrency(bank.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <button onClick={onClose} style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px'
                    }}>
                        Close
                    </button>
                </div>
            </div>
        );
    };
    // Supplier Loan Details Modal
    const SupplierLoanDetailsModal = ({ isOpen, onClose, stats, adjustedLoanData }) => {
        if (!isOpen) return null;

        const netAvailable = Math.max(0, stats.totalFunds - (adjustedLoanData?.total_loan_amount || 0));

        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20001 }} onClick={onClose}>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '450px', maxWidth: '90%', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '28px' }}>🏭</span>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Supplier Loan Details</h3>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Gross Funds */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px' }}>
                            <span style={{ fontWeight: '600', color: '#475569' }}>💰 TOTAL FUNDS (Gross)</span>
                            <span style={{ fontSize: '18px', fontWeight: '700', color: '#fbbf24', fontFamily: 'monospace' }}>
                                Rs. {formatDecimal(stats.totalFunds)}
                            </span>
                        </div>

                        {adjustedLoanData && (
                            <>
                                {/* Supplier Loan */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fef2f2', borderRadius: '12px' }}>
                                    <span style={{ fontWeight: '600', color: '#dc2626' }}>🏭 SUPPLIER LOAN</span>
                                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626', fontFamily: 'monospace' }}>
                                        - Rs. {formatDecimal(adjustedLoanData.total_loan_amount || 0)}
                                    </span>
                                </div>

                                {/* Loan Payments Made */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#f0fdf4', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '13px', color: '#166534' }}>✓ Loan Payments Made</span>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#166534', fontFamily: 'monospace' }}>
                                        Rs. {formatDecimal(adjustedLoanData.total_payments_excluding_credit || 0)}
                                    </span>
                                </div>
                                {/* Subtraction Line */}
                                <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)', margin: '8px 0' }}></div>

                                {/* Net Available */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '12px', color: 'white' }}>
                                    <span style={{ fontWeight: '700', fontSize: '14px' }}>📊 NET AVAILABLE</span>
                                    <span style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'monospace' }}>
                                        Rs. {formatDecimal(netAvailable)}
                                    </span>
                                </div>

                                {/* Status Message */}
                                {(adjustedLoanData.adjusted_amount || 0) <= 0 && (
                                    <div style={{ fontSize: '11px', color: '#10b981', textAlign: 'center', padding: '8px', background: '#d1fae5', borderRadius: '8px' }}>
                                        ✓ Supplier loan fully covered by funds
                                    </div>
                                )}
                                {(adjustedLoanData.adjusted_amount || 0) > 0 && (
                                    <div style={{ fontSize: '11px', color: '#dc2626', textAlign: 'center', padding: '8px', background: '#fee2e2', borderRadius: '8px' }}>
                                        ⚠️ Remaining loan amount: Rs. {formatDecimal(adjustedLoanData.adjusted_amount)}
                                    </div>
                                )}
                            </>
                        )}

                        {!adjustedLoanData && stats.totalFunds > 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                <span>⏳</span> Loading supplier loan data...
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        style={{ width: '100%', marginTop: '20px', padding: '12px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    };
    const fetchSalesData = async (uniqueCode = selectedUniqueCode) => {
        // Don't fetch if we're currently changing the filter (to prevent race conditions)
        if (isChangingFilter) {
            console.log('Skipping fetchSalesData - filter is changing');
            return;
        }

        try {
            let url = routes.getAllSales;
            let params = {};

            // If a specific cashier is selected (not 'all'), use the filtered endpoint
            if (uniqueCode && uniqueCode !== 'all') {
                url = '/sales/all-with-filter';
                params = { unique_code: uniqueCode };
            }

            console.log('Fetching sales with filter:', { url, uniqueCode, params });

            const [salesRes, customersRes] = await Promise.all([
                api.get(url, { params }),
                api.get(routes.customers)
            ]);

            const salesData = salesRes.data.sales || salesRes.data || [];
            const customersData = customersRes.data.data || customersRes.data.customers || customersRes.data || [];
            const { pendingBills, appliedBills } = processBillData(salesData);

            const updatedPending = await updateCreditAmountsFromDebtorTable(pendingBills, 'fetchSalesData-pending', false);
            const updatedApplied = await updateCreditAmountsFromDebtorTable(appliedBills, 'fetchSalesData-applied', true);

            setState(prev => ({
                ...prev,
                pendingBills: updatedPending,
                appliedBills: updatedApplied,
                customers: customersData,
                isLoading: false
            }));

            if (state.selectedBill) {
                const isApplied = state.selectedBill.givenAmountApplied === 'Y';
                const updatedBillsList = isApplied ? updatedApplied : updatedPending;
                const updatedBill = updatedBillsList.find(b => b.billNo === state.selectedBill.billNo);
                if (updatedBill) {
                    setState(prev => ({
                        ...prev,
                        selectedBill: {
                            ...prev.selectedBill,
                            remainingCredit: updatedBill.remainingCredit,
                            creditAmount: updatedBill.creditAmount
                        }
                    }));
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setState(prev => ({ ...prev, isLoading: false }));
        }
    };

    const refreshCustomersList = useCallback(async () => {
        try {
            const response = await api.get(routes.customers);
            const customersData = response.data.data || response.data.customers || response.data || [];
            setState(prev => ({ ...prev, customers: customersData }));
        } catch (error) {
            console.error('Error refreshing customers:', error);
        }
    }, []);
  const fetchArchivedSales = async (isFromStorage = false, uniqueCode = selectedUniqueCode) => {
    // Don't fetch if we're currently changing the filter
    if (isChangingFilter) {
        console.log('Skipping fetchArchivedSales - filter is changing');
        return;
    }

    if (!startDate || !endDate) {
        return;
    }

    if (viewOldBills) {
        await refreshBeforeLoadingOldBills();
    }

    setArchivedData(prev => ({ ...prev, isLoading: true }));
    try {
        // ALWAYS use the same URL - routes.getArchivedSales is "/sales/archived"
        const url = routes.getArchivedSales;
        const params = {
            start_date: startDate,
            end_date: endDate
        };

        // Add unique_code as a parameter if a specific cashier is selected
        if (uniqueCode && uniqueCode !== 'all') {
            params.unique_code = uniqueCode;
        }

        console.log('Fetching archived sales with filter:', { url, params, uniqueCode });

        const response = await api.get(url, { params });

        if (response.data.success) {
            const { pendingBills, appliedBills } = processBillData(response.data.sales || []);
            const updatedPending = await updateCreditAmountsFromDebtorTable(pendingBills, 'fetchArchivedSales-pending', false);
            const updatedApplied = await updateCreditAmountsFromDebtorTable(appliedBills, 'fetchArchivedSales-applied', true);

            setArchivedData({ pendingBills: updatedPending, appliedBills: updatedApplied, isLoading: false });
            setDataSource('sales_history');

            localStorage.setItem('printedBills_startDate', startDate);
            localStorage.setItem('printedBills_endDate', endDate);
            localStorage.setItem('printedBills_dataSource', 'sales_history');
            localStorage.setItem('printedBills_viewOldBills', 'true');
            localStorage.setItem('printedBills_selectedUniqueCode', selectedUniqueCode);

            if (!isFromStorage) {
                alert(`Loaded ${updatedPending.length + updatedApplied.length} bills from ${startDate} to ${endDate}`);
            }
        } else {
            if (!isFromStorage) alert('Failed to fetch archived data');
            setArchivedData(prev => ({ ...prev, isLoading: false }));
        }
    } catch (error) {
        console.error('Error fetching archived sales:', error);
        if (!isFromStorage) alert('Failed to fetch archived data');
        setArchivedData(prev => ({ ...prev, isLoading: false }));
    }
};
const handleUniqueCodeChange = useCallback((newValue) => {
    // Clear any pending timeout
    if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
    }

    // Set flag to prevent auto-refresh during filter change
    setIsChangingFilter(true);
    
    // Cancel any ongoing refresh
    if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
    }

    // Store the new value
    lastSelectedCodeRef.current = newValue;
    selectedUniqueCodeRef.current = newValue;
    setSelectedUniqueCode(newValue);

    // Save to localStorage
    localStorage.setItem('printedBills_selectedUniqueCode', newValue);

    // Clear existing data immediately to prevent showing wrong data
    if (!viewOldBills) {
        setState(prev => ({ 
            ...prev, 
            pendingBills: [], 
            appliedBills: [], 
            isLoading: true 
        }));
    } else {
        setArchivedData(prev => ({ ...prev, pendingBills: [], appliedBills: [], isLoading: true }));
    }

    // Manually fetch data with the selected cashier value
    const fetchData = async () => {
        if (!viewOldBills) {
            await fetchSalesData(newValue);
        } else if (startDate && endDate) {
            await fetchArchivedSales(true, newValue);
        }
        
        // Refresh remaining balances for the selected cashier
        await fetchRemainingBalances(newValue);
        
        // Reset the changing flag after data is loaded
        setTimeout(() => {
            setIsChangingFilter(false);
        }, 500);
    };
    
    fetchData();
}, [viewOldBills, startDate, endDate, fetchSalesData, fetchArchivedSales, fetchRemainingBalances]);
// Update the interval useEffect (around line 1440)
useEffect(() => {
    isMountedRef.current = true;

    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    // Initial load with loading indicator
    const initialLoad = async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        await fetchSalesData();
        setState(prev => ({ ...prev, isLoading: false }));
    };
    initialLoad();

    // Set up interval for silent refresh every 5 seconds (increased from 3)
    const intervalId = setInterval(() => {
        // Only refresh if not changing filter and no modal open
        if (!isRefreshingRef.current && isMountedRef.current && !modalOpenRef.current && !isChangingFilter) {
            silentRefresh();
        } else {
            console.log('⏸️ Interval skip - conditions not met');
        }
    }, 5000); // Increased to 5 seconds for better stability

    // Cleanup on unmount
    return () => {
        isMountedRef.current = false;
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }
        clearInterval(intervalId);
    };
}, []);
    // Add this function near your other functions (around line 1400)
    const refreshBeforeLoadingOldBills = async () => {
        try {
            console.log('🔄 Refreshing current data before loading old bills...');

            const [salesRes, customersRes] = await Promise.all([
                api.get(routes.getAllSales),
                api.get(routes.customers)
            ]);

            const salesData = salesRes.data.sales || salesRes.data || [];
            const customersData = customersRes.data.data || customersRes.data.customers || customersRes.data || [];
            const { pendingBills, appliedBills } = processBillData(salesData);

            // For pending bills: false (show full credit)
            // For applied bills (completed): true (show actual remaining credit)
            const updatedPending = await updateCreditAmountsFromDebtorTable(pendingBills, 'refreshBeforeLoadingOldBills-pending', false);
            const updatedApplied = await updateCreditAmountsFromDebtorTable(appliedBills, 'refreshBeforeLoadingOldBills-applied', true);

            setState(prev => ({
                ...prev,
                pendingBills: updatedPending,
                appliedBills: updatedApplied,
                customers: customersData,
                isLoading: false
            }));

            console.log('✅ Current data refreshed successfully');
            return true;
        } catch (error) {
            console.error('❌ Error refreshing current data:', error);
            return false;
        }
    };
    const resetToCurrentSales = () => {
        setViewOldBills(false);
        setStartDate('');
        setEndDate('');
        setDataSource('sales');
        setArchivedData({ pendingBills: [], appliedBills: [], isLoading: false });
        // Reset customer type to null when going back to current bills
        setState(prev => ({ ...prev, customerType: null, selectedBill: null }));  // ← Also clear selectedBill
        setSelectedBillDebtor(null);
        fetchSalesData();
        // Clear saved filter states from localStorage
        localStorage.removeItem('printedBills_viewOldBills');
        localStorage.removeItem('printedBills_startDate');
        localStorage.removeItem('printedBills_endDate');
        localStorage.removeItem('printedBills_dataSource');
    };
    // Auto-populate givenAmountInput based on adjustment type and values
    useEffect(() => {
        if (!state.selectedBill) return;
        let calculatedAmount = 0;
        const maxAmount = getRemainingBillAmount(state.selectedBill);

        if (state.adjustmentType === 'bag_to_box') {
            const bagTotal = (parseInt(state.bagCount) || 0) * (parseFloat(state.bagValue) || 0);
            const boxTotal = (parseInt(state.boxCount) || 0) * (parseFloat(state.boxValue) || 0);
            calculatedAmount = bagTotal + boxTotal;
            if ((state.bagCount || state.boxCount || state.bagValue || state.boxValue) && calculatedAmount <= maxAmount) {
                setState(prev => ({ ...prev, givenAmountInput: calculatedAmount.toString() }));
            } else if (calculatedAmount > maxAmount && (state.bagCount || state.boxCount)) {
                alert(`Adjustment amount exceeds limit! Maximum: Rs. ${formatDecimal(maxAmount)}`);
                setState(prev => ({ ...prev, bagCount: '', boxCount: '', bagValue: '', boxValue: '', givenAmountInput: "" }));
            }
        }
        else if (state.adjustmentType === 'bill_to_bill') {
            calculatedAmount = parseFloat(state.customerBillValue) || 0;
            if (state.customerBillValue && calculatedAmount <= maxAmount) {
                setState(prev => ({ ...prev, givenAmountInput: calculatedAmount.toString() }));
            } else if (calculatedAmount > maxAmount && state.customerBillValue) {
                alert(`Bill amount exceeds limit! Maximum: Rs. ${formatDecimal(maxAmount)}`);
                setState(prev => ({ ...prev, customerBillValue: "", givenAmountInput: "" }));
            }
        }
        else if (state.adjustmentType === 'bad_debt') {
            calculatedAmount = parseFloat(state.badDebtAmount) || 0;
            if (state.badDebtAmount && calculatedAmount <= maxAmount) {
                setState(prev => ({ ...prev, givenAmountInput: calculatedAmount.toString() }));
            } else if (calculatedAmount > maxAmount && state.badDebtAmount) {
                setState(prev => ({ ...prev, badDebtAmount: "", givenAmountInput: "" }));
            }
        }
    }, [state.adjustmentType, state.bagCount, state.bagValue, state.boxCount, state.boxValue, state.customerBillValue, state.badDebtAmount, selectedBillDebtor]);

    const handleBillClick = async (bill) => {
        // If clicking the same bill, clear it
        if (state.selectedBill?.billNo === bill.billNo) {
            setState(prev => ({
                ...prev,
                selectedBill: null,
                givenAmountInput: "",
                isUpdatingCompletedBill: false,
                customerType: null
            }));
            setSelectedBillDebtor(null);
            return;
        }

        // IMPORTANT: Clear debtor data IMMEDIATELY when selecting a new bill
        setSelectedBillDebtor(null);

        // Reset customer type and selected bill details cleanly
        setState(prev => ({
            ...prev,
            selectedBill: bill,
            givenAmountInput: "",
            isUpdatingCompletedBill: bill.givenAmountApplied === 'Y',
            customerType: null // FIX: Keep it clean until user interactively selects a type
        }));

        // Then fetch debtor data asynchronously
        try {
            const response = await api.get(`/debtors/${bill.billNo}`);
            if (response.data.success && response.data.data) {
                const debtorData = response.data.data;
                setSelectedBillDebtor(debtorData);
            }
        } catch (e) {
            console.log('Error fetching debtor:', e);
        }
    };
    // Add this useEffect after your state declarations (around line where other useEffects are)
    useEffect(() => {
        if (state.givenAmountInput && state.givenAmountInput !== "0") {
            const num = parseFloat(state.givenAmountInput);
            const maxAmount = state.selectedBill ? getRemainingBillAmount(state.selectedBill) : Infinity;
            if (state.selectedBill && num > maxAmount) {
                alert(`Amount cannot exceed Rs. ${formatDecimal(maxAmount)}`);
                return;
            }
            setState(prev => ({
                ...prev,
                customerBillValue: state.givenAmountInput,
                badDebtAmount: state.givenAmountInput
            }));
        }
    }, [state.givenAmountInput, selectedBillDebtor]);

    // Save filter states whenever they change
    useEffect(() => {
        localStorage.setItem('printedBills_viewOldBills', viewOldBills);
    }, [viewOldBills]);

    useEffect(() => {
        localStorage.setItem('printedBills_startDate', startDate);
    }, [startDate]);

    useEffect(() => {
        localStorage.setItem('printedBills_endDate', endDate);
    }, [endDate]);

    useEffect(() => {
        localStorage.setItem('printedBills_dataSource', dataSource);
    }, [dataSource]);
    const handleContextMenu = (e, bill) => {
        e.preventDefault();
        setState(prev => ({ ...prev, showDeleteModal: true, deleteBillNo: bill.billNo, deleteCustomerCode: bill.customerCode }));
    };

    const handleDeleteBillPayments = async (billNo) => {
        setState(prev => ({ ...prev, isPrinting: true }));
        try {
            const response = await api.delete(`/sales/delete-bill-payments/${billNo}`);
            if (response.data.success) {
                alert(`All payments for Bill #${billNo} have been reversed!`);
                await fetchSalesData();
                if (state.selectedBill?.billNo === billNo) setState(prev => ({ ...prev, selectedBill: null, givenAmountInput: "" }));
            }
        } catch (error) { console.error('Error deleting payments:', error); alert('Failed to reverse payments.'); }
        finally { setState(prev => ({ ...prev, isPrinting: false, showDeleteModal: false, deleteBillNo: null, deleteCustomerCode: null })); }
    };
    const checkAndHandleDebtor = async (bill) => {
        console.log('Checking debtor for:', bill.customerCode, 'Customer type:', state.customerType);

        // If clicking the same bill that's already selected, clear everything
        if (state.selectedBill && state.selectedBill.billNo === bill.billNo) {
            setState(prev => ({
                ...prev,
                selectedBill: null,
                givenAmountInput: "",
                isUpdatingCompletedBill: false,
                customerType: null
            }));
            setSelectedBillDebtor(null);
            return;
        }

        // Clear debtor data immediately
        setSelectedBillDebtor(null);

        // Reset customer type and selectedBill first
        setState(prev => ({
            ...prev,
            selectedBill: null,
            customerType: null
        }));

        // Small delay to ensure state is completely cleared before configuring the new bill selection
        setTimeout(async () => {
            // FIX: Remove the localStorage fallback here to prevent stale 'walking' data auto-populating
            setState(prev => ({
                ...prev,
                selectedBill: bill,
                givenAmountInput: "",
                isUpdatingCompletedBill: bill.givenAmountApplied === 'Y',
                customerType: null // <-- Always start clean, let the user click manually
            }));

            // Check for debtor record
            try {
                const response = await api.get(`/debtors/${bill.billNo}`);
                if (response.data.success && response.data.data && response.data.data.Debtor_no) {
                    setSelectedBillDebtor(response.data.data);
                    // Only auto-select debtor if not viewing old bills
                    if (!viewOldBills) {
                        setState(prev => ({ ...prev, customerType: 'debtor' }));
                    }
                }
            } catch (e) {
                setSelectedBillDebtor(null);
            }
        }, 50);
    };
    const handleDebtorSave = async (saved, debtorNo = null) => {
        console.log('Debtor save callback:', saved, 'Debtor No:', debtorNo);
        if (saved && state.pendingDebtorBill) {
            setState(prev => ({
                ...prev,
                // DON'T reset customerType to null - keep it as debtor
                showDebtorForm: false,
                pendingDebtorBill: null
            }));
            const message = `Customer ${state.pendingDebtorBill.customerCode} has been registered as a Debtor!`;
            const debtorMessage = debtorNo ? `\nDebtor Number: ${debtorNo}` : '';
            const billMessage = state.pendingDebtorBill.billNo ? `\nBill No: ${state.pendingDebtorBill.billNo}` : '';
            alert(message + debtorMessage + billMessage);

            // Refresh customers list after saving new debtor
            await refreshCustomersList();

            // Refresh the selected bill's debtor data
            if (state.selectedBill?.billNo === state.pendingDebtorBill.billNo) {
                try {
                    const response = await api.get(`/debtors/${state.pendingDebtorBill.billNo}`);
                    if (response.data.success && response.data.data) {
                        setSelectedBillDebtor(response.data.data);
                        // Set customer type to debtor after successful debtor creation
                        setState(prev => ({ ...prev, customerType: 'debtor' }));
                    }
                } catch (e) {
                    console.log('Error fetching new debtor data:', e);
                }
            }
        } else {
            setState(prev => ({
                ...prev,
                showDebtorForm: false,
                pendingDebtorBill: null
            }));
        }
    };
    // Refresh debtor data when a debtor is saved
    // Refresh debtor data when a debtor is saved
    useEffect(() => {
        if (state.pendingDebtorBill?.billNo && !state.showDebtorForm) {
            // If we just closed the debtor form and we have a pending bill, refresh its debtor data
            const refreshDebtor = async () => {
                try {
                    const response = await api.get(`/debtors/${state.pendingDebtorBill.billNo}`);
                    if (response.data.success && response.data.data) {
                        setSelectedBillDebtor(response.data.data);
                        // Set customer type to debtor after successful debtor creation
                        setState(prev => ({ ...prev, customerType: 'debtor' }));
                    }
                } catch (e) {
                    console.log('No debtor record found after save');
                }
            };
            refreshDebtor();
        }
    }, [state.showDebtorForm, state.pendingDebtorBill]);

    const handlePrintWithoutUpdate = async () => {
        if (!state.selectedBill?.sales?.length) { alert("No sales data found."); return; }
        setState(prev => ({ ...prev, isPrinting: true }));
        try {
            const customer = state.customers.find(c => c.short_name?.toUpperCase() === state.selectedBill.customerCode?.toUpperCase());
            const receiptHtml = buildFullReceiptHTML(state.selectedBill.sales, state.selectedBill.billNo, customer?.name || state.selectedBill.customerCode, customer?.telephone_no || "", 0, state.selectedBill.givenAmount || 0, 'cash', null, '3inch', state.selectedBill.cashPayments || 0);
            const printWindow = window.open("", "_blank", "width=800,height=600");
            if (!printWindow) { alert("Please allow pop-ups"); setState(prev => ({ ...prev, isPrinting: false })); return; }
            printWindow.document.write(`<html><head><title>Print Bill</title></head><body>${receiptHtml}<script>window.onload=()=>{setTimeout(()=>{window.print();setTimeout(()=>window.close(),500)},500)};<\/script></body></html>`);
            printWindow.document.close();
        } catch (error) { console.error("Print error:", error); alert("Error printing bill"); }
        finally { setState(prev => ({ ...prev, isPrinting: false })); }
    };

    const handleViewPaymentHistory = async () => {
        if (!state.selectedBill) return;
        try {
            const response = await api.get(`${routes.paymentHistory}/${state.selectedBill.billNo}`);
            if (response.data.success) {
                const payments = response.data.payments || [];
                const totalPaidExcludingCredit = payments.reduce((sum, p) => p.method !== 'Credit' ? sum + (parseFloat(p.amount) || 0) : sum, 0);
                setState(prev => ({ ...prev, currentPayments: payments, paymentHistoryTotalPaid: totalPaidExcludingCredit, paymentHistoryTotalBill: response.data.total_bill || 0, paymentHistoryRemaining: response.data.remaining || 0, showPaymentHistoryModal: true }));
            }
        } catch (error) { console.error('Error fetching payment history:', error); alert('Failed to fetch payment history'); }
    };
    const processPayment = async (paymentAmount, isCheque = false, chequeDetails = null, isBankTransfer = false, bankTransferDetails = null, isAdjustment = false, adjustmentDetails = null) => {
        if (!state.selectedBill || state.isPrinting) return;

        const maxAllowed = getRemainingBillAmount(state.selectedBill);

        if (paymentAmount > maxAllowed) {
            alert(`Payment amount exceeds maximum allowed!\n\nMaximum: Rs. ${formatDecimal(maxAllowed)}\nEntered: Rs. ${formatDecimal(paymentAmount)}`);
            setState(prev => ({ ...prev, isPrinting: false }));
            return;
        }

        setState(prev => ({ ...prev, isPrinting: true }));

        try {
            const currentGiven = state.selectedBill.givenAmount || 0;
            const totalGivenAmount = currentGiven + paymentAmount;
            const isFullySettled = totalGivenAmount >= state.selectedBill.totalAmount;
            const creditTransaction = isFullySettled ? 'N' : 'Y';
            const givenAmountApplied = isFullySettled ? 'Y' : 'N';

            let paymentMethod = 'Cash';
            let paymentMethodForDebtor = 'cash';

            if (isAdjustment && adjustmentDetails) {
                paymentMethod = adjustmentDetails.type;
                if (adjustmentDetails.type === 'bag_to_box') paymentMethodForDebtor = 'bag_to_box';
                else if (adjustmentDetails.type === 'bill_to_bill') paymentMethodForDebtor = 'bill_to_bill';
                else if (adjustmentDetails.type === 'bad_debt') paymentMethodForDebtor = 'bad_debt';
            } else if (isBankTransfer) {
                paymentMethod = 'Bank Transfer';
                paymentMethodForDebtor = 'bank_transfer';
            } else if (isCheque) {
                paymentMethod = 'Cheque';
                paymentMethodForDebtor = 'cheque';
            } else {
                paymentMethodForDebtor = 'cash';
            }

            const payload = {
                bill_no: state.selectedBill.billNo,
                given_amount: totalGivenAmount,
                given_amount_applied: givenAmountApplied,
                credit_transaction: creditTransaction,
                payment_amount: paymentAmount,
                payment_method: paymentMethod,
                is_walking_customer: state.customerType === 'walking'
            };

            let paymentMethodText = 'Cash';
            let paymentDetailsForReceipt = null;
            let bankNameForCashier = null; // Store bank name for cashier balance

            if (isAdjustment && adjustmentDetails) {
                if (adjustmentDetails.type === 'bag_to_box') {
                    payload.bag_count = adjustmentDetails.bag_count;
                    payload.box_count = adjustmentDetails.box_count;
                    payload.bag_value = adjustmentDetails.bag_value;
                    payload.box_value = adjustmentDetails.box_value;
                    payload.adjustment_amount = adjustmentDetails.amount;
                    paymentMethodText = 'Bag to Box';
                    paymentDetailsForReceipt = {
                        type: 'bag_to_box',
                        amount: adjustmentDetails.amount,
                        bag_count: adjustmentDetails.bag_count,
                        box_count: adjustmentDetails.box_count,
                        bag_value: adjustmentDetails.bag_value,
                        box_value: adjustmentDetails.box_value
                    };
                } else if (adjustmentDetails.type === 'bill_to_bill') {
                    payload.target_customer_code = adjustmentDetails.customer_code;
                    payload.target_bill_no = adjustmentDetails.customer_bill_no;
                    payload.target_bill_value = adjustmentDetails.customer_bill_value;
                    payload.adjustment_amount = adjustmentDetails.amount;
                    paymentMethodText = 'Bill to Bill';
                    paymentDetailsForReceipt = {
                        type: 'bill_to_bill',
                        amount: adjustmentDetails.amount,
                        customer_bill_no: adjustmentDetails.customer_bill_no
                    };
                } else if (adjustmentDetails.type === 'bad_debt') {
                    payload.bad_debt_name = adjustmentDetails.bad_debt_name;
                    payload.bad_debt_amount = adjustmentDetails.bad_debt_amount;
                    payload.adjustment_amount = adjustmentDetails.amount;
                    paymentMethodText = 'Bad Debt';
                    paymentDetailsForReceipt = {
                        type: 'bad_debt',
                        amount: adjustmentDetails.amount,
                        name: adjustmentDetails.bad_debt_name
                    };
                }
            } else if (isBankTransfer && bankTransferDetails) {
                payload.bank_account_id = bankTransferDetails.bank_account_id;
                payload.transfer_reference_no = bankTransferDetails.reference_no;
                payload.transfer_date = bankTransferDetails.transfer_date;
                payload.transfer_notes = bankTransferDetails.notes;
                paymentMethodText = 'Bank Transfer';
                paymentDetailsForReceipt = {
                    reference_no: bankTransferDetails.reference_no,
                    transfer_date: bankTransferDetails.transfer_date
                };
                // Get bank name from transfer details if available
                bankNameForCashier = bankTransferDetails.bank_name || null;
            } else if (isCheque && chequeDetails) {
                payload.cheq_date = chequeDetails.cheq_date;
                payload.cheq_no = chequeDetails.cheq_no;
                payload.bank_account_id = chequeDetails.bank_account_id;
                paymentMethodText = 'Cheque';
                paymentDetailsForReceipt = {
                    cheq_no: chequeDetails.cheq_no,
                    cheq_date: chequeDetails.cheq_date
                };
                // Get bank name from cheque details if available
                bankNameForCashier = chequeDetails.bank_name || null;
            }

            // Create payment history entry
            const paymentHistoryEntry = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                amount: parseFloat(paymentAmount),
                method: paymentMethod,
                running_balance: parseFloat(totalGivenAmount),
                is_fully_paid: isFullySettled,
                reference: paymentMethod,
                details: {}
            };

            if (isCheque && chequeDetails) {
                paymentHistoryEntry.details = {
                    cheq_no: chequeDetails.cheq_no,
                    cheq_date: chequeDetails.cheq_date,
                    bank_account_id: chequeDetails.bank_account_id,
                    bank_name: bankNameForCashier
                };
            } else if (isBankTransfer && bankTransferDetails) {
                paymentHistoryEntry.details = {
                    transfer_reference_no: bankTransferDetails.reference_no,
                    transfer_date: bankTransferDetails.transfer_date,
                    bank_account_id: bankTransferDetails.bank_account_id,
                    bank_name: bankNameForCashier
                };
            }

            if (isAdjustment && adjustmentDetails) {
                paymentHistoryEntry.details.adjustment = {
                    type: adjustmentDetails.type,
                    amount: adjustmentDetails.amount,
                    ...(adjustmentDetails.type === 'bag_to_box' && {
                        bag_count: adjustmentDetails.bag_count,
                        box_count: adjustmentDetails.box_count,
                        bag_value: adjustmentDetails.bag_value,
                        box_value: adjustmentDetails.box_value
                    }),
                    ...(adjustmentDetails.type === 'bill_to_bill' && {
                        customer_code: adjustmentDetails.customer_code,
                        customer_bill_no: adjustmentDetails.customer_bill_no,
                        customer_bill_value: adjustmentDetails.customer_bill_value
                    }),
                    ...(adjustmentDetails.type === 'bad_debt' && {
                        bad_debt_name: adjustmentDetails.bad_debt_name,
                        bad_debt_amount: adjustmentDetails.bad_debt_amount
                    })
                };
            }

            // OPTIMIZATION: Check debtor in parallel with other operations
            let existingDebtor = null;
            let totalCreditAmount = state.selectedBill.creditAmount || 0;

            try {
                const debtorCheck = await api.get(`/debtors/${state.selectedBill.billNo}`);
                if (debtorCheck.data.success && debtorCheck.data.data) {
                    existingDebtor = debtorCheck.data.data;
                }
            } catch (e) {
                // No existing debtor record
            }

            // ===== CREDIT SETTLEMENT LOGIC =====
            const isCurrentlyCompleted = state.selectedBill.givenAmountApplied === 'Y';
            const isBecomingCompleted = givenAmountApplied === 'Y' && !isCurrentlyCompleted;

            if (existingDebtor && existingDebtor.remaining_amount > 0) {
                let shouldSettleCredit = false;

                if (isCurrentlyCompleted) {
                    shouldSettleCredit = true;
                } else if (isBecomingCompleted) {
                    shouldSettleCredit = false;
                    paymentHistoryEntry.details.credit_settlement = {
                        status: 'PENDING',
                        message: `Credit of Rs. ${formatDecimal(existingDebtor.remaining_amount)} remains unsettled.`
                    };
                } else {
                    shouldSettleCredit = false;
                    paymentHistoryEntry.details.credit_settlement = {
                        status: 'PENDING',
                        message: `Credit will be settled when bill moves to Completed section.`
                    };
                }

                if (shouldSettleCredit) {
                    let debtorPaymentAmount = Math.min(paymentAmount, existingDebtor.remaining_amount);

                    if (debtorPaymentAmount > 0) {
                        let debtorPaymentMethod = 'cash';
                        if (isAdjustment && adjustmentDetails) {
                            if (adjustmentDetails.type === 'bag_to_box') debtorPaymentMethod = 'bag_to_box';
                            else if (adjustmentDetails.type === 'bill_to_bill') debtorPaymentMethod = 'bill_to_bill';
                            else if (adjustmentDetails.type === 'bad_debt') debtorPaymentMethod = 'bad_debt';
                        } else if (paymentMethod === 'Cheque') {
                            debtorPaymentMethod = 'cheque';
                        } else if (paymentMethod === 'Bank Transfer') {
                            debtorPaymentMethod = 'bank_transfer';
                        }

                        try {
                            const updateResponse = await api.put('/debtors/update-payment', {
                                bill_no: state.selectedBill.billNo,
                                payment_amount: debtorPaymentAmount,
                                payment_method: debtorPaymentMethod,
                                settle_fully: true
                            });

                            paymentHistoryEntry.details.debtor_payment = {
                                amount: debtorPaymentAmount,
                                previous_remaining: existingDebtor.remaining_amount,
                                new_remaining: existingDebtor.remaining_amount - debtorPaymentAmount,
                                is_fully_paid: (existingDebtor.remaining_amount - debtorPaymentAmount) <= 0,
                                settled_way: debtorPaymentMethod,
                                settlement_type: 'completed_section_payment'
                            };
                        } catch (debtorError) {
                            console.error('Error updating debtor payment:', debtorError);
                        }
                    }
                }
            } else if (totalCreditAmount > 0 && !existingDebtor && (isCurrentlyCompleted || isBecomingCompleted)) {
                await api.post('/debtors/create', {
                    bill_no: state.selectedBill.billNo,
                    customer_code: state.selectedBill.customerCode,
                    credit_amount: totalCreditAmount
                });
            }

            // Get existing payment history
            let existingHistory = [];
            try {
                const currentHistory = state.selectedBill.payment_history;
                if (currentHistory) {
                    existingHistory = typeof currentHistory === 'string'
                        ? JSON.parse(currentHistory)
                        : currentHistory;
                }
            } catch (e) {
                existingHistory = [];
            }

            existingHistory.push(paymentHistoryEntry);
            payload.payment_history = JSON.stringify(existingHistory);

            // OPTIMIZATION: Make main API call
            const response = await api.put(routes.updateGivenAmountApplied, payload);

            if (response.data.success) {
                // OPTIMIZATION: Run fetchSalesData and cashier balance recording in parallel
                await Promise.all([
                    fetchSalesData(),
                    // Record cashier balance with bank name
                    // Record cashier balance with bank name
                    (async () => {
                        try {
                            await recordCashierTransaction({
                                paymentAmount: paymentAmount,
                                paymentMethod: paymentMethodText,
                                billNo: state.selectedBill.billNo,
                                customerCode: state.selectedBill.customerCode,
                                bankName: bankNameForCashier,
                                chequeNumber: (isCheque && chequeDetails?.cheq_no) ? chequeDetails.cheq_no : null,
                                transferReference: (isBankTransfer && bankTransferDetails?.reference_no) ? bankTransferDetails.reference_no : null
                            });
                        } catch (cashierError) {
                            console.error('Failed to record cashier balance:', cashierError);
                        }
                    })()
                ]);

                // Dispatch event (non-blocking)
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

                // Build debtor message (simplified)
                let debtorMessage = '';
                if (existingDebtor && existingDebtor.remaining_amount > 0 && isCurrentlyCompleted) {
                    const newRemaining = Math.max(0, existingDebtor.remaining_amount - paymentAmount);
                    if (newRemaining <= 0) {
                        debtorMessage = `\n\n✅ CREDIT FULLY SETTLED!`;
                    } else {
                        debtorMessage = `\n\n💰 CREDIT PARTIALLY SETTLED: Rs. ${formatDecimal(newRemaining)} remaining`;
                    }
                } else if (existingDebtor && existingDebtor.remaining_amount > 0 && isBecomingCompleted) {
                    debtorMessage = `\n\n⏳ CREDIT REMAINS UNSETTLED: Rs. ${formatDecimal(existingDebtor.remaining_amount)}\nMake payment in Completed section to settle.`;
                }

                // Generate receipt if fully settled
                if (isFullySettled) {
                    if (paymentDetailsForReceipt && response.data.data?.bank_name) {
                        paymentDetailsForReceipt.bank_name = response.data.data.bank_name;
                    }

                    const cashGivenAmount = state.selectedBill.cashPayments || 0;

                    const receiptHtml = buildFullReceiptHTML(
                        state.selectedBill.sales,
                        state.selectedBill.billNo,
                        state.selectedBill.customerCode,
                        customer?.telephone_no || "",
                        0,
                        totalGivenAmount,
                        isAdjustment ? 'adjustment' : (isBankTransfer ? 'bank_to_bank' : (isCheque ? 'cheque' : 'cash')),
                        paymentDetailsForReceipt,
                        '3inch',
                        cashGivenAmount
                    );

                    const printWindow = window.open("", "_blank", "width=800,height=600");
                    if (printWindow) {
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
    window.onload = () => { window.print(); };
    window.onafterprint = () => setTimeout(() => window.close(), 500);
    setTimeout(() => { if (!window.closed) window.close(); }, 5000);
<\/script>
</body>
</html>
`);
                        printWindow.document.close();
                    } else {
                        alert("Please allow pop-ups for printing");
                    }
                }

                const statusMessage = givenAmountApplied === 'Y'
                    ? `✅ Payment Complete!\n\nPayment Method: ${paymentMethodText}\nAmount Paid: Rs. ${formatDecimal(paymentAmount)}\nTotal Given: Rs. ${formatDecimal(totalGivenAmount)}\nBill moved to Completed Payments.${debtorMessage}`
                    : `✓ Payment Added!\n\nPayment Method: ${paymentMethodText}\nAmount Paid: Rs. ${formatDecimal(paymentAmount)}\nTotal Given: Rs. ${formatDecimal(totalGivenAmount)}\nRemaining: Rs. ${formatDecimal(Math.max(0, state.selectedBill.totalAmount - totalGivenAmount))}${debtorMessage}`;

                alert(statusMessage);

                setState(prev => ({
                    ...prev,
                    selectedBill: null,
                    givenAmountInput: "",
                    showChequeModal: false,
                    showBankToBankModal: false,
                    showAdjustmentModal: false,
                    pendingBankToBankAmount: 0,
                    customerType: null
                }));
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to update. Please try again.");
        } finally {
            setState(prev => ({ ...prev, isPrinting: false }));
        }
    };
    // Get current data based on dataSource
    const currentPendingBills = dataSource === 'sales_history' ? archivedData.pendingBills : state.pendingBills;
    const currentAppliedBills = dataSource === 'sales_history' ? archivedData.appliedBills : state.appliedBills;

    const filterPendingBills = useMemo(() => {
        if (!state.pendingSearchQuery) return currentPendingBills;
        const q = state.pendingSearchQuery.toLowerCase();
        return currentPendingBills.filter(b => b.billNo.toString().includes(q) || b.customerCode.toLowerCase().includes(q));
    }, [currentPendingBills, state.pendingSearchQuery]);

    const filterAppliedBills = useMemo(() => {
        if (!state.appliedSearchQuery) return currentAppliedBills;
        const q = state.appliedSearchQuery.toLowerCase();
        return currentAppliedBills.filter(b => b.billNo.toString().includes(q) || b.customerCode.toLowerCase().includes(q));
    }, [currentAppliedBills, state.appliedSearchQuery]);
    // Add this function in your PrintedBills component
    const fetchAdjustedSupplierLoan = useCallback(async (totalFunds) => {
        try {
            const response = await api.get('/supplier-loans/adjusted-total', {
                params: { total_funds: totalFunds }
            });

            if (response.data.success) {
                console.log('Supplier Loan Adjustment Response:', response.data);

                // Extract the data from response.data.data
                const loanData = response.data.data;

                console.log('Loan Data:', loanData);
                console.log('Adjusted Amount:', loanData.adjusted_amount);

                setAdjustedLoanData(loanData);
                return loanData;
            }
        } catch (error) {
            console.error('Error fetching adjusted supplier loan:', error);
            setAdjustedLoanData(null);
            return null;
        }
    }, []);
// Replace the silentRefresh function (around line 1580)
const silentRefresh = useCallback(async () => {
    if (!isMountedRef.current) return;

    // CRITICAL: Don't refresh if modal is open, filter is changing, or we're already refreshing
    if (modalOpenRef.current || isChangingFilter || isRefreshingRef.current) {
        console.log('⏸️ Skipping silent refresh -', {
            modalOpen: modalOpenRef.current,
            isChangingFilter: isChangingFilter,
            isRefreshing: isRefreshingRef.current
        });
        return;
    }

    setIsRefreshing(true);
    try {
        const isViewingOldBills = viewOldBillsRef.current;
        const hasDateRange = startDateRef.current && endDateRef.current;
        
        // Get the CURRENT selected unique code at refresh time
        const currentUniqueCode = selectedUniqueCodeRef.current;
        
        console.log('🔄 Silent refresh starting with cashier:', currentUniqueCode);

        // REFRESH DROPDOWN OPTIONS FIRST (fetch unique codes)
        try {
            const uniqueCodesResponse = await api.get('/sales/unique-codes');
            if (uniqueCodesResponse.data.success && isMountedRef.current) {
                const newUniqueCodes = uniqueCodesResponse.data.unique_codes;
                setUniqueCodes(newUniqueCodes);
                console.log('🔄 Dropdown options refreshed:', newUniqueCodes);
            }
        } catch (uniqueError) {
            console.error('Error refreshing unique codes:', uniqueError);
        }

        if (isViewingOldBills && hasDateRange) {
            // Fetch archived sales with current filter - ALWAYS use the same URL
            const url = routes.getArchivedSales;
            const params = {
                start_date: startDateRef.current,
                end_date: endDateRef.current
            };

            // Add unique_code as a parameter if a specific cashier is selected
            if (currentUniqueCode && currentUniqueCode !== 'all') {
                params.unique_code = currentUniqueCode;
            }

            console.log('🔄 Silent refresh fetching archived sales with params:', params);

            const response = await api.get(url, { params });

            if (!isMountedRef.current) return;

            if (response.data.success) {
                const { pendingBills, appliedBills } = processBillData(response.data.sales || []);
                const updatedPending = await updateCreditAmountsFromDebtorTable(pendingBills, 'silentRefresh-archived-pending', false);
                const updatedApplied = await updateCreditAmountsFromDebtorTable(appliedBills, 'silentRefresh-archived-applied', true);

                setArchivedData({
                    pendingBills: updatedPending,
                    appliedBills: updatedApplied,
                    isLoading: false
                });

                console.log(`✅ Silent refresh complete (Archived): ${updatedPending.length} pending, ${updatedApplied.length} completed`);
                await fetchRemainingBalances();
            } else {
                console.error('❌ Silent refresh failed - archived sales response not successful:', response.data);
            }
        } else {
            // Fetch current sales with current filter
            let url = routes.getAllSales;
            let params = {};

            if (currentUniqueCode && currentUniqueCode !== 'all') {
                url = '/sales/all-with-filter';
                params = { unique_code: currentUniqueCode };
            }

            const [salesRes, customersRes] = await Promise.all([
                api.get(url, { params }),
                api.get(routes.customers)
            ]);

            if (!isMountedRef.current) return;

            const salesData = salesRes.data.sales || salesRes.data || [];
            const customersData = customersRes.data.data || customersRes.data.customers || customersRes.data || [];
            const { pendingBills, appliedBills } = processBillData(salesData);

            const updatedPending = await updateCreditAmountsFromDebtorTable(pendingBills, 'silentRefresh-pending', false);
            const updatedApplied = await updateCreditAmountsFromDebtorTable(appliedBills, 'silentRefresh-applied', true);

            // Only update if the filter hasn't changed during this refresh
            if (selectedUniqueCodeRef.current === currentUniqueCode) {
                setState(prev => ({
                    ...prev,
                    pendingBills: updatedPending,
                    appliedBills: updatedApplied,
                    customers: customersData,
                }));

                // Update selected bill if needed
                if (state.selectedBill && isMountedRef.current) {
                    const isApplied = state.selectedBill.givenAmountApplied === 'Y';
                    const updatedBillsList = isApplied ? updatedApplied : updatedPending;
                    const updatedBill = updatedBillsList.find(b => b.billNo === state.selectedBill.billNo);

                    if (updatedBill && updatedBill !== state.selectedBill) {
                        setState(prev => ({
                            ...prev,
                            selectedBill: {
                                ...prev.selectedBill,
                                remainingCredit: updatedBill.remainingCredit,
                                creditAmount: updatedBill.creditAmount,
                                givenAmount: updatedBill.givenAmount,
                                cashPayments: updatedBill.cashPayments,
                                totalAmount: updatedBill.totalAmount
                            }
                        }));
                    }
                }

                const pendingGiven = updatedPending.reduce((sum, b) => {
                    let total = 0;
                    const history = b.paymentHistory || b.payment_history;
                    if (history) {
                        let payments = typeof history === 'string' ? JSON.parse(history) : history;
                        if (Array.isArray(payments)) {
                            payments.forEach(p => {
                                if (p.method !== 'Credit') {
                                    total += parseFloat(p.amount) || 0;
                                }
                            });
                        }
                    }
                    return sum + total;
                }, 0);

                const appliedGiven = updatedApplied.reduce((sum, b) => {
                    let total = 0;
                    const history = b.paymentHistory || b.payment_history;
                    if (history) {
                        let payments = typeof history === 'string' ? JSON.parse(history) : history;
                        if (Array.isArray(payments)) {
                            payments.forEach(p => {
                                if (p.method !== 'Credit') {
                                    total += parseFloat(p.amount) || 0;
                                }
                            });
                        }
                    }
                    return sum + total;
                }, 0);

                const totalFunds = pendingGiven + appliedGiven;

                if (totalFunds > 0) {
                    await fetchAdjustedSupplierLoan(totalFunds);
                }

                await fetchRemainingBalances();

                console.log(`✅ Silent refresh complete (Current): ${updatedPending.length} pending, ${updatedApplied.length} completed`);
            } else {
                console.log('⏭️ Skipping state update - filter changed during refresh');
            }
        }
    } catch (error) {
        console.error("Silent refresh error:", error);
    } finally {
        if (isMountedRef.current) {
            setIsRefreshing(false);
        }
    }
}, [state.selectedBill, updateCreditAmountsFromDebtorTable, fetchAdjustedSupplierLoan, fetchRemainingBalances]);

    // Add useEffect to refetch when selectedUniqueCode changes
    useEffect(() => {
        if (!viewOldBills) {
            fetchSalesData(selectedUniqueCode);
        } else if (startDate && endDate) {
            fetchArchivedSales(true, selectedUniqueCode);
        }
        localStorage.setItem('printedBills_selectedUniqueCode', selectedUniqueCode);
    }, [selectedUniqueCode, viewOldBills, startDate, endDate]);
    // Process Credit Payment function
    const processCreditPayment = async (paymentAmount) => {
        if (!state.selectedBill || state.isPrinting) return;

        console.log('=== PROCESS CREDIT PAYMENT ===');
        console.log('Payment Amount:', paymentAmount);
        console.log('Bill No:', state.selectedBill.billNo);
        console.log('Customer Code:', state.selectedBill.customerCode);
        console.log('Current Given Amount:', state.selectedBill.givenAmount);
        console.log('Total Bill Amount:', state.selectedBill.totalAmount);

        setState(prev => ({ ...prev, isPrinting: true }));

        try {
            const currentGiven = state.selectedBill.givenAmount || 0;
            const totalGivenAmount = currentGiven + paymentAmount;
            const isFullySettled = totalGivenAmount >= state.selectedBill.totalAmount;
            const creditTransaction = isFullySettled ? 'N' : 'Y';
            const givenAmountApplied = isFullySettled ? 'Y' : 'N';

            console.log('Calculated Values:', {
                currentGiven,
                totalGivenAmount,
                isFullySettled,
                creditTransaction,
                givenAmountApplied
            });

            // Create debtor record with the exact payment amount
            const debtorData = {
                bill_no: state.selectedBill.billNo,
                customer_code: state.selectedBill.customerCode,
                credit_amount: parseFloat(paymentAmount)
            };

            console.log('Sending to debtor API:', debtorData);

            const debtorResponse = await api.post('/debtors/create', debtorData);

            console.log('Debtor API Response:', debtorResponse.data);

            if (!debtorResponse.data.success) {
                throw new Error(debtorResponse.data.message || 'Failed to create credit record');
            }

            let remainingDebtAmount = parseFloat(paymentAmount);
            let debtorStatus = 'pending';

            if (debtorResponse.data.data?.remaining_amount !== undefined) {
                remainingDebtAmount = parseFloat(debtorResponse.data.data.remaining_amount);
                debtorStatus = debtorResponse.data.data.status || 'pending';
            } else if (debtorResponse.data.data?.credit_amount !== undefined) {
                remainingDebtAmount = parseFloat(debtorResponse.data.data.credit_amount);
            }

            console.log('Remaining Debt Amount:', remainingDebtAmount);
            console.log('Debtor Status:', debtorStatus);

            // Create payment history entry - mark that this credit is NOT settled yet
            const paymentHistoryEntry = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                amount: parseFloat(paymentAmount),
                method: 'Credit',
                running_balance: parseFloat(totalGivenAmount),
                is_fully_paid: isFullySettled,
                reference: 'Credit Payment',
                details: {
                    debtor_id: debtorResponse.data.data?.id,
                    credit_amount: parseFloat(paymentAmount),
                    remaining_debt: remainingDebtAmount,
                    debtor_status: debtorStatus,
                    settlement_status: 'PENDING', // ← Mark as pending settlement
                    message: `This credit of Rs. ${formatDecimal(paymentAmount)} will ONLY be settled when the bill is fully completed and an additional payment is made in the Completed Bills section.`
                }
            };

            // Get existing payment history
            let existingHistory = [];
            try {
                const currentHistory = state.selectedBill.payment_history;
                if (currentHistory) {
                    existingHistory = typeof currentHistory === 'string'
                        ? JSON.parse(currentHistory)
                        : currentHistory;
                }
            } catch (e) {
                console.error('Error parsing existing history:', e);
                existingHistory = [];
            }

            existingHistory.push(paymentHistoryEntry);

            const payload = {
                bill_no: state.selectedBill.billNo,
                given_amount: parseFloat(totalGivenAmount),
                given_amount_applied: givenAmountApplied,
                credit_transaction: creditTransaction,
                payment_amount: parseFloat(paymentAmount),
                payment_method: 'Credit',
                payment_history: JSON.stringify(existingHistory),
                is_walking_customer: state.customerType === 'walking',
                credit_pending_settlement: true
            };

            console.log('Sending to sales update API:', payload);

            const response = await api.put(routes.updateGivenAmountApplied, payload);

            console.log('Sales update response:', response.data);

            if (response.data.success) {
                await fetchSalesData();

                const customer = state.customers.find(c =>
                    String(c.short_name).toUpperCase() === String(state.selectedBill.customerCode).toUpperCase()
                );

                let statusMessage = '';

                if (isFullySettled) {
                    // Bill becomes fully paid but credit remains unsettled
                    statusMessage = `✓ Bill Fully Paid!\n\n` +
                        `Amount: Rs. ${formatDecimal(paymentAmount)}\n` +
                        `Total Given: Rs. ${formatDecimal(totalGivenAmount)}\n\n` +
                        `💰 CREDIT AMOUNT: Rs. ${formatDecimal(paymentAmount)}\n` +
                        `⏳ STATUS: PENDING SETTLEMENT\n\n` +
                        `📌 The bill has been moved to the "Completed Payments" section.\n` +
                        `💰 To settle this credit of Rs. ${formatDecimal(paymentAmount)}, make a payment in the "Completed Payments" section.\n` +
                        `✅ Any payment made in the Completed Bills section will automatically go towards settling this credit.`;
                } else {
                    statusMessage = `✓ Credit Added Successfully!\n\n` +
                        `Amount: Rs. ${formatDecimal(paymentAmount)}\n` +
                        `Total Given: Rs. ${formatDecimal(totalGivenAmount)}\n` +
                        `Remaining on Bill: Rs. ${formatDecimal(Math.max(0, state.selectedBill.totalAmount - totalGivenAmount))}\n` +
                        `Remaining Debt: Rs. ${formatDecimal(remainingDebtAmount)}\n` +
                        `Debt Status: ${debtorStatus === 'paid' ? 'FULLY PAID' : (debtorStatus === 'partial' ? 'PARTIAL PAYMENT' : 'PENDING')}\n\n` +
                        `⚠️ IMPORTANT: This amount has been recorded as DEBT.\n` +
                        `💰 This credit will ONLY be settled when:\n` +
                        `   1. The bill becomes fully paid and moves to "Completed Payments"\n` +
                        `   2. You make an additional payment in the "Completed Payments" section\n` +
                        `📝 The credit will remain as debt until then.`;
                }

                alert(statusMessage);

                setState(prev => ({
                    ...prev,
                    selectedBill: null,
                    givenAmountInput: "",
                    showChequeModal: false,
                    showBankToBankModal: false,
                    showAdjustmentModal: false,
                    pendingBankToBankAmount: 0,
                    customerType: null
                }));
            } else {
                throw new Error(response.data.message || 'Failed to update sales record');
            }
        } catch (error) {
            console.error("Error processing credit payment:", error);
            let errorMessage = "Failed to process credit payment. ";

            if (error.response) {
                console.error("Error response:", error.response.data);
                errorMessage += error.response.data?.message || error.message;
            } else if (error.request) {
                console.error("Error request:", error.request);
                errorMessage += "No response from server. Please check your connection.";
            } else {
                errorMessage += error.message;
            }

            alert(errorMessage);
        } finally {
            setState(prev => ({ ...prev, isPrinting: false }));
        }
    };
    // Auto-fetch archived sales when both start date and end date are selected
    useEffect(() => {
        if (viewOldBills && startDate && endDate) {
            // Add a small delay to avoid too many requests while typing
            const delayDebounce = setTimeout(() => {
                fetchArchivedSales(true);
            }, 500);
            return () => clearTimeout(delayDebounce);
        }
    }, [startDate, endDate, viewOldBills]);

    const stats = useMemo(() => {
        const pendingAmount = filterPendingBills.reduce((sum, b) => sum + b.totalAmount, 0);
        const appliedAmount = filterAppliedBills.reduce((sum, b) => sum + b.totalAmount, 0);

        const pendingGiven = filterPendingBills.reduce((sum, b) => {
            return sum + getTotalReceived(b);
        }, 0);

        const appliedGiven = filterAppliedBills.reduce((sum, b) => {
            return sum + getTotalReceived(b);
        }, 0);

        // Calculate Total Funds (sum of ALL payment methods including adjustments)
        const totalFunds = filterPendingBills.reduce((sum, b) => {
            let billTotal = 0;
            const history = b.paymentHistory || b.payment_history;
            if (history) {
                let payments = typeof history === 'string' ? JSON.parse(history) : history;
                if (Array.isArray(payments)) {
                    payments.forEach(p => {
                        // Include ALL payment types (Cash, Cheque, Bank Transfer, Bag to Box, Bill to Bill)
                        // Exclude Credit as it's debt, not actual funds
                        if (p.method !== 'Credit') {
                            billTotal += parseFloat(p.amount) || 0;
                        }
                    });
                }
            }
            return sum + billTotal;
        }, 0) + filterAppliedBills.reduce((sum, b) => {
            let billTotal = 0;
            const history = b.paymentHistory || b.payment_history;
            if (history) {
                let payments = typeof history === 'string' ? JSON.parse(history) : history;
                if (Array.isArray(payments)) {
                    payments.forEach(p => {
                        // Include ALL payment types (Cash, Cheque, Bank Transfer, Bag to Box, Bill to Bill)
                        // Exclude Credit as it's debt, not actual funds
                        if (p.method !== 'Credit') {
                            billTotal += parseFloat(p.amount) || 0;
                        }
                    });
                }
            }
            return sum + billTotal;
        }, 0);

        return {
            totalPending: filterPendingBills.length,
            totalApplied: filterAppliedBills.length,
            totalAmount: pendingAmount + appliedAmount,
            totalGiven: pendingGiven + appliedGiven,
            totalFunds: totalFunds  // Add this line
        };
    }, [filterPendingBills, filterAppliedBills]);
    const [adjustedLoanData, setAdjustedLoanData] = useState(null);

    // Fetch adjusted supplier loan amount when totalFunds changes
    useEffect(() => {
        const getAdjustedLoan = async () => {
            if (stats.totalFunds > 0) {
                const data = await fetchAdjustedSupplierLoan(stats.totalFunds);
                if (data) {
                    console.log('Loan data updated:', data);
                }
            }
        };
        getAdjustedLoan();
    }, [stats.totalFunds, fetchAdjustedSupplierLoan]);

    // Add this state for the summary popup (add with your other useState declarations around line 1130)
    const [showAdjustmentSummary, setShowAdjustmentSummary] = useState(false);
    const [adjustmentTotals, setAdjustmentTotals] = useState({
        cash: 0,
        cheque: 0,
        bank_transfer: 0,
        credit: 0,
        bag_to_box: 0,
        bill_to_bill: 0,
        bad_debt: 0
    });
    const [netValue, setNetValue] = useState(0);

    // Add this useEffect to monitor net value changes and show warning only once per session
    useEffect(() => {
        const actualNet = stats.totalFunds - (adjustedLoanData?.total_loan_amount || 0);

        setNetValue(actualNet);  // Store actual value (can be negative)

        // Check if the warning has already been shown in this session
        const warningAlreadyShown = sessionStorage.getItem('net_negative_warning_shown') === 'true';

      

        // Reset the session flag when value becomes positive again (so it can trigger again if it goes negative later)
        if (actualNet > 0) {
            const warningShown = sessionStorage.getItem('net_negative_warning_shown');
            if (warningShown === 'true') {
                sessionStorage.removeItem('net_negative_warning_shown');
            }
        }
    }, [stats.totalFunds, adjustedLoanData?.total_loan_amount]);

    // Add this function to calculate payment totals (add near your other functions)
    const calculatePaymentTotals = useCallback(() => {
        const totals = {
            cash: 0,
            cheque: 0,
            bank_transfer: 0,
            credit: 0,
            bag_to_box: 0,
            bill_to_bill: 0,
            bad_debt: 0
        };

        // Combine pending and applied bills
        const allBills = [...filterPendingBills, ...filterAppliedBills];

        allBills.forEach(bill => {
            const history = bill.paymentHistory || bill.payment_history;
            if (history) {
                let payments = typeof history === 'string' ? JSON.parse(history) : history;
                if (Array.isArray(payments)) {
                    payments.forEach(payment => {
                        const amount = parseFloat(payment.amount) || 0;
                        switch (payment.method) {
                            case 'Cash':
                                totals.cash += amount;
                                break;
                            case 'Cheque':
                                totals.cheque += amount;
                                break;
                            case 'Bank Transfer':
                                totals.bank_transfer += amount;
                                break;
                            case 'Credit':
                                totals.credit += amount;
                                break;
                            case 'bag_to_box':
                                totals.bag_to_box += amount;
                                break;
                            case 'bill_to_bill':
                                totals.bill_to_bill += amount;
                                break;
                            case 'bad_debt':
                                totals.bad_debt += amount;
                                break;
                            default:
                                break;
                        }
                    });
                }
            }
        });

        setAdjustmentTotals(totals);
    }, [filterPendingBills, filterAppliedBills]);

    // Add this effect to recalculate when bills change
    useEffect(() => {
        calculatePaymentTotals();  // <- CHANGE THIS LINE
    }, [filterPendingBills, filterAppliedBills, calculatePaymentTotals]);

    // Add this component for the summary popup (add before the return statement)
    const AdjustmentSummaryModal = ({ isOpen, onClose, totals }) => {
        if (!isOpen) return null;

        const totalReceived = (totals.cash || 0) + (totals.cheque || 0) + (totals.bank_transfer || 0) + (totals.bag_to_box || 0) + (totals.bill_to_bill || 0) + (totals.bad_debt || 0);
        const totalWithCredit = totalReceived + (totals.credit || 0);

        const paymentItems = [
            { icon: '💰', label: 'Cash Payments', value: totals.cash, color: '#10b981', bg: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' },
            { icon: '💳', label: 'Cheque Payments', value: totals.cheque, color: '#8b5cf6', bg: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' },
            { icon: '🏦', label: 'Bank Transfer Payments', value: totals.bank_transfer, color: '#ec489a', bg: 'linear-gradient(135deg, #fce7f3, #fbcfe8)' },
            { icon: '💳', label: 'Credit Payments (Debt)', value: totals.credit, color: '#f59e0b', bg: 'linear-gradient(135deg, #fef3c7, #fde68a)' },
            { icon: '📦', label: 'Bag to Box Conversion', value: totals.bag_to_box, color: '#f59e0b', bg: 'linear-gradient(135deg, #fef3c7, #fde68a)' },
            { icon: '📄', label: 'Bill to Bill Transfer', value: totals.bill_to_bill, color: '#3b82f6', bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' },
            { icon: '⚠️', label: 'Bad Debt Write-off', value: totals.bad_debt, color: '#ef4444', bg: 'linear-gradient(135deg, #fee2e2, #fecaca)' }
        ];

        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20001 }} onClick={onClose}>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '450px', maxWidth: '90%', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0' }}><span style={{ fontSize: '40px', lineHeight: 1 }}>📊</span><h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Payment Summary</h3></div>
                    <div style={{ marginBottom: '20px' }}>
                        {paymentItems.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', marginBottom: '10px', background: item.bg, borderRadius: '12px', borderLeft: `4px solid ${item.color}` }}>
                                <div><span style={{ fontSize: '20px', marginRight: '8px' }}>{item.icon}</span><span style={{ fontWeight: '600', color: item.color === '#10b981' ? '#065f46' : item.color === '#8b5cf6' ? '#5b21b6' : item.color === '#ec489a' ? '#9d174d' : item.color === '#f59e0b' ? '#92400e' : item.color === '#3b82f6' ? '#1e40af' : '#991b1b' }}>{item.label}</span></div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>Rs. {formatDecimal(item.value || 0)}</div>
                            </div>
                        ))}

                        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)', margin: '16px 0' }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '12px', color: 'white', marginBottom: '10px' }}>
                            <div><span style={{ fontSize: '20px', marginRight: '8px' }}>💰</span><span style={{ fontWeight: '700' }}>Total Received</span></div>
                            <div style={{ fontSize: '20px', fontWeight: '800' }}>Rs. {formatDecimal(totalReceived)}</div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1e293b', borderRadius: '12px', color: 'white' }}>
                            <div><span style={{ fontSize: '20px', marginRight: '8px' }}>📊</span><span style={{ fontWeight: '700' }}>Total Including Credit</span></div>
                            <div style={{ fontSize: '20px', fontWeight: '800' }}>Rs. {formatDecimal(totalWithCredit)}</div>
                        </div>
                    </div>

                    <button onClick={onClose} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Close</button>
                </div>
            </div>
        );
    };
    // Add this CSS animation to your styles object (add at the end of styles object)
    const styleWithAnimation = {
        ...styles,
        statBox: {
            ...styles.statBox,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            ':hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
            }
        }
    };

    // Then replace your stats row section (around line 1900) with this:

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
            <div style={styles.statLabel}>Total Sales</div>
            <div style={styles.statNumber}>Rs. {formatDecimal(stats.totalAmount)}</div>
            <div style={styles.statSub}>all bills total</div>
        </div>
        <div
            style={{ ...styles.statBox, cursor: 'pointer' }}
            onClick={() => setShowAdjustmentSummary(true)}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            }}
        >
            <div style={styles.statLabel}>
                Total Received
                <span style={{ fontSize: '10px', marginLeft: '4px', color: '#64748b' }}>(Excl. Credit) 📊</span>
            </div>
            <div style={styles.statNumber}>Rs. {formatDecimal(stats.totalGiven)}</div>
            <div style={styles.statSub}>amount received (click for adjustment summary)</div>
        </div>
    </div>

    // Add the modal just before the closing </div> of your main component (around line 2150, before the closing </div> of the app)

    const handleCreditPayment = async () => {
        // Get the amount from input field
        let paymentAmount = parseFloat(state.givenAmountInput);

        console.log('=== CREDIT PAYMENT DEBUG ===');
        console.log('Input field raw value:', state.givenAmountInput);
        console.log('Parsed payment amount:', paymentAmount);
        console.log('Selected bill:', state.selectedBill?.billNo);
        console.log('Customer code:', state.selectedBill?.customerCode);
        console.log('Total bill amount:', state.selectedBill?.totalAmount);
        console.log('Already given:', state.selectedBill?.givenAmount);

        // Validate amount
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            alert("Please enter a valid amount greater than 0");
            return;
        }

        if (!state.selectedBill) {
            alert("Please select a bill first");
            return;
        }

        const maxAllowed = getRemainingBillAmount(state.selectedBill);

        if (paymentAmount > maxAllowed) {
            alert(`Amount exceeds maximum allowed!\n\nMaximum: Rs. ${formatDecimal(maxAllowed)}\nEntered: Rs. ${formatDecimal(paymentAmount)}`);
            return;
        }

        // Show confirmation dialog with the exact amount
        const confirmCredit = window.confirm(
            `⚠️ CREDIT PAYMENT CONFIRMATION ⚠️\n\n` +
            `Bill Number: ${state.selectedBill.billNo}\n` +
            `Customer: ${state.selectedBill.customerCode}\n` +
            `Amount: Rs. ${paymentAmount.toFixed(2)}\n` +
            `Maximum Allowed: Rs. ${formatDecimal(maxAllowed)}\n\n` +
            `This amount will be recorded as DEBT in the debtors table.\n` +
            `Are you sure you want to proceed?`
        );

        if (!confirmCredit) return;

        await processCreditPayment(paymentAmount);
    };

    if (state.isLoading) return <LoadingSkeleton />;

    return (
        <div style={styles.app}>
            <div style={styles.container}>
                {/* Old Bills Bar with Total Funds */}
                {/* Updated Bar with UniqueCode Dropdown */}
                <div style={{ ...styles.oldBillsBar, justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <button
                            onClick={async () => {
                                if (viewOldBills) {
                                    resetToCurrentSales();
                                    setState(prev => ({ ...prev, customerType: null }));
                                } else {
                                    setViewOldBills(true);
                                }
                            }}
                            style={{
                                padding: '10px 24px',
                                background: viewOldBills ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #64748b, #475569)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                            }}
                        >
                            <span>{viewOldBills ? '📅' : '📜'}</span>
                            {viewOldBills ? 'View Current Bills' : 'View Old Bills'}
                        </button>

                        {/* UniqueCode Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                                👤 Cashier:
                            </label>
                            <select
                                value={selectedUniqueCode}
                                onChange={(e) => handleUniqueCodeChange(e.target.value)}  // ← Use the new handler
                                disabled={isLoadingUniqueCodes || isChangingFilter}
                                style={{
                                    padding: '8px 16px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    background: 'white',
                                    cursor: (isLoadingUniqueCodes || isChangingFilter) ? 'not-allowed' : 'pointer',
                                    minWidth: '150px'
                                }}
                            >
                               
                                {uniqueCodes.map(code => (
                                    <option key={code} value={code}>
                                        🧑‍💼 {code}
                                    </option>
                                ))}
                            </select>
                            {isLoadingUniqueCodes && (
                                <span style={{ fontSize: '12px', color: '#64748b' }}>⏳ Loading...</span>
                            )}
                        </div>

                        {viewOldBills && (
                            <div style={styles.datePickerContainer}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            if (endDate && e.target.value) {
                                                setTimeout(() => {
                                                    fetchArchivedSales();
                                                }, 100);
                                            }
                                        }}
                                        style={styles.dateInput}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            if (startDate && e.target.value) {
                                                setTimeout(() => {
                                                    fetchArchivedSales();
                                                }, 100);
                                            }
                                        }}
                                        style={styles.dateInput}
                                    />
                                </div>
                                <button
                                    onClick={async () => {
                                        if (startDate && endDate) {
                                            setArchivedData(prev => ({ ...prev, isLoading: true }));
                                            await refreshBeforeLoadingOldBills();
                                            await fetchArchivedSales();
                                        } else {
                                            alert('Please select both start and end dates');
                                        }
                                    }}
                                    style={{
                                        padding: '8px 20px',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        marginTop: '18px'
                                    }}
                                >
                                    Apply Filter
                                </button>
                                <button
                                    onClick={resetToCurrentSales}
                                    style={{
                                        padding: '8px 20px',
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        marginTop: '18px'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {dataSource === 'sales_history' && (
                            <div style={styles.viewTypeIndicator}>
                                <span>📚</span>Viewing Archived Bills
                                <button
                                    onClick={() => {
                                        resetToCurrentSales();
                                        setState(prev => ({ ...prev, customerType: null }));
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#92400e',
                                        cursor: 'pointer',
                                        marginLeft: '4px'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    {/* TOTAL FUNDS CARD */}
                    <div style={{
                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                        borderRadius: '16px',
                        padding: '12px 24px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        minWidth: '280px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                            borderRadius: '12px',
                            padding: '6px 10px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            minWidth: '260px',
                            maxWidth: '320px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                height: '28px'
                            }}>
                                {/* CASH */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                    <span style={{
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        letterSpacing: '0.5px'
                                    }}>
                                        💰 CASH
                                    </span>
                                    <span style={{
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        fontFamily: 'monospace',
                                        color: remainingBalances.cash_remaining >= 0 ? '#10b981' : '#ef4444',
                                        lineHeight: '1'
                                    }}>
                                        Rs {formatDecimal(remainingBalances.cash_remaining)}
                                    </span>
                                </div>

                                {/* BANK (CLICKABLE) */}
                                <div
                                    onClick={() => setShowBankBreakdownModal(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        flex: 1,
                                        cursor: 'pointer',
                                        padding: '2px 6px',
                                        borderRadius: '6px'
                                    }}
                                    onMouseEnter={(e) =>
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                                    }
                                    onMouseLeave={(e) =>
                                        e.currentTarget.style.background = 'transparent'
                                    }
                                >
                                    <span style={{
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        letterSpacing: '0.5px'
                                    }}>
                                        🏦 BANK
                                    </span>
                                    <span style={{
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        fontFamily: 'monospace',
                                        color: remainingBalances.total_bank_remaining >= 0 ? '#60a5fa' : '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        lineHeight: '1'
                                    }}>
                                        Rs {formatDecimal(remainingBalances.total_bank_remaining)}
                                        <span style={{ fontSize: '9px', color: '#64748b' }}>▼</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={styles.threeColumns}>
                    {/* LEFT: Completed Payments */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}>
                            <h2 style={styles.panelTitle}>
                                <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></span>
                                {dataSource === 'sales_history' ? 'Archived Completed' : 'Completed Payments'}
                            </h2>
                        </div>

                        <div style={{ padding: '12px 16px 0' }}>
                            <input
                                type="text"
                                placeholder="🔍 Search completed bills..."
                                value={state.appliedSearchQuery}
                                onChange={(e) => setState(prev => ({ ...prev, appliedSearchQuery: e.target.value.toUpperCase() }))}
                                style={styles.searchInput}
                            />
                        </div>

                        <div style={styles.panelContent}>
                            {filterAppliedBills.length === 0 ? (
                                <EmptyStateComponent message="No completed bills" />
                            ) : (
                                filterAppliedBills.map(bill => (
                                    <div
                                        key={bill.billNo}
                                        style={{
                                            ...styles.billItem,
                                            ...(state.selectedBill?.billNo === bill.billNo && state.isUpdatingCompletedBill
                                                ? styles.billSelected
                                                : {})
                                        }}
                                        onClick={() => handleBillClick(bill)}
                                        onContextMenu={(e) => handleContextMenu(e, bill)}
                                    >
                                        <div style={styles.billRow}>
                                            <div style={styles.billLeft}>
                                                <div style={styles.billNo}>{bill.billNo}</div>
                                                <div style={styles.billCustomer}>{bill.customerCode}</div>
                                            </div>

                                            <div style={styles.billRight}>
                                                <div style={styles.billTotal}>
                                                    Rs. {formatDecimal(bill.totalAmount)}
                                                </div>

                                                {getTotalReceived(bill) > 0 && (
                                                    <div style={styles.billGiven}>
                                                        Paid: {formatDecimal(getTotalReceived(bill))}
                                                    </div>
                                                )}

                                                {bill.remainingCredit > 0 && (
                                                    <div
                                                        style={{
                                                            fontSize: '10px',
                                                            color: '#10b981',
                                                            marginTop: '2px'
                                                        }}
                                                    >
                                                        ⚠️Credit: {formatDecimal(bill.remainingCredit)}
                                                    </div>
                                                )}

                                                {bill.remainingCredit === 0 && bill.creditAmount > 0 && (
                                                    <div
                                                        style={{
                                                            fontSize: '10px',
                                                            color: '#10b981',
                                                            marginTop: '2px'
                                                        }}
                                                    >
                                                        ✅ Credit Settled: {formatDecimal(bill.creditAmount)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    {/* CENTER: Bill Details */}
                    <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 320px)', minHeight: '500px', boxShadow: '0 20px 35px -10px rgba(0,0,0,0.15)' }}>
                        {/* Customer Type Selector */}
                        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                            <CustomerTypeSelector
                                selectedType={state.customerType}
                                onSelect={(type) => setState(prev => ({ ...prev, customerType: type }))}
                                onUnlockScreen={null} // Removed the forced 'debtor' state override here
                                disabled={state.isPrinting}
                                onDebtorClick={(code, billNo) => setState(prev => ({ ...prev, showDebtorForm: true, pendingDebtorBill: { customerCode: code, billNo } }))}
                                billCustomerCode={state.selectedBill?.customerCode}
                                billNo={state.selectedBill?.billNo}
                                selectedBillDebtor={selectedBillDebtor}
                                customers={state.customers}
                                viewOldBills={viewOldBills}
                            />
                        </div>

                        {/* Scrollable Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc', position: 'relative', opacity: (!state.customerType && !selectedBillDebtor?.Debtor_no && !viewOldBills) ? 0.5 : 1, pointerEvents: (!state.customerType && !selectedBillDebtor?.Debtor_no && !viewOldBills) ? 'none' : 'auto' }}>
                            {state.selectedBill ? (
                                <>
                                    {/* Bill Info Card */}
                                    <div style={{ padding: '24px', background: 'white', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                                            <div><div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Bill Number</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>#{state.selectedBill.billNo}</div></div>
                                            <div><div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Customer</div><div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{state.selectedBill.customerCode}</div></div>
                                            <div><span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '30px', fontSize: '12px', fontWeight: '600', background: state.selectedBill.givenAmountApplied === 'Y' ? '#10b981' : '#f59e0b', color: 'white' }}>{state.selectedBill.givenAmountApplied === 'Y' ? '✓ PAID' : '⏳ PENDING'}</span></div>
                                        </div>

                                        {/* Show Debtor Number if exists */}
                                        {selectedBillDebtor && selectedBillDebtor.Debtor_no && (
                                            <div style={{ marginTop: '12px', padding: '10px 12px', background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', borderRadius: '10px', borderLeft: '4px solid #8b5cf6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#6d28d9' }}>📋 Debtor Number:</div>
                                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#5b21b6', fontFamily: 'monospace' }}>{selectedBillDebtor.Debtor_no}</div>
                                            </div>
                                        )}

                                        {/* Show Outstanding Debt for BOTH pending AND completed bills that have remaining credit */}
                                        {selectedBillDebtor && selectedBillDebtor.remaining_amount > 0 && (
                                            <div style={{ marginTop: '16px', padding: '16px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: '14px', borderLeft: '4px solid #f59e0b' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                                                            {state.selectedBill.givenAmountApplied === 'Y' ? '⚠️ Unsettled Credit' : '⚠️ Outstanding Debt'}
                                                        </div>
                                                        <div style={{ fontSize: '22px', fontWeight: '700', color: '#dc2626' }}>Rs. {formatDecimal(selectedBillDebtor.remaining_amount)}</div>
                                                        <div style={{ fontSize: '11px', color: '#78350f' }}>
                                                            {state.selectedBill.givenAmountApplied === 'Y'
                                                                ? 'This credit needs to be settled. Make a payment to clear it.'
                                                                : 'Any payment applied to this debt first'}
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '6px 12px', background: selectedBillDebtor.status === 'paid' ? '#10b981' : selectedBillDebtor.status === 'partial' ? '#f59e0b' : '#ef4444', borderRadius: '30px', color: 'white', fontSize: '11px', fontWeight: '600' }}>
                                                        {selectedBillDebtor.status === 'paid' ? 'PAID' : selectedBillDebtor.status === 'partial' ? 'PARTIAL' : 'PENDING'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Items Table */}
                                    <div style={{ padding: '24px', background: 'white', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><span>📋</span> Items List</div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                                                <thead><tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '14px 12px', textAlign: 'left' }}>Item</th><th style={{ padding: '14px 12px', textAlign: 'right' }}>Kg</th><th style={{ padding: '14px 12px', textAlign: 'right' }}>Price</th><th style={{ padding: '14px 12px', textAlign: 'center' }}>Packs</th><th style={{ padding: '14px 12px', textAlign: 'right' }}>Total</th></tr></thead>
                                                <tbody>{state.selectedBill.sales.map((s, i) => { const total = (parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0); return (<tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '14px 12px', fontWeight: '500' }}>{s.item_name}<div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.supplier_code || 'ASW'}</div></td><td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatDecimal(s.weight)}</td><td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatDecimal(s.price_per_kg)}</td><td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ background: '#f1f5f9', padding: '2px 10px', borderRadius: '20px', fontSize: '12px' }}>{s.packs}</span></td><td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700', color: '#059669', fontFamily: 'monospace' }}>Rs. {formatDecimal(total)}</td></tr>); })}</tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Totals Card */}
                                    {/* Totals Card */}
                                    <div style={{ padding: '24px', background: 'white', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#475569' }}>
                                                <span>Subtotal:</span>
                                                <span style={{ fontFamily: 'monospace' }}>Rs. {formatDecimal(state.selectedBill.sales.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0))}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#475569' }}>
                                                <span>Bag Charges:</span>
                                                <span style={{ fontFamily: 'monospace' }}>Rs. {formatDecimal(state.selectedBill.sales.reduce((sum, s) => sum + ((parseFloat(s.packs) || 0) * (parseFloat(s.CustomerPackCost) || 0)), 0))}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', fontWeight: '700', fontSize: '18px', borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
                                                <span>Total Payable:</span>
                                                <span style={{ fontFamily: 'monospace', color: '#dc2626' }}>Rs. {formatDecimal(state.selectedBill.totalAmount)}</span>
                                            </div>
                                            {(state.selectedBill && (state.selectedBill.cashPayments > 0 || state.selectedBill.givenAmount > 0 || getTotalReceived(state.selectedBill) > 0)) && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#059669', fontWeight: '600' }}>
                                                    <span>💰 Total Received:</span>
                                                    <span style={{ fontFamily: 'monospace' }}>Rs. {formatDecimal(getTotalReceived(state.selectedBill))}</span>
                                                </div>
                                            )}
                                            {state.selectedBill.creditAmount > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#d97706', fontWeight: '600' }}>
                                                    <span>📋 Credit Taken:</span>
                                                    <span style={{ fontFamily: 'monospace' }}>Rs. {formatDecimal(state.selectedBill.creditAmount)}</span>
                                                </div>
                                            )}

                                            {/* DYNAMIC REMAINING AMOUNT BASED ON SECTION */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '16px',
                                                fontSize: '16px',
                                                fontWeight: '700',
                                                background: state.selectedBill.givenAmountApplied === 'Y' ? '#fef3c7' : '#fef2f2',
                                                borderRadius: '12px',
                                                marginTop: '8px'
                                            }}>
                                                <span>💰 Remaining:</span>
                                                <span style={{ fontFamily: 'monospace', fontSize: '18px', color: state.selectedBill.givenAmountApplied === 'Y' ? '#d97706' : '#dc2626' }}>
                                                    Rs. {formatDecimal(getDisplayRemaining(state.selectedBill, state.selectedBill.givenAmountApplied === 'Y'))}
                                                </span>
                                            </div>

                                            {/* Add a note for completed bills with credit remaining */}
                                            {state.selectedBill.givenAmountApplied === 'Y' && state.selectedBill.remainingCredit > 0 && (
                                                <div style={{ fontSize: '11px', color: '#92400e', textAlign: 'center', marginTop: '4px' }}>
                                                    ⚠️ This amount represents unsettled credit. Make a payment to settle it.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Section */}
                                    <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '16px' }}>💰 Enter Payment Amount</div>
                                        <input
                                            type="number"
                                            value={state.givenAmountInput}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (val === "") return setState(prev => ({ ...prev, givenAmountInput: "" }));
                                                let num = parseFloat(val);
                                                if (state.selectedBill) {
                                                    const maxAmount = getRemainingBillAmount(state.selectedBill);
                                                    if (num > maxAmount) {
                                                        alert(`Maximum allowed: Rs. ${formatDecimal(maxAmount)}`);
                                                        return;
                                                    }
                                                }
                                                setState(prev => ({ ...prev, givenAmountInput: val }));
                                            }}
                                            placeholder="0.00" disabled={state.isPrinting}
                                            style={{ width: '100%', padding: '16px', border: '2px solid #fbbf24', borderRadius: '14px', fontSize: '20px', fontWeight: '700', textAlign: 'center', background: 'white', fontFamily: 'monospace' }}
                                        />

                                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                                            <button onClick={async () => { const amt = parseFloat(state.givenAmountInput); if (!amt) alert("Enter amount"); else await processPayment(amt); }} disabled={state.isPrinting || !state.givenAmountInput} style={{ flex: 1, padding: '14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: state.isPrinting || !state.givenAmountInput ? 'not-allowed' : 'pointer', opacity: state.isPrinting || !state.givenAmountInput ? 0.5 : 1 }}>💵 Cash</button>
                                            <button onClick={() => { const amt = parseFloat(state.givenAmountInput); if (!amt) alert("Enter amount"); else setState(prev => ({ ...prev, pendingChequeAmount: amt, showChequeModal: true })); }} disabled={state.isPrinting || !state.givenAmountInput} style={{ flex: 1, padding: '14px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: state.isPrinting || !state.givenAmountInput ? 'not-allowed' : 'pointer', opacity: state.isPrinting || !state.givenAmountInput ? 0.5 : 1 }}>💳 Cheque</button>
                                            <button onClick={() => { const amt = parseFloat(state.givenAmountInput); if (!amt) alert("Enter amount"); else setState(prev => ({ ...prev, pendingBankToBankAmount: amt, showBankToBankModal: true })); }} disabled={state.isPrinting || !state.givenAmountInput} style={{ flex: 1, padding: '14px', background: '#ec489a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: state.isPrinting || !state.givenAmountInput ? 'not-allowed' : 'pointer', opacity: state.isPrinting || !state.givenAmountInput ? 0.5 : 1 }}>🏦 Transfer</button>
                                            <button onClick={handleCreditPayment} disabled={state.isPrinting || !state.givenAmountInput || parseFloat(state.givenAmountInput) === 0 || state.customerType === 'walking'} style={{ flex: 1, padding: '14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: (state.isPrinting || !state.givenAmountInput || parseFloat(state.givenAmountInput) === 0 || state.customerType === 'walking') ? 'not-allowed' : 'pointer', opacity: (state.isPrinting || !state.givenAmountInput || parseFloat(state.givenAmountInput) === 0 || state.customerType === 'walking') ? 0.5 : 1 }}>💳 Credit</button>
                                        </div>

                                        {/* Adjustment Type Selection Buttons */}
                                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px dashed #fbbf24' }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '12px' }}>🔧 OR Select Adjustment Type:</div>
                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                <button onClick={() => handleAdjustmentTypeSelect('bag_to_box')} style={{ flex: 1, padding: '12px', background: state.adjustmentType === 'bag_to_box' ? 'linear-gradient(135deg, #10b981, #059669)' : 'white', color: state.adjustmentType === 'bag_to_box' ? 'white' : '#475569', border: state.adjustmentType === 'bag_to_box' ? 'none' : '2px solid #e2e8f0', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><span>📦</span> Bag to Box</button>
                                                <button onClick={() => handleAdjustmentTypeSelect('bill_to_bill')} style={{ flex: 1, padding: '12px', background: state.adjustmentType === 'bill_to_bill' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'white', color: state.adjustmentType === 'bill_to_bill' ? 'white' : '#475569', border: state.adjustmentType === 'bill_to_bill' ? 'none' : '2px solid #e2e8f0', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><span>📄</span> Bill to Bill</button>
                                                <button onClick={() => handleAdjustmentTypeSelect('bad_debt')} style={{ flex: 1, padding: '12px', background: state.adjustmentType === 'bad_debt' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'white', color: state.adjustmentType === 'bad_debt' ? 'white' : '#475569', border: state.adjustmentType === 'bad_debt' ? 'none' : '2px solid #e2e8f0', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><span>⚠️</span> Bad Debt</button>
                                            </div>

                                            {state.adjustmentType === 'bag_to_box' && (
                                                <div style={{ marginTop: '16px', padding: '16px', background: '#fef3c7', borderRadius: '12px' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                        <input
                                                            ref={bagCountRef}
                                                            type="number"
                                                            placeholder="Number of Bags"
                                                            value={state.bagCount}
                                                            onChange={(e) => setState(prev => ({ ...prev, bagCount: e.target.value }))}
                                                            onKeyPress={(e) => handleAdjustmentKeyPress(e, bagValueRef)}
                                                            autoFocus={state.adjustmentType === 'bag_to_box'}
                                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                        />
                                                        <input
                                                            ref={bagValueRef}
                                                            type="number"
                                                            placeholder="Value per Bag (Rs.)"
                                                            value={state.bagValue}
                                                            onChange={(e) => setState(prev => ({ ...prev, bagValue: e.target.value }))}
                                                            onKeyPress={(e) => handleAdjustmentKeyPress(e, boxCountRef)}
                                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                        />
                                                        <input
                                                            ref={boxCountRef}
                                                            type="number"
                                                            placeholder="Number of Boxes"
                                                            value={state.boxCount}
                                                            onChange={(e) => setState(prev => ({ ...prev, boxCount: e.target.value }))}
                                                            onKeyPress={(e) => handleAdjustmentKeyPress(e, boxValueRef)}
                                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                        />
                                                        <input
                                                            ref={boxValueRef}
                                                            type="number"
                                                            placeholder="Value per Box (Rs.)"
                                                            value={state.boxValue}
                                                            onChange={(e) => setState(prev => ({ ...prev, boxValue: e.target.value }))}
                                                            onKeyPress={(e) => handleLastFieldKeyPress(e)}
                                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                        />
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#92400e' }}>Adjustment Amount: Rs. {calculateBagToBoxAdjustment().toFixed(2)}</div>
                                                </div>
                                            )}

                                            {state.adjustmentType === 'bill_to_bill' && (
                                                <div style={{ marginTop: '16px', padding: '16px', background: '#dbeafe', borderRadius: '12px' }}>
                                                    <input
                                                        ref={customerCodeRef}
                                                        type="text"
                                                        placeholder="Customer Code"
                                                        value={state.customerCodeField}
                                                        onChange={(e) => setState(prev => ({ ...prev, customerCodeField: e.target.value.toUpperCase() }))}
                                                        onKeyPress={(e) => handleAdjustmentKeyPress(e, customerBillNoRef)}
                                                        autoFocus={state.adjustmentType === 'bill_to_bill'}
                                                        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                    />
                                                    <input
                                                        ref={customerBillNoRef}
                                                        type="text"
                                                        placeholder="Customer Bill No"
                                                        value={state.customerBillNo}
                                                        onChange={(e) => setState(prev => ({ ...prev, customerBillNo: e.target.value }))}
                                                        onKeyPress={(e) => handleAdjustmentKeyPress(e, customerBillValueRef)}
                                                        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                    />
                                                    <input
                                                        ref={customerBillValueRef}
                                                        type="number"
                                                        placeholder="Bill Amount (Rs.)"
                                                        value={state.customerBillValue}
                                                        onChange={(e) => {
                                                            let val = e.target.value;
                                                            if (val === "") return setState(prev => ({ ...prev, customerBillValue: "" }));
                                                            let num = parseFloat(val);
                                                            if (state.selectedBill) {
                                                                const maxAmount = getRemainingBillAmount(state.selectedBill);
                                                                if (num > maxAmount) {
                                                                    alert(`Maximum allowed: Rs. ${formatDecimal(maxAmount)}`);
                                                                    return;
                                                                }
                                                            }
                                                            setState(prev => ({ ...prev, customerBillValue: val }));
                                                        }}
                                                        onKeyPress={(e) => handleLastFieldKeyPress(e)}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </div>
                                            )}

                                            {state.adjustmentType === 'bad_debt' && (
                                                <div style={{ marginTop: '16px', padding: '16px', background: '#fee2e2', borderRadius: '12px' }}>
                                                    <input
                                                        ref={badDebtNameRef}
                                                        type="text"
                                                        placeholder="Bad Debt Name/Reference"
                                                        value={state.badDebtName}
                                                        onChange={(e) => setState(prev => ({ ...prev, badDebtName: e.target.value }))}
                                                        onKeyPress={(e) => handleAdjustmentKeyPress(e, badDebtAmountRef)}
                                                        autoFocus={state.adjustmentType === 'bad_debt'}
                                                        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                    />
                                                    <input
                                                        ref={badDebtAmountRef}
                                                        type="number"
                                                        placeholder="Bad Debt Amount (Rs.)"
                                                        value={state.badDebtAmount}
                                                        onChange={(e) => {
                                                            let val = e.target.value;
                                                            if (val === "") return setState(prev => ({ ...prev, badDebtAmount: "" }));
                                                            let num = parseFloat(val);
                                                            if (state.selectedBill) {
                                                                const maxAmount = getRemainingBillAmount(state.selectedBill);
                                                                if (num > maxAmount) {
                                                                    alert(`Maximum allowed: Rs. ${formatDecimal(maxAmount)}`);
                                                                    return;
                                                                }
                                                            }
                                                            setState(prev => ({ ...prev, badDebtAmount: val }));
                                                        }}
                                                        onKeyPress={(e) => handleLastFieldKeyPress(e)}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </div>
                                            )}

                                            <button
                                                onClick={handleAdjustmentPayment}
                                                disabled={state.isPrinting}
                                                style={{ width: '100%', marginTop: '16px', padding: '14px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: state.isPrinting ? 'not-allowed' : 'pointer', opacity: state.isPrinting ? 0.5 : 1 }}
                                            >
                                                ✅ Apply {state.adjustmentType === 'bag_to_box' ? 'Bag to Box' : state.adjustmentType === 'bill_to_bill' ? 'Bill to Bill' : 'Bad Debt'} Adjustment
                                            </button>
                                        </div>
                                    </div>


                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <button onClick={handlePrintWithoutUpdate} disabled={state.isPrinting} style={{ width: '100%', padding: '14px', background: '#64748b', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: state.isPrinting ? 'not-allowed' : 'pointer' }}>🖨️ Re-print Bill</button>
                                        <button onClick={handleViewPaymentHistory} style={{ width: '100%', padding: '14px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>📜 View Payment History</button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
                                    <p style={{ fontSize: '16px', fontWeight: '500' }}>Click on any bill to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* RIGHT: Pending Payment */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}><h2 style={styles.panelTitle}><span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '50%' }}></span>{dataSource === 'sales_history' ? 'Archived Pending' : 'Pending Payment'}</h2></div>
                        <div style={{ padding: '12px 16px 0' }}><input type="text" placeholder="🔍 Search pending bills..." value={state.pendingSearchQuery} onChange={(e) => setState(prev => ({ ...prev, pendingSearchQuery: e.target.value.toUpperCase() }))} style={styles.searchInput} /></div>
                        <div style={styles.panelContent}>
                            {filterPendingBills.length === 0 ? <EmptyStateComponent message="No pending bills" /> : filterPendingBills.map(bill => (
                                <div key={bill.billNo} style={{ ...styles.billItem, ...(state.selectedBill?.billNo === bill.billNo && !state.isUpdatingCompletedBill ? styles.billSelected : {}) }} onClick={() => checkAndHandleDebtor(bill)}>
                                    <div style={styles.billRow}>
                                        <div style={styles.billLeft}>
                                            <div style={styles.billNo}>{bill.billNo}</div>
                                            <div style={styles.billCustomer}>{bill.customerCode}</div>
                                        </div>
                                        <div style={styles.billRight}>
                                            <div style={styles.billTotal}>Rs. {formatDecimal(bill.totalAmount)}</div>
                                            {bill.givenAmount > 0 && <div style={styles.billGiven}>Given: {formatDecimal(bill.givenAmount)}</div>}
                                            {bill.remainingCredit > 0 && (
                                                <div style={{ fontSize: '10px', color: '#d97706', marginTop: '2px' }}>
                                                    💳 Credit: {formatDecimal(bill.remainingCredit)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}

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
                        <div style={styles.statLabel}>Total Sales</div>
                        <div style={styles.statNumber}>Rs. {formatDecimal(stats.totalAmount)}</div>
                        <div style={styles.statSub}>all bills total</div>
                    </div>
                    {/* UPDATED: This card now has click handler */}
                    <div
                        style={{ ...styles.statBox, cursor: 'pointer' }}
                        onClick={() => {
                            modalOpenRef.current = true;
                            calculatePaymentTotals();
                            setShowAdjustmentSummary(true);
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                        }}
                    >
                        <div style={styles.statLabel}>
                            Total Received
                            <span style={{ fontSize: '10px', marginLeft: '4px', color: '#64748b' }}>(Excl. Credit) 📊</span>
                        </div>
                        <div style={styles.statNumber}>Rs. {formatDecimal(stats.totalGiven)}</div>
                        <div style={styles.statSub}>amount received (click for summary)</div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <nav style={{ backgroundColor: '#004d00', width: '100%', position: 'fixed', bottom: 0, zIndex: 1000, padding: '6px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '25px', alignItems: 'center' }}>
                    <button onClick={() => navigate('/debtor-creditor-report')} style={{ padding: '5px 16px', background: '#e83e8c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>CD Report</button>
                    <button onClick={() => toggleModal('itemReport')} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>එළවළු</button>
                    <button onClick={() => toggleModal('weightReport')} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>බර මත</button>
                    <button onClick={() => toggleModal('salesAdjustmentReport')} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>වෙනස් කිරීම</button>
                    <button onClick={() => window.location.href = `${basePath}/financial-report`} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>ආදායම් / වියදම්</button>
                    <button onClick={() => toggleModal('salesReport')} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>විකුණුම් වාර්තාව</button>
                    <button onClick={() => window.location.href = `${basePath}/supplier-profit`} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>සැපයුම් ලාභ</button>
                    <button onClick={() => window.location.href = `${basePath}/supplierreport`} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', padding: '5px 0' }}>සැපයුම් වාර්තාව</button>
                </div>
            </nav>

            {/* Modals */}
            <ChequeModal
                isOpen={state.showChequeModal}
                onClose={() => setState(prev => ({ ...prev, showChequeModal: false, pendingChequeAmount: 0 }))}
                onConfirm={async (details, bankName) => {
                    const chequeWithBank = { ...details, bank_name: bankName };
                    await processPayment(state.pendingChequeAmount, true, chequeWithBank);
                }}
                amount={state.pendingChequeAmount}
            />
            <BankToBankModal
                isOpen={state.showBankToBankModal}
                onClose={() => setState(prev => ({ ...prev, showBankToBankModal: false, pendingBankToBankAmount: 0 }))}
                onConfirm={async (details, bankName) => {
                    const transferWithBank = { ...details, bank_name: bankName };
                    await processPayment(state.pendingBankToBankAmount, false, null, true, transferWithBank);
                }}
                amount={state.pendingBankToBankAmount}
                customerCode={state.selectedBill?.customerCode}
                customerName={state.customers.find(c => c.short_name?.toUpperCase() === state.selectedBill?.customerCode?.toUpperCase())?.name}
            />
            <PaymentAdjustmentModal isOpen={state.showAdjustmentModal} onClose={() => setState(prev => ({ ...prev, showAdjustmentModal: false }))} onConfirm={async (data) => { await processPayment(data.amount, false, null, false, null, true, data); }} billNo={state.selectedBill?.billNo} customerCode={state.selectedBill?.customerCode} originalBillTotal={state.selectedBill?.totalAmount || 0} />
            <PaymentHistoryModal isOpen={state.showPaymentHistoryModal} onClose={() => setState(prev => ({ ...prev, showPaymentHistoryModal: false }))} payments={state.currentPayments} totalPaid={state.paymentHistoryTotalPaid} totalBill={state.paymentHistoryTotalBill} remaining={state.paymentHistoryRemaining} />
            <DebtorFormModal isOpen={state.showDebtorForm} onClose={() => setState(prev => ({ ...prev, showDebtorForm: false, pendingDebtorBill: null }))} onSave={handleDebtorSave} customerCode={state.pendingDebtorBill?.customerCode || ''} billNo={state.pendingDebtorBill?.billNo} />
            <DeleteConfirmationModal isOpen={state.showDeleteModal} onClose={() => setState(prev => ({ ...prev, showDeleteModal: false, deleteBillNo: null, deleteCustomerCode: null }))} onConfirm={handleDeleteBillPayments} billNo={state.deleteBillNo} customerCode={state.deleteCustomerCode} />

            {/* Report Modals */}
            <ItemReportModal isOpen={modals.itemReport} onClose={() => toggleModal('itemReport')} onGenerateReport={() => { }} loading={false} />
            <WeightReportModal isOpen={modals.weightReport} onClose={() => toggleModal('weightReport')} />
            <GrnSaleReportModal isOpen={modals.grnSaleReport} onClose={() => toggleModal('grnSaleReport')} />
            <SalesAdjustmentReportModal isOpen={modals.salesAdjustmentReport} onClose={() => toggleModal('salesAdjustmentReport')} />
            <GrnSalesOverviewReport isOpen={modals.grnSalesOverview} onClose={() => toggleModal('grnSalesOverview')} />
            <GrnSalesOverviewReport2 isOpen={modals.grnSalesOverview2} onClose={() => toggleModal('grnSalesOverview2')} />
            <SalesReportModal isOpen={modals.salesReport} onClose={() => toggleModal('salesReport')} />
            <GrnReportModal isOpen={modals.grnReport} onClose={() => toggleModal('grnReport')} />
            <DayProcessModal isOpen={modals.dayProcess} onClose={() => toggleModal('dayProcess')} />

            <AdjustmentSummaryModal
                isOpen={showAdjustmentSummary}
                onClose={() => {
                    modalOpenRef.current = false;
                    setShowAdjustmentSummary(false);
                }}
                totals={adjustmentTotals}
            />
            {/* Supplier Loan Details Modal */}
            <SupplierLoanDetailsModal
                isOpen={showSupplierLoanModal}
                onClose={() => {
                    modalOpenRef.current = false;
                    setShowSupplierLoanModal(false);
                }}
                stats={stats}
                adjustedLoanData={adjustedLoanData}
            />
            {/* Bank Breakdown Modal */}
            <BankBreakdownModal
                isOpen={showBankBreakdownModal}
                onClose={() => setShowBankBreakdownModal(false)}
                bankBreakdown={remainingBalances.bank_breakdown}
            />
        </div>
    );
} 