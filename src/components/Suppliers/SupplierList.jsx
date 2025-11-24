import React, { useState, useEffect } from 'react';
import api from '../../api'; // ← Use global axios instance
import { Link } from 'react-router-dom';

const SupplierList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  // 📌 Load all suppliers
  const loadSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setMessage('Error loading suppliers');
    } finally {
      setLoading(false);
    }
  };

  // 📌 Search suppliers
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim() === '') {
      loadSuppliers();
      return;
    }

    try {
      const response = await api.get(`/suppliers/search/${value}`);
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error searching suppliers:', error);
    }
  };

  // 📌 Delete supplier
  const handleDelete = async (id) => {
    if (window.confirm('මෙම සැපයුම්කරු මකන්නද?')) {
      try {
        await api.delete(`/suppliers/${id}`);
        setMessage('Supplier deleted successfully!');
        loadSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
        setMessage('Error deleting supplier');
      }
    }
  };

  // 📌 Loading screen
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ marginTop: '80px' }}>
      <div
        className="card shadow-lg border-0 rounded-4"
        style={{
          backgroundColor: '#004d00',
          color: '#fff',
        }}
      >
        <div className="card-header border-0 py-4 text-center">
          <h2 className="fw-bold mb-0">📦 සැපයුම්කරුවන් (Suppliers)</h2>
        </div>

        <div className="card-body bg-light text-dark rounded-bottom-4">
          {/* Top Bar */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-3 gap-2">
            <Link to="/suppliers/create" className="btn btn-success fw-bold px-4 shadow-sm">
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

          {/* Message */}
          {message && (
            <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'} text-center py-2`}>
              {message}
            </div>
          )}

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead
                style={{
                  backgroundColor: '#004d00',
                  color: 'white',
                }}
              >
                <tr>
                  <th>සංකේතය (Code)</th>
                  <th>නම (Name)</th>
                  <th>ලිපිනය (Address)</th>
                  <th className="text-center">මෙහෙයුම් (Actions)</th>
                </tr>
              </thead>

              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td style={{ textTransform: 'uppercase' }}>{supplier.code}</td>
                    <td>{supplier.name}</td>
                    <td>{supplier.address}</td>
                    <td className="text-center">
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
                    <td colSpan="4" className="text-center text-muted py-3">
                      සැපයුම්කරුවන් නොමැත
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SupplierList;
