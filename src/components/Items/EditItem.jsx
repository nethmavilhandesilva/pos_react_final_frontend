import React, { useState, useEffect } from 'react';
import { itemService } from '../../services/itemService';
import { useNavigate, Link, useParams } from 'react-router-dom';

const EditItem = () => {
    const [formData, setFormData] = useState({
        no: '',
        type: '',
        pack_cost: '',
        pack_due: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [itemLoading, setItemLoading] = useState(true);
    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        loadItem();
    }, [id]);

    const loadItem = async () => {
        try {
            const response = await itemService.get(id);
            setFormData(response.data);
        } catch (error) {
            console.error('Error loading item:', error);
            setErrors({ general: 'Error loading item' });
        } finally {
            setItemLoading(false);
        }
    };

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
            await itemService.update(id, formData);
            navigate('/items');
        } catch (error) {
            if (error.response && error.response.status === 422) {
                setErrors(error.response.data.errors || {});
            } else {
                setErrors({ general: 'Error updating item' });
            }
        } finally {
            setLoading(false);
        }
    };

    if (itemLoading) {
        return <div className="text-center">Loading...</div>;
    }

    return (
        <div className="form-card">
            <h3 className="mb-4 text-center text-primary">අයිතමය සංස්කරණය කරන්න (Edit Item)</h3>

            {errors.general && (
                <div className="alert alert-danger">{errors.general}</div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="no" className="form-label">අංකය</label>
                    <input 
                        type="text" 
                        name="no" 
                        id="no" 
                        value={formData.no}
                        onChange={handleChange}
                        className={`form-control ${errors.no ? 'is-invalid' : ''}`}
                        required 
                    />
                    {errors.no && <div className="invalid-feedback">{errors.no[0]}</div>}
                </div>

                <div className="mb-3">
                    <label htmlFor="type" className="form-label">වර්ගය</label>
                    <input 
                        type="text" 
                        name="type" 
                        id="type" 
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
                        name="pack_cost" 
                        id="pack_cost" 
                        step="0.01" 
                        value={formData.pack_cost}
                        onChange={handleChange}
                        className={`form-control ${errors.pack_cost ? 'is-invalid' : ''}`}
                        required 
                    />
                    {errors.pack_cost && <div className="invalid-feedback">{errors.pack_cost[0]}</div>}
                </div>

                <div className="mb-3">
                    <label htmlFor="pack_due" className="form-label">මල්ලක කුලිය</label>
                    <input 
                        type="number" 
                        name="pack_due" 
                        id="pack_due" 
                        step="0.01" 
                        value={formData.pack_due}
                        onChange={handleChange}
                        className={`form-control ${errors.pack_due ? 'is-invalid' : ''}`}
                        required 
                    />
                    {errors.pack_due && <div className="invalid-feedback">{errors.pack_due[0]}</div>}
                </div>

                <div className="d-flex justify-content-center mt-4">
                    <button 
                        type="submit" 
                        className="btn btn-success px-4"
                        disabled={loading}
                    >
                        {loading ? 'Updating...' : (
                            <>
                                <i className="material-icons align-middle me-1">edit</i>
                                සංස්කරණය කරන්න
                            </>
                        )}
                    </button>
                    <Link to="/items" className="btn btn-secondary px-4 ms-2">
                        <i className="material-icons align-middle me-1">cancel</i>
                        අවලංගු කරන්න
                    </Link>
                </div>
            </form>

            <style jsx>{`
                .form-card {
                    background-color: #006400 !important;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                    padding: 24px;
                    max-width: 600px;
                    margin: 40px auto;
                }
                body {
                    background-color: #99ff99;
                }
                .form-label {
                    font-weight: 700;
                    color: #000000;
                }
                .form-control:focus {
                    border-color: #4f46e5;
                    box-shadow: 0 0 0 0.2rem rgba(79, 70, 229, 0.25);
                }
                .btn-success {
                    background-color: #198754;
                    border-color: #198754;
                }
                .btn-success:hover {
                    background-color: #157347;
                    border-color: #157347;
                }
                .btn-secondary {
                    background-color: #6c757d;
                    border-color: #6c757d;
                }
            `}</style>
        </div>
    );
};

export default EditItem;