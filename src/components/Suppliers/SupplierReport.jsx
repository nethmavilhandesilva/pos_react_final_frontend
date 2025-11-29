// src/components/SupplierReport.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from "../../api";
import SupplierDetailsModal from './SupplierDetailsModal';

const SupplierReport = () => {
    // State for all data
    const [summary, setSummary] = useState({ printed: [], unprinted: [] });
    const [isLoading, setIsLoading] = useState(true);

    const [printedSearchTerm, setPrintedSearchTerm] = useState('');
    const [unprintedSearchTerm, setUnprintedSearchTerm] = useState(''); // This state is correctly set

    // --- NEW STATE FOR PROFIT REPORT ---
    const [isProfitReportOpen, setIsProfitReportOpen] = useState(false);
    const [profitReportData, setProfitReportData] = useState([]);
    const [isProfitReportLoading, setIsProfitReportLoading] = useState(false);
    const [profitSearchTerm, setProfitSearchTerm] = useState('');
    // ------------------------------------

    // State for Details Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [selectedBillNo, setSelectedBillNo] = useState(null);
    const [isUnprintedBill, setIsUnprintedBill] = useState(false);
    const [supplierDetails, setSupplierDetails] = useState([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // --- Function to fetch the summary data ---
    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/suppliers/bill-status-summary');
            setSummary({
                printed: response.data.printed || [],
                unprinted: response.data.unprinted || [],
            });
        } catch (error) {
            console.error('Error fetching summary data:', error);
            // No mock data - just set empty arrays on error
            setSummary({
                printed: [],
                unprinted: [],
            });
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
            // Note: Unprinted bills won't have a supplier_bill_no yet, so only search by code.
        );
    }, [unprintedSearchTerm, summary.unprinted]);

    // --- NEW Filtering for Profit Report ---
    const filteredProfitReport = useMemo(() => {
        const lowerCaseSearch = profitSearchTerm.toLowerCase();
        return profitReportData.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch)
        );
    }, [profitSearchTerm, profitReportData]);

    // --- Handle Unprinted Bill Click ---
    const handleUnprintedBillClick = async (supplierCode, billNo) => {
        setIsProfitReportOpen(false);
        setSelectedSupplier(supplierCode);
        setSelectedBillNo(billNo);
        setIsUnprintedBill(true);
        setIsModalOpen(true);
        setSupplierDetails([]);
        setIsDetailsLoading(true);

        try {
            // Fetch unprinted transactions for this supplier code
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
        setIsProfitReportOpen(false);
        setSelectedSupplier(supplierCode);
        setSelectedBillNo(billNo);
        setIsUnprintedBill(false);
        setIsModalOpen(true);
        setSupplierDetails([]);
        setIsDetailsLoading(true);

        try {
            // Fetch printed transactions for this specific bill number
            const response = await api.get(`/suppliers/bill/${billNo}/details`);
            setSupplierDetails(response.data);
        } catch (error) {
            console.error(`Error fetching printed details for bill ${billNo}:`, error);
        } finally {
            setIsDetailsLoading(false);
        }
    };

    // --- NEW Handle Profit Report Click ---
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

    // --- Close Details Modal ---
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedSupplier(null);
        setSelectedBillNo(null);
        setIsUnprintedBill(false);
        setSupplierDetails([]);

        // Refresh the summary data
        fetchSummary();
    };

    // --- Close Profit Report View ---
    const closeProfitReport = () => {
        setIsProfitReportOpen(false);
        setProfitReportData([]);
        setProfitSearchTerm('');
    };

    // Helper component for rendering supplier codes
    const SupplierCodeList = ({ items, type, searchTerm }) => {
        const fixedButtonWidth = '180px';

        // Group items by supplier_code
        const groupedItems = useMemo(() => {
            return items.reduce((acc, item) => {
                const { supplier_code, supplier_bill_no } = item;
                // For unprinted bills, the billNo is often not present in the summary list, 
                // but the structure expects it for the button text. We use the supplier_code itself 
                // as a pseudo-bill identifier for grouping since unprinted is grouped by supplier code.
                const billIdentifier = type === 'printed' ? supplier_bill_no : supplier_code; 

                if (!acc[supplier_code]) {
                    acc[supplier_code] = [];
                }
                // Push the bill number if printed, or the supplier code if unprinted
                if (type === 'printed' && supplier_bill_no) {
                    acc[supplier_code].push(supplier_bill_no);
                } else if (type === 'unprinted' && !acc[supplier_code].includes(supplier_code)) {
                    // For unprinted, we only need one button per supplier code to trigger the modal
                    // which fetches ALL unprinted records for that code.
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
                        <div style={groupHeaderStyle}>Supplier: {supplierCode}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* GroupedItems[supplierCode] holds the bill numbers (or supplierCode for unprinted) */}
                            {groupedItems[supplierCode].map(billIdentifier => (
                                <button
                                    key={billIdentifier}
                                    onClick={() => type === 'printed'
                                        ? handlePrintedBillClick(supplierCode, billIdentifier)
                                        : handleUnprintedBillClick(supplierCode, null) // Pass null for billNo, modal handles generation
                                    }
                                    style={buttonStyle}
                                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    {type === 'printed' ? `Bill No: ${billIdentifier}` : `Print All Pending`}
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
                            <h2 style={unprintedHeaderStyle}>❌ Unprinted Bills ({filteredUnprintedItems.length} items)</h2>
                            {/* 🚨 FIX APPLIED HERE 🚨: Use filteredUnprintedItems instead of summary.unprinted */}
                            <SupplierCodeList items={filteredUnprintedItems} type="unprinted" searchTerm={unprintedSearchTerm} />
                        </div>
                    </div>

                </div>
            )}

            {/* --- Details Modal Component --- */}
            {isModalOpen && (
                <SupplierDetailsModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    supplierCode={selectedSupplier}
                    billNo={selectedBillNo}
                    isUnprintedBill={isUnprintedBill}
                    details={supplierDetails}
                    isLoading={isDetailsLoading}
                />
            )}
        </div>
    );
};

// --- STYLES (remain the same as before) ---

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

const sectionsContainerStyle = {
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '0',
};

const printedContainerStyle = {
    width: '400px',
    display: 'flex',
    flexDirection: 'column',
    marginLeft: '-25px',
};

const unprintedContainerStyle = {
    width: '400px',
    display: 'flex',
    flexDirection: 'column',
    marginLeft: '440px',
};

const baseSectionStyle = {
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 210px)',
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
    gap: '8px',
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
    marginTop: '20px',
    padding: '25px',
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

export default SupplierReport;