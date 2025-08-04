# 🏦 FinSight - Advanced Financial SMS Analysis Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-v3.8+-blue.svg)](https://python.org/)
[![React](https://img.shields.io/badge/React-v19+-61DAFB.svg)](https://reactjs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-v0.79+-61DAFB.svg)](https://reactnative.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688.svg)](https://fastapi.tiangolo.com/)

FinSight is a comprehensive financial SMS analysis platform that leverages machine learning to help users monitor mobile money transactions, detect fraud/spam, and gain valuable insights into their financial activities. The platform features real-time SMS analysis, intelligent categorization, and advanced security measures.

## 🏗️ Project Architecture

```
FinSight_Front_Back-6/
├── 🌐 finsight/                   # React Web Application (Admin Dashboard)
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── config/              # Firebase and app configuration
│   │   ├── utils/               # Utility functions and helpers
│   │   ├── App.js               # Main application component
│   │   ├── Sidebar.js           # Navigation sidebar
│   │   ├── Overview.js          # Dashboard overview
│   │   ├── SMSInbox.js          # SMS management interface
│   │   └── ...                  # Other pages and components
│   ├── public/                  # Static assets
│   └── package.json             # Web app dependencies
│
├── 📱 FinSightApp/               # React Native Mobile Application
│   ├── 🐍 API/                   # Python FastAPI Backend
│   │   ├── main.py              # FastAPI application
│   │   ├── model/               # ML model files
│   │   ├── requirements.txt     # Python dependencies
│   │   └── start_server.bat     # Server startup script
│   ├── src/
│   │   ├── screens/             # Mobile app screens
│   │   ├── components/          # Reusable mobile components
│   │   ├── navigation/          # App navigation structure
│   │   ├── services/            # API and Firebase services
│   │   ├── config/              # Configuration files
│   │   └── utils/               # Utility functions
│   ├── assets/                  # Mobile app assets
│   └── package.json             # Mobile app dependencies
│
├── 🔧 Configuration Files
│   ├── package.json             # Root project dependencies
│   ├── app.json                 # Expo configuration
│   ├── eas.json                 # Expo Application Services config
│   ├── firestore.indexes.json   # Firebase Firestore indexes
│   └── render.yaml              # Deployment configuration
│
└── 📚 Documentation
    ├── README.md                # This comprehensive guide
    ├── DEPLOYMENT_GUIDE.md      # Production deployment guide
    ├── API_INTEGRATION_GUIDE.md # API integration documentation
    └── ...                      # Additional documentation files
```

## � Applications Overview

### 1. **FinSight Web Dashboard** (`/finsight`) 🌐
- **Technology**: React.js v19+ with modern hooks and context
- **Purpose**: Comprehensive admin dashboard for financial oversight and user management
- **Port**: 3000 (development), configurable for production
- **Key Features**:
  - 🔐 Firebase authentication with role-based access control
  - 📊 Real-time financial analytics and dashboards
  - 📨 Advanced SMS inbox management with filtering
  - ⚙️ System settings and configuration management
  - 👥 User management with permission guards
  - 🗺️ Interactive fraud mapping with Leaflet integration
  - 📈 Financial summary visualizations
  - 🔔 Real-time notification system

### 2. **FinSightApp Mobile** (`/FinSightApp`) 📱
- **Technology**: React Native v0.79+ with Expo framework
- **Purpose**: Personal financial SMS analysis companion app
- **Key Features**:
  - 📱 Real-time SMS scanning and intelligent analysis
  - 💰 Automated financial transaction tracking and categorization
  - 🛡️ Advanced spam/fraud detection with ML algorithms
  - 📊 Personalized financial insights dashboard
  - 🔐 Secure Firebase authentication
  - 📍 Location-based transaction verification
  - 🔔 Push notifications for important financial events
  - 💳 Mobile money transaction monitoring
  - 📈 Spending pattern analysis
  - 🎯 Smart financial advice recommendations

### 3. **FastAPI ML Backend** (`/FinSightApp/API`) 🐍
- **Technology**: Python FastAPI with TensorFlow/Scikit-learn
- **Purpose**: Machine learning-powered SMS analysis engine
- **Port**: 8000 (default), configurable
- **Core Capabilities**:
  - 🤖 Advanced spam/fraud detection using TensorFlow models
  - 💸 Intelligent financial transaction parsing
  - 📊 SMS sentiment analysis and classification
  - 🔍 Pattern recognition for mobile money services
  - 📈 Real-time analysis API endpoints
  - 🔒 Secure data processing and validation
  - 📋 Comprehensive API documentation (Swagger/OpenAPI)
  - RESTful API endpoints

## 🚀 Installation and Setup

## 🛠️ Prerequisites and System Requirements

Before setting up FinSight, ensure your development environment meets these requirements:

### 📋 Required Software

| Component | Version | Purpose | Installation |
|-----------|---------|---------|--------------|
| **Node.js** | v18.0+ | JavaScript runtime for React apps | [Download](https://nodejs.org/) |
| **npm/yarn** | Latest | Package manager | Included with Node.js |
| **Python** | v3.8+ | Backend API and ML models | [Download](https://python.org/) |
| **pip** | Latest | Python package manager | Included with Python |
| **Git** | Latest | Version control | [Download](https://git-scm.com/) |

### 📱 Mobile Development (Optional)

| Component | Platform | Purpose |
|-----------|----------|---------|
| **Expo CLI** | Cross-platform | `npm install -g @expo/cli` |
| **Android Studio** | Android | Android development and emulation |
| **Xcode** | macOS only | iOS development (Mac required) |

### 🔧 Development Tools (Recommended)

- **VS Code** with React/React Native extensions
- **Postman** or **Insomnia** for API testing
- **Firebase CLI** for Firebase operations: `npm install -g firebase-tools`

### 🖥️ System Requirements

- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 5GB free space
- **OS**: Windows 10+, macOS 10.15+, or Ubuntu 18.04+
- **Network**: Stable internet connection for Firebase and API calls

## 🚀 Quick Start Guide

### ⚡ One-Command Setup (Recommended)

For the fastest setup, use our automated script:

```bash
# Clone the repository
git clone https://github.com/Dohessiekan/FinSight_Front_Back.git
cd FinSightAPP OR cd finsight

# Install all dependencies
npm run setup-all  # This will install dependencies for all components
```

### � Manual Installation

Follow these steps for a comprehensive manual setup:

---

## 🐍 Backend Setup (FastAPI ML Engine)

The backend provides machine learning capabilities for SMS analysis.

### Step 1: Navigate to API Directory
```bash
cd FinSightApp/API
```

### Step 2: Create Python Virtual Environment
```bash
# Windows (PowerShell/Command Prompt)
python -m venv finsight_env
finsight_env\Scripts\activate

# Windows (Git Bash)
python -m venv finsight_env
source finsight_env/Scripts/activate

# macOS/Linux
python3 -m venv finsight_env
source finsight_env/bin/activate
```

### Step 3: Install Python Dependencies
```bash
# Install required packages
pip install --upgrade pip
pip install -r requirements.txt

# Verify installation
pip list
```

### Step 4: Verify ML Model Files
Ensure these critical files exist in the `FinSightApp/` directory:
- ✅ `model_sentiment.keras` - TensorFlow spam detection model
- ✅ `tokenizer.pkl` - Text tokenizer for preprocessing  
- ✅ `label_encoder.pkl` - Label encoder for classification
- ✅ `max_len.pkl` - Maximum sequence length for padding

### Step 5: Start the API Server
```bash
# Option 1: Using Python directly (recommended for development)
python main.py

# Option 2: Using uvicorn with auto-reload
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Option 3: Using the Windows batch file
start_server.bat  # Windows only
```

### Step 6: Verify API Functionality
- 🌐 **API Documentation**: http://localhost:8000/docs
- 🔍 **Health Check**: http://localhost:8000/
- 📋 **OpenAPI Schema**: http://localhost:8000/openapi.json

Expected endpoints:
- `POST /predict-spam` - Spam/fraud detection
- `POST /predict-sms` - Financial SMS analysis
- `POST /predict` - General message analysis

---

## 🌐 Web Application Setup (React Dashboard)

The web dashboard provides administrative controls and analytics.

### Step 1: Navigate to Web App Directory
```bash
cd ../../finsight  # From API directory
# OR
cd finsight  # From project root
```

### Step 2: Install Dependencies
```bash
# Install all npm packages
npm install

# Alternative: Using yarn
yarn install

# Verify package installation
npm list --depth=0
```

### Step 3: Configure Environment Variables
Create a `.env` file in the `finsight` directory:
```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=finsight-9d1fd.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=finsight-9d1fd
REACT_APP_FIREBASE_STORAGE_BUCKET=finsight-9d1fd.firebasestorage.app

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8000

# Development Settings
REACT_APP_ENV=development
```

### Step 4: Start Development Server
```bash
# Start the React development server
npm start

# Alternative commands
npm run dev      # Same as npm start
npm run serve    # Serve built application
```

### Step 5: Access Web Application
- 🌐 **Application URL**: http://localhost:3000
- 📱 **Mobile View**: Add `?mobile=true` to test responsive design
- 🔐 **Login**: Use Firebase authentication or test credentials

Expected pages:
- `/overview` - Dashboard overview
- `/fraud-alerts` - Fraud alert management
- `/sms-inbox` - SMS message analysis
- `/settings` - Application settings

---

## 📱 Mobile Application Setup (React Native)

The mobile app provides personal financial SMS analysis.

### Step 1: Navigate to Mobile App Directory
```bash
cd ../FinSightApp  # From finsight directory
# OR
cd FinSightApp  # From project root
```

### Step 2: Install Dependencies
```bash
# Install React Native packages
npm install

# Install Expo CLI globally (if not already installed)
npm install -g @expo/cli

# Clear cache if needed
npm cache clean --force
```

### Step 3: Configure API Connection

#### Find Your Local IP Address:
```bash
# Windows (PowerShell)
ipconfig | findstr "IPv4"

# Windows (Command Prompt)
ipconfig

# macOS/Linux
ifconfig | grep "inet "
# OR
ip addr show
```

#### Update API Configuration:
Edit `src/utils/api.js`:
```javascript
// Replace YOUR_LOCAL_IP with your actual IP address
const API_BASE_URL = 'http://192.168.1.100:8000';  // Example IP

// Alternative: Use localhost for emulator testing
const API_BASE_URL = 'http://10.0.2.2:8000';  // Android emulator
const API_BASE_URL = 'http://localhost:8000';  // iOS simulator
```

### Step 4: Configure Firebase
Update `src/config/firebase.js` with your Firebase project configuration:
```javascript
const firebaseConfig = {
  apiKey: "your_api_key",
  authDomain: "finsight-9d1fd.firebaseapp.com",
  projectId: "finsight-9d1fd",
  storageBucket: "finsight-9d1fd.firebasestorage.app",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id"
};
```

### Step 5: Start the Expo Development Server
```bash
# Start Expo development server
npx expo start

# Alternative: Start with specific options
npx expo start --clear       # Clear cache
npx expo start --tunnel      # Use tunnel for external devices
npx expo start --lan        # Use LAN for local network devices
```

### Step 6: Run on Device/Emulator

#### Using Expo Go App (Recommended for testing):
1. Install **Expo Go** from App Store/Google Play
2. Scan QR code from terminal with your phone
3. App will load on your device

#### Using Development Builds:
```bash
# Android (requires Android Studio/emulator)
npx expo run:android

# iOS (requires Xcode - macOS only)
npx expo run:ios

# Web development version
npx expo start --web
```

### Step 7: Test Mobile App Features

Key screens to test:
- 📱 **Dashboard**: Financial overview and insights
- 📨 **SMS Inbox**: Message analysis and categorization
- 🔐 **Authentication**: Login/signup with Firebase
- ⚙️ **Settings**: App configuration and preferences
- 📊 **Analytics**: Financial statistics and reports

---

## 🔗 API Integration and Testing

### Core API Endpoints

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/predict-spam` | POST | Spam/fraud detection | `{"text": "message"}` |
| `/predict-sms` | POST | Financial analysis | `{"messages": ["msg1", "msg2"]}` |
| `/predict` | POST | General analysis | `{"text": "message"}` |
| `/health` | GET | Health check | None |

### Testing API Endpoints

#### 1. Using Curl:
```bash
# Test spam detection
curl -X POST "http://localhost:8000/predict-spam" \
     -H "Content-Type: application/json" \
     -d '{"text": "Congratulations! You won $1000. Click here to claim."}'

# Test financial analysis
curl -X POST "http://localhost:8000/predict-sms" \
     -H "Content-Type: application/json" \
     -d '{"messages": ["RWF 50,000 sent to John Doe"]}'
```

#### 2. Using Python Test Script:
```bash
cd FinSightApp/API
python test_predict_sms.py
```

#### 3. Using the Interactive API Documentation:
Visit http://localhost:8000/docs for Swagger UI interface

### Sample API Responses

#### Spam Detection Response:
```json
{
  "is_spam": true,
  "confidence": 0.95,
  "category": "financial_fraud",
  "risk_level": "high"
}
```

#### Financial Analysis Response:
```json
{
  "transaction_type": "money_transfer",
  "amount": 50000,
  "currency": "RWF",
  "recipient": "John Doe",
  "confidence": 0.87,
  "category": "peer_to_peer"
}
```

## � Project Structure and Key Files

### 🎯 Core Application Files

#### Web Application (`/finsight/src/`)
```
finsight/src/
├── 📄 App.js                 # Main React application component
├── 🔐 LoginPage.jsx          # User authentication page
├── 📊 Overview.js            # Dashboard overview with analytics
├── 💰 FinancialSummary.jsx   # Financial data visualization
├── 📨 SMSInbox.js            # SMS message management interface
├── ⚙️ SettingsPage.jsx       # Application settings and configuration
├── 🧭 Sidebar.js             # Navigation sidebar component
├── 🏷️ PageHeader.js          # Common page header component
├── 🛡️ PermissionGuard.js     # Access control and authentication guard
├── 📱 components/            # Reusable UI components
│   ├── Button.js
│   ├── Card.js
│   ├── Modal.js
│   └── ...
├── ⚙️ config/                # Configuration files
│   ├── firebase.js           # Firebase configuration
│   └── app.js               # Application settings
└── 🛠️ utils/                 # Utility functions
    ├── auth.js              # Authentication helpers
    ├── api.js               # API communication utilities
    └── helpers.js           # General helper functions
```

#### Mobile Application (`/FinSightApp/src/`)
```
FinSightApp/src/
├── 📱 screens/               # Mobile app screens
│   ├── DashboardScreen.js    # Main financial dashboard
│   ├── LoginScreen.js        # User authentication
│   ├── SignupScreen.js       # New user registration
│   ├── SMSInboxScreen.js     # SMS message list and analysis
│   ├── SMSDetailScreen.js    # Individual SMS message details
│   ├── SMSStatsScreen.js     # SMS statistics and insights
│   ├── MessagesScreen.js     # Message management interface
│   ├── ProfileScreen.js      # User profile management
│   └── AdviceScreen.js       # Financial advice recommendations
├── 🧩 components/            # Reusable mobile components
│   ├── Button.js             # Custom button component
│   ├── Card.js               # Card layout component
│   ├── Input.js              # Input field component
│   ├── PasswordResetForm.js  # Password reset functionality
│   └── ...
├── 🧭 navigation/            # App navigation structure
│   ├── AppNavigator.js       # Main navigation container
│   ├── TabNavigator.js       # Bottom tab navigation
│   └── StackNavigator.js     # Stack navigation for screens
├── 🔧 services/              # External service integrations
│   ├── AuthService.js        # Authentication logic
│   ├── FirebaseService.js    # Firebase integration
│   ├── ApiService.js         # API communication
│   └── NotificationService.js # Push notification handling
├── ⚙️ config/                # Configuration files
│   ├── firebase.js           # Firebase configuration
│   ├── emailConfig.js        # Email configuration
│   └── app.js               # App-wide settings
├── 🎨 theme/                 # UI theme and styling
│   ├── colors.js             # Color palette
│   ├── fonts.js              # Typography settings
│   └── styles.js             # Common styles
└── 🛠️ utils/                 # Utility functions
    ├── api.js                # API communication helpers
    ├── storage.js            # Local storage management
    ├── validation.js         # Form validation
    └── helpers.js            # General utilities
```

#### Backend API (`/FinSightApp/API/`)
```
FinSightApp/API/
├── 🐍 main.py                # FastAPI application with all endpoints
├── 🧠 model/                 # Machine learning models directory
│   ├── model_sentiment.keras # TensorFlow spam detection model
│   ├── tokenizer.pkl         # Text tokenizer for preprocessing
│   ├── label_encoder.pkl     # Label encoder for classification
│   └── max_len.pkl           # Sequence length configuration
├── 🧪 test_predict_sms.py    # API testing and validation script
├── 📋 requirements.txt       # Python dependencies
├── 🚀 start_server.bat       # Windows server startup script
└── 📚 docs/                  # API documentation
    ├── endpoints.md          # Endpoint documentation
    └── models.md             # ML model documentation
```

### 🔧 Configuration Files

#### Root Level Configuration
```
├── 📦 package.json           # Root project dependencies and scripts
├── 📱 app.json               # Expo configuration for mobile app
├── 🏗️ eas.json               # Expo Application Services configuration
├── 🔥 firestore.indexes.json # Firebase Firestore database indexes
├── 🚀 render.yaml            # Production deployment configuration
├── 🔀 .gitignore             # Git ignore patterns
└── 📄 README.md              # This comprehensive documentation
```

#### Environment Configuration Files
```
├── .env                      # Environment variables (create locally)
├── .env.example              # Environment variables template
├── .env.development          # Development environment settings
└── .env.production           # Production environment settings
```

### 🔑 Key Dependencies

#### Web Application Dependencies (`finsight/package.json`)
```json
{
  "dependencies": {
    "react": "^19.1.0",              # Core React library
    "react-dom": "^19.1.0",          # React DOM rendering
    "react-router-dom": "^7.6.2",    # Client-side routing
    "firebase": "^11.10.0",          # Firebase integration
    "leaflet": "^1.9.4",             # Interactive maps
    "react-leaflet": "^5.0.0",       # React Leaflet integration
    "react-scripts": "^5.0.1"        # Create React App scripts
  }
}
```

#### Mobile App Dependencies (`FinSightApp/package.json`)
```json
{
  "dependencies": {
    "expo": "~53.0.12",                    # Expo framework
    "react": "19.0.0",                     # React library
    "react-native": "0.79.4",              # React Native framework
    "@react-navigation/native": "^7.1.14", # Navigation library
    "@react-navigation/stack": "^7.4.1",   # Stack navigation
    "firebase": "^11.10.0",                # Firebase integration
    "expo-location": "~18.1.6",            # Location services
    "expo-notifications": "~0.31.4"        # Push notifications
  }
}
```

#### Backend Dependencies (`API/requirements.txt`)
```
fastapi==0.104.1        # FastAPI web framework
uvicorn[standard]       # ASGI server
tensorflow==2.19.0      # Machine learning framework
scikit-learn           # ML utilities and algorithms
pandas                 # Data manipulation
pydantic              # Data validation
python-multipart      # File upload support
```

### 🎯 Important File Descriptions

| File | Purpose | Key Features |
|------|---------|--------------|
| **`Sidebar.js`** | Navigation component | Admin profile, logout functionality, menu items |
| **`SMSInbox.js`** | SMS management | Message filtering, analysis results, bulk operations |
| **`Overview.js`** | Dashboard overview | Analytics widgets, real-time data, charts |
| **`main.py`** | FastAPI backend | ML model integration, API endpoints, data processing |
| **`firebase.js`** | Firebase config | Authentication, Firestore, real-time updates |
| **`api.js`** | API utilities | HTTP client, error handling, request/response logic |
| **`DashboardScreen.js`** | Mobile dashboard | Financial insights, transaction summaries |
| **`AuthService.js`** | Authentication | Login/logout, token management, user sessions |

### 📚 Documentation Files

The project includes comprehensive documentation:

- **`API_INTEGRATION_GUIDE.md`** - Complete API integration instructions
- **`DEPLOYMENT_GUIDE.md`** - Production deployment guidelines
- **`FIREBASE_INTEGRATION_GUIDE.md`** - Firebase setup and configuration
- **`MOBILE_APP_INTEGRATION_GUIDE.md`** - Mobile app development guide
- **`SMS_ANALYSIS_IMPROVEMENTS.md`** - SMS analysis feature documentation
- **`FRAUD_MAPPING_INTEGRATION_GUIDE.md`** - Fraud detection implementation
- **`LOCATION_VERIFICATION_SYSTEM.md`** - GPS and location features

## � Development Workflow and Commands

### 🚀 Starting All Services

#### Option 1: Individual Terminal Windows (Recommended)
```bash
# Terminal 1: Start Backend API
cd FinSightApp/API
python -m venv finsight_env
finsight_env\Scripts\activate  # Windows
source finsight_env/bin/activate  # macOS/Linux
pip install -r requirements.txt
python main.py

# Terminal 2: Start Web Application
cd finsight
npm install
npm start

# Terminal 3: Start Mobile Application
cd FinSightApp
npm install
npx expo start
```

#### Option 2: Using npm Scripts (Root Level)
```bash
# Install all dependencies
npm run install:all

# Start all services concurrently
npm run start:all

# Start individual services
npm run start:api      # Backend only
npm run start:web      # Web app only
npm run start:mobile   # Mobile app only
```

### 🧪 Testing and Validation

#### Backend API Testing
```bash
# Navigate to API directory
cd FinSightApp/API

# Run automated tests
python test_predict_sms.py

# Test specific endpoints
curl -X POST "http://localhost:8000/predict-spam" \
     -H "Content-Type: application/json" \
     -d '{"text": "Test spam message"}'

# Health check
curl http://localhost:8000/health
```

#### Web Application Testing
```bash
cd finsight

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production testing
npm run build
npm run serve
```

#### Mobile Application Testing
```bash
cd FinSightApp

# Start in development mode
npx expo start

# Run on specific platforms
npx expo start --android
npx expo start --ios
npx expo start --web

# Build for testing
npx expo build:android
npx expo build:ios
```

### 📊 Monitoring and Debugging

#### Application Logs
```bash
# Backend API logs
tail -f FinSightApp/API/logs/app.log

# Web application logs (browser console)
# Open Developer Tools → Console

# Mobile application logs
npx expo logs --platform android
npx expo logs --platform ios
```

#### Performance Monitoring
```bash
# Web app bundle analysis
cd finsight
npm run analyze

# Mobile app performance
cd FinSightApp
npx expo doctor  # Check for issues
```

### 🔄 Development Scripts

#### Useful npm Scripts

| Command | Purpose | Location |
|---------|---------|----------|
| `npm start` | Start development server | All projects |
| `npm run build` | Build for production | Web/Mobile |
| `npm test` | Run test suite | All projects |
| `npm run lint` | Code linting | All projects |
| `npm run format` | Code formatting | All projects |
| `npm run clean` | Clean build files | All projects |

#### Custom Development Scripts
```bash
# Reset all node_modules
npm run clean:all

# Update all dependencies
npm run update:all

# Run security audit
npm run audit:all

# Format all code
npm run format:all
```

### 🔍 Debugging Tips

#### Common Development Issues

**1. API Connection Issues:**
```bash
# Check if API is running
curl http://localhost:8000/health

# Check network connectivity
ping localhost

# Verify Python environment
python --version
pip list
```

**2. Firebase Authentication Issues:**
```bash
# Verify Firebase config
firebase projects:list

# Check Firebase rules
firebase firestore:rules:get

# Test Firebase connection
firebase auth:test
```

**3. Mobile App Build Issues:**
```bash
# Clear Expo cache
npx expo start --clear

# Reset Metro bundler cache
npx expo start --reset-cache

# Check device connectivity
adb devices  # Android
xcrun simctl list  # iOS
```

**4. Web App Build Issues:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for dependency conflicts
npm ls
```

## 🔒 Security, Permissions & Configuration

### 🛡️ Security Features

#### Authentication & Authorization
- **Firebase Authentication**: Secure user login/signup with email verification
- **Role-Based Access Control**: Admin and user permissions
- **JWT Token Management**: Secure API communication
- **Session Management**: Automatic logout and session expiry
- **Password Security**: Strong password requirements and reset functionality

#### Data Security
- **Input Validation**: All API inputs validated using Pydantic models
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: Cross-site request forgery mitigation
- **HTTPS Enforcement**: Secure communication in production

### 📱 Mobile App Permissions

#### Required Permissions

| Permission | Purpose | Justification |
|------------|---------|---------------|
| **SMS_READ** | Read SMS messages | Core functionality for SMS analysis |
| **INTERNET** | API communication | Required for backend data processing |
| **ACCESS_NETWORK_STATE** | Network status | Ensure connectivity before API calls |
| **WRITE_EXTERNAL_STORAGE** | Local data cache | Store analysis results offline |
| **ACCESS_FINE_LOCATION** | GPS location | Transaction location verification |
| **RECEIVE_BOOT_COMPLETED** | Auto-start service | Background SMS monitoring |
| **WAKE_LOCK** | Keep device awake | Real-time SMS processing |

#### Permission Request Implementation
```javascript
// In FinSightApp/src/utils/permissions.js
import { PermissionsAndroid, Platform } from 'react-native';

export const requestSMSPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'FinSight needs access to your SMS to analyze financial messages',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};
```

### ⚙️ Configuration Management

#### Environment Variables

**Web Application (`.env`):**
```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=finsight-9d1fd.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=finsight-9d1fd
REACT_APP_FIREBASE_STORAGE_BUCKET=finsight-9d1fd.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws

# Application Settings
REACT_APP_ENV=development
REACT_APP_DEBUG=true
REACT_APP_VERSION=1.0.0

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_OFFLINE_MODE=false
```

**Mobile App Environment:**
```javascript
// FinSightApp/src/config/environment.js
const config = {
  development: {
    API_BASE_URL: 'http://192.168.1.100:8000',
    WS_URL: 'ws://192.168.1.100:8000/ws',
    DEBUG: true,
    LOG_LEVEL: 'debug'
  },
  production: {
    API_BASE_URL: 'https://api.finsight.app',
    WS_URL: 'wss://api.finsight.app/ws',
    DEBUG: false,
    LOG_LEVEL: 'error'
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

**Backend Configuration:**
```python
# FinSightApp/API/config.py
import os
from pydantic import BaseSettings

class Settings(BaseSettings):
    # API Settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./finsight.db"
    
    # Firebase
    FIREBASE_PROJECT_ID: str = "finsight-9d1fd"
    FIREBASE_PRIVATE_KEY: str = ""
    
    # ML Models
    MODEL_PATH: str = "./model/"
    MAX_SEQUENCE_LENGTH: int = 100
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### 🔥 Firebase Configuration

#### Firebase Project Setup
1. **Create Firebase Project**: Go to [Firebase Console](https://console.firebase.google.com/)
2. **Enable Authentication**: Email/Password, Google Sign-In
3. **Setup Firestore Database**: Configure security rules
4. **Add Web App**: Copy configuration to `firebase.js`
5. **Add Android App**: Download `google-services.json`
6. **Add iOS App**: Download `GoogleService-Info.plist`

#### Firestore Security Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Admin-only access to admin collections
    match /admin/{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Public read access to fraud alerts
    match /fraud_alerts/{alertId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

#### Firebase Storage Rules
```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /user_data/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 🔐 API Security Configuration

#### Authentication Middleware
```python
# FinSightApp/API/middleware/auth.py
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer
import firebase_admin
from firebase_admin import auth

security = HTTPBearer()

async def verify_firebase_token(token: str = Depends(security)):
    try:
        decoded_token = auth.verify_id_token(token.credentials)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
```

#### CORS Configuration
```python
# FinSightApp/API/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:19006"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 🌐 Network Configuration

#### API Endpoints Configuration
```javascript
// Shared API configuration
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  ENDPOINTS: {
    AUTH: '/auth',
    SMS_ANALYSIS: '/predict-sms',
    SPAM_DETECTION: '/predict-spam',
    HEALTH: '/health',
    WEBSOCKET: '/ws'
  }
};
```

#### Proxy Configuration (Development)
```json
// finsight/package.json
{
  "proxy": "http://localhost:8000",
  "scripts": {
    "start": "HTTPS=true react-scripts start"
  }
}
```

## 📚 Additional Resources and Documentation

### 🔗 External Documentation Links

| Technology | Official Documentation | Tutorials |
|------------|------------------------|-----------|
| **React.js** | [React Docs](https://react.dev/) | [React Tutorial](https://react.dev/learn) |
| **React Native** | [RN Docs](https://reactnative.dev/) | [RN Tutorial](https://reactnative.dev/docs/tutorial) |
| **Expo** | [Expo Docs](https://docs.expo.dev/) | [Expo Tutorial](https://docs.expo.dev/tutorial/introduction/) |
| **FastAPI** | [FastAPI Docs](https://fastapi.tiangolo.com/) | [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/) |
| **Firebase** | [Firebase Docs](https://firebase.google.com/docs) | [Firebase Guides](https://firebase.google.com/docs/guides) |
| **TensorFlow** | [TensorFlow Docs](https://www.tensorflow.org/api_docs) | [ML Tutorials](https://www.tensorflow.org/tutorials) |

### 📖 Project-Specific Documentation

This repository contains extensive documentation for different aspects of the FinSight platform:

#### 🔧 Setup and Configuration
- **`FIREBASE_INTEGRATION_GUIDE.md`** - Complete Firebase setup and integration
- **`API_INTEGRATION_GUIDE.md`** - Backend API integration instructions
- **`MOBILE_APP_INTEGRATION_GUIDE.md`** - Mobile app development guide
- **`DEPLOYMENT_GUIDE.md`** - Production deployment guidelines

#### 🛡️ Security and Authentication
- **`ADMIN_FIREBASE_SETUP.md`** - Admin authentication setup
- **`EMAIL_DELIVERABILITY_GUIDE.md`** - Email configuration for authentication
- **`SMS_PERMISSION_DEBUG_GUIDE.md`** - SMS permissions troubleshooting

#### 📱 Mobile Features
- **`MOBILE_SMS_INTEGRATION_COMPLETE.md`** - SMS analysis implementation
- **`LOCATION_VERIFICATION_SYSTEM.md`** - GPS and location features
- **`AUTOMATIC_ULTRA_HIGH_PRECISION_GPS_SUMMARY.md`** - Advanced location tracking

#### 🔍 Analysis and Detection
- **`SMS_ANALYSIS_IMPROVEMENTS.md`** - SMS analysis algorithms
- **`FRAUD_MAPPING_INTEGRATION_GUIDE.md`** - Fraud detection and mapping
- **`DYNAMIC_SECURITY_SCORE_SYSTEM.md`** - Security scoring implementation
- **`REAL_TIME_ALERTS_IMPLEMENTATION.md`** - Real-time notification system

#### 🐛 Debugging and Maintenance
- **`TROUBLESHOOTING_GUIDE.md`** - Common issues and solutions
- **`DATA_PERSISTENCE_FIXES.md`** - Data storage troubleshooting
- **`MANUAL_ANALYSIS_DEBUG_FIXES.md`** - Analysis debugging guide
- **`RENDER_FIX.md`** - Deployment-specific fixes

### 🎓 Learning Resources

#### For Beginners
1. **JavaScript Fundamentals**: [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
2. **React Basics**: [React Beta Docs](https://beta.reactjs.org/learn)
3. **Python Basics**: [Python.org Tutorial](https://docs.python.org/3/tutorial/)
4. **Git Version Control**: [Git Handbook](https://guides.github.com/introduction/git-handbook/)

#### For Advanced Development
1. **React Performance**: [React Performance Optimization](https://react.dev/learn/render-and-commit)
2. **FastAPI Advanced**: [FastAPI Advanced User Guide](https://fastapi.tiangolo.com/advanced/)
3. **Mobile App Performance**: [React Native Performance](https://reactnative.dev/docs/performance)
4. **Machine Learning**: [TensorFlow Advanced Tutorials](https://www.tensorflow.org/tutorials/text/text_classification_rnn)

### 🛠️ Development Tools and Extensions

#### VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "ms-python.python",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "ms-vscode.vscode-typescript-next",
    "msjsdiag.vscode-react-native",
    "firebase.vscode-firebase-explorer",
    "ms-python.flake8"
  ]
}
```

#### Chrome Extensions for Development
- **React Developer Tools**: Debug React components
- **Redux DevTools**: State management debugging
- **Firebase Tools**: Firebase debugging and monitoring

#### Mobile Development Tools
- **Flipper**: React Native debugging
- **Android Studio**: Android development and emulation
- **Xcode**: iOS development (macOS only)

### 🧪 Testing Resources

#### Unit Testing
```bash
# Web App Testing
cd finsight
npm test

# API Testing
cd FinSightApp/API
python -m pytest tests/

# Mobile App Testing
cd FinSightApp
npm test
```

#### Integration Testing
- **Postman Collections**: API endpoint testing
- **Cypress**: End-to-end web testing
- **Detox**: React Native E2E testing

### 🎯 Best Practices

#### Code Style and Standards
- **ESLint Configuration**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Python PEP 8**: Python code style guide
- **React Guidelines**: React best practices

#### Security Best Practices
- **OWASP Top 10**: Web application security risks
- **Firebase Security Rules**: Database security guidelines
- **API Security**: FastAPI security best practices

---

## 🤝 Contributing to FinSight

We welcome contributions from the community! Here's how you can contribute:

### 🌟 Ways to Contribute

1. **🐛 Bug Reports**: Report issues with detailed steps to reproduce
2. **💡 Feature Requests**: Suggest new features or improvements
3. **📝 Documentation**: Improve documentation and guides
4. **🔧 Code Contributions**: Submit bug fixes and new features
5. **🧪 Testing**: Help test new features and report findings

### 📋 Contribution Guidelines

#### 1. Fork and Clone
```bash
# Fork the repository on GitHub
git clone https://github.com/yourusername/FinSight_Front_Back.git
cd FinSight_Front_Back-6
```

#### 2. Create Feature Branch
```bash
# Create a new branch for your feature
git checkout -b feature/your-feature-name
git checkout -b bugfix/issue-description
git checkout -b docs/documentation-update
```

#### 3. Development Standards
- **Code Style**: Follow existing code patterns and style guides
- **Testing**: Add tests for new features and bug fixes
- **Documentation**: Update relevant documentation
- **Commit Messages**: Use clear, descriptive commit messages

#### 4. Testing Checklist
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Manual testing completed
- [ ] Cross-platform compatibility verified (if applicable)
- [ ] Security implications considered

#### 5. Submit Pull Request
```bash
# Push your changes
git push origin feature/your-feature-name

# Create pull request on GitHub with:
# - Clear description of changes
# - Screenshots (if UI changes)
# - Testing notes
# - Related issue numbers
```

### 🏷️ Issue Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `enhancement` | New feature or request |
| `documentation` | Improvements or additions to docs |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention is needed |
| `security` | Security-related issues |
| `performance` | Performance improvements |

### 📝 Pull Request Template
```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing (if web changes)

## Screenshots
If applicable, add screenshots to help explain your changes.

## Related Issues
Closes #[issue number]
```

---

## 📄 License and Legal

### 📜 MIT License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2024 FinSight Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### ⚖️ Third-Party Licenses

This project uses several open-source libraries. Key licenses include:

- **React**: MIT License
- **React Native**: MIT License
- **Expo**: MIT License
- **FastAPI**: MIT License
- **Firebase**: Google Terms of Service
- **TensorFlow**: Apache License 2.0
- **Leaflet**: BSD 2-Clause License

### 🛡️ Privacy and Data Handling

- **SMS Data**: Processed locally and on secure servers only
- **User Data**: Stored securely using Firebase with encryption
- **Analytics**: Optional and anonymized data collection
- **GDPR Compliance**: Right to data deletion and export available

---

## 📞 Support and Community

### 🆘 Getting Help

1. **📖 Check Documentation**: Review this README and project docs first
2. **🔍 Search Issues**: Look for existing solutions in GitHub issues
3. **❓ Ask Questions**: Create a new issue with the "question" label
4. **💬 Community Discussion**: Join our community discussions

### 📧 Contact Information

- **Project Maintainer**: [GitHub Profile](https://github.com/Dohessiekan)
- **Email**: Contact through GitHub issues for project-related questions
- **Bug Reports**: Use GitHub Issues with detailed reproduction steps

### 🎯 Project Roadmap

#### Current Version: v1.0.0
- ✅ Basic SMS analysis functionality
- ✅ Firebase authentication
- ✅ Web admin dashboard
- ✅ Mobile app with core features
- ✅ ML-powered fraud detection

#### Upcoming Features (v1.1.0)
- 🔄 Enhanced real-time analysis
- 📊 Advanced analytics dashboard
- 🌍 Multi-language support
- 🔔 Improved notification system
- 📱 Offline functionality

#### Future Plans (v2.0.0)
- 🤖 Advanced AI models
- 🏦 Bank API integrations
- 📈 Predictive analytics
- 🔐 Enhanced security features
- 🌐 Multi-platform support

---

## 📦 Download Links and Demo

### 📱 Mobile App Downloads

| Platform | Download Link | Version | Size |
|----------|---------------|---------|------|
| **Android APK** | [Download Latest APK](https://github.com/Dohessiekan/FinSight_Front_Back/releases/latest/download/app-release.apk) | v1.0.0 | ~25MB |
| **Google Play** | Coming Soon | - | - |
| **iOS App Store** | Coming Soon | - | - |

### 🎥 Demo and Tutorials

| Resource | Link | Description |
|----------|------|-------------|
| **Project Demo Video** | [Watch on YouTube](https://youtu.be/5sw7XxZTTF0) | Complete project walkthrough |
| **Installation Guide** | [Video Tutorial](#) | Step-by-step setup guide |
| **Feature Overview** | [Demo Site](#) | Live web demo |

### 🔗 Related Links

- **GitHub Repository**: [FinSight_Front_Back](https://github.com/Dohessiekan/FinSight_Front_Back)
- **Issue Tracker**: [GitHub Issues](https://github.com/Dohessiekan/FinSight_Front_Back/issues)
- **Release Notes**: [GitHub Releases](https://github.com/Dohessiekan/FinSight_Front_Back/releases)
- **Project Wiki**: [GitHub Wiki](https://github.com/Dohessiekan/FinSight_Front_Back/wiki)

---

## 🎉 Acknowledgments

### 👥 Contributors
Special thanks to all contributors who have helped make FinSight better:

- **Core Development Team**: Initial development and architecture
- **Community Contributors**: Bug reports, feature suggestions, and testing
- **Beta Testers**: Early feedback and testing on mobile devices

### 🙏 Special Thanks

- **Firebase Team**: For excellent authentication and database services
- **Expo Team**: For simplifying React Native development
- **FastAPI Team**: For the excellent Python web framework
- **TensorFlow Team**: For machine learning capabilities
- **React Team**: For the amazing frontend framework
- **Open Source Community**: For the countless libraries that make this project possible

### 🏆 Powered By

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white" />
  <img src="https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
</div>

---

<div align="center">

**⭐ If you find FinSight useful, please consider giving it a star on GitHub! ⭐**

**📢 Share FinSight with others who might find it helpful for financial SMS analysis!**

*Made with ❤️ by the FinSight Team*

</div>

## 🐛 Troubleshooting Guide

### 🔧 Common Issues and Solutions

#### 1. **Backend API Issues**

**❌ Problem**: API server won't start
```bash
# Error: "Port 8000 is already in use"
```
**✅ Solution**:
```bash
# Windows - Find and kill process using port 8000
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Alternative: Use different port
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**❌ Problem**: ML Models not loading
```bash
# Error: "FileNotFoundError: model_sentiment.keras not found"
```
**✅ Solution**:
```bash
# Verify model files exist
ls -la FinSightApp/model_sentiment.keras
ls -la FinSightApp/tokenizer.pkl
ls -la FinSightApp/label_encoder.pkl
ls -la FinSightApp/max_len.pkl

# If missing, download from releases or train new models
```

**❌ Problem**: Python dependencies installation fails
```bash
# Error: "Failed building wheel for tensorflow"
```
**✅ Solution**:
```bash
# Update pip and setuptools
pip install --upgrade pip setuptools wheel

# Install Visual C++ Build Tools (Windows)
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Install dependencies one by one
pip install tensorflow==2.19.0
pip install fastapi uvicorn
pip install -r requirements.txt
```

#### 2. **Web Application Issues**

**❌ Problem**: React app won't start
```bash
# Error: "Module not found: Can't resolve 'react-router-dom'"
```
**✅ Solution**:
```bash
cd finsight
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm start
```

**❌ Problem**: Firebase connection issues
```bash
# Error: "Firebase configuration object is invalid"
```
**✅ Solution**:
```javascript
// Check firebase.js configuration
const firebaseConfig = {
  apiKey: "your-actual-api-key",           // ✅ Must be actual key
  authDomain: "finsight-9d1fd.firebaseapp.com",
  projectId: "finsight-9d1fd",
  storageBucket: "finsight-9d1fd.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Verify Firebase project is active
firebase projects:list
```

**❌ Problem**: API calls failing from web app
```bash
# Error: "Network Error" or "CORS policy" error
```
**✅ Solution**:
```javascript
// Check API base URL in config
const API_BASE_URL = 'http://localhost:8000';  // ✅ Correct
const API_BASE_URL = 'https://localhost:8000'; // ❌ Wrong (use http in dev)

// Verify API is running
curl http://localhost:8000/health
```

#### 3. **Mobile Application Issues**

**❌ Problem**: Expo won't start
```bash
# Error: "Expo CLI not found"
```
**✅ Solution**:
```bash
# Install Expo CLI globally
npm install -g @expo/cli

# Alternative: Use npx
npx expo start

# Check Expo CLI version
expo --version
```

**❌ Problem**: API connection from mobile app
```bash
# Error: "Network request failed"
```
**✅ Solution**:
```javascript
// Update API_BASE_URL in src/utils/api.js
// Find your local IP address first

// Windows
ipconfig | findstr "IPv4"

// Update API configuration
const API_BASE_URL = 'http://192.168.1.100:8000';  // Your actual IP

// Test API connectivity
ping 192.168.1.100
curl http://192.168.1.100:8000/health
```

**❌ Problem**: Metro bundler cache issues
```bash
# Error: "Unable to resolve module" or "Unexpected token"
```
**✅ Solution**:
```bash
cd FinSightApp

# Clear all caches
npx expo start --clear
npx expo start --reset-cache

# Alternative: Manual cache clearing
rm -rf node_modules/.cache
rm -rf .expo
npm start
```

**❌ Problem**: Android build issues
```bash
# Error: "Android SDK not found"
```
**✅ Solution**:
```bash
# Set Android SDK path
export ANDROID_SDK_ROOT=$HOME/Android/Sdk  # Linux/macOS
set ANDROID_SDK_ROOT=C:\Users\%USERNAME%\AppData\Local\Android\Sdk  # Windows

# Verify Android SDK
adb version

# Check connected devices
adb devices
```

#### 4. **Firebase Authentication Issues**

**❌ Problem**: User authentication failing
```bash
# Error: "Firebase Auth domain not authorized"
```
**✅ Solution**:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Authentication → Settings → Authorized domains
4. Add `localhost` and your domain
5. Verify email/password sign-in is enabled

**❌ Problem**: Firestore permission denied
```bash
# Error: "Missing or insufficient permissions"
```
**✅ Solution**:
```javascript
// Update Firestore rules in Firebase Console
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;  // Allow authenticated users
    }
  }
}
```

#### 5. **Development Environment Issues**

**❌ Problem**: Node.js version compatibility
```bash
# Error: "Unsupported engine" or npm warnings
```
**✅ Solution**:
```bash
# Check Node.js version
node --version  # Should be v18.0.0 or higher

# Update Node.js if needed
# Download from: https://nodejs.org/

# Use Node Version Manager (recommended)
nvm install 18
nvm use 18
```

**❌ Problem**: Python virtual environment issues
```bash
# Error: "Command not found: python"
```
**✅ Solution**:
```bash
# Windows: Use py launcher
py -3 --version
py -3 -m venv finsight_env

# Add Python to PATH
# Windows: System Properties → Environment Variables → Path

# Verify Python installation
python --version
python3 --version
```

### 🔍 Debugging Tools and Commands

#### Backend Debugging
```bash
# Check API health
curl -v http://localhost:8000/health

# Test specific endpoints
curl -X POST "http://localhost:8000/predict-spam" \
     -H "Content-Type: application/json" \
     -d '{"text": "test message"}'

# Check Python environment
pip list | grep -E "(fastapi|tensorflow|uvicorn)"

# View API logs
tail -f logs/app.log  # If logging to file
```

#### Frontend Debugging
```bash
# Web app debugging
npm run build  # Check for build errors
npm run analyze  # Bundle size analysis

# Mobile app debugging
npx expo doctor  # Check for issues
npx expo diagnostics  # Detailed diagnostics

# Check package versions
npm ls react react-native @expo/cli
```

#### Network Debugging
```bash
# Test network connectivity
ping google.com
nslookup firebase.googleapis.com

# Check firewall settings (Windows)
netsh advfirewall firewall show rule name="Node.js Server App"

# Test local API from different device
curl http://YOUR_IP:8000/health
```

### 📞 Getting Additional Help

#### Log File Locations
- **Backend API**: `FinSightApp/API/logs/`
- **Web App**: Browser Developer Tools → Console
- **Mobile App**: Use `npx expo logs`

#### Useful Debugging Commands
```bash
# Check all running processes on relevant ports
netstat -tulpn | grep -E "(3000|8000|19000|19001|19002)"

# Verify Git repository status
git status
git log --oneline -10

# Check system resources
# Windows: Task Manager
# macOS: Activity Monitor
# Linux: htop or top
```

#### When to Seek Help
1. **Create GitHub Issue**: For reproducible bugs with clear steps
2. **Check Documentation**: Refer to specific guide files in the project
3. **Stack Overflow**: For general React/React Native/FastAPI questions
4. **Firebase Support**: For Firebase-specific authentication/database issues

#### Issue Reporting Template
```markdown
## Bug Report

**Environment:**
- OS: [Windows/macOS/Linux]
- Node.js version: [version]
- Python version: [version]
- Component: [Web/Mobile/API]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Error Messages:**
```
[Paste error messages here]
```

**Screenshots:**
[If applicable]
```

## � Production Deployment

### 📋 Deployment Checklist

#### Pre-Deployment Requirements
- [ ] All environment variables configured
- [ ] Firebase project setup and configured
- [ ] SSL certificates obtained
- [ ] Domain names configured
- [ ] Production database setup
- [ ] ML models trained and optimized
- [ ] Security review completed
- [ ] Performance testing completed

#### Environment Variables for Production
```env
# Production Environment Variables
NODE_ENV=production
REACT_APP_ENV=production

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://user:pass@host:port/db

# Firebase Production Config
REACT_APP_FIREBASE_API_KEY=prod_api_key
REACT_APP_FIREBASE_PROJECT_ID=finsight-prod

# Security
SECRET_KEY=strong_production_secret_key
JWT_SECRET=jwt_production_secret
```

### 🌐 Web Application Deployment

#### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from finsight directory
cd finsight
vercel --prod

# Configure environment variables in Vercel dashboard
```

#### Option 2: Netlify
```bash
# Build for production
cd finsight
npm run build

# Deploy to Netlify
# Upload build/ folder or connect GitHub repository
```

#### Option 3: Traditional Hosting
```bash
# Build production bundle
npm run build

# Serve using nginx/apache
# Configure reverse proxy for API calls
```

### 🐍 Backend API Deployment

#### Option 1: Render (Current Setup)
```yaml
# render.yaml
services:
  - type: web
    name: finsight-api
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: PYTHON_VERSION
        value: 3.9.16
```

#### Option 2: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy API
cd FinSightApp/API
railway login
railway init
railway up
```

#### Option 3: Docker Deployment
```dockerfile
# Dockerfile for API
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 📱 Mobile App Deployment

#### Android Deployment (Google Play Store)
```bash
cd FinSightApp

# Build production APK
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

#### iOS Deployment (App Store)
```bash
# Build for iOS (requires macOS)
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

#### Standalone APK for Direct Distribution
```bash
# Build standalone APK
eas build --platform android --profile preview

# Download APK from Expo dashboard
# Distribute via website or direct download
```

### 🔒 Security Hardening for Production

#### API Security
```python
# FinSightApp/API/main.py - Production settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app = FastAPI(docs_url=None, redoc_url=None)  # Disable docs in production

# Restrict CORS to specific domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Trust only specific hosts
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
)
```

#### Firebase Security Rules (Production)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Strict user data access
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId
        && request.auth.token.firebase.sign_in_provider != 'anonymous';
    }
    
    // Admin access with additional verification
    match /admin/{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.token.email_verified == true
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### � Performance Optimization

#### Web App Optimization
```bash
# Build with optimizations
cd finsight
npm run build:prod

# Analyze bundle size
npm run analyze

# Enable compression and caching
# Configure in web server (nginx/apache)
```

#### Mobile App Optimization
```javascript
// FinSightApp/metro.config.js
module.exports = {
  transformer: {
    minifierConfig: {
      keep_classnames: true,
      keep_fnames: true,
      mangle: {
        keep_classnames: true,
        keep_fnames: true,
      },
    },
  },
};
```

#### API Optimization
```python
# FinSightApp/API/main.py
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Production server config
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        workers=4,  # Multiple workers for production
        access_log=False,  # Disable for performance
    )
```

### 🔍 Monitoring and Logging

#### Application Monitoring
```python
# Add logging and monitoring
import logging
from fastapi import Request
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    logging.info(
        f"{request.method} {request.url} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.2f}s"
    )
    return response
```

#### Health Check Endpoints
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": "1.0.0"
    }

@app.get("/metrics")
async def metrics():
    # Add application metrics
    return {
        "requests_total": request_count,
        "response_time_avg": avg_response_time,
        "active_users": active_user_count
    }
```

### 🔄 CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy FinSight

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - run: pip install -r FinSightApp/API/requirements.txt
      - run: python FinSightApp/API/test_predict_sms.py
      # Deploy to production server

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd finsight && npm install && npm run build
      # Deploy to Vercel/Netlify

  build-mobile:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd FinSightApp && npm install
      - run: npx eas-cli build --platform all --non-interactive
```

### 📈 Scaling Considerations

#### Database Scaling
- Use PostgreSQL for production instead of SQLite
- Implement connection pooling
- Add database indexes for frequently queried fields
- Consider read replicas for heavy read workloads

#### API Scaling
- Use multiple Uvicorn workers
- Implement Redis for caching
- Add API rate limiting
- Use load balancer for multiple API instances

#### CDN and Static Assets
- Use CDN for static assets (images, CSS, JS)
- Optimize images and compress assets
- Implement browser caching headers

APK Link: ## 📦 Download

[![Download APK](https://img.shields.io/badge/Download-APK-blue?logo=android&style=for-the-badge)](https://github.com/Dohessiekan/FinSight_Front_Back/releases/download/v0/app-release.apk)

Dashboard Link: https://finsight-front-back-3.onrender.com
