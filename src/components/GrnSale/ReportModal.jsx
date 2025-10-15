import React, { useState, useEffect } from 'react';
import GrnSaleReportView from './ReportView';

const BACKEND_URL = 'http://localhost:8000/api';

const GrnSaleReportModal = ({ isOpen, onClose }) => {
  const [grnEntries, setGrnEntries] = useState([]);
  const [filters, setFilters] = useState({
    grn_code: '',
    start_date: '',
    end_date: '',
  });
  const [password, setPassword] = useState('');
  const [showDateRange, setShowDateRange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [showReport, setShowReport] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🟡 GRN Sale Modal opened');
      fetchGrnEntries();
      setFilters({
        grn_code: '',
        start_date: '',
        end_date: '',
      });
      setPassword('');
      setShowDateRange(false);
      setReportData(null);
      setShowReport(false);
    }
  }, [isOpen]);

  const fetchGrnEntries = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/grncodes`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setGrnEntries(data.entries || []);
    } catch (error) {
      console.error('❌ Error fetching GRN entries:', error);
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

  const handleGrnCodeChange = (e) => {
    const selectedValue = e.target.value;
    setFilters((prev) => ({
      ...prev,
      grn_code: selectedValue,
    }));
  };

  const handleGenerateReport = async (filters) => {
    console.log('🟢 handleGenerateReport EXECUTING with filters:', filters);
    
    try {
      console.log('🟢 Setting loading to true');
      setLoading(true);

      const requestBody = {};
      
      if (filters.grn_code) requestBody.grn_code = filters.grn_code;
      if (filters.start_date) requestBody.start_date = filters.start_date;
      if (filters.end_date) requestBody.end_date = filters.end_date;

      const apiUrl = `http://localhost:8000/api/report/sale-code`;
      
      console.log('🟢 API URL constructed:', apiUrl);

      console.log('🟢 About to call fetch...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
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
        alert('No sales records found for the selected GRN code and date range.');
        return;
      }

      console.log('🟢 Found sales data, setting report data...');
      console.log(`Found ${data.sales.length} sales records`);
      
      // Set the report data and show the report view
      setReportData({ 
        sales: data.sales, 
        filters: filters,
        selectedGrnEntry: data.selectedGrnEntry,
        selectedGrnCode: data.selectedGrnCode
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
    
    if (!filters.grn_code) {
      alert('Please select a GRN code');
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
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">GRN Sales Report</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={handleCloseReport}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <GrnSaleReportView 
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
            <h5 className="modal-title">📄 GRN කේතය අනුව විකුණුම් වාර්තාව</h5>
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
                <label htmlFor="grn_code_select" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                  GRN තොරතුරු තෝරන්න
                </label>
                <select
                  name="grn_code"
                  id="grn_code_select"
                  className="form-select"
                  required
                  value={filters.grn_code}
                  onChange={handleGrnCodeChange}
                  disabled={loading}
                >
                  <option value="">-- GRN තෝරන්න --</option>
                  {grnEntries.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.code} | {entry.supplier_code} | {entry.item_code} | {entry.item_name} | {entry.packs} | {entry.grn_no} | {entry.txn_date}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="grn_password" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                  මුරපදය ඇතුලත් කරන්න
                </label>
                <input
                  type="password"
                  id="grn_password"
                  name="password"
                  className="form-control"
                  placeholder="මුරපදය"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={loading}
                />
              </div>

              {showDateRange && (
                <div id="grn_date_range_container">
                  <div className="mb-3">
                    <label htmlFor="grn_start_date" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                      ආරම්භ දිනය
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      id="grn_start_date"
                      className="form-control"
                      value={filters.start_date}
                      onChange={(e) => setFilters((prev) => ({ ...prev, start_date: e.target.value }))}
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="grn_end_date" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                      අවසන් දිනය
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      id="grn_end_date"
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
                disabled={loading || !filters.grn_code}
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

export default GrnSaleReportModal;