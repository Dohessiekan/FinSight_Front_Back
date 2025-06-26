import React from 'react';
import './Sidebar.css';
import { NavLink } from 'react-router-dom'; // Import NavLink

// Use logoX.svg from the public folder
const logo = process.env.PUBLIC_URL + '/logoX.svg';
const homeIcon = process.env.PUBLIC_URL + '/home.svg'; // Assuming home.svg is the icon for Overview
const smsIcon = process.env.PUBLIC_URL + '/sms.svg';
const alertsIcon = process.env.PUBLIC_URL + '/alerts.svg';
const statsIcon = process.env.PUBLIC_URL + '/stats.svg';
const settingsIcon = process.env.PUBLIC_URL + '/settings.svg';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-logo-container">
        <img src={logo} alt="FinSight Logo" className="sidebar-logo" />
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li><NavLink to="/overview" className={({ isActive }) => isActive ? "active" : ''}><img src={homeIcon} alt="Overview" className="nav-icon" />Overview</NavLink></li>
          <li><NavLink to="/sms-inbox" className={({ isActive }) => isActive ? "active" : ''}><img src={smsIcon} alt="SMS Inbox" className="nav-icon" />SMS Inbox</NavLink></li>
          <li><NavLink to="/financial-summary" className={({ isActive }) => isActive ? "active" : ''}><img src={statsIcon} alt="Financial Summary" className="nav-icon" />Financial Summary</NavLink></li>
          <li><NavLink to="/settings" className={({ isActive }) => isActive ? "active" : ''}><img src={settingsIcon} alt="Settings" className="nav-icon" />Settings</NavLink></li>
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
            <div className="profile-name">John Doe</div>
            <div className="profile-role">Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
