# FinSight API Deployment Guide

## 🚀 Render.com Deployment

### Current Configuration:
- **Service Name**: finsight-api  
- **Deployment URL**: https://finsight-api.onrender.com
- **Plan**: Free tier
- **Python Version**: 3.8.10
- **Health Check**: /docs endpoint

### Deployment Steps:

1. **Connect Repository to Render**:
   - Go to https://render.com
   - Sign up/login with GitHub
   - Click "New" → "Web Service"
   - Connect your `FinSight_Front_Back` repository
   - Render auto-detects `render.yaml`

2. **Monitor Deployment**:
   - Check build logs for any errors
   - Verify ML models load correctly
   - Test API endpoints at https://finsight-api.onrender.com/docs

3. **Update Mobile App**:
   - APK now uses production API: `https://finsight-api.onrender.com`
   - For local development, change to `development` in `api.js`

### Important Notes:

#### Free Tier Limitations:
- **Sleep after 15 minutes** of inactivity
- **Cold start** takes 30-60 seconds to wake up
- **750 hours/month** usage limit

#### ML Model Considerations:
- Models must be < 500MB for deployment
- TensorFlow models should load correctly
- Check logs for any import errors

### API Endpoints Available:
- `GET /docs` - API documentation
- `POST /predict-spam` - Spam detection
- `POST /predict-sms` - SMS financial analysis
- `POST /predict` - Legacy endpoint

### Testing Your Deployed API:
```bash
# Test spam detection
curl -X POST "https://finsight-api.onrender.com/predict-spam" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}'

# Test SMS analysis  
curl -X POST "https://finsight-api.onrender.com/predict-sms" \
  -H "Content-Type: application/json" \
  -d '{"messages": ["RWF 1000 sent to John"]}'
```

### Troubleshooting:
- **500 errors**: Check ML model files are present
- **Timeout**: API is waking up from sleep (wait 60 seconds)
- **CORS errors**: Already configured for mobile apps
- **Build failures**: Check Python dependencies in requirements.txt

## 📱 Mobile App Configuration

### Production APK:
- Uses: `https://finsight-api.onrender.com`
- Works from any internet connection
- No local server required

### Development:
- Change API_CONFIG.development in `src/utils/api.js`
- Set `API_BASE_URL = API_CONFIG.development`
- Requires local API server running

## 🔄 Switching Environments:

In `FinSightApp/src/utils/api.js`:

```javascript
// For APK distribution (production)
const API_BASE_URL = API_CONFIG.production;

// For local development  
const API_BASE_URL = API_CONFIG.development;
```
