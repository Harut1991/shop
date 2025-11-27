# Free Deployment Options

This guide covers **100% FREE** deployment options for your Shop Admin Panel.

## 🆓 Best Free Options

### Option 1: Render (Free Tier Available) ⭐ RECOMMENDED

**Free Tier Includes:**
- ✅ 750 hours/month (enough for 24/7 operation)
- ✅ Free SSL/HTTPS
- ✅ Automatic deployments from GitHub
- ✅ Environment variables
- ✅ Persistent disk storage (for SQLite)

**Steps:**

1. **Sign up** at [render.com](https://render.com) (free account)

2. **Create a new Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub account
   - Select repository: `Harut1991/shop`

3. **Configure the service:**
   - **Name**: `shop-admin` (or any name)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: (leave empty - root is fine)
   - **Runtime**: `Node`
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`

4. **Add Environment Variables:**
   - Click "Environment" tab
   - Add:
     - `NODE_ENV` = `production`
     - `JWT_SECRET` = (generate with command below)
     - `PORT` = `10000` (Render uses this port)

5. **Deploy:**
   - Click "Create Web Service"
   - Wait 5-10 minutes for first deployment
   - Your app will be live at: `https://shop-admin.onrender.com` (or your chosen name)

**Generate JWT_SECRET (Windows PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Note:** Free tier apps sleep after 15 minutes of inactivity, but wake up automatically when accessed (takes ~30 seconds).

---

### Option 2: Fly.io (Free Tier Available)

**Free Tier Includes:**
- ✅ 3 shared-cpu VMs
- ✅ 3GB persistent volume storage
- ✅ 160GB outbound data transfer
- ✅ Free SSL

**Steps:**

1. **Install Fly CLI:**
   ```powershell
   # Download from https://fly.io/docs/getting-started/installing-flyctl/
   # Or use winget:
   winget install -e --id Fly.Flyctl
   ```

2. **Sign up and login:**
   ```powershell
   fly auth signup
   # Or if you have an account:
   fly auth login
   ```

3. **Create a fly.toml file** (I'll create this for you)

4. **Deploy:**
   ```powershell
   fly launch
   # Follow the prompts
   # Set app name
   # Choose region
   # Don't deploy a Postgres database (we use SQLite)
   ```

5. **Set secrets:**
   ```powershell
   fly secrets set JWT_SECRET=your-secret-key-here
   fly secrets set NODE_ENV=production
   ```

6. **Deploy:**
   ```powershell
   fly deploy
   ```

---

### Option 3: Cyclic.sh (Free Tier Available)

**Free Tier Includes:**
- ✅ Unlimited apps
- ✅ Free SSL
- ✅ Automatic deployments
- ✅ No credit card required

**Steps:**

1. **Sign up** at [cyclic.sh](https://cyclic.sh) with GitHub

2. **Connect repository:**
   - Click "New App"
   - Select `Harut1991/shop`
   - Cyclic auto-detects Node.js

3. **Configure:**
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`

4. **Add Environment Variables:**
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (your secret key)

5. **Deploy:**
   - Click "Deploy"
   - Your app will be at: `https://your-app-name.cyclic.app`

---

### Option 4: Vercel (Frontend) + Railway/Render (Backend)

**Split Deployment (Both Free):**

**Frontend on Vercel:**
1. Go to [vercel.com](https://vercel.com)
2. Import `Harut1991/shop`
3. Root Directory: `client`
4. Build Command: `npm run build`
5. Output Directory: `build`

**Backend on Render:**
- Follow Option 1 above, but update frontend API_URL to point to backend

---

## 🎯 Quick Comparison

| Platform | Free Tier | Sleep After Inactivity | Best For |
|----------|-----------|------------------------|----------|
| **Render** | ✅ 750 hrs/month | ⚠️ Yes (15 min) | Easiest setup |
| **Fly.io** | ✅ 3 VMs | ❌ No | Always-on apps |
| **Cyclic** | ✅ Unlimited | ⚠️ Yes | Simple deployments |

## 📝 Recommended: Render

**Why Render?**
- ✅ Easiest setup (just connect GitHub)
- ✅ Free tier is generous (750 hours = 31 days)
- ✅ Good documentation
- ✅ Automatic HTTPS
- ✅ Works great with SQLite

**Limitation:**
- Apps sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- This is fine for admin panels (not high-traffic public sites)

---

## 🔐 Security Checklist

After deployment:
1. ✅ Change default admin password (`admin` / `admin123`)
2. ✅ Use strong JWT_SECRET (32+ characters)
3. ✅ Don't commit `.env` file (already in .gitignore)
4. ✅ Consider using PostgreSQL for production (Render offers free Postgres)

---

## 🚀 Quick Start (Render - 5 minutes)

1. Go to [render.com](https://render.com) → Sign up (free)
2. New → Web Service → Connect GitHub → Select `Harut1991/shop`
3. Build: `npm run install:all && npm run build`
4. Start: `npm start`
5. Add env vars: `NODE_ENV=production`, `JWT_SECRET=...`, `PORT=10000`
6. Deploy!

Your app will be live in ~10 minutes! 🎉

