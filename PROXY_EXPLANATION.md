# Why Requests Go to localhost:3000 (This is CORRECT!)

## How It Works:

1. **Frontend (React)** runs on `localhost:3000` - this is your browser
2. **Backend (Express API)** runs on `localhost:5000` - this is your server
3. **Proxy Middleware** (`setupProxy.js`) intercepts requests to `/api/*` and forwards them to `localhost:5000`

## The Flow:

```
Browser → localhost:3000/api/auth/login
         ↓
React Dev Server (port 3000)
         ↓
Proxy Middleware (setupProxy.js) intercepts /api/*
         ↓
Forwards to → localhost:5000/api/auth/login
         ↓
Express Backend (port 5000) handles the request
```

## Why You're Getting 404:

The proxy middleware isn't working, which means:
- Requests go to `localhost:3000/api/auth/login` ✓ (correct)
- But the proxy doesn't forward them to `localhost:5000` ✗ (problem)

## Solution:

**You MUST restart the React dev server** for `setupProxy.js` to be loaded!

1. Stop the dev server (Ctrl+C)
2. Start it again: `npm run dev` or `cd client && npm start`
3. Check the console - you should see "Setting up proxy middleware..."

## Temporary Workaround (Not Recommended):

If you can't get the proxy working, you can temporarily change the API URL:

In `client/src/context/AuthContext.js`, change:
```javascript
const API_URL = '/api';
```

To:
```javascript
const API_URL = 'http://localhost:5000/api';
```

But this will cause CORS issues and is NOT recommended for development!


