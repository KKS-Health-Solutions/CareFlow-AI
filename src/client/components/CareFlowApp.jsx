import React, { useState, useEffect } from 'react';
import RoleSelector from './RoleSelector.jsx';
import Dashboard from './Dashboard.jsx';
import PharmacyDashboard from './PharmacyDashboard.jsx';
import DoctorDashboard from './DoctorDashboard.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import CreatePatientForm from './CreatePatientForm.jsx';

export default function CareFlowApp() {
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Check if there's a stored role in session storage
    const storedRole = sessionStorage.getItem('careflow_user_role');
    if (storedRole) {
      setSelectedRole(storedRole);
    }
    setLoading(false);
  }, []);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    sessionStorage.setItem('careflow_user_role', role);
  };

  const handleSwitchRole = () => {
    setSelectedRole('');
    sessionStorage.removeItem('careflow_user_role');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f6fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #0066cc',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px auto'
          }}></div>
          <p>Loading CareFlow...</p>
        </div>
      </div>
    );
  }

  // Show role selector if no role is selected
  if (!selectedRole) {
    return <RoleSelector onRoleSelect={handleRoleSelect} />;
  }

  // Render create patient form if navigated to
  if (currentPage === 'create-patient') {
    return (
      <CreatePatientForm
        onBack={() => setCurrentPage('dashboard')}
      />
    );
  }

  // Render role-specific dashboard
  switch (selectedRole) {
    case 'doctor':
      return <DoctorDashboard onSwitchRole={handleSwitchRole} onCreatePatient={() => setCurrentPage('create-patient')} />;
    
    case 'nurse':
      return <Dashboard userRole="nurse" onSwitchRole={handleSwitchRole} onCreatePatient={() => setCurrentPage('create-patient')} />;
    
    case 'pharmacy':
      return <PharmacyDashboard onSwitchRole={handleSwitchRole} onCreatePatient={() => setCurrentPage('create-patient')} />;
    
    case 'admin':
      return <AdminDashboard onSwitchRole={handleSwitchRole} onCreatePatient={() => setCurrentPage('create-patient')} />;
    
    default:
      // Fallback to role selector
      return <RoleSelector onRoleSelect={handleRoleSelect} />;
  }
}