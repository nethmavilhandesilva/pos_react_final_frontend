import React, { useState, useEffect, useRef } from 'react';
import api from '../../api'; // Using your provided API setup

// Define the order of fields for keyboard navigation
const INPUT_ORDER = [
    'select_by_type', 
    'item_selector',      // Placeholder for item
    'supplier_selector',  // Placeholder for supplier
    'starting_price', 
    'end_price', 
    'commission_amount'
];

const defaultFormData = {
    // Fields for Item commission
    item_code: '',
    item_name: '',
    // Fields for Supplier commission
    supplier_code: '',
    supplier_name: '',
    // Common fields
    starting_price: '',
    end_price: '',
    commission_amount: '',
};

// NOTE: supplierOptions must be passed from the parent component
const CommissionForm = ({ itemOptions, supplierOptions = [], initialData, onSubmissionSuccess, onCancelEdit }) => {
    
    const [formData, setFormData] = useState(defaultFormData);
    const [status, setStatus] = useState('');
    
    // State to track the selection type (Items, Suppliers, All)
    const [selectByType, setSelectByType] = useState(initialData ? 
        (initialData.item_code ? 'Items' : initialData.supplier_code ? 'Suppliers' : 'All') : 'Items');
    
    const isEditing = !!initialData;
    
    // 🔑 1. Create refs for keyboard navigation
    const formRefs = {
        select_by_type: useRef(null), 
        item_selector: useRef(null),
        supplier_selector: useRef(null), 
        starting_price: useRef(null),
        end_price: useRef(null),
        commission_amount: useRef(null),
        submit_button: useRef(null),
    };

    // --- Effect to populate form/reset ---
    useEffect(() => {
        if (initialData) {
            const type = initialData.item_code ? 'Items' : initialData.supplier_code ? 'Suppliers' : 'All';
            setSelectByType(type);
            
            setFormData({
                item_code: initialData.item_code || '',
                item_name: initialData.item_name || '',
                supplier_code: initialData.supplier_code || '',
                supplier_name: initialData.supplier_name || '',
                starting_price: initialData.starting_price || '',
                end_price: initialData.end_price || '',
                commission_amount: initialData.commission_amount || '',
            });
        } else {
            setFormData(defaultFormData);
            setSelectByType('Items'); 
        }
        
        if (!isEditing && formRefs.select_by_type.current) {
            formRefs.select_by_type.current.focus();
        }
    }, [initialData, isEditing]);
    
    // --- Handle Selection Type Change ---
    const handleSelectByTypeChange = (e) => {
        const newType = e.target.value;
        setSelectByType(newType);
        
        // Reset item/supplier specific data
        setFormData(prevData => ({
            ...prevData,
            item_code: '',
            item_name: '',
            supplier_code: '',
            supplier_name: '',
        }));
    };

    // --- Handle Input Changes (including Item/Supplier selection) ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        
        let newFormData = { ...formData };
        
        if (name === 'item_selector') {
            const selectedItem = itemOptions.find(item => item.item_code === value);
            newFormData.item_code = selectedItem ? selectedItem.item_code : '';
            newFormData.item_name = selectedItem ? selectedItem.item_name : '';
        } else if (name === 'supplier_selector') {
            const selectedSupplier = supplierOptions.find(supplier => supplier.code === value);
            newFormData.supplier_code = selectedSupplier ? selectedSupplier.code : '';
            newFormData.supplier_name = selectedSupplier ? selectedSupplier.name : '';
        } else {
            newFormData[name] = value;
        }
        
        setFormData(newFormData);
    };

    // 🔑 2. Keyboard Navigation Handler
    const handleKeyDown = (e, currentFieldName) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 

            // Define the dynamic order based on the current selection type
            let currentInputOrder = ['select_by_type'];
            if (selectByType === 'Items') {
                currentInputOrder.push('item_selector');
            } else if (selectByType === 'Suppliers') {
                 currentInputOrder.push('supplier_selector');
            }
            currentInputOrder.push('starting_price', 'end_price', 'commission_amount');
            
            const currentIndex = currentInputOrder.indexOf(currentFieldName);

            if (currentFieldName === 'commission_amount') {
                formRefs.submit_button.current.click(); 
            } else {
                const nextFieldName = currentInputOrder[currentIndex + 1];
                
                if (formRefs[nextFieldName]?.current) {
                    formRefs[nextFieldName].current.focus();
                }
            }
        }
    };
    
    // --- Handle Form Submission (Create or Update) ---
    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setStatus('Submitting...');
        
        // 1. Prepare Payload based on selection type
        let payload = {
            starting_price: formData.starting_price,
            end_price: formData.end_price,
            commission_amount: formData.commission_amount,
        };

        let entityName = "Global Rule";

        if (selectByType === 'Items') {
            if (!formData.item_code) return setStatus('Please select an Item.');
            payload.item_code = formData.item_code;
            entityName = formData.item_name;
        } else if (selectByType === 'Suppliers') {
            if (!formData.supplier_code) return setStatus('Please select a Supplier.');
            payload.supplier_code = formData.supplier_code;
            entityName = formData.supplier_name;
        } 
        
        // General required field check
        if (!payload.starting_price || !payload.end_price || !payload.commission_amount) {
            return setStatus('Please fill all price and amount fields.');
        }

        try {
            let response;
            const endpoint = `/commissions${isEditing ? '/' + initialData.id : ''}`;

            if (isEditing) {
                response = await api.patch(endpoint, payload);
            } else {
                response = await api.post(endpoint, payload);
                setFormData(defaultFormData); 
                setSelectByType('Items'); 
            }

            const message = `✅ Success! Commission ${isEditing ? 'updated' : 'created'} for **${entityName}**.`;
            setStatus(message);
            onSubmissionSuccess(message); 

        } catch (error) {
            console.error('Submission error:', error.response ? error.response.data : error.message);
            setStatus(`❌ Submission failed. ${error.response?.data?.message || 'Check console for details.'}`);
        }
    };

    // --- Styling Objects ---
    const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' };
    const buttonStyle = { padding: '10px 15px', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flexGrow: 1 };
    
    const selectorColumnSpan = isEditing ? 'span 2' : 'span 1';

    return (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: isEditing ? '1fr 1fr 1fr 1fr 1fr auto' : '1fr 1fr 1fr 1fr 1fr', gap: '15px' }}>
            
            {/* 0. Select By Type */}
            <div style={{ gridColumn: isEditing ? 'span 1' : 'span 1' }}>
                <label htmlFor="select_by_type">තෝරන්න:</label>
                <select
                    id="select_by_type"
                    name="select_by_type"
                    value={selectByType} 
                    onChange={handleSelectByTypeChange}
                    onKeyDown={(e) => handleKeyDown(e, 'select_by_type')} 
                    required
                    disabled={isEditing} 
                    ref={formRefs.select_by_type} 
                    style={inputStyle}
                >
                    <option value="Items">Items</option>
                    <option value="Suppliers">Suppliers</option>
                    <option value="All">All (Global Rule)</option>
                </select>
            </div>
            
            {/* 1. Conditional Selector Field (Items / Suppliers) */}
            {(selectByType === 'Items' || selectByType === 'Suppliers') && (
                <div style={{ gridColumn: selectorColumnSpan }}>
                    <label htmlFor={selectByType === 'Items' ? 'item_selector' : 'supplier_selector'}>
                        {selectByType === 'Items' ? 'Item:' : 'Supplier:'}
                    </label>
                    
                    {selectByType === 'Items' ? (
                        /* Items Dropdown */
                        <select
                            id="item_selector"
                            name="item_selector"
                            value={formData.item_code} 
                            onChange={handleChange}
                            onKeyDown={(e) => handleKeyDown(e, 'item_selector')} 
                            required={selectByType === 'Items'}
                            disabled={isEditing} 
                            ref={formRefs.item_selector} 
                            style={inputStyle}
                        >
                            <option value="">-- අයිතමය තෝරන්න --</option>
                            {itemOptions.map((item) => (
                                <option key={item.item_code} value={item.item_code}>
                                    {item.item_code} - {item.item_name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        /* Suppliers Dropdown */
                        <select
                            id="supplier_selector"
                            name="supplier_selector"
                            value={formData.supplier_code} 
                            onChange={handleChange}
                            onKeyDown={(e) => handleKeyDown(e, 'supplier_selector')} 
                            required={selectByType === 'Suppliers'}
                            disabled={isEditing} 
                            ref={formRefs.supplier_selector} 
                            style={inputStyle}
                        >
                            <option value="">-- සැපයුම්කරුවෙක් තෝරන්න --</option>
                            {supplierOptions.map((supplier) => (
                                <option key={supplier.code} value={supplier.code}>
                                    {supplier.code} - {supplier.name}
                                </option>
                            ))}
                        </select>
                    )}
                    
                    {isEditing && (selectByType === 'Items' || selectByType === 'Suppliers') && (
                        <p style={{ margin: '0', fontSize: '12px', color: '#555' }}>
                            {selectByType === 'Items' ? 'Item: ' : 'Supplier: '}
                            **{selectByType === 'Items' ? formData.item_name : formData.supplier_name}**
                        </p>
                    )}
                </div>
            )}
            
            {/* If Select By All, show a note instead of a dropdown */}
            {selectByType === 'All' && (
                <div style={{ gridColumn: selectorColumnSpan, display: 'flex', alignItems: 'end', paddingBottom: '5px' }}>
                    
                </div>
            )}


            {/* 2. Starting Price (Grid column adjusts for 'All' selection) */}
            <div style={{ gridColumn: selectByType === 'All' ? 'span 1' : undefined }}>
                <label htmlFor="starting_price">ආරම්භක මිල:</label>
                <input
                    type="number"
                    id="starting_price"
                    name="starting_price"
                    value={formData.starting_price}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'starting_price')}
                    min="0"
                    step="0.01"
                    required
                    ref={formRefs.starting_price}
                    style={inputStyle}
                />
            </div>

            {/* 3. End Price */}
            <div>
                <label htmlFor="end_price">අවසාන මිල:</label>
                <input
                    type="number"
                    id="end_price"
                    name="end_price"
                    value={formData.end_price}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'end_price')}
                    min={formData.starting_price || 0}
                    step="0.01"
                    required
                    ref={formRefs.end_price}
                    style={inputStyle}
                />
            </div>

            {/* 4. Commission Amount */}
            <div>
                <label htmlFor="commission_amount">මුදල (Rs):</label>
                <input
                    type="number"
                    id="commission_amount"
                    name="commission_amount" 
                    value={formData.commission_amount}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'commission_amount')}
                    min="0"
                    step="0.01"
                    required
                    ref={formRefs.commission_amount}
                    style={inputStyle}
                />
            </div>

            {/* 5. Action Buttons */}
            <div style={{ alignSelf: 'end', display: 'flex', gap: '5px', gridColumn: isEditing ? undefined : 'span 1' }}>
                <button 
                    type="submit" 
                    ref={formRefs.submit_button}
                    style={{ ...buttonStyle, backgroundColor: isEditing ? '#ffc107' : '#28a745' }}
                >
                    {isEditing ? 'Save Changes' : 'එකතු කරන්න'}
                </button>
                {isEditing && (
                    <button 
                        type="button" 
                        onClick={onCancelEdit}
                        style={{ ...buttonStyle, backgroundColor: '#6c757d' }}
                    >
                        සංස්කරණය අවලංගු කරන්න
                    </button>
                )}
            </div>
            
            {/* Status Message */}
            {status && <p style={{ gridColumn: isEditing ? 'span 6' : 'span 5', textAlign: 'center', color: status.includes('Success') ? 'green' : 'red' }}>{status}</p>}

        </form>
    );
};

export default CommissionForm;