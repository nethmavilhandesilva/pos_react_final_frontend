import React, { useState, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:8000/api';

const GrnSalesOverviewReport = ({ isOpen, onClose }) => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('Default Company');
  const [settingDate, setSettingDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      console.log('🟡 GRN Sales Overview Report opened');
      fetchReportData();
    }
  }, [isOpen]);

  const fetchReportData = async () => {
    try {
      console.log('🟢 Setting loading to true');
      setLoading(true);

      const apiUrl = `http://localhost:8000/api/reports/grn-sales-overview`;
      
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

      console.log('🟢 Setting report data...');
      setReportData(data.reportData || []);
      setCompanyName(data.companyName || 'Default Company');
      setSettingDate(data.settingDate || new Date().toLocaleDateString('en-CA'));
      
    } catch (err) {
      console.error('❌ CATCH BLOCK - Error:', err);
      console.error('Error details:', err.message);
      alert('Error: ' + err.message);
    } finally {
      console.log('🟢 FINALLY BLOCK - Setting loading to false');
      setLoading(false);
    }
  };

  // Calculate grand totals
  const calculateGrandTotals = () => {
    return reportData.reduce((acc, item) => {
      acc.grandTotalOriginalPacks += Number(item.original_packs) || 0;
      acc.grandTotalOriginalWeight += Number(item.original_weight) || 0;
      acc.grandTotalSoldPacks += Number(item.sold_packs) || 0;
      acc.grandTotalSoldWeight += Number(item.sold_weight) || 0;
      acc.grandTotalSalesValue += Number(item.total_sales_value) || 0;
      acc.grandTotalRemainingPacks += Number(item.remaining_packs) || 0;
      acc.grandTotalRemainingWeight += Number(item.remaining_weight) || 0;
      acc.grandTotalPrice += Number(item.sp) || 0;
      return acc;
    }, {
      grandTotalOriginalPacks: 0,
      grandTotalOriginalWeight: 0,
      grandTotalSoldPacks: 0,
      grandTotalSoldWeight: 0,
      grandTotalSalesValue: 0,
      grandTotalRemainingPacks: 0,
      grandTotalRemainingWeight: 0,
      grandTotalPrice: 0
    });
  };

  // Group data by GRN code and item name
  const getGroupedData = () => {
    const grouped = {};
    
    reportData.forEach(item => {
      const key = `${item.grn_code}-${item.item_name}`;
      if (!grouped[key]) {
        grouped[key] = {
          grnCode: item.grn_code,
          itemName: item.item_name,
          original_packs: 0,
          original_weight: 0,
          sold_packs: 0,
          sold_weight: 0,
          total_sales_value: 0,
          remaining_packs: 0,
          remaining_weight: 0,
          sp: 0,
          count: 0
        };
      }
      
      grouped[key].original_packs += Number(item.original_packs) || 0;
      grouped[key].original_weight += Number(item.original_weight) || 0;
      grouped[key].sold_packs += Number(item.sold_packs) || 0;
      grouped[key].sold_weight += Number(item.sold_weight) || 0;
      grouped[key].total_sales_value += Number(item.total_sales_value) || 0;
      grouped[key].remaining_packs += Number(item.remaining_packs) || 0;
      grouped[key].remaining_weight += Number(item.remaining_weight) || 0;
      grouped[key].sp += Number(item.sp) || 0;
      grouped[key].count += 1;
    });

    // Calculate average price
    Object.keys(grouped).forEach(key => {
      if (grouped[key].count > 0) {
        grouped[key].sp = grouped[key].sp / grouped[key].count;
      }
    });

    return Object.values(grouped).sort((a, b) => a.itemName.localeCompare(b.itemName));
  };

  if (!isOpen) return null;

  const groupedData = getGroupedData();
  const grandTotals = calculateGrandTotals();

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-fullscreen">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">GRN Sales Overview Report</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Close"
              disabled={loading}
            ></button>
          </div>
          
          <div className="modal-body printable-area" style={{ backgroundColor: '#99ff99', overflow: 'auto' }}>
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading report data...</p>
              </div>
            ) : (
              <div className="container-fluid py-4">
                <div className="card shadow-sm mb-4">
                  <div className="card-header text-center" style={{ backgroundColor: '#004d00' }}>
                    <div className="report-title-bar">
                      <h2 className="company-name">{companyName}</h2>
                      <h4 className="fw-bold text-white">📦 විකිුණුම්/බර මත්තෙහි ඉතිරි වාර්තාව</h4>
                      <span className="right-info text-white">
                        {settingDate}
                      </span>
                      <button className="print-btn" onClick={() => window.print()}>
                        🖨️ මුද්‍රණය
                      </button>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-striped table-hover table-bordered">
                        <thead>
                          <tr>
                            <th rowSpan="2">වර්ගය</th>
                            <th rowSpan="2">price</th>
                            <th colSpan="2">මිලදී ගැනීම</th>
                            <th colSpan="2">විකුණුම්</th>
                            <th rowSpan="2">එකතුව</th>
                            <th colSpan="2">ඉතිරි</th>
                          </tr>
                          <tr>
                            <th>බර</th>
                            <th>මලු</th>
                            <th>බර</th>
                            <th>මලු</th>
                            <th>බර</th>
                            <th>මලු</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedData.length > 0 ? (
                            <>
                              {groupedData.map((item, index) => (
                                <tr key={index} className="item-summary-row">
                                  <td><strong>{item.itemName} ({item.grnCode})</strong></td>
                                  <td><strong>{Number(item.sp).toFixed(2)}</strong></td>
                                  <td><strong>{Number(item.original_weight).toFixed(2)}</strong></td>
                                  <td><strong>{Number(item.original_packs).toFixed(0)}</strong></td>
                                  <td><strong>{Number(item.sold_weight).toFixed(2)}</strong></td>
                                  <td><strong>{Number(item.sold_packs).toFixed(0)}</strong></td>
                                  <td><strong>Rs. {Number(item.total_sales_value).toFixed(2)}</strong></td>
                                  <td><strong>{Number(item.remaining_weight).toFixed(2)}</strong></td>
                                  <td><strong>{Number(item.remaining_packs).toFixed(0)}</strong></td>
                                </tr>
                              ))}
                              
                              <tr className="total-row">
                                <td className="text-end"><strong>සමස්ත එකතුව:</strong></td>
                                <td><strong>{Number(grandTotals.grandTotalPrice).toFixed(2)}</strong></td>
                                <td><strong>{Number(grandTotals.grandTotalOriginalWeight).toFixed(2)}</strong></td>
                                <td><strong>{Number(grandTotals.grandTotalOriginalPacks).toFixed(0)}</strong></td>
                                <td><strong>{Number(grandTotals.grandTotalSoldWeight).toFixed(2)}</strong></td>
                                <td><strong>{Number(grandTotals.grandTotalSoldPacks).toFixed(0)}</strong></td>
                                <td><strong>Rs. {Number(grandTotals.grandTotalSalesValue).toFixed(2)}</strong></td>
                                <td><strong>{Number(grandTotals.grandTotalRemainingWeight).toFixed(2)}</strong></td>
                                <td><strong>{Number(grandTotals.grandTotalRemainingPacks).toFixed(0)}</strong></td>
                              </tr>
                            </>
                          ) : (
                            <tr>
                              <td colSpan="9" className="text-center text-muted py-4">දත්ත නොමැත.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <button className="btn btn-success me-2" onClick={() => alert('Excel download functionality would go here')}>
                    Download Excel
                  </button>
                  <button className="btn btn-danger me-2" onClick={() => alert('PDF download functionality would go here')}>
                    Download PDF
                  </button>
                  <button className="btn btn-info" onClick={() => alert('Email functionality would go here')}>
                    📧 Email Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrnSalesOverviewReport;