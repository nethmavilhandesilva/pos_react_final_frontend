import React, { useState, useEffect } from 'react';
import ItemReportView from './ItemReportView'; // Adjust the import path

const BACKEND_URL = 'http://localhost:8000/api';

const ItemReportModal = ({ isOpen, onClose }) => {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({
    item_code: '',
    start_date: '',
    end_date: '',
  });
  const [password, setPassword] = useState('');
  const [showDateRange, setShowDateRange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null); // State to store report data
  const [showReport, setShowReport] = useState(false); // State to control report view

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🟡 Modal opened');
      fetchItems();
      // Reset form state
      setFilters({
        item_code: '',
        start_date: '',
        end_date: '',
      });
      setPassword('');
      setShowDateRange(false);
      setReportData(null);
      setShowReport(false);
    }
  }, [isOpen]);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/allitems`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('❌ Error fetching items:', error);
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setShowDateRange(value === 'nethma123');

    if (value !== 'nethma123') {
      setFilters((prev) => ({ ...prev, start_date: '', end_date: '' }));
    }
  };

  const handleItemChange = (e) => {
    const selectedValue = e.target.value;
    setFilters((prev) => ({
      ...prev,
      item_code: selectedValue,
    }));
  };

  const handleGenerateReport = async (filters) => {
    console.log('🟢 handleGenerateReport EXECUTING with filters:', filters);
    
    try {
      console.log('🟢 Setting loading to true');
      setLoading(true);

      const params = {
        item_code: filters.item_code
      };

      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const queryParams = new URLSearchParams(params).toString();
      const apiUrl = `http://localhost:8000/api/item-report?${queryParams}`;
      
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
      if (!data.sales || data.sales.length === 0) {
        console.log('🟡 No sales data found');
        alert('No sales records found for the selected item and date range.');
        return;
      }

      console.log('🟢 Found sales data, setting report data...');
      console.log(`Found ${data.sales.length} sales records`);
      
      // Set the report data and show the report view
      setReportData({ 
        sales: data.sales, 
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
    
    if (!filters.item_code) {
      alert('Please select an item');
      return;
    }

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
        <div className="modal-dialog modal-xl"> {/* Use modal-xl for larger report */}
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Item Report</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={handleCloseReport}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <ItemReportView 
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
      <div className="modal-dialog">
        <div className="modal-content" style={{ backgroundColor: '#99ff99' }}>
          <div className="modal-header">
            <h5 className="modal-title">📦 අයිතමය අනුව වාර්තාව</h5>
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
              <div className="mb-3">
                <label htmlFor="item_password" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                  පස්වර්ඩ් ඇතුල් කරන්න
                </label>
                <input
                  type="password"
                  id="item_password"
                  name="password"
                  className="form-control"
                  placeholder="පස්වර්ඩ්"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={loading}
                />
              </div>

              <div className="mb-3">
                <label htmlFor="item_code_select" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                  අයිතමය
                </label>
                <select
                  name="item_code"
                  id="item_code_select"
                  className="form-select"
                  required
                  value={filters.item_code}
                  onChange={handleItemChange}
                  disabled={loading}
                >
                  <option value="">-- අයිතමයක් තෝරන්න --</option>
                  {items.map((item) => (
                    <option key={item.no} value={item.no}>
                      {item.no} - {item.type}
                    </option>
                  ))}
                </select>
              </div>

              {showDateRange && (
                <div id="item_date_range_container">
                  <div className="mb-3">
                    <label htmlFor="item_start_date" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                      ආරම්භ දිනය
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      id="item_start_date"
                      className="form-control"
                      value={filters.start_date}
                      onChange={(e) => setFilters((prev) => ({ ...prev, start_date: e.target.value }))}
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="item_end_date" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                      අවසන් දිනය
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      id="item_end_date"
                      className="form-control"
                      value={filters.end_date}
                      onChange={(e) => setFilters((prev) => ({ ...prev, end_date: e.target.value }))}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="submit" 
                className="btn btn-primary w-100" 
                disabled={loading || !filters.item_code}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Generating Report...
                  </>
                ) : (
                  'වාර්තාව ලබාගන්න'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ItemReportModal;