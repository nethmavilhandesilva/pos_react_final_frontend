import React, { useState, useEffect } from 'react';
import * as faceapi from "face-api.js";
import { supplierService } from '../../services/supplierService';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

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
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const navigate = useNavigate();

  // =================== Load Face API Models ===================
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        setModelsLoaded(true);
      } catch (err) {
        console.error("Model loading error:", err);
      }
    };
    loadModels();
  }, []);

  // =================== Face Detection ===================
  const detectFace = async (file) => {
    if (!modelsLoaded) return true;
    const img = await faceapi.bufferToImage(file);
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions());
    return !!detection;
  };

  // =================== Check Duplicate Code ===================
  const checkDuplicateCode = async (code) => {
    try {
      const response = await supplierService.checkCode(code);
      return response.data.exists; // backend should return { exists: true/false }
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // =================== Handle Input Change ===================
  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (name === 'code') {
      const upperCode = value.toUpperCase();
      setFormData(prev => ({ ...prev, code: upperCode }));

      if (upperCode.length > 0) {
        const isDuplicate = await checkDuplicateCode(upperCode);
        setErrors(prev => ({ ...prev, code: isDuplicate ? 'මෙම කේතය දැනටමත් පවතිනවා' : null }));
      } else {
        setErrors(prev => ({ ...prev, code: null }));
      }

    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // =================== Handle File Change ===================
  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    if (!files || !files[0]) return;

    const file = files[0];

    if (name === "profile_pic") {
      const hasFace = await detectFace(file);
      if (!hasFace) {
        alert("මුහුණක් හමු නොවීය. කරුණාකර නිවැරදි ඡායාරූපයක් තෝරන්න.");
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: file }));
    const previewURL = URL.createObjectURL(file);

    setPreviews(prev => {
      if (prev[name] && prev[name].startsWith("blob:")) {
        URL.revokeObjectURL(prev[name]);
      }
      return { ...prev, [name]: previewURL };
    });
  };

  // =================== Handle Submit ===================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (errors.code) {
      alert("මෙම කේතය දැනටමත් පවතිනවා. වෙනත් කේතයක් තෝරන්න.");
      return;
    }

    setLoading(true);
    setErrors({});
    
    const data = new FormData();
    data.append('code', formData.code);
    data.append('name', formData.name);
    data.append('address', formData.address);
    if (formData.profile_pic) data.append('profile_pic', formData.profile_pic);
    if (formData.nic_front) data.append('nic_front', formData.nic_front);
    if (formData.nic_back) data.append('nic_back', formData.nic_back);

    try {
      await supplierService.create(data);
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

  // =================== Preview Styles ===================
  const previewBoxStyle = { width: "120px", height: "120px", border: "1px solid #ccc", borderRadius: "8px", overflow: "hidden", marginTop: "8px" };
  const previewImageStyle = { width: "100%", height: "100%", objectFit: "cover" };

  return (
    <div style={{ backgroundColor: '#99ff99', minHeight: '100vh', width: '100%' }}>
      <Sidebar />
      <div style={{ marginLeft: '260px', padding: '60px 40px' }}>
        <div className="col-12">
          <div className="p-5 rounded-4 shadow-lg text-light" style={{ backgroundColor: '#004d00' }}>
            <h2 className="text-center mb-5 fw-bold" style={{ fontSize: '2.5rem' }}>
              + නව සැපයුම්කරු
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="row">

                {/* Code */}
                <div className="col-md-6 mb-4">
                  <label className="form-label fs-5 text-light">කේතය (Code)</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className={`form-control form-control-lg ${errors.code ? 'is-invalid' : ''}`}
                    required
                  />
                  {errors.code && <div className="invalid-feedback">{errors.code}</div>}
                </div>

                {/* Name */}
                <div className="col-md-6 mb-4">
                  <label className="form-label fs-5 text-light">නම (Name)</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-control form-control-lg" required/>
                </div>

                {/* Address */}
                <div className="col-12 mb-4">
                  <label className="form-label fs-5 text-light">ලිපිනය (Address)</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} className="form-control form-control-lg" rows="3" required/>
                </div>

                {/* Profile Pic */}
                <div className="col-md-4 mb-4">
                  <label className="form-label text-light">ඡායාරූපය (Photo)</label>
                  <input type="file" name="profile_pic" onChange={handleFileChange} className="form-control" accept="image/*" />
                  {previews.profile_pic && (
                    <div style={previewBoxStyle}>
                      <img src={previews.profile_pic} alt="preview" style={previewImageStyle}/>
                    </div>
                  )}
                </div>

                {/* NIC Front */}
                <div className="col-md-4 mb-4">
                  <label className="form-label text-light">NIC (Front)</label>
                  <input type="file" name="nic_front" onChange={handleFileChange} className="form-control" accept="image/*"/>
                  {previews.nic_front && (
                    <div style={previewBoxStyle}>
                      <img src={previews.nic_front} alt="preview" style={previewImageStyle}/>
                    </div>
                  )}
                </div>

                {/* NIC Back */}
                <div className="col-md-4 mb-4">
                  <label className="form-label text-light">NIC (Back)</label>
                  <input type="file" name="nic_back" onChange={handleFileChange} className="form-control" accept="image/*"/>
                  {previews.nic_back && (
                    <div style={previewBoxStyle}>
                      <img src={previews.nic_back} alt="preview" style={previewImageStyle}/>
                    </div>
                  )}
                </div>

              </div>

              <div className="text-center mt-5 d-flex justify-content-center gap-3">
                <button type="submit" className="btn btn-light btn-lg fw-bold px-5" disabled={loading} style={{ color: '#004d00' }}>
                  {loading ? 'Adding...' : 'ADD'}
                </button>
                <Link to="/suppliers" className="btn btn-outline-light btn-lg px-5">
                  CANCEL
                </Link>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSupplier;