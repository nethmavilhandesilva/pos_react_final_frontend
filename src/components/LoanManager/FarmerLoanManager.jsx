import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import api from '../../api';
import Sidebar from '../Sidebar';

const getInitialFormState = () => ({
    loan_id: '',
    loan_type: 'old',
    settling_way: 'cash',
    supplier_code: null,
    bill_no: '',
    amount: '',
    description: '',
    cheque_no: '',
    bank: '',
    cheque_date: new Date().toISOString().slice(0, 10),
});

const FarmerLoanManager = () => {
    const [form, setForm] = useState(getInitialFormState());
    const [farmers, setFarmers] = useState([]);
    const [loans, setLoans] = useState([]);
    const [totalLoanDisplay, setTotalLoanDisplay] = useState('');
    const [loading, setLoading] = useState(true);

    const isCheque = form.settling_way === 'cheque';

    // Fetch Farmers for dropdown
    const fetchFarmers = useCallback(async () => {
        try {
            const { data } = await api.get('/suppliers'); 
            const formatted = data.map(f => ({
                value: f.code,
                label: `${f.code} - ${f.name}`
            }));
            setFarmers(formatted);
        } catch (error) {
            console.error('Error fetching farmers:', error);
        }
    }, []);

    // Fetch transactions for the table (Today's records)
    const fetchLoans = useCallback(async () => {
        try {
            const { data } = await api.get('/farmer-loans/data');
            setLoans(data);
        } catch (error) {
            console.error('Error fetching loans:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch Balance logic (Old - Today)
    const fetchFarmerBalance = useCallback(async (code) => {
        if (code) {
            try {
                const { data } = await api.get(`/farmer-loans/balance/${code}`);
                setTotalLoanDisplay(`ශේෂය (Old - Today): ${data.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            } catch (error) {
                setTotalLoanDisplay('ශේෂය ලබාගත නොහැක');
            }
        } else {
            setTotalLoanDisplay('');
        }
    }, []);

    useEffect(() => {
        fetchFarmers();
        fetchLoans();
    }, [fetchFarmers, fetchLoans]);

    useEffect(() => {
        fetchFarmerBalance(form.supplier_code);
    }, [form.supplier_code, fetchFarmerBalance]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    // Auto-description logic
    useEffect(() => {
        const { loan_type, settling_way, bank } = form;
        let newDescription = "";
        if (loan_type === 'old') {
            newDescription = settling_way === 'cheque' ? `Cheque from farmer - ${bank}` : "ගොවි ණයට එකතු කිරීම";
        } else if (loan_type === 'today') {
            newDescription = "ගොවියන්ගේ ණය ගෙවීම";
        }
        if (newDescription) setForm(prev => ({ ...prev, description: newDescription }));
    }, [form.loan_type, form.settling_way, form.bank]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Sending raw amount as entered by user
            await api.post('/farmer-loans', form);
            setForm(getInitialFormState());
            fetchLoans();
            fetchFarmerBalance(form.supplier_code);
            alert('දත්ත සාර්ථකව ඇතුලත් කරන ලදී!');
        } catch (error) {
            alert('ඇතුලත් කිරීම අසාර්ථකයි');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center mt-5">Loading...</div>;

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{ marginLeft: '260px', flexGrow: 1, padding: '20px' }}>
                <style>{`
                    body { background-color: #e6f3ff !important; }
                    .custom-card { background-color: #003366 !important; color: #fff; padding: 25px; border-radius: 10px; }
                    label { color: #fff; font-size: 0.85rem; font-weight: bold; }
                    .balance-display { background: #ffcc00; color: #000; padding: 8px 15px; border-radius: 5px; font-weight: 800; display: inline-block; margin-top: 10px; border: 2px solid #000; }
                `}</style>

                <div className="custom-card">
                    <h3 className="mb-4">ගොවි ණය කළමනාකරණය (Farmer Loan)</h3>

                    <form onSubmit={handleSubmit} className="p-3 border rounded bg-dark">
                        <div className="row gy-3">
                            <div className="col-md-12">
                                {['old', 'today'].map(type => (
                                    <label key={type} className="me-4">
                                        <input type="radio" name="loan_type" value={type} checked={form.loan_type === type} onChange={handleInputChange} />
                                        {' '}
                                        {type === 'old' && 'ගොවි ණයට එකතු කිරීම (Old)'}
                                        {type === 'today' && 'ගොවියන්ගේ ණය ගෙවීම (Today)'}
                                    </label>
                                ))}
                            </div>

                            <div className="col-md-4">
                                <label>ගොවියා තෝරන්න (Farmer)</label>
                                <Select
                                    options={farmers}
                                    onChange={(opt) => setForm({...form, supplier_code: opt ? opt.value : null})}
                                    value={farmers.find(f => f.value === form.supplier_code)}
                                    placeholder="සොයන්න..."
                                    className="text-dark"
                                />
                                {/* Changed: Wrapped in form.supplier_code check */}
                                {form.supplier_code && totalLoanDisplay && (
                                    <div className="balance-display">
                                        {totalLoanDisplay}
                                    </div>
                                )}
                            </div>

                            <div className="col-md-2">
                                <label>මුදල</label>
                                <input type="number" step="0.01" name="amount" className="form-control form-control-sm" value={form.amount} onChange={handleInputChange} required />
                            </div>

                            <div className="col-md-4">
                                <label>විස්තරය</label>
                                <input type="text" name="description" className="form-control form-control-sm" value={form.description} onChange={handleInputChange} />
                            </div>

                            <div className="col-md-12">
                                <label className="d-block">ගෙවීමේ ක්‍රමය:</label>
                                {['cash', 'cheque'].map(way => (
                                    <label key={way} className="me-3">
                                        <input type="radio" name="settling_way" value={way} checked={form.settling_way === way} onChange={handleInputChange} />
                                        {' '} {way.toUpperCase()}
                                    </label>
                                ))}
                            </div>

                            {isCheque && (
                                <div className="col-md-12 row g-2 bg-secondary p-2 rounded ms-0">
                                    <div className="col-md-4">
                                        <label>චෙක් අංකය</label>
                                        <input type="text" name="cheque_no" className="form-control form-control-sm" value={form.cheque_no} onChange={handleInputChange}/>
                                    </div>
                                    <div className="col-md-4">
                                        <label>බැංකුව</label>
                                        <input type="text" name="bank" className="form-control form-control-sm" value={form.bank} onChange={handleInputChange}/>
                                    </div>
                                    <div className="col-md-4">
                                        <label>දිනය</label>
                                        <input type="date" name="cheque_date" className="form-control form-control-sm" value={form.cheque_date} onChange={handleInputChange}/>
                                    </div>
                                </div>
                            )}

                            <div className="col-12">
                                <button type="submit" className="btn btn-warning btn-sm fw-bold">දත්ත ඇතුලත් කරන්න</button>
                            </div>
                        </div>
                    </form>

                    <h4 className="mt-5">අද දින වාර්තාව</h4>
                    <div className="table-responsive">
                        <table className="table table-bordered table-sm mt-2 bg-white text-dark">
                            <thead className="table-secondary">
                                <tr>
                                    <th>ගොවියා</th>
                                    <th>වර්ගය</th>
                                    <th>විස්තරය</th>
                                    <th className="text-end">මුදල</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loans.map(loan => (
                                    <tr key={loan.id}>
                                        <td>{loan.supplier_code}</td>
                                        <td>{loan.loan_type}</td>
                                        <td>{loan.description}</td>
                                        <td className="text-end">{parseFloat(loan.amount).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FarmerLoanManager;