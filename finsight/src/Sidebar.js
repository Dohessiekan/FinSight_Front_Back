import React from 'react';
import './Sidebar.css';
import { NavLink } from 'react-router-dom'; // Import NavLink

// Use logoX.svg from the public folder
const logo = process.env.PUBLIC_URL + '/logoX.svg';
const homeIcon = process.env.PUBLIC_URL + '/home.svg'; // Assuming home.svg is the icon for Overview
const smsIcon = process.env.PUBLIC_URL + '/sms.svg';
const statsIcon = process.env.PUBLIC_URL + '/stats.svg';
const settingsIcon = process.env.PUBLIC_URL + '/settings.svg';

const Sidebar = ({ onLogout, adminInfo }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-logo-container">
        <img src={logo} alt="FinSight Logo" className="sidebar-logo" />
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li><NavLink to="/overview" className={({ isActive }) => isActive ? "active" : ''}><img src={homeIcon} alt="Dashboard" className="nav-icon" />Dashboard</NavLink></li>
          <li><NavLink to="/fraud-alerts" className={({ isActive }) => isActive ? "active" : ''}><img src={process.env.PUBLIC_URL + '/alerts.svg'} alt="Fraud Alerts" className="nav-icon" />Fraud Alerts</NavLink></li>
          <li><NavLink to="/sms-inbox" className={({ isActive }) => isActive ? "active" : ''}><img src={smsIcon} alt="SMS Analysis" className="nav-icon" />SMS Analysis</NavLink></li>
          <li><NavLink to="/financial-summary" className={({ isActive }) => isActive ? "active" : ''}><img src={statsIcon} alt="Analytics" className="nav-icon" />Analytics</NavLink></li>
          <li><NavLink to="/settings" className={({ isActive }) => isActive ? "active" : ''}><img src={settingsIcon} alt="Settings" className="nav-icon" />Admin Settings</NavLink></li>
        </ul>
      </nav>
      
      {/* Wrap divider and profile in a new div */}
      <div className="sidebar-profile-section">
        <div className="sidebar-divider"></div>
        
        <div className="sidebar-profile">
          <div className="profile-picture">
            <img 
              src={process.env.PUBLIC_URL + '/image.avif'}
              alt="Profile" 
              className="profile-image"
            />
          </div>
          <div className="profile-info">
            <div className="profile-name">{adminInfo?.email?.split('@')[0] || 'Admin User'}</div>
            <div className="profile-role">{adminInfo?.role || 'System Administrator'}</div>
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={onLogout}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px',
            width: '100%',
            fontSize: '14px'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
