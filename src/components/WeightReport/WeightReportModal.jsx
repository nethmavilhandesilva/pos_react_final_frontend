import React, { useState, useEffect } from 'react';
import WeightReportView from './WeightReportView';

const BACKEND_URL = 'http://localhost:8000/api';

const WeightReportModal = ({ isOpen, onClose }) => {
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
      console.log('🟡 Weight Modal opened');
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

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setShowDateRange(value === 'nethma123');

    if (value !== 'nethma123') {
      setFilters((prev) => ({ ...prev, start_date: '', end_date: '' }));
    }
  };

  const handleGenerateReport = async (filters) => {
    console.log('🟢 handleGenerateReport EXECUTING with filters:', filters);
    
    try {
      console.log('🟢 Setting loading to true');
      setLoading(true);

      const params = {};
      
      if (filters.grn_code) params.grn_code = filters.grn_code;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const queryParams = new URLSearchParams(params).toString();
      const apiUrl = `http://localhost:8000/api/report/weight?${queryParams}`;
      
      console.log('🟢 API URL constructed:', apiUrl);

      console.log('🟢 About to call fetch...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters)
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
        alert('No sales records found for the selected criteria.');
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
    
    // GRN code is optional, so no validation needed

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
              <h5 className="modal-title">Weight Based Report</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={handleCloseReport}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <WeightReportView 
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
            <h5 className="modal-title">⚖️ බර අනුව වාර්තාව</h5>
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
                <label htmlFor="weight_password" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                  මුරපදය ඇතුලත් කරන්න
                </label>
                <input
                  type="password"
                  id="weight_password"
                  name="password"
                  className="form-control"
                  placeholder="මුරපදය"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={loading}
                />
              </div>

              

              {showDateRange && (
                <div id="weight_date_range_container">
                  <div className="mb-3">
                    <label htmlFor="weight_start_date" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                      ආරම්භ දිනය
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      id="weight_start_date"
                      className="form-control"
                      value={filters.start_date}
                      onChange={(e) => setFilters((prev) => ({ ...prev, start_date: e.target.value }))}
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="weight_end_date" className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                      අවසන් දිනය
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      id="weight_end_date"
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
                disabled={loading}
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

export default WeightReportModal;