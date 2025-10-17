import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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
import CustomersLoanList from './components/CustomersLoans/CustomersLoanList';
import GrnEntryForm from './components/Grn/GrnEntryForm';
import Dashboard from './components/Dashboard/Dashboard';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';

// ✅ ProtectedRoute component — blocks access if user not logged in
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ✅ Protected Routes */}
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
           
              <CustomerList />
            
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

        {/* CUSTOMERS LOANS */}
        <Route
          path="/customers-loans"
          element={
            <ProtectedRoute>
              <CustomersLoanList />
            </ProtectedRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
