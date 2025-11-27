# Quick Setup Guide

## Step 1: Install Backend Dependencies

```bash
npm install
```

## Step 2: Install Frontend Dependencies

```bash
cd client
npm install
cd ..
```

## Step 3: Create .env file (optional)

Create a `.env` file in the root directory with:
```
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Step 4: Start Both Backend and Frontend

In the root directory, run:
```bash
npm run dev
```

This will start both the backend server (port 5000) and frontend app (port 3000) simultaneously.

### Alternative: Run Separately

**Backend only:**
```bash
npm run dev:backend
```

**Frontend only:**
```bash
npm run dev:frontend
```

## Default Login

- **Username**: superadmin
- **Password**: admin123

The admin panel will be available at `http://localhost:3000`

