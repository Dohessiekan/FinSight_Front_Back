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
      <PageHeader title="Settings" />
      
      <div className="settings-content-container">
        <div className="top-right-controls">
          <div className="container-title">General Settings</div>
          <div>
            <button className="account-button">Account</button>
            <button className="notification-button">Notification</button>
            <button className="notification-button">Accessibility</button>
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
                <div className="profile-name">Xavier N</div>
                <div className="profile-role">Admin</div>
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
            <div className="basic-info-label">Basic Information</div>
            <div className="basic-info-description">
              Lorem Ipsum is simply dummy text
            </div>
          </div>

          <div className="more-info-section">
            <div className="basic-info-label">More Information</div>
            <div className="basic-info-description">
              Lorem Ipsum is simply dummy text
            </div>
          </div>
        </div>

        <div className="form-row first-row">
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input id="fullName" type="text" placeholder="Enter full name" />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" placeholder="Enter email address" />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input id="phone" type="tel" placeholder="Enter phone number" />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <input id="role" type="text" placeholder="Enter role" />
          </div>
        </div>

        {/* Second form row with Location and Website swapped */}
        <div className="form-row second-row" style={{ marginTop: '16px' }}>
          <div className="form-group">
            <label htmlFor="biography">About Biography</label>
            <textarea
              id="biography"
              name="biography"
              placeholder="Write a short bio..."
              rows="4"
              className="biography-textarea"
            ></textarea>
          </div>

          <div className="form-group">{/* Empty div for alignment */}</div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input type="text" id="location" name="location" placeholder="Enter location" />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website</label>
            <input type="url" id="website" name="website" placeholder="Enter website URL" />
          </div>
        </div>        {/* Save Changes button */}
        <button className="save-button">Save Changes</button>
      </div>
    </div>
  );
};

export default SettingsPage;
