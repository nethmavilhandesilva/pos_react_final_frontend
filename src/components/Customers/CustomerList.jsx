import React, { useState, useEffect } from "react";
import CustomerForm from "./CustomerForm";
import api from "../../api";   // ✅ use axios wrapper

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Fetch customers from API
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/customers");   // ✅ axios call
        setCustomers(res.data);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      }
    };

    fetchCustomers();
  }, []);

  const handleCreate = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("මෙම පාරිභෝගිකයා මකන්නද?")) return;

    try {
      await api.delete(`/customers/${id}`);  // ✅ axios DELETE
      setCustomers(customers.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete customer:", err);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingCustomer) {
        // Update customer
        await api.put(`/customers/${editingCustomer.id}`, data);  // ✅ axios PUT

        setCustomers(
          customers.map((c) =>
            c.id === editingCustomer.id ? { ...c, ...data } : c
          )
        );
      } else {
        // Create new customer
        const res = await api.post("/customers", data);  // ✅ axios POST
        setCustomers([...customers, res.data]);
      }

      setShowForm(false);
    } catch (err) {
      console.error("Failed to save customer:", err);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#99ff99",
        minHeight: "100vh",
        padding: "20px",
        margin: 0,
        width: "100vw",
        boxSizing: "border-box",
      }}
    >
      {!showForm && (
        <div
          style={{
            backgroundColor: "#006400",
            borderRadius: "12px",
            padding: "24px",
            width: "100%",
            margin: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <h2 className="text-center text-white mb-4">පාරිභෝගික ලැයිස්තුව</h2>
          <div className="text-end mb-3">
            <button className="btn btn-success" onClick={handleCreate}>
              + නව පාරිභෝගිකයෙකු එකතු කරන්න
            </button>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle">
              <thead>
                <tr style={{ backgroundColor: "#e6f0ff", color: "#003366", textAlign: "center" }}>
                  <th>කෙටි නම</th>
                  <th>සම්පූර්ණ නම</th>
                  <th>ID_NO</th>
                  <th>ලිපිනය</th>
                  <th>දුරකථන අංකය</th>
                  <th>ණය සීමාව (Rs.)</th>
                  <th>මෙහෙයුම්</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-white">
                      පාරිභෝගිකයන් නොමැත
                    </td>
                  </tr>
                )}
                {customers.map((c) => (
                  <tr key={c.id} style={{ textAlign: "center", backgroundColor: "white" }}>
                    <td style={{ textTransform: "uppercase" }}>{c.short_name}</td>
                    <td>{c.name}</td>
                    <td>{c.ID_NO}</td>
                    <td>{c.address}</td>
                    <td>{c.telephone_no}</td>
                    <td>Rs. {Number(c.credit_limit).toFixed(2)}</td>
                    <td>
                      <button className="btn btn-warning btn-sm" onClick={() => handleEdit(c)}>
                        යාවත්කාලීන
                      </button>
                      <button className="btn btn-danger btn-sm ms-1" onClick={() => handleDelete(c.id)}>
                        මකන්න
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
