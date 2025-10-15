import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        {/* Left corner button */}
        <Link 
          to="/items" 
          className="btn btn-primary btn-sm me-3"
        >
          <i className="material-icons align-middle me-1">inventory_2</i>
          Items
        </Link>

        {/* Brand/Logo */}
        <Link className="navbar-brand" to="/">
          <i className="material-icons align-middle me-2">warehouse</i>
          GRN Management System
        </Link>

        {/* Navigation links */}
        <div className="navbar-nav ms-auto">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <i className="material-icons align-middle me-1">home</i>
            Home
          </Link>
          <Link 
            to="/grn/entries" 
            className={`nav-link ${location.pathname === '/grn/entries' ? 'active' : ''}`}
          >
            <i className="material-icons align-middle me-1">receipt</i>
            GRN Entries
          </Link>
          <Link 
            to="/grn" 
            className={`nav-link ${location.pathname === '/grn' ? 'active' : ''}`}
          >
            <i className="material-icons align-middle me-1">list_alt</i>
            GRN List
          </Link>
          <Link 
            to="/customers" 
            className={`nav-link ${location.pathname === '/customers' ? 'active' : ''}`}
          >
            <i className="material-icons align-middle me-1">people</i>
            Customers
          </Link>
          <Link 
            to="/suppliers" 
            className={`nav-link ${location.pathname === '/suppliers' ? 'active' : ''}`}
          >
            <i className="material-icons align-middle me-1">local_shipping</i>
            Suppliers
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;