import React, { useState } from 'react';
import { supplierService } from '../../services/supplierService';
import { useNavigate, Link } from 'react-router-dom';


const CreateSupplier = () => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        address: ''
    });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            await supplierService.create(formData);
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
        <div className="container-fluid mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="form-card create-item-container">
                        <h2>+ නව සැපයුම්කරු (Add New Supplier)</h2>

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
                                    style={{ textTransform: 'uppercase' }}
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
                                    {loading ? 'Adding...' : (
                                        <>
                                            <span className="material-icons align-middle me-1">add_circle_outline</span>
                                            Add Supplier
                                        </>
                                    )}
                                </button>
                                <Link to="/suppliers" className="btn btn-secondary">
                                    <span className="material-icons align-middle me-1">cancel</span>
                                    Cancel
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