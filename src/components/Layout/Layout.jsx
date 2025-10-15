import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();

  return (
    <div>
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container-fluid">
          {/* Brand */}
          <Link className="navbar-brand fw-bold" to="/">
            <i className="material-icons align-middle me-2">warehouse</i>
            GRN System
          </Link>

          {/* Navigation Buttons */}
          <div className="navbar-nav ms-auto">
            <Link 
              to="/" 
              className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/' ? 'active' : ''}`}
            >
              <i className="material-icons align-middle me-1">dashboard</i>
              Dashboard
            </Link>
            <Link 
              to="/customers" 
              className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/customers' ? 'active' : ''}`}
            >
              <i className="material-icons align-middle me-1">people</i>
              Customers
            </Link>
            <Link 
              to="/items" 
              className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/items' ? 'active' : ''}`}
            >
              <i className="material-icons align-middle me-1">inventory_2</i>
              Items
            </Link>
            <Link 
              to="/suppliers" 
              className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/suppliers' ? 'active' : ''}`}
            >
              <i className="material-icons align-middle me-1">local_shipping</i>
              Suppliers
            </Link>
            <Link 
              to="/grn" 
              className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/grn' ? 'active' : ''}`}
            >
              <i className="material-icons align-middle me-1">receipt</i>
              GRN List
            </Link>
            <Link 
              to="/grn/entries" 
              className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/grn/entries' ? 'active' : ''}`}
            >
              <i className="material-icons align-middle me-1">add_box</i>
              GRN Entries
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container-fluid py-4">
        {children}
      </main>
    </div>
  );
};

export default Layout;