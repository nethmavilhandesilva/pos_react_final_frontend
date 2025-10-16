import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ItemReportModal from '../Itemrepo/ItemReportModal';
import WeightReportModal from '../WeightReport/WeightReportModal';
import GrnSaleReportModal from '../GrnSale/ReportModal';
import SalesAdjustmentReportModal from '../SalesAdjustmentReport/SalesAdjustmentReportModal';
import GrnSalesOverviewReport from '../GrnSalesOverview/GrnSalesOverviewReport';
import GrnSalesOverviewReport2 from '../GrnSalesOverview/GrnSalesOverviewReport2';
import SalesReportModal from '../SalesReport/SalesReportModal';

const Layout = ({ children }) => {
  const location = useLocation();
  const [isItemReportModalOpen, setIsItemReportModalOpen] = useState(false);
  const [isWeightReportModalOpen, setIsWeightReportModalOpen] = useState(false);
  const [isGrnSaleReportModalOpen, setIsGrnSaleReportModalOpen] = useState(false);
  const [isSalesAdjustmentReportModalOpen, setIsSalesAdjustmentReportModalOpen] = useState(false);
  const [isGrnSalesOverviewReportOpen, setIsGrnSalesOverviewReportOpen] = useState(false); 
  const [isGrnSalesOverviewReport2Open, setIsGrnSalesOverviewReport2Open] = useState(false);
  const [isSalesReportModalOpen, setIsSalesReportModalOpen] = useState(false);

  // Open the modal
  const openItemReportModal = () => {
    setIsItemReportModalOpen(true);
  };

  const openWeightReportModal = () => {
    setIsWeightReportModalOpen(true);
  };

  // Close the modals
  const closeItemReportModal = () => {
    setIsItemReportModalOpen(false);
  };

  const closeWeightReportModal = () => {
    setIsWeightReportModalOpen(false);
  };
  const openGrnSaleReportModal = () => {
    setIsGrnSaleReportModalOpen(true);
  };
  const closeGrnSaleReportModal = () => {
    setIsGrnSaleReportModalOpen(false);
  };
    const openSalesAdjustmentReportModal = () => {
    setIsSalesAdjustmentReportModalOpen(true);
  };
   const closeSalesAdjustmentReportModal = () => {
    setIsSalesAdjustmentReportModalOpen(false);
  };
   const openGrnSalesOverviewReport = () => {
    setIsGrnSalesOverviewReportOpen(true);
  };
  const closeGrnSalesOverviewReport = () => {
    setIsGrnSalesOverviewReportOpen(false);
  };
  const openGrnSalesOverviewReport2 = () => {
    setIsGrnSalesOverviewReport2Open(true);
  };
  const closeGrnSalesOverviewReport2 = () => {
    setIsGrnSalesOverviewReport2Open(false);
  };
  const openSalesReportModal = () => {
    setIsSalesReportModalOpen(true);
  };
  const closeSalesReportModal = () => {
    setIsSalesReportModalOpen(false);
  };


  return (
    <div>
      {/* Top Navigation Bar */}
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
                className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/customers' ? 'active' : ''
                  }`}
              >
                <i className="material-icons align-middle me-1">people</i>
                Customers
              </Link>
              <Link
                to="/items"
                className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/items' ? 'active' : ''
                  }`}
              >
                <i className="material-icons align-middle me-1">inventory_2</i>
                Items
              </Link>
              <Link
                to="/suppliers"
                className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/suppliers' ? 'active' : ''
                  }`}
              >
                <i className="material-icons align-middle me-1">local_shipping</i>
                Suppliers
              </Link>
              <Link
                to="/grn"
                className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/grn' ? 'active' : ''
                  }`}
              >
                <i className="material-icons align-middle me-1">receipt</i>
                GRN List
              </Link>
              <Link
                to="/grn/entries"
                className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/grn/entries' ? 'active' : ''
                  }`}
              >
                <i className="material-icons align-middle me-1">add_box</i>
                GRN Entries
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container-fluid py-4" style={{ marginTop: '70px', marginBottom: '80px' }}>
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        className="navbar navbar-expand-lg navbar-dark fixed-bottom"
        style={{ backgroundColor: '#004d00', width: '100%' }}
      >
        <div className="container-fluid d-flex justify-content-center">
          <div className="navbar-nav d-flex flex-row align-items-center">
            {/* Report Buttons */}
            <button
              type="button"
              className="btn btn-outline-warning btn-sm mx-2"
              onClick={openItemReportModal}
            >
              <i className="material-icons align-middle me-1">analytics</i>
              Item Report
            </button>

            <button
              type="button"
              className="btn btn-outline-info btn-sm mx-2"
              onClick={openWeightReportModal}
            >
              <i className="material-icons align-middle me-1">scale</i>
              Weight Report
            </button>
             {/* NEW: GRN Sale Report Button */}
            <button
              type="button"
              className="btn btn-outline-light btn-sm mx-2"
              onClick={openGrnSaleReportModal}
            >
              <i className="material-icons align-middle me-1">receipt</i>
              GRN Sales Report
            </button>
            {/* NEW: Sales Adjustment Report Button */}
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm mx-2"
              onClick={openSalesAdjustmentReportModal}
            >
              <i className="material-icons align-middle me-1">edit</i>
              Sales Adjustment
            </button>
            {/* NEW: GRN Sales Overview Button */}
            <button
              type="button"
              className="btn btn-outline-success btn-sm mx-2"
              onClick={openGrnSalesOverviewReport}
            >
              <i className="material-icons align-middle me-1">dashboard</i>
              GRN Sales Overview
            </button>
             {/* NEW: GRN Sales Overview 2 Button */}
            <button
              type="button"
              className="btn btn-outline-primary btn-sm mx-2"
              onClick={openGrnSalesOverviewReport2}
            >
              <i className="material-icons align-middle me-1">summarize</i>
              GRN Overview 2
            </button>
             {/* NEW: Sales Report Button */}
            <button
              type="button"
              className="btn btn-outline-light btn-sm mx-2"
              onClick={openSalesReportModal}
            >
              <i className="material-icons align-middle me-1">shopping_cart</i>
              Sales Report
            </button>
          </div>
        </div>
      </nav>

      {/* Item Report Modal */}
      <ItemReportModal
        isOpen={isItemReportModalOpen}
        onClose={closeItemReportModal}
        onGenerateReport={() => { }}
        loading={false}
      />

      {/* Weight Report Modal */}
      <WeightReportModal
        isOpen={isWeightReportModalOpen}
        onClose={closeWeightReportModal}
      />
      {/* NEW: GRN Sale Report Modal */}
      <GrnSaleReportModal
        isOpen={isGrnSaleReportModalOpen}
        onClose={closeGrnSaleReportModal}
      />
       {/* NEW: Sales Adjustment Report Modal */}
      <SalesAdjustmentReportModal
        isOpen={isSalesAdjustmentReportModalOpen}
        onClose={closeSalesAdjustmentReportModal}
      />
       {/* NEW: GRN Sales Overview Report */}
      <GrnSalesOverviewReport
        isOpen={isGrnSalesOverviewReportOpen}
        onClose={closeGrnSalesOverviewReport}
      />
       {/* NEW: GRN Sales Overview Report 2 */}
      <GrnSalesOverviewReport2
        isOpen={isGrnSalesOverviewReport2Open}
        onClose={closeGrnSalesOverviewReport2}
      />
        {/* NEW: Sales Report Modal */}
      <SalesReportModal
        isOpen={isSalesReportModalOpen}
        onClose={closeSalesReportModal}
      />
    </div>
  );
};

export default Layout;