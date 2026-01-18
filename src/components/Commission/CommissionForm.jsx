import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';

const defaultFormData = {
    item_code: '',
    item_name: '',
    supplier_code: '',
    supplier_name: '',
    starting_price: '',
    end_price: '',
    commission_amount: '',
};

const CommissionForm = ({ itemOptions, supplierOptions = [], initialData, onSubmissionSuccess, onCancelEdit }) => {
    
    const [formData, setFormData] = useState(defaultFormData);
    const [status, setStatus] = useState('');
    const [password, setPassword] = useState(''); 
    
    const [selectByType, setSelectByType] = useState(initialData ? 
        (initialData.item_code ? 'Items' : initialData.supplier_code ? 'Suppliers' : 'All') : 'Items');
    
    const isEditing = !!initialData;
    const isUnlocked = password === 'nethma123';

    const formRefs = {
        form_password: useRef(null),
        select_by_type: useRef(null), 
        item_selector: useRef(null),
        supplier_selector: useRef(null), 
        starting_price: useRef(null),
        end_price: useRef(null),
        commission_amount: useRef(null),
        submit_button: useRef(null),
    };

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
    }, [initialData]);

    const handleSelectByTypeChange = (e) => {
        const newType = e.target.value;
        setSelectByType(newType);
        setFormData(prevData => ({
            ...prevData,
            item_code: '',
            item_name: '',
            supplier_code: '',
            supplier_name: '',
        }));
    };

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

    const handleKeyDown = (e, currentFieldName) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 

            let currentInputOrder = ['form_password', 'select_by_type'];
            if (selectByType === 'Items') {
                currentInputOrder.push('item_selector');
            } else if (selectByType === 'Suppliers') {
                 currentInputOrder.push('supplier_selector');
            }
            currentInputOrder.push('starting_price', 'end_price', 'commission_amount');
            
            const currentIndex = currentInputOrder.indexOf(currentFieldName);

            if (currentFieldName === 'commission_amount') {
                if(isUnlocked) formRefs.submit_button.current.click(); 
            } else {
                const nextFieldName = currentInputOrder[currentIndex + 1];
                if (formRefs[nextFieldName]?.current) {
                    formRefs[nextFieldName].current.focus();
                }
            }
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault(); 
        if (!isUnlocked) return;

        setStatus('Submitting...');
        let payload = {
            starting_price: formData.starting_price,
            end_price: formData.end_price,
            commission_amount: formData.commission_amount,
        };

        if (selectByType === 'Items') {
            if (!formData.item_code) return setStatus('Please select an Item.');
            payload.item_code = formData.item_code;
        } else if (selectByType === 'Suppliers') {
            if (!formData.supplier_code) return setStatus('Please select a Supplier.');
            payload.supplier_code = formData.supplier_code;
        } 
        
        try {
            const endpoint = `/commissions${isEditing ? '/' + initialData.id : ''}`;
            if (isEditing) {
                await api.patch(endpoint, payload);
            } else {
                await api.post(endpoint, payload);
                setFormData(defaultFormData); 
            }
            const message = `✅ Success!`;
            setStatus(message);
            onSubmissionSuccess(message); 
            setPassword(''); // Re-lock form after success
        } catch (error) {
            setStatus(`❌ Failed.`);
        }
    };

    // Styling
    const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' };
    const lockInputStyle = { 
        padding: '5px 10px', 
        border: '1px solid #ccc', 
        borderRadius: '4px', 
        marginLeft: '15px',
        fontSize: '14px',
        outline: isUnlocked ? '2px solid #28a745' : 'none'
    };

    return (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
            
            {/* Header with Password Field on the Right */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#004d00', margin: 0 }}>
                    {isEditing ? '✏️ කමිෂන් සංස්කරණය කරන්න' : '➕ නව කමිෂන් සකසන්න'}
                </h3>
                
                <input
                    type="password"
                    ref={formRefs.form_password}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'form_password')}
                    placeholder="Enter Password to Unlock..."
                    style={lockInputStyle}
                />
                {isUnlocked && <span style={{ marginLeft: '10px', color: '#28a745', fontWeight: 'bold' }}>🔓 Unlocked</span>}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: '10px', opacity: isUnlocked ? 1 : 0.5 }}>
                
                {/* Select By Type */}
                <div>
                    <label>තෝරන්න:</label>
                    <select
                        name="select_by_type"
                        value={selectByType} 
                        onChange={handleSelectByTypeChange}
                        onKeyDown={(e) => handleKeyDown(e, 'select_by_type')} 
                        disabled={!isUnlocked || isEditing} 
                        ref={formRefs.select_by_type} 
                        style={inputStyle}
                    >
                        <option value="Items">Items</option>
                        <option value="Suppliers">Suppliers</option>
                        <option value="All">All (Global)</option>
                    </select>
                </div>
                
                {/* Conditional Selector */}
                {(selectByType === 'Items' || selectByType === 'Suppliers') && (
                    <div>
                        <label>{selectByType === 'Items' ? 'Item:' : 'Supplier:'}</label>
                        <select
                            name={selectByType === 'Items' ? 'item_selector' : 'supplier_selector'}
                            value={selectByType === 'Items' ? formData.item_code : formData.supplier_code} 
                            onChange={handleChange}
                            onKeyDown={(e) => handleKeyDown(e, selectByType === 'Items' ? 'item_selector' : 'supplier_selector')} 
                            disabled={!isUnlocked || isEditing} 
                            ref={selectByType === 'Items' ? formRefs.item_selector : formRefs.supplier_selector} 
                            style={inputStyle}
                        >
                            <option value="">-- තෝරන්න --</option>
                            {(selectByType === 'Items' ? itemOptions : supplierOptions).map((opt) => (
                                <option key={opt.item_code || opt.code} value={opt.item_code || opt.code}>
                                    {opt.item_code || opt.code} - {opt.item_name || opt.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Price and Commission Fields */}
                <div>
                    <label>ආරම්භක මිල:</label>
                    <input
                        type="number"
                        name="starting_price"
                        value={formData.starting_price}
                        onChange={handleChange}
                        onKeyDown={(e) => handleKeyDown(e, 'starting_price')}
                        disabled={!isUnlocked}
                        ref={formRefs.starting_price}
                        style={inputStyle}
                    />
                </div>

                <div>
                    <label>අවසාන මිල:</label>
                    <input
                        type="number"
                        name="end_price"
                        value={formData.end_price}
                        onChange={handleChange}
                        onKeyDown={(e) => handleKeyDown(e, 'end_price')}
                        disabled={!isUnlocked}
                        ref={formRefs.end_price}
                        style={inputStyle}
                    />
                </div>

                <div>
                    <label>මුදල (Rs):</label>
                    <input
                        type="number"
                        name="commission_amount" 
                        value={formData.commission_amount}
                        onChange={handleChange}
                        onKeyDown={(e) => handleKeyDown(e, 'commission_amount')}
                        disabled={!isUnlocked}
                        ref={formRefs.commission_amount}
                        style={inputStyle}
                    />
                </div>

                {/* Buttons */}
                <div style={{ alignSelf: 'end', display: 'flex', gap: '5px' }}>
                    <button 
                        type="submit" 
                        disabled={!isUnlocked}
                        ref={formRefs.submit_button}
                        style={{ 
                            padding: '10px 15px', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            backgroundColor: !isUnlocked ? '#ccc' : (isEditing ? '#ffc107' : '#28a745'),
                            cursor: isUnlocked ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {isEditing ? 'Save' : 'එකතු කරන්න'}
                    </button>
                    {isEditing && (
                        <button type="button" onClick={onCancelEdit} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}>
                            Cancel
                        </button>
                    )}
                </div>
            </form>
            {status && <p style={{ marginTop: '10px', color: status.includes('Success') ? 'green' : 'red' }}>{status}</p>}
        </div>
    );
};

export default CommissionForm;