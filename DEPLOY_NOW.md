# 🚀 Quick Deployment Guide - Get Your URL Now!

## Option 1: Render.com (EASIEST - FREE) ⭐ Recommended

### Step 1: Prepare Your Code
1. Make sure your code is pushed to GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

### Step 2: Deploy on Render
1. **Go to [render.com](https://render.com)** and sign up (FREE)
2. Click **"New +"** → **"Web Service"**
3. **Connect GitHub** and select your repository: `Harut1991/shop`
4. Render will auto-detect your `render.yaml` configuration

### Step 3: Set Environment Variables
In Render dashboard, go to **Environment** tab and add:
- `NODE_ENV` = `production`
- `JWT_SECRET` = (generate below)
- `PORT` = `10000` (or leave default)

**Generate JWT_SECRET** (Windows PowerShell):
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Wait 5-10 minutes for build
3. **Your URL will be**: `https://shop-app.onrender.com` (or similar)

**Note**: Free tier apps sleep after 15 min inactivity but wake automatically.

---

## Option 2: Railway.app (FREE - Always On)

### Step 1: Deploy
1. Go to [railway.app](https://railway.app) and sign up
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository: `Harut1991/shop`
4. Railway auto-detects Node.js

### Step 2: Set Environment Variables
In Railway dashboard → **Variables** tab:
- `NODE_ENV` = `production`
- `JWT_SECRET` = (generate using command above)
- `PORT` = (auto-set by Railway)

### Step 3: Get Your URL
1. Railway automatically deploys
2. Click on your service → **Settings** → **Generate Domain**
3. **Your URL will be**: `https://your-project-name.up.railway.app`

---

## Option 3: Fly.io (FREE - Always On)

### Step 1: Install Fly CLI
```powershell
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Sign Up & Deploy
```bash
fly auth signup
fly launch
# Follow prompts - it will create fly.toml automatically
```

### Step 3: Set Secrets
```bash
fly secrets set JWT_SECRET=your-generated-secret-here
fly secrets set NODE_ENV=production
```

### Step 4: Deploy
```bash
fly deploy
```

**Your URL will be**: `https://your-app-name.fly.dev`

---

## After Deployment

### 1. Access Your App
Visit the URL provided by your hosting platform

### 2. Run Database Migrations
Most platforms will auto-run migrations, but if needed:
- SSH into your instance (if available)
- Or add to your start script: `npm run migrate && npm start`

### 3. Default Login
- **Username**: `admin`
- **Password**: `admin123`
- **⚠️ CHANGE THIS IMMEDIATELY!**

### 4. Create Your First Product
1. Login as super admin
2. Go to Products → Add Product
3. Set domain (e.g., `your-app.onrender.com`)
4. Create your first product!

---

## Quick Comparison

| Platform | Free Tier | Always On | Ease | URL Format |
|----------|-----------|-----------|------|------------|
| **Render** | ✅ Yes | ❌ Sleeps | ⭐⭐⭐⭐⭐ | `app.onrender.com` |
| **Railway** | ✅ Yes | ✅ Yes | ⭐⭐⭐⭐ | `app.up.railway.app` |
| **Fly.io** | ✅ Yes | ✅ Yes | ⭐⭐⭐ | `app.fly.dev` |

---

## Troubleshooting

### Build Fails?
- Check that `cross-env` is in dependencies (not just devDependencies)
- Update `package.json` start script to: `node server.js` (remove cross-env if needed)

### Database Errors?
- SQLite should work automatically
- Check file permissions on hosting platform

### Can't Access URL?
- Wait a few minutes after deployment
- Check deployment logs in platform dashboard
- Verify environment variables are set

---

## Recommended: Render.com
✅ Easiest setup (you already have `render.yaml`)  
✅ Free tier available  
✅ Automatic HTTPS  
✅ Good documentation  

**Start here**: [render.com](https://render.com)



