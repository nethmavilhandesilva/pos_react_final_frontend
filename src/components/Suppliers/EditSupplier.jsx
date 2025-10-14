import React, { useState, useEffect } from 'react';
import { supplierService } from '../../services/supplierService';
import { useNavigate, Link, useParams } from 'react-router-dom';


const EditSupplier = () => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        address: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [supplierLoading, setSupplierLoading] = useState(true);
    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        loadSupplier();
    }, [id]);

    const loadSupplier = async () => {
        try {
            const response = await supplierService.get(id);
            setFormData(response.data);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            await supplierService.update(id, formData);
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
        return <div className="text-center">Loading...</div>;
    }

    return (
        <div className="form-card edit-item-container">
            <h2>✏️ සැපයුම්කරු සංස්කරණය (Edit Supplier)</h2>

            {errors.general && (
                <div className="alert alert-danger">{errors.general}</div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="code_field" className="form-label">කේතය (Code)</label>
                    <input 
                        type="text" 
                        id="code_field" 
                        name="code" 
                        value={formData.code}
                        onChange={handleChange}
                        className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                        required 
                    />
                    {errors.code && <div className="invalid-feedback">{errors.code[0]}</div>}
                </div>

                <div className="mb-3">
                    <label htmlFor="name_field" className="form-label">නම (Name)</label>
                    <input 
                        type="text" 
                        id="name_field" 
                        name="name" 
                        value={formData.name}
                        onChange={handleChange}
                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                        required 
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name[0]}</div>}
                </div>

                <div className="mb-3">
                    <label htmlFor="address_field" className="form-label">ලිපිනය (Address)</label>
                    <textarea 
                        id="address_field" 
                        name="address" 
                        value={formData.address}
                        onChange={handleChange}
                        className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                        required
                        rows="4"
                    />
                    {errors.address && <div className="invalid-feedback">{errors.address[0]}</div>}
                </div>

                <div className="text-center mt-4">
                    <button 
                        type="submit" 
                        className="btn btn-success"
                        disabled={loading}
                    >
                        {loading ? 'Updating...' : (
                            <>
                                <span className="material-icons align-middle me-1">save</span>
                                යාවත්කාලීන කරන්න
                            </>
                        )}
                    </button>
                    <Link to="/suppliers" className="btn btn-secondary">
                        <span className="material-icons align-middle me-1">cancel</span>
                        අවලංගු කරන්න
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default EditSupplier;