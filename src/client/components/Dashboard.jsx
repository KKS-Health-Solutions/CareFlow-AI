import React, { useState, useEffect } from 'react';
import { DischargeCaseService } from '../services/DischargeCaseService.js';
import Navigation from './Navigation.jsx';
import KpiTiles from './KpiTiles.jsx';
import DischargeTable from './DischargeTable.jsx';
import AlertsPanel from './AlertsPanel.jsx';
import './Dashboard.css';

export default function Dashboard({ userRole = 'nurse', onSwitchRole, onCreatePatient }) {
  const [dashboardData, setDashboardData] = useState({ cases: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('my-tasks');
  const [filters, setFilters] = useState({
    status: '',
    ward: '',
    assignedToMe: false,
    overdue: false,
    readyForDischarge: false
  });

  const service = new DischargeCaseService();

  useEffect(() => {
    loadViewData(currentView);
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'command-center') return;

    let isRefreshing = false;

    const interval = setInterval(async () => {
      if (isRefreshing) return;
      isRefreshing = true;
      try {
        const stats = await service.getDashboardStats();
        setDashboardData(prev => ({ ...prev, stats }));
      } catch (err) {
        console.error('Failed to refresh stats:', err);
      } finally {
        isRefreshing = false;
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentView]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await service.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadViewData = async (view) => {
    try {
      setLoading(true);
      let data;
      
      switch (view) {
        case 'command-center':
          data = await service.getDashboardData();
          break;
        case 'my-tasks':
          data = await service.getMyTasks(userRole);
          break;
        case 'doctor-signoff':
          data = await service.getDoctorSignoffQueue();
          break;
        case 'nursing-checklist':
          data = await service.getNursingQueue();
          break;
        case 'pharmacy-queue':
          data = await service.getPharmacyQueue();
          break;
        case 'followups-due':
          data = await service.getFollowupsDue();
          break;
        case 'failed-communications':
          data = await service.getFailedCommunications();
          break;
        default:
          data = await service.getDashboardData();
      }
      
      setDashboardData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (viewId) => {
    setCurrentView(viewId);
    setFilters({
      status: '',
      ward: '',
      assignedToMe: false,
      overdue: false,
      readyForDischarge: false
    });
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const getViewTitle = () => {
    const titles = {
      'command-center': 'Discharge & Follow-Up Command Center',
      'my-tasks': 'My Tasks',
      'doctor-signoff': 'Doctor Sign-off Queue',
      'nursing-checklist': 'Nursing Checklist Queue',
      'pharmacy-queue': 'Pharmacy Queue',
      'followups-due': 'Follow-Ups Due',
      'failed-communications': 'Failed Communications'
    };
    return titles[currentView] || 'Dashboard';
  };

  const filteredCases = dashboardData.cases?.filter(caseItem => {
    const dischargeStatus = typeof caseItem.u_discharging_status === 'object' 
      ? caseItem.u_discharging_status.value 
      : caseItem.u_discharging_status;
    
    const rawWard = typeof caseItem.u_ward === 'object' && caseItem.u_ward !== null
      ? (caseItem.u_ward.display_value || caseItem.u_ward.value || '')
      : (caseItem.u_ward || '');
    const ward = String(rawWard).trim().toLowerCase().replace(/\s+/g, '_');

    const dueDate = typeof caseItem.u_due_date === 'object' 
      ? caseItem.u_due_date.value 
      : caseItem.u_due_date;

    const dischargeDate = typeof caseItem.u_discharge_date === 'object'
      ? caseItem.u_discharge_date.value
      : caseItem.u_discharge_date;

    // Apply view-specific filters
    if (currentView === 'nursing-checklist') {
      if (dischargeStatus !== 'draft' && dischargeStatus !== 'ready_for_discharge') return false;
    }

    if (currentView === 'followups-due') {
      const today = new Date();
      const weekFromNow = new Date();
      weekFromNow.setDate(today.getDate() + 7);
      const due = new Date(dueDate);
      if (due < today || due > weekFromNow) return false;
    }

    // Apply user filters
    if (filters.status && dischargeStatus !== filters.status) return false;
    if (filters.ward && ward !== filters.ward) return false;
    if (filters.readyForDischarge && dischargeStatus !== 'ready_for_discharge') return false;
    
    if (filters.overdue) {
      if (!dischargeDate) return false;
      if (dischargeStatus === 'discharged') return false;
      const today = new Date();
      const discharge = new Date(dischargeDate);
      if (discharge >= today) return false;
    }

    return true;
  }) || [];

  const getAlertCases = () => {
    return dashboardData.cases?.filter(caseItem => {
      const dischargeStatus = typeof caseItem.u_discharging_status === 'object' 
        ? caseItem.u_discharging_status.value 
        : caseItem.u_discharging_status;
      
      const dueDate = typeof caseItem.u_due_date === 'object' 
        ? caseItem.u_due_date.value 
        : caseItem.u_due_date;

      const today = new Date();
      const due = new Date(dueDate);
      
      return (
        dischargeStatus === 'discharged' ||
        due < today ||
        dischargeStatus === 'ready_for_discharge'
      );
    }) || [];
  };

  if (loading) {
    return (
      <div className="app-container">
        <Navigation currentView={currentView} onNavigate={handleNavigate} userRole={userRole} />
        <div className="main-content">
          <div className="dashboard-loading">
            <div className="loading-spinner"></div>
            <p>Loading Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <Navigation currentView={currentView} onNavigate={handleNavigate} userRole={userRole} />
        <div className="main-content">
          <div className="dashboard-error">
            <h3>Error Loading Dashboard</h3>
            <p>{error}</p>
            <button onClick={loadDashboardData} className="retry-button">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navigation 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        userRole={userRole}
        onSwitchRole={onSwitchRole}
      />
      <div className="main-content">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1>{getViewTitle()}</h1>
            <div className="header-actions">
              {onCreatePatient && (
                <button onClick={onCreatePatient} className="create-patient-button">
                  + Create Patient
                </button>
              )}
              {onSwitchRole && (
                <button onClick={onSwitchRole} className="switch-role-button">
                  Switch Role
                </button>
              )}
              <button onClick={() => loadViewData(currentView)} className="refresh-button">
                Refresh Data
              </button>
            </div>
          </div>
          
          {currentView === 'command-center' && (
            <KpiTiles stats={dashboardData.stats || {}} />
          )}
          
          <div className={`dashboard-main ${currentView !== 'command-center' ? 'full-width' : ''}`}>
            <div className="dashboard-content">
              <DischargeTable 
                cases={filteredCases} 
                onFilterChange={handleFilterChange}
                filters={filters}
                viewType={currentView}
                role="nurse"
              />
            </div>
            
            {currentView === 'command-center' && (
              <div className="dashboard-sidebar">
                <AlertsPanel alertCases={getAlertCases()} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
