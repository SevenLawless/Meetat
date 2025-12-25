# Railway Deployment Troubleshooting

## 1. Google Analytics Error
If you see `ERR_BLOCKED_BY_CLIENT` or `405 Method Not Allowed` for Google Analytics:
- **Status:** ✅ Fixed in code.
- **Action:** A new aggressive suppression script has been added to `frontend/src/main.jsx` that intercepts `fetch`, `sendBeacon`, and `Image` requests to Google Analytics. This should prevent the browser from even attempting the network request, silencing the error.

## 2. API Connection Error (502 Bad Gateway)
If you see `502 Bad Gateway` when logging in:
- **Cause:** The backend server is not running or not reachable, OR the frontend is trying to call the wrong URL.
- **Fix:**

### A. Set Environment Variables in Railway
You MUST set these variables in your **Frontend Service** on Railway:

1. `VITE_API_URL` -> `https://your-backend-url.railway.app` (NO trailing slash)
2. `VITE_WS_URL` -> `wss://your-backend-url.railway.app` (NO trailing slash)

**IMPORTANT:** Do NOT use `localhost` in these variables.

### B. Verify Backend is Running
1. Go to your **Backend Service** in Railway.
2. Check the "Deployments" tab.
3. Click on the latest deployment and view "Deploy Logs".
4. Ensure you see: `🚀 Meetat API Server running on http://0.0.0.0:XXXX`
5. If it says `MySQL connection failed`, check your Database variables in the Backend service.

## 3. "VITE_API_URL points to a local address" Warning
- **Cause:** You set `VITE_API_URL` to `http://localhost:3001` in Railway, or didn't set it at all (so it uses the default).
- **Fix:** Update `VITE_API_URL` in Railway to your actual backend URL as described above.

## 4. Redeploy
After changing any variables in Railway, you must **Redeploy** the service for changes to take effect.
