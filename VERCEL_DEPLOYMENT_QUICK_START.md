# MindWork - Vercel Deployment Quick Start

## ✅ Code Pushed to GitHub

**Repository**: https://github.com/Suhasgkashyap/mindwork
**Branch**: main
**Status**: ✅ All files committed and pushed

---

## Next: Connect to Vercel

### Step 1: Go to Vercel Dashboard
https://vercel.com/dashboard

### Step 2: Import GitHub Repository

1. Click **"Add New..."** → **"Project"**
2. Click **"Continue with GitHub"** (authorize if needed)
3. Search for: `mindwork`
4. Select: `Suhasgkashyap/mindwork`
5. Click **"Import"**

### Step 3: Configure Project

**These settings should auto-detect:**
- Framework: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### Step 4: Add Environment Variables

Before deploying, click "Environment Variables" and add:

```
DATABASE_PATH=data/mindwork.db
NODE_ENV=production
```

**Optional (for monitoring):**
```
DISABLE_HMR=true
```

### Step 5: Deploy

Click **"Deploy"** button

**Deployment takes ~2-3 minutes**

---

## After Deployment ✅

### Your Live URLs:
- **App URL**: `https://mindwork-xxxxx.vercel.app`
- **Health Check**: `https://mindwork-xxxxx.vercel.app/api/health`
- **API Base**: `https://mindwork-xxxxx.vercel.app/api`

### Test the Application:

1. **Open** https://mindwork-xxxxx.vercel.app
2. **Login as Alice**:
   - Email: `alice@mindwork.io`
   - Password: `Password123!`
3. **Create/View Tasks**:
   - Find pending tasks
   - Submit work with ZIP file
   - Upload `corrected_poster.zip` for testing

4. **Login as Manager**:
   - Email: `bob.manager@mindwork.io`
   - Password: `Password123!`
   - Review submissions
   - Request changes or approve

---

## Demo Credentials

### Manager:
```
Email: bob.manager@mindwork.io
Password: Password123!
```

### Employees:
```
alice@mindwork.io / Password123!
priya@mindwork.io / Password123!
rahul@mindwork.io / Password123!
sneha@mindwork.io / Password123!
david.cole@mindwork.io / Password123!
```

---

## What's Included

✅ **Full-Stack Application**
- React frontend with Vite
- Express.js backend
- SQLite database with seeded data

✅ **Features Ready**
- Employee task management
- Work submission & ZIP upload
- Manager review workflow
- Burnout risk prediction
- Real-time notifications
- Multi-laptop sync

✅ **Testing**
- 66/66 automated tests passing
- Corrected ZIP file included
- All workflows verified

✅ **Documentation**
- DEPLOYMENT_INSTRUCTIONS.md
- ZIP_SUBMISSION_GUIDE.md
- WORKFLOW_VERIFICATION_COMPLETE.md

---

## Important Notes

### Database
- Currently uses SQLite (persists on Vercel instance)
- Works great for demo/testing
- For production scaling, upgrade to PostgreSQL

### File Uploads
- ZIP files stored in: `/data/uploads/submissions/`
- Max file size: 50MB
- All uploads verified for safety

### Performance
- Free Vercel tier: 12 serverless function invocations/second
- Suitable for: Demo, internal tools, testing
- For production: Upgrade Vercel plan

---

## Auto-Deploy from GitHub

After connecting Vercel to GitHub:

**Every push to main automatically deploys:**
```bash
git add .
git commit -m "Your update message"
git push origin main
# Vercel automatically builds and deploys!
```

---

## Monitor Deployment

### View Logs:
```bash
vercel logs
```

### Check Health:
```bash
curl https://your-deployment.vercel.app/api/health
```

Response:
```json
{
  "status": "healthy",
  "system": "MindWork – Burnout Early Detection System",
  "database": "connected",
  "verified_ml_model": "ready"
}
```

---

## Troubleshooting

### Build Fails?
1. Check Vercel logs: Dashboard → Deployments → failed deployment → "View Logs"
2. Common issues:
   - Node version: Check `package.json` engines
   - Memory: Vercel serverless default is 3GB
   - Build timeout: Max 60 seconds (usually fast)

### App Doesn't Load?
1. Check health endpoint: `/api/health`
2. Clear browser cache: Cmd/Ctrl + Shift + Delete
3. Check environment variables in Vercel dashboard

### Database Issues?
- Database initializes on first run
- If needed, redeploy: Dashboard → Deployments → "Promote to Production"

---

## Next Steps

1. ✅ GitHub repo connected: https://github.com/Suhasgkashyap/mindwork
2. ⏳ **TO DO**: Connect Vercel (go to https://vercel.com/dashboard)
3. ⏳ **TO DO**: Import project from GitHub
4. ⏳ **TO DO**: Add environment variables
5. ⏳ **TO DO**: Deploy to production
6. ✅ **Done**: Auto-deploy on future pushes

---

## Support

- **GitHub**: https://github.com/Suhasgkashyap/mindwork
- **Vercel Docs**: https://vercel.com/docs
- **Issue Tracker**: https://github.com/Suhasgkashyap/mindwork/issues

---

**Everything is ready! Go connect to Vercel and deploy! 🚀**
