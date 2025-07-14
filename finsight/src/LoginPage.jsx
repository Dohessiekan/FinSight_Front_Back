import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { validateCredentials, createSession } from './utils/auth';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Validate credentials
      const result = validateCredentials(email, password);
      
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
      
      // Create session
      const session = createSession(result.admin);
      
      // Call parent login handler
      onLogin(session);
      
      // Navigate to dashboard
      navigate('/overview');
      
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="login-container">      <div className="login-left">
        <div className="logo-container">
          <img src={process.env.PUBLIC_URL + '/logoX.svg'} alt="FinSight Logo" className="logo-img" />
        </div>
        <div className="text-container">
          <p className="logo-description">
            Administrative Dashboard for FinSight Rwanda - Monitor and manage mobile money fraud detection in real-time
          </p>
          <div className="dots-container">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>      <div className="login-right">
        <div className="login-form-container">
          <h1 className="welcome-message">Admin Portal Login</h1>
          
          {error && (
            <div style={{
              background: '#f8d7da',
              color: '#721c24',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '15px',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}
          
          <form className="login-form" onSubmit={handleSubmit}>
            <input 
              type="email" 
              placeholder="Admin Email (e.g., admin@finsight.rw)" 
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
              style={{
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
          
          {/* Demo credentials helper */}
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: '#d1ecf1',
            borderRadius: '4px',
            border: '1px solid #bee5eb'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>Demo Credentials:</h4>
            <div style={{ fontSize: '12px', color: '#0c5460' }}>
              <p style={{ margin: '5px 0' }}>Super Admin: superadmin@finsight.rw / SuperAdmin123!</p>
              <p style={{ margin: '5px 0' }}>Admin: admin@finsight.rw / AdminFinSight2025!</p>
              <p style={{ margin: '5px 0' }}>Moderator: moderator@finsight.rw / Moderator456!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
