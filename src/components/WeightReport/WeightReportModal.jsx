import React, { useState, useEffect } from 'react';
import WeightReportView from './WeightReportView';
import api from "../../api";

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

  useEffect(() => {
    if (isOpen) {
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

  // ⭐⭐⭐ NEW AXIOS VERSION ⭐⭐⭐
  const handleGenerateReport = async (filters) => {
    try {
      setLoading(true);

      const params = {};

      if (filters.grn_code) params.grn_code = filters.grn_code;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      console.log("📡 Sending request to:", "/report/weight");
      console.log("📄 Params:", params);

      // 🔥 Use axios instance (token + 401 redirect handled)
      const response = await api.post("/report/weight", filters, { params });

      const data = response.data;

      if (!data.sales || data.sales.length === 0) {
        alert("No sales records found for the selected criteria.");
        return;
      }

      setReportData({
        sales: data.sales,
        filters: filters,
        selectedGrnEntry: data.selectedGrnEntry,
        selectedGrnCode: data.selectedGrnCode
      });

      setShowReport(true);

    } catch (err) {
      console.error("❌ API ERROR:", err);
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleGenerateReport(filters);
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
              <h5 className="modal-title">Weight Based Report</h5>
              <button type="button" className="btn-close" onClick={handleCloseReport}></button>
            </div>
            <div className="modal-body">
              <WeightReportView reportData={reportData} onClose={handleCloseReport} />
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
            <h5 className="modal-title">⚖️ බර අනුව වාර්තාව</h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label" style={{ fontWeight: 'bold' }}>
                  මුරපදය ඇතුලත් කරන්න
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="මුරපදය"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={loading}
                />
              </div>

              {showDateRange && (
                <>
                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      ආරම්භ දිනය
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.start_date}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, start_date: e.target.value }))
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      අවසන් දිනය
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.end_date}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, end_date: e.target.value }))
                      }
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
                  "වාර්තාව ලබාගන්න"
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
