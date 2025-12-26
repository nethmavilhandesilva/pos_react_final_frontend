import React, { useState, useEffect } from 'react';
import api from '../../api'; // ← Use global axios instance
import { Link, useNavigate } from 'react-router-dom';

const SupplierList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSuppliers();
  }, []);

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

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100" style={{ backgroundColor: '#99ff99' }}>
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

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
        <Link className="navbar-brand fw-bold d-flex align-items-center mb-4 text-white text-decoration-none" to="/sales">
          <i className="material-icons me-2">warehouse</i>
          Dashboard
        </Link>

        <h6 className="text-uppercase text-light opacity-50 small fw-bold mb-3">Master Data</h6>
        <ul className="list-unstyled flex-grow-1">
          <li className="mb-2">
            <Link to="/customers" className="nav-link text-white d-flex align-items-center p-2 rounded">
              <i className="material-icons me-2">people</i> Customers
            </Link>
          </li>
          <li className="mb-2">
            <Link to="/items" className="nav-link text-white d-flex align-items-center p-2 rounded">
              <i className="material-icons me-2">inventory_2</i> Items
            </Link>
          </li>
          <li className="mb-2">
            <Link to="/suppliers" className="nav-link text-white d-flex align-items-center p-2 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <i className="material-icons me-2">local_shipping</i> Suppliers
            </Link>
          </li>
          <li className="mb-2">
            <Link to="/commissions" className="nav-link text-white d-flex align-items-center p-2 rounded">
              <i className="material-icons me-2">attach_money</i> Commissions
            </Link>
          </li>
          <hr className="bg-light" />
          <li className="mb-2">
            <button
              type="button"
              className="btn btn-link text-warning text-decoration-none d-flex align-items-center p-0"
              onClick={() => (window.location.href = '/customers-loans/report')}
            >
              <i className="material-icons me-2">account_balance</i> Loan Report
            </button>
          </li>
        </ul>

        <div className="mt-auto pt-3 border-top border-secondary">
          <button
            onClick={handleLogout}
            className="btn btn-outline-light w-100 fw-bold d-flex align-items-center justify-content-center"
          >
            <i className="material-icons me-2">logout</i> Logout
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div style={{ marginLeft: '260px', flexGrow: 1, padding: '30px', width: 'calc(100vw - 260px)' }}>
        <div
          className="card shadow-lg border-0 rounded-4"
          style={{
            backgroundColor: '#006400',
            color: '#fff',
            overflow: 'hidden'
          }}
        >
          <div className="card-header border-0 py-4 text-center">
            <h2 className="fw-bold mb-0">📦 සැපයුම්කරුවන් (Suppliers)</h2>
          </div>

          <div className="card-body bg-light text-dark">
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
                style={{ maxWidth: '300px', border: '1px solid #ced4da' }}
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
              <table className="table table-hover align-middle mb-0 bg-white shadow-sm">
                <thead style={{ backgroundColor: '#004d00', color: 'white' }}>
                  <tr className="text-center">
                    <th>සංකේතය (Code)</th>
                    <th>නම (Name)</th>
                    <th>ලිපිනය (Address)</th>
                    <th>මෙහෙයුම් (Actions)</th>
                  </tr>
                </thead>

                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center text-muted py-3">
                        සැපයුම්කරුවන් නොමැත
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((supplier) => (
                      <tr key={supplier.id} className="text-center">
                        <td style={{ textTransform: 'uppercase' }} className="fw-bold">{supplier.code}</td>
                        <td>{supplier.name}</td>
                        <td>{supplier.address}</td>
                        <td>
                          <Link
                            to={`/suppliers/edit/${supplier.id}`}
                            className="btn btn-warning btn-sm me-1 fw-bold"
                          >
                            යාවත්කාලීන
                          </Link>

                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="btn btn-danger btn-sm fw-bold"
                          >
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
    </div>
  );
};

export default SupplierList;