import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ItemReportModal from '../Itemrepo/ItemReportModal'; // Your file path

const Layout = ({ children }) => {
  const location = useLocation();
  const [isItemReportModalOpen, setIsItemReportModalOpen] = useState(false);

  // Open the modal
  const openItemReportModal = () => {
    setIsItemReportModalOpen(true);
  };

  // Close the modal
  const closeItemReportModal = () => {
    setIsItemReportModalOpen(false);
  };

  return (
    <div>
      {/* Navigation Bar */}
      <nav
        className="navbar navbar-expand-lg navbar-dark fixed-top"
        style={{ backgroundColor: '#004d00', width: '100%' }}
      >
        <div className="container-fluid d-flex align-items-center">
          {/* Brand + Navigation Buttons Together */}
          <div className="d-flex align-items-center">
            <Link className="navbar-brand fw-bold d-flex align-items-center me-2" to="/">
              <i className="material-icons align-middle me-2">warehouse</i>
              Dashboard
            </Link>

            {/* Navigation Buttons */}
            <div className="navbar-nav d-flex flex-row align-items-center">
              <Link
                to="/customers"
                className={`nav-link btn btn-outline-light btn-sm mx-1 ${
                  location.pathname === '/customers' ? 'active' : ''
                }`}
              >
                <i className="material-icons align-middle me-1">people</i>
                Customers
              </Link>
              <Link
                to="/items"
                className={`nav-link btn btn-outline-light btn-sm mx-1 ${
                  location.pathname === '/items' ? 'active' : ''
                }`}
              >
                <i className="material-icons align-middle me-1">inventory_2</i>
                Items
              </Link>
              <Link
                to="/suppliers"
                className={`nav-link btn btn-outline-light btn-sm mx-1 ${
                  location.pathname === '/suppliers' ? 'active' : ''
                }`}
              >
                <i className="material-icons align-middle me-1">local_shipping</i>
                Suppliers
              </Link>
              <Link
                to="/grn"
                className={`nav-link btn btn-outline-light btn-sm mx-1 ${
                  location.pathname === '/grn' ? 'active' : ''
                }`}
              >
                <i className="material-icons align-middle me-1">receipt</i>
                GRN List
              </Link>
              <Link
                to="/grn/entries"
                className={`nav-link btn btn-outline-light btn-sm mx-1 ${
                  location.pathname === '/grn/entries' ? 'active' : ''
                }`}
              >
                <i className="material-icons align-middle me-1">add_box</i>
                GRN Entries
              </Link>

              {/* Button to open Item Report Modal */}
              <button
                type="button"
                className="btn btn-outline-warning btn-sm mx-1"
                onClick={openItemReportModal}
              >
                <i className="material-icons align-middle me-1">analytics</i>
                Item Report
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container-fluid py-4" style={{ marginTop: '70px' }}>
        {children}
      </main>

      {/* Item Report Modal */}
      <ItemReportModal
        isOpen={isItemReportModalOpen}
        onClose={closeItemReportModal}
        onGenerateReport={() => {}} // Empty function since you don't need it
        loading={false}
      />
    </div>
  );
};

export default Layout;