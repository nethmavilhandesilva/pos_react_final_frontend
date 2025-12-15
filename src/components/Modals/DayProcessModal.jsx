// src/components/Modals/DayProcessModal.js

import React, { useState, useEffect } from 'react';
// 🚀 CHANGE: Import the custom configured API instance instead of base axios
import api from '../../api'; 
import toast from 'react-hot-toast'; 

// NOTE: You no longer need API_BASE_URL here since 'api' already has it configured.

const DayProcessModal = ({ isOpen, onClose }) => {
    // Initialize date to today's date in 'YYYY-MM-DD' format
    const getTodayDate = () => new Date().toISOString().split('T')[0];
    const [processDate, setProcessDate] = useState(getTodayDate());
    const [isLoading, setIsLoading] = useState(false);

    // Reset date to today whenever the modal opens
    useEffect(() => {
        if (isOpen) {
            setProcessDate(getTodayDate());
        }
    }, [isOpen]);

    const handleProcess = async () => {
        if (!processDate) {
            toast.error("Please select a date to process.");
            return;
        }

        if (!window.confirm(`Are you sure you want to move all sales data for ${processDate} to history? This action cannot be undone.`)) {
            return;
        }

        setIsLoading(true);

        try {
            // 🚀 ACTION: Use the imported 'api' instance.
            // The URL path is relative to the baseURL set in api.js: http://127.0.0.1:8000/api
            const response = await api.post('/sales/process-day', {
                date: processDate,
            });

            // Handle success
            if (response.data.success) {
                // Optional: You might want to reload the page or trigger a global state update
                // to reflect the fact that data has moved from the live sales table.
                
                toast.success(response.data.message || `Day process completed successfully for ${processDate}!`);
                onClose(); // Close the modal on success
            } else {
                toast.error(response.data.message || "An unknown error occurred during day process.");
            }
        } catch (error) {
            // Your api.js interceptor handles 401. We catch other errors here.
            console.error("Day Process Error:", error);
            const errorMessage = error.response?.data?.message || `Failed to process day for ${processDate}. Check console for details.`;
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-sm">
                <div className="modal-content">
                    <div className="modal-header bg-success text-white">
                        <h5 className="modal-title">
                            <i className="material-icons align-middle me-2">event_available</i> Day Process
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        <p className="text-muted">
                            Select the date for which sales data will be **moved** to the history table.
                        </p>
                        <div className="mb-3">
                            <label htmlFor="processDate" className="form-label fw-bold">Select Date:</label>
                            <input
                                type="date"
                                className="form-control"
                                id="processDate"
                                value={processDate}
                                onChange={(e) => setProcessDate(e.target.value)}
                                disabled={isLoading}
                                 // Optionally prevent selecting future dates
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={handleProcess}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <i className="material-icons align-middle me-1">done_all</i> Confirm Process
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DayProcessModal;