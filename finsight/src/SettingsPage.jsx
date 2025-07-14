import React, { useState, useRef } from 'react';
import './SettingsPage.css';
import PageHeader from './PageHeader';

const SettingsPage = () => {
  const [profilePhoto, setProfilePhoto] = useState(process.env.PUBLIC_URL + '/image.avif');
  const fileInputRef = useRef(null);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePhoto(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  return (
    <div className="overview-container">
      <PageHeader title="Admin Settings" />
      
      <div className="settings-content-container">
        <div className="top-right-controls">
          <div className="container-title">System Administration</div>
          <div>
            <button className="account-button">User Management</button>
            <button className="notification-button">System Config</button>
            <button className="notification-button">Security</button>
            <button className="notification-button">API Settings</button>
          </div>
        </div>

        <div className="profile-photo-section-wrapper">
          <div className="profile-photo-section">
            <div className="profile-info">
              <img 
                src={profilePhoto} 
                alt="Profile" 
                className="profile-photo" 
                onClick={handlePhotoClick}
                title="Click to change photo"
              />
              <div className="profile-text">
                <div className="profile-name">System Admin</div>
                <div className="profile-role">FinSight Administrator</div>
              </div>
            </div>
            <button className="update-button" onClick={handlePhotoClick}>Update New Picture</button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className="basic-info-row">
          <div className="basic-info-section">
            <div className="basic-info-label">Administrator Information</div>
            <div className="basic-info-description">
              Manage your administrative profile and system preferences
            </div>
          </div>

          <div className="more-info-section">
            <div className="basic-info-label">System Configuration</div>
            <div className="basic-info-description">
              Configure fraud detection thresholds and system behavior
            </div>
          </div>
        </div>

        <div className="form-row first-row">
          <div className="form-group">
            <label htmlFor="fullName">Administrator Name</label>
            <input id="fullName" type="text" placeholder="System Administrator" defaultValue="System Administrator" />
          </div>

          <div className="form-group">
            <label htmlFor="email">Admin Email</label>
            <input id="email" type="email" placeholder="admin@finsight.rw" defaultValue="admin@finsight.rw" />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Contact Number</label>
            <input id="phone" type="tel" placeholder="+250 788 000 000" defaultValue="+250 788 000 000" />
          </div>

          <div className="form-group">
            <label htmlFor="role">Access Level</label>
            <select id="role" className="role-select">
              <option value="super_admin">Super Administrator</option>
              <option value="admin">Administrator</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>
        </div>

        {/* System Configuration Row */}
        <div className="form-row second-row" style={{ marginTop: '16px' }}>
          <div className="form-group">
            <label htmlFor="fraudThreshold">Fraud Detection Threshold (%)</label>
            <input type="number" id="fraudThreshold" name="fraudThreshold" placeholder="85" defaultValue="85" min="1" max="100" />
          </div>

          <div className="form-group">
            <label htmlFor="alertEmail">Alert Notifications Email</label>
            <input type="email" id="alertEmail" name="alertEmail" placeholder="alerts@finsight.rw" defaultValue="alerts@finsight.rw" />
          </div>

          <div className="form-group">
            <label htmlFor="maxUsers">Max Active Users</label>
            <input type="number" id="maxUsers" name="maxUsers" placeholder="10000" defaultValue="10000" />
          </div>

          <div className="form-group">
            <label htmlFor="apiKey">API Integration Key</label>
            <input type="password" id="apiKey" name="apiKey" placeholder="••••••••••••••••" />
          </div>
        </div>        {/* Save Changes button */}
        <button className="save-button">Save Configuration</button>
      </div>
    </div>
  );
};

export default SettingsPage;
