// src/components/SupplierReport.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from "../../api";
import SupplierDetailsModal from './SupplierDetailsModal';

// --- NEW Data Structure for Printed/Unprinted items ---
// Example: [{ supplier_code: 'SUP01', supplier_bill_no: 'B2023001' }, { supplier_code: 'SUP01', supplier_bill_no: 'B2023005' }]

const SupplierReport = () => {
    // State for all data
    // **MODIFIED:** Summary state now holds objects { supplier_code: string, supplier_bill_no: string }
    const [summary, setSummary] = useState({ printed: [], unprinted: [] });
    const [isLoading, setIsLoading] = useState(true);
    
    const [printedSearchTerm, setPrintedSearchTerm] = useState(''); 
    const [unprintedSearchTerm, setUnprintedSearchTerm] = useState(''); 

    // --- NEW STATE FOR PROFIT REPORT ---
    const [isProfitReportOpen, setIsProfitReportOpen] = useState(false);
    const [profitReportData, setProfitReportData] = useState([]);
    const [isProfitReportLoading, setIsProfitReportLoading] = useState(false);
    const [profitSearchTerm, setProfitSearchTerm] = useState('');
    // ------------------------------------

    // State for Details Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierDetails, setSupplierDetails] = useState([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // --- Function to fetch the summary data ---
    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        try {
            // **MODIFIED:** Assume the backend returns the new structure:
            // { printed: [{ code: 'SUP01', bill: 'B001' }], unprinted: [{ code: 'SUP02', bill: 'B002' }] }
            // For simulation, we'll use a mock response structure.
            const response = await api.get('/suppliers/bill-status-summary');
            
            // Assuming the API now returns objects:
            // { printed: [{ supplier_code: 'SUP01', supplier_bill_no: 'B2023001' }, ...], unprinted: [...] }
            setSummary({
                printed: response.data.printed || [],
                unprinted: response.data.unprinted || [],
            });
        } catch (error) {
            console.error('Error fetching summary data:', error);
            
            // **MOCK DATA for the new structure during development**
            setSummary({
                printed: [
                    { supplier_code: 'SUP01', supplier_bill_no: 'B-2023-001' },
                    { supplier_code: 'SUP02', supplier_bill_no: 'B-2023-002' },
                    { supplier_code: 'SUP01', supplier_bill_no: 'B-2023-005' },
                    { supplier_code: 'SUP03', supplier_bill_no: 'B-2023-003' },
                    { supplier_code: 'SUP04', supplier_bill_no: 'B-2023-010' },
                ],
                unprinted: [
                    { supplier_code: 'SUP05', supplier_bill_no: 'B-2023-011' },
                    { supplier_code: 'SUP06', supplier_bill_no: 'B-2023-012' },
                    { supplier_code: 'SUP05', supplier_bill_no: 'B-2023-013' },
                ],
            });

        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- Initial Fetch ---
    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // --- Filtering Logic (MODIFIED for the new object structure) ---
    const filteredPrintedItems = useMemo(() => {
        const lowerCaseSearch = printedSearchTerm.toLowerCase();
        return summary.printed.filter(item => 
            item.supplier_code.toLowerCase().includes(lowerCaseSearch) ||
            item.supplier_bill_no.toLowerCase().includes(lowerCaseSearch)
        );
    }, [printedSearchTerm, summary.printed]);

    const filteredUnprintedItems = useMemo(() => {
        const lowerCaseSearch = unprintedSearchTerm.toLowerCase();
        return summary.unprinted.filter(item => 
            item.supplier_code.toLowerCase().includes(lowerCaseSearch) ||
            item.supplier_bill_no.toLowerCase().includes(lowerCaseSearch)
        );
    }, [unprintedSearchTerm, summary.unprinted]);

    // --- NEW Filtering for Profit Report (No change) ---
    const filteredProfitReport = useMemo(() => {
        const lowerCaseSearch = profitSearchTerm.toLowerCase();
        return profitReportData.filter(item => 
            item.supplier_code.toLowerCase().includes(lowerCaseSearch)
        );
    }, [profitSearchTerm, profitReportData]);
    // ----------------------------------------

    // --- Handle Supplier Click (Opens Details Modal & Fetches Details) ---
    // **MODIFIED:** Pass supplier_code for the API call, but still use bill_no for identification if needed.
    const handleSupplierClick = async (supplierCode, billNo) => {
        setIsProfitReportOpen(false); 
        // We set the selected supplier to the bill number, or just the code if we want to fetch all details for a supplier
        // For this context, let's assume the modal will look up the bill details based on the billNo, but the API expects a code.
        setSelectedSupplier(supplierCode); 
        setIsModalOpen(true);
        setSupplierDetails([]);
        setIsDetailsLoading(true);

        try {
            // **NOTE:** The API call here might need to change to `/suppliers/bill/${billNo}/details` if the details are bill-specific.
            // Keeping it simple for now based on the original structure:
            const response = await api.get(`/suppliers/${supplierCode}/details`);
            setSupplierDetails(response.data);
        } catch (error) {
            console.error(`Error fetching details for ${supplierCode}:`, error);
        } finally {
            setIsDetailsLoading(false);
        }
    };

    // --- NEW Handle Profit Report Click (No change) ---
    const handleProfitReportClick = async () => {
        setIsModalOpen(false); 
        setIsProfitReportOpen(true);
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

    // --- Close Details Modal (FIXED: Triggers a data refresh) ---
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedSupplier(null);
        setSupplierDetails([]);
        
        // 🚀 FIX: Immediately re-fetch the summary data. 
        // This moves the supplier code from 'unprinted' to 'printed' on the screen.
        fetchSummary();
    };

    // --- Close Profit Report View (No change) ---
    const closeProfitReport = () => {
        setIsProfitReportOpen(false);
        setProfitReportData([]);
        setProfitSearchTerm('');
    };

    // Helper component for rendering supplier codes (MODIFIED for new data structure and grouping)
    const SupplierCodeList = ({ items, type, searchTerm }) => {
        const fixedButtonWidth = '180px'; 
        
        // **NEW LOGIC: Group items by supplier_code**
        const groupedItems = useMemo(() => {
            return items.reduce((acc, item) => {
                const { supplier_code, supplier_bill_no } = item;
                if (!acc[supplier_code]) {
                    acc[supplier_code] = [];
                }
                acc[supplier_code].push(supplier_bill_no);
                return acc;
            }, {});
        }, [items]);

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
            marginBottom: '4px', // Space between bills of the same supplier
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
            marginBottom: '15px', // Space between different suppliers
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
                        <div style={groupHeaderStyle}>Supplier: {supplierCode}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {groupedItems[supplierCode].map(billNo => (
                                <button
                                    key={billNo}
                                    // Pass both the code and the specific bill number
                                    onClick={() => handleSupplierClick(supplierCode, billNo)} 
                                    style={buttonStyle}
                                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    Bill No: {billNo}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (isLoading) return <div style={loadingStyle}>Loading Supplier Report...</div>;

    return (
        <div style={reportContainerStyle}>
            <header style={headerContainerStyle}>
                <h1 style={headerStyle}>📊 Supplier Management Dashboard</h1>
                <button 
                    onClick={handleProfitReportClick} 
                    style={profitReportButtonStyle}
                >
                    💰 View Supplier Profit Report
                </button>
            </header>
            
            {/* --- Conditional Rendering for Profit Report vs. Bill Status --- */}
            {isProfitReportOpen ? (
                // --- Supplier Profit Report View ---
                <div style={profitReportContainerStyle}>
                    <h2 style={profitReportHeaderStyle}>📈 Total Profit by Supplier (from Sales)</h2>
                    <button onClick={closeProfitReport} style={closeProfitButtonStyle}>
                        &larr; Back to Bill Status
                    </button>
                    <input 
                        type="text"
                        placeholder="🔍 Search by Supplier Code..."
                        value={profitSearchTerm}
                        onChange={(e) => setProfitSearchTerm(e.target.value)}
                        style={{...searchBarStyle, width: '400px', marginBottom: '30px'}}
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
                                        {/* Format the profit value to currency/two decimal places */}
                                        <td style={tableCellStyle}>${parseFloat(item.total_profit).toFixed(2)}</td> 
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            ) : (
                // --- Bill Status Summary View ---
                <div style={sectionsContainerStyle}>
                    
                    {/* --- Printed Section (Left Corner) --- */}
                    <div style={printedContainerStyle}>
                        <div style={printedSectionStyle}>
                            <input 
                                type="text"
                                placeholder="🔍 Search Printed Codes/Bills..."
                                value={printedSearchTerm}
                                onChange={(e) => setPrintedSearchTerm(e.target.value)}
                                style={{...searchBarStyle, marginBottom: '20px'}}
                            />
                            <h2 style={printedHeaderStyle}>✅ Printed Bills ({filteredPrintedItems.length} items)</h2>
                            {/* **MODIFIED**: Passed the new filteredItems array */}
                            <SupplierCodeList items={filteredPrintedItems} type="printed" searchTerm={printedSearchTerm} />
                        </div>
                    </div>

                    {/* --- Unprinted Section (Right Corner - Custom Pushed) --- */}
                    <div style={unprintedContainerStyle}>
                        <div style={unprintedSectionStyle}>
                            <input 
                                type="text"
                                placeholder="🔍 Search Unprinted Codes/Bills..."
                                value={unprintedSearchTerm}
                                onChange={(e) => setUnprintedSearchTerm(e.target.value)}
                                style={{...searchBarStyle, marginBottom: '20px'}}
                            />
                            {/* **MODIFIED**: Updated count to reflect number of bill items */}
                            <h2 style={unprintedHeaderStyle}>❌ Unprinted Bills ({filteredUnprintedItems.length} items of {summary.unprinted.length})</h2>
                            {/* **MODIFIED**: Passed the new filteredItems array */}
                            <SupplierCodeList items={filteredUnprintedItems} type="unprinted" searchTerm={unprintedSearchTerm} />
                        </div>
                    </div>

                </div>
            )}


            {/* --- Details Modal Component (Only shows if Bill Status View is active) --- */}
            {isModalOpen && !isProfitReportOpen && (
                <SupplierDetailsModal
                    isOpen={isModalOpen}
                    onClose={closeModal} // This calls the function that triggers fetchSummary()
                    supplierCode={selectedSupplier}
                    details={supplierDetails}
                    isLoading={isDetailsLoading}
                />
            )}
        </div>
    );
};

// --- ENHANCED FULL-PAGE AND CUSTOM-ALIGNED STYLES ---

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

// NEW STYLE for the Profit Report Button
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

// Search bar style (used inline above to set marginBottom)
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

const sectionsContainerStyle = {
    display: 'flex', 
    justifyContent: 'flex-start', 
    gap: '0', 
};

// Outer container for left section
const printedContainerStyle = {
    width: '400px', 
    display: 'flex',
    flexDirection: 'column',
    marginLeft: '-25px', 
};

// Outer container for right section
const unprintedContainerStyle = {
    width: '400px', 
    display: 'flex',
    flexDirection: 'column',
    marginLeft: '440px', 
};

// Inner, colored/scrolling section
const baseSectionStyle = {
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 210px)', 
};

// Retained specific color on the Bill Status sections for visual differentiation,
// but ensured they are not white to better integrate with the light green page background.
const printedSectionStyle = {
    ...baseSectionStyle,
    backgroundColor: '#E6FFE6', // Light tone of the requested green/white for contrast
    borderLeft: '5px solid #1E88E5',
};

const unprintedSectionStyle = {
    ...baseSectionStyle,
    backgroundColor: '#FFEBE6', // Light tone of the requested green/orange for contrast
    borderLeft: '5px solid #FF7043',
};

// Header for the list (comes after the search bar)
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
    gap: '8px', // Gap between groups is handled by groupContainerStyle margin
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
    backgroundColor: '#99ff99', // Ensure loading screen also uses the new color
};

// --- NEW PROFIT REPORT STYLES ---

const profitReportContainerStyle = {
    marginTop: '20px',
    padding: '25px',
    // Set background to a slightly lighter tone for a subtle contrast, 
    // but allowing the page background (#99ff99) to dominate the unused space.
    backgroundColor: '#E6FFE6', 
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    minHeight: 'calc(100vh - 250px)',
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
    backgroundColor: 'white', // Retain white background for the table rows/cells for readability
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

export default SupplierReport;