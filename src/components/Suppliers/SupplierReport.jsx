// src/components/SupplierReport.jsx

import React, { useState, useEffect } from 'react';
import api from "../../api";
import SupplierDetailsModal from './SupplierDetailsModal';

const SupplierReport = () => {
    const [summary, setSummary] = useState({ printed: [], unprinted: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierDetails, setSupplierDetails] = useState([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // --- Fetch Summary Data ---
    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const response = await api.get('/suppliers/bill-status-summary');
                setSummary(response.data);
            } catch (error) {
                console.error('Error fetching summary data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, []);

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

    // Helper component with enhanced styling for supplier codes
    const SupplierCodeList = ({ codes, type }) => {
        // Define button styles based on whether it's Printed or Unprinted
        const buttonBaseStyle = {
            padding: '10px 15px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            border: 'none',
            transition: 'background-color 0.2s, transform 0.1s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontSize: '0.95rem',
        };

        const printedButtonStyle = {
            ...buttonBaseStyle,
            backgroundColor: '#28a745', // Green for Printed
            color: 'white',
        };

        const unprintedButtonStyle = {
            ...buttonBaseStyle,
            backgroundColor: '#dc3545', // Red for Unprinted
            color: 'white',
        };
        
        const buttonStyle = type === 'printed' ? printedButtonStyle : unprintedButtonStyle;

        return (
            <div style={listContainerStyle}>
                {codes.length === 0 ? (
                    <p style={{ color: '#6c757d' }}>No suppliers in this category.</p>
                ) : (
                    codes.map(code => (
                        <button
                            key={code}
                            onClick={() => handleSupplierClick(code)}
                            style={buttonStyle}
                            // Add simple hover effect via JavaScript/React
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
            <h1 style={headerStyle}>📊 Supplier Bill Status Report</h1>
            <p style={subHeaderStyle}>Click on a supplier code to view detailed records.</p>
            <hr style={hrStyle} />

            <div style={sectionsContainerStyle}>
                
                {/* --- Printed Section --- */}
                <div style={printedSectionStyle}>
                    <h2 style={printedHeaderStyle}>✅ Printed Bills</h2>
                    <SupplierCodeList codes={summary.printed} type="printed" />
                </div>

                {/* --- Unprinted Section --- */}
                <div style={unprintedSectionStyle}>
                    <h2 style={unprintedHeaderStyle}>❌ Unprinted Bills</h2>
                    <SupplierCodeList codes={summary.unprinted} type="unprinted" />
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

// --- ENHANCED STYLES ---

const reportContainerStyle = {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Roboto, Arial, sans-serif',
    backgroundColor: '#f8f9fa', // Light background
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
};

const headerStyle = {
    textAlign: 'center',
    color: '#343a40',
    marginBottom: '5px',
    fontSize: '2.5rem',
    fontWeight: '300',
};

const subHeaderStyle = {
    textAlign: 'center',
    color: '#6c757d',
    marginBottom: '20px',
};

const hrStyle = {
    border: '0',
    height: '1px',
    backgroundColor: '#dee2e6',
    margin: '20px 0 30px 0',
};

const sectionsContainerStyle = {
    display: 'grid', // Use Grid for responsive dual columns
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
};

const baseSectionStyle = {
    padding: '25px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
};

const printedSectionStyle = {
    ...baseSectionStyle,
    backgroundColor: '#e6ffed', // Very light green background
    borderLeft: '5px solid #28a745',
};

const unprintedSectionStyle = {
    ...baseSectionStyle,
    backgroundColor: '#ffebe6', // Very light red background
    borderLeft: '5px solid #dc3545',
};

const printedHeaderStyle = {
    color: '#28a745',
    marginBottom: '15px',
    borderBottom: '2px solid #28a74530',
    paddingBottom: '10px',
};

const unprintedHeaderStyle = {
    color: '#dc3545',
    marginBottom: '15px',
    borderBottom: '2px solid #dc354530',
    paddingBottom: '10px',
};

const listContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '15px',
    maxHeight: '400px', // Limit height
    overflowY: 'auto', // Add scrollbar if needed
    padding: '5px',
};

const loadingStyle = {
    textAlign: 'center',
    padding: '50px',
    fontSize: '1.2rem',
    color: '#007bff',
};

export default SupplierReport;