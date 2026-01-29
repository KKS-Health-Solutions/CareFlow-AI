import React from 'react';
import './KpiTiles.css';

export default function KpiTiles({ stats }) {
  const kpis = [
    {
      label: 'Discharges Today',
      value: stats.dischargesToday || 0,
      icon: '📊',
      color: 'blue'
    },
    {
      label: 'Pending Discharge Summaries',
      value: stats.pendingSummaries || 0,
      icon: '📋',
      color: 'orange'
    },
    {
      label: 'Awaiting Clinician Approval',
      value: stats.awaitingApproval || 0,
      icon: '👨‍⚕️',
      color: 'purple'
    },
    {
      label: 'Pharmacy Actions Needed',
      value: stats.pharmacyActions || 0,
      icon: '💊',
      color: 'green'
    },
    {
      label: 'Follow-Ups Due (7 days)',
      value: stats.followupsDue || 0,
      icon: '📅',
      color: 'teal'
    },
    {
      label: 'Failed Communications',
      value: stats.failedComms || 0,
      icon: '⚠️',
      color: 'red'
    }
  ];

  return (
    <div className="kpi-container">
      {kpis.map((kpi, index) => (
        <div key={index} className={`kpi-tile kpi-${kpi.color}`}>
          <div className="kpi-icon">{kpi.icon}</div>
          <div className="kpi-content">
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}