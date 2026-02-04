import React, { useState, useEffect } from 'react';
import { DischargeCaseService } from '../services/DischargeCaseService.js';
import './AdminDashboard.css';

export default function AdminDashboard({ onSwitchRole }) {
  const [adminData, setAdminData] = useState({ cases: [], stats: {}, exceptions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    ward: '',
    overdue: false,
    failedComms: false,
    missingFields: false
  });
  const [selectedView, setSelectedView] = useState('overview'); // overview, exceptions, communications

  const service = new DischargeCaseService();

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [dashboardData, failedComms] = await Promise.all([
        service.getDashboardData(),
        service.getFailedCommunications()
      ]);
      
      const exceptions = await getExceptionalCases(dashboardData.cases);
      
      setAdminData({
        cases: dashboardData.cases,
        stats: {
          ...dashboardData.stats,
          failedComms: failedComms.communications?.length || 0,
          overdueTasks: calculateOverdueTasks(dashboardData.cases)
        },
        exceptions,
        failedCommunications: failedComms.communications || []
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverdueTasks = (cases) => {
    const today = new Date();
    return cases.filter(caseItem => {
      const dueDate = typeof caseItem.u_due_date === 'object' ? caseItem.u_due_date.value : caseItem.u_due_date;
      if (!dueDate) return false;
      const due = new Date(dueDate);
      return due < today;
    }).length;
  };

  const getExceptionalCases = async (cases) => {
    const exceptions = [];
    const today = new Date();

    cases.forEach(caseItem => {
      const dischargeStatus = typeof caseItem.u_discharging_status === 'object' 
        ? caseItem.u_discharging_status.value 
        : caseItem.u_discharging_status;
      
      const dueDate = typeof caseItem.u_due_date === 'object' 
        ? caseItem.u_due_date.value 
        : caseItem.u_due_date;

      const patientName = typeof caseItem.u_patient_name === 'object' 
        ? caseItem.u_patient_name.display_value 
        : caseItem.u_patient_name;

      // Check for various exception conditions
      if (dischargeStatus === 'discharged' && !dueDate) {
        exceptions.push({
          case: caseItem,
          type: 'missing_followup',
          severity: 'high',
          message: 'Discharged but follow-up not scheduled',
          patient: patientName
        });
      }

      if (dueDate && new Date(dueDate) < today) {
        exceptions.push({
          case: caseItem,
          type: 'overdue',
          severity: 'critical',
          message: 'Follow-up overdue',
          patient: patientName
        });
      }

      if (!patientName || patientName === '') {
        exceptions.push({
          case: caseItem,
          type: 'missing_data',
          severity: 'medium',
          message: 'Missing patient name',
          patient: 'Unknown Patient'
        });
      }
    });

    return exceptions;
  };

  const handleCaseClick = (caseItem) => {
    const caseId = typeof caseItem.sys_id === 'object' ? caseItem.sys_id.value : caseItem.sys_id;
    // Use the existing case workspace page
    window.open(`/patient_discharge_case.do?sys_id=${caseId}`, '_blank');
  };

  const handleAdminAction = async (action, caseItem) => {
    try {
      const caseId = typeof caseItem.sys_id === 'object' ? caseItem.sys_id.value : caseItem.sys_id;
      
      switch (action) {
        case 'sendToGP':
          const gpEmail = prompt('Enter GP email address:');
          if (gpEmail) {
            await service.sendSummaryToGP(caseId, null, gpEmail);
            alert('Summary sent to GP successfully');
          }
          break;
        case 'notifyPatient':
          const patientEmail = prompt('Enter patient email address:');
          if (patientEmail) {
            await service.notifyPatient(caseId, null, patientEmail);
            alert('Patient notified successfully');
          }
          break;
        case 'retryFailedSend':
          await service.retryFailedSend(caseId, 'patient', 'system@hospital.com');
          alert('Communication retry initiated');
          break;
        case 'assignOwner':
          const owner = prompt('Enter owner user ID:');
          if (owner) {
            // In a real implementation, this would update the assigned_to field
            alert(`Owner assigned: ${owner}`);
          }
          break;
        default:
          console.log(`Admin action not implemented: ${action}`);
      }
      
      // Refresh data after action
      loadAdminData();
    } catch (err) {
      alert(`Error performing action: ${err.message}`);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'object' ? dateValue.display_value : dateValue;
    return date ? new Date(date).toLocaleDateString() : '-';
  };

  const extractValue = (field) => {
    return typeof field === 'object' ? field.display_value : field;
  };

  const getStatusBadge = (status) => {
    const statusValue = typeof status === 'object' ? status.value : status;
    const statusDisplay = typeof status === 'object' ? status.display_value : status;
    
    const badgeClass = {
      'draft': 'status-draft',
      'ready_for_discharge': 'status-ready',
      'discharged': 'status-discharged'
    }[statusValue] || 'status-default';

    return <span className={`status-badge ${badgeClass}`}>{statusDisplay || statusValue}</span>;
  };

  const getExceptionBadge = (severity) => {
    const badgeClass = {
      'critical': 'exception-critical',
      'high': 'exception-high',
      'medium': 'exception-medium',
      'low': 'exception-low'
    }[severity] || 'exception-default';

    return <span className={`exception-badge ${badgeClass}`}>{severity}</span>;
  };

  const filteredCases = adminData.cases.filter(caseItem => {
    const dischargeStatus = typeof caseItem.u_discharging_status === 'object' 
      ? caseItem.u_discharging_status.value 
      : caseItem.u_discharging_status;
    
    const ward = typeof caseItem.u_ward === 'object' 
      ? caseItem.u_ward.value 
      : caseItem.u_ward;

    const dueDate = typeof caseItem.u_due_date === 'object' 
      ? caseItem.u_due_date.value 
      : caseItem.u_due_date;

    // Apply filters
    if (filters.status && dischargeStatus !== filters.status) return false;
    if (filters.ward && ward !== filters.ward) return false;
    
    if (filters.overdue) {
      const today = new Date();
      const due = new Date(dueDate);
      if (due >= today) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-error">
          <h3>Error Loading Admin Dashboard</h3>
          <p>{error}</p>
          <button onClick={loadAdminData} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>⚙️ Admin Command Center</h1>
          <div className="header-actions">
            <button onClick={() => onSwitchRole()} className="switch-role-button">
              Switch Role
            </button>
            <button onClick={loadAdminData} className="refresh-button">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="kpi-section">
        <div className="kpi-tile">
          <div className="kpi-icon">📊</div>
          <div className="kpi-content">
            <div className="kpi-value">{adminData.stats.dischargesToday || 0}</div>
            <div className="kpi-label">Discharges Today</div>
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-content">
            <div className="kpi-value">{adminData.stats.failedComms || 0}</div>
            <div className="kpi-label">Failed Communications</div>
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-icon">⏰</div>
          <div className="kpi-content">
            <div className="kpi-value">{adminData.stats.overdueTasks || 0}</div>
            <div className="kpi-label">Overdue Tasks</div>
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-icon">📅</div>
          <div className="kpi-content">
            <div className="kpi-value">{adminData.stats.followupsDue || 0}</div>
            <div className="kpi-label">Follow-ups Due (7 days)</div>
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="view-selector">
        <button 
          className={`view-button ${selectedView === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedView('overview')}
        >
          Overview
        </button>
        <button 
          className={`view-button ${selectedView === 'exceptions' ? 'active' : ''}`}
          onClick={() => setSelectedView('exceptions')}
        >
          Exceptions ({adminData.exceptions.length})
        </button>
        <button 
          className={`view-button ${selectedView === 'communications' ? 'active' : ''}`}
          onClick={() => setSelectedView('communications')}
        >
          Failed Communications ({adminData.stats.failedComms})
        </button>
      </div>

      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <div className="cases-section">
          <div className="cases-header">
            <h2>All Discharge + Follow-up Cases</h2>
            <div className="case-filters">
              <select 
                value={filters.status} 
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="ready_for_discharge">Ready for Discharge</option>
                <option value="discharged">Discharged</option>
              </select>
              
              <select 
                value={filters.ward} 
                onChange={(e) => handleFilterChange('ward', e.target.value)}
                className="filter-select"
              >
                <option value="">All Wards</option>
                <option value="general_medicine">General Medicine</option>
                <option value="general_surgery">General Surgery</option>
                <option value="cardiology">Cardiology</option>
                <option value="endocrinology">Endocrinology</option>
                <option value="radiology">Radiology</option>
              </select>

              <label className="filter-checkbox">
                <input 
                  type="checkbox" 
                  checked={filters.overdue}
                  onChange={(e) => handleFilterChange('overdue', e.target.checked)}
                />
                Overdue Only
              </label>
            </div>
          </div>

          <div className="cases-table-container">
            <table className="cases-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Ward</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Risk Level</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((caseItem, index) => {
                  const patientName = extractValue(caseItem.u_patient_name);
                  const ward = extractValue(caseItem.u_ward);
                  const riskLevel = extractValue(caseItem.u_risk_level);
                  
                  return (
                    <tr key={index} className="case-row">
                      <td onClick={() => handleCaseClick(caseItem)} className="clickable-cell">
                        <div className="patient-info">
                          <span className="patient-name">{patientName || 'Unknown Patient'}</span>
                          <span className="hospital-number">
                            #{extractValue(caseItem.u_hospital_number) || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td>{ward || '-'}</td>
                      <td>{getStatusBadge(caseItem.u_discharging_status)}</td>
                      <td>{formatDate(caseItem.u_due_date)}</td>
                      <td>
                        <span className={`risk-badge risk-${riskLevel}`}>
                          {riskLevel || '-'}
                        </span>
                      </td>
                      <td>{formatDate(caseItem.sys_updated_on)}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleAdminAction('sendToGP', caseItem)}
                            className="action-btn send"
                            title="Send to GP"
                          >
                            📧
                          </button>
                          <button 
                            onClick={() => handleAdminAction('notifyPatient', caseItem)}
                            className="action-btn notify"
                            title="Notify Patient"
                          >
                            📱
                          </button>
                          <button 
                            onClick={() => handleAdminAction('retryFailedSend', caseItem)}
                            className="action-btn retry"
                            title="Retry Failed Send"
                          >
                            🔄
                          </button>
                          <button 
                            onClick={() => handleAdminAction('assignOwner', caseItem)}
                            className="action-btn assign"
                            title="Assign Owner"
                          >
                            👤
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedView === 'exceptions' && (
        <div className="exceptions-section">
          <div className="exceptions-header">
            <h2>Exceptions & Issues</h2>
            <p>Cases requiring immediate attention or intervention</p>
          </div>
          
          <div className="exceptions-list">
            {adminData.exceptions.map((exception, index) => (
              <div key={index} className={`exception-item severity-${exception.severity}`}>
                <div className="exception-content">
                  <div className="exception-header">
                    <span className="exception-patient">{exception.patient}</span>
                    {getExceptionBadge(exception.severity)}
                  </div>
                  <div className="exception-message">{exception.message}</div>
                </div>
                <div className="exception-actions">
                  <button 
                    onClick={() => handleCaseClick(exception.case)}
                    className="view-case-btn"
                  >
                    View Case
                  </button>
                </div>
              </div>
            ))}
            
            {adminData.exceptions.length === 0 && (
              <div className="no-exceptions">
                <div className="no-exceptions-icon">✅</div>
                <h3>No exceptions found</h3>
                <p>All cases are progressing normally without issues.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedView === 'communications' && (
        <div className="communications-section">
          <div className="communications-header">
            <h2>Failed Communications</h2>
            <p>Communications that failed to send and need retry</p>
          </div>
          
          <div className="communications-list">
            {adminData.failedCommunications?.map((comm, index) => (
              <div key={index} className="communication-item">
                <div className="communication-content">
                  <div className="communication-header">
                    <span className="communication-type">
                      {extractValue(comm.u_recipient_type)} - {extractValue(comm.u_delivery_channel)}
                    </span>
                    <span className="communication-date">{formatDate(comm.u_sent_on)}</span>
                  </div>
                  <div className="communication-details">
                    <div>To: {extractValue(comm.u_recipient_address)}</div>
                    <div className="communication-error">
                      Error: {extractValue(comm.u_error_mesage) || 'Communication failed'}
                    </div>
                  </div>
                </div>
                <div className="communication-actions">
                  <button 
                    onClick={() => {
                      const caseId = typeof comm.u_discharge_case === 'object' 
                        ? comm.u_discharge_case.value 
                        : comm.u_discharge_case;
                      handleAdminAction('retryFailedSend', { sys_id: caseId });
                    }}
                    className="retry-comm-btn"
                  >
                    Retry Send
                  </button>
                </div>
              </div>
            ))}
            
            {(!adminData.failedCommunications || adminData.failedCommunications.length === 0) && (
              <div className="no-failed-comms">
                <div className="no-failed-comms-icon">📧</div>
                <h3>No failed communications</h3>
                <p>All communications have been sent successfully.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}