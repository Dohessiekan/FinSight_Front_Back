import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple validation - in a real app, you'd validate against a backend
    if (email && password) {
      onLogin();
      navigate('/overview');
    }
  };
  return (
    <div className="login-container">      <div className="login-left">
        <div className="logo-container">
          <img src={process.env.PUBLIC_URL + '/logoX.svg'} alt="FinSight Logo" className="logo-img" />
        </div>
        <div className="text-container">
          <p className="logo-description">
            Your go to solution to identify and fight mobile money scams in Rwanda
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
          <h1 className="welcome-message">Welcome Back!</h1>
          <form className="login-form" onSubmit={handleSubmit}>
            <input 
              type="email" 
              placeholder="Email" 
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="login-button">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
