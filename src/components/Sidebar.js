import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    // Helper to check if a link is active
    const isActive = (path) => location.pathname === path;

    const sidebarStyle = {
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
    };

    const linkStyle = (path) => ({
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '10px',
        borderRadius: '8px',
        marginBottom: '8px',
        color: 'white',
        backgroundColor: isActive(path) ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
        fontWeight: isActive(path) ? 'bold' : 'normal',
        transition: '0.3s'
    });

    return (
        <div style={sidebarStyle}>
            <Link className="fw-bold d-flex align-items-center mb-4 text-white text-decoration-none" to="/">
                <i className="material-icons me-2">warehouse</i>
                Dashboard
            </Link>

            <h6 className="text-uppercase text-light opacity-50 small fw-bold mb-3">Master Data</h6>
            
            <nav className="flex-grow-1">
                <Link to="/customers" style={linkStyle('/customers')}>
                    <i className="material-icons me-2">people</i> Customers
                </Link>
                
                <Link to="/items" style={linkStyle('/items')}>
                    <i className="material-icons me-2">inventory_2</i> Items
                </Link>
                
                <Link to="/suppliers" style={linkStyle('/suppliers')}>
                    <i className="material-icons me-2">local_shipping</i> Suppliers
                </Link>
                
                <Link to="/commissions" style={linkStyle('/commissions')}>
                    <i className="material-icons me-2">attach_money</i> Commissions
                </Link>

                <hr className="bg-light" />

                <Link to="/customers-loans" style={linkStyle('/customers-loans')}>
                    <i className="material-icons me-2">paid</i> ණය දීම/ගැනීම
                </Link>

                <button
                    type="button"
                    className="btn btn-link text-warning text-decoration-none d-flex align-items-center p-2 w-100"
                    onClick={() => (window.location.href = '/customers-loans/report')}
                    style={{ fontWeight: isActive('/customers-loans/report') ? 'bold' : 'normal' }}
                >
                    <i className="material-icons me-2">account_balance</i> Loan Report
                </button>
            </nav>

            <div className="mt-auto pt-3 border-top border-secondary">
                <button
                    onClick={handleLogout}
                    className="btn btn-outline-light w-100 fw-bold d-flex align-items-center justify-content-center"
                >
                    <i className="material-icons me-2">logout</i> Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;