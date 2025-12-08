import React, { useState, useEffect } from "react";
import api from "../../api"; // your api.js

export default function SupplierProfitReport() {
    const [profitReport, setProfitReport] = useState([]);
    const [filteredProfitReport, setFilteredProfitReport] = useState([]);
    const [profitSearchTerm, setProfitSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Navigate back to the supplier report page
    const closeProfitReport = () => {
        window.location.href = "/supplierreport";
    };

    // Fetch aggregated profit from backend
    useEffect(() => {
        const fetchProfitReport = async () => {
            try {
                setIsLoading(true);
                const response = await api.get("/sales/profit-by-supplier");
                const data = response.data || [];

                // Ensure all supplier_code and total_profit fields exist
                const sanitized = data.map(item => ({
                    supplier_code: item.supplier_code || "UNKNOWN",
                    total_profit: Number(item.total_profit ?? 0)
                }));

                setProfitReport(sanitized);
                setFilteredProfitReport(sanitized);
            } catch (err) {
                console.error("Error fetching profit report:", err);
                setProfitReport([]);
                setFilteredProfitReport([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfitReport();
    }, []);

    // Search filter
    useEffect(() => {
        const filtered = profitReport.filter(item =>
            item.supplier_code.toLowerCase().includes(profitSearchTerm.toLowerCase())
        );
        setFilteredProfitReport(filtered);
    }, [profitSearchTerm, profitReport]);

    // Styles
    const tableHeaderStyle = { background: "#004d00", color: "#fff", padding: "10px", textAlign: "left" };

    return (
        <div style={{ padding: "30px" }}>
            <h2 style={{ fontSize: "26px", fontWeight: "700", marginBottom: "12px" }}>
                📈 Total Profit by Supplier
            </h2>

            <button
                onClick={closeProfitReport}
                style={{
                    padding: "8px 14px",
                    background: "#f8f9fa",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    cursor: "pointer",
                    marginBottom: "18px"
                }}
            >
                ← Back to Bill Status Summary
            </button>

            <input
                type="text"
                placeholder="🔍 Search by Supplier Code..."
                value={profitSearchTerm}
                onChange={(e) => setProfitSearchTerm(e.target.value)}
                style={{ padding: "8px 10px", width: "400px", border: "1px solid #ccc", borderRadius: "6px", marginBottom: "18px" }}
            />

            {isLoading ? (
                <p>Loading Profit Data...</p>
            ) : filteredProfitReport.length === 0 ? (
                <p style={{ color: "#6c757d" }}>No profit data available.</p>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={tableHeaderStyle}>Supplier Code</th>
                            <th style={tableHeaderStyle}>Total Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProfitReport.map((item, index) => (
                            <tr key={index} style={{ background: index % 2 === 0 ? "#fff" : "#f7f7f7" }}>
                                <td style={{ padding: "10px", borderBottom: "1px solid #eee" }}>
                                    {item.supplier_code}
                                </td>
                                <td style={{ padding: "10px", borderBottom: "1px solid #eee" }}>
                                    Rs. {item.total_profit.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
