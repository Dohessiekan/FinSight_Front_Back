# API Configuration Guide for FinSightApp

## Current Configuration Status

### ❌ Issues with APK Distribution:
- The APK includes a hardcoded local IP address
- Users who download the APK won't be able to connect to the API
- The API server needs to be publicly accessible for the APK to work

## Solutions:

### Option 1: Deploy API to Production (Recommended)
1. Deploy your Python FastAPI backend to a cloud service:
   - **Heroku**: https://heroku.com (Free tier available)
   - **Railway**: https://railway.app (Modern deployment)
   - **DigitalOcean**: https://digitalocean.com (More control)
   - **AWS/Google Cloud**: Enterprise solutions

2. Update the production API URL in:
   - `eas.json` (production.env.EXPO_PUBLIC_API_BASE_URL)
   - `src/utils/api.js` (fallback production URL)

3. Rebuild the APK with: `eas build --platform android --profile production`

### Option 2: Use ngrok for Testing (Temporary)
1. Install ngrok: https://ngrok.com/
2. Start your API: `python main.py`
3. In another terminal: `ngrok http 8000`
4. Use the ngrok URL (e.g., `https://abc123.ngrok.io`) as your API URL

## Current Configuration:
- **Development**: http://192.168.0.101:8000 (your local machine)
- **Production**: https://your-production-api.herokuapp.com (NEEDS TO BE UPDATED)

## To Fix Your APK:
1. Deploy your API to a public server
2. Update the production URL in the configuration files
3. Rebuild the APK with the production profile
4. Test the APK on a different network to ensure it works

## Environment Variables:
- `EXPO_PUBLIC_API_BASE_URL`: API server URL
- `EXPO_PUBLIC_ENV`: Environment (development/production)

## Build Commands:
```bash
# Development build (local API)
eas build --platform android --profile development

# Production build (public API)
eas build --platform android --profile production
```
