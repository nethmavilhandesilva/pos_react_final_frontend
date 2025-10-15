import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Dashboard = () => {
  const location = useLocation();

  return (
    <div className="container-fluid">
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
        <div className="container-fluid">
          {/* Brand */}
          <Link className="navbar-brand fw-bold" to="/">
            <i className="material-icons align-middle me-2">dashboard</i>
            Dashboard
          </Link>

          {/* Navigation Buttons */}
          <div className="navbar-nav ms-auto">
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
              GRN
            </Link>
            <Link 
              to="/grn/entries" 
              className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/grn/entries' ? 'active' : ''}`}
            >
              <i className="material-icons align-middle me-1">add_box</i>
              GRN Entries
            </Link>
            <Link 
              to="/customers-loans" 
              className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/customers-loans' ? 'active' : ''}`}
            >
              <i className="material-icons align-middle me-1">account_balance_wallet</i>
              Customer Loans
            </Link>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body text-center">
              <h1 className="display-4 text-primary mb-4">
                <i className="material-icons align-middle">warehouse</i>
                Welcome to GRN Management System
              </h1>
              <p className="lead mb-4">
                Manage your inventory, suppliers, customers, and GRN entries from one centralized dashboard.
              </p>
              
              {/* Quick Action Buttons */}
              <div className="row justify-content-center">
                <div className="col-auto mb-3">
                  <Link to="/customers" className="btn btn-primary btn-lg mx-2">
                    <i className="material-icons align-middle me-2">people</i>
                    Manage Customers
                  </Link>
                </div>
                <div className="col-auto mb-3">
                  <Link to="/items" className="btn btn-success btn-lg mx-2">
                    <i className="material-icons align-middle me-2">inventory_2</i>
                    Manage Items
                  </Link>
                </div>
                <div className="col-auto mb-3">
                  <Link to="/suppliers" className="btn btn-info btn-lg mx-2">
                    <i className="material-icons align-middle me-2">local_shipping</i>
                    Manage Suppliers
                  </Link>
                </div>
                <div className="col-auto mb-3">
                  <Link to="/grn/entries" className="btn btn-warning btn-lg mx-2">
                    <i className="material-icons align-middle me-2">add_box</i>
                    GRN Entries
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;