import React from 'react';
import './AlertsPanel.css';

export default function AlertsPanel({ alertCases }) {
  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'object' ? dateValue.display_value : dateValue;
    return date ? new Date(date).toLocaleDateString() : '-';
  };

  const getAlertType = (caseItem) => {
    const dischargeStatus = typeof caseItem.u_discharging_status === 'object' 
      ? caseItem.u_discharging_status.value 
      : caseItem.u_discharging_status;
    
    const dueDate = typeof caseItem.u_due_date === 'object' 
      ? caseItem.u_due_date.value 
      : caseItem.u_due_date;

    const today = new Date();
    const due = new Date(dueDate);

    if (dischargeStatus === 'discharged') {
      return { type: 'discharged-no-followup', message: 'Discharged but follow-up not scheduled', severity: 'warning' };
    }
    
    if (due < today) {
      return { type: 'overdue', message: 'Follow-up overdue', severity: 'error' };
    }
    
    if (dischargeStatus === 'ready_for_discharge') {
      return { type: 'ready-not-discharged', message: 'Ready but not discharged', severity: 'info' };
    }

    return { type: 'other', message: 'Requires attention', severity: 'warning' };
  };

  const handleCaseClick = (caseItem) => {
    const sysId = typeof caseItem.sys_id === 'object' ? caseItem.sys_id.value : caseItem.sys_id;
    window.open(`/patient_discharge_case.do?sys_id=${sysId}`, '_blank');
  };

  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <h3>🚨 Alerts & Exceptions</h3>
        <span className="alert-count">{alertCases.length}</span>
      </div>
      
      <div className="alerts-list">
        {alertCases.length === 0 ? (
          <div className="no-alerts">
            <div className="no-alerts-icon">✅</div>
            <p>No critical alerts at this time</p>
          </div>
        ) : (
          alertCases.map((caseItem, index) => {
            const alert = getAlertType(caseItem);
            const patientName = typeof caseItem.u_patient_name === 'object' 
              ? caseItem.u_patient_name.display_value 
              : caseItem.u_patient_name;

            const ward = typeof caseItem.u_ward === 'object' 
              ? caseItem.u_ward.display_value 
              : caseItem.u_ward;

            return (
              <div 
                key={index} 
                className={`alert-item alert-${alert.severity}`}
                onClick={() => handleCaseClick(caseItem)}
              >
                <div className="alert-content">
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-patient">
                    <strong>{patientName || 'Unknown Patient'}</strong>
                    {ward && <span className="alert-ward"> • {ward}</span>}
                  </div>
                  <div className="alert-date">
                    Due: {formatDate(caseItem.u_due_date)}
                  </div>
                </div>
                <div className="alert-icon">
                  {alert.severity === 'error' ? '🔴' : 
                   alert.severity === 'warning' ? '🟡' : '🔵'}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}