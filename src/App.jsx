import { BrowserRouter, Routes, Route } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
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
import GrnEntriesTable from './components/Grn/GrnEntriesTable';
import { fetchGrnBalances, fetchNotChangingGRNs } from './services/api';
import Dashboard from './components/Dashboard/Dashboard';







export default function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route path="/" element={<Dashboard />} />
        {/* CUSTOMERS */}
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/create" element={<CustomerForm mode="create" />} />
        <Route path="/customers/:id/edit" element={<CustomerForm mode="edit" />} />
        
        {/* ITEMS */}
        <Route path="/items" element={<ItemList />} />
        <Route path="/items/create" element={<CreateItem />} />
        <Route path="/items/edit/:id" element={<EditItem />} />

        {/* SUPPLIERS */}
        <Route path="/suppliers" element={<SupplierList />} />
        <Route path="/suppliers/create" element={<CreateSupplier />} />
        <Route path="/suppliers/edit/:id" element={<EditSupplier />} />
       
        {/* GRN Routes */}
        <Route path="/grn" element={<GrnList />} />
        <Route path="/grn/create" element={<CreateGrn />} />
        <Route path="/grn/edit/:id" element={<EditGrn />} />
        
        {/* NEW GRN ENTRY ROUTE (your converted functionality) */}
        <Route path="/grn/entries" element={<GrnEntryForm />} />
        
        
        {/* CUSTOMERS LOANS Routes */}
        <Route path="/customers-loans" element={<CustomersLoanList />} />
      </Routes>
    </BrowserRouter>
  );
}