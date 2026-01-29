import React from 'react';
import './Navigation.css';

export default function Navigation({ currentView, onNavigate, userRole = 'nurse', onSwitchRole }) {
  // Role-specific navigation items
  const getNavigationItems = () => {
    switch (userRole) {
      case 'pharmacy':
        return [
          {
            id: 'pharmacy-inbox',
            label: 'Pharmacy Inbox',
            icon: '💊',
            roles: ['pharmacy']
          }
        ];
      
      case 'doctor':
        return [
          {
            id: 'doctor-signoff',
            label: 'Sign-off Queue',
            icon: '👨‍⚕️',
            roles: ['doctor']
          }
        ];
      
      case 'admin':
        return [
          {
            id: 'admin-center',
            label: 'Command Center',
            icon: '⚙️',
            roles: ['admin']
          },
          {
            id: 'failed-communications',
            label: 'Failed Communications',
            icon: '⚠️',
            roles: ['admin']
          }
        ];
      
      case 'nurse':
      default:
        return [
          {
            id: 'command-center',
            label: 'Command Center',
            icon: '🏥',
            roles: ['nurse']
          },
          {
            id: 'my-tasks',
            label: 'My Tasks',
            icon: '📋',
            roles: ['nurse']
          },
          {
            id: 'nursing-checklist',
            label: 'Nursing Checklist',
            icon: '👩‍⚕️',
            roles: ['nurse']
          },
          {
            id: 'followups-due',
            label: 'Follow-Ups Due',
            icon: '📅',
            roles: ['nurse']
          }
        ];
    }
  };

  const navigationItems = getNavigationItems();

  const handleNavClick = (itemId) => {
    if (onNavigate) {
      onNavigate(itemId);
    }
  };

  const getRoleColor = () => {
    const colors = {
      'doctor': '#8B4513',
      'nurse': '#198754',
      'pharmacy': '#6f42c1',
      'admin': '#dc3545'
    };
    return colors[userRole] || '#198754';
  };

  const getRoleIcon = () => {
    const icons = {
      'doctor': '👨‍⚕️',
      'nurse': '👩‍⚕️',
      'pharmacy': '💊',
      'admin': '⚙️'
    };
    return icons[userRole] || '👩‍⚕️';
  };

  return (
    <nav className="navigation-sidebar" style={{ background: `linear-gradient(180deg, ${getRoleColor()} 0%, ${getRoleColor()}CC 100%)` }}>
      <div className="navigation-header">
        <div className="navigation-title">
          <h2>CareFlow</h2>
          <span className="navigation-subtitle">Discharge Management</span>
        </div>
        <div className="user-role-badge">
          <span className={`role-indicator role-${userRole}`}>
            {getRoleIcon()} {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </span>
        </div>
      </div>
      
      <ul className="navigation-menu">
        {navigationItems.map(item => (
          <li key={item.id}>
            <button
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="navigation-footer">
        {onSwitchRole && (
          <button className="switch-role-nav-button" onClick={onSwitchRole}>
            🔄 Switch Role
          </button>
        )}
        
        <div className="quick-stats">
          <div className="stat-item">
            <span className="stat-label">Current Role</span>
            <span className="stat-value">{userRole}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}