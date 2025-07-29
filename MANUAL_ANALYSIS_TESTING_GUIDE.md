# Manual Message Analysis Feature - Testing Guide

## 🎯 Feature Overview
The manual message analysis feature allows users to manually paste and analyze SMS messages for fraud detection through the FinSight mobile app.

## 📍 Location
**File**: `FinSightApp/src/screens/MessagesScreen.js`  
**Component**: Manual analysis section within MessagesScreen

## 🔧 How to Test

### 1. Access the Feature
1. Open the FinSight mobile app
2. Navigate to the Messages screen
3. Look for the **"Manual"** button in the header (next to the "Scan" button)

### 2. Test the UI Flow
1. **Click "Manual" button** → Manual input section should appear
2. **Text input field** → Should be ready for pasting messages
3. **"Analyze" button** → Should be enabled when text is entered
4. **"Clear" button** → Should clear the input and hide results

### 3. Test Different Message Types

#### Safe Transaction Message
```
Your account balance is RWF 50,000. Thank you for banking with us.
```
**Expected Result**: ✅ Safe status, low risk score

#### Suspicious Message
```
Congratulations! You have won a lottery prize. Click here to claim your reward.
```
**Expected Result**: ⚠️ Suspicious status, medium risk score

#### Fraud Message
```
URGENT: Your account is locked. Send your PIN and password to verify immediately.
```
**Expected Result**: 🚨 Fraud status, high risk score

#### Transaction Message
```
You have received RWF 25,000 from John Doe. Your new balance is RWF 75,000.
```
**Expected Result**: ✅ Safe status, legitimate transaction

### 4. Test API Integration
The feature uses the `scanMessages()` function which calls the `/predict-spam` endpoint:

```javascript
// Test with manual message
const result = await scanMessages([manualInput]);
```

### 5. Test Firebase Integration
When fraud is detected, the message should be saved to Firebase with:
- User ID
- Message content
- Analysis result
- Risk score
- Timestamp
- Source: "Manual Analysis"

### 6. Test Error Handling
1. **Network Error**: Try with API server offline
2. **Empty Input**: Try analyzing empty message
3. **Long Message**: Try with very long text
4. **Special Characters**: Try with emojis and symbols

## 🔍 Expected Behavior

### UI States
- **Hidden**: Manual section not visible initially
- **Visible**: Manual section appears when "Manual" button clicked
- **Loading**: Shows activity indicator during analysis
- **Results**: Displays analysis results with appropriate icons and colors
- **Error**: Shows error message if analysis fails

### API Integration
- **Input**: Single message text
- **Processing**: Calls `/predict-spam` endpoint
- **Output**: Returns label, confidence, and probabilities
- **Fallback**: Uses local keyword-based detection if API fails

### Firebase Integration
- **Fraud Detection**: Saves messages with 'fraud' or 'suspicious' status
- **Safe Messages**: May optionally save for user history
- **Metadata**: Includes analysis details and user context

## 🐛 Common Issues to Watch For

1. **Button Not Responsive**: Check if `showManualInput` state is updating
2. **API Errors**: Verify API server is running on correct port
3. **Loading Stuck**: Check for proper loading state management
4. **Firebase Errors**: Verify user authentication and Firebase config
5. **Results Not Showing**: Check `manualResult` state updates

## ✅ Success Criteria

The feature is working correctly if:
- [ ] Manual button toggles input section visibility
- [ ] Text input accepts pasted content
- [ ] Analysis processes messages correctly
- [ ] Results display with appropriate status indicators
- [ ] Fraud messages are saved to Firebase
- [ ] Error handling works gracefully
- [ ] UI remains responsive throughout the process

## 🔧 Developer Testing

Run the automated test:
```javascript
import ManualAnalysisTest from '../tests/ManualAnalysisTest';

// Run comprehensive test
ManualAnalysisTest.testManualAnalysis().then(results => {
  console.log('Test Results:', results);
});

// Simulate workflow
ManualAnalysisTest.simulateManualWorkflow();
```

## 📱 Device Testing

Test on different devices:
- **Android**: Various screen sizes and Android versions
- **iOS**: Different iPhone models and iOS versions
- **Tablets**: Ensure responsive design works properly

---

**Note**: This feature complements the existing automated SMS scanning and provides users with on-demand analysis capability for any suspicious messages they receive.
