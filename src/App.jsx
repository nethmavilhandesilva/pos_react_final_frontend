import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CustomerList from './components/CustomerList';
import CustomerForm from './components/CustomerForm';
import ItemList from './components/Items/ItemList';
import CreateItem from './components/Items/CreateItem';
import EditItem from './components/Items/EditItem';
import SupplierList from './components/Suppliers/SupplierList';
import CreateSupplier from './components/Suppliers/CreateSupplier';
import EditSupplier from './components/Suppliers/EditSupplier';
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
        <Route path="/" element={<ItemList />} />

        {/* Supplier Routes */}
        <Route path="/suppliers" element={<SupplierList />} />
        <Route path="/suppliers/create" element={<CreateSupplier />} />
        <Route path="/suppliers/edit/:id" element={<EditSupplier />} />

      </Routes>
    </BrowserRouter>
  );
}
