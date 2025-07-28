# 🧪 Quick Test Guide - Fraud Map Integration

## 🎯 How to Test the Map Connection

### 1. Check Web App Map (Currently Running)
Since your web app is already running, you can:

1. **Open your browser** to `http://localhost:3000`
2. **Navigate to Overview** page
3. **Scroll down** to find "Fraud Activity Map - Rwanda"
4. **Look for map markers** showing existing fraud alerts

### 2. Test Mobile App Connection

```bash
# In FinSightApp directory:
cd FinSightApp
npx react-native run-android
```

Then:
1. **Run SMS analysis** on a suspicious message
2. **Allow location permission** when prompted
3. **Check web app map** for new alert marker

### 3. Verify Firebase Data

1. **Open Firebase Console**: https://console.firebase.google.com/project/finsight-9d1fd
2. **Go to Firestore Database**
3. **Check `fraudAlerts` collection**
4. **Look for documents with location data**

## 🔍 What to Look For

### On the Web Map
- ✅ Red/orange markers on Rwanda map
- ✅ Popup details when clicking markers
- ✅ Real-time updates (new alerts appear automatically)
- ✅ Rwanda-centered view with proper zoom

### In Mobile App
- ✅ Location permission request
- ✅ GPS coordinates in fraud alerts
- ✅ Successful Firebase saves
- ✅ Console logs showing location data

### In Firebase Console
- ✅ New documents in `fraudAlerts` collection
- ✅ Location coordinates in alert data
- ✅ `location.quality.hasRealGPS: true` for GPS alerts
- ✅ Timestamp showing recent creation

## 🚨 Expected Behavior

### When Mobile App Detects Fraud:
1. **Permission Request**: "Allow FinSight to access location?"
2. **GPS Acquisition**: Getting current coordinates
3. **Firebase Save**: Fraud alert with location data
4. **Web Map Update**: New marker appears immediately
5. **Admin View**: Detailed popup with fraud info

### Map Filtering Logic:
- **Shows**: Real GPS alerts, recent fraud, active status
- **Hides**: Default locations, safe messages, old alerts

## 🛠️ Troubleshooting

### If Map is Empty:
1. Check if mobile app has created any fraud alerts
2. Verify Firebase connection in browser console
3. Look for location permission issues
4. Check date filters (30-day window)

### If Mobile App Can't Get Location:
1. Ensure location permissions are granted
2. Check Android manifest has location permissions
3. Try in outdoor environment for better GPS
4. Verify fallback to Rwanda regions works

### If Real-time Updates Don't Work:
1. Check browser console for Firebase errors
2. Verify Firebase real-time listeners are active
3. Test manual refresh of web page
4. Check Firebase rules and authentication

## 📱 Mobile App Locations to Test

### Test with these Rwanda locations:
- **Kigali City**: Should show as real GPS if in Kigali
- **Huye District**: Regional approximation if GPS fails
- **Musanze District**: Northern Rwanda test location
- **Rubavu District**: Western border location

## 🎯 Success Indicators

### ✅ Everything Working:
- Web map shows fraud markers in Rwanda
- Mobile app gets location permissions
- Firebase receives location data
- Real-time updates work instantly
- Map filters show only real GPS alerts

### 🔧 Configuration Complete:
- Both apps use same Firebase project
- Location permissions properly set
- Data format matches map expectations
- Real-time listeners active
- GPS quality detection working

## 📊 Next Steps After Testing

1. **Deploy to production** environment
2. **Monitor Firebase usage** and costs
3. **Collect user feedback** on location accuracy
4. **Analyze fraud patterns** from map data
5. **Implement additional features** as needed

---

**The fraud map integration is now ready for real-world use!** 🚀

*Test thoroughly in different locations across Rwanda to verify accuracy.*
