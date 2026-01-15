import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { Link } from 'react-router-dom';
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

    // --- 3. Fetch supplier options ---
    const fetchSupplierOptions = async () => {
        setLoadingSuppliers(true);
        try {
            const response = await api.get('/suppliers');
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

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

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

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#99ff99' }}>
            
            {/* --- VERTICAL SIDEBAR --- */}
            <div
                style={{
                    width: '260px',
                    backgroundColor: '#004d00',
                    color: 'white',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'fixed',
                    height: '100vh',
                    overflowY: 'auto',
                    boxShadow: '2px 0 5px rgba(0,0,0,0.2)',
                    zIndex: 1000
                }}
            >
                <Link className="navbar-brand fw-bold d-flex align-items-center mb-4 text-white text-decoration-none" to="/">
                    <i className="material-icons me-2">warehouse</i>
                    මුල් පිටුව
                </Link>

                <h6 className="text-uppercase text-light opacity-50 small fw-bold mb-3">ප්‍රධාන දත්ත</h6>
                <ul className="list-unstyled flex-grow-1">
                    <li className="mb-2">
                        <Link to="/customers" className="nav-link text-white d-flex align-items-center p-2 rounded text-decoration-none">
                            <i className="material-icons me-2">people</i> ගනුදෙනුකරුවන්
                        </Link>
                    </li>
                    <li className="mb-2">
                        <Link to="/items" className="nav-link text-white d-flex align-items-center p-2 rounded text-decoration-none">
                            <i className="material-icons me-2">inventory_2</i> අයිතමය
                        </Link>
                    </li>
                    <li className="mb-2">
                        <Link to="/suppliers" className="nav-link text-white d-flex align-items-center p-2 rounded text-decoration-none">
                            <i className="material-icons me-2">local_shipping</i> සැපයුම්කරුවන්
                        </Link>
                    </li>
                    <li className="mb-2">
                        <Link to="/commissions" className="nav-link text-white d-flex align-items-center p-2 rounded text-decoration-none" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                            <i className="material-icons me-2">attach_money</i> කොමිෂන්
                        </Link>
                    </li>
                    <hr className="bg-light" />
                   
                </ul>

                <div className="mt-auto pt-3 border-top border-secondary">
                    <button
                        onClick={handleLogout}
                        className="btn btn-outline-light w-100 fw-bold d-flex align-items-center justify-content-center"
                    >
                        <i className="material-icons me-2">logout</i> ඉවත් වන්න
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div style={{ marginLeft: '260px', flexGrow: 1, padding: '30px', width: 'calc(100vw - 260px)' }}>
                <div style={{ 
                    backgroundColor: '#ffffff', 
                    padding: '30px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                }}>
                    <h1 style={{ color: '#004d00', marginBottom: '20px' }}>💲කමිෂන් කළමනාකරණ මූල පුවරුව</h1>

                    {status && (
                        <div style={{
                            padding: '10px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            margin: '15px 0',
                            backgroundColor: status.includes('✅') || status.includes('Ready') ? '#d4edda' : '#f8d7da',
                            color: status.includes('✅') || status.includes('Ready') ? '#155724' : '#721c24',
                            border: '1px solid currentColor'
                        }}>
                            {status}
                        </div>
                    )}

                    <div id="commission-form-section" style={{
                        border: '2px solid #004d00',
                        padding: '25px',
                        borderRadius: '10px',
                        marginBottom: '40px',
                        backgroundColor: '#f9f9f9'
                    }}>
                        <h3 style={{ color: '#004d00' }}>{editingCommission ? '✏️ කමිෂන් සංස්කරණය කරන්න' : '➕ නව කමිෂන් සකසන්න'}</h3>

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

                    {/* Commission List Table */}
                    <div className="table-responsive">
                        <table className="table table-bordered table-hover align-middle">
                            <thead style={{ backgroundColor: '#004d00', color: 'white' }}>
                                <tr className="text-center">
                                    <th>අංකය</th>
                                    <th>භාණ්ඩය/සැපයුම්කරු</th>
                                    <th>ආරම්භක මිල</th>
                                    <th>අවසාන මිල</th>
                                    <th>මුදල</th>
                                    <th>ක්‍රියාමාර්ග</th>
                                </tr>
                            </thead>
                            <tbody>
                                {commissions.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4">කමිෂන් තවමත් නොමැත.ඉහළින් නව එකක් සාදන්න!</td>
                                    </tr>
                                ) : (
                                    commissions.map(commission => (
                                        <tr key={commission.id} style={{ 
                                            backgroundColor: editingCommission?.id === commission.id ? '#fff3cd' : '#fff',
                                            textAlign: 'center'
                                        }}>
                                            <td>{commission.id}</td>
                                            <td className="text-start">
                                                {commission.item_code ? (
                                                    <>
                                                        <strong>{commission.item_code}</strong> - <small>{commission.item_name}</small>
                                                    </>
                                                ) : (
                                                    <>
                                                        <strong>{commission.supplier_code}</strong> - <small>{commission.supplier_name}</small>
                                                    </>
                                                )}
                                            </td>
                                            <td>Rs. {parseFloat(commission.starting_price).toFixed(2)}</td>
                                            <td>Rs. {parseFloat(commission.end_price).toFixed(2)}</td>
                                            <td className="fw-bold">Rs. {parseFloat(commission.commission_amount).toFixed(2)}</td>
                                            <td>
                                                <button 
                                                    className="btn btn-primary btn-sm me-2" 
                                                    onClick={() => handleEditClick(commission)}
                                                >✏️ සංස්කරණය</button>
                                                <button 
                                                    className="btn btn-danger btn-sm" 
                                                    onClick={() => handleDelete(commission.id, commission.item_name || commission.supplier_name)}
                                                >🗑️මකා දැමීම</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommissionPage;