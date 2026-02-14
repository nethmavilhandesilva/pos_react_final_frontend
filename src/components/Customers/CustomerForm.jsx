import React, { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from "axios";

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

  const [previews, setPreviews] = useState({
    profile_pic: null,
    nic_front: null,
    nic_back: null
  });

  const [showCreditLimit, setShowCreditLimit] = useState(false);
  const [errors, setErrors] = useState({});
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const STORAGE_URL = "https://talentconnect.lk/sms_new_backend/application/public";

  // ================= Load existing customer data =================
  useEffect(() => {
    if (customer) {
      setFormData({
        short_name: customer.short_name || "",
        name: customer.name || "",
        ID_NO: customer.ID_NO || "",
        telephone_no: customer.telephone_no || "",
        address: customer.address || "",
        credit_limit: customer.credit_limit || 0,
        profile_pic: null,
        nic_front: null,
        nic_back: null,
      });

      setPreviews({
        profile_pic: customer.profile_pic ? `${STORAGE_URL}${customer.profile_pic}` : null,
        nic_front: customer.nic_front ? `${STORAGE_URL}${customer.nic_front}` : null,
        nic_back: customer.nic_back ? `${STORAGE_URL}${customer.nic_back}` : null,
      });
    }
  }, [customer]);

  // ================= Handle Input Change =================
  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (name === "short_name") {
      const upperValue = value.toUpperCase();
      setFormData(prev => ({ ...prev, short_name: upperValue }));

      // Backend validation for duplicates
      try {
        if (upperValue.trim()) {
          const response = await axios.get(`https://talentconnect.lk/sms_new_backend/api/customers/check-short-name/${upperValue}`);
          // API should return { exists: true } if duplicate exists
          const isDuplicate = response.data.exists && upperValue !== (customer?.short_name || "");
          setErrors(prev => ({
            ...prev,
            short_name: isDuplicate ? "මෙම කෙටි නම දැනටමත් පවතිනවා" : null
          }));
        }
      } catch (error) {
        console.error("Short name validation error:", error);
      }

    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // ================= Handle File Change =================
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (!files || !files[0]) return;

    const file = files[0];
    setFormData(prev => ({ ...prev, [name]: file }));

    const newPreview = URL.createObjectURL(file);
    setPreviews(prev => ({ ...prev, [name]: newPreview }));
  };

  // ================= Handle Password =================
  const handlePassword = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setShowCreditLimit(pwd === "nethma123");
  };

  // ================= Handle Form Submit =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.short_name.trim() || !formData.name.trim()) {
      alert("කරුණාකර අවශ්‍ය ක්ෂේත්‍ර පුරවන්න");
      return;
    }

    if (errors.short_name) {
      alert("මෙම කෙටි නම දැනටමත් පවතිනවා. වෙනත් නමක් තෝරන්න.");
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

    if (formData.profile_pic) data.append("profile_pic", formData.profile_pic);
    if (formData.nic_front) data.append("nic_front", formData.nic_front);
    if (formData.nic_back) data.append("nic_back", formData.nic_back);
    if (formData.telephone_no) data.append("telephone_no", formData.telephone_no);

    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#99ff99", padding: "20px", display: "flex", justifyContent: "center" }}>
      <div style={{ backgroundColor: "#006400", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "850px" }}>
        <h2 className="text-center text-white mb-4">
          {customer ? "පාරිභෝගිකයා සංස්කරණය කරන්න" : "පාරිභෝගිකයා එක් කරන්න"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="row">

            {/* Short Name */}
            <div className="col-md-6 mb-3">
              <label className="form-label text-white">කෙටි නම *</label>
              <input
                type="text"
                name="short_name"
                className={`form-control ${errors.short_name ? 'is-invalid' : ''}`}
                value={formData.short_name}
                onChange={handleChange}
              />
              {errors.short_name && <div className="invalid-feedback">{errors.short_name}</div>}
            </div>

            {/* Full Name */}
            <div className="col-md-6 mb-3">
              <label className="form-label text-white">සම්පූර්ණ නම *</label>
              <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange}/>
            </div>

            {/* File uploads */}
            {["profile_pic","nic_front","nic_back"].map((field) => (
              <div key={field} className="col-md-4 mb-3">
                <label className="form-label text-white small">{field.replace('_',' ').toUpperCase()}</label>
                <input type="file" name={field} className="form-control form-control-sm" onChange={handleFileChange} accept="image/*"/>
                {previews[field] && <img src={previews[field]} alt="Preview" className="img-thumbnail mt-2" style={{ height:'60px' }}/>}
              </div>
            ))}

            {/* Password to unlock credit limit */}
            <div className="col-md-6 mb-3">
              <label className="form-label text-white">Password (Unlock Credit Limit)</label>
              <input type="password" className="form-control" value={password} onChange={handlePassword}/>
            </div>

            {/* Credit Limit */}
            {showCreditLimit && (
              <div className="col-md-6 mb-3">
                <label className="form-label text-white">ණය සීමාව (Rs.)</label>
                <input type="number" name="credit_limit" className="form-control" value={formData.credit_limit} onChange={handleChange}/>
              </div>
            )}

          </div>

          {/* Buttons */}
          <div className="text-center mt-3">
            <button type="submit" className="btn btn-success me-2" disabled={isSubmitting}>
              {isSubmitting ? "සුරකිමින්..." : (customer ? "යාවත්කාලීන කරන්න" : "එක් කරන්න")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>අවලංගු කරන්න</button>
          </div>
        </form>
      </div>
    </div>
  );
}