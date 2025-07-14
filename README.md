# FinSight - Financial SMS Analysis Platform

FinSight is a comprehensive financial SMS analysis platform that helps users monitor and analyze their mobile money transactions, detect spam/fraud, and gain insights into their financial activities. The platform consists of a React web application, a React Native mobile app, and a Python FastAPI backend with machine learning capabilities.

## 🏗️ Project Structure

```
FinSight_Front_Back-3/
├── finsight/                   # React Web Application (Admin Dashboard)
├── FinSightApp/               # React Native Mobile Application
│   ├── API/                   # Python FastAPI Backend
│   ├── src/                   # Mobile app source code
│   └── assets/               # Mobile app assets
├── package.json              # Root project dependencies
├── app.json                  # Root Expo configuration
└── README.md                 # This file
```

## 📱 Applications Overview

### 1. **FinSight Web App** (`/finsight`)
- **Type**: React Web Application
- **Purpose**: Admin dashboard for financial analysis and user management
- **Port**: 3000 (default)
- **Features**:
  - User authentication and authorization
  - Financial summary dashboards
  - SMS inbox management
  - Settings and configuration
  - Admin controls with permission guards

### 2. **FinSightApp Mobile** (`/FinSightApp`)
- **Type**: React Native (Expo) Mobile Application
- **Purpose**: Mobile app for personal financial SMS analysis
- **Features**:
  - Real-time SMS scanning and analysis
  - Financial transaction tracking
  - Spam/fraud detection
  - Dashboard with insights
  - Firebase authentication
  - Permission-based SMS access

### 3. **API Backend** (`/FinSightApp/API`)
- **Type**: Python FastAPI with Machine Learning
- **Purpose**: ML-powered SMS analysis and financial data processing
- **Port**: 8000 (default)
- **Features**:
  - Spam/fraud detection using TensorFlow
  - Financial transaction parsing
  - SMS sentiment analysis
  - RESTful API endpoints

## 🚀 Installation and Setup

### Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Python** (v3.8 or higher)
- **pip** (Python package manager)
- **Expo CLI** (`npm install -g @expo/cli`)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - macOS only)

### 🔧 Backend Setup (API)

1. **Navigate to the API directory**:
   ```bash
   cd FinSightApp/API
   ```

2. **Create a Python virtual environment**:
   ```bash
   python -m venv finsight_env
   ```

3. **Activate the virtual environment**:
   ```bash
   # Windows
   finsight_env\Scripts\activate
   
   # macOS/Linux
   source finsight_env/bin/activate
   ```

4. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Ensure ML models are in place**:
   - Verify these files exist in the `FinSightApp/` directory:
     - `model_sentiment.keras`
     - `tokenizer.pkl`
     - `label_encoder.pkl`
     - `max_len.pkl`

6. **Start the API server**:
   ```bash
   # Option 1: Using Python directly
   python main.py
   
   # Option 2: Using uvicorn
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   
   # Option 3: Using the batch file (Windows)
   start_server.bat
   ```

7. **Verify API is running**:
   - Open `http://localhost:8000/docs` to see the API documentation
   - The API should show endpoints for `/predict-spam`, `/predict-sms`, etc.

### 🌐 Web Application Setup (finsight)

1. **Navigate to the web app directory**:
   ```bash
   cd finsight
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Access the web application**:
   - Open `http://localhost:3000` in your browser
   - The React web app should load with the login page

### 📱 Mobile Application Setup (FinSightApp)

1. **Navigate to the mobile app directory**:
   ```bash
   cd FinSightApp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Update API configuration**:
   - Open `src/utils/api.js`
   - Update the `API_BASE_URL` to match your computer's IP:
   ```javascript
   const API_BASE_URL = 'http://YOUR_LOCAL_IP:8000';
   ```
   - Find your local IP using:
     ```bash
     # Windows
     ipconfig
     
     # macOS/Linux
     ifconfig
     ```

4. **Configure Firebase** (if using authentication):
   - Update `src/config/firebase.js` with your Firebase configuration
   - Ensure Firebase project is set up with necessary services

5. **Start the Expo development server**:
   ```bash
   npx expo start
   ```

6. **Run on device/emulator**:
   ```bash
   # For Android
   npx expo run:android
   
   # For iOS (macOS only)
   npx expo run:ios
   
   # For web development
   npx expo start --web
   ```

## 🔗 API Endpoints

The FastAPI backend provides several endpoints for SMS analysis:

### Core Endpoints

- **`POST /predict-spam`** - Spam/fraud detection for single or multiple messages
- **`POST /predict-sms`** - Financial analysis and transaction parsing
- **`POST /predict`** - General message analysis (legacy endpoint)

### Request Examples

```javascript
// Spam Detection
fetch('http://localhost:8000/predict-spam', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Your SMS message here"
  })
});

// Financial Analysis
fetch('http://localhost:8000/predict-sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: ["Transaction: RWF 50,000 sent to John"]
  })
});
```

## 📋 Key Files and Their Purpose

### Configuration Files
- **`package.json`** - Project dependencies and scripts
- **`app.json`** - Expo configuration for mobile app
- **`requirements.txt`** - Python dependencies for API
- **`firebase.js`** - Firebase configuration
- **`api.js`** - API client configuration and endpoints

### Core Application Files

#### Web App (`/finsight/src/`)
- **`App.js`** - Main React application component
- **`LoginPage.jsx`** - User authentication page
- **`Overview.js`** - Dashboard overview component
- **`FinancialSummary.jsx`** - Financial data visualization
- **`SMSInbox.js`** - SMS message management
- **`SettingsPage.jsx`** - Application settings
- **`Sidebar.js`** - Navigation sidebar
- **`PageHeader.js`** - Common page header
- **`PermissionGuard.js`** - Access control component

#### Mobile App (`/FinSightApp/src/`)
- **`App.js`** - Main mobile application entry point
- **Screens**:
  - `DashboardScreen.js` - Main dashboard
  - `LoginScreen.js` - User login
  - `SignupScreen.js` - User registration
  - `SMSInboxScreen.js` - SMS message list
  - `SMSDetailScreen.js` - Individual SMS details
  - `SMSStatsScreen.js` - SMS statistics
  - `MessagesScreen.js` - Message management
  - `ProfileScreen.js` - User profile
  - `AdviceScreen.js` - Financial advice
- **Components**:
  - `Button.js` - Reusable button component
  - `Card.js` - Card layout component
  - `Input.js` - Input field component
  - `PasswordResetForm.js` - Password reset functionality
- **Services**:
  - `AuthService.js` - Authentication logic
  - `FirebaseService.js` - Firebase integration
- **Navigation**:
  - `AppNavigator.js` - App navigation structure
- **Utils**:
  - `api.js` - API communication utilities

#### Backend (`/FinSightApp/API/`)
- **`main.py`** - FastAPI application with all endpoints
- **`test_predict_sms.py`** - API testing script
- **`start_server.bat`** - Windows server startup script

### Machine Learning Models
- **`model_sentiment.keras`** - TensorFlow spam detection model
- **`tokenizer.pkl`** - Text tokenizer for ML preprocessing
- **`label_encoder.pkl`** - Label encoder for classification
- **`max_len.pkl`** - Maximum sequence length for padding

## 🛠️ Development Workflow

### 1. Start Backend API
```bash
cd FinSightApp/API
python main.py
```

### 2. Start Web Application
```bash
cd finsight
npm start
```

### 3. Start Mobile Application
```bash
cd FinSightApp
npx expo start
```

### 4. Testing API Endpoints
```bash
cd FinSightApp/API
python test_predict_sms.py
```

## 🔒 Security and Permissions

### Mobile App Permissions
- **SMS Access**: Required for reading and analyzing SMS messages
- **Internet**: Required for API communication
- **Storage**: For caching and local data storage

### Web App Authentication
- Firebase authentication integration
- Permission-based access control
- Admin role management

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Errors**:
   - Ensure the API server is running on port 8000
   - Check firewall settings
   - Verify the IP address in `api.js` is correct

2. **ML Model Loading Issues**:
   - Ensure all `.pkl` and `.keras` files are present
   - Check Python dependencies are correctly installed
   - Verify TensorFlow installation

3. **Mobile App Build Issues**:
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Expo CLI version: `expo --version`

4. **Firebase Connection Issues**:
   - Verify Firebase configuration in `firebase.js`
   - Check Firebase project settings
   - Ensure necessary Firebase services are enabled

### Getting Help

- Check console logs for detailed error messages
- Verify all dependencies are installed correctly
- Ensure all required files are present
- Test API endpoints using the documentation at `http://localhost:8000/docs`

## 📚 Additional Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **React Documentation**: https://react.dev/
- **React Native Documentation**: https://reactnative.dev/
- **Expo Documentation**: https://docs.expo.dev/
- **Firebase Documentation**: https://firebase.google.com/docs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

**Note**: This is a development setup guide. For production deployment, additional security measures, environment configurations, and deployment strategies should be implemented.


## 📦 Download APK

[👉 Download Latest APK](https://github.com/Dohessiekan/FinSight_Front_Back/releases/latest/download/app-release.apk)
