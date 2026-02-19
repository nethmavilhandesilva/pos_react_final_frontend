import React, { useState, useEffect } from 'react';
import * as faceapi from "face-api.js";
import { supplierService } from '../../services/supplierService';
import { useNavigate, Link, useParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

// ⭐ UPDATED TO LOCALHOST FOR IMAGES
const STORAGE_URL = "https://goviraju.lk/sms_new_backend_50500/application/public";

const EditSupplier = () => {

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        dob: '', // Added DOB
        address: '',
        profile_pic: null,
        nic_front: null,
        nic_back: null
    });

    const [previews, setPreviews] = useState({
        profile_pic: null,
        nic_front: null,
        nic_back: null
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [supplierLoading, setSupplierLoading] = useState(true);
    const [modelsLoaded, setModelsLoaded] = useState(false);

    const navigate = useNavigate();
    const { id } = useParams();

    /* =====================================================
       LOAD FACE API MODELS
    ===================================================== */
    useEffect(() => {
        const loadModels = async () => {
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
                await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
                setModelsLoaded(true);
                console.log("Face API models loaded");
            } catch (err) {
                console.error("Face model load error:", err);
            }
        };
        loadModels();
    }, []);

    /* =====================================================
       LOAD SUPPLIER DATA
    ===================================================== */
    useEffect(() => {
        loadSupplier();
    }, [id]);

    const loadSupplier = async () => {
        try {
            const response = await supplierService.get(id);
            const supplier = response.data;

            setFormData(prev => ({
                ...prev,
                code: supplier.code || '',
                name: supplier.name || '',
                dob: supplier.dob || '', // Load DOB from backend
                address: supplier.address || ''
            }));

            setPreviews({
                profile_pic: supplier.profile_pic ? STORAGE_URL + supplier.profile_pic : null,
                nic_front: supplier.nic_front ? STORAGE_URL + supplier.nic_front : null,
                nic_back: supplier.nic_back ? STORAGE_URL + supplier.nic_back : null
            });

        } catch (error) {
            console.error('Error loading supplier:', error);
            setErrors({ general: 'Error loading supplier' });
        } finally {
            setSupplierLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'code' ? value.toUpperCase() : value
        }));
    };

    /* =====================================================
       FACE DETECTION
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

    /* =====================================================
       FILE CHANGE WITH FACE CHECK
    ===================================================== */
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        const data = new FormData();
        data.append('code', formData.code);
        data.append('name', formData.name);
        data.append('dob', formData.dob); // Append DOB to submission
        data.append('address', formData.address);
        
        // Laravel specific: If using PUT/PATCH with FormData, you often need to spoof the method
        data.append('_method', 'PUT');

        if (formData.profile_pic instanceof File) data.append('profile_pic', formData.profile_pic);
        if (formData.nic_front instanceof File) data.append('nic_front', formData.nic_front);
        if (formData.nic_back instanceof File) data.append('nic_back', formData.nic_back);

        try {
            await supplierService.update(id, data);
            navigate('/suppliers');
        } catch (error) {
            if (error.response && error.response.status === 422) {
                setErrors(error.response.data.errors || {});
            } else {
                setErrors({ general: 'Error updating supplier' });
            }
        } finally {
            setLoading(false);
        }
    };

    if (supplierLoading) {
        return <div className="text-center mt-5">Loading...</div>;
    }

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
                            ✏️ සැපයුම්කරු සංස්කරණය
                        </h2>

                        {errors.general && (
                            <div className="alert alert-danger">{errors.general}</div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="row">

                                <div className="col-md-6 mb-4">
                                    <label className="form-label">කේතය (Code)</label>
                                    <input type="text" name="code" value={formData.code} onChange={handleChange} className="form-control" required />
                                </div>

                                <div className="col-md-6 mb-4">
                                    <label className="form-label">නම (Name)</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-control" required />
                                </div>

                                {/* ⭐ ADDED DOB INPUT */}
                                <div className="col-md-12 mb-4">
                                    <label className="form-label">උපන් දිනය (Date of Birth)</label>
                                    <input 
                                        type="date" 
                                        name="dob" 
                                        value={formData.dob} 
                                        onChange={handleChange} 
                                        className="form-control" 
                                        required 
                                    />
                                </div>

                                <div className="col-12 mb-4">
                                    <label className="form-label">ලිපිනය (Address)</label>
                                    <textarea name="address" value={formData.address} onChange={handleChange} className="form-control" rows="3" required />
                                </div>

                                {/* PHOTO */}
                                <div className="col-md-4 mb-4">
                                    <label className="form-label">ඡායාරූපය</label>
                                    <input type="file" name="profile_pic" onChange={handleFileChange} className="form-control" accept="image/*" />
                                    {previews.profile_pic && (
                                        <div style={previewBoxStyle}>
                                            <img src={previews.profile_pic} alt="" style={previewImageStyle}/>
                                        </div>
                                    )}
                                </div>

                                {/* NIC FRONT */}
                                <div className="col-md-4 mb-4">
                                    <label className="form-label">NIC Front</label>
                                    <input type="file" name="nic_front" onChange={handleFileChange} className="form-control" accept="image/*" />
                                    {previews.nic_front && (
                                        <div style={previewBoxStyle}>
                                            <img src={previews.nic_front} alt="" style={previewImageStyle}/>
                                        </div>
                                    )}
                                </div>

                                {/* NIC BACK */}
                                <div className="col-md-4 mb-4">
                                    <label className="form-label">NIC Back</label>
                                    <input type="file" name="nic_back" onChange={handleFileChange} className="form-control" accept="image/*" />
                                    {previews.nic_back && (
                                        <div style={previewBoxStyle}>
                                            <img src={previews.nic_back} alt="" style={previewImageStyle}/>
                                        </div>
                                    )}
                                </div>

                            </div>

                            <div className="text-center mt-5 d-flex justify-content-center gap-3">
                                <button type="submit" className="btn btn-light btn-lg fw-bold px-5" disabled={loading} style={{ color: '#004d00' }}>
                                    {loading ? 'Updating...' : 'UPDATE'}
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

export default EditSupplier;