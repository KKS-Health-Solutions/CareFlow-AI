import React, { useState } from 'react';
import './RoleSelector.css';

export default function RoleSelector({ onRoleSelect }) {
  const [selectedRole, setSelectedRole] = useState('');

  const roles = [
    {
      id: 'doctor',
      title: 'Doctor',
      description: 'Review and approve discharge summaries & follow-up plans',
      icon: '👨‍⚕️',
      color: 'doctor'
    },
    {
      id: 'nurse',
      title: 'Nurse',
      description: 'Manage discharge checklists and patient readiness',
      icon: '👩‍⚕️',
      color: 'nurse'
    },
    {
      id: 'pharmacy',
      title: 'Pharmacy',
      description: 'Handle medication reconciliation and dispensing',
      icon: '💊',
      color: 'pharmacy'
    },
    {
      id: 'admin',
      title: 'Admin',
      description: 'Operational oversight and communication management',
      icon: '⚙️',
      color: 'admin'
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    // Store role in session storage for persistence
    sessionStorage.setItem('careflow_user_role', roleId);
    // Call parent callback
    if (onRoleSelect) {
      onRoleSelect(roleId);
    }
  };

  return (
    <div className="role-selector-container">
      <div className="role-selector-content">
        <div className="role-selector-header">
          <div className="logo-section">
            <h1>CareFlow</h1>
            <p className="tagline">Discharge + Follow-Up Management</p>
          </div>
          <div className="role-prompt">
            <h2>Select your role</h2>
            <p>Choose your role to access your personalized dashboard</p>
          </div>
        </div>

        <div className="role-grid">
          {roles.map((role) => (
            <button
              key={role.id}
              className={`role-card role-${role.color} ${selectedRole === role.id ? 'selected' : ''}`}
              onClick={() => handleRoleSelect(role.id)}
            >
              <div className="role-icon">{role.icon}</div>
              <div className="role-content">
                <h3>{role.title}</h3>
                <p>{role.description}</p>
              </div>
              <div className="role-arrow">→</div>
            </button>
          ))}
        </div>

        <div className="role-selector-footer">
          <p className="mvp-notice">
            MVP Mode: Role selection for demonstration purposes
          </p>
        </div>
      </div>
    </div>
  );
}