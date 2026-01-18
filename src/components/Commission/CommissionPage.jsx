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

    const fetchCommissions = useCallback(async () => {
        try {
            const response = await api.get('/commissions');
            setCommissions(response.data.sort((a, b) => a.id - b.id));
        } catch (error) {
            setStatus('Failed to load commissions.');
        }
    }, []);

    const fetchItemOptions = async () => {
        const res = await api.get('/items/options');
        setItemOptions(res.data);
    };

    const fetchSupplierOptions = async () => {
        setLoadingSuppliers(true);
        try {
            const res = await api.get('/suppliers');
            setSupplierOptions(res.data.map(s => ({ code: s.supplier_code || s.code, name: s.supplier_name || s.name })));
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
        localStorage.clear();
        window.location.href = '/login';
    };

    const handleEditClick = (c) => {
        setEditingCommission(c);
        document.getElementById('commission-form-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete commission for: ${name}?`)) return;
        await api.delete(`/commissions/${id}`);
        fetchCommissions();
    };

    const handleFormSubmit = (msg) => {
        fetchCommissions();
        setEditingCommission(null);
        setStatus(msg);
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#99ff99' }}>
            {/* Sidebar */}
            <div style={{ width: '260px', backgroundColor: '#004d00', color: 'white', padding: '20px', position: 'fixed', height: '100vh' }}>
                <Link className="text-white text-decoration-none d-flex align-items-center mb-4" to="/"><i className="material-icons me-2">warehouse</i>මුල් පිටුව</Link>
                <ul className="list-unstyled">
                    <li className="mb-2"><Link to="/customers" className="nav-link text-white p-2 text-decoration-none"><i className="material-icons me-2">people</i>ගනුදෙනුකරුවන්</Link></li>
                    <li className="mb-2"><Link to="/items" className="nav-link text-white p-2 text-decoration-none"><i className="material-icons me-2">inventory_2</i>අයිතමය</Link></li>
                    <li className="mb-2"><Link to="/suppliers" className="nav-link text-white p-2 text-decoration-none"><i className="material-icons me-2">local_shipping</i>සැපයුම්කරුවන්</Link></li>
                    <li className="mb-2"><Link to="/commissions" className="nav-link text-white p-2 rounded text-decoration-none" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}><i className="material-icons me-2">attach_money</i>කොමිෂන්</Link></li>
                </ul>
                <button onClick={handleLogout} className="btn btn-outline-light w-100 mt-5">ඉවත් වන්න</button>
            </div>

            {/* Main Content */}
            <div style={{ marginLeft: '260px', flexGrow: 1, padding: '30px' }}>
                <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <h1 style={{ color: '#004d00' }}>💲කමිෂන් කළමනාකරණ මූල පුවරුව</h1>

                    <div id="commission-form-section" style={{ border: '2px solid #004d00', padding: '25px', borderRadius: '10px', margin: '20px 0', backgroundColor: '#f9f9f9' }}>
                        {!loadingSuppliers && (
                            <CommissionForm 
                                itemOptions={itemOptions} 
                                supplierOptions={supplierOptions} 
                                initialData={editingCommission} 
                                onSubmissionSuccess={handleFormSubmit} 
                                onCancelEdit={() => setEditingCommission(null)} 
                            />
                        )}
                    </div>

                    <div className="table-responsive">
                        <style>{`.white-th th { color: white !important; }`}</style>
                        <table className="table table-bordered table-hover align-middle">
                            <thead style={{ backgroundColor: '#004d00' }}>
                                <tr className="text-center white-th" style={{ backgroundColor: '#004d00' }}>
                                    <th>අංකය</th>
                                    <th>භාණ්ඩය</th>
                                    <th>සැපයුම්කරු</th>
                                    <th>ආරම්භක මිල</th>
                                    <th>අවසාන මිල</th>
                                    <th>මුදල</th>
                                    <th>ක්‍රියාමාර්ග</th>
                                </tr>
                            </thead>
                            <tbody>
                                {commissions.map(c => (
                                    <tr key={c.id} className="text-center">
                                        <td>{c.id}</td>
                                        <td className="text-start">{c.item_code} - {c.item_name}</td>
                                        <td className="text-start">{c.supplier_code} - {c.supplier_name}</td>
                                        <td>Rs. {parseFloat(c.starting_price).toFixed(2)}</td>
                                        <td>Rs. {parseFloat(c.end_price).toFixed(2)}</td>
                                        <td className="fw-bold">Rs. {parseFloat(c.commission_amount).toFixed(2)}</td>
                                        <td>
                                            <button className="btn btn-primary btn-sm me-2" onClick={() => handleEditClick(c)}>✏️</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.item_name)}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommissionPage;