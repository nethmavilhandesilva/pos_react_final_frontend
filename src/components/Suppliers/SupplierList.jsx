import React, { useState, useEffect } from 'react';
import { supplierService } from '../../services/supplierService';
import { Link } from 'react-router-dom';


const SupplierList = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            const response = await supplierService.getAll();
            setSuppliers(response.data);
        } catch (error) {
            console.error('Error loading suppliers:', error);
            setMessage('Error loading suppliers');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (value.trim() === '') {
            loadSuppliers();
            return;
        }

        try {
            const response = await supplierService.search(value);
            setSuppliers(response.data);
        } catch (error) {
            console.error('Error searching suppliers:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('මෙම සැපයුම්කරු මකන්නද?')) {
            try {
                await supplierService.delete(id);
                setMessage('Supplier deleted successfully!');
                loadSuppliers();
            } catch (error) {
                console.error('Error deleting supplier:', error);
                setMessage('Error deleting supplier');
            }
        }
    };

    if (loading) {
        return <div className="text-center">Loading...</div>;
    }

    return (
        <div className="container-fluid mt-5">
            <div className="custom-card items-list-container">
                <h2 className="mb-4 text-center text-primary">📦 සැපයුම්කරුවන් (Suppliers)</h2>

                <div className="d-flex justify-content-between mb-3">
                    <Link to="/suppliers/create" className="btn btn-add">
                        + නව සැපයුම්කරු
                    </Link>
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={handleSearch}
                        className="form-control form-control-sm" 
                        placeholder="කේතය, නම හෝ ලිපිනය අනුව සොයන්න"
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
                                <th>සංකේතය (Code)</th>
                                <th>නම (Name)</th>
                                <th>ලිපිනය (Address)</th>
                                <th>මෙහෙයුම් (Actions)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map((supplier) => (
                                <tr key={supplier.id}>
                                    <td style={{ textTransform: 'uppercase' }}>{supplier.code}</td>
                                    <td>{supplier.name}</td>
                                    <td>{supplier.address}</td>
                                    <td>
                                        <Link 
                                            to={`/suppliers/edit/${supplier.id}`} 
                                            className="btn btn-warning btn-sm me-1"
                                        >
                                            යාවත්කාලීන
                                        </Link>
                                        <button 
                                            onClick={() => handleDelete(supplier.id)}
                                            className="btn btn-danger btn-sm"
                                        >
                                            මකන්න
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {suppliers.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center text-muted">
                                        සැපයුම්කරුවන් නොමැත
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SupplierList;