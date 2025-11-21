// src/components/Commission/CommissionPage.jsx (ENHANCED STYLING)

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api'; // Make sure this path is correct: e.g., '../../api' or '../api'
import CommissionForm from './CommissionForm';

const CommissionPage = () => {
    const [commissions, setCommissions] = useState([]);
    const [itemOptions, setItemOptions] = useState([]);
    const [editingCommission, setEditingCommission] = useState(null); 
    const [status, setStatus] = useState('');

    // --- 1. Data Fetching ---
    const fetchCommissions = useCallback(async () => {
        try {
            const response = await api.get('/commissions');
            setCommissions(response.data);
            setStatus('');
        } catch (error) {
            console.error('Error fetching commissions:', error);
            setStatus('Failed to load commissions list. Ensure you are logged in.');
        }
    }, []);

    const fetchItemOptions = async () => {
        try {
            const response = await api.get('/items/options');
            setItemOptions(response.data);
        } catch (error) {
            console.error('Error fetching item options:', error);
        }
    };

    useEffect(() => {
        fetchItemOptions();
        fetchCommissions();
    }, [fetchCommissions]);


    // --- 2. Edit Handlers ---
    const handleEditClick = (commission) => {
        setEditingCommission(commission);
        setStatus(`✏️ Ready to edit Commission ID: ${commission.id}`);
        // Scroll to the form section when edit is clicked
        document.getElementById('commission-form-section').scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingCommission(null);
        setStatus('');
    };

    // --- 3. Delete Handler ---
    const handleDelete = async (id, item_name) => {
        if (!window.confirm(`Are you sure you want to delete the commission for item: ${item_name}?`)) {
            return;
        }

        try {
            await api.delete(`/commissions/${id}`);
            setStatus(`✅ Successfully deleted commission for ${item_name}.`);
            fetchCommissions(); 
        } catch (error) {
            console.error('Deletion error:', error);
            setStatus('❌ Failed to delete commission.');
        }
    };

    // --- 4. Form Submission Handler (Handles both Create and Update) ---
    const handleFormSubmit = (message) => {
        fetchCommissions(); 
        setEditingCommission(null); 
        setStatus(message);
    }


    // --- Styling Objects ---

    const pageContainerStyle = {
        padding: '30px', 
        maxWidth: '1200px', 
        margin: '20px auto', 
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    };

    const formSectionStyle = {
        border: '2px solid #007bff', 
        padding: '25px', 
        borderRadius: '10px', 
        marginBottom: '40px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 5px rgba(0, 123, 255, 0.1)'
    };
    
    const statusMessageStyle = {
        padding: '10px',
        borderRadius: '6px',
        fontWeight: 'bold',
        textAlign: 'center',
        margin: '15px 0',
        backgroundColor: status.includes('Success') || status.includes('Ready to edit') ? '#d4edda' : '#f8d7da',
        color: status.includes('Success') || status.includes('Ready to edit') ? '#155724' : '#721c24',
        border: status.includes('Success') || status.includes('Ready to edit') ? '1px solid #c3e6cb' : '1px solid #f5c6cb',
    };

    const tableStyle = {
        width: '100%', 
        borderCollapse: 'separate', 
        borderSpacing: '0 10px', // Spacing between rows
        marginTop: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        overflow: 'hidden'
    };

    const tableHeaderStyle = { 
        padding: '15px', 
        textAlign: 'left', 
        backgroundColor: '#343a40', 
        color: 'white',
        textTransform: 'uppercase',
        fontSize: '0.9em'
    };
    
    const tableRowStyle = { 
        backgroundColor: '#fff', 
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        transition: 'transform 0.1s ease-in-out'
    };
    
    const tableCellStyle = { 
        padding: '15px', 
        textAlign: 'left', 
        borderTop: '1px solid #dee2e6',
        borderBottom: '1px solid #dee2e6',
        verticalAlign: 'middle'
    };
    
    // Custom style for the end column cell to remove side borders if needed
    const lastColCellStyle = { 
        ...tableCellStyle,
        width: '180px' 
    };

    const actionButtonStyle = { 
        padding: '8px 12px', 
        border: 'none', 
        borderRadius: '5px', 
        color: 'white', 
        cursor: 'pointer',
        fontSize: '0.85em',
        fontWeight: 'bold',
        transition: 'background-color 0.2s'
    };


    return (
        <div style={pageContainerStyle}>
            <h1>💲 Commission Management Dashboard</h1>
            
            {status && <div style={statusMessageStyle}>{status}</div>}
            
            <div id="commission-form-section" style={formSectionStyle}>
                <h3>{editingCommission ? '✏️ Edit Commission' : '➕ Set New Commission'}</h3>
                
                {/* Form Component */}
                <CommissionForm 
                    itemOptions={itemOptions}
                    initialData={editingCommission}
                    // Pass the status message up to the parent
                    onSubmissionSuccess={(message) => handleFormSubmit(message)}
                    onCancelEdit={handleCancelEdit}
                />
            </div>
            
            <hr style={{ margin: '40px 0', border: '0', borderTop: '1px solid #ccc' }} />

            {/* --- Commission List --- */}
           
            {commissions.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff', borderRadius: '8px' }}>
                    No commission  have been set up yet. Start by creating one above!
                </p>
            ) : (
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={tableHeaderStyle}>ID</th>
                            <th style={tableHeaderStyle}>Item Code / Name</th>
                            <th style={tableHeaderStyle}>Start Price</th>
                            <th style={tableHeaderStyle}>End Price</th>
                            <th style={tableHeaderStyle}>Commission Amount</th>
                            <th style={tableHeaderStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {commissions.map((commission) => (
                            <tr 
                                key={commission.id} 
                                style={{
                                    ...tableRowStyle,
                                    backgroundColor: editingCommission?.id === commission.id ? '#fff3cd' : '#fff' // Highlight if being edited
                                }}
                            >
                                <td style={tableCellStyle}>{commission.id}</td>
                                <td style={tableCellStyle}>
                                    <strong>{commission.item_code}</strong> 
                                    <br /><small style={{ color: '#6c757d' }}>{commission.item_name}</small>
                                </td>
                                <td style={tableCellStyle}>{parseFloat(commission.starting_price).toFixed(2)}</td>
                                <td style={tableCellStyle}>{parseFloat(commission.end_price).toFixed(2)}</td>
                                <td style={{...tableCellStyle, fontWeight: 'bold'}}>
                                    {parseFloat(commission.commission_amount).toFixed(2)}
                                </td>
                                <td style={lastColCellStyle}>
                                    <button 
                                        onClick={() => handleEditClick(commission)}
                                        style={{ ...actionButtonStyle, backgroundColor: '#ffc107', color: '#212529', marginRight: '8px' }}
                                        disabled={editingCommission && editingCommission.id !== commission.id}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(commission.id, commission.item_name)}
                                        style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default CommissionPage;