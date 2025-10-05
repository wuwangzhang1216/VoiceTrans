# VoiceTrans Git Branches

## Branch Structure

### `main` branch
- **Purpose**: Main development branch
- **Contains**: Core VoiceTrans application code
- **Status**: Clean, no deployment files

### `deployment` branch
- **Purpose**: Heroku deployment configuration
- **Contains**: All deployment-related files and configurations
- **Status**: Ready for Heroku deployment

## Deployment Branch Contents

The `deployment` branch includes all Heroku-specific files:

### Backend Deployment Files
- `web_app/backend/Procfile` - Uvicorn server configuration
- `web_app/backend/runtime.txt` - Python version specification
- `web_app/backend/.python-version` - Python version file
- `web_app/backend/.env.example` - Environment variable template
- Modified `requirements.txt` - Fixed dependencies for Heroku
- Modified `main_streaming.py` - Auto-load API keys from Heroku Config Vars

### Frontend Deployment Files
- `web_app/frontend/Procfile` - Static file server configuration
- `web_app/frontend/static.json` - SPA routing configuration
- `web_app/frontend/.gitignore` - Exclude node_modules
- `web_app/frontend/.env.production` - Production environment variables
- `web_app/frontend/.env.example` - Environment variable template
- Modified `package.json` - Production build scripts
- Modified `src/App.tsx` - Removed API key config requirement
- Modified `src/components/LuxuryTranslator.tsx` - Inline audio worklet, HTTPS support

### Documentation
- `HEROKU_DEPLOYMENT.md` - Complete deployment guide with step-by-step instructions
- `DEPLOYMENT_SUMMARY.md` - Quick reference and deployment summary
- `CUSTOM_DOMAIN_SETUP.md` - Custom domain configuration (www.vtranslab.com)
- `MICROPHONE_ACCESS_FIX.md` - HTTPS requirement explanation

## How to Use

### For Development (main branch)
```bash
git checkout main
# Work on core features
```

### For Deployment (deployment branch)
```bash
git checkout deployment

# Deploy backend
cd web_app/backend
git push heroku deployment:master

# Deploy frontend
cd web_app/frontend
git push heroku deployment:master
```

### To Merge Development Changes to Deployment
```bash
git checkout deployment
git merge main
# Resolve any conflicts
git push origin deployment
```

## Live Deployments

### Production URLs
- **Frontend**: https://voicetrans-frontend-91c8bc6760d6.herokuapp.com/
- **Backend**: https://voicetrans-backend-2a1ab389b749.herokuapp.com/

### Custom Domains (requires SSL setup)
- **Frontend**: https://www.vtranslab.com/
- **Backend**: https://api.vtranslab.com/

## Key Features in Deployment Branch

1. **Auto API Key Loading** - Backend loads API keys from Heroku Config Vars
2. **Custom Domain Support** - CORS configured for vtranslab.com
3. **HTTPS/WSS** - Required for microphone access
4. **Inline Audio Worklet** - Fixes production bundling issues
5. **No User Configuration** - Users can use app immediately
6. **Static File Serving** - Optimized for production

## Notes

- The `main` branch is kept clean without deployment-specific files
- All Heroku configuration is isolated in the `deployment` branch
- Deployment documentation is only in the `deployment` branch
- Both branches are tracked on GitHub

---

**Last Updated**: October 5, 2025
