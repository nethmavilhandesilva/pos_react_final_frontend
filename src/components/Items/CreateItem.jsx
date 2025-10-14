import React, { useState } from 'react';
import { itemService } from '../../services/itemService';
import { useNavigate, Link } from 'react-router-dom';

const CreateItem = () => {
    const [formData, setFormData] = useState({
        no: '',
        type: '',
        pack_cost: '',
        pack_due: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'no' ? value.toUpperCase() : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            await itemService.create(formData);
            navigate('/items');
        } catch (error) {
            if (error.response && error.response.status === 422) {
                setErrors(error.response.data.errors || {});
            } else {
                setErrors({ general: 'Error creating item' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="custom-card">
                        <h2 className="text-primary mb-4">නව භාණ්ඩය එක් කරන්න (Add New Item)</h2>

                        {errors.general && (
                            <div className="alert alert-danger">{errors.general}</div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="no" className="form-label">අංකය</label>
                                <input 
                                    type="text" 
                                    id="no" 
                                    name="no" 
                                    value={formData.no}
                                    onChange={handleChange}
                                    className={`form-control ${errors.no ? 'is-invalid' : ''}`}
                                    required 
                                    style={{ textTransform: 'uppercase' }}
                                />
                                {errors.no && <div className="invalid-feedback">{errors.no[0]}</div>}
                            </div>

                            <div className="mb-3">
                                <label htmlFor="type" className="form-label">වර්ගය</label>
                                <input 
                                    type="text" 
                                    id="type" 
                                    name="type" 
                                    value={formData.type}
                                    onChange={handleChange}
                                    className={`form-control ${errors.type ? 'is-invalid' : ''}`}
                                    required 
                                />
                                {errors.type && <div className="invalid-feedback">{errors.type[0]}</div>}
                            </div>

                            <div className="mb-3">
                                <label htmlFor="pack_cost" className="form-label">මල්ලක අගය</label>
                                <input 
                                    type="number" 
                                    id="pack_cost" 
                                    name="pack_cost" 
                                    value={formData.pack_cost}
                                    onChange={handleChange}
                                    step="0.01" 
                                    className={`form-control ${errors.pack_cost ? 'is-invalid' : ''}`}
                                    required 
                                />
                                {errors.pack_cost && <div className="invalid-feedback">{errors.pack_cost[0]}</div>}
                            </div>

                            <div className="mb-3">
                                <label htmlFor="pack_due" className="form-label">මල්ලක කුලිය</label>
                                <input 
                                    type="number" 
                                    id="pack_due" 
                                    name="pack_due" 
                                    value={formData.pack_due}
                                    onChange={handleChange}
                                    step="0.01" 
                                    className={`form-control ${errors.pack_due ? 'is-invalid' : ''}`}
                                    required 
                                />
                                {errors.pack_due && <div className="invalid-feedback">{errors.pack_due[0]}</div>}
                            </div>

                            <div className="d-flex justify-content-center mt-4">
                                <button 
                                    type="submit" 
                                    className="btn btn-success me-2"
                                    disabled={loading}
                                >
                                    {loading ? 'Adding...' : (
                                        <>
                                            <i className="material-icons align-middle me-1">add_circle_outline</i>
                                            එක් කරන්න
                                        </>
                                    )}
                                </button>
                                <Link to="/items" className="btn btn-secondary">
                                    <i className="material-icons align-middle me-1">cancel</i>
                                    අවලංගු කරන්න
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-card {
                    background-color: #006400 !important;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                    padding: 24px;
                }
                body {
                    background-color: #99ff99;
                }
                .form-label {
                    font-weight: 700;
                    color: #000000;
                }
                .btn-success {
                    background-color: #198754;
                    border-color: #198754;
                }
                .btn-secondary {
                    background-color: #6c757d;
                    border-color: #6c757d;
                }
            `}</style>
        </div>
    );
};

export default CreateItem;