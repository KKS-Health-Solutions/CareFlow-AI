import React, { useState, useEffect } from 'react';
import { DischargeCaseService } from '../services/DischargeCaseService.js';
import './PharmacyDashboard.css';

export default function PharmacyDashboard({ onSwitchRole }) {
  const [pharmacyData, setPharmacyData] = useState({ tasks: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    assignedToMe: false,
    open: false,
    dueToday: false,
    overdue: false
  });

  const service = new DischargeCaseService();

  useEffect(() => {
    loadPharmacyData();
  }, []);

  const loadPharmacyData = async () => {
    try {
      setLoading(true);
      const data = await service.getPharmacyTasks();
      setPharmacyData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleTaskClick = (task) => {
    const taskId = typeof task.sys_id === 'object' ? task.sys_id.value : task.sys_id;
    window.open(`/pharmacy_task.do?sys_id=${taskId}`, '_blank');
  };

  const filteredTasks = pharmacyData.tasks.filter(task => {
    const state = typeof task.state === 'object' ? task.state.value : task.state;
    const dueDate = typeof task.due_date === 'object' ? task.due_date.value : task.due_date;
    const assignedTo = typeof task.assigned_to === 'object' ? task.assigned_to.value : task.assigned_to;
    
    // Apply filters
    if (filters.assignedToMe && assignedTo !== 'current_user') return false; // In real app, check against actual user
    if (filters.open && state !== '2') return false; // State 2 = Work in Progress
    
    if (filters.dueToday) {
      const today = new Date().toISOString().split('T')[0];
      const taskDueDate = new Date(dueDate).toISOString().split('T')[0];
      if (taskDueDate !== today) return false;
    }
    
    if (filters.overdue) {
      const today = new Date();
      const due = new Date(dueDate);
      if (due >= today) return false;
    }

    return true;
  });

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'object' ? dateValue.display_value : dateValue;
    return date ? new Date(date).toLocaleDateString() : '-';
  };

  const extractValue = (field) => {
    return typeof field === 'object' ? field.display_value : field;
  };

  const getTaskTypeIcon = (description) => {
    const desc = (description || '').toLowerCase();
    if (desc.includes('reconciliation')) return '📋';
    if (desc.includes('dispense')) return '💊';
    if (desc.includes('clarification')) return '❓';
    return '⚕️';
  };

  const getStateColor = (state) => {
    const stateValue = typeof state === 'object' ? state.value : state;
    switch (stateValue) {
      case '1': return 'state-new';
      case '2': return 'state-progress';
      case '3': return 'state-complete';
      case '-5': return 'state-closed';
      default: return 'state-default';
    }
  };

  const getPriorityColor = (priority) => {
    const priorityValue = typeof priority === 'object' ? priority.value : priority;
    switch (priorityValue) {
      case '1': return 'priority-critical';
      case '2': return 'priority-high';
      case '3': return 'priority-moderate';
      case '4': return 'priority-low';
      default: return 'priority-default';
    }
  };

  if (loading) {
    return (
      <div className="pharmacy-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading Pharmacy Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pharmacy-dashboard">
        <div className="dashboard-error">
          <h3>Error Loading Pharmacy Dashboard</h3>
          <p>{error}</p>
          <button onClick={loadPharmacyData} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pharmacy-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>💊 Pharmacy Inbox</h1>
          <div className="header-actions">
            <button onClick={() => onSwitchRole()} className="switch-role-button">
              Switch Role
            </button>
            <button onClick={loadPharmacyData} className="refresh-button">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="kpi-section">
        <div className="kpi-tile">
          <div className="kpi-icon">📋</div>
          <div className="kpi-content">
            <div className="kpi-value">{pharmacyData.stats.openTasks || 0}</div>
            <div className="kpi-label">Pharmacy Tasks Open</div>
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-icon">📅</div>
          <div className="kpi-content">
            <div className="kpi-value">{pharmacyData.stats.dueToday || 0}</div>
            <div className="kpi-label">Tasks Due Today</div>
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-content">
            <div className="kpi-value">{pharmacyData.stats.overdue || 0}</div>
            <div className="kpi-label">Overdue Tasks</div>
          </div>
        </div>
      </div>

      {/* Main Task List */}
      <div className="tasks-section">
        <div className="tasks-header">
          <h2>Pharmacy Tasks</h2>
          <div className="task-filters">
            <label className="filter-checkbox">
              <input 
                type="checkbox" 
                checked={filters.assignedToMe}
                onChange={(e) => handleFilterChange('assignedToMe', e.target.checked)}
              />
              Assigned to me
            </label>
            <label className="filter-checkbox">
              <input 
                type="checkbox" 
                checked={filters.open}
                onChange={(e) => handleFilterChange('open', e.target.checked)}
              />
              Open
            </label>
            <label className="filter-checkbox">
              <input 
                type="checkbox" 
                checked={filters.dueToday}
                onChange={(e) => handleFilterChange('dueToday', e.target.checked)}
              />
              Due today
            </label>
            <label className="filter-checkbox">
              <input 
                type="checkbox" 
                checked={filters.overdue}
                onChange={(e) => handleFilterChange('overdue', e.target.checked)}
              />
              Overdue
            </label>
          </div>
        </div>

        <div className="tasks-table-container">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Case</th>
                <th>Task Type</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Assigned To</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task, index) => {
                const dischargeCase = extractValue(task.u_discharge_case);
                const patientName = extractValue(task.patient_name) || 'Unknown Patient';
                const taskDescription = extractValue(task.short_description);
                
                return (
                  <tr key={index} className="task-row" onClick={() => handleTaskClick(task)}>
                    <td>
                      <div className="patient-info">
                        <span className="patient-name">{patientName}</span>
                      </div>
                    </td>
                    <td>{dischargeCase || '-'}</td>
                    <td>
                      <div className="task-type">
                        <span className="task-icon">{getTaskTypeIcon(taskDescription)}</span>
                        <span>{taskDescription || 'Pharmacy Task'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`state-badge ${getStateColor(task.state)}`}>
                        {extractValue(task.state) || 'New'}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-badge ${getPriorityColor(task.priority)}`}>
                        {extractValue(task.priority) || 'Normal'}
                      </span>
                    </td>
                    <td>{formatDate(task.due_date)}</td>
                    <td>{extractValue(task.assigned_to) || 'Unassigned'}</td>
                    <td>{formatDate(task.sys_updated_on)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredTasks.length === 0 && (
            <div className="no-tasks">
              <div className="no-tasks-icon">💊</div>
              <h3>No pharmacy tasks found</h3>
              <p>All tasks are complete or no tasks match the current filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}