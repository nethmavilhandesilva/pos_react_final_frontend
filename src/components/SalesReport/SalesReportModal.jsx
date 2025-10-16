import React, { useState, useEffect } from 'react';
import SalesReportView from './SalesReportView';

const BACKEND_URL = 'http://localhost:8000/api';

const SalesReportModal = ({ isOpen, onClose }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [billNos, setBillNos] = useState([]);
  const [filters, setFilters] = useState({
    supplier_code: '',
    item_code: '',
    customer_code: '',
    bill_no: '',
    start_date: '',
    end_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [showReport, setShowReport] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🟡 Sales Report Modal opened');
      fetchFilterData();
      setFilters({
        supplier_code: '',
        item_code: '',
        customer_code: '',
        bill_no: '',
        start_date: '',
        end_date: '',
      });
      setReportData(null);
      setShowReport(false);
    }
  }, [isOpen]);

  const fetchFilterData = async () => {
    try {
      // Fetch suppliers
      const suppliersResponse = await fetch(`${BACKEND_URL}/suppliers`);
      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json();
        setSuppliers(suppliersData.suppliers || []);
      }

      // Fetch items
      const itemsResponse = await fetch(`${BACKEND_URL}/allitems`);
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        setItems(itemsData.items || []);
      }

      // Fetch customers
      const customersResponse = await fetch(`${BACKEND_URL}/customers`);
      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        setCustomers(customersData.customers || []);
      }

      // Fetch bill numbers
      const billNosResponse = await fetch(`${BACKEND_URL}/bill-numbers`);
      if (billNosResponse.ok) {
        const billNosData = await billNosResponse.json();
        setBillNos(billNosData.billNos || []);
      }
    } catch (error) {
      console.error('❌ Error fetching filter data:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenerateReport = async (filters) => {
    console.log('🟢 handleGenerateReport EXECUTING with filters:', filters);
    
    try {
      console.log('🟢 Setting loading to true');
      setLoading(true);

      const params = new URLSearchParams();
      
      if (filters.supplier_code) params.append('supplier_code', filters.supplier_code);
      if (filters.item_code) params.append('item_code', filters.item_code);
      if (filters.customer_code) params.append('customer_code', filters.customer_code);
      if (filters.bill_no) params.append('bill_no', filters.bill_no);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const apiUrl = `http://localhost:8000/api/sales-report?${params.toString()}`;
      
      console.log('🟢 API URL constructed:', apiUrl);

      console.log('🟢 About to call fetch...');
      const response = await fetch(apiUrl);
      console.log('🟢 Fetch completed, response status:', response.status);
      
      if (!response.ok) {
        console.log('❌ Response not OK');
        throw new Error(`Server returned ${response.status} status`);
      }

      console.log('🟢 About to parse JSON response...');
      const data = await response.json();
      console.log('🟢 JSON parsed successfully:', data);
      
      if (data.error) {
        console.log('❌ API returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('🟢 Checking sales data...');
      if (!data.salesData || data.salesData.length === 0) {
        console.log('🟡 No sales data found');
        alert('No processed sales records found for the selected criteria.');
        return;
      }

      console.log('🟢 Found sales data, setting report data...');
      console.log(`Found ${data.salesData.length} sales records`);
      
      // Set the report data and show the report view
      setReportData({ 
        salesData: data.salesData,
        filters: filters
      });
      setShowReport(true);
      console.log('🟢 Report view should now be visible');
      
    } catch (err) {
      console.error('❌ CATCH BLOCK - Error:', err);
      console.error('Error details:', err.message);
      alert('Error: ' + err.message);
    } finally {
      console.log('🟢 FINALLY BLOCK - Setting loading to false');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔴 Form submitted with filters:', filters);
    
    // Use the internal handleGenerateReport method
    console.log('🟢 Calling handleGenerateReport with filters:', filters);
    await handleGenerateReport(filters);
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setReportData(null);
    onClose(); // Close the modal
  };

  // If report is ready, show the report view
  if (showReport && reportData) {
    return (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-fullscreen">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Sales Report</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={handleCloseReport}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <SalesReportView 
                reportData={reportData} 
                onClose={handleCloseReport} 
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise show the modal form
  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content" style={{ backgroundColor: '#99ff99' }}>
          <div className="modal-header">
            <h5 className="modal-title">Filter Sales</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Close"
              disabled={loading}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row g-2">
                {/* Supplier */}
                <div className="col-md-6">
                  <label htmlFor="supplier_code" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                    Supplier
                  </label>
                  <select
                    name="supplier_code"
                    id="supplier_code"
                    className="form-select form-select-sm"
                    value={filters.supplier_code}
                    onChange={handleFilterChange}
                    disabled={loading}
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.code} value={supplier.code}>
                        {supplier.code} - {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item */}
                <div className="col-md-6">
                  <label htmlFor="item_code" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                    Item
                  </label>
                  <select
                    name="item_code"
                    id="item_code"
                    className="form-select form-select-sm"
                    value={filters.item_code}
                    onChange={handleFilterChange}
                    disabled={loading}
                  >
                    <option value="">-- Select Item --</option>
                    {items.map((item) => (
                      <option key={item.no} value={item.no}>
                        {item.no} - {item.type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer */}
                <div className="col-md-6">
                  <label htmlFor="customer_code" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                    පාරිභෝගික කේතය
                  </label>
                  <select
                    name="customer_code"
                    id="customer_code"
                    className="form-select form-select-sm"
                    value={filters.customer_code}
                    onChange={handleFilterChange}
                    disabled={loading}
                  >
                    <option value="">-- සියලුම පාරිභෝගිකයන් --</option>
                    {customers.map((customer) => (
                      <option key={customer.customer_code} value={customer.customer_code}>
                        {customer.customer_code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bill No */}
                <div className="col-md-6">
                  <label htmlFor="bill_no" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                    Bill No
                  </label>
                  <select
                    name="bill_no"
                    id="bill_no"
                    className="form-select form-select-sm"
                    value={filters.bill_no}
                    onChange={handleFilterChange}
                    disabled={loading}
                  >
                    <option value="">-- All Bills --</option>
                    {billNos.map((bill) => (
                      <option key={bill.bill_no} value={bill.bill_no}>
                        {bill.bill_no}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div className="col-md-6">
                  <label htmlFor="start_date" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    id="start_date"
                    className="form-control form-control-sm"
                    value={filters.start_date}
                    onChange={handleFilterChange}
                    disabled={loading}
                  />
                </div>

                {/* End Date */}
                <div className="col-md-6">
                  <label htmlFor="end_date" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    id="end_date"
                    className="form-control form-control-sm"
                    value={filters.end_date}
                    onChange={handleFilterChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="submit" 
                className="btn btn-primary w-100" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Generating Report...
                  </>
                ) : (
                  'Generate Report'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SalesReportModal;