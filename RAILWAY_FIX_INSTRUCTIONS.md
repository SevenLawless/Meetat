# Railway Deployment Fix Instructions

## Issues Fixed

### 1. ✅ Google Analytics Error Suppression
- Added error suppression for Google Analytics requests blocked by ad blockers
- These errors are now silently ignored and won't clutter the console

### 2. ✅ API URL Runtime Detection
- Added runtime detection to fix cases where the build was done with `localhost:3001`
- The app will now automatically detect when it's running in production but trying to use localhost
- Falls back to relative `/api` path when localhost is detected in production

## Required Action: Set VITE_API_URL in Railway

**The runtime fix is a temporary workaround. For a permanent solution, you must:**

### Steps to Fix on Railway:

1. **Go to your Frontend Service on Railway**
   - Open your Railway dashboard
   - Select your Frontend service

2. **Add Environment Variable**
   - Go to the **"Variables"** tab
   - Add or update: `VITE_API_URL`
   - Set the value to your **Backend Railway URL** (e.g., `https://your-backend.railway.app`)
   - **Important:** Do NOT include `/api` in the URL - the code adds it automatically

3. **Rebuild the Frontend**
   - Railway will automatically rebuild when you save the environment variable
   - Or manually trigger a redeploy from the Railway dashboard

4. **Verify**
   - After rebuild, check that API requests go to your Railway backend URL
   - Login should work without connection errors

### Example Railway Environment Variables:

**Frontend Service:**
```env
VITE_API_URL=https://your-backend-service.railway.app
VITE_WS_URL=wss://your-backend-service.railway.app
NODE_ENV=production
```

**Backend Service:**
```env
CLIENT_URL=https://your-frontend-service.railway.app
# ... other backend variables
```

## Current Status

- ✅ Google Analytics errors are suppressed
- ✅ Runtime fix for localhost URLs is active
- ⚠️ **You still need to set VITE_API_URL in Railway and rebuild**

## Testing

After setting VITE_API_URL and rebuilding:
1. Open your Railway frontend URL
2. Try to login
3. Check browser console - should see API requests going to your Railway backend URL
4. No more `ERR_CONNECTION_REFUSED` errors
5. No more Google Analytics console errors

## Notes

- The runtime fix will work temporarily, but setting VITE_API_URL is the proper solution
- Vite embeds environment variables at **build time**, so you must rebuild after setting VITE_API_URL
- If backend and frontend are on the same Railway domain, you might be able to use relative paths, but it's better to be explicit

