import React from 'react';
import './Overview.css';

const PageHeader = ({ title }) => (
  <div className="overview-header">
    <div className="overview-title">{title}</div>
    <div className="header-actions">
      <div className="search-container">
        <input 
          type="text" 
          placeholder="Search..." 
          className="search-input"
        />
        <img 
          src={process.env.PUBLIC_URL + '/search.svg'} 
          alt="Search" 
          className="search-icon"
        />
      </div>
      <div className="notification-container">
        <img 
          src={process.env.PUBLIC_URL + '/notification.svg'} 
          alt="Notifications" 
          className="notification-icon"
        />
      </div>
    </div>
  </div>
);

export default PageHeader;
