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

  const [previews, setPreviews] = useState({
    profile_pic: null,
    nic_front: null,
    nic_back: null
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const navigate = useNavigate();

  /* =====================================================
     LOAD FACE API MODELS FROM public/models
  ===================================================== */
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        setModelsLoaded(true);
        console.log("Face API models loaded");
      } catch (err) {
        console.error("Model loading error:", err);
      }
    };
    loadModels();
  }, []);

  /* =====================================================
     FACE DETECTION FUNCTION
  ===================================================== */
  const detectFace = async (file) => {
    if (!modelsLoaded) return true;

    const img = await faceapi.bufferToImage(file);

    const detection = await faceapi.detectSingleFace(
      img,
      new faceapi.TinyFaceDetectorOptions()
    );

    return !!detection;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: name === 'code' ? value.toUpperCase() : value
    }));
  };

  /* =====================================================
     FILE CHANGE
     ✔ Face detection only for profile_pic
  ===================================================== */
  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    if (!files || !files[0]) return;

    const file = files[0];

    // ⭐ FACE CHECK ONLY FOR PROFILE PHOTO
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

  const handleSubmit = async (e) => {
    e.preventDefault();

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

  /* =====================================================
     PREVIEW STYLE
  ===================================================== */
  const previewBoxStyle = {
    width: "120px",
    height: "120px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    overflow: "hidden",
    marginTop: "8px"
  };

  const previewImageStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  };

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

                <div className="col-md-6 mb-4">
                  <label className="form-label fs-5 text-light">කේතය (Code)</label>
                  <input type="text" name="code" value={formData.code} onChange={handleChange} className="form-control form-control-lg" required/>
                </div>

                <div className="col-md-6 mb-4">
                  <label className="form-label fs-5 text-light">නම (Name)</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-control form-control-lg" required/>
                </div>

                <div className="col-12 mb-4">
                  <label className="form-label fs-5 text-light">ලිපිනය (Address)</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} className="form-control form-control-lg" rows="3" required/>
                </div>

                {/* PHOTO */}
                <div className="col-md-4 mb-4">
                  <label className="form-label text-light">ඡායාරූපය (Photo)</label>
                  <input type="file" name="profile_pic" onChange={handleFileChange} className="form-control" accept="image/*" />
                  {previews.profile_pic && (
                    <div style={previewBoxStyle}>
                      <img src={previews.profile_pic} alt="preview" style={previewImageStyle}/>
                    </div>
                  )}
                </div>

                {/* NIC FRONT */}
                <div className="col-md-4 mb-4">
                  <label className="form-label text-light">NIC (Front)</label>
                  <input type="file" name="nic_front" onChange={handleFileChange} className="form-control" accept="image/*"/>
                  {previews.nic_front && (
                    <div style={previewBoxStyle}>
                      <img src={previews.nic_front} alt="preview" style={previewImageStyle}/>
                    </div>
                  )}
                </div>

                {/* NIC BACK */}
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