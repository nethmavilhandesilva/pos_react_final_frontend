import React, { useState } from 'react';
import { supplierService } from '../../services/supplierService';
import { useNavigate, Link, useLocation } from 'react-router-dom';

// --- Sidebar Component (Keep as is) ---
const Sidebar = () => { /* ... (Your existing Sidebar code) ... */ };

const CreateSupplier = () => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    profile_pic: null,
    nic_front: null,
    nic_back: null,
  });

  const [previews, setPreviews] = useState({ profile_pic: null, nic_front: null, nic_back: null });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'code' ? value.toUpperCase() : value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      setPreviews(prev => ({ ...prev, [name]: URL.createObjectURL(files[0]) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Convert to FormData for File Upload
    const data = new FormData();
    data.append('code', formData.code);
    data.append('name', formData.name);
    data.append('address', formData.address);
    if (formData.profile_pic) data.append('profile_pic', formData.profile_pic);
    if (formData.nic_front) data.append('nic_front', formData.nic_front);
    if (formData.nic_back) data.append('nic_back', formData.nic_back);

    try {
      await supplierService.create(data); // Ensure supplierService handles FormData
      navigate('/suppliers');
    } catch (error) {
      if (error.response && error.response.status === 422) {
        setErrors(error.response.data.errors || {});
      } else {
        setErrors({ general: 'Error creating supplier' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#99ff99', minHeight: '100vh', width: '100%' }}>
      <Sidebar />
      <div style={{ marginLeft: '260px', padding: '60px 40px' }}>
        <div className="col-12">
          <div className="p-5 rounded-4 shadow-lg text-light" style={{ backgroundColor: '#004d00' }}>
            <h2 className="text-center mb-5 fw-bold" style={{ fontSize: '2.5rem' }}>+ නව සැපයුම්කරු</h2>

            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-4">
                  <label className="form-label fs-5 text-light">කේතය (Code)</label>
                  <input type="text" name="code" value={formData.code} onChange={handleChange} className="form-control form-control-lg" required />
                </div>
                <div className="col-md-6 mb-4">
                  <label className="form-label fs-5 text-light">නම (Name)</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-control form-control-lg" required />
                </div>
                <div className="col-12 mb-4">
                  <label className="form-label fs-5 text-light">ලිපිනය (Address)</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} className="form-control form-control-lg" rows="3" required />
                </div>

                {/* --- Image Upload Fields --- */}
                <div className="col-md-4 mb-4">
                  <label className="form-label text-light">ඡායාරූපය (Photo)</label>
                  <input type="file" name="profile_pic" onChange={handleFileChange} className="form-control" accept="image/*" />
                  {previews.profile_pic && <img src={previews.profile_pic} alt="preview" className="img-thumbnail mt-2" style={{height: '80px'}} />}
                </div>
                <div className="col-md-4 mb-4">
                  <label className="form-label text-light">NIC (Front)</label>
                  <input type="file" name="nic_front" onChange={handleFileChange} className="form-control" accept="image/*" />
                  {previews.nic_front && <img src={previews.nic_front} alt="preview" className="img-thumbnail mt-2" style={{height: '80px'}} />}
                </div>
                <div className="col-md-4 mb-4">
                  <label className="form-label text-light">NIC (Back)</label>
                  <input type="file" name="nic_back" onChange={handleFileChange} className="form-control" accept="image/*" />
                  {previews.nic_back && <img src={previews.nic_back} alt="preview" className="img-thumbnail mt-2" style={{height: '80px'}} />}
                </div>
              </div>

              <div className="text-center mt-5 d-flex justify-content-center gap-3">
                <button type="submit" className="btn btn-light btn-lg fw-bold px-5" disabled={loading} style={{ color: '#004d00' }}>
                  {loading ? 'Adding...' : 'ADD'}
                </button>
                <Link to="/suppliers" className="btn btn-outline-light btn-lg px-5">CANCEL</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSupplier;