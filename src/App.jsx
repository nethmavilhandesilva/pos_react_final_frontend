// src/App.jsx 
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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
import LoanManager from './components/LoanManager/LoanManager'; // ✅ NEW: Import LoanManager
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


// ✅ ProtectedRoute component — blocks access if user not logged in
const ProtectedRoute = ({ children }) => {
    const user = localStorage.getItem('user');
    // NOTE: It's better practice to check for the token, not 'user' 
    // since the provided API uses the 'token'.
    const token = localStorage.getItem('token'); 

    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* 🔒 Auth Routes: Login and Register are public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* 🏠 CORE ROUTES: Protected */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
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
                            {/* 🚀 CORRECTION: Use LoanManager for the main loans page */}
                            <LoanManager /> 
                        </ProtectedRoute>
                    }
                />
                {/* Loan Report View is often considered protected data */}
                <Route 
                    path="/customers-loans/report" 
                    element={
                        <ProtectedRoute>
                            <LoanReportView />
                        </ProtectedRoute>
                    } 
                />
                
                {/* ⚠️ CRITICAL CORRECTION: Sales Entry MUST be Protected */}
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
                <Route
                    path="/supplierreport"
                    element={
                        <ProtectedRoute>
                            <SupplierReport />
                        </ProtectedRoute>
                    }
                />
                {/* Supplier Details Modal is likely a standalone page for quick links, should be protected */}
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

                {/* ❌ Fallback route: Redirect all unknown paths to the main dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}