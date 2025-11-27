# Setup Complete! 🎉

## Configuration Summary

Your shop project is now configured so that:
- **Frontend**: `http://localhost:3000/`
- **Backend API**: `http://localhost:3000/api`

## How It Works

### Development Mode
- React dev server runs on port **3000**
- Backend API runs on port **5000** (internal)
- React proxy automatically forwards `/api/*` requests to the backend
- All API calls use relative paths (`/api`), so they work seamlessly

### Production Mode
- Express server runs on port **3000**
- Serves the built React app
- Handles all `/api/*` routes
- Everything accessible on a single port

## To Start Development

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```
   Or separately:
   ```bash
   npm install
   cd client
   npm install
   cd ..
   ```

2. **Start both servers:**
   ```bash
   npm run dev
   ```

3. **Access the app:**
   - Open `http://localhost:3000/` in your browser
   - API is available at `http://localhost:3000/api`

## Default Login

- **Username**: `superadmin`
- **Password**: `admin123`

## What Changed

✅ Frontend API URLs updated to use relative paths (`/api`)
✅ React proxy configured to forward API requests to backend
✅ Backend runs on port 5000 in development (proxied through React)
✅ Production mode serves everything on port 3000
✅ Added `cross-env` for Windows compatibility

