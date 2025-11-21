import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';

// Define the order of fields for keyboard navigation
const INPUT_ORDER = ['item_selector', 'starting_price', 'end_price', 'commission_amount'];

const defaultFormData = {
    item_code: '',
    item_name: '',
    starting_price: '',
    end_price: '',
    commission_amount: '',
};

const CommissionForm = ({ itemOptions, initialData, onSubmissionSuccess, onCancelEdit }) => {
    
    const [formData, setFormData] = useState(defaultFormData);
    const [status, setStatus] = useState('');
    const isEditing = !!initialData;
    
    // 🔑 1. Create refs for keyboard navigation
    const formRefs = {
        item_selector: useRef(null),
        starting_price: useRef(null),
        end_price: useRef(null),
        commission_amount: useRef(null),
        submit_button: useRef(null),
    };

    // --- Effect to populate form/reset ---
    useEffect(() => {
        if (initialData) {
            setFormData({
                item_code: initialData.item_code || '',
                item_name: initialData.item_name || '',
                starting_price: initialData.starting_price || '',
                end_price: initialData.end_price || '',
                commission_amount: initialData.commission_amount || '',
            });
        } else {
            setFormData(defaultFormData);
        }
    }, [initialData]);

    // --- Handle Input Changes ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'item_selector') {
            const selectedItem = itemOptions.find(item => item.item_code === value);
            setFormData(prevData => ({
                ...prevData,
                item_code: selectedItem ? selectedItem.item_code : '',
                item_name: selectedItem ? selectedItem.item_name : '',
            }));
        } else {
            setFormData(prevData => ({
                ...prevData,
                [name]: value,
            }));
        }
    };

    // 🔑 2. Keyboard Navigation Handler (Prevents default Enter behavior)
    const handleKeyDown = (e, currentFieldName) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 

            if (currentFieldName === 'commission_amount') {
                // Last field: Trigger submission
                formRefs.submit_button.current.click(); 
            } else {
                // Move focus to the next field
                const currentIndex = INPUT_ORDER.indexOf(currentFieldName);
                const nextFieldName = INPUT_ORDER[currentIndex + 1];
                
                if (formRefs[nextFieldName]?.current) {
                    formRefs[nextFieldName].current.focus();
                }
            }
        }
    };
    
    // --- Handle Form Submission (Create or Update) ---
    const handleSubmit = async (e) => {
        e.preventDefault(); // IMPORTANT: Prevents page reload after successful click/submit
        setStatus('Submitting...');
        
        if (!formData.item_code || !formData.starting_price || !formData.end_price || !formData.commission_amount) {
            setStatus('Please fill all required fields.');
            return;
        }

        try {
            let response;
            const endpoint = `/commissions${isEditing ? '/' + initialData.id : ''}`;

            if (isEditing) {
                response = await api.patch(endpoint, formData);
            } else {
                response = await api.post(endpoint, formData);
                setFormData(defaultFormData); // Clear on successful create
            }

            const message = `✅ Success! Commission ${isEditing ? 'updated' : 'created'} for ${formData.item_name || initialData.item_name}.`;
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


    return (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: isEditing ? '1fr 1fr 1fr 1fr 1fr auto' : '1fr 1fr 1fr 1fr 1fr', gap: '15px' }}>
            
            {/* 1. Item Selection Field (Dropdown) */}
            <div style={{ gridColumn: isEditing ? 'span 2' : 'span 1' }}>
                <label htmlFor="item_selector">Item:</label>
                <select
                    id="item_selector"
                    name="item_selector"
                    value={formData.item_code} 
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'item_selector')} // KEYBOARD HANDLER
                    required
                    disabled={isEditing} 
                    ref={formRefs.item_selector} // REF
                    style={inputStyle}
                >
                    <option value="">-- Select an Item --</option>
                    {itemOptions.map((item) => (
                        <option key={item.item_code} value={item.item_code}>
                            {item.item_code} - {item.item_name}
                        </option>
                    ))}
                </select>
                {isEditing && <p style={{ margin: '0', fontSize: '12px', color: '#555' }}>Item: **{formData.item_name}**</p>}
            </div>

            {/* 2. Starting Price */}
            <div>
                <label htmlFor="starting_price">Start Price:</label>
                <input
                    type="number"
                    id="starting_price"
                    name="starting_price"
                    value={formData.starting_price}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'starting_price')} // KEYBOARD HANDLER
                    min="0"
                    step="0.01"
                    required
                    ref={formRefs.starting_price} // REF
                    style={inputStyle}
                />
            </div>

            {/* 3. End Price */}
            <div>
                <label htmlFor="end_price">End Price:</label>
                <input
                    type="number"
                    id="end_price"
                    name="end_price"
                    value={formData.end_price}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'end_price')} // KEYBOARD HANDLER
                    min={formData.starting_price || 0} // Ensure validation reflects min price
                    step="0.01"
                    required
                    ref={formRefs.end_price} // REF
                    style={inputStyle}
                />
            </div>

            {/* 4. Commission Amount (Final Field for Auto-Submit) */}
            <div>
                <label htmlFor="commission_amount">Amount ($):</label>
                <input
                    type="number"
                    id="commission_amount"
                    name="commission_amount" 
                    value={formData.commission_amount}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'commission_amount')} // KEYBOARD HANDLER
                    min="0"
                    step="0.01"
                    required
                    ref={formRefs.commission_amount} // REF
                    style={inputStyle}
                />
            </div>

            {/* 5. Action Buttons */}
            <div style={{ alignSelf: 'end', display: 'flex', gap: '5px' }}>
                <button 
                    type="submit" 
                    ref={formRefs.submit_button} // REF
                    style={{ ...buttonStyle, backgroundColor: isEditing ? '#ffc107' : '#28a745' }}
                >
                    {isEditing ? 'Save Changes' : 'Create Commission'}
                </button>
                {isEditing && (
                    <button 
                        type="button" 
                        onClick={onCancelEdit}
                        style={{ ...buttonStyle, backgroundColor: '#6c757d' }}
                    >
                        Cancel Edit
                    </button>
                )}
            </div>
            
            {status && <p style={{ gridColumn: 'span 5', textAlign: 'center', color: status.includes('Success') ? 'green' : 'red' }}>{status}</p>}

        </form>
    );
};

export default CommissionForm;