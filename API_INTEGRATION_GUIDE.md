# FinSight Unified API Integration Guide

## 🎯 Overview
The FinSight app now uses a unified API that combines Financial Summary and SMS Spam Detection capabilities, providing comprehensive analysis for both dashboard insights and fraud protection.

## 🏗️ API Architecture

### Unified API Server (`/FinSightApp/API/main.py`)
**Base URL:** `http://192.168.0.103:8000`

#### 🔧 Core Features
- **Financial Summary**: Extract transaction data from SMS messages
- **Spam Detection**: ML-powered spam classification with confidence scores
- **Comprehensive Analysis**: Combined financial + spam analysis in one call
- **Offline Fallbacks**: Mock data when API is unavailable
- **Error Handling**: Graceful degradation with fallback responses

## 📡 API Endpoints

### 1. Financial Summary
```
POST /financial-summary
```
**Purpose**: Extract financial insights from SMS transaction messages  
**Used by**: Dashboard screen, financial summaries  
**Input**: Array of SMS messages  
**Output**: Transaction totals, balance, monthly summaries

### 2. Spam Detection (Single)
```
POST /spam-detection
```
**Purpose**: Classify individual message as spam/legitimate  
**Used by**: Real-time message analysis  
**Input**: Single message text  
**Output**: Spam classification with confidence score

### 3. Spam Detection (Batch)
```
POST /spam-detection/batch
```
**Purpose**: Analyze multiple messages for spam  
**Used by**: Bulk message processing  
**Input**: Array of messages  
**Output**: Batch spam analysis with statistics

### 4. Comprehensive Analysis
```
POST /analyze-messages
```
**Purpose**: Combined financial + spam analysis  
**Used by**: Messages screen comprehensive scanning  
**Input**: Array of SMS messages  
**Output**: Financial summary + spam analysis combined

### 5. Health Check
```
GET /health
```
**Purpose**: Check API status and service availability

## 🔌 Frontend Integration

### API Client (`/src/utils/api.js`)

#### Core Functions
```javascript
// Financial Analysis
getFinancialSummary(messages, userId)

// Spam Detection
detectSpam(message, userId)
detectSpamBatch(messages, userId)

// Comprehensive Analysis
analyzeMessagesComprehensive(messages, userId)

// Legacy Support
getSmsSummary(messages) // Backward compatibility
analyzeMessages(messages) // Enhanced version
```

#### Error Handling Strategy
1. **API Available**: Use real ML predictions
2. **API Timeout**: Return cached/mock data
3. **API Unavailable**: Fallback to rule-based classification
4. **Network Error**: Use offline cached responses

## 📱 App Screen Integration

### 1. Dashboard Screen (`DashboardScreen.js`)
**Connection**: Financial Summary API
- **Function**: `fetchRealSummary()` → `getSmsSummary()`
- **Purpose**: Display financial totals, transaction counts, balances
- **Fallback**: Mock financial data when API unavailable
- **Updates**: Security score based on suspicious transactions

### 2. Messages Screen (`MessagesScreen.js`)
**Connection**: Comprehensive Analysis API
- **Function**: `scanAndAnalyzeMessages()` → `analyzeMessagesComprehensive()`
- **Purpose**: Fraud detection, financial extraction, message classification
- **Fallback**: Individual message analysis if comprehensive fails
- **Storage**: Results saved to Firebase for offline access

### 3. Offline Support
Both screens maintain offline functionality:
- **AsyncStorage**: Cache API responses
- **Firebase**: Store analyzed messages
- **Mock Data**: Provide sample data when offline

## 🛡️ ML Model Integration

### Spam Detection Models
Required files in `/API/` directory:
- `spam_classifier.h5` - TensorFlow/Keras model
- `tokenizer.pkl` - Text preprocessing tokenizer
- `label_encoder.pkl` - Label encoding for predictions
- `max_len.pkl` - Maximum sequence length

### Model Loading
- **Startup**: Models loaded when API starts
- **Error Handling**: API continues with rule-based fallbacks if models missing
- **Status**: Health check reports model availability

## 🔄 Migration Notes

### From Previous API
- ✅ Backward compatibility maintained
- ✅ Legacy endpoints still work (`/predict`)
- ✅ Existing functions enhanced, not replaced
- ✅ Gradual migration path available

### New Capabilities Added
- 🆕 Real-time spam detection
- 🆕 Batch processing for efficiency
- 🆕 Comprehensive analysis combining multiple insights
- 🆕 Enhanced error handling and fallbacks
- 🆕 User-specific tracking with `user_id`

## 📊 Data Flow

### Dashboard Financial Summary
```
User Refreshes → getSmsSummary() → /financial-summary → 
Process Transactions → Update UI → Cache Results → 
Update Security Score
```

### Messages Spam Detection
```
User Scans Messages → scanAndAnalyzeMessages() → 
/analyze-messages → ML Analysis → Classify Spam/Safe → 
Save to Firebase → Update Message List → Show Results
```

## 🚀 Deployment & Setup

### API Server
1. Install dependencies: `pip install -r requirements.txt`
2. Place ML model files in `/API/` directory
3. Run server: `python main.py`
4. Verify at: `http://localhost:8000/health`

### Frontend Configuration
1. Update `API_BASE_URL` in `/src/utils/api.js`
2. Ensure network connectivity to API server
3. Test with: `checkApiHealth()` function

### Model Files (Optional)
- **With Models**: Full ML-powered spam detection
- **Without Models**: Rule-based fallback classification
- **Recommendation**: Deploy with models for production

## 🔧 Troubleshooting

### Common Issues
1. **API Connection Failed**: Check `API_BASE_URL` and network
2. **Models Not Loading**: Verify model files in correct directory
3. **Slow Responses**: Check if comprehensive analysis is overloading
4. **Mock Data Showing**: API unavailable, normal fallback behavior

### Debug Tools
- Health check endpoint: `/health`
- Console logs in app show API call status
- Network tab in developer tools for API requests

## 📈 Performance Optimization

### Implemented
- **Batch Processing**: Multiple messages in single API call
- **Caching**: AsyncStorage for offline access
- **Fallbacks**: Immediate responses when API unavailable
- **Lazy Loading**: Models loaded only when needed

### Recommendations
- Use comprehensive analysis for bulk operations
- Cache frequently accessed data
- Monitor API response times
- Implement request timeouts

## 🔮 Future Enhancements

### Planned Features
- Real-time streaming analysis
- Advanced fraud pattern detection
- User behavior learning
- Enhanced financial insights
- Multi-language support

### Extension Points
- Additional ML models for fraud detection
- Integration with external financial APIs
- Advanced analytics and reporting
- Custom user preferences and settings
