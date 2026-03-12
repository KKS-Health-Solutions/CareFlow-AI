import React, { useState } from 'react';
import { DischargeCaseService } from '../services/DischargeCaseService.js';
import './CreatePatientForm.css';


export default function CreatePatientForm({ onBack, onSubmit }) {
  const [formData, setFormData] = useState({
    patient_name: '',
    hospital_number: '',
    admission_reason: '',
    ward: '',
    risk_level: 'moderate'
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const service = new DischargeCaseService();

  const wardOptions = [
    'General Medicine',
    'General Surgery',
    'Cardiology',
    'Endocrinology',
    'Orthopedics',
    'Radiology'
  ];

  const riskLevelOptions = [
    { value: 'low', label: 'Low', color: '#27ae60' },
    { value: 'moderate', label: 'Moderate', color: '#f39c12' },
    { value: 'high', label: 'High', color: '#e74c3c' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.patient_name.trim()) {
      newErrors.patient_name = 'Patient name is required';
    }


    if (!formData.ward) {
      newErrors.ward = 'Please select a ward';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitResult(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      await service.createDischargeCase(formData);

      if (onSubmit) {
        await onSubmit(formData);
      }

      setSubmitResult({ type: 'success', message: 'Patient discharge case created successfully!' });

      // Reset form after success
      setFormData({
        patient_name: '',
        hospital_number: '',
        admission_reason: '',
        ward: '',
        risk_level: 'moderate'
      });
    } catch (err) {
      setSubmitResult({ type: 'error', message: err.message || 'Failed to create patient discharge case' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-patient-page">
      <div className="create-patient-container">
        {/* Header */}
        <div className="form-header">
          <button className="back-button" onClick={onBack} type="button">
            ← Back
          </button>
          <div className="form-title">
            <h1>🏥 Create Patient Discharge Case</h1>
            <p className="form-subtitle">Enter patient details to initiate a new discharge case</p>
          </div>
        </div>

        {/* Feedback Banner */}
        {submitResult && (
          <div className={`submit-banner ${submitResult.type}`}>
            <span className="banner-icon">
              {submitResult.type === 'success' ? '✅' : '❌'}
            </span>
            <span className="banner-message">{submitResult.message}</span>
            <button
              className="banner-dismiss"
              onClick={() => setSubmitResult(null)}
              type="button"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form */}
        <form className="patient-form" onSubmit={handleSubmit}>
          {/* Patient Name */}
          <div className={`form-group ${errors.patient_name ? 'has-error' : ''}`}>
            <label htmlFor="patient_name">
              Patient Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="patient_name"
              name="patient_name"
              value={formData.patient_name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              disabled={submitting}
            />
            {errors.patient_name && (
              <span className="error-text">{errors.patient_name}</span>
            )}
          </div>
          {/* Admission Reason */}
          <div className="form-group">
            <label htmlFor="admission_reason">Admission Reason</label>
            <textarea
              id="admission_reason"
              name="admission_reason"
              value={formData.admission_reason}
              onChange={handleChange}
              placeholder="e.g. Hip Replacement Recovery"
              rows={3}
              disabled={submitting}
            />
          </div>

          {/* Ward */}
          <div className={`form-group ${errors.ward ? 'has-error' : ''}`}>
            <label htmlFor="ward">
              Ward <span className="required">*</span>
            </label>
            <select
              id="ward"
              name="ward"
              value={formData.ward}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="">-- Select Ward --</option>
              {wardOptions.map(ward => (
                <option key={ward} value={ward}>{ward}</option>
              ))}
            </select>
            {errors.ward && (
              <span className="error-text">{errors.ward}</span>
            )}
          </div>

          {/* Risk Level */}
          <div className="form-group">
            <label>Risk Level</label>
            <div className="risk-level-options">
              {riskLevelOptions.map(option => (
                <label
                  key={option.value}
                  className={`risk-option ${formData.risk_level === option.value ? 'selected' : ''}`}
                  style={{
                    '--risk-color': option.color
                  }}
                >
                  <input
                    type="radio"
                    name="risk_level"
                    value={option.value}
                    checked={formData.risk_level === option.value}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                  <span className="risk-dot" style={{ backgroundColor: option.color }}></span>
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onBack}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Discharge Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
