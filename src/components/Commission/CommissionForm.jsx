// src/components/Commission/CommissionForm.jsx (FINAL UPDATED CODE)

import React, { useState, useEffect } from 'react';
// 1. IMPORT the centralized API instance
import api from '../../api'; // Adjust path if api.js is located elsewhere, e.g., 'axios' -> 'api'
// Note: We no longer need to import axios directly

// We can remove API_BASE_URL as it's defined in api.js
// const API_BASE_URL = '/api'; 

const CommissionForm = ({ itemOptions, initialData, onSubmissionSuccess, onCancelEdit }) => {
    const [formData, setFormData] = useState({
        item_code: '',
        item_name: '',
        starting_price: '',
        end_price: '',
        commission_amount: '',
    });
    const [status, setStatus] = useState('');
    const isEditing = !!initialData; // Boolean flag to check if we are in edit mode

    // --- Effect to populate form when initialData changes (for editing) ---
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
            // Reset form for creation mode
            setFormData({
                item_code: '',
                item_name: '',
                starting_price: '',
                end_price: '',
                commission_amount: '',
            });
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

    // --- Handle Form Submission (Create or Update) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('Submitting...');
        
        if (!formData.item_code || !formData.starting_price || !formData.end_price || !formData.commission_amount) {
            setStatus('Please fill all required fields.');
            return;
        }

        try {
            let response;
            const endpoint = `/commissions${isEditing ? '/' + initialData.id : ''}`;

            if (isEditing) {
                // 2. Use 'api' instead of 'axios' for PATCH/PUT
                response = await api.patch(endpoint, formData);
                setStatus(`✅ Success! Commission updated for ${response.data.commission.item_name}.`);
            } else {
                // 3. Use 'api' instead of 'axios' for POST
                response = await api.post(endpoint, formData);
                setStatus(`✅ Success! Commission created for ${response.data.commission.item_name}.`);
            }

            onSubmissionSuccess(); // Tell the parent page to refresh the list and clear edit state

        } catch (error) {
            console.error('Submission error:', error.response ? error.response.data : error.message);
            // 401 Unauthorized handling is managed by the api interceptor
            setStatus(`❌ Submission failed. ${error.response?.data?.message || 'Check console for details.'}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: isEditing ? '1fr 1fr 1fr 1fr 1fr auto' : '1fr 1fr 1fr 1fr 1fr', gap: '15px' }}>
            
            {/* 1. Item Selection Field (Disabled/Read-only when editing) */}
            <div style={{ gridColumn: isEditing ? 'span 2' : 'span 1' }}>
                <label htmlFor="item_selector">Item:</label>
                <select
                    id="item_selector"
                    name="item_selector"
                    value={formData.item_code} 
                    onChange={handleChange}
                    required
                    disabled={isEditing} // Cannot change item while editing
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
                    min="0"
                    step="0.01"
                    required
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
                     min="0"
                    step="0.01"
                    required
                    style={inputStyle}
                />
            </div>

            {/* 4. Commission Amount */}
            <div>
                <label htmlFor="commission_amount">Amount ($):</label>
                <input
                    type="number"
                    id="commission_amount"
                    name="commission_amount" 
                    value={formData.commission_amount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                    style={inputStyle}
                />
            </div>

            {/* 5. Action Buttons */}
            <div style={{ alignSelf: 'end', display: 'flex', gap: '5px' }}>
                <button 
                    type="submit" 
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
            
        </form>
    );
};

const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' };
const buttonStyle = { padding: '10px 15px', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flexGrow: 1 };

export default CommissionForm;