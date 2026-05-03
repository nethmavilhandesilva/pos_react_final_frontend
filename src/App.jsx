// src/App.jsx - ULTIMATE FIX FOR MANUAL URL BLOCKING
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import api from './api';

// Import All Components
import CustomerList from './components/Customers/CustomerList';
import CustomerForm from './components/Customers/CustomerForm';
import ItemList from './components/Items/ItemList';
import CreateItem from './components/Items/CreateItem';
import EditItem from './components/Items/EditItem';
import SupplierList from './components/Suppliers/SupplierList';
import CreateSupplier from './components/Suppliers/CreateSupplier';
import EditSupplier from './components/Suppliers/EditSupplier';
import GrnList from './components/Grn/GrnList';
import CreateGrn from './components/Grn/CreateGrn';
import EditGrn from './components/Grn/EditGrn';
import LoanManager from './components/LoanManager/LoanManager';
import GrnEntryForm from './components/Grn/GrnEntryForm';
import Dashboard from './components/Dashboard/Dashboard';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import LoanReportView from './components/LoanReport/LoanReportView';
import SalesEntry from './components/SalesEntry/SalesEntry';
import SupplierReport from './components/Suppliers/SupplierReport';
import SupplierDetailsModal from './components/Suppliers/SupplierDetailsModal';
import CommissionPage from './components/Commission/CommissionPage';
import SupplierProfitReport from './components/Suppliers/SupplierProfitReport';
import FinancialReport from './components/Reports/FinancialReport';
import LoanReportManager from './components/LoanManager/LoanReportManager';
import SupplierReport2 from './components/Reports/supplierfinalreport';
import PrintedSalesReport from './components/Reports/PrintedSalesReport';
import SalesReport from './components/Reports/SalesReport2';
import PublicBill from './pages/PublicBill';
import SupplierdobReport from './components/Suppliers/SupplierdobReport';
import ViewSupplierBill from './pages/ViewSupplierBill';
import FarmerLoanManager from './components/LoanManager/FarmerLoanManager';
import SupplierReportPrinted from './components/Suppliers/SupplierReportPrinted';
import SupplierLoanReport from './components/Reports/SupplierLoanReport';
import SupplierFinalReport from './components/Reports/SupplierFullReport';
import PrintedBills from './components/SalesEntry/PrintedBills';
import Banks from './components/Banks/Banks';
import BankDashboard from './components/Banks/BankDashboard';
import PaymentCollectionReport from './components/SalesEntry/PaymentCollectionReport';
import PaymentCollectionReport2 from './components/Suppliers/PaymentCollectionReport2';
import UtilityTypeManager from './components/UtilityTypes/UtilityTypeManager';
import IncomeExpenseReport2 from './components/CustomersLoans/IncomeExpenseReport2';

const getBasePath = () => {
    if (window.location.hostname === 'goviraju.lk') {
        return '/sms_new_frontend_50500';
    }
    return '';
};

const basePath = getBasePath();

const LoadingSpinner = () => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '16px',
        color: '#64748b'
    }}>
        Loading...
    </div>
);

// ✅ FIXED: Auth Provider as a Layout Route
const AuthLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const currentPath = location.pathname;
            const token = localStorage.getItem('token');
            
            console.log('🔐 AuthLayout - Checking path:', currentPath);
            
            // PUBLIC PATHS - These are the ONLY ones accessible without authentication
            const publicPaths = ['/login', '/register', '/unauthorized'];
            const isPublicPath = publicPaths.includes(currentPath);
            
            // Bill view paths (public with token in URL)
            const isBillView = currentPath.startsWith('/view-bill') || 
                              currentPath.startsWith('/view-supplier-bill');
            
            // If it's a public path or bill view, allow access immediately
            if (isPublicPath || isBillView) {
                console.log('✅ AuthLayout - Public path allowed:', currentPath);
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
            }
            
            // For ALL OTHER PATHS, require authentication
            if (!token) {
                console.log('❌ AuthLayout - No token, redirecting to login from:', currentPath);
                sessionStorage.setItem('redirectAfterLogin', currentPath);
                navigate('/login', { replace: true });
                setIsLoading(false);
                return;
            }
            
            // Validate token with backend
            try {
                console.log('🔍 AuthLayout - Validating token...');
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const response = await api.get('/user');
                
                if (response.data.success && response.data.user) {
                    console.log('✅ AuthLayout - Token valid for:', response.data.user.role);
                    localStorage.setItem('userData', JSON.stringify(response.data.user));
                    setIsAuthenticated(true);
                } else {
                    console.log('❌ AuthLayout - Invalid token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('userData');
                    navigate('/login', { replace: true });
                }
            } catch (error) {
                console.error('❌ AuthLayout - Token validation failed:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                navigate('/login', { replace: true });
            } finally {
                setIsLoading(false);
            }
        };
        
        checkAuth();
    }, [location.pathname, navigate]);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return isAuthenticated ? <Outlet /> : null;
};

// ✅ Role-based protection
const RequireRole = ({ children, allowedRoles }) => {
    const userData = localStorage.getItem('userData');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (!userData) {
            setIsAuthorized(false);
            setIsChecking(false);
            return;
        }
        
        try {
            const user = JSON.parse(userData);
            if (allowedRoles.includes(user.role)) {
                setIsAuthorized(true);
            } else {
                setIsAuthorized(false);
            }
        } catch (error) {
            setIsAuthorized(false);
        } finally {
            setIsChecking(false);
        }
    }, [userData, allowedRoles]);

    if (isChecking) {
        return <LoadingSpinner />;
    }

    return isAuthorized ? children : <Navigate to="/unauthorized" replace />;
};

// ✅ Root redirect based on role
const RootRedirect = () => {
    const userData = localStorage.getItem('userData');
    
    if (!userData) {
        return <Navigate to="/login" replace />;
    }
    
    try {
        const user = JSON.parse(userData);
        const role = user.role;
        
        if (role === 'level2') {
            return <Navigate to="/printed-bills" replace />;
        } else if (role === 'level3') {
            return <Navigate to="/bank-dashboard" replace />;
        } else if (role === 'level4') {
            return <Navigate to="/supplierreport" replace />;
        } else {
            return <Navigate to="/dashboard" replace />;
        }
    } catch (error) {
        return <Navigate to="/login" replace />;
    }
};

// ✅ UnAuthorizedPage component
const UnAuthorizedPage = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: "'Inter', sans-serif",
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                maxWidth: '400px',
                width: '90%',
            }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#ef4444', marginBottom: '12px' }}>Access Denied</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
                    You don't have permission to access this page.
                    <br /><br />
                    Please contact your administrator if you believe this is an error.
                </p>
                <button 
                    onClick={() => navigate('/login')}
                    style={{
                        padding: '10px 24px',
                        backgroundColor: '#4F46E5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                    }}
                >
                    Go to Login
                </button>
            </div>
        </div>
    );
};

// ✅ Main App Routes - IMPROVED STRUCTURE
const AppRoutes = () => {
    return (
        <Routes>
            {/* Public Routes - These are accessible without login */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnAuthorizedPage />} />
            <Route path="/view-bill/:token" element={<PublicBill />} />
            <Route path="/view-supplier-bill/:token" element={<ViewSupplierBill />} />

            {/* Protected Routes - All wrapped with AuthLayout */}
            <Route element={<AuthLayout />}>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<CustomerList />} />
                <Route path="/customers/create" element={<CustomerForm mode="create" />} />
                <Route path="/customers/:id/edit" element={<CustomerForm mode="edit" />} />
                <Route path="/items" element={<ItemList />} />
                <Route path="/items/create" element={<CreateItem />} />
                <Route path="/items/edit/:id" element={<EditItem />} />
                <Route path="/suppliers" element={<SupplierList />} />
                <Route path="/suppliers/create" element={<CreateSupplier />} />
                <Route path="/suppliers/edit/:id" element={<EditSupplier />} />
                <Route path="/grn" element={<GrnList />} />
                <Route path="/grn/create" element={<CreateGrn />} />
                <Route path="/grn/edit/:id" element={<EditGrn />} />
                <Route path="/grn/entries" element={<GrnEntryForm />} />
                <Route path="/customers-loans" element={<LoanManager />} />
                <Route path="/customers-loans/report" element={<LoanReportView />} />
                <Route path="/sales" element={<SalesEntry />} />
                <Route path="/commissions" element={<CommissionPage />} />
                <Route path="/income-expense-report2" element={<IncomeExpenseReport2 />} />
                {/* Supplier Reports with Role Protection */}
                <Route path="/supplierreport" element={
                    <RequireRole allowedRoles={['level4']}>
                        <SupplierReport />
                    </RequireRole>
                } />
                
                <Route path="/suppliermodal" element={<SupplierDetailsModal />} />
                <Route path="/supplier-profit" element={<SupplierProfitReport />} />
                <Route path="/financial-report" element={<FinancialReport />} />
                <Route path="/loan-report" element={<LoanReportManager />} />
                <Route path="/reports/supplier" element={<SupplierReport2 />} />
                <Route path="/reports/printed-sales" element={<PrintedSalesReport />} />
                <Route path="/reports/newsales" element={<SalesReport />} />
                <Route path="/farmer-loans" element={<FarmerLoanManager />} />
                <Route path="/suppliers/printed-report" element={<SupplierReportPrinted />} />
                <Route path="/supplier-loan-report" element={<SupplierLoanReport />} />
                <Route path="/supplier-finalreport" element={<SupplierFinalReport />} />
                <Route path="/suppliers/dobreport" element={<SupplierdobReport />} />
                
                {/* Role-specific Routes */}
                <Route path="/printed-bills" element={
                    <RequireRole allowedRoles={['level2']}>
                        <PrintedBills />
                    </RequireRole>
                } />
                
                <Route path="/bank-dashboard" element={
                    <RequireRole allowedRoles={['level3']}>
                        <BankDashboard />
                    </RequireRole>
                } />
                
                <Route path="/banks" element={<Banks />} />
                <Route path="/payment-collection-report" element={<PaymentCollectionReport />} />
                <Route path="/payment-collection-report2" element={<PaymentCollectionReport2 />} />
                <Route path="/utility-types" element={<UtilityTypeManager />} />
                <Route path="/income-expense-report2" element={<IncomeExpenseReport2 />} />
            </Route>

            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

// ✅ Main App Component
export default function App() {
    console.log('App - Base Path:', basePath);
    
    return (
        <BrowserRouter basename={basePath}>
            <AppRoutes />
        </BrowserRouter>
    );
}