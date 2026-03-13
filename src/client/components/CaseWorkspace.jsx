import React, { useState, useEffect } from 'react';
import { DischargeCaseService } from '../services/DischargeCaseService.js';
import './CaseWorkspace.css';

export default function CaseWorkspace() {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [userRole, setUserRole] = useState('nurse'); // This should come from user context
  const [actionLoading, setActionLoading] = useState(false);
  const [availableCases, setAvailableCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  // Per-role task completion summary: { doctor: {total,open,complete}, nurse: {...}, pharmacy: {...} }
  const [taskSummaryByRole, setTaskSummaryByRole] = useState(null);

  const service = new DischargeCaseService();

  const [activeUserId, setActiveUserId] = useState('');

  // Modal state for role-specific task flows
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [doctorForm, setDoctorForm] = useState({ u_diagnosis: '', u_hospital_course: '', u_follow_up_instructions: '', u_medication: '' });
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
  const [nurseModalOpen, setNurseModalOpen] = useState(false);

  const USER_ID_BY_ROLE = {
    nurse: '8f8f3711c3cb72100fa7bd43e40131d9',
    doctor: '87efb319c38b72100fa7bd43e4013164',
    pharmacy: 'ac104461c3cb72100fa7bd43e4013197',
    admin: '' // optional: admin sees all, or set to nurse/blank
  };


  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get('sys_id');
    const roleParam = urlParams.get('role') || 'nurse';

    const resolvedRole = Object.prototype.hasOwnProperty.call(USER_ID_BY_ROLE, roleParam) ? roleParam : 'nurse';
    const userId = USER_ID_BY_ROLE[resolvedRole];
    setUserRole(resolvedRole);
    setActiveUserId(userId);

    if (caseId) {
      setSelectedCaseId(caseId);
      loadCaseData(caseId, userId);
    } else {
      // Load available cases for selection
      loadAvailableCases();
    }
  }, []);

  const loadAvailableCases = async () => {
    try {
      setLoading(true);
      const data = await service.getDashboardData();
      setAvailableCases(data.cases || []);
      setError(null);
    } catch (err) {
      setError('Failed to load available cases');
    } finally {
      setLoading(false);
    }
  };

  const areAllTasksComplete = (tasks = []) => {
    if (!tasks.length) return true; // no tasks => nothing to do => hide button
    return tasks.every(t => String(t.state) === '3' || t.state_display === 'Closed Complete');
  };


  const loadCaseData = async (caseId, userIdParam = activeUserId) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading case data for:', caseId);
      const data = await service.getCase(caseId);
      let summary = data.summary;

      if (!summary) {
        try {
          const fallbackSummary = await service.getDischargeSummary(caseId);
          if (fallbackSummary) {
            summary = fallbackSummary;
          }
        } catch (fallbackErr) {
          console.warn('Could not load discharge summary for email tab:', fallbackErr);
        }
      }

      console.log('Case data loaded:', data);
      console.log('Summary from getCase:', data.summary);
      console.log('Summary type:', typeof data.summary);
      console.log('Summary keys:', summary ? Object.keys(summary) : 'null');
      setCaseData({ ...data, summary });
      
      // Load per-role task summary alongside case data
      try {
        const summary = await service.getTaskSummaryByCaseAndUser(caseId, userIdParam);
        console.log('Task summary loaded:', summary);
        setTaskSummaryByRole(summary);
      } catch (summaryErr) {
        console.warn('Could not load task summary by role:', summaryErr);
      }
    } catch (err) {
      console.error('Error loading case data:', err);
      setError(err.message);
      setCaseData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCaseSelection = (caseId) => {
    setSelectedCaseId(caseId);
    loadCaseData(caseId);
    // Update URL to include selected case and active role
    const newUrl = `${window.location.pathname}?sys_id=${caseId}&role=${userRole}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleRoleAction = async (action, params = {}) => {
    try {
      setActionLoading(true);
      let result;
      const caseId = typeof caseData.case.sys_id === 'object' 
        ? caseData.case.sys_id.value 
        : caseData.case.sys_id;

      const summaryId = caseData.summary ? 
        (typeof caseData.summary.sys_id === 'object' 
          ? caseData.summary.sys_id.value 
          : caseData.summary.sys_id) 
        : null;

      /* ============================================
         SWITCH CASE TEMPLATE PATTERNS
         ============================================
         
         Pattern 1: Simple action (no user input)
         -----------------------------------------
         case 'actionName':
           result = await service.methodName(caseId);
           break;
         
         Pattern 2: Action with user input
         -----------------------------------------
         case 'actionWithInput':
           const userInput = prompt('Prompt message:');
           if (userInput) {
             result = await service.methodName(caseId, userInput);
           }
           break;
         
         Pattern 3: Action requiring summary
         -----------------------------------------
         case 'summaryAction':
           if (summaryId) {
             result = await service.methodName(summaryId);
           }
           break;
         
         Pattern 4: Action with multiple inputs
         -----------------------------------------
         case 'multiInputAction':
           const input1 = prompt('First input:');
           const input2 = prompt('Second input:');
           if (input1 && input2) {
             result = await service.methodName(caseId, input1, input2);
           }
           break;
         
         Pattern 5: Action with both caseId and summaryId
         -----------------------------------------
         case 'complexAction':
           const userInput = prompt('Enter details:');
           if (userInput && summaryId) {
             result = await service.methodName(caseId, summaryId, userInput);
           }
           break;
      ============================================ */

      switch (action) {
        // ====================
        // NURSING ACTIONS
        // ====================
        case 'markReadyForDischarge':
          result = await service.markReadyForDischarge(caseId);
          break;
        // OLD: completeDischargeTasks completed ALL tasks regardless of role.
        // REPLACED with 3 per-role actions that call the server-side
        // DischargeTaskService.completeTasksForUser() via REST API.
        // Server enforces RBAC — returns 403 if user lacks the role.
        case 'completeNurseTasks':
          result = await service.completeTasksForUser(caseId, 'nurse');
          break;
        case 'completeDoctorTasks':
          result = await service.completeTasksForUser(caseId, 'doctor');
          break;
        case 'completePharmacyTasks':
          result = await service.completeTasksForUser(caseId, 'pharmacy');
          break;

        // Role-specific task modals
        case 'openDoctorTaskModal':
          setDoctorForm({ u_diagnosis: '', u_hospital_course: '', u_follow_up_instructions: '', u_medication: '' });
          setDoctorModalOpen(true);
          break;
        case 'openPharmacyTaskModal':
          setPharmacyModalOpen(true);
          break;
        case 'openNurseTaskModal':
          setNurseModalOpen(true);
          break;
        case 'completeDoctorTaskWithDetails':
          result = await service.completeDoctorTaskWithDetails(caseId, params);
          break;
          
        // ====================
        // DOCTOR ACTIONS
        // ====================
        case 'requestSummaryReview':
          if (summaryId) {
            result = await service.requestSummaryReview(summaryId);
          }
          break;
        case 'approveSummary':
          if (summaryId) {
            result = await service.approveSummary(summaryId);
          }
          break;
        case 'rejectSummary':
          if (summaryId) {
            const comment = prompt('Please provide a reason for rejection:');
            if (comment) {
              result = await service.rejectSummary(summaryId, comment);
            }
          }
          break;
          
        // ====================
        // PHARMACY ACTIONS
        // ====================
        case 'markMedsReviewed':
          result = await service.markMedsReviewed(caseId);
          break;
        case 'markMedsDispensed':
          result = await service.markMedsDispensed(caseId);
          break;
        case 'requestMedClarification':
          const notes = prompt('Please provide clarification details:');
          if (notes) {
            result = await service.requestMedClarification(caseId, notes);
          }
          break;
          
        // ====================
        // COORDINATOR/ADMIN ACTIONS
        // ====================
        case 'sendSummaryToGP':
          const gpEmail = prompt('Enter GP email address:');
          if (gpEmail && summaryId) {
            result = await service.sendSummaryToGP(caseId, summaryId, gpEmail);
          }
          break;
        case 'notifyPatient':
          const patientEmail = prompt('Enter patient email address:');
          if (patientEmail && summaryId) {
            result = await service.notifyPatient(caseId, summaryId, patientEmail);
          }
          break;
        case 'scheduleFollowUp':
          const followUpDate = prompt('Enter follow-up date (YYYY-MM-DD):');
          const followUpNotes = prompt('Enter follow-up notes:');
          if (followUpDate) {
            result = await service.scheduleFollowUp(caseId, followUpDate, followUpNotes || '');
          }
          break;
        case 'sendFollowUpReminder':
          const reminderEmail = prompt('Enter recipient email address:');
          const recipientType = prompt('Enter recipient type (patient/gp):');
          if (reminderEmail && recipientType) {
            result = await service.sendFollowUpReminder(caseId, recipientType, reminderEmail);
          }
          break;
        case 'markAdminSummarySent':
          if (summaryId) {
            result = await service.markAdminSummarySent(summaryId);
          }
          break;
          
        // ====================
        // DEFAULT HANDLER
        // ====================
        default:
          console.log(`Action not implemented: ${action}`);
      }

      // Show success message and refresh case data
      if (result) {
        if (result.message) {
          alert(`Success: ${result.message}`);
        }
        await loadCaseData(caseId);
      }
    } catch (err) {
      alert(`Error performing action: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'object' ? dateValue.display_value : dateValue;
    return date ? new Date(date).toLocaleDateString() : '-';
  };

  const extractValue = (field) => {
    return typeof field === 'object' ? field.display_value : field;
  };

  const tasksForActiveUser = taskSummaryByRole?.tasks || [];
  const hideMyTasksButton = areAllTasksComplete(tasksForActiveUser);
  /**
   * Returns true when the discharge summary exists and has progressed past
   * the initial draft stage, meaning it is ready to be opened/viewed.
   * Reflects backend truth: button state mirrors actual summary status.
   */
  const isSummaryReady = () => {
    if (!caseData?.summary) return false;
    const status = extractValue(caseData.summary.u_summary_status);
    return status === 'ready_for_review' || status === 'clinician_approved';
  };

  const openDischargeSummary = () => {
    if (userRole !== 'doctor') {
      return;
    }

    const summaryId = caseData?.summary
      ? (typeof caseData.summary.sys_id === 'object'
          ? caseData.summary.sys_id.value
          : caseData.summary.sys_id)
      : null;
    if (summaryId) {
      window.open(`/u_discharge_summary.do?sys_id=${summaryId}`, '_blank');
    }
  };

  const getRoleActions = () => {
    if (!caseData) return [];

    const summaryStatus = extractValue(caseData.summary?.u_summary_status);
    const dischargeStatus = extractValue(caseData.case.u_discharging_status);
    const tasksComplete = extractValue(caseData.case.u_tasks_complete);

    const actions = [];

    // ─── Per-role "Mark MY tasks complete" buttons ───────────────
    // Each role only sees their own button. Admins see all three.
    // Server-side RBAC is the real enforcement; UI hiding is courtesy.

    // Helper: normalize status string for comparison (handles display_value casing)
    const isReadyForDischarge = dischargeStatus && 
      dischargeStatus.toLowerCase().replace(/[\s_-]+/g, '_') === 'ready_for_discharge';

    // If the case is already discharged, hide task-completion and
    // "Mark Ready for Discharge" buttons for ALL roles.
    const isDischarged = dischargeStatus &&
      dischargeStatus.toLowerCase().replace(/[\s_-]+/g, '_') === 'discharged';
    const isDraft = dischargeStatus &&
      dischargeStatus.toLowerCase().replace(/[\s_-]+/g, '_') === 'draft';

    if (userRole === 'nurse') {
      // Only show "Mark Ready for Discharge" if NOT already ready and NOT discharged
      if (!isReadyForDischarge && !isDischarged) {
        actions.push({
          label: 'Mark Ready for Discharge',
          action: 'markReadyForDischarge',
          variant: 'primary'
        });
      }
      // Only show if there are open nurse tasks and case is NOT discharged
      if (isReadyForDischarge && !hideMyTasksButton) {
        actions.push({
          label: 'Confirm discharge info discussed',
          action: 'openNurseTaskModal',
          variant: 'success'
        });
      }
    }

    if (userRole === 'doctor') {
      if (summaryStatus === 'draft') {
        actions.push({
          label: 'Request Summary Review',
          action: 'requestSummaryReview',
          variant: 'secondary'
        });
      }
      if (summaryStatus === 'ready_for_review') {
        actions.push(
          {
            label: 'Approve Summary',
            action: 'approveSummary',
            variant: 'success'
          },
          {
            label: 'Reject Summary',
            action: 'rejectSummary',
            variant: 'danger'
          }
        );
      }
      // Only show if there are open doctor tasks and case is NOT discharged
      if (isReadyForDischarge && !hideMyTasksButton) {
        actions.push({
          label: 'Do my task',
          action: 'openDoctorTaskModal',
          variant: 'success'
        });
      }
    }

    if (userRole === 'pharmacy') {
       if (isReadyForDischarge && !hideMyTasksButton) {
        actions.push(
          {
            label: 'Request Clarification',
            action: 'requestMedClarification',
            variant: 'warning'
          }
        );
      }
      // Only show if there are open pharmacy tasks and case is NOT discharged
      if (isReadyForDischarge && !hideMyTasksButton) {
        actions.push({
          label: 'Do task',
          action: 'openPharmacyTaskModal',
          variant: 'success'
        });
      }
    }

    // Admin sees coordinator-level actions but NOT per-role task-complete
    // buttons or "Mark Meds Reviewed" (those belong to their specific roles).
    if (userRole === 'admin') {
      // Admin can still mark ready for discharge if not already done and NOT discharged
      if (!isReadyForDischarge && !isDischarged && !isDraft) {
        actions.push({
          label: 'Mark Ready for Discharge',
          action: 'markReadyForDischarge',
          variant: 'primary'
        });
      }
      if (summaryStatus === 'clinician_approved') {
        actions.push(
          {
            label: 'Send Summary to GP',
            action: 'sendSummaryToGP',
            variant: 'primary'
          },
          {
            label: 'Notify Patient',
            action: 'notifyPatient',
            variant: 'secondary'
          }
        );
      }
      
      actions.push(
        {
          label: 'Schedule Follow-Up',
          action: 'scheduleFollowUp',
          variant: 'info'
        },
        {
          label: 'Send Follow-Up Reminder',
          action: 'sendFollowUpReminder',
          variant: 'info'
        }
      );
    }

    return actions;
  };

  // Role switching for demo purposes
  const switchRole = (newRole) => {
    setUserRole(newRole);

    const newUserId = USER_ID_BY_ROLE[newRole] || '';
    setActiveUserId(newUserId);

    // Keep URL in sync with selected role so reload/open-in-new-tab preserves context
    const params = new URLSearchParams(window.location.search);
    if (selectedCaseId) {
      params.set('sys_id', selectedCaseId);
    }
    params.set('role', newRole);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    // refresh task data for the currently selected case
    if (selectedCaseId) {
      loadCaseData(selectedCaseId, newUserId);
    }
  };


  // If no case is selected, show case selection interface
  if (!selectedCaseId && !loading) {
    return (
      <div className="case-workspace">
        <div className="case-selection">
          <div className="case-selection-header">
            <h1>Select a Patient Discharge Case</h1>
            <p>Choose a case to view details and perform role-based actions</p>
          </div>
          
          <div className="case-selection-controls">
            <button 
              onClick={() => window.location.href = '/discharge_command_center.do'} 
              className="action-button secondary"
            >
              ← Back to Dashboard
            </button>
            <button onClick={loadAvailableCases} className="action-button primary">
              Refresh Cases
            </button>
          </div>

          {availableCases.length > 0 ? (
            <div className="case-selection-list">
              {availableCases.map((caseItem, index) => {
                const patientName = extractValue(caseItem.u_patient_name);
                const hospitalNumber = extractValue(caseItem.u_hospital_number);
                const ward = extractValue(caseItem.u_ward);
                const dischargeStatus = extractValue(caseItem.u_discharging_status);
                const caseId = typeof caseItem.sys_id === 'object' ? caseItem.sys_id.value : caseItem.sys_id;

                return (
                  <div 
                    key={index} 
                    className="case-selection-item"
                    onClick={() => handleCaseSelection(caseId)}
                  >
                    <div className="case-selection-content">
                      <div className="case-selection-title">
                        <strong>{patientName || 'Unknown Patient'}</strong>
                        <span className="hospital-number">#{hospitalNumber || 'N/A'}</span>
                      </div>
                      <div className="case-selection-details">
                        <span>Ward: {ward || '-'}</span>
                        <span className={`status-badge status-${dischargeStatus}`}>
                          {dischargeStatus || 'Unknown Status'}
                        </span>
                      </div>
                    </div>
                    <div className="case-selection-arrow">→</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-cases-message">
              <h3>No discharge cases found</h3>
              <p>There are currently no discharge cases available to view.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="case-loading">
        <div className="loading-spinner"></div>
        <p>Loading case details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="case-error">
        <h3>Error Loading Case</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={() => window.location.href = '/discharge_command_center.do'} className="action-button secondary">
            ← Back to Dashboard
          </button>
          <button onClick={loadAvailableCases} className="action-button primary">
            Select Different Case
          </button>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return <div className="case-error">No case data available</div>;
  }


  const roleActions = getRoleActions();

  const visibleRoleActions = roleActions.filter(a => {
    // Hide the "complete my tasks" button if user has no open tasks for this case
    if (hideMyTasksButton && (
        a.action === 'completeNurseTasks' ||
        a.action === 'completeDoctorTasks' ||
        a.action === 'completePharmacyTasks' ||
        a.action === 'openDoctorTaskModal' ||
        a.action === 'openPharmacyTaskModal' ||
        a.action === 'openNurseTaskModal'
    )) {
      return false;
    }
    return true;
  });

  const summaryStatus = caseData.summary
    ? typeof caseData.summary.u_summary_status === 'object'
      ? caseData.summary.u_summary_status.value
      : caseData.summary.u_summary_status
    : '';
  const showEmailTab = userRole === 'admin' && summaryStatus === 'clinician_approved';
  const adminSummarySent = caseData.summary
    ? String(
        typeof caseData.summary.u_admin_send_summary === 'object'
          ? caseData.summary.u_admin_send_summary.value
          : caseData.summary.u_admin_send_summary
      ).toLowerCase() === 'true'
    : false;

  return (
    <div className="case-workspace">
      <div className="case-header">
        <div className="case-header-content">
          <div className="case-title">
            <h1>{extractValue(caseData.case.u_patient_name) || 'Unknown Patient'}</h1>
            <div className="case-subtitle">
              Hospital #: {extractValue(caseData.case.u_hospital_number) || '-'} • 
              Ward: {extractValue(caseData.case.u_ward) || '-'}
            </div>
          </div>
        <div className="case-actions">
          <button 
            onClick={() => window.location.href = '/discharge_command_center.do'} 
            className="action-button secondary"
          >
              ← Dashboard
            </button>
            {/* Role switcher for demo */}
            <div className="role-switcher">
              <select value={userRole} onChange={(e) => switchRole(e.target.value)} className="role-select">
                <option value="nurse">Nurse</option>
                <option value="doctor">Doctor</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {visibleRoleActions.map((action, index) => (
              <button
                key={index}
                className={`action-button ${action.variant}`}
                onClick={() => handleRoleAction(action.action)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : action.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="case-status-bar">
          <div className="status-item">
            <label>Discharge Status:</label>
            <span className={`status-value status-${extractValue(caseData.case.u_discharging_status)}`}>
              {extractValue(caseData.case.u_discharging_status) || '-'}
            </span>
          </div>
          <div className="status-item">
            <label>Discharge Date:</label>
            <span>{formatDate(caseData.case.u_discharge_date)}</span>
          </div>
          <div className="status-item">
            <label>Summary Status:</label>
            <span className={`status-value status-${extractValue(caseData.summary?.u_summary_status)}`}>
              {extractValue(caseData.summary?.u_summary_status) || 'Not Available'}
            </span>
          </div>
          <div className="status-item">
            <label>Follow-Up Due:</label>
            <span>{formatDate(caseData.case.u_due_date)}</span>
          </div>
          <div className="status-item">
            <label>Tasks Complete:</label>
            <span className={`tasks-badge ${extractValue(caseData.case.u_tasks_complete) === 'true' ? 'complete' : 'incomplete'}`}>
              {extractValue(caseData.case.u_tasks_complete) === 'true' ? '✓ Complete' : '⧗ Pending'}
            </span>
          </div>
        </div>
      </div>

      <div className="case-tabs">
        <div className="tab-nav">
          {[
            { id: 'overview', label: 'Overview' },
            ...(!['doctor', 'nurse', 'pharmacy'].includes(userRole) ? [{ id: 'tasks', label: 'Tasks' }] : []),
            ...(userRole !== 'pharmacy' ? [{ id: 'summary', label: 'Discharge Summary' }] : []),
            ...(showEmailTab
              ? [{ id: 'email', label: 'Email' }]
              : []),
            ...(userRole === 'pharmacy' ? [{ id: 'pharmacy', label: 'Pharmacy' }] : []),
            ...(userRole !== 'pharmacy' ? [{ id: 'followup', label: 'Follow-Up Plan' }] : []),
            { id: 'communications', label: 'Communication Log' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="tab-panel">
              <div className="overview-grid">
                <div className="overview-section">
                  <h3>Case Information</h3>
                  <div className="field-group">
                    <div className="field">
                      <label>Patient Name:</label>
                      <span>{extractValue(caseData.case.u_patient_name) || '-'}</span>
                    </div>
                    <div className="field">
                      <label>Hospital Number:</label>
                      <span>{extractValue(caseData.case.u_hospital_number) || '-'}</span>
                    </div>
                    <div className="field">
                      <label>Ward:</label>
                      <span>{extractValue(caseData.case.u_ward) || '-'}</span>
                    </div>
                    <div className="field">
                      <label>Risk Level:</label>
                      <span className={`risk-badge risk-${extractValue(caseData.case.u_risk_level)}`}>
                        {extractValue(caseData.case.u_risk_level) || '-'}
                      </span>
                    </div>
                    <div className="field">
                      <label>Tasks Complete:</label>
                      <span className={`tasks-badge ${extractValue(caseData.case.u_tasks_complete) === 'true' ? 'complete' : 'incomplete'}`}>
                        {extractValue(caseData.case.u_tasks_complete) === 'true' ? '✓ Complete' : '⧗ Pending'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="overview-section">
                  <h3>Status Timeline</h3>
                  <div className="timeline">
                    <div className="timeline-item">
                      <span className="timeline-date">{formatDate(caseData.case.sys_created_on)}</span>
                      <span className="timeline-event">Case Created</span>
                    </div>
                    {caseData.summary && (
                      <div className="timeline-item">
                        <span className="timeline-date">{formatDate(caseData.summary.sys_created_on)}</span>
                        <span className="timeline-event">Summary Generated</span>
                      </div>
                    )}
                    {caseData.summary?.u_approved_on && (
                      <div className="timeline-item">
                        <span className="timeline-date">{formatDate(caseData.summary.u_approved_on)}</span>
                        <span className="timeline-event">Summary Approved</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="tab-panel">
              <h3>Related Discharge Tasks</h3>

              {/* ─── Per-Role Task Summary Tiles ─── */}
              {taskSummaryByRole && (
                <div className="task-summary-by-role">
                  {['nurse', 'doctor', 'pharmacy'].map(role => {
                    const roleTasks = (caseData?.tasks || []).filter(
                      t => String(t.assigned_to || '') === String(USER_ID_BY_ROLE[role])
                    );
                    const hideMyTasksButton = areAllTasksComplete(tasksForActiveUser);

                    if (roleTasks.length === 0) return null;

                    const total = roleTasks.length;
                    const open = roleTasks.filter(t => String(t.state) !== '3').length;
                    const complete = total - open;

                    const s = { total, open, complete };
                    if (!s || s.total === 0) return null;
                    const allDone = s.open === 0;
                    const hideThisRoleButton = hideMyTasksButton && userRole === role;
                    return (
                      <div key={role} className={`role-task-tile ${allDone ? 'complete' : 'pending'}`}>
                        <div className="role-task-tile-header">
                          <strong>{role.charAt(0).toUpperCase() + role.slice(1)}</strong>
                          <span className={`tasks-badge ${allDone ? 'complete' : 'incomplete'}`}>
                            {allDone ? '\u2713 All Done' : `${s.open} open`}
                          </span>
                        </div>
                        <div className="role-task-tile-body">
                          <span>{s.complete}/{s.total} complete</span>
                          {!hideThisRoleButton  && (userRole === role || userRole === 'admin') && (
                            <button
                              className="action-button success small"
                              onClick={() => {
                                const actionMap = { doctor: 'openDoctorTaskModal', pharmacy: 'openPharmacyTaskModal', nurse: 'openNurseTaskModal' };
                                handleRoleAction(actionMap[role] || `complete${role.charAt(0).toUpperCase() + role.slice(1)}Tasks`);
                              }}
                              disabled={actionLoading}
                            >
                              {actionLoading ? 'Processing...' : { doctor: 'Do my task', pharmacy: 'Do task', nurse: 'Confirm discharge info discussed' }[role] || `Mark ${role} tasks complete`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ─── Individual Task List ─── */}
              {(caseData.tasks || []).length > 0 ? (
                <div className="tasks-list">
                  {caseData.tasks.map((task, index) => (
                    <div key={index} className="task-item">
                      <div className="task-header">
                        <span className="task-title">{extractValue(task.short_description) || 'Unnamed Task'}</span>
                        <span className={`task-state state-${extractValue(task.state)}`}>
                          {extractValue(task.state)}
                        </span>
                      </div>
                      <div className="task-details">
                        <span>Assigned: {extractValue(task.assigned_to) || 'Unassigned'}</span>
                        <span>Due: {formatDate(task.due_date)}</span>
                        {extractValue(task.u_provider_role) && (
                          <span className={`role-badge role-${extractValue(task.u_provider_role)}`}>
                            {extractValue(task.u_provider_role)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No tasks found for this case.</p>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="tab-panel">
              <div className="summary-tab-header">
                <h3>Discharge Summary</h3>
                <button
                  className="action-button primary"
                  onClick={openDischargeSummary}
                  disabled={userRole !== 'doctor' || !isSummaryReady()}
                  title={
                    userRole !== 'doctor'
                      ? 'Only doctor can open discharge summary'
                      : (isSummaryReady() ? 'Open discharge summary record' : 'Summary is not yet ready')
                  }
                >
                  Open Summary
                </button>
              </div>
              {caseData.summary ? (
                <div className="summary-content">
                  <div className="summary-header">
                    <div className="summary-status-info">
                      <span className="summary-label">Status:</span>
                      <span className={`status-badge status-${extractValue(caseData.summary.u_summary_status)}`}>
                        {extractValue(caseData.summary.u_summary_status) || 'Draft'}
                      </span>
                    </div>
                    {caseData.summary.u_approved_on && (
                      <div className="summary-approval-info">
                        <span className="summary-label">Approved:</span>
                        <span>{formatDate(caseData.summary.u_approved_on)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="summary-field">
                    <label>Clinical Summary:</label>
                    <div className="clinical-summary-text">
                      {extractValue(caseData.summary.u_clinical_summary) || 'No clinical summary available'}
                    </div>
                  </div>
                  
                  <div className="summary-footer">
                    <small>Last updated: {formatDate(caseData.summary.sys_updated_on)}</small>
                  </div>
                </div>
              ) : (
                <p>No discharge summary available for this case.</p>
              )}
            </div>
          )}

          {activeTab === 'pharmacy' && (
            <div className="tab-panel">
              <h3>Pharmacy Information</h3>
              <div className="pharmacy-actions">
                <h4>Medication Status</h4>
                {caseData.summary?.u_medications_on_discharge ? (
                  <div className="medication-list">
                    <p><strong>Medications:</strong></p>
                    <div className="medication-text">{extractValue(caseData.summary.u_medications_on_discharge)}</div>
                  </div>
                ) : (
                  <p>No medication information available.</p>
                )}
                
                {userRole === 'pharmacy' && (
                  <div className="pharmacy-action-buttons">
                    <button onClick={() => handleRoleAction('markMedsReviewed')} className="action-button primary">
                      Mark Meds Reviewed
                    </button>
                    <button onClick={() => handleRoleAction('markMedsDispensed')} className="action-button success">
                      Mark Dispensed
                    </button>
                    <button onClick={() => handleRoleAction('requestMedClarification')} className="action-button warning">
                      Request Clarification
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'followup' && (
            <div className="tab-panel">
              <h3>Follow-Up Plan</h3>
              <div className="followup-info">
                <div className="field">
                  <label>Follow-up Due Date:</label>
                  <span>{formatDate(caseData.case.u_due_date)}</span>
                </div>
                {caseData.summary && (
                  <div className="field">
                    <label>Follow-up Instructions:</label>
                    <div>{extractValue(caseData.summary.u_follow_up_instructions) || 'Not provided'}</div>
                  </div>
                )}
                
                {userRole === 'admin' && (
                  <div className="followup-actions">
                    <button onClick={() => handleRoleAction('scheduleFollowUp')} className="action-button info">
                      Schedule Follow-Up
                    </button>
                    <button onClick={() => handleRoleAction('sendFollowUpReminder')} className="action-button info">
                      Send Follow-Up Reminder
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="tab-panel">
              <h3>Email</h3>
              <div className="email-info">
                <div className="field">
                  <label>Patient Email:</label>
                  <span>{extractValue(caseData.summary?.u_email) || 'Not Available'}</span>
                </div>
                <div className="field">
                  <label>Admin Send Summary:</label>
                  <span>{adminSummarySent ? 'Sent' : 'Not Sent'}</span>
                </div>
                <div className="email-actions">
                  <button
                    className="action-button primary"
                    onClick={() => handleRoleAction('markAdminSummarySent')}
                    disabled={actionLoading || adminSummarySent}
                  >
                    {actionLoading ? 'Processing...' : 'Set Admin Send Summary'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'communications' && (
            <div className="tab-panel">
              <h3>Communication Log</h3>
              {caseData.communicationLog.length > 0 ? (
                <div className="comm-log">
                  {caseData.communicationLog.map((comm, index) => (
                    <div key={index} className="comm-entry">
                      <div className="comm-header">
                        <span className="comm-type">{extractValue(comm.u_recipient_type)} - {extractValue(comm.u_delivery_channel)}</span>
                        <span className="comm-date">{formatDate(comm.u_sent_on)}</span>
                      </div>
                      <div className="comm-details">
                        <span className={`comm-status status-${extractValue(comm.u_delivery_status)}`}>
                          {extractValue(comm.u_delivery_status)}
                        </span>
                        {extractValue(comm.u_recipient_address) && (
                          <span>To: {extractValue(comm.u_recipient_address)}</span>
                        )}
                      </div>
                      {extractValue(comm.u_error_mesage) && (
                        <div className="comm-error">Error: {extractValue(comm.u_error_mesage)}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No communication log entries found.</p>
              )}
              
              {userRole === 'admin' && (
                <div className="comm-actions">
                  <button onClick={() => handleRoleAction('sendSummaryToGP')} className="action-button primary">
                    Send Summary to GP
                  </button>
                  <button onClick={() => handleRoleAction('notifyPatient')} className="action-button secondary">
                    Notify Patient
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Doctor Task Modal ─── */}
      {doctorModalOpen && (
        <div className="task-modal-overlay" onClick={() => setDoctorModalOpen(false)}>
          <div className="task-modal" onClick={e => e.stopPropagation()}>
            <div className="task-modal-header">
              <h3>Complete Discharge Details</h3>
              <button className="task-modal-close" onClick={() => setDoctorModalOpen(false)}>✕</button>
            </div>
            <div className="task-modal-body">
              <div className="task-modal-field">
                <label>Diagnosis</label>
                <textarea
                  value={doctorForm.u_diagnosis}
                  onChange={e => setDoctorForm(f => ({ ...f, u_diagnosis: e.target.value }))}
                  rows={2}
                  placeholder="Enter diagnosis..."
                />
              </div>
              <div className="task-modal-field">
                <label>Hospital Course</label>
                <textarea
                  value={doctorForm.u_hospital_course}
                  onChange={e => setDoctorForm(f => ({ ...f, u_hospital_course: e.target.value }))}
                  rows={3}
                  placeholder="Describe the hospital course..."
                />
              </div>
              <div className="task-modal-field">
                <label>Follow-Up Instructions</label>
                <textarea
                  value={doctorForm.u_follow_up_instructions}
                  onChange={e => setDoctorForm(f => ({ ...f, u_follow_up_instructions: e.target.value }))}
                  rows={2}
                  placeholder="Enter follow-up instructions..."
                />
              </div>
              <div className="task-modal-field">
                <label>Medication</label>
                <textarea
                  value={doctorForm.u_medication}
                  onChange={e => setDoctorForm(f => ({ ...f, u_medication: e.target.value }))}
                  rows={2}
                  placeholder="Enter prescribed medication..."
                />
              </div>
            </div>
            <div className="task-modal-footer">
              <button className="action-button secondary" onClick={() => setDoctorModalOpen(false)}>Cancel</button>
              <button
                className="action-button success"
                disabled={actionLoading}
                onClick={async () => {
                  setDoctorModalOpen(false);
                  await handleRoleAction('completeDoctorTaskWithDetails', doctorForm);
                }}
              >
                {actionLoading ? 'Processing...' : 'Submit & Complete Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Pharmacy Task Modal ─── */}
      {pharmacyModalOpen && (
        <div className="task-modal-overlay" onClick={() => setPharmacyModalOpen(false)}>
          <div className="task-modal" onClick={e => e.stopPropagation()}>
            <div className="task-modal-header">
              <h3>Dispense Medication</h3>
              <button className="task-modal-close" onClick={() => setPharmacyModalOpen(false)}>✕</button>
            </div>
            <div className="task-modal-body">
              <div className="task-modal-field">
                <label>Prescribed Medication</label>
                <div className="task-modal-preview">
                  {extractValue(caseData.case.u_medication) || 'No medication information available.'}
                </div>
              </div>
            </div>
            <div className="task-modal-footer">
              <button className="action-button secondary" onClick={() => setPharmacyModalOpen(false)}>Cancel</button>
              <button
                className="action-button success"
                disabled={actionLoading}
                onClick={async () => {
                  setPharmacyModalOpen(false);
                  await handleRoleAction('completePharmacyTasks');
                }}
              >
                {actionLoading ? 'Processing...' : 'Dispense Medication'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Nurse Task Modal ─── */}
      {nurseModalOpen && (
        <div className="task-modal-overlay" onClick={() => setNurseModalOpen(false)}>
          <div className="task-modal" onClick={e => e.stopPropagation()}>
            <div className="task-modal-header">
              <h3>Confirm Discharge Discussion</h3>
              <button className="task-modal-close" onClick={() => setNurseModalOpen(false)}>✕</button>
            </div>
            <div className="task-modal-body">
              <div className="task-modal-field">
                <label>Follow-Up Instructions</label>
                <div className="task-modal-preview">
                  {extractValue(caseData.case.u_follow_up_instructions) || 'No follow-up instructions available.'}
                </div>
              </div>
            </div>
            <div className="task-modal-footer">
              <button className="action-button secondary" onClick={() => setNurseModalOpen(false)}>Cancel</button>
              <button
                className="action-button success"
                disabled={actionLoading}
                onClick={async () => {
                  setNurseModalOpen(false);
                  await handleRoleAction('completeNurseTasks');
                }}
              >
                {actionLoading ? 'Processing...' : 'Discussed with Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
