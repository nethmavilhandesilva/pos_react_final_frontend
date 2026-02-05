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
    profile_pic: null,
    nic_front: null,
    nic_back: null,
  });

  const [previews, setPreviews] = useState({ profile_pic: null, nic_front: null, nic_back: null });
  const [showCreditLimit, setShowCreditLimit] = useState(false);
  const [errors, setErrors] = useState({});
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Laravel Storage Base URL
  const STORAGE_URL = "http://127.0.0.1:8000/storage/";

  useEffect(() => {
    if (customer) {
      setFormData({
        short_name: customer.short_name || "",
        name: customer.name || "",
        ID_NO: customer.ID_NO || "",
        telephone_no: customer.telephone_no || "",
        address: customer.address || "",
        credit_limit: customer.credit_limit || 0,
        profile_pic: null, // Keep as null unless user selects a NEW file
        nic_front: null,
        nic_back: null,
      });

      // ✅ Set previews to the existing images from the server
      setPreviews({
        profile_pic: customer.profile_pic ? `${STORAGE_URL}${customer.profile_pic}` : null,
        nic_front: customer.nic_front ? `${STORAGE_URL}${customer.nic_front}` : null,
        nic_back: customer.nic_back ? `${STORAGE_URL}${customer.nic_back}` : null,
      });
    } else {
      // Clear form if it's a "New" customer action
      setFormData({
        short_name: "", name: "", ID_NO: "", telephone_no: "", address: "", credit_limit: 0,
        profile_pic: null, nic_front: null, nic_back: null
      });
      setPreviews({ profile_pic: null, nic_front: null, nic_back: null });
    }
  }, [customer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: name === 'short_name' ? value.toUpperCase() : value 
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      // Generate a local preview for the NEWLY selected file
      setPreviews(prev => ({ ...prev, [name]: URL.createObjectURL(files[0]) }));
    }
  };

  const handlePassword = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setShowCreditLimit(pwd === "nethma123");
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.short_name.trim()) newErrors.short_name = "කෙටි නම අවශ්‍යයි";
    if (!formData.name.trim()) newErrors.name = "සම්පූර්ණ නම අවශ්‍යයි";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      alert("කරුණාකර අවශ්‍ය ක්ෂේත්‍ර පුරවන්න");
      return;
    }
    
    setIsSubmitting(true);
    
    const data = new FormData();
    data.append("short_name", formData.short_name);
    data.append("name", formData.name);
    data.append("ID_NO", formData.ID_NO);
    data.append("telephone_no", formData.telephone_no);
    data.append("address", formData.address);
    data.append("credit_limit", formData.credit_limit);

    // Append files ONLY if a new file was selected (if they are not null)
    if (formData.profile_pic) data.append("profile_pic", formData.profile_pic);
    if (formData.nic_front) data.append("nic_front", formData.nic_front);
    if (formData.nic_back) data.append("nic_back", formData.nic_back);

    if (customer) {
      data.append("_method", "PUT");
    }

    try {
      await onSubmit(data); 
    } catch (error) {
      console.error("Submission error:", error);
      alert("දෝෂයක් ඇත");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#99ff99", minHeight: "100vh", padding: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ backgroundColor: "#006400", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "850px", border: "2px solid #004d00" }}>
        <h2 className="text-center text-white mb-4">
          {customer ? "පාරිභෝගිකයා සංස්කරණය කරන්න" : "පාරිභෝගිකයා එක් කරන්න"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label text-white">කෙටි නම *</label>
              <input type="text" name="short_name" className={`form-control ${errors.short_name ? 'is-invalid' : ''}`} value={formData.short_name} onChange={handleChange} required />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label text-white">සම්පූර්ණ නම *</label>
              <input type="text" name="name" className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={formData.name} onChange={handleChange} required />
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

            {/* --- Image Section --- */}
            <div className="col-md-4 mb-3">
              <label className="form-label text-white small">ඡායාරූපය</label>
              <input type="file" name="profile_pic" className="form-control form-control-sm" onChange={handleFileChange} accept="image/*" />
              {previews.profile_pic && (
                <div className="mt-2 text-center">
                  <img src={previews.profile_pic} alt="Preview" className="img-thumbnail" style={{ height: '80px', width: '80px', objectFit: 'cover' }} />
                  <p className="text-white small m-0">{formData.profile_pic ? "නව ගොනුව" : "පවතින ගොනුව"}</p>
                </div>
              )}
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label text-white small">NIC ඉදිරිපස</label>
              <input type="file" name="nic_front" className="form-control form-control-sm" onChange={handleFileChange} accept="image/*" />
              {previews.nic_front && (
                <div className="mt-2 text-center">
                  <img src={previews.nic_front} alt="Preview" className="img-thumbnail" style={{ height: '80px', width: '80px', objectFit: 'cover' }} />
                  <p className="text-white small m-0">{formData.nic_front ? "නව ගොනුව" : "පවතින ගොනුව"}</p>
                </div>
              )}
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label text-white small">NIC පසුපස</label>
              <input type="file" name="nic_back" className="form-control form-control-sm" onChange={handleFileChange} accept="image/*" />
              {previews.nic_back && (
                <div className="mt-2 text-center">
                  <img src={previews.nic_back} alt="Preview" className="img-thumbnail" style={{ height: '80px', width: '80px', objectFit: 'cover' }} />
                  <p className="text-white small m-0">{formData.nic_back ? "නව ගොනුව" : "පවතින ගොනුව"}</p>
                </div>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label text-white">Password</label>
              <input type="password" placeholder="සංස්කරණය සඳහා" className="form-control" value={password} onChange={handlePassword} />
            </div>
            {showCreditLimit && (
              <div className="col-md-6 mb-3">
                <label className="form-label text-white">ණය සීමාව (Rs.)</label>
                <input type="number" step="0.01" name="credit_limit" className="form-control" value={formData.credit_limit} onChange={handleChange} />
              </div>
            )}
          </div>

          <div className="text-center mt-3">
            <button type="submit" className="btn btn-success me-2" disabled={isSubmitting}>
              {isSubmitting ? "සුරකිමින්..." : (customer ? "යාවත්කාලීන කරන්න" : "එක් කරන්න")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>අවලංගු කරන්න</button>
          </div>
        </form>
      </div>
    </div>
  );
}