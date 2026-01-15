import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerForm from "./CustomerForm";
import api from "../../api"; // ✅ axios wrapper

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  // Fetch customers from API
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/customers");
        setCustomers(res.data);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      }
    };
    fetchCustomers();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

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
      await api.delete(`/customers/${id}`);
      setCustomers(customers.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete customer:", err);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, data);
        setCustomers(
          customers.map((c) =>
            c.id === editingCustomer.id ? { ...c, ...data } : c
          )
        );
      } else {
        const res = await api.post("/customers", data);
        setCustomers([...customers, res.data]);
      }
      setShowForm(false);
    } catch (err) {
      console.error("Failed to save customer:", err);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#99ff99" }}>
      
      {/* --- VERTICAL SIDEBAR --- */}
      <div
        style={{
          width: "260px",
          backgroundColor: "#004d00",
          color: "white",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          height: "100vh",
          overflowY: "auto",
          boxShadow: "2px 0 5px rgba(0,0,0,0.2)",
          zIndex: 1000
        }}
      >
        <Link className="navbar-brand fw-bold d-flex align-items-center mb-4 text-white text-decoration-none" to="/sales">
          <i className="material-icons me-2">warehouse</i>
          මුල් පිටුව
        </Link>

        <h6 className="text-uppercase text-light opacity-50 small fw-bold mb-3">ප්‍රධාන දත්ත</h6>
        <ul className="list-unstyled flex-grow-1">
          <li className="mb-2">
            <Link to="/customers" className="nav-link text-white d-flex align-items-center p-2 rounded hover-effect" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <i className="material-icons me-2">people</i> ගනුදෙනුකරුවන්
            </Link>
          </li>
          <li className="mb-2">
            <Link to="/items" className="nav-link text-white d-flex align-items-center p-2 rounded">
              <i className="material-icons me-2">inventory_2</i> අයිතමය
            </Link>
          </li>
          <li className="mb-2">
            <Link to="/suppliers" className="nav-link text-white d-flex align-items-center p-2 rounded">
              <i className="material-icons me-2">local_shipping</i>  සැපයුම්කරුවන්
            </Link>
          </li>
          <li className="mb-2">
            <Link to="/commissions" className="nav-link text-white d-flex align-items-center p-2 rounded">
              <i className="material-icons me-2">attach_money</i> කොමිෂන්
            </Link>
          </li>
          <hr className="bg-light" />
        </ul>

        <div className="mt-auto pt-3 border-top border-secondary">
          <button
            onClick={handleLogout}
            className="btn btn-outline-light w-100 fw-bold d-flex align-items-center justify-content-center"
          >
            <i className="material-icons me-2">logout</i>ඉවත් වන්න
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div style={{ marginLeft: "260px", flexGrow: 1, padding: "30px", width: "calc(100vw - 260px)" }}>
        {!showForm && (
          <div
            style={{
              backgroundColor: "#006400",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <h2 className="text-center text-white mb-4">පාරිභෝගික ලැයිස්තුව</h2>
            <div className="text-end mb-3">
              <button className="btn btn-success fw-bold" onClick={handleCreate}>
                + නව පාරිභෝගිකයෙකු එකතු කරන්න
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle bg-white">
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
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center">පාරිභෝගිකයන් නොමැත</td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c.id} style={{ textAlign: "center" }}>
                        <td className="text-uppercase fw-bold">{c.short_name}</td>
                        <td>{c.name}</td>
                        <td>{c.ID_NO}</td>
                        <td>{c.address}</td>
                        <td>{c.telephone_no}</td>
                        <td>Rs. {Number(c.credit_limit).toFixed(2)}</td>
                        <td>
                          <button className="btn btn-warning btn-sm me-1" onClick={() => handleEdit(c)}>
                            යාවත්කාලීන
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>
                            මකන්න
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <div className="card shadow-lg">
            <div className="card-body">
              <CustomerForm
                customer={editingCustomer}
                onSubmit={handleFormSubmit}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}