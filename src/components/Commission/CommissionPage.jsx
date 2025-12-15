import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import CommissionForm from './CommissionForm';

const CommissionPage = () => {
    const [commissions, setCommissions] = useState([]);
    const [itemOptions, setItemOptions] = useState([]);
    const [supplierOptions, setSupplierOptions] = useState([]);
    const [editingCommission, setEditingCommission] = useState(null);
    const [status, setStatus] = useState('');
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);

    // --- 1. Fetch commissions ---
    const fetchCommissions = useCallback(async () => {
        try {
            const response = await api.get('/commissions');
            // Sort commissions by ID ascending
            const sortedData = response.data.sort((a, b) => a.id - b.id);
            setCommissions(sortedData);
            setStatus('');
        } catch (error) {
            console.error('Error fetching commissions:', error);
            setStatus('Failed to load commissions list. Ensure you are logged in.');
        }
    }, []);

    // --- 2. Fetch item options ---
    const fetchItemOptions = async () => {
        try {
            const response = await api.get('/items/options');
            setItemOptions(response.data);
        } catch (error) {
            console.error('Error fetching item options:', error);
        }
    };

    // --- 3. Fetch supplier options (protected) ---
    const fetchSupplierOptions = async () => {
        setLoadingSuppliers(true);
        try {
            const response = await api.get('/suppliers'); // Protected route
            // Map API fields to { code, name }
            const options = response.data.map(supplier => ({
                code: supplier.supplier_code || supplier.code,
                name: supplier.supplier_name || supplier.name
            }));
            setSupplierOptions(options);
        } catch (error) {
            console.error('Error fetching supplier options:', error);
            setStatus('Failed to load supplier list. Check your login.');
        } finally {
            setLoadingSuppliers(false);
        }
    };

    useEffect(() => {
        fetchItemOptions();
        fetchSupplierOptions();
        fetchCommissions();
    }, [fetchCommissions]);

    // --- 4. Edit handlers ---
    const handleEditClick = (commission) => {
        setEditingCommission(commission);
        setStatus(`✏️ Ready to edit Commission ID: ${commission.id}`);
        document.getElementById('commission-form-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingCommission(null);
        setStatus('');
    };

    // --- 5. Delete handler ---
    const handleDelete = async (id, item_name) => {
        if (!window.confirm(`Are you sure you want to delete the commission for: ${item_name}?`)) return;

        try {
            await api.delete(`/commissions/${id}`);
            setStatus(`✅ Successfully deleted commission for ${item_name}.`);
            fetchCommissions();
        } catch (error) {
            console.error('Deletion error:', error);
            setStatus('❌ Failed to delete commission.');
        }
    };

    // --- 6. Form submission handler ---
    const handleFormSubmit = (message) => {
        fetchCommissions();
        setEditingCommission(null);
        setStatus(message);
    };

    // --- Styling ---
    const pageContainerStyle = {
        padding: '30px',
        maxWidth: '1200px',
        margin: '20px auto',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    };

    const formSectionStyle = {
        border: '2px solid #007bff',
        padding: '25px',
        borderRadius: '10px',
        marginBottom: '40px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 5px rgba(0,123,255,0.1)'
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

    return (
        <div style={pageContainerStyle}>
            <h1>💲 Commission Management Dashboard</h1>

            {status && <div style={statusMessageStyle}>{status}</div>}

            <div id="commission-form-section" style={formSectionStyle}>
                <h3>{editingCommission ? '✏️ Edit Commission' : '➕ Set New Commission'}</h3>

                {loadingSuppliers ? (
                    <p>Loading suppliers...</p>
                ) : (
                    <CommissionForm
                        itemOptions={itemOptions}
                        supplierOptions={supplierOptions}
                        initialData={editingCommission}
                        onSubmissionSuccess={handleFormSubmit}
                        onCancelEdit={handleCancelEdit}
                    />
                )}
            </div>

            {/* Commission List */}
            {commissions.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff', borderRadius: '8px' }}>
                    No commissions yet. Create one above!
                </p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Item / Supplier</th>
                            <th>Start Price</th>
                            <th>End Price</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {commissions
                            .sort((a, b) => a.id - b.id) // Ensure sorted by ID ascending
                            .map(commission => (
                                <tr key={commission.id} style={{ backgroundColor: editingCommission?.id === commission.id ? '#fff3cd' : '#fff' }}>
                                    <td>{commission.id}</td>
                                    <td>
                                        {commission.item_code ? (
                                            <>
                                                <strong>{commission.item_code}</strong>
                                                <br />
                                                <small>{commission.item_name}</small>
                                            </>
                                        ) : (
                                            <>
                                                <strong>{commission.supplier_code}</strong>
                                                <br />
                                                <small>{commission.supplier_name}</small>
                                            </>
                                        )}
                                    </td>
                                    <td>{parseFloat(commission.starting_price).toFixed(2)}</td>
                                    <td>{parseFloat(commission.end_price).toFixed(2)}</td>
                                    <td>{parseFloat(commission.commission_amount).toFixed(2)}</td>
                                    <td>
                                        <button onClick={() => handleEditClick(commission)}>Edit</button>
                                        <button onClick={() => handleDelete(commission.id, commission.item_name || commission.supplier_name)}>Delete</button>
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
