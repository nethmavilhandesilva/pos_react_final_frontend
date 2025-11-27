// src/components/SupplierReport.jsx

import React, { useState, useEffect, useMemo } from 'react';
import api from "../../api";
import SupplierDetailsModal from './SupplierDetailsModal';

const SupplierReport = () => {
    // State for all data
    const [summary, setSummary] = useState({ printed: [], unprinted: [] });
    const [isLoading, setIsLoading] = useState(true);
    
    // Two separate search terms
    const [printedSearchTerm, setPrintedSearchTerm] = useState(''); 
    const [unprintedSearchTerm, setUnprintedSearchTerm] = useState(''); 

    // State for Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierDetails, setSupplierDetails] = useState([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // --- Fetch Summary Data ---
    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const response = await api.get('/suppliers/bill-status-summary');
                setSummary({
                    printed: response.data.printed || [],
                    unprinted: response.data.unprinted || [],
                });
            } catch (error) {
                console.error('Error fetching summary data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, []);

    // --- Filtering Logic (useMemo for performance) ---
    const filteredPrintedCodes = useMemo(() => {
        const lowerCaseSearch = printedSearchTerm.toLowerCase();
        return summary.printed.filter(code => 
            code.toLowerCase().includes(lowerCaseSearch)
        );
    }, [printedSearchTerm, summary.printed]);

    const filteredUnprintedCodes = useMemo(() => {
        const lowerCaseSearch = unprintedSearchTerm.toLowerCase();
        return summary.unprinted.filter(code => 
            code.toLowerCase().includes(lowerCaseSearch)
        );
    }, [unprintedSearchTerm, summary.unprinted]);

    // --- Handle Supplier Click (Opens Modal & Fetches Details) ---
    const handleSupplierClick = async (supplierCode) => {
        setSelectedSupplier(supplierCode);
        setIsModalOpen(true);
        setSupplierDetails([]);
        setIsDetailsLoading(true);

        try {
            const response = await api.get(`/suppliers/${supplierCode}/details`);
            setSupplierDetails(response.data);
        } catch (error) {
            console.error(`Error fetching details for ${supplierCode}:`, error);
        } finally {
            setIsDetailsLoading(false);
        }
    };

    // --- Close Modal ---
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedSupplier(null);
        setSupplierDetails([]);
    };

    // Helper component for rendering supplier codes
    const SupplierCodeList = ({ codes, type, searchTerm }) => {
        // Set a fixed width for the buttons
        const fixedButtonWidth = '180px'; 

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

        return (
            <div style={listContainerStyle}>
                {codes.length === 0 ? (
                    <p style={{ color: '#6c757d', padding: '10px' }}>
                        {searchTerm ? `No results found for "${searchTerm}"` : 'No suppliers in this category.'}
                    </p>
                ) : (
                    codes.map(code => (
                        <button
                            key={code}
                            onClick={() => handleSupplierClick(code)}
                            style={buttonStyle}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {code}
                        </button>
                    ))
                )}
            </div>
        );
    };

    if (isLoading) return <div style={loadingStyle}>Loading Supplier Report...</div>;

    return (
        <div style={reportContainerStyle}>
            <header style={headerContainerStyle}>
                <h1 style={headerStyle}>📊 Supplier Bill Status Dashboard</h1>
            </header>
            
            {/* --- SECTIONS CONTAINER (CUSTOM SPACED) --- */}
            <div style={sectionsContainerStyle}>
                
                {/* --- Printed Section (Left Corner) --- */}
                <div style={printedContainerStyle}>
                    {/* Search bar is moved inside printedSectionStyle for visual integration */}
                    <div style={printedSectionStyle}>
                        <input 
                            type="text"
                            placeholder="🔍 Search Printed Codes..."
                            value={printedSearchTerm}
                            onChange={(e) => setPrintedSearchTerm(e.target.value)}
                            style={{...searchBarStyle, marginBottom: '20px'}}
                        />
                        <h2 style={printedHeaderStyle}>✅ Printed Bills</h2>
                        <SupplierCodeList codes={filteredPrintedCodes} type="printed" searchTerm={printedSearchTerm} />
                    </div>
                </div>

                {/* --- Unprinted Section (Right Corner - Custom Pushed) --- */}
                <div style={unprintedContainerStyle}>
                    {/* Search bar is moved inside unprintedSectionStyle for visual integration */}
                    <div style={unprintedSectionStyle}>
                        <input 
                            type="text"
                            placeholder="🔍 Search Unprinted Codes..."
                            value={unprintedSearchTerm}
                            onChange={(e) => setUnprintedSearchTerm(e.target.value)}
                            style={{...searchBarStyle, marginBottom: '20px'}}
                        />
                        <h2 style={unprintedHeaderStyle}>❌ Unprinted Bills ({filteredUnprintedCodes.length} of {summary.unprinted.length})</h2>
                        <SupplierCodeList codes={filteredUnprintedCodes} type="unprinted" searchTerm={unprintedSearchTerm} />
                    </div>
                </div>

            </div>

            {/* --- Modal Component --- */}
            <SupplierDetailsModal
                isOpen={isModalOpen}
                onClose={closeModal}
                supplierCode={selectedSupplier}
                details={supplierDetails}
                isLoading={isDetailsLoading}
            />
        </div>
    );
};

// --- ENHANCED FULL-PAGE AND CUSTOM-ALIGNED STYLES ---

const reportContainerStyle = {
    minHeight: '100vh', 
    padding: '0 50px 50px 50px', 
    fontFamily: 'Roboto, Arial, sans-serif',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
};

const headerContainerStyle = {
    padding: '40px 0 30px 0',
    borderBottom: '1px solid #E0E0E0',
    marginBottom: '30px',
};

const headerStyle = {
    textAlign: 'left',
    color: '#343a40',
    marginBottom: '5px',
    fontSize: '2.8rem',
    fontWeight: '300',
};

const subHeaderStyle = {
    textAlign: 'left',
    color: '#6c757d',
    fontSize: '1.1rem',
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
    // Moves left container outside of the main report padding
    marginLeft: '-25px', 
};

// Outer container for right section
const unprintedContainerStyle = {
    width: '400px', 
    display: 'flex',
    flexDirection: 'column',
    // Pushes the right section away from the left one (150px gap in the middle)
    marginLeft: '440px', 
};

// Inner, colored/scrolling section
const baseSectionStyle = {
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    // ADJUSTED HEIGHT: Accounts for the search bar moving inside the section
    height: 'calc(100vh - 210px)', 
};

const printedSectionStyle = {
    ...baseSectionStyle,
    backgroundColor: '#F5F9FF',
    borderLeft: '5px solid #1E88E5',
};

const unprintedSectionStyle = {
    ...baseSectionStyle,
    backgroundColor: '#FFF7F5',
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
};

export default SupplierReport;