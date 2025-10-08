# VoiceTrans Heroku Deployment Guide

Complete reference for deploying VoiceTrans to production on Heroku.

## 🌐 Production URLs

**Frontend:** https://www.vtranslab.com/
**Backend API:** https://api.vtranslab.com/
**API Docs:** https://api.vtranslab.com/docs

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Environment Variables](#environment-variables)
5. [SSL/HTTPS Configuration](#sslhttps-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Files Reference](#files-reference)

---

## Quick Start

### Prerequisites
- Heroku account
- Heroku CLI installed
- Git installed
- API keys (Fireworks, Gemini)

### Deploy Both Apps

```bash
# 1. Backend
cd web_app/backend
heroku create voicetrans-backend
heroku config:set FIREWORKS_API_KEY="your-key" GEMINI_API_KEY="your-key"
git push heroku deployment:master

# 2. Frontend
cd web_app/frontend
heroku create voicetrans-frontend
heroku config:set VITE_API_URL="https://api.vtranslab.com"
git push heroku deployment:master

# 3. Add custom domains
heroku domains:add www.vtranslab.com --app voicetrans-frontend
heroku domains:add api.vtranslab.com --app voicetrans-backend

# 4. Enable SSL
heroku certs:auto:enable --app voicetrans-frontend
heroku certs:auto:enable --app voicetrans-backend
```

---

## Backend Setup

### Files Created
- `Procfile` - Uvicorn server configuration
- `runtime.txt` - Python 3.11.9
- `.python-version` - Python 3.11
- `requirements.txt` - Updated with websockets>=13.0
- `.env.example` - Environment template

### Key Changes
1. **Auto-load API keys from Heroku Config Vars**
   ```python
   # Prioritizes environment variables over config.json
   fireworks_key = os.getenv('FIREWORKS_API_KEY')
   gemini_key = os.getenv('GEMINI_API_KEY')
   ```

2. **CORS for custom domains**
   ```python
   allow_origins=[
       "https://www.vtranslab.com",
       "https://vtranslab.com",
       "http://localhost:3000",
       "http://localhost:5173",
   ]
   ```

3. **Dynamic PORT binding**
   ```python
   port = int(os.environ.get("PORT", 8002))
   ```

### Deployment Commands
```bash
cd web_app/backend
git init
git add .
git commit -m "Backend deployment setup"
heroku create voicetrans-backend
heroku config:set FIREWORKS_API_KEY="xxx" GEMINI_API_KEY="xxx"
heroku buildpacks:set heroku/python
git push heroku master
```

### Test Backend
```bash
curl https://api.vtranslab.com/
# Should return: {"status":"online",...}
```

---

## Frontend Setup

### Files Created
- `Procfile` - Static file server
- `static.json` - SPA routing config
- `.gitignore` - Exclude node_modules
- `.env.production` - Production URLs
- `.env.example` - Environment template

### Key Changes
1. **Inline Audio Worklet** (fixes production bundling)
   ```javascript
   const workletCode = `...PCM processor code...`
   const blob = new Blob([workletCode], { type: 'application/javascript' })
   const workletUrl = URL.createObjectURL(blob)
   await audioContext.audioWorklet.addModule(workletUrl)
   ```

2. **HTTPS/WSS for microphone access**
   ```env
   VITE_API_URL=https://api.vtranslab.com
   VITE_WS_URL=wss://api.vtranslab.com/ws/stream
   ```

3. **Removed API key configuration**
   ```javascript
   const isConfigured = true  // Backend handles API keys
   ```

### Deployment Commands
```bash
cd web_app/frontend
git init
git add .
git commit -m "Frontend deployment setup"
heroku create voicetrans-frontend
heroku buildpacks:set heroku/nodejs
git push heroku master
```

### Test Frontend
Visit: https://www.vtranslab.com/

---

## Environment Variables

### Backend (Heroku Config Vars)
```bash
heroku config:set \
  FIREWORKS_API_KEY="fw_xxxxx" \
  GEMINI_API_KEY="AIzaSyBNUM6wm1YcLAbR44xUK-n6lA6tVmE95Os" \
  --app voicetrans-backend
```

### Frontend (Heroku Config Vars)
```bash
heroku config:set \
  VITE_API_URL="https://api.vtranslab.com" \
  VITE_WS_URL="wss://api.vtranslab.com/ws/stream" \
  VITE_WS_HOST="api.vtranslab.com" \
  --app voicetrans-frontend
```

---

## SSL/HTTPS Configuration

### Why HTTPS is Required
Modern browsers **require HTTPS** for microphone access (`getUserMedia` API).

### Setup SSL
```bash
# 1. Add custom domains
heroku domains:add www.vtranslab.com --app voicetrans-frontend
heroku domains:add api.vtranslab.com --app voicetrans-backend

# 2. Enable Automatic Certificate Manager
heroku certs:auto:enable --app voicetrans-frontend
heroku certs:auto:enable --app voicetrans-backend

# 3. Check SSL status
heroku certs --app voicetrans-frontend
```

### DNS Configuration
Add these CNAME records in your domain registrar:

```
Type: CNAME
Name: www
Value: voicetrans-frontend-91c8bc6760d6.herokuapp.com

Type: CNAME
Name: api
Value: voicetrans-backend-2a1ab389b749.herokuapp.com
```

---

## Troubleshooting

### Issue 1: Microphone Access Error
**Error:** `Cannot read properties of undefined (reading 'getUserMedia')`

**Cause:** Page accessed over HTTP instead of HTTPS

**Solution:**
- Use HTTPS URL: https://www.vtranslab.com
- Enable SSL certificates (see above)

### Issue 2: WebSocket Connection Failed
**Cause:** Using `ws://` instead of `wss://`

**Solution:**
```bash
heroku config:set VITE_WS_URL="wss://api.vtranslab.com/ws/stream"
```

### Issue 3: CORS Errors
**Cause:** Frontend domain not in CORS allow list

**Solution:** Update backend CORS in `main_streaming.py`:
```python
allow_origins=[
    "https://www.vtranslab.com",
    # ... add your domain
]
```

### Issue 4: Build Failures

**Backend - Websockets conflict:**
```bash
# In requirements.txt, use:
websockets>=13.0  # Not ==12.0
```

**Frontend - Worklet loading:**
- ✅ Use inline worklet (already implemented)
- ❌ Don't use external module files

### Issue 5: API Not Configured
**Error:** "Please configure API keys in settings"

**Solution:** Already fixed - backend auto-loads from Heroku Config Vars

### Useful Commands
```bash
# View logs
heroku logs --tail --app voicetrans-backend
heroku logs --tail --app voicetrans-frontend

# Check dyno status
heroku ps --app voicetrans-backend

# Restart app
heroku restart --app voicetrans-backend

# Check config vars
heroku config --app voicetrans-backend
```

---

## Files Reference

### Backend Files Created/Modified
```
web_app/backend/
├── Procfile                    # Uvicorn server config
├── runtime.txt                 # Python 3.11.9
├── .python-version            # Python 3.11
├── .env.example               # Environment template
├── requirements.txt           # Fixed websockets>=13.0
└── main_streaming.py          # CORS, PORT, auto-config
```

### Frontend Files Created/Modified
```
web_app/frontend/
├── Procfile                    # Static file server
├── static.json                 # SPA routing
├── .gitignore                  # Exclude node_modules
├── .env.production            # Production URLs
├── .env.example               # Environment template
├── package.json               # Added 'serve' dependency
├── vite.config.ts             # Worker config
├── src/App.tsx                # Removed API key config
└── src/components/
    └── LuxuryTranslator.tsx   # Inline worklet, HTTPS
```

### Documentation Files
```
DEPLOYMENT_GUIDE.md            # This file (complete reference)
```

---

## Key Features

### ✅ Backend
- Auto-loads API keys from Heroku Config Vars
- CORS configured for custom domains
- WebSocket support (wss://)
- Dynamic PORT binding for Heroku

### ✅ Frontend
- HTTPS/WSS for microphone access
- Inline audio worklet (production-ready)
- No user configuration needed
- Static file serving optimized

### ✅ Security
- API keys never exposed to frontend
- HTTPS enforced
- Secure WebSocket connections
- Environment-based configuration

---

## Deployment Checklist

### Pre-Deployment
- [x] Test locally with production build
- [x] Verify API keys are set in Heroku
- [x] Update CORS origins
- [x] Remove debug/console logs
- [x] Test WebSocket connections

### Backend
- [x] Create Heroku app
- [x] Set environment variables
- [x] Set Python buildpack
- [x] Deploy code
- [x] Test API endpoints
- [x] Verify SSL

### Frontend
- [x] Update .env.production
- [x] Create Heroku app
- [x] Set Node.js buildpack
- [x] Deploy code
- [x] Test application
- [x] Verify microphone access

### Post-Deployment
- [x] Update CORS with production URL
- [x] Monitor logs for errors
- [x] Configure custom domains
- [x] Enable SSL certificates
- [x] Test complete translation flow

---

## Cost Estimation

### Eco Dynos (Recommended)
- **Cost:** $5/month per app = $10/month total
- **Features:** No sleeping, shared pool hours

### Basic Dynos
- **Cost:** $7/month per app = $14/month total
- **Features:** Never sleeps, session affinity

### Free Tier
- **Cost:** $0/month
- **Limitations:** Sleeps after 30 min, limited hours

---

## Support Resources

- **Heroku Docs:** https://devcenter.heroku.com/
- **Heroku Status:** https://status.heroku.com/
- **SSL Guide:** https://devcenter.heroku.com/articles/ssl

---

**Last Updated:** October 5, 2025
**Deployment Status:** ✅ Live and Running
**SSL Status:** ✅ Configured
**Custom Domains:** ✅ Active
