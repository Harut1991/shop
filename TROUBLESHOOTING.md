# Troubleshooting Guide

## Frontend Not Opening (localhost:3000)

If `http://localhost:3000` is not opening, follow these steps:

### Step 1: Install Frontend Dependencies

The most common issue is that frontend dependencies haven't been installed. Run:

```bash
cd client
npm install
cd ..
```

Or install all dependencies at once:
```bash
npm run install:all
```

### Step 2: Verify Installation

Make sure `client/node_modules` folder exists. If it doesn't, the installation failed.

### Step 3: Check for Errors

When running `npm run dev`, check the terminal output:
- Backend should show: "Server running on port 5000"
- Frontend should show: "Compiled successfully!" and open automatically

### Step 4: Manual Start

If `npm run dev` doesn't work, try starting them separately:

**Terminal 1 (Backend):**
```bash
npm run dev:backend
```

**Terminal 2 (Frontend):**
```bash
cd client
npm start
```

### Step 5: Check Ports

Make sure ports 3000 and 5000 are not already in use:
- Windows: `netstat -ano | findstr :3000`
- If port is in use, kill the process or change the port

### Step 6: Clear Cache (if needed)

If you still have issues, try:
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

## Common Errors

### "react-scripts: command not found"
- Solution: Run `npm install` in the `client` directory

### "Cannot find module"
- Solution: Delete `node_modules` and `package-lock.json`, then run `npm install` again

### "Port 3000 already in use"
- Solution: Kill the process using port 3000 or change the port in `client/package.json`

