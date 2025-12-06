import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ItemReportModal from '../Itemrepo/ItemReportModal';
import WeightReportModal from '../WeightReport/WeightReportModal';
import GrnSaleReportModal from '../GrnSale/ReportModal';
import GrnReportModal from '../GrnReport/GrnReportModal';
import SalesAdjustmentReportModal from '../SalesAdjustmentReport/SalesAdjustmentReportModal';
import GrnSalesOverviewReport from '../GrnSalesOverview/GrnSalesOverviewReport';
import GrnSalesOverviewReport2 from '../GrnSalesOverview/GrnSalesOverviewReport2';
import SalesReportModal from '../SalesReport/SalesReportModal';

const Layout = ({ children }) => {
  const location = useLocation();

  // === Modal States ===
  const [isItemReportModalOpen, setIsItemReportModalOpen] = useState(false);
  const [isWeightReportModalOpen, setIsWeightReportModalOpen] = useState(false);
  const [isGrnSaleReportModalOpen, setIsGrnSaleReportModalOpen] = useState(false);
  const [isSalesAdjustmentReportModalOpen, setIsSalesAdjustmentReportModalOpen] = useState(false);
  const [isGrnSalesOverviewReportOpen, setIsGrnSalesOverviewReportOpen] = useState(false);
  const [isGrnSalesOverviewReport2Open, setIsGrnSalesOverviewReport2Open] = useState(false);
  const [isSalesReportModalOpen, setIsSalesReportModalOpen] = useState(false);
  const [isGrnReportModalOpen, setIsGrnReportModalOpen] = useState(false);

  // === User State ===
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      window.location.href = '/login';
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // === Modal Handlers ===
  const openItemReportModal = () => setIsItemReportModalOpen(true);
  const closeItemReportModal = () => setIsItemReportModalOpen(false);
  const openWeightReportModal = () => setIsWeightReportModalOpen(true);
  const closeWeightReportModal = () => setIsWeightReportModalOpen(false);
  const openGrnSaleReportModal = () => setIsGrnSaleReportModalOpen(true);
  const closeGrnSaleReportModal = () => setIsGrnSaleReportModalOpen(false);
  const openSalesAdjustmentReportModal = () => setIsSalesAdjustmentReportModalOpen(true);
  const closeSalesAdjustmentReportModal = () => setIsSalesAdjustmentReportModalOpen(false);
  const openGrnSalesOverviewReport = () => setIsGrnSalesOverviewReportOpen(true);
  const closeGrnSalesOverviewReport = () => setIsGrnSalesOverviewReportOpen(false);
  const openGrnSalesOverviewReport2 = () => setIsGrnSalesOverviewReport2Open(true);
  const closeGrnSalesOverviewReport2 = () => setIsGrnSalesOverviewReport2Open(false);
  const openSalesReportModal = () => setIsSalesReportModalOpen(true);
  const closeSalesReportModal = () => setIsSalesReportModalOpen(false);
  const openGrnReportModal = () => {
    setIsGrnReportModalOpen(true);
  };
  const closeGrnReportModal = () => {
    setIsGrnReportModalOpen(false);
  };

  // Check if current page is SalesEntry to apply full-width layout
  const isSalesEntryPage = location.pathname === '/sales' || location.pathname === '/sales-entry';

  return (
    <div>
      {/* === Top Navigation Bar === */}
      <nav className="navbar navbar-expand-lg navbar-dark fixed-top" style={{ backgroundColor: '#004d00', width: '100%' }}>
        <div className="container-fluid d-flex align-items-center justify-content-between">
          {/* Left: Logo + Navigation Links */}
          <div className="d-flex align-items-center">
            <Link className="navbar-brand fw-bold d-flex align-items-center me-3" to="/">
              <i className="material-icons align-middle me-2">warehouse</i>
              Dashboard
            </Link>

            <div className="navbar-nav d-flex flex-row align-items-center">
              {/* Master Dropdown */}
              <div className="nav-item dropdown mx-1">
                <button
                  className="btn btn-outline-light btn-sm dropdown-toggle"
                  id="masterDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="material-icons align-middle me-1">menu_book</i> Master
                </button>

                <ul className="dropdown-menu dropdown-menu-dark" aria-labelledby="masterDropdown">
                  <li>
                    <Link
                      to="/customers"
                      className={`dropdown-item ${location.pathname === '/customers' ? 'active' : ''}`}
                    >
                      <i className="material-icons align-middle me-1">people</i> Customers
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/items"
                      className={`dropdown-item ${location.pathname === '/items' ? 'active' : ''}`}
                    >
                      <i className="material-icons align-middle me-1">inventory_2</i> Items
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/suppliers"
                      className={`dropdown-item ${location.pathname === '/suppliers' ? 'active' : ''}`}
                    >
                      <i className="material-icons align-middle me-1">local_shipping</i> Suppliers
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/commissions"
                      className={`dropdown-item ${location.pathname === '/commissions' ? 'active' : ''}`}
                    >
                      <i className="material-icons align-middle me-1">attach_money</i> Commisions
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>

                  {/* === New Report Buttons inside Dropdown === */}
                  <li>
                    <button
                      type="button"
                      className="dropdown-item text-warning"
                      onClick={() => window.location.href = '/customers-loans/report'}
                    >
                      <i className="material-icons align-middle me-1 text-warning">account_balance</i>
                      Loan Report
                    </button>
                  </li>
                </ul>
              </div>


              {/* Other links remain as they are */}
             
              <Link
                to="/supplierreport"
                className={`nav-link btn btn-outline-light btn-sm mx-1 ${location.pathname === '/supplierreport' ? 'active' : ''}`}
              >
                <i className="material-icons align-middle me-1">list_alt</i> Supplier Bills
              </Link>
            </div>

          </div>

          {/* Right: User Info + Logout */}
          {user && (
            <div className="d-flex align-items-center text-white">
              <span className="me-3">
                <i className="material-icons align-middle me-1">account_circle</i>
                {user.name || user.user_id} ({user.role})
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-sm btn-outline-light"
                style={{ fontWeight: 'bold' }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* === Main Content === */}
      {/* Remove container-fluid for SalesEntry page to allow full width */}
      <main
        className={isSalesEntryPage ? "p-0" : "container-fluid py-4"}
        style={{
          marginTop: '80px',
          marginBottom: '80px',
          width: '100%',
          maxWidth: isSalesEntryPage ? '100%' : undefined
        }}
      >
        {children}
      </main>

      {/* === Bottom Navigation Bar === */}
      <nav className="navbar navbar-expand-lg navbar-dark fixed-bottom" style={{ backgroundColor: '#004d00', width: '100%' }}>
        <div className="container-fluid d-flex justify-content-center">
          <div className="navbar-nav d-flex flex-row align-items-center">
            <button type="button" className="btn btn-outline-warning btn-sm mx-2" onClick={openItemReportModal}>
              <i className="material-icons align-middle me-1">analytics</i> Item Report
            </button>
            <button type="button" className="btn btn-outline-info btn-sm mx-2" onClick={openWeightReportModal}>
              <i className="material-icons align-middle me-1">scale</i> Weight Report
            </button>
           
            <button type="button" className="btn btn-outline-secondary btn-sm mx-2" onClick={openSalesAdjustmentReportModal}>
              <i className="material-icons align-middle me-1">edit</i> Sales Adjustment
            </button>
          
            <button type="button" className="btn btn-outline-light btn-sm mx-2" onClick={openSalesReportModal}>
              <i className="material-icons align-middle me-1">shopping_cart</i> Sales Report
            </button>
          </div>
        </div>
      </nav>

      {/* === Modals === */}
      <ItemReportModal isOpen={isItemReportModalOpen} onClose={closeItemReportModal} onGenerateReport={() => { }} loading={false} />
      <WeightReportModal isOpen={isWeightReportModalOpen} onClose={closeWeightReportModal} />
      <GrnSaleReportModal isOpen={isGrnSaleReportModalOpen} onClose={closeGrnSaleReportModal} />
      <SalesAdjustmentReportModal isOpen={isSalesAdjustmentReportModalOpen} onClose={closeSalesAdjustmentReportModal} />
      <GrnSalesOverviewReport isOpen={isGrnSalesOverviewReportOpen} onClose={closeGrnSalesOverviewReport} />
      <GrnSalesOverviewReport2 isOpen={isGrnSalesOverviewReport2Open} onClose={closeGrnSalesOverviewReport2} />
      <SalesReportModal isOpen={isSalesReportModalOpen} onClose={closeSalesReportModal} />
      <GrnReportModal
        isOpen={isGrnReportModalOpen}
        onClose={closeGrnReportModal}
      />
    </div>
  );
};

export default Layout;