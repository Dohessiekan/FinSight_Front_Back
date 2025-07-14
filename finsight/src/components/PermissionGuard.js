import React from 'react';
import { hasPermission } from './utils/auth';

// Component to conditionally render based on permissions
export const PermissionGuard = ({ permission, children, fallback = null }) => {
  if (hasPermission(permission)) {
    return children;
  }
  
  return fallback;
};

// Higher-order component for route protection
export const withPermission = (Component, requiredPermission) => {
  return (props) => {
    if (!hasPermission(requiredPermission)) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h3>Access Denied</h3>
          <p>You don't have permission to access this section.</p>
          <p>Required permission: <code>{requiredPermission}</code></p>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

// Role-based display component
export const RoleDisplay = ({ adminInfo }) => {
  if (!adminInfo) return null;
  
  const getRoleColor = (role) => {
    switch (role) {
      case 'Super Admin': return '#dc3545';
      case 'Admin': return '#007bff';
      case 'Moderator': return '#28a745';
      default: return '#6c757d';
    }
  };
  
  return (
    <span style={{
      background: getRoleColor(adminInfo.role),
      color: 'white',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 'bold'
    }}>
      {adminInfo.role}
    </span>
  );
};

const PermissionComponents = { PermissionGuard, withPermission, RoleDisplay };
export default PermissionComponents;
