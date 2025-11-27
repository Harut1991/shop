# Deployment Guide

This guide covers deploying the Shop Admin Panel to various platforms.

## Prerequisites

1. Build the React frontend:
   ```bash
   npm run build
   ```

2. Set environment variables:
   - `JWT_SECRET`: A secure random string for JWT token signing
   - `NODE_ENV`: Set to `production`
   - `PORT`: Port number (usually set automatically by hosting platform)

## Deployment Options

### Option 1: Railway (Recommended - Easy & Free Tier Available)

1. **Sign up** at [railway.app](https://railway.app)

2. **Create a new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo" (or upload your code)

3. **Configure the project**:
   - Railway will auto-detect Node.js
   - Add environment variables:
     - `JWT_SECRET`: Generate a secure random string
     - `NODE_ENV`: `production`

4. **Deploy**:
   - Railway will automatically build and deploy
   - Your app will be available at `https://your-project.railway.app`

5. **Database**:
   - SQLite database file will be created automatically
   - For production, consider upgrading to PostgreSQL (Railway provides this)

### Option 2: Render

1. **Sign up** at [render.com](https://render.com)

2. **Create a new Web Service**:
   - Connect your GitHub repository
   - Select "Web Service"
   - Build Command: `npm run install:all && npm run build`
   - Start Command: `npm start`

3. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: Your secret key
   - `PORT`: `3000` (or leave default)

4. **Deploy**:
   - Render will build and deploy automatically
   - Free tier available with some limitations

### Option 3: Heroku

1. **Install Heroku CLI**:
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login and create app**:
   ```bash
   heroku login
   heroku create your-shop-app-name
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-secret-key-here
   ```

4. **Deploy**:
   ```bash
   git push heroku main
   ```

5. **Note**: Heroku free tier is no longer available, but paid plans start at $5/month

### Option 4: Vercel (Frontend) + Railway/Render (Backend)

**For Frontend (Vercel)**:
1. Sign up at [vercel.com](https://vercel.com)
2. Import your repository
3. Set root directory to `client`
4. Build command: `npm run build`
5. Output directory: `build`

**For Backend (Railway/Render)**:
- Follow Option 1 or 2 above
- Update frontend API_URL to point to backend URL

## Environment Variables

Create a `.env` file (or set in hosting platform):

```env
NODE_ENV=production
JWT_SECRET=your-very-secure-random-string-here-min-32-characters
PORT=3000
```

**Generate a secure JWT_SECRET**:
```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use an online generator
```

## Building for Production

Before deploying, build the React app:

```bash
npm run install:all
npm run build
```

This creates the `client/build` directory that the server will serve in production.

## Database Considerations

- **SQLite** works for small to medium deployments
- For production with high traffic, consider migrating to PostgreSQL
- The database file (`shop.db`) will be created automatically on first run
- **Important**: On some platforms (like Heroku), the filesystem is ephemeral, so data may be lost on restart. Consider using a database service.

## Post-Deployment

1. **Access your app**: Visit the URL provided by your hosting platform
2. **Default super admin**: 
   - Username: `admin`
   - Password: `admin123`
   - **Change this immediately after first login!**

3. **Create a new super admin** and delete the default one for security

## Troubleshooting

- **Build fails**: Check that all dependencies are in `package.json`
- **Database errors**: Ensure write permissions for the database file
- **API not working**: Check that `NODE_ENV=production` is set
- **Frontend not loading**: Verify `client/build` directory exists after build

## Recommended: Railway

Railway is recommended because:
- ✅ Free tier available
- ✅ Easy deployment from GitHub
- ✅ Automatic HTTPS
- ✅ Environment variable management
- ✅ Good for full-stack apps
- ✅ SQLite works out of the box

