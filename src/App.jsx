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

// Create a new component for the GRN Entry page
function GrnEntryPage() {
  const [notChangingGRNs, setNotChangingGRNs] = useState([]);
  const [grnEntries, setGrnEntries] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [balances, setBalances] = useState({ total_packs: 0, total_weight: 0 });

  useEffect(() => {
    loadNotChangingGRNs();
  }, []);

  const loadNotChangingGRNs = async () => {
    try {
      const data = await fetchNotChangingGRNs();
      setNotChangingGRNs(data);
    } catch (error) {
      console.error('Failed to load GRNs:', error);
    }
  };

  const updateBalances = async (code) => {
    if (!code) return;
    try {
      const balanceData = await fetchGrnBalances(code);
      setBalances(balanceData);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    }
  };

  const handleCodeSelect = (code) => {
    setSelectedCode(code);
    updateBalances(code);
  };

  const addGrnEntry = (newEntry) => {
    setGrnEntries(prev => [newEntry, ...prev]);
  };

  const removeGrnEntry = (id) => {
    setGrnEntries(prev => prev.filter(entry => entry.id !== id));
  };

  return (
    <div className="container mt-4">
      <h3>GRN Entries <span className="balances">
        (Balanced Packs: {balances.total_packs}, Balanced Weight: {parseFloat(balances.total_weight).toFixed(2)} kg)
      </span></h3>
      
      <GrnEntryForm
        notChangingGRNs={notChangingGRNs}
        onCodeSelect={handleCodeSelect}
        onEntryAdded={addGrnEntry}
        selectedCode={selectedCode}
        updateBalances={updateBalances}
      />
      
      <GrnEntriesTable
        entries={grnEntries}
        selectedCode={selectedCode}
        onEntryDeleted={removeGrnEntry}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
        <Route path="/grn/entries" element={<GrnEntryPage />} />
        
        {/* CUSTOMERS LOANS Routes */}
        <Route path="/customers-loans" element={<CustomersLoanList />} />
        
        {/* DEFAULT ROUTE - You can choose which page to show as default */}
        <Route path="/" element={<GrnEntryPage />} /> {/* or <GrnList /> or <CustomersLoanList /> */}
      </Routes>
    </BrowserRouter>
  );
}