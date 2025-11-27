# Quick Deployment Guide

## Fastest Option: Railway (Recommended)

### Step 1: Prepare Your Code
```bash
# Make sure everything is committed to Git
git add .
git commit -m "Ready for deployment"
```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Node.js

### Step 3: Set Environment Variables

In Railway dashboard, go to Variables tab and add:
- `NODE_ENV` = `production`
- `JWT_SECRET` = (generate a random string, e.g., use: `openssl rand -base64 32`)

### Step 4: Deploy

Railway will automatically:
- Install dependencies
- Build the React app
- Start the server

### Step 5: Access Your App

- Railway provides a URL like: `https://your-app.railway.app`
- Visit the URL and login with:
  - Username: `admin`
  - Password: `admin123`
  - **Change password immediately!**

## Alternative: Render

1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Settings:
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
5. Add environment variables:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (your secret key)
6. Click "Create Web Service"

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

