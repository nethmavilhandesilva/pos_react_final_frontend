import React, { useState, useEffect, useRef } from 'react';
import { submitGrnEntry } from '../../services/api';

const GrnEntryForm = ({ notChangingGRNs, onCodeSelect, onEntryAdded, selectedCode, updateBalances }) => {
  const [formData, setFormData] = useState({
    code: '',
    packs: '',
    weight: '',
    per_kg_price: '',
    grn_no: ''
  });
  const [itemInfo, setItemInfo] = useState('');
  const packsRef = useRef(null);
  const weightRef = useRef(null);
  const priceRef = useRef(null);
  const codeSelectRef = useRef(null);

  useEffect(() => {
    // Focus on code select when component mounts
    if (codeSelectRef.current) {
      codeSelectRef.current.focus();
    }
  }, []);

  const handleCodeChange = (e) => {
    const selectedValue = e.target.value;
    const selectedOption = e.target.options[e.target.selectedIndex];
    
    setFormData(prev => ({
      ...prev,
      code: selectedValue
    }));

    if (selectedValue) {
      const itemCode = selectedOption.getAttribute('data-item-code');
      const itemName = selectedOption.getAttribute('data-item-name');
      const grnNo = selectedOption.getAttribute('data-grn-no');
      const perKgPrice = selectedOption.getAttribute('data-perkg-price');

      setFormData(prev => ({
        ...prev,
        code: selectedValue,
        per_kg_price: perKgPrice || '',
        grn_no: grnNo || ''
      }));
      setItemInfo(itemName || '');
      onCodeSelect(selectedValue);
      
      // Focus on packs input after selection
      setTimeout(() => {
        if (packsRef.current) packsRef.current.focus();
      }, 100);
    } else {
      // Clear fields if no code selected
      setFormData(prev => ({
        ...prev,
        per_kg_price: '',
        grn_no: ''
      }));
      setItemInfo('');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const newEntry = await submitGrnEntry(formData);
      onEntryAdded(newEntry.entry);
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        packs: '',
        weight: '',
        per_kg_price: ''
      }));
      setItemInfo('');
      
      // Update balances
      updateBalances(formData.code);
      
      // Refocus on code select
      if (codeSelectRef.current) {
        codeSelectRef.current.value = '';
        codeSelectRef.current.focus();
      }
      
    } catch (error) {
      alert('Error adding entry: ' + error.message);
    }
  };

  const handleKeyDown = (e, nextField) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextField === 'submit') {
        handleSubmit(e);
      } else if (nextField && nextField.current) {
        nextField.current.focus();
      }
    }
  };

  // Filter options based on search input (simulating Select2 search)
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredOptions = notChangingGRNs.filter(grn =>
    grn.code.toUpperCase().includes(searchTerm.toUpperCase()) ||
    grn.item_name.toUpperCase().includes(searchTerm.toUpperCase())
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
  };

  const handleOptionSelect = (grn) => {
    setFormData(prev => ({
      ...prev,
      code: grn.code,
      per_kg_price: grn.PerKGPrice || '',
      grn_no: grn.grn_no || ''
    }));
    setItemInfo(grn.item_name);
    onCodeSelect(grn.code);
    setSearchTerm(`${grn.code} - ${grn.item_name}`);
    setShowDropdown(false);
    
    // Focus on packs input after selection
    setTimeout(() => {
      if (packsRef.current) packsRef.current.focus();
    }, 100);
  };

  return (
    <form id="grn_form" onSubmit={handleSubmit}>
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <label htmlFor="nc_code" className="form-label">Code</label>
          <div className="position-relative">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search for a code or name..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              style={{ textTransform: 'uppercase' }}
            />
            {showDropdown && searchTerm && (
              <div 
                className="position-absolute w-100 bg-white border mt-1 shadow-sm"
                style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}
              >
                {filteredOptions.map(grn => (
                  <div
                    key={grn.code}
                    className="dropdown-item p-2 cursor-pointer"
                    onClick={() => handleOptionSelect(grn)}
                    style={{ cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    {grn.code} - {grn.item_name}
                  </div>
                ))}
                {filteredOptions.length === 0 && (
                  <div className="dropdown-item p-2 text-muted">
                    No results found
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Hidden select for form submission */}
          <select
            ref={codeSelectRef}
            id="nc_code"
            name="code"
            className="form-control form-control-sm d-none"
            value={formData.code}
            onChange={handleCodeChange}
          >
            <option value="" disabled>-- Select Code --</option>
            {notChangingGRNs.map(grn => (
              <option 
                key={grn.code} 
                value={grn.code}
                data-item-code={grn.item_code}
                data-item-name={grn.item_name}
                data-grn-no={grn.grn_no}
                data-perkg-price={grn.PerKGPrice}
              >
                {grn.code} - {grn.item_name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-2">
          <label htmlFor="start_date" className="form-label">Start Date</label>
          <input type="date" id="start_date" className="form-control form-control-sm" />
        </div>

        <div className="col-md-2">
          <label htmlFor="end_date" className="form-label">End Date</label>
          <input type="date" id="end_date" className="form-control form-control-sm" />
        </div>
      </div>

      <div className="row g-2 mb-3 align-items-end mt-2">
        <div className="col-md-3">
          <label htmlFor="nc_item" className="form-label">Item</label>
          <input
            type="text"
            id="nc_item"
            value={itemInfo}
            className="form-control form-control-sm"
            readOnly
          />
        </div>

        <div className="col-md-2">
          <label htmlFor="nc_packs" className="form-label">Packs</label>
          <input
            ref={packsRef}
            type="number"
            id="nc_packs"
            name="packs"
            value={formData.packs}
            onChange={handleInputChange}
            className="form-control form-control-sm"
            min="1"
            onKeyDown={(e) => handleKeyDown(e, { current: weightRef.current })}
          />
        </div>

        <div className="col-md-2">
          <label htmlFor="nc_weight" className="form-label">Weight (kg)</label>
          <input
            ref={weightRef}
            type="number"
            id="nc_weight"
            name="weight"
            value={formData.weight}
            onChange={handleInputChange}
            className="form-control form-control-sm"
            step="0.01"
            onKeyDown={(e) => handleKeyDown(e, { current: priceRef.current })}
          />
        </div>

        <div className="col-md-2">
          <label htmlFor="nc_perkg_price" className="form-label">Per KG Price</label>
          <input
            ref={priceRef}
            type="number"
            id="nc_perkg_price"
            name="per_kg_price"
            value={formData.per_kg_price}
            onChange={handleInputChange}
            className="form-control form-control-sm"
            step="0.01"
            onKeyDown={(e) => handleKeyDown(e, 'submit')}
          />
        </div>

        <div className="col-md-3">
          <label htmlFor="nc_grn_no" className="form-label">GRN No</label>
          <input
            type="text"
            id="nc_grn_no"
            name="grn_no"
            value={formData.grn_no}
            onChange={handleInputChange}
            className="form-control form-control-sm"
            readOnly
          />
        </div>
      </div>

      <div className="col-12 d-flex gap-2 mt-2">
        <button type="submit" className="btn btn-primary btn-sm">
          <i className="material-icons align-middle me-1">check_circle</i> Update GRN
        </button>

        <a href="/grn/create" className="btn btn-secondary btn-sm">
          <i className="material-icons align-middle me-1">add_circle</i> New GRN
        </a>

        <button type="button" className="btn btn-success btn-sm">Export Excel</button>
        <button type="button" className="btn btn-danger btn-sm">Export PDF</button>
      </div>
    </form>
  );
};

export default GrnEntryForm;