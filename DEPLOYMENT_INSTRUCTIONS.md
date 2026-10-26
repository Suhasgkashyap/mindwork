# MindWork Deployment Guide

## Overview
MindWork is a full-stack Burnout Early Detection System with:
- React frontend (Vite + TypeScript)
- Express.js backend
- SQLite database
- Real-time multi-laptop sync (SSE)

## Prerequisites

### Local Development
- Node.js 18+
- npm or yarn
- Python 3.8+ (for ML model training/evaluation)

### For Vercel Deployment
- Vercel account (https://vercel.com)
- GitHub repository connected to Vercel
- Environment variables configured

---

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database
```bash
python db/init_db.py
```

This creates:
- SQLite database at `data/mindwork.db`
- 1 Manager account + 5 Employee accounts
- 7 days of seeded demo data
- Pending tasks for demonstration

### 3. Start Development Server
```bash
npm run dev
```

Server runs on `http://localhost:3000`

### 4. Login Credentials

**Manager:**
- Email: `bob.manager@mindwork.io`
- Password: `Password123!`

**Employees:**
- alice@mindwork.io / Password123!
- priya@mindwork.io / Password123!
- rahul@mindwork.io / Password123!
- sneha@mindwork.io / Password123!
- david.cole@mindwork.io / Password123!

---

## Building for Production

### Build Frontend
```bash
npm run build
```

Creates `dist/` folder with optimized React build.

### Build Backend
Backend is included in the dev server. In production, use:
```bash
npx tsc --noEmit
npm run start
```

---

## Vercel Deployment

### Step 1: Connect GitHub Repository

1. Push code to GitHub:
```bash
git add .
git commit -m "Initial MindWork commit"
git push -u origin main
```

2. Go to https://vercel.com
3. Click "Add New..." → "Project"
4. Import GitHub repository: `Suhasgkashyap/mindworkand`
5. Click "Import"

### Step 2: Configure Environment Variables

In Vercel Project Settings → Environment Variables, add:

```
DATABASE_PATH=data/mindwork.db
NODE_ENV=production
```

**Optional:**
```
PORT=3000
DISABLE_HMR=true
```

### Step 3: Configure Build Settings

Vercel should auto-detect:
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Deploy

Click "Deploy" - Vercel will:
1. Clone the repository
2. Install dependencies
3. Run build command
4. Generate deployment URL

Deployment URL format: `https://mindwork-xxxxx.vercel.app`

### Step 5: Initialize Production Database

After first deployment, the database won't exist. You have two options:

**Option A: Local Database (Single Server)**
- Database persists on one Vercel instance
- Works for demo, limited multi-laptop sync

**Option B: PostgreSQL (Recommended for Production)**
- Connect to external PostgreSQL database
- Better for scaling and multi-instance deployments
- Requires code modifications

For now, Option A works for demo purposes.

---

## Important Notes for Vercel

### Database Persistence Issue
Vercel's serverless environment has ephemeral file systems. For production:

**Current Setup (Works):**
- Database stored in `/data/mindwork.db`
- Persists within a single deployment region
- Works well for demos

**Production Setup (Recommended):**
Replace SQLite with PostgreSQL:
```bash
npm install pg
```

Update `server.ts` to use `pg` instead of `sqlite`:
```typescript
import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
```

Add to Vercel environment variables:
```
DATABASE_URL=postgresql://user:pass@host:5432/mindwork
```

### Environment Variables Needed

**For Demo (Existing Setup):**
```
DATABASE_PATH=data/mindwork.db
NODE_ENV=production
```

**For Production (with PostgreSQL):**
```
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=3000
```

---

## File Structure for Deployment

```
mindworkand/
├── src/                           # React frontend
│   ├── components/
│   ├── context/
│   ├── engine/                    # Business logic engines
│   ├── utils/
│   ├── types.ts
│   ├── main.tsx
│   └── index.css
├── db/
│   └── init_db.py                # Database seeding script
├── ml/
│   ├── predict.py                # ML model inference
│   └── train_model.py
├── models/
│   └── burnout_random_forest.joblib
├── public/
│   └── reports/                  # Generated reports
├── data/
│   ├── mindwork.db              # SQLite database (generated)
│   └── uploads/
│       └── submissions/          # Uploaded ZIP files
├── tests/                        # End-to-end tests
├── tracker/                      # Desktop app tracker
├── server.ts                     # Express backend
├── vite.config.ts
├── tsconfig.json
├── package.json
├── vercel.json                   # ← Vercel config
├── .env.example
└── .gitignore
```

---

## Post-Deployment Testing

### 1. Access Application
```
https://your-deployment.vercel.app
```

### 2. Login
Use any credential from seeded data above

### 3. Create New Task
- Login as Bob Manager
- Assign task to Alice
- Verify task appears in Alice's dashboard

### 4. Submit Work
- Login as Alice
- Find assigned task
- Submit work with ZIP file
- Upload `corrected_poster.zip` for testing

### 5. Manager Review
- Login as Bob Manager
- Navigate to "Submitted Work"
- Download ZIP, request changes, or approve

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Errors
```bash
# Reinitialize database
python db/init_db.py
```

### Port Issues
Change port in environment:
```
PORT=5000
```

### CORS Issues
Server includes CORS middleware. For Vercel, ensure:
- API routes use `/api/*` prefix
- Frontend calls `https://your-domain.vercel.app/api/*`

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `data/mindwork.db` | SQLite database location |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Node environment |
| `DISABLE_HMR` | `false` | Disable hot module reload |
| `DATABASE_URL` | - | PostgreSQL connection (if using) |

---

## Monitoring & Logs

### Vercel Logs
```bash
# View deployment logs
vercel logs

# Follow live logs
vercel logs --follow
```

### Local Development Logs
Check console output from `npm run dev`

### Database Queries
Enable SQLite logging in `server.ts`:
```typescript
db.exec('PRAGMA query_only = 0;');
```

---

## Scaling Considerations

### Current Limitations (Vercel Free Tier)
- 12 serverless function invocations/second
- 50MB deployment size limit
- Suitable for: Demo, internal tools, testing

### For Production
1. **Upgrade to Paid Vercel Plan**
2. **Use PostgreSQL** instead of SQLite
3. **Enable caching** for API responses
4. **Use CDN** for static assets
5. **Enable compression** for responses

---

## Next Steps

1. ✅ Initialize local database: `python db/init_db.py`
2. ✅ Test locally: `npm run dev`
3. ✅ Push to GitHub
4. ✅ Connect repository to Vercel
5. ✅ Configure environment variables
6. ✅ Deploy to production
7. ✅ Test application endpoints
8. ✅ Monitor deployment logs

---

## Support

For issues:
1. Check Vercel logs: `vercel logs`
2. Review build output in Vercel dashboard
3. Check GitHub Actions (if enabled)
4. Review server logs locally: `npm run dev`

---

**Happy deploying!** 🚀
