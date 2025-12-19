// src/components/LoanManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Select from 'react-select';
import api from '../../api'; // Your provided axios instance

// Utility to convert raw customer data into React-Select format
const formatCustomerOptions = (customers) => customers.map(c => ({
    value: c.id,
    label: `${c.short_name}`,
    shortName: c.short_name,
    creditLimit: c.credit_limit
}));

const getInitialFormState = () => ({
    loan_id: '',
    _method: 'POST',
    loan_type: 'old',
    settling_way: 'cash',
    customer_id: null,
    bill_no: '',
    amount: '',
    description: '',
    cheque_no: '',
    bank: '',
    cheque_date: new Date().toISOString().slice(0, 10),
    wasted_code: null,
    wasted_packs: '',
    wasted_weight: '',
    return_grn_code: null,
    return_item_code: '',
    return_bill_no: null,
    return_weight: '',
    return_packs: '',
    return_reason: '',
});

const LoanManager = () => {
    const [form, setForm] = useState(getInitialFormState());
    const [customersRaw, setCustomersRaw] = useState([]); // Stores raw customer data array
    const [grnCodes, setGrnCodes] = useState([]);
    const [loans, setLoans] = useState([]);
    const [billNos, setBillNos] = useState([]);
    const [totalLoanDisplay, setTotalLoanDisplay] = useState('');
    const [creditLimitMessage, setCreditLimitMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);

    // --- Derived State Helpers ---
    const isCustomerRelated = form.loan_type === 'old' || form.loan_type === 'today';
    const isSettlingWayVisible = form.loan_type === 'old';
    const isCheque = form.settling_way === 'cheque';
    // Removed isGrnDamage check since the radio button and fields are being removed
    const isReturns = form.loan_type === 'returns';
    const isIncomeOrExpense = form.loan_type === 'ingoing' || form.loan_type === 'outgoing';

    // Description is editable if it's I/E, GRN, or we are in edit mode. Since GRN is removed, we simplify.
    const isDescriptionEditable = isIncomeOrExpense || isEditMode;


    // --- Data Fetching ---

    // Fetches customers from the dedicated API route /customers
    const fetchCustomers = useCallback(async () => {
        try {
            const { data } = await api.get('/customers');
            setCustomersRaw(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    }, []);

    // Fetches today's loans and GRN codes from /customers-loans/data
    const fetchData = useCallback(async () => {
        try {
            const { data } = await api.get('/customers-loans/data');
            setGrnCodes(data.grnCodes.map(code => ({ value: code, label: code })));
            setLoans(data.loans);
        } catch (error) {
            console.error('Error fetching initial loan data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchBillNos = useCallback(async () => {
        try {
            const { data } = await api.get('/api/all-bill-nos');
            setBillNos(data.map(bill => ({ value: bill, label: bill })));
        } catch (error) {
            console.error('Error fetching bill numbers:', error);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
        fetchData();
        fetchBillNos();
    }, [fetchCustomers, fetchData, fetchBillNos]);

    // --- Handlers ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name) => (selectedOption) => {
        setForm(prev => ({
            ...prev,
            [name]: selectedOption ? selectedOption.value : null,
        }));
    };

    const handleLoanTypeChange = (e) => {
        const { value } = e.target;

        // --- Core Logic for hiding fields on I/E and Returns ---
        const resetFields = (value === 'ingoing' || value === 'outgoing' || value === 'returns')
            ? {
                customer_id: null,
                bill_no: '',
                settling_way: 'cash' // Reset settling way
            }
            : {};

        // Hide edit mode on certain transitions
        if (value === 'returns') {
            setIsEditMode(false);
        }

        setForm(prev => ({
            ...prev,
            loan_type: value,
            ...resetFields
        }));
    };

    // Note: handleWastedCodeChange is kept but won't be triggered by any visible fields
    const handleWastedCodeChange = async (selectedOption) => {
        setForm(prev => ({ ...prev, wasted_code: selectedOption ? selectedOption.value : null, return_item_code: '' }));
        const code = selectedOption?.value;
        if (code) {
            try {
                const { data } = await api.get(`/api/grn-entry/${code}`);
                setForm(prev => ({
                    ...prev,
                    wasted_code: code,
                    return_grn_code: code,
                    return_item_code: data.item_code
                }));
            } catch (error) {
                console.error('Error fetching GRN item code:', error);
            }
        }
    };

    // --- Side Effects ---

    const fetchLoanTotal = useCallback(async (customerId, showTotalLoan) => {
        if (customerId && showTotalLoan) {
            try {
                const res = await api.get(`/customers/${customerId}/loans-total`);
                const totalAmount = Math.abs(parseFloat(res.data.total_amount));
                setTotalLoanDisplay(`(Total Loans: ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
            } catch (error) {
                setTotalLoanDisplay('(Could not fetch total loans)');
            }
        } else {
            setTotalLoanDisplay('');
        }
    }, []);

    // 1. Update Description / Total Loan
    useEffect(() => {
        const { loan_type, settling_way, customer_id, bank } = form;
        let newDescription = '';
        let showTotalLoan = isCustomerRelated; // Only show total loan for customer-related types (old/today)

        if (loan_type === 'old') {
            newDescription = settling_way === 'cheque' ? `Cheque payment from ${bank || 'bank'}` : "වෙළෙන්දාගේ ලාද පරණ නය";
        } else if (loan_type === 'today') {
            newDescription = "වෙළෙන්දාගේ අද දින නය ගැනීම";
        } else if (loan_type === 'ingoing') {
            newDescription = "වෙනත් ලාභීම/ආදායම්";
        } else if (loan_type === 'outgoing') {
            // Description is editable for outgoing/ingoing, avoid overwriting auto-description
        }

        if (!isEditMode && !isIncomeOrExpense) {
            setForm(prev => ({ ...prev, description: newDescription }));
        }

        fetchLoanTotal(customer_id, showTotalLoan);

    }, [form.loan_type, form.settling_way, form.customer_id, form.bank, isEditMode, isCustomerRelated, isIncomeOrExpense, fetchLoanTotal]);


    // 2. Check Credit Limit
    useEffect(() => {
        const { loan_type, customer_id, amount } = form;
        const submitButton = document.getElementById('submitButton');

        const selectedCustomerData = customersRaw.find(c => c.id === customer_id);
        const creditLimit = selectedCustomerData?.credit_limit;

        setCreditLimitMessage('');
        if (submitButton) submitButton.disabled = false;

        if (isCustomerRelated && customer_id && parseFloat(amount) > 0) {
            if (creditLimit && parseFloat(amount) > parseFloat(creditLimit)) {
                setCreditLimitMessage('Amount exceeds credit limit!');
                if (submitButton) submitButton.disabled = true;
            }
        }
    }, [form.loan_type, form.customer_id, form.amount, customersRaw, isCustomerRelated]);


    // --- Form Submission (Unchanged) ---
    const handleSubmit = async (e, isReturn = false) => {
        e.preventDefault();
        setLoading(true);

        let formData = { ...form };
        let url = isEditMode ? `/customers-loans/${form.loan_id}` : '/customers-loans';

        if (isReturn) {
            formData = { ...form, loan_type: 'returns', amount: 0, description: 'Return entry' };
            url = '/customers-loans';
        }

        try {
            const method = isEditMode ? 'POST' : 'POST';
            const payload = isEditMode ? { ...formData, _method: 'PUT' } : formData;

            const response = await api({
                url,
                method,
                data: payload,
            });

            alert(response.data.message);
            handleCancelEdit();
            fetchData();
            fetchCustomers();
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.errors
                ? Object.values(error.response.data.errors).flat().join('\n')
                : 'An unexpected error occurred.';
            alert(errorMsg);
            console.error('Submission error:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Edit and Reset ---

    const handleEdit = (loan) => {
        setIsEditMode(true);
        setForm({
            ...getInitialFormState(), // Reset all unused fields first
            loan_id: loan.id,
            _method: 'PUT',
            loan_type: loan.loan_type,
            settling_way: loan.settling_way || 'cash',
            customer_id: loan.customer_id,
            bill_no: loan.bill_no || '',
            amount: Math.abs(loan.amount),
            description: loan.description,
            cheque_no: loan.cheque_no || '',
            bank: loan.bank || '',
            cheque_date: loan.cheque_date || new Date().toISOString().slice(0, 10),
            // GRN fields are loaded if the loan type was grn_damage, but we handle the type based on the radio buttons now.
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setForm(getInitialFormState());
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;

        try {
            await api.delete(`/customers-loans/${id}`);
            alert('Record deleted successfully!');
            fetchData();
            fetchCustomers();
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to delete record.';
            alert(errorMsg);
            console.error('Deletion error:', error);
        }
    };

    // Memoize options creation from raw data
    const customerOptions = useMemo(() => formatCustomerOptions(customersRaw), [customersRaw]);
    const billOptions = useMemo(() => billNos.map(bill => ({ value: bill, label: bill })), [billNos]);

    // Custom filter for single-character short-name search
    const customFilter = (option, searchText) => {
        const term = searchText.toLowerCase().trim();
        const optionText = option.label.toLowerCase();

        if (term.length === 1 && option.data && option.data.shortName) {
            return option.data.shortName.toLowerCase().startsWith(term);
        }
        return optionText.includes(term);
    };

    if (loading) return <div className="text-center">Loading...</div>;


    return (
        <div className="container my-4">
            <style>{`
                /* Paste your provided CSS here for styling consistency */
                body { background-color: #99ff99 !important; }
                .custom-card { background-color: #004d00 !important; color: #fff; padding: 25px; border-radius: 10px; }
                .form-control, .form-select { padding: 0.15rem 0.4rem !important; font-size: 0.75rem !important; border: 1px solid black !important; color: black !important; font-weight: bold !important; background-color: white !important; }
                .table td, .table th { padding: 0.3rem; font-size: 0.875rem; }
                label { font-weight: 500; margin-bottom: 0.2rem; color: #000; }
                .table th { background-color: #006600; color: white; }
                h3, h4 { color: #ffffff; }
                .bg-custom-dark { background-color: #004d00 !important; color: #fff; }
                .text-form-label { color: #fff !important; font-size: 0.85rem; font-weight: 500; margin-bottom: 0.2rem; }
                .form-control-sm, .form-select-sm { padding: 0.15rem 0.4rem !important; font-size: 0.75rem !important; border: 1px solid black !important; color: black !important; font-weight: bold !important; background-color: white !important; }
                .bg-custom-dark strong { color: #fff !important; }
                .btn-green-submit { background-color: #28a745; color: #fff; }
                .btn-green-submit:hover { background-color: #218838; color: #fff; }
                /* React-Select Overrides */
                .select__control { min-height: 25px !important; border-color: black !important; box-shadow: none !important; }
                .select__value-container { padding: 0.15rem 0.4rem !important; }
                .select__indicator-separator { width: 0 !important; }
                .select__indicators { height: 25px; }
                .select__dropdown-indicator { padding: 4px; }
                .select__placeholder { font-size: 0.75rem !important; font-weight: bold !important; color: #aaa !important;}
                .select__single-value { font-size: 0.75rem !important; font-weight: bold !important; color: black !important; }
            `}</style>

            <div className="custom-card">
                {/* Loan Entry Form */}
                <form onSubmit={e => handleSubmit(e, isReturns)} className="p-3 border border-2 border-dark rounded bg-custom-dark">

                    <div className="row gy-2">
                        {/* Loan Type Radios (GRN Damages removed) */}
                        <div className="col-md-8">
                            {['old', 'today', 'ingoing', 'outgoing', 'returns'].map(type => (
                                <label key={type} className="me-3" style={{ color: 'white' }}>
                                    <input
                                        type="radio"
                                        name="loan_type"
                                        value={type}
                                        checked={form.loan_type === type}
                                        onChange={handleLoanTypeChange}
                                    />
                                    {' '}
                                    {type === 'old' && 'වෙළෙන්දාගේ ලාද පරණ නය'}
                                    {type === 'today' && 'වෙළෙන්දාගේ අද දින නය ගැනීම'}
                                    {type === 'ingoing' && 'වෙනත් ලාභීම/ආදායම්'}
                                    {type === 'outgoing' && 'වි‍යදම්'}
                                    {type === 'returns' && 'Returns'}
                                </label>
                            ))}
                        </div>

                        {/* Settling Way Section (Visible only for 'old' loan type) */}
                        {isSettlingWayVisible && (
                            <div className="col-md-4">
                                <label className="text-form-label" style={{ color: 'white' }}><strong>Settling Way:</strong></label><br />
                                {['cash', 'cheque'].map(way => (
                                    <label key={way} className="me-3" style={{ color: 'white' }}>
                                        <input
                                            type="radio"
                                            name="settling_way"
                                            value={way}
                                            checked={form.settling_way === way}
                                            onChange={handleInputChange}
                                        />
                                        {' '}
                                        {way.charAt(0).toUpperCase() + way.slice(1)}
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* Customer Section (Visible only for 'old' or 'today' loan types) */}
                        {isCustomerRelated && (
                            <div className="col-md-4">
                                <label htmlFor="customer_id" className="text-form-label">
                                    ගෙණුම්කරු
                                </label>

                                <Select
                                    id="customer_id"
                                    name="customer_id"
                                    options={customerOptions}
                                    onChange={handleSelectChange('customer_id')}
                                    value={customerOptions.find(
                                        opt => opt.value === form.customer_id
                                    )}
                                    filterOption={customFilter}
                                    placeholder="-- Select Customer --"
                                    isClearable
                                    classNamePrefix="select"

                                    styles={{
                                        option: (provided, state) => ({
                                            ...provided,
                                            color: 'black',
                                            fontWeight: 'bold',
                                            backgroundColor: state.isFocused ? '#f0f0f0' : 'white'
                                        }),
                                        singleValue: (provided) => ({
                                            ...provided,
                                            color: 'black',
                                            fontWeight: 'bold'
                                        }),
                                        placeholder: (provided) => ({
                                            ...provided,
                                            color: '#666'
                                        })
                                    }}
                                />
                            </div>

                        )}

                        {/* Bill No Section (Visible only for 'old' or 'today' loan types, and if not Cheque) */}
                        {isCustomerRelated && !isCheque && (
                            <div className="col-md-3">
                                <label htmlFor="bill_no" className="text-form-label">Bill No</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    name="bill_no"
                                    value={form.bill_no}
                                    onChange={handleInputChange}
                                />
                            </div>
                        )}

                        {/* Loan Details Row (Amount/Description) 
                        Visible if NOT returns and NOT GRN Damage (which we removed)
                        */}
                        {!isReturns && (
                            <div id="loan-details-row" className="row gx-2">
                                <div className={`col-md-${isIncomeOrExpense ? 4 : 2}`} id="amount_section">
                                    <label htmlFor="amount" className="text-form-label">මුදල</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control form-control-sm"
                                        name="amount"
                                        value={form.amount}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    {isCustomerRelated && (
                                        <span id="creditLimitMessage" className="text-danger" style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{creditLimitMessage}</span>
                                    )}
                                </div>
                                <div className={`col-md-${isIncomeOrExpense ? 8 : 5}`} id="description_section">
                                    <label htmlFor="description" className="text-form-label">විස්තරය</label>
                                    {form.loan_type === 'outgoing' ? (
                                        <>
                                            <input
                                                list="descriptionOptions"
                                                className="form-control form-control-sm"
                                                name="description"
                                                id="description"
                                                placeholder="Type or select"
                                                value={form.description}
                                                onChange={handleInputChange}
                                                required
                                            />
                                            <datalist id="descriptionOptions">
                                                {['Salary', 'Fuel', 'Electricity', 'Food', 'WaterBill', 'Other'].map(opt => (
                                                    <option key={opt} value={opt} />
                                                ))}
                                            </datalist>
                                        </>
                                    ) : (
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            name="description"
                                            id="description"
                                            value={form.description}
                                            onChange={handleInputChange}
                                            required
                                            disabled={!isDescriptionEditable}
                                        />
                                    )}
                                    {isCustomerRelated && (
                                        <span id="totalAmountDisplay" className="text-white-50" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{totalLoanDisplay}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Cheque Fields (Visible only for 'old' loan type and 'cheque' settling way) */}
                        {isSettlingWayVisible && isCheque && (
                            <div id="chequeFields" className="col-md-5 ms-auto">
                                <div className="border rounded p-2 bg-light" style={{ borderColor: '#006600 !important' }}>
                                    <h6 className="text-success fw-bold mb-2" style={{ borderBottom: '1px solid #006600' }}>Cheque Details</h6>
                                    <div className="row g-2">
                                        <div className="col-4">
                                            <label htmlFor="cheque_date" className="form-label mb-1">Cheque Date</label>
                                            <input type="date" className="form-control form-control-sm" name="cheque_date" value={form.cheque_date} onChange={handleInputChange} />
                                        </div>
                                        <div className="col-4">
                                            <label htmlFor="cheque_no" className="form-label mb-1">Cheque No</label>
                                            <input type="text" className="form-control form-control-sm" name="cheque_no" value={form.cheque_no} onChange={handleInputChange} />
                                        </div>
                                        <div className="col-4">
                                            <label htmlFor="bank" className="form-label mb-1">Bank</label>
                                            <input type="text" className="form-control form-control-sm" name="bank" id="bank" value={form.bank} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Returns Section (Placeholder for full Returns logic) */}
                        {isReturns && (
                            <div id="returnsFields" className="col-md-12">
                                <div className="border rounded p-2 bg-light" style={{ borderColor: '#006600 !important' }}>
                                    <h6 className="text-success fw-bold mb-2" style={{ borderBottom: '1px solid #006600' }}>Returns Details</h6>
                                    {/* ... Returns fields should be fully implemented here, using Select components for GRN and Bill Nos ... */}
                                    <div className="alert alert-info">Returns input fields placeholder.</div>
                                    <div className="mt-3 text-end">
                                        <button type="submit" className="btn btn-success btn-sm" id="returnSubmitButton" onClick={(e) => handleSubmit(e, true)}>Add Return</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Main Submit Section */}
                        {!isReturns && (
                            <div className="col-12 mt-3" id="mainSubmitSection">
                                <button
                                    type="submit"
                                    className={`btn ${isEditMode ? 'btn-success' : 'btn-light text-dark'}`}
                                    id="submitButton"
                                    disabled={loading || (isCustomerRelated && creditLimitMessage)}
                                >
                                    {isEditMode ? 'Update Loan' : 'Add Loan'}
                                </button>
                                {isEditMode && (
                                    <button type="button" className="btn btn-secondary ms-2" onClick={handleCancelEdit}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </form>

                {/* Loan Records Table */}
                <h4 className="mt-4">Loan Records</h4>
                <div className="table-responsive">
                    <table className="table table-bordered table-sm mt-2 bg-white text-dark">
                        <thead>
                            <tr>
                                <th>විස්තරය</th>
                                <th>මුදල</th>
                                <th>විලා</th>
                                <th>Loan Type</th>
                                <th>Bill No</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loans.length > 0 ? (
                                loans.map(loan => (
                                    <tr key={loan.id}>
                                        <td>{loan.description}</td>
                                        <td>{loan.display_amount}</td>
                                        <td>{loan.customer_short_name}</td>
                                        <td>{loan.loan_type.charAt(0).toUpperCase() + loan.loan_type.slice(1)}</td>
                                        <td>{loan.bill_no || '-'}</td>
                                        <td>
                                            <button type="button" className="btn btn-sm btn-warning me-1" onClick={() => handleEdit(loan)}>Edit</button>
                                            <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(loan.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center">No loan records found for today.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Report and Utility Buttons (Direct links can be kept or wrapped in modals/components) */}
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <a href="/financial/report" target="_blank" className="btn btn-dark">ආදායම් / වියදම්</a>
                    <a href="#" className="btn btn-dark" onClick={() => alert('Implement Loan Report Modal')}>ණය වාර්තාව</a>
                    <a href="/returns/report" className="btn btn-dark">නැවත ලබා දීම් වාර්තාව</a>
                    <a href="/reports/cheque-payments" className="btn btn-dark">චෙක් ගෙවීම් වාර්තාව බලන්න</a>
                    <button type="button" className="btn btn-dark" onClick={() => alert('Implement Set Balance Modal')}>Set Balance</button>
                </div>
            </div>
        </div>
    );
};

export default LoanManager;