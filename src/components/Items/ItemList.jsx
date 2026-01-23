import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Link, useNavigate } from 'react-router-dom';

const ItemList = () => {
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadItems();
    }, []);

    // 🔹 LOAD + SORT ITEMS A → Z BY item.no
    const loadItems = async () => {
        try {
            const response = await api.get('/items');

            const sortedItems = response.data.sort((a, b) =>
                a.no.localeCompare(b.no)
            );

            setItems(sortedItems);
        } catch (error) {
            console.error('Error loading items:', error);
            setMessage('Error loading items');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    // 🔹 SEARCH + FORCE CAPITAL + SORT
    const handleSearch = async (e) => {
        const value = e.target.value.toUpperCase(); // FORCE CAPS
        setSearchTerm(value);

        if (value.trim() === '') {
            loadItems();
            return;
        }

        try {
            const response = await api.get(`/items/search/${value}`);

            const sortedItems = response.data.sort((a, b) =>
                a.no.localeCompare(b.no)
            );

            setItems(sortedItems);
        } catch (error) {
            console.error('Error searching items:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('ඔබට මෙම භාණ්ඩය මකන්න අවශ්‍යද?')) {
            try {
                await api.delete(`/items/${id}`);
                setMessage('Item deleted successfully!');
                loadItems();
            } catch (error) {
                console.error('Error deleting item:', error);
                setMessage('Error deleting item');
            }
        }
    };

    if (loading) {
        return <div className="text-center mt-5">Loading...</div>;
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#99ff99' }}>
            
            {/* ---------- SIDEBAR ---------- */}
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
                <Link className="navbar-brand fw-bold d-flex align-items-center mb-4 text-white text-decoration-none" to="/sales">
                    <i className="material-icons me-2">warehouse</i>
                    මුල් පිටුව
                </Link>

                <h6 className="text-uppercase text-light opacity-50 small fw-bold mb-3">ප්‍රධාන දත්ත</h6>
                <ul className="list-unstyled flex-grow-1">
                    <li className="mb-2">
                        <Link to="/customers" className="nav-link text-white d-flex align-items-center p-2 rounded">
                            <i className="material-icons me-2">people</i> ගනුදෙනුකරුවන්
                        </Link>
                    </li>
                    <li className="mb-2">
                        <Link to="/items" className="nav-link text-white d-flex align-items-center p-2 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                            <i className="material-icons me-2">inventory_2</i> අයිතමය
                        </Link>
                    </li>
                    <li className="mb-2">
                        <Link to="/suppliers" className="nav-link text-white d-flex align-items-center p-2 rounded">
                            <i className="material-icons me-2">local_shipping</i> සැපයුම්කරුවන්
                        </Link>
                    </li>
                    <li className="mb-2">
                        <Link to="/commissions" className="nav-link text-white d-flex align-items-center p-2 rounded">
                            <i className="material-icons me-2">attach_money</i> කොමිෂන්
                        </Link>
                    </li>
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

            {/* ---------- MAIN CONTENT ---------- */}
            <div style={{ marginLeft: '260px', flexGrow: 1, padding: '30px', width: 'calc(100vw - 260px)' }}>
                <div
                    style={{
                        backgroundColor: '#006400',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                >
                    <h2 className="mb-4 text-center text-white">භාණ්ඩ ලැයිස්තුව (Items List)</h2>

                    <div className="d-flex justify-content-between mb-3">
                        <Link to="/items/create" className="btn btn-success fw-bold">
                            + නව භාණ්ඩයක් එකතු කරන්න
                        </Link>

                        {/* 🔹 SEARCH INPUT (AUTO CAPS) */}
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleSearch}
                            className="form-control form-control-sm"
                            placeholder="අංකය හෝ වර්ගය අනුව සොයන්න"
                            style={{
                                maxWidth: '300px',
                                textTransform: 'uppercase'
                            }}
                        />
                    </div>

                    {message && (
                        <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'} text-center`}>
                            {message}
                        </div>
                    )}

                    <div className="table-responsive">
                        <table className="table table-bordered table-striped table-hover align-middle bg-white">
                            <thead>
                                <tr style={{ backgroundColor: '#e6f0ff', color: '#003366', textAlign: 'center' }}>
                                    <th>අංකය</th>
                                    <th>වර්ගය</th>
                                    <th>මල්ලක අගය</th>
                                    <th>මල්ලක කුලිය</th>
                                    <th>මෙහෙයුම්</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted">භාණ්ඩ නොමැත</td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.id} style={{ textAlign: 'center' }}>
                                            <td className="fw-bold">{item.no}</td>
                                            <td>{item.type}</td>
                                            <td>Rs. {Number(item.pack_cost).toFixed(2)}</td>
                                            <td>Rs. {Number(item.pack_due).toFixed(2)}</td>
                                            <td>
                                                <Link to={`/items/edit/${item.id}`} className="btn btn-primary btn-sm me-1">
                                                    යාවත්කාලීන
                                                </Link>
                                                <button onClick={() => handleDelete(item.id)} className="btn btn-danger btn-sm">
                                                    මකන්න
                                                </button>
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

export default ItemList;
