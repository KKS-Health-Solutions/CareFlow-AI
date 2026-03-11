import React, { useState, useEffect } from 'react';
import { DischargeCaseService } from '../services/DischargeCaseService.js';
import Navigation from './Navigation.jsx';
import './DoctorDashboard.css';

export default function DoctorDashboard({ onSwitchRole }) {
  const [doctorData, setDoctorData] = useState({ cases: [], stats: {} });
  const [myTasksData, setMyTasksData] = useState({ cases: [], tasks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('doctor-signoff');
  const [taskFilters, setTaskFilters] = useState({ status: '', mrn: '' });

  const service = new DischargeCaseService();

  useEffect(() => {
    loadViewData(currentView);
  }, [currentView]);

  const loadViewData = async (view) => {
    try {
      setLoading(true);
      if (view === 'my-tasks') {
        const data = await service.getMyTasks('doctor');
        setMyTasksData(data);
      } else {
        const data = await service.getDoctorSignoffQueue();
        setDoctorData(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (viewId) => {
    setCurrentView(viewId);
  };

  const handleCaseClick = (caseItem) => {
    const caseId = typeof caseItem.sys_id === 'object' ? caseItem.sys_id.value : caseItem.sys_id;
    // Use the existing case workspace page
    window.open(`/patient_discharge_case.do?sys_id=${caseId}&role=doctor`, '_blank');
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'object' ? dateValue.display_value : dateValue;
    return date ? new Date(date).toLocaleDateString() : '-';
  };

  const extractValue = (field) => {
    return typeof field === 'object' ? field.display_value : field;
  };

  const getStatusBadge = (status, type = 'default') => {
    const statusValue = typeof status === 'object' ? status.value : status;
    const statusDisplay = typeof status === 'object' ? status.display_value : status;
    
    let badgeClass = 'status-default';
    
    if (type === 'discharge') {
      badgeClass = {
        'draft': 'status-draft',
        'ready_for_discharge': 'status-ready',
        'discharged': 'status-discharged'
      }[statusValue] || 'status-default';
    } else if (type === 'summary') {
      badgeClass = {
        'draft': 'status-draft',
        'ready_for_review': 'status-pending',
        'clinician_approved': 'status-approved',
        'sent': 'status-complete'
      }[statusValue] || 'status-default';
    } else if (type === 'approval') {
      badgeClass = {
        'approved': 'status-approved',
        'rejected': 'status-rejected',
        'requested': 'status-pending'
      }[statusValue] || 'status-default';
    }

    return <span className={`status-badge ${badgeClass}`}>{statusDisplay || statusValue || '-'}</span>;
  };

  const getUrgencyIndicator = (caseItem) => {
    const dueDate = typeof caseItem.u_due_date === 'object' ? caseItem.u_due_date.value : caseItem.u_due_date;
    const dischargeStatus = typeof caseItem.u_discharging_status === 'object' 
      ? caseItem.u_discharging_status.value 
      : caseItem.u_discharging_status;

    const today = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (dischargeStatus === 'ready_for_discharge' && daysUntilDue <= 0) {
      return <span className="urgency-indicator urgent">🔴 Overdue</span>;
    } else if (dischargeStatus === 'ready_for_discharge' && daysUntilDue <= 1) {
      return <span className="urgency-indicator high">🟡 Due Today</span>;
    } else if (daysUntilDue <= 2) {
      return <span className="urgency-indicator medium">🟠 Due Soon</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="app-container">
        <Navigation currentView={currentView} onNavigate={handleNavigate} userRole="doctor" onSwitchRole={onSwitchRole} />
        <div className="main-content">
          <div className="doctor-dashboard">
            <div className="dashboard-loading">
              <div className="loading-spinner"></div>
              <p>Loading Doctor Dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <Navigation currentView={currentView} onNavigate={handleNavigate} userRole="doctor" onSwitchRole={onSwitchRole} />
        <div className="main-content">
          <div className="doctor-dashboard">
            <div className="dashboard-error">
              <h3>Error Loading Doctor Dashboard</h3>
              <p>{error}</p>
              <button onClick={() => loadViewData(currentView)} className="retry-button">Retry</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navigation currentView={currentView} onNavigate={handleNavigate} userRole="doctor" onSwitchRole={onSwitchRole} />
      <div className="main-content">
        <div className="doctor-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1 style={{ marginRight: '10px' }}>👨‍⚕️ Doctor Sign-off</h1>
          <div className="header-actions">
            <button onClick={() => loadViewData(currentView)} className="refresh-button">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {currentView === 'my-tasks' ? (
        /* ═══════════════ MY TASKS VIEW ═══════════════ */
        <div className="my-tasks-section">
          <div className="tasks-filters" style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by MRN or patient name..."
              value={taskFilters.mrn}
              onChange={e => setTaskFilters(f => ({ ...f, mrn: e.target.value }))}
              className="filter-input"
              style={{ width: '280px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
            />
            <select
              value={taskFilters.status}
              onChange={e => setTaskFilters(f => ({ ...f, status: e.target.value }))}
              className="filter-select"
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', background: '#fff' }}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="3">Closed Complete</option>
            </select>
          </div>
          <div className="tasks-table-container">
            <table className="cases-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {myTasksData.tasks.filter(task => {
                  const state = typeof task.state === 'object' ? task.state.value : task.state;
                  const patientName = (extractValue(task.patient_name) || '').toLowerCase();
                  const hospitalNumber = (extractValue(task.hospital_number) || '').toLowerCase();
                  const search = taskFilters.mrn.toLowerCase();
                  if (taskFilters.status === 'open' && (state === '3' || state === '4')) return false;
                  if (taskFilters.status === '3' && state !== '3') return false;
                  if (search && !patientName.includes(search) && !hospitalNumber.includes(search)) return false;
                  return true;
                }).map((task, index) => {
                  const taskDesc = extractValue(task.short_description);
                  const state = typeof task.state === 'object' ? task.state.value : task.state;
                  const stateDisplay = typeof task.state === 'object' ? task.state.display_value : task.state;
                  const priorityDisplay = extractValue(task.priority);
                  const patientName = extractValue(task.patient_name);
                  const hospitalNumber = extractValue(task.hospital_number);
                  const caseId = typeof task.u_discharge_case === 'object' ? task.u_discharge_case.value : task.u_discharge_case;

                  return (
                    <tr key={index} className="case-row" onClick={() => window.open(`/patient_discharge_case.do?sys_id=${caseId}&role=doctor`, '_blank')}>
                      <td>
                        <div className="patient-info">
                          <span className="patient-name">{patientName || 'Unknown Patient'}</span>
                          {hospitalNumber && <span className="hospital-number">#{hospitalNumber}</span>}
                        </div>
                      </td>
                      <td>{taskDesc || 'Task'}</td>
                      <td>
                        <span className={`status-badge ${state === '3' ? 'status-discharged' : state === '2' ? 'status-ready' : 'status-draft'}`}>
                          {stateDisplay || 'New'}
                        </span>
                      </td>
                      <td>{priorityDisplay || '-'}</td>
                      <td>{formatDate(task.due_date)}</td>
                      <td>{formatDate(task.sys_updated_on)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {myTasksData.tasks.filter(task => {
              const state = typeof task.state === 'object' ? task.state.value : task.state;
              const patientName = (extractValue(task.patient_name) || '').toLowerCase();
              const hospitalNumber = (extractValue(task.hospital_number) || '').toLowerCase();
              const search = taskFilters.mrn.toLowerCase();
              if (taskFilters.status === 'open' && (state === '3' || state === '4')) return false;
              if (taskFilters.status === '3' && state !== '3') return false;
              if (search && !patientName.includes(search) && !hospitalNumber.includes(search)) return false;
              return true;
            }).length === 0 && (
              <div className="no-cases">
                <div className="no-cases-icon">✅</div>
                <h3>{myTasksData.tasks.length === 0 ? 'No tasks assigned to you' : 'No tasks match your filters'}</h3>
                <p>{myTasksData.tasks.length === 0 ? 'You have no outstanding discharge tasks.' : 'Try adjusting the search or status filter.'}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ═══════════════ SIGN-OFF QUEUE VIEW ═══════════════ */
        <React.Fragment>

      {/* KPI Tiles */}
      <div className="kpi-section">
        <div className="kpi-tile">
          <div className="kpi-icon">📋</div>
          <div className="kpi-content">
            <div className="kpi-value">{doctorData.stats.awaitingApproval || 0}</div>
            <div className="kpi-label">Summaries Awaiting Approval</div>
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-icon">📅</div>
          <div className="kpi-content">
            <div className="kpi-value">{doctorData.stats.followupsNotScheduled || 0}</div>
            <div className="kpi-label">Follow-ups Not Scheduled</div>
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-icon">⏰</div>
          <div className="kpi-content">
            <div className="kpi-value">{doctorData.stats.dueToday || 0}</div>
            <div className="kpi-label">Cases Due Today</div>
          </div>
        </div>
      </div>

      {/* Cases Needing Doctor Action */}
      <div className="cases-section">
        <div className="cases-header">
          <h2>Cases Needing Doctor Action</h2>
          <p className="cases-subtitle">Cases requiring summary review, approval, or follow-up planning</p>
        </div>

        <div className="cases-table-container">
          <table className="cases-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Ward</th>
                <th>Discharge Status</th>
                <th>Summary Status</th>
                <th>Approval Status</th>
                <th>Follow-up Status</th>
                <th>Due Date</th>
                <th>Assigned Clinician</th>
                <th>Urgency</th>
              </tr>
            </thead>
            <tbody>
              {doctorData.cases.map((caseItem, index) => {
                const patientName = extractValue(caseItem.u_patient_name);
                const ward = extractValue(caseItem.u_ward);
                const assignedClinician = extractValue(caseItem.assigned_clinician) || 'Unassigned';
                
                // Get related summary data if available
                const summary = doctorData.summaries?.find(s => 
                  (typeof s.u_discharge_case === 'object' ? s.u_discharge_case.value : s.u_discharge_case) ===
                  (typeof caseItem.sys_id === 'object' ? caseItem.sys_id.value : caseItem.sys_id)
                );

                return (
                  <tr key={index} className="case-row" onClick={() => handleCaseClick(caseItem)}>
                    <td>
                      <div className="patient-info">
                        <span className="patient-name">{patientName || 'Unknown Patient'}</span>
                        <span className="hospital-number">
                          #{extractValue(caseItem.u_hospital_number) || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td>{ward || '-'}</td>
                    <td>{getStatusBadge(caseItem.u_discharging_status, 'discharge')}</td>
                    <td>{summary ? getStatusBadge(summary.u_summary_status, 'summary') : 'No Summary'}</td>
                    <td>{summary ? getStatusBadge(summary.u_clinician_approved ? 'approved' : 'pending', 'approval') : '-'}</td>
                    <td>
                      {caseItem.u_due_date ? 
                        <span className="followup-scheduled">📅 Scheduled</span> : 
                        <span className="followup-missing">❌ Not Scheduled</span>
                      }
                    </td>
                    <td>{formatDate(caseItem.u_due_date)}</td>
                    <td>{assignedClinician}</td>
                    <td>{getUrgencyIndicator(caseItem)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {doctorData.cases.length === 0 && (
            <div className="no-cases">
              <div className="no-cases-icon">✅</div>
              <h3>No cases requiring action</h3>
              <p>All discharge summaries are approved and follow-up plans are complete.</p>
            </div>
          )}
        </div>
      </div>
      </React.Fragment>
      )}
    </div>
      </div>
    </div>
  );
}

