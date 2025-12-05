import React, { useState, useEffect } from 'react';
import GrnSaleReportView from './ReportView';
import api from '../../api'; // <-- IMPORTANT: adjust path if needed

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
      fetchGrnEntries();
      setFilters({ grn_code: '', start_date: '', end_date: '' });
      setPassword('');
      setShowDateRange(false);
      setReportData(null);
      setShowReport(false);
    }
  }, [isOpen]);

  // ---------------------------------------------
  // ✅ Fetch GRN entries using axios (api.js)
  // ---------------------------------------------
  const fetchGrnEntries = async () => {
    try {
      const response = await api.get('/grncodes');
      setGrnEntries(response.data.entries || []);
    } catch (error) {
      console.error('❌ Error fetching GRN entries:', error);
      alert("Error loading GRN entries.");
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
    setFilters((prev) => ({
      ...prev,
      grn_code: e.target.value,
    }));
  };

  // ---------------------------------------------
  // ✅ Generate report using axios (api.js)
  // ---------------------------------------------
  const handleGenerateReport = async (filters) => {
    try {
      setLoading(true);

      const payload = {};
      if (filters.grn_code) payload.grn_code = filters.grn_code;
      if (filters.start_date) payload.start_date = filters.start_date;
      if (filters.end_date) payload.end_date = filters.end_date;

      const response = await api.post('/report/sale-code', payload);

      const data = response.data;

      if (!data.sales || data.sales.length === 0) {
        alert('No sales records found for the selected GRN code or date.');
        return;
      }

      setReportData({
        sales: data.sales,
        filters: filters,
        selectedGrnEntry: data.selectedGrnEntry,
        selectedGrnCode: data.selectedGrnCode,
      });

      setShowReport(true);

    } catch (error) {
      console.error("❌ Report Error:", error);
      alert(error.response?.data?.message || "Error generating report.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!filters.grn_code) {
      alert('Please select a GRN code.');
      return;
    }

    await handleGenerateReport(filters);
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setReportData(null);
    onClose();
  };

  // ---------------------------------------------
  // If report is displayed, show ReportView
  // ---------------------------------------------
  if (showReport && reportData) {
    return (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">GRN Sales Report</h5>
              <button type="button" className="btn-close" onClick={handleCloseReport}></button>
            </div>
            <div className="modal-body">
              <GrnSaleReportView reportData={reportData} onClose={handleCloseReport} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // Show modal form
  // ---------------------------------------------
  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content" style={{ backgroundColor: '#99ff99' }}>
          <div className="modal-header">
            <h5 className="modal-title">📄 GRN කේතය අනුව විකුණුම් වාර්තාව</h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">

              {/* GRN Select */}
              <div className="mb-3">
                <label className="form-label fw-bold">GRN තොරතුරු තෝරන්න</label>
                <select
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

              {/* Password */}
              <div className="mb-3">
                <label className="form-label fw-bold">මුරපදය</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={loading}
                />
              </div>

              {/* Optional Date Range */}
              {showDateRange && (
                <>
                  <div className="mb-3">
                    <label className="form-label fw-bold">ආරම්භ දිනය</label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.start_date}
                      onChange={(e) => setFilters((prev) => ({ ...prev, start_date: e.target.value }))}
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">අවසන් දිනය</label>
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
              <button type="submit" className="btn btn-primary w-100" disabled={loading || !filters.grn_code}>
                {loading ? "Generating Report..." : "වාර්තාව ලබාගන්න"}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default GrnSaleReportModal;
