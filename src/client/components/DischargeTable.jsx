import React from 'react';
import './DischargeTable.css';

export default function DischargeTable({ cases, onFilterChange, filters }) {
  const handleFilterChange = (filterName, value) => {
    onFilterChange({
      ...filters,
      [filterName]: value
    });
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'object' ? dateValue.display_value : dateValue;
    return date ? new Date(date).toLocaleDateString() : '-';
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

  const getRiskBadge = (risk) => {
    const riskValue = typeof risk === 'object' ? risk.value : risk;
    const riskDisplay = typeof risk === 'object' ? risk.display_value : risk;
    
    const badgeClass = {
      'high': 'risk-high',
      'moderate': 'risk-moderate',
      'low': 'risk-low'
    }[riskValue] || 'risk-default';

    return <span className={`risk-badge ${badgeClass}`}>{riskDisplay || riskValue || '-'}</span>;
  };

  const handleCaseClick = (caseItem) => {
    const sysId = typeof caseItem.sys_id === 'object' ? caseItem.sys_id.value : caseItem.sys_id;
    window.open(`/patient_discharge_case.do?sys_id=${sysId}`, '_blank');
  };

  return (
    <div className="discharge-table-container">
      <div className="table-header">
        <h2>Discharge Cases</h2>
        <div className="table-filters">
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
            <option value="orthopedics">Orthopedics</option>
          </select>

          <label className="filter-checkbox">
            <input 
              type="checkbox" 
              checked={filters.overdue}
              onChange={(e) => handleFilterChange('overdue', e.target.checked)}
            />
            Overdue
          </label>

          <label className="filter-checkbox">
            <input 
              type="checkbox" 
              checked={filters.readyForDischarge}
              onChange={(e) => handleFilterChange('readyForDischarge', e.target.checked)}
            />
            Ready for Discharge
          </label>

          <label className="filter-checkbox">
            <input 
              type="checkbox" 
              checked={filters.followupDue}
              onChange={(e) => handleFilterChange('followupDue', e.target.checked)}
            />
            Follow-up Due
          </label>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="discharge-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Hospital #</th>
              <th>Ward</th>
              <th>Discharge Status</th>
              <th>Risk Level</th>
              <th>Discharge Date</th>
              <th>Follow-Up Due</th>
              <th>Tasks Complete</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((caseItem, index) => {
              const patientName = typeof caseItem.u_patient_name === 'object' 
                ? caseItem.u_patient_name.display_value 
                : caseItem.u_patient_name;
              
              const hospitalNumber = typeof caseItem.u_hospital_number === 'object' 
                ? caseItem.u_hospital_number.display_value 
                : caseItem.u_hospital_number;

              const ward = typeof caseItem.u_ward === 'object' 
                ? caseItem.u_ward.display_value 
                : caseItem.u_ward;

              const tasksComplete = typeof caseItem.u_tasks_complete === 'object' 
                ? caseItem.u_tasks_complete.display_value 
                : caseItem.u_tasks_complete;

              return (
                <tr key={index} className="table-row" onClick={() => handleCaseClick(caseItem)}>
                  <td className="patient-cell">
                    <div className="patient-info">
                      <div className="patient-name">{patientName || '-'}</div>
                    </div>
                  </td>
                  <td>{hospitalNumber || '-'}</td>
                  <td>{ward || '-'}</td>
                  <td>{getStatusBadge(caseItem.u_discharging_status)}</td>
                  <td>{getRiskBadge(caseItem.u_risk_level)}</td>
                  <td>{formatDate(caseItem.u_discharge_date)}</td>
                  <td>{formatDate(caseItem.u_due_date)}</td>
                  <td>
                    <span className={`tasks-badge ${tasksComplete === 'true' ? 'complete' : 'incomplete'}`}>
                      {tasksComplete === 'true' ? '✓ Complete' : '⧗ Pending'}
                    </span>
                  </td>
                  <td>{formatDate(caseItem.sys_updated_on)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {cases.length === 0 && (
          <div className="no-data">
            <p>No discharge cases found matching the current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}