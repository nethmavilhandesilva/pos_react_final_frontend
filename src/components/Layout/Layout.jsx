import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../api';
import ItemReportModal from '../Itemrepo/ItemReportModal';
import WeightReportModal from '../WeightReport/WeightReportModal';
import GrnSaleReportModal from '../GrnSale/ReportModal';
import GrnReportModal from '../GrnReport/GrnReportModal';
import SalesAdjustmentReportModal from '../SalesAdjustmentReport/SalesAdjustmentReportModal';
import GrnSalesOverviewReport from '../GrnSalesOverview/GrnSalesOverviewReport';
import GrnSalesOverviewReport2 from '../GrnSalesOverview/GrnSalesOverviewReport2';
import SalesReportModal from '../SalesReport/SalesReportModal';
import DayProcessModal from '../Modals/DayProcessModal';

const Layout = ({ children, currentView, billSize, handleBillSizeChange }) => {
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
    const [isDayProcessModalOpen, setIsDayProcessModalOpen] = useState(false);

    // === User & Settings State ===
    const [user, setUser] = useState(null);
    const [settingValue, setSettingValue] = useState(''); // 🚀 NEW: State for the 'value' column

    // === Bottom Password States ===
    const [bottomPassword, setBottomPassword] = useState('');
    const [isBottomUnlocked, setIsBottomUnlocked] = useState(false);
    const HARD_CODED_PASSWORD = 'nethma123';

    useEffect(() => {
        // 1. Handle User Session
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            window.location.href = '/login';
        }

        // 🚀 2. Fetch Setting Value from Backend using your api.js
        const fetchSettings = async () => {
            try {
                const response = await api.get('/settings');
                if (response.data) {
                    setSettingValue(response.data.value || response.data[0]?.value || '');
                }
            } catch (error) {
                console.error("Error fetching settings data:", error);
            }
        };

        fetchSettings();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'sms/login';
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
    const openGrnReportModal = () => setIsGrnReportModalOpen(true);
    const closeGrnReportModal = () => setIsGrnReportModalOpen(false);
    const openDayProcessModal = () => setIsDayProcessModalOpen(true);
    const closeDayProcessModal = () => setIsDayProcessModalOpen(false);

    const handleProfitReportClick = () => {
        window.location.href = '/supplier-profit';
    };

    const isSalesEntryPage = location.pathname === '/sales' || location.pathname === '/sales-entry';
    const navTextBtn = {
        background: "none",
        border: "none",
        color: "#fff",
        fontWeight: "700",
        fontSize: "14px",
        margin: "0 28px",
        padding: "0",
        cursor: "pointer",
        whiteSpace: "nowrap"
    };

    // === Password input handler for bottom buttons ===
    const handleBottomPasswordChange = (e) => {
        const value = e.target.value;
        setBottomPassword(value);
        if (value === HARD_CODED_PASSWORD) {
            setIsBottomUnlocked(true);
        } else {
            setIsBottomUnlocked(false);
        }
    };

    return (
        <div>
            {/* === Top Navigation Bar === */}
            <nav className="navbar navbar-expand-lg navbar-dark fixed-top" style={{ backgroundColor: '#004d00', width: '100%' }}>
                <div className="container-fluid d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <Link className="navbar-brand fw-bold d-flex align-items-center me-3" to="/">
                            <i className="material-icons align-middle me-2">warehouse</i>
                            මුල් පිටුව
                        </Link>

                        <div className="navbar-nav d-flex flex-row align-items-center">
                            <div className="nav-item dropdown mx-1">
                                <button className="btn btn-outline-light btn-sm dropdown-toggle" id="masterDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i className="material-icons align-middle me-1">menu_book</i> ප්‍රධාන ගොනුව
                                </button>
                                <ul className="dropdown-menu dropdown-menu-dark" aria-labelledby="masterDropdown">
                                    <li><Link to="/customers" className="dropdown-item"><i className="material-icons align-middle me-1">people</i> පාරිභෝගිකයින්</Link></li>
                                    <li><Link to="/items" className="dropdown-item"><i className="material-icons align-middle me-1">inventory_2</i> භාණ්ඩ</Link></li>
                                    <li><Link to="/suppliers" className="dropdown-item"><i className="material-icons align-middle me-1">local_shipping</i> සැපයුම්කරුවන්</Link></li>
                                    <li><Link to="/commissions" className="dropdown-item"><i className="material-icons align-middle me-1">attach_money</i>කොමිස් මුදල්</Link></li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li>
                                        <button type="button" className="dropdown-item text-warning" onClick={() => window.location.href = '/customers-loans/report'}>
                                            <i className="material-icons align-middle me-1 text-warning">account_balance</i> ණය වාර්තාව
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            <Link
                                to="/customers-loans"
                                className="btn btn-outline-success btn-sm mx-1"
                                style={{ fontWeight: 'bold', color: '#fff' }}
                            >

                                ණය දීම/ගැනීම
                            </Link>

                            <Link
                                to="/supplierreport"
                                className="btn btn-outline-success btn-sm mx-1"
                                style={{ fontWeight: 'bold', color: '#fff' }}
                            >

                                සැපයුම්කරු බිල්පත්
                            </Link>

                            <button
                                type="button"
                                className="btn btn-outline-success btn-sm mx-1"
                                style={{ fontWeight: 'bold', color: '#fff' }}
                                onClick={openDayProcessModal}
                            >

                                දින අවසාන ක්‍රියාවලිය
                            </button>
                        </div>

                        {isSalesEntryPage && (
                            <div className="d-flex align-items-center me-3" style={{ marginLeft: '20px' }}>
                                <label htmlFor="bill-size-select" className="text-white me-2" style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Bill Size:</label>
                                <select id="bill-size-select" value={billSize} onChange={handleBillSizeChange} className="form-select form-select-sm" style={{ width: '100px', backgroundColor: '#006400', color: 'white', border: '1px solid #4a5568' }}>
                                    <option value="3inch">3 Inch (Def)</option>
                                    <option value="4inch">4 Inch</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Display fetched value in Red and Logout Button */}
                    {user && (
                        <div className="d-flex align-items-center text-white">
                            <span className="me-3 fw-bold" style={{ color: '#ff4444', fontSize: '1.1rem' }}>
                                {settingValue}
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

            {/* Main Content */}
            <main className={isSalesEntryPage ? "p-0" : "container-fluid py-4"} style={{ marginTop: '80px', marginBottom: '80px', width: '100%', maxWidth: isSalesEntryPage ? '100%' : undefined }}>
                {children}
            </main>

            {/* === Bottom Nav with Password Protection === */}
            <nav className="navbar navbar-expand-lg navbar-dark fixed-bottom" style={{ backgroundColor: '#004d00', width: '100%' }}>
                <div className="container-fluid d-flex justify-content-start align-items-center">
                    {/* Password Input on the Left */}
                    <input
                        type="password"
                        placeholder="Enter password"
                        value={bottomPassword}
                        onChange={handleBottomPasswordChange}
                        className="form-control form-control-sm me-3"
                        style={{
                            width: '100px',
                            backgroundColor: '#003300',
                            color: '#fff',
                            border: '1px solid #66bb6a'
                        }}
                    />

                    {/* Bottom Buttons */}
                    {[
                        { label: 'එළවළු', onClick: openItemReportModal },
                        { label: 'බර මත', onClick: openWeightReportModal },
                        { label: 'වෙනස් කිරීම', onClick: openSalesAdjustmentReportModal },
                        { label: 'ආදායම් / වියදම්', onClick: () => window.location.href = '/financial-report' },
                        { label: 'විකුණුම් වාර්තාව', onClick: openSalesReportModal },
                        { label: 'සැපයුම්කරු ලාභ වාර්තාව', onClick: handleProfitReportClick }
                    ].map((btn, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={btn.onClick}
                            style={{
                                ...navTextBtn,
                                fontSize: '16px',        // 🔹 increase font size (try 17px / 18px if needed)
                                fontWeight: '700',       // 🔹 bold text
                                letterSpacing: '0.5px',  // 🔹 nicer Sinhala spacing
                                opacity: isBottomUnlocked ? 1 : 0.4,
                                pointerEvents: isBottomUnlocked ? 'auto' : 'none',
                                marginRight: '20px'      // gap between buttons
                            }}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </nav>
            {/* Modals */}
            <ItemReportModal isOpen={isItemReportModalOpen} onClose={closeItemReportModal} onGenerateReport={() => { }} loading={false} />
            <WeightReportModal isOpen={isWeightReportModalOpen} onClose={closeWeightReportModal} />
            <GrnSaleReportModal isOpen={isGrnSaleReportModalOpen} onClose={closeGrnSaleReportModal} />
            <SalesAdjustmentReportModal isOpen={isSalesAdjustmentReportModalOpen} onClose={closeSalesAdjustmentReportModal} />
            <GrnSalesOverviewReport isOpen={isGrnSalesOverviewReportOpen} onClose={closeGrnSalesOverviewReport} />
            <GrnSalesOverviewReport2 isOpen={isGrnSalesOverviewReport2Open} onClose={closeGrnSalesOverviewReport2} />
            <SalesReportModal isOpen={isSalesReportModalOpen} onClose={closeSalesReportModal} />
            <GrnReportModal isOpen={isGrnReportModalOpen} onClose={closeGrnReportModal} />
            <DayProcessModal isOpen={isDayProcessModalOpen} onClose={closeDayProcessModal} />
        </div>
    );
};

export default Layout;