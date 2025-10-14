import React, { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

export default function CustomerForm({ customer, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    short_name: "",
    name: "",
    ID_NO: "",
    telephone_no: "",
    address: "",
    credit_limit: 0,
  });
  const [showCreditLimit, setShowCreditLimit] = useState(false);
  const [errors, setErrors] = useState({});
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        short_name: customer.short_name || "",
        name: customer.name || "",
        ID_NO: customer.ID_NO || "",
        telephone_no: customer.telephone_no || "",
        address: customer.address || "",
        credit_limit: customer.credit_limit || 0,
      });
    }
  }, [customer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: name === 'short_name' ? value.toUpperCase() : value 
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handlePassword = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setShowCreditLimit(pwd === "nethma123");
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.short_name.trim()) {
      newErrors.short_name = "කෙටි නම අවශ්‍යයි";
    }
    
    if (!formData.name.trim()) {
      newErrors.name = "සම්පූර්ණ නම අවශ්‍යයි";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      alert("කරුණාකර අවශ්‍ය ක්ෂේත්‍ර පුරවන්න");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call the onSubmit prop function
      await onSubmit(formData);
      console.log("Form submitted successfully with data:", formData);
    } catch (error) {
      console.error("Form submission error:", error);
      alert("දෝෂයක් ඇත: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#99ff99", minHeight: "100vh", padding: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ backgroundColor: "#006400", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "800px", border: "2px solid #004d00" }}>
        <h2 className="text-center text-white mb-4">
          {customer ? "පාරිභෝගිකයා සංස්කරණය කරන්න" : "පාරිභෝගිකයා එක් කරන්න"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label text-white">කෙටි නම *</label>
              <input 
                type="text" 
                name="short_name" 
                className={`form-control ${errors.short_name ? 'is-invalid' : ''}`} 
                value={formData.short_name} 
                onChange={handleChange} 
                required 
              />
              {errors.short_name && <div className="invalid-feedback">{errors.short_name}</div>}
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label text-white">සම්පූර්ණ නම *</label>
              <input 
                type="text" 
                name="name" 
                className={`form-control ${errors.name ? 'is-invalid' : ''}`} 
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label text-white">ID_NO</label>
              <input type="text" name="ID_NO" className="form-control" value={formData.ID_NO} onChange={handleChange} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label text-white">දුරකථන අංකය</label>
              <input type="text" name="telephone_no" className="form-control" value={formData.telephone_no} onChange={handleChange} />
            </div>
            <div className="col-12 mb-3">
              <label className="form-label text-white">ලිපිනය</label>
              <input type="text" name="address" className="form-control" value={formData.address} onChange={handleChange} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label text-white">Credit Limit සංස්කරණය සඳහා Password</label>
              <input type="password" className="form-control" value={password} onChange={handlePassword} />
            </div>
            {showCreditLimit && (
              <div className="col-md-6 mb-3">
                <label className="form-label text-white">ණය සීමාව (Rs.)</label>
                <input type="number" step="0.01" name="credit_limit" className="form-control" value={formData.credit_limit} onChange={handleChange} />
              </div>
            )}
          </div>

          <div className="text-center mt-3">
            <button 
              type="submit" 
              className="btn btn-success me-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? "සුරකිමින්..." : (customer ? "යාවත්කාලීන කරන්න" : "එක් කරන්න")}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              අවලංගු කරන්න
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}