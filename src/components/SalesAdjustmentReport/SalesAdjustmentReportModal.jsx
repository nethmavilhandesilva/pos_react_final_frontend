import React, { useState, useEffect } from 'react';
import SalesAdjustmentReportView from './SalesAdjustmentReportView';
import api from "../../api";  // <<<<<< IMPORT AXIOS API WRAPPER

const SalesAdjustmentReportModal = ({ isOpen, onClose }) => {
  const [filters, setFilters] = useState({
    code: '',
    start_date: '',
    end_date: '',
  });
  const [password, setPassword] = useState('');
  const [showDateRange, setShowDateRange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFilters({ code: '', start_date: '', end_date: '' });
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
    try {
      setLoading(true);

      const requestBody = {};
      if (filters.code) requestBody.code = filters.code;
      if (filters.start_date) requestBody.start_date = filters.start_date;
      if (filters.end_date) requestBody.end_date = filters.end_date;

      // 🟢 Now using axios instead of fetch
      const response = await api.post('/reports/salesadjustment/filter', requestBody);

      const data = response.data;

      if (!data.entries || data.entries.data.length === 0) {
        alert('No sales adjustment records found for the selected criteria.');
        return;
      }

      setReportData({
        entries: data.entries,
        filters: filters
      });

      setShowReport(true);

    } catch (err) {
      console.error('❌ Error generating report:', err);

      if (err.response) {
        alert(`Error: ${err.response.data.message || 'Server Error'}`);
      } else {
        alert(err.message);
      }

    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleGenerateReport(filters);
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setReportData(null);
    onClose();
  };

  if (showReport && reportData) {
    return (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Sales Adjustment Report</h5>
              <button type="button" className="btn-close" onClick={handleCloseReport}></button>
            </div>
            <div className="modal-body">
              <SalesAdjustmentReportView 
                reportData={reportData}
                onClose={handleCloseReport}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content" style={{ backgroundColor: '#99ff99' }}>
          <div className="modal-header">
            <h5 className="modal-title">📦 වෙනස් කිරීම</h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">

              <div className="mb-3">
                <label className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                  පස්වර්ඩ් ඇතුල් කරන්න
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="පස්වර්ඩ්"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={loading}
                />
              </div>

              {showDateRange && (
                <>
                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                      ආරම්භ දිනය
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.start_date}
                      onChange={(e) => setFilters((prev) => ({ ...prev, start_date: e.target.value }))}
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: 'bold', color: 'black' }}>
                      අවසන් දිනය
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.end_date}
                      onChange={(e) => setFilters((prev) => ({ ...prev, end_date: e.target.value }))}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

            </div>

            <div className="modal-footer">
              <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
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

export default SalesAdjustmentReportModal;
