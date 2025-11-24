import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Link } from 'react-router-dom';

const ItemList = () => {
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            const response = await api.get('/items');
            setItems(response.data);
        } catch (error) {
            console.error('Error loading items:', error);
            setMessage('Error loading items');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (value.trim() === '') {
            loadItems();
            return;
        }

        try {
            const response = await api.get(`/items/search/${value}`);
            setItems(response.data);
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
        return <div className="text-center">Loading...</div>;
    }

    return (
        <div className="container-fluid mt-5">
            <div className="custom-card">
                <h2 className="mb-4 text-center text-primary">භාණ්ඩ ලැයිස්තුව (Items List)</h2>

                <div className="d-flex justify-content-between mb-3">
                    <Link to="/items/create" className="btn btn-success">
                        + නව භාණ්ඩයක් එකතු කරන්න
                    </Link>

                    <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearch}
                        className="form-control form-control-sm"
                        placeholder="අංකය හෝ වර්ගය අනුව සොයන්න"
                        style={{ maxWidth: '300px' }}
                    />
                </div>

                {message && (
                    <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'} text-center`}>
                        {message}
                    </div>
                )}

                <div className="table-responsive">
                    <table className="table table-bordered table-striped table-hover align-middle">
                        <thead>
                            <tr>
                                <th>අංකය</th>
                                <th>වර්ගය</th>
                                <th>මල්ලක අගය</th>
                                <th>මල්ලක කුලිය</th>
                                <th>මෙහෙයුම්</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td style={{ textTransform: 'uppercase' }}>{item.no}</td>
                                    <td>{item.type}</td>
                                    <td>{Number(item.pack_cost).toFixed(2)}</td>
                                    <td>{Number(item.pack_due).toFixed(2)}</td>

                                    <td>
                                        <Link
                                            to={`/items/edit/${item.id}`}
                                            className="btn btn-primary btn-sm me-1"
                                        >
                                            යාවත්කාලීන
                                        </Link>

                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="btn btn-danger btn-sm"
                                        >
                                            මකන්න
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {items.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="text-center text-muted">
                                        භාණ්ඩ නොමැත
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx>{`
                .custom-card {
                    background-color: #006400 !important;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                    padding: 24px;
                }
                body {
                    background-color: #99ff99;
                }
                .table thead th {
                    background-color: #e6f0ff;
                    color: #003366;
                    text-align: center;
                }
                .table tbody td {
                    vertical-align: middle;
                    text-align: center;
                }
                .btn-sm {
                    font-size: 0.875rem;
                    padding: 6px 12px;
                }
                .table-hover tbody tr:hover {
                    background-color: #f1f5ff;
                }
                .btn-success {
                    background-color: #198754;
                }
            `}</style>
        </div>
    );
};

export default ItemList;
