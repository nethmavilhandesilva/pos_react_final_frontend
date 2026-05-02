// src/App.jsx 
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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

// Loading component
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

// ✅ Enhanced ProtectedRoute component with role checking and debugging
const ProtectedRoute = ({ children, allowedRoles = null }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchUser = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            
            // First check if user data exists in localStorage
            const storedUser = localStorage.getItem('userData');
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    console.log('User from localStorage:', parsedUser);
                    setUser(parsedUser);
                    setLoading(false);
                    return;
                } catch (e) {
                    console.error('Error parsing stored user:', e);
                }
            }
            
            try {
                // Set auth header
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                const response = await api.get('/user');
                console.log('User API Response:', response.data);
                
                if (response.data.success && response.data.user) {
                    console.log('User role from API:', response.data.user.role);
                    setUser(response.data.user);
                    localStorage.setItem('userData', JSON.stringify(response.data.user));
                } else {
                    // Invalid user data, clear token
                    console.error('Invalid user data received');
                    localStorage.removeItem('token');
                    localStorage.removeItem('userData');
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
                if (error.response?.status === 401) {
                    // Token invalid or expired
                    localStorage.removeItem('token');
                    localStorage.removeItem('userData');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [token]);

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!token) {
        console.log('No token found, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    // If no specific roles required, just check authentication
    if (!allowedRoles) {
        console.log('No role restrictions, access granted');
        return children;
    }

    // Check if user has required role
    if (user && allowedRoles.includes(user.role)) {
        console.log(`Access granted. User role: ${user.role} matches allowed roles:`, allowedRoles);
        return children;
    }

    // Access denied
    console.log(`Access denied. User role: ${user?.role}, Required roles:`, allowedRoles);
    return <Navigate to="/unauthorized" replace />;
};

// ✅ Enhanced Role-based redirect component with level4 support
const RootRedirect = () => {
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUserRole = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }
            
            try {
                // First check localStorage
                const storedUser = localStorage.getItem('userData');
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    console.log('RootRedirect - User from localStorage:', user);
                    setUserRole(user.role);
                    setLoading(false);
                    return;
                }
                
                // Set auth header
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                const response = await api.get('/user');
                console.log('RootRedirect - User API Response:', response.data);
                
                if (response.data.success && response.data.user) {
                    const role = response.data.user.role;
                    console.log('RootRedirect - User role:', role);
                    setUserRole(role);
                    localStorage.setItem('userData', JSON.stringify(response.data.user));
                }
            } catch (error) {
                console.error('Failed to get user role:', error);
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userData');
                }
            } finally {
                setLoading(false);
            }
        };

        getUserRole();
    }, []);

    if (loading) {
        return <LoadingSpinner />;
    }

    console.log('RootRedirect - Redirecting based on role:', userRole);

    // Redirect based on user role
    if (userRole === 'level2') {
        console.log('Redirecting level2 user to /printed-bills');
        return <Navigate to="/printed-bills" replace />;
    }
    
    if (userRole === 'level3') {
        console.log('Redirecting level3 user to /bank-dashboard');
        return <Navigate to="/bank-dashboard" replace />;
    }
    
    if (userRole === 'level4') {
        console.log('Redirecting level4 user to /supplierreport');
        return <Navigate to="/supplierreport" replace />;
    }
    
    // Default redirect for other roles to dashboard
    console.log('Redirecting to dashboard for role:', userRole);
    return <Navigate to="/dashboard" replace />;
};

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* 🔒 Auth Routes: Login and Register are public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/unauthorized" element={<UnAuthorizedPage />} />

                {/* 🏠 Root Route with role-based redirection */}
                <Route path="/" element={<RootRedirect />} />

                {/* DASHBOARD - For non-level2, non-level3, non-level4 users */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'level1', 'User']}>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                {/* CUSTOMERS */}
                <Route
                    path="/customers"
                    element={
                        <ProtectedRoute>
                            <CustomerList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/customers/create"
                    element={
                        <ProtectedRoute>
                            <CustomerForm mode="create" />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/customers/:id/edit"
                    element={
                        <ProtectedRoute>
                            <CustomerForm mode="edit" />
                        </ProtectedRoute>
                    }
                />

                {/* ITEMS */}
                <Route
                    path="/items"
                    element={
                        <ProtectedRoute>
                            <ItemList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/items/create"
                    element={
                        <ProtectedRoute>
                            <CreateItem />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/items/edit/:id"
                    element={
                        <ProtectedRoute>
                            <EditItem />
                        </ProtectedRoute>
                    }
                />

                {/* SUPPLIERS */}
                <Route
                    path="/suppliers"
                    element={
                        <ProtectedRoute>
                            <SupplierList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/suppliers/create"
                    element={
                        <ProtectedRoute>
                            <CreateSupplier />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/suppliers/edit/:id"
                    element={
                        <ProtectedRoute>
                            <EditSupplier />
                        </ProtectedRoute>
                    }
                />

                {/* GRN Routes */}
                <Route
                    path="/grn"
                    element={
                        <ProtectedRoute>
                            <GrnList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/grn/create"
                    element={
                        <ProtectedRoute>
                            <CreateGrn />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/grn/edit/:id"
                    element={
                        <ProtectedRoute>
                            <EditGrn />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/grn/entries"
                    element={
                        <ProtectedRoute>
                            <GrnEntryForm />
                        </ProtectedRoute>
                    }
                />

                {/* CUSTOMERS LOANS & SALES */}
                <Route
                    path="/customers-loans"
                    element={
                        <ProtectedRoute>
                            <LoanManager />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/customers-loans/report"
                    element={
                        <ProtectedRoute>
                            <LoanReportView />
                        </ProtectedRoute>
                    }
                />

                {/* SALES ENTRY */}
                <Route
                    path="/sales"
                    element={
                        <ProtectedRoute>
                            <SalesEntry />
                        </ProtectedRoute>
                    }
                />

                {/* REPORTING & COMMISSIONS */}
                <Route
                    path="/commissions"
                    element={
                        <ProtectedRoute>
                            <CommissionPage />
                        </ProtectedRoute>
                    }
                />
                
                {/* SUPPLIER REPORT - Only accessible by level4 role */}
                <Route
                    path="/supplierreport"
                    element={
                        <ProtectedRoute allowedRoles={['level4']}>
                            <SupplierReport />
                        </ProtectedRoute>
                    }
                />
                
                <Route
                    path="/suppliermodal"
                    element={
                        <ProtectedRoute>
                            <SupplierDetailsModal />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/supplier-profit"
                    element={
                        <ProtectedRoute>
                            <SupplierProfitReport />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/financial-report"
                    element={
                        <ProtectedRoute>
                            <FinancialReport />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/loan-report"
                    element={
                        <ProtectedRoute>
                            <LoanReportManager />
                        </ProtectedRoute>
                    }
                />
                <Route 
                    path="/reports/supplier" 
                    element={
                        <ProtectedRoute>
                            <SupplierReport2 />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/reports/printed-sales" 
                    element={
                        <ProtectedRoute>
                            <PrintedSalesReport />
                        </ProtectedRoute>
                    } 
                />
                <Route
                    path="/reports/newsales"
                    element={
                        <ProtectedRoute>
                            <SalesReport />
                        </ProtectedRoute>
                    }
                />
                
                {/* PUBLIC BILL VIEWS */}
                <Route path="/view-bill/:token" element={<PublicBill />} />
                <Route path="/suppliers/dobreport" element={<SupplierdobReport />} />
                <Route path="/view-supplier-bill/:token" element={<ViewSupplierBill />} />
                
                {/* LOAN MANAGERS */}
                <Route 
                    path="/farmer-loans" 
                    element={
                        <ProtectedRoute>
                            <FarmerLoanManager />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/suppliers/printed-report" 
                    element={
                        <ProtectedRoute>
                            <SupplierReportPrinted />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/supplier-loan-report" 
                    element={
                        <ProtectedRoute>
                            <SupplierLoanReport />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/supplier-finalreport" 
                    element={
                        <ProtectedRoute>
                            <SupplierFinalReport />
                        </ProtectedRoute>
                    } 
                />
                
                {/* PRINTED BILLS - For level2 users (cashiers) */}
                <Route
                    path="/printed-bills"
                    element={
                        <ProtectedRoute allowedRoles={['level2']}>
                            <PrintedBills />
                        </ProtectedRoute>
                    }
                />
                
                {/* BANK DASHBOARD - For level3 users (bank managers) */}
                <Route 
                    path="/bank-dashboard" 
                    element={
                        <ProtectedRoute allowedRoles={['level3']}>
                            <BankDashboard />
                        </ProtectedRoute>
                    } 
                />
                
                {/* BANKS - For level3 users */}
                <Route 
                    path="/banks" 
                    element={
                        <ProtectedRoute allowedRoles={['level3']}>
                            <Banks />
                        </ProtectedRoute>
                    } 
                />
                
                {/* ❌ Fallback route: Redirect all unknown paths to root (which will handle role-based redirect) */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

// Enhanced Unauthorized Page Component
const UnAuthorizedPage = () => {
    const navigate = useNavigate();
    
    const styles = {
        container: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: "'Inter', sans-serif",
        },
        card: {
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            maxWidth: '400px',
            width: '90%',
        },
        icon: {
            fontSize: '64px',
            marginBottom: '20px',
        },
        title: {
            fontSize: '24px',
            fontWeight: '600',
            color: '#ef4444',
            marginBottom: '12px',
        },
        message: {
            fontSize: '14px',
            color: '#64748b',
            marginBottom: '24px',
            lineHeight: '1.5',
        },
        button: {
            padding: '10px 24px',
            backgroundColor: '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.icon}>🔒</div>
                <h2 style={styles.title}>Unauthorized Access</h2>
                <p style={styles.message}>
                    You don't have permission to access this page. This area is restricted to authorized personnel only.
                </p>
                <button 
                    style={styles.button}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4338CA';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#4F46E5';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onClick={() => navigate('/')}
                >
                    Go to Home
                </button>
            </div>
        </div>
    );
};