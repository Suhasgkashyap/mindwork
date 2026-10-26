# Vercel Deployment - Step by Step

## Current Status
✅ Code pushed to GitHub: https://github.com/Suhasgkashyap/mindwork

## Vercel Setup (You're on this screen now)

### Fix the Configuration Error

The error shows: **"Invalid request: env.DATABASE_PATH should be string"**

This happens in the Vercel import UI. Here's how to fix it:

### Step 1: Environment Variables Setup

In the Vercel import screen, expand **"Environment Variables"** section and add:

**Add these TWO environment variables:**

```
Name: DATABASE_PATH
Value: ./data/mindwork.db

Name: NODE_ENV
Value: production
```

### Step 2: Build Settings (Already Configured)

Should show:
- **Framework**: Vite ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `dist` ✅
- **Root Directory**: `./` ✅

### Step 3: Deploy

Click the blue "Deploy" button at the bottom.

**Expected output:**
```
✓ Build completed
✓ Database initialized
✓ Deployment successful
✓ Live URL: https://mindwork-xxxxx.vercel.app
```

---

## What Happens During Deployment

1. **Build Phase** (2-3 minutes)
   - Clones repository from GitHub
   - Installs npm dependencies
   - Runs `npm run build`
   - Creates optimized `dist/` folder

2. **Runtime Phase**
   - Starts Express server
   - Initializes SQLite database
   - Seeds demo data (if first run)
   - Server listens on port 3000

3. **Live** ✅
   - Application accessible via Vercel URL
   - Database persists on server
   - Ready for testing

---

## After Deployment

### 1. Access Your Application
```
https://mindwork-xxxxx.vercel.app
```

### 2. Login Credentials
```
Manager:
  Email: bob.manager@mindwork.io
  Password: Password123!

Employee (Alice):
  Email: alice@mindwork.io
  Password: Password123!
```

### 3. Test the Workflow

**As Alice (Employee):**
1. Login
2. Go to "Assigned Tasks"
3. Find "Implement Refresh Token Cache in Redis"
4. Click "Submit Work"
5. Upload `corrected_poster.zip`
6. Submit

**As Bob (Manager):**
1. Login
2. Go to "Submitted Work"
3. Review Alice's submission
4. **Verify: ZIP Requirements = 4/4 PASSED** ✅
5. Request changes or approve

---

## Troubleshooting Deployment

### Build Fails - "Cannot find module"
```
Solution: Environment variables might not be set correctly
- Go to Vercel Project Settings
- Verify DATABASE_PATH and NODE_ENV are set
- Redeploy
```

### Application Loads but Shows Error
```
Solution: Database not initialized
- This is normal on first run
- Server auto-initializes database
- Refresh page after 30 seconds
```

### "DATABASE_PATH should be string" Error
```
Solution: Remove quotes from environment variable value
✗ Wrong:  DATABASE_PATH = "./data/mindwork.db"  (with quotes)
✓ Right:  DATABASE_PATH = ./data/mindwork.db     (without quotes)
```

### Cannot Login
```
Solution: Database seeding issue
1. Wait for server to fully initialize (30-60 seconds)
2. Try refreshing the page
3. Check Vercel logs: vercel logs
```

---

## Monitor Deployment

### View Logs
```bash
vercel logs
```

### Check Health Endpoint
```bash
curl https://mindwork-xxxxx.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "verified_ml_model": "ready"
}
```

### View Deployments
https://vercel.com/dashboard → Select "mindwork" → Deployments tab

---

## Next: Custom Domain (Optional)

After successful deployment, you can add a custom domain:

1. Go to Vercel Project Settings
2. Click "Domains"
3. Add your domain or subdomain
4. Update DNS records (instructions provided by Vercel)

---

## Production Checklist

- [x] Code pushed to GitHub
- [ ] Environment variables set in Vercel
- [ ] Deployment successful
- [ ] Application accessible at Vercel URL
- [ ] Login works with demo credentials
- [ ] Tasks can be created and submitted
- [ ] ZIP file verification passes
- [ ] Manager review workflow works
- [ ] Database persists data correctly
- [ ] (Optional) Custom domain configured

---

## Support

**Vercel Docs**: https://vercel.com/docs

**Check Deployment Logs**:
```bash
vercel logs --follow
```

**Redeploy Latest**:
```bash
vercel --prod
```

---

**Ready to deploy?** Click the Deploy button in Vercel! 🚀
