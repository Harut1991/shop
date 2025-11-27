# Quick Deployment Guide

## 🆓 FREE Deployment Options

### Option 1: Render (FREE - Recommended) ⭐

### Step 1: Deploy to Render (FREE)

1. Go to [render.com](https://render.com) and sign up (FREE account)
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select repository: `Harut1991/shop`

### Step 2: Configure

- **Name**: `shop-admin` (or any name)
- **Build Command**: `npm run install:all && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV` = `production`
  - `JWT_SECRET` = (generate with command below)
  - `PORT` = `10000`

### Step 3: Deploy

- Click "Create Web Service"
- Wait 5-10 minutes
- Your app will be live at: `https://shop-admin.onrender.com`

**Note:** Free tier apps sleep after 15 min inactivity, but wake automatically.

## Alternative: Fly.io (FREE - Always On)

1. Install Fly CLI: `winget install -e --id Fly.Flyctl`
2. Sign up: `fly auth signup`
3. Deploy: `fly launch` (follow prompts)
4. Set secrets: `fly secrets set JWT_SECRET=your-secret`
5. Deploy: `fly deploy`

**See `DEPLOY_FREE.md` for detailed instructions on all free options.**

## Generate Secure JWT Secret

```bash
# Linux/Mac:
openssl rand -base64 32

# Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Important Notes

- The database (`shop.db`) will be created automatically
- Default admin credentials: `admin` / `admin123` - **CHANGE THIS!**
- For production, consider using PostgreSQL instead of SQLite
- Make sure to set a strong `JWT_SECRET` in production

