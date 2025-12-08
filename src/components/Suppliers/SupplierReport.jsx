// src/components/SupplierReport.jsx (COMPLETE UPDATED CODE)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from "../../api";
import SupplierDetailsPanel from './SupplierDetailsPanel'; // Changed from Modal to Panel

const SupplierReport = () => {
    // State for all data
    const [summary, setSummary] = useState({ printed: [], unprinted: [] });
    const [isLoading, setIsLoading] = useState(true);

    const [printedSearchTerm, setPrintedSearchTerm] = useState('');
    const [unprintedSearchTerm, setUnprintedSearchTerm] = useState('');

    // --- REPORT VIEW STATE ---
    // 'summary', 'profit', or 'details'
    const [currentView, setCurrentView] = useState('summary');

    // --- PROFIT REPORT STATE ---
    const [profitReportData, setProfitReportData] = useState([]);
    const [isProfitReportLoading, setIsProfitReportLoading] = useState(false);
    const [profitSearchTerm, setProfitSearchTerm] = useState('');
    // ----------------------------

    // State for Details Panel (data and loading moved from modal to parent for centralized display)
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [selectedBillNo, setSelectedBillNo] = useState(null);
    const [isUnprintedBill, setIsUnprintedBill] = useState(false);
    const [supplierDetails, setSupplierDetails] = useState([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // --- Function to fetch the summary data ---
    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        setCurrentView('summary'); // Reset view to summary on refresh
        try {
            const response = await api.get('/suppliers/bill-status-summary');
            setSummary({
                printed: response.data.printed || [],
                unprinted: response.data.unprinted || [],
            });
        } catch (error) {
            console.error('Error fetching summary data:', error);
            setSummary({ printed: [], unprinted: [] });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- Initial Fetch ---
    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // --- Filtering Logic ---
    const filteredPrintedItems = useMemo(() => {
        const lowerCaseSearch = printedSearchTerm.toLowerCase();
        return summary.printed.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch) ||
            (item.supplier_bill_no && item.supplier_bill_no.toLowerCase().includes(lowerCaseSearch))
        );
    }, [printedSearchTerm, summary.printed]);

    const filteredUnprintedItems = useMemo(() => {
        const lowerCaseSearch = unprintedSearchTerm.toLowerCase();
        return summary.unprinted.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch)
        );
    }, [unprintedSearchTerm, summary.unprinted]);

    const filteredProfitReport = useMemo(() => {
        const lowerCaseSearch = profitSearchTerm.toLowerCase();
        return profitReportData.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch)
        );
    }, [profitSearchTerm, profitReportData]);

    // --- Handle Unprinted Bill Click ---
    const handleUnprintedBillClick = async (supplierCode, billNo) => {
        setCurrentView('details');
        setSelectedSupplier(supplierCode);
        setSelectedBillNo(billNo);
        setIsUnprintedBill(true);
        setSupplierDetails([]);
        setIsDetailsLoading(true);

        try {
            const response = await api.get(`/suppliers/${supplierCode}/unprinted-details`);
            setSupplierDetails(response.data);
        } catch (error) {
            console.error(`Error fetching unprinted details for ${supplierCode}:`, error);
        } finally {
            setIsDetailsLoading(false);
        }
    };

    // --- Handle Printed Bill Click ---
    const handlePrintedBillClick = async (supplierCode, billNo) => {
        setCurrentView('details');
        setSelectedSupplier(supplierCode);
        setSelectedBillNo(billNo);
        setIsUnprintedBill(false);
        setSupplierDetails([]);
        setIsDetailsLoading(true);

        try {
            const response = await api.get(`/suppliers/bill/${billNo}/details`);
            setSupplierDetails(response.data);
        } catch (error) {
            console.error(`Error fetching printed details for bill ${billNo}:`, error);
        } finally {
            setIsDetailsLoading(false);
        }
    };

    // --- Handle Profit Report Click ---
    const handleProfitReportClick = async () => {
        setCurrentView('profit');
        setProfitReportData([]);
        setIsProfitReportLoading(true);

        try {
            const response = await api.get('/sales/profit-by-supplier');
            setProfitReportData(response.data);
        } catch (error) {
            console.error('Error fetching profit report data:', error);
        } finally {
            setIsProfitReportLoading(false);
        }
    };

    // --- Function to close details and go back to summary ---
    const handleDetailsClose = () => {
        setCurrentView('summary');
        setSelectedSupplier(null);
        setSelectedBillNo(null);
        setIsUnprintedBill(false);
        setSupplierDetails([]);
        fetchSummary(); // Refresh summary after possible print action
    };

    // --- Close Profit Report View ---
    const closeProfitReport = () => {
        setCurrentView('summary');
        setProfitReportData([]);
        setProfitSearchTerm('');
    };

    // Helper component for rendering supplier codes (remains the same)
    const SupplierCodeList = ({ items, type, searchTerm }) => {
        const fixedButtonWidth = '180px';

        const groupedItems = useMemo(() => {
            return items.reduce((acc, item) => {
                const { supplier_code, supplier_bill_no } = item;
                const billIdentifier = type === 'printed' ? supplier_bill_no : supplier_code;

                if (!acc[supplier_code]) {
                    acc[supplier_code] = [];
                }
                if (type === 'printed' && supplier_bill_no) {
                    acc[supplier_code].push(supplier_bill_no);
                } else if (type === 'unprinted' && !acc[supplier_code].includes(supplier_code)) {
                    acc[supplier_code].push(supplier_code);
                }
                return acc;
            }, {});
        }, [items, type]);

        const supplierCodes = Object.keys(groupedItems);

        const buttonBaseStyle = {
            width: fixedButtonWidth,
            display: 'inline-block',
            textAlign: 'center',
            padding: '12px 15px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            border: 'none',
            transition: 'background-color 0.2s, transform 0.1s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            fontSize: '1rem',
            marginBottom: '4px',
        };

        const printedButtonStyle = {
            ...buttonBaseStyle,
            backgroundColor: '#1E88E5',
            color: 'white',
        };

        const unprintedButtonStyle = {
            ...buttonBaseStyle,
            backgroundColor: '#FF7043',
            color: 'white',
        };

        const buttonStyle = type === 'printed' ? printedButtonStyle : unprintedButtonStyle;

        const groupContainerStyle = {
            marginBottom: '15px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            width: '100%',
            boxSizing: 'border-box',
        };

        const groupHeaderStyle = {
            fontWeight: '700',
            color: type === 'printed' ? '#1E88E5' : '#FF7043',
            marginBottom: '8px',
            fontSize: '1.2rem',
            textAlign: 'left',
            paddingLeft: '5px',
        };

        if (items.length === 0) {
            return (
                <p style={{ color: '#6c757d', padding: '10px' }}>
                    {searchTerm ? `No results found for "${searchTerm}"` : 'No suppliers in this category.'}
                </p>
            );
        }

        return (
            <div style={listContainerStyle}>
                {supplierCodes.map(supplierCode => (
                    <div key={supplierCode} style={groupContainerStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {groupedItems[supplierCode].map(billIdentifier => (
                                <button
                                    key={billIdentifier}
                                    onClick={() => type === 'printed'
                                        ? handlePrintedBillClick(supplierCode, billIdentifier)
                                        : handleUnprintedBillClick(supplierCode, null)
                                    }
                                    style={{
                                        ...buttonStyle,
                                        fontSize: '12px',          // smaller font
                                        whiteSpace: 'nowrap',      // force single line
                                        padding: '6px 8px',        // tighter padding
                                        maxWidth: '100%',          // optional
                                        overflow: 'hidden',        // optional
                                        textOverflow: 'ellipsis'   // optional
                                    }}
                                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    {type === 'printed'
                                        ? `Supplier: ${supplierCode} | Bill No: ${billIdentifier}`
                                        : `Supplier: ${supplierCode} | Print All Pending`
                                    }
                                </button>


                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // --- Central Content Renderer ---
    const renderCenterContent = () => {
        if (currentView === 'details') {
            return (
                <SupplierDetailsPanel
                    supplierCode={selectedSupplier}
                    billNo={selectedBillNo}
                    isUnprintedBill={isUnprintedBill}
                    details={supplierDetails}
                    isLoading={isDetailsLoading}
                    onDone={handleDetailsClose} // Callback to switch back to summary
                />
            );
        }

        if (currentView === 'profit') {
            return (
                <div style={profitReportContainerStyle}>
                    <h2 style={profitReportHeaderStyle}>📈 Total Profit by Supplier (from Sales)</h2>
                    <button onClick={closeProfitReport} style={closeProfitButtonStyle}>
                        &larr; Back to Bill Status Summary
                    </button>
                    <input
                        type="text"
                        placeholder="🔍 Search by Supplier Code..."
                        value={profitSearchTerm}
                        onChange={(e) => setProfitSearchTerm(e.target.value)}
                        style={{ ...searchBarStyle, width: '400px', marginBottom: '30px' }}
                    />

                    {isProfitReportLoading ? (
                        <div style={loadingStyle}>Loading Profit Data...</div>
                    ) : filteredProfitReport.length === 0 ? (
                        <p style={{ color: '#6c757d', padding: '10px' }}>
                            {profitSearchTerm ? `No results found for "${profitSearchTerm}"` : 'No profit data available.'}
                        </p>
                    ) : (
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={tableHeaderStyle}>Supplier Code</th>
                                    <th style={tableHeaderStyle}>Total Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProfitReport.map((item, index) => (
                                    <tr key={index} style={index % 2 === 0 ? tableRowEvenStyle : tableRowOddStyle}>
                                        <td style={tableCellStyle}>{item.supplier_code}</td>
                                        <td style={tableCellStyle}>${parseFloat(item.total_profit).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            );
        }

        // Default: Summary (or loading)
        if (isLoading) return <div style={{ ...loadingStyle, height: '100%', backgroundColor: 'transparent' }}>Loading Report Data...</div>;

        return (
            <div style={welcomeMessageContainerStyle}>
                <h2 style={welcomeHeaderStyle}>Select a Bill</h2>
                <p style={welcomeTextStyle}>Click on a **Printed Bill** or **Print All Pending** button on either side to view transaction details, generate a bill, and finalize the supplier payment process.</p>
                
            </div>
        );
    };

    if (isLoading && currentView === 'summary') return <div style={loadingStyle}>Loading Supplier Report...</div>;

    return (
        <div style={reportContainerStyle}>
            <header style={headerContainerStyle}>
               
            </header>

            <div style={sectionsContainerStyle}>

                {/* --- Left Section: Printed Bills --- */}
                <div style={printedContainerStyle}>
                    <div style={printedSectionStyle}>
                          <h2 style={printedHeaderStyle}> Printed Bills </h2>
                        <input
                            type="text"
                            placeholder="🔍 Search Printed Codes/Bills..."
                            value={printedSearchTerm}
                            onChange={(e) => setPrintedSearchTerm(e.target.value)}
                            style={{ ...searchBarStyle, marginBottom: '20px' }}
                            disabled={currentView !== 'summary'}
                        />
                      
                        <SupplierCodeList items={filteredPrintedItems} type="printed" searchTerm={printedSearchTerm} />
                    </div>
                </div>

                {/* --- Center Section: Details/Profit/Welcome --- */}
                <div style={centerPanelContainerStyle}>
                    {renderCenterContent()}
                </div>

                {/* --- Right Section: Unprinted Bills --- */}
                <div style={unprintedContainerStyle}>
                    <div style={unprintedSectionStyle}>
                        <h2 style={unprintedHeaderStyle}> Unprinted Bills </h2>
                        <input
                            type="text"
                            placeholder="🔍 Search Unprinted Codes/Bills..."
                            value={unprintedSearchTerm}
                            onChange={(e) => setUnprintedSearchTerm(e.target.value)}
                            style={{ ...searchBarStyle, marginBottom: '20px' }}
                            disabled={currentView !== 'summary'}
                        />
                        
                        <SupplierCodeList items={filteredUnprintedItems} type="unprinted" searchTerm={unprintedSearchTerm} />
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- STYLES (Adjusted for Three-Column Layout) ---

const reportContainerStyle = {
    minHeight: '100vh',
    padding: '0 50px 50px 50px',
    fontFamily: 'Roboto, Arial, sans-serif',
    boxSizing: 'border-box',
    backgroundColor: '#99ff99',
};

const headerContainerStyle = {
    padding: '40px 0 30px 0',
    borderBottom: '1px solid #E0E0E0',
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: '#99ff99',
};

const headerStyle = {
    textAlign: 'left',
    color: '#343a40',
    marginBottom: '5px',
    fontSize: '2.8rem',
    fontWeight: '300',
};

const profitReportButtonStyle = {
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    height: 'fit-content',
    whiteSpace: 'nowrap',
};

const searchBarStyle = {
    width: '100%',
    padding: '12px 15px',
    fontSize: '1rem',
    borderRadius: '6px',
    border: '1px solid #E0E0E0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    backgroundColor: 'white',
};

// --- CORE LAYOUT CHANGE ---
const sectionsContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '30px', // Space between the three columns
};

const printedContainerStyle = {
    width: '250px', // Fixed width for sidebars
    flexShrink: 0,
    marginLeft: '-30px',
    marginTop: '-95px',
};

const unprintedContainerStyle = {
    width: '250px', // Fixed width for sidebars
    flexShrink: 0,
    // FIX: Remove the huge fixed margin which creates the unnecessary gap
    marginRight: '-30px', 
    marginTop: '-95px',
};

const centerPanelContainerStyle = {
    flexGrow: 1, // Now it can truly take the remaining space
    minWidth: '550px',
    display: 'flex',
    justifyContent: 'center', 
    alignItems: 'flex-start',
    // FIX: Remove the unnecessary negative margin
    marginLeft: '0', 
    // Minimum height set by sidebar section styles
};
// -------------------------

const baseSectionStyle = {
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 210px)', // Set height for sidebars
};

const printedSectionStyle = {
    ...baseSectionStyle,
    backgroundColor: '#E6FFE6',
    borderLeft: '5px solid #1E88E5',
};

const unprintedSectionStyle = {
    ...baseSectionStyle,
    backgroundColor: '#FFEBE6',
    borderLeft: '5px solid #FF7043',
};

const printedHeaderStyle = {
    color: '#1E88E5',
    marginBottom: '15px',
    borderBottom: '2px solid #1E88E530',
    paddingBottom: '10px',
    flexShrink: 0,
    fontSize: '1.3rem',
};

const unprintedHeaderStyle = {
    color: '#FF7043',
    marginBottom: '15px',
    borderBottom: '2px solid #FF704330',
    paddingBottom: '10px',
    flexShrink: 0,
    fontSize: '1.3rem',
};

const listContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '5px',
    overflowY: 'auto',
    padding: '5px',
    flexGrow: 1,
    alignItems: 'center',
};

const loadingStyle = {
    textAlign: 'center',
    padding: '50px',
    fontSize: '1.5rem',
    color: '#1E88E5',
    backgroundColor: '#99ff99',
};

const profitReportContainerStyle = {
    marginTop: '0',
    padding: '25px',
    backgroundColor: '#E6FFE6',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    minHeight: 'calc(100vh - 250px)',
    width: '100%',
};

const profitReportHeaderStyle = {
    color: '#4CAF50',
    marginBottom: '25px',
    borderBottom: '2px solid #4CAF5030',
    paddingBottom: '10px',
    fontSize: '2rem',
    fontWeight: '400',
    textAlign: 'center',
};

const closeProfitButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#6c757d',
    cursor: 'pointer',
    fontSize: '1rem',
    marginBottom: '20px',
    padding: '5px 0',
    display: 'block',
    fontWeight: '500',
    transition: 'color 0.2s',
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
};

const tableHeaderStyle = {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '15px',
    textAlign: 'left',
    fontSize: '1.1rem',
    fontWeight: '600',
};

const tableCellStyle = {
    padding: '15px',
    borderBottom: '1px solid #E0E0E0',
    textAlign: 'left',
};

const tableRowEvenStyle = {
    backgroundColor: '#f8f8f8',
};

const tableRowOddStyle = {
    backgroundColor: 'white',
};

// --- Welcome/Summary Message Styles ---
const welcomeMessageContainerStyle = {
    padding: '60px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    textAlign: 'center',
    height: 'fit-content',
    maxWidth: '1500px', // Increased width
    margin: 'auto',
    marginTop: '-95px',
};

const welcomeHeaderStyle = {
    color: '#343a40',
    fontSize: '2rem',
    marginBottom: '20px',
};

const welcomeTextStyle = {
    color: '#6c757d',
    fontSize: '1.1rem',
    lineHeight: '1.6',
    marginBottom: '15px',
};
// ----------------------------------------

export default SupplierReport;