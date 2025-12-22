# Railway Deployment Checklist

Use this checklist to ensure your Meetat application is ready for Railway deployment.

## Pre-Deployment

### Code Preparation
- [ ] All code is committed to GitHub
- [ ] `.gitignore` includes `.env` files
- [ ] No sensitive data in code (all in environment variables)
- [ ] Database schema file (`database/schema.sql`) is ready

### Configuration Files
- [ ] `backend/env.example` exists with all variables documented
- [ ] `backend/railway.json` exists (optional, Railway auto-detects)
- [ ] `frontend/railway.json` exists (optional, Railway auto-detects)
- [ ] `.gitignore` is configured properly

### Backend Checks
- [ ] `backend/package.json` has `start` script
- [ ] Server listens on `0.0.0.0` in production (not just localhost)
- [ ] CORS is configured to use `CLIENT_URL` environment variable
- [ ] Database connection supports Railway MySQL variables
- [ ] WebSocket server is properly configured
- [ ] File upload directory handling is production-ready

### Frontend Checks
- [ ] `frontend/package.json` has `build` and `start` scripts
- [ ] `serve` package is in dependencies
- [ ] `VITE_API_URL` and `VITE_WS_URL` are used in code
- [ ] Vite build configuration is optimized
- [ ] Production build works locally (`npm run build`)

---

## Railway Setup

### Project Creation
- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] New Railway project created

### MySQL Database Service
- [ ] MySQL service added to project
- [ ] Database credentials noted
- [ ] Schema SQL file executed in Railway MySQL query interface
- [ ] Database connection tested

### Backend Service
- [ ] Backend service added (from GitHub repo)
- [ ] Root directory set to `backend`
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Public domain generated
- [ ] All environment variables set:
  - [ ] `DB_HOST` (or use `${{MySQL.MYSQLHOST}}`)
  - [ ] `DB_PORT` (or use `${{MySQL.MYSQLPORT}}`)
  - [ ] `DB_USER` (or use `${{MySQL.MYSQLUSER}}`)
  - [ ] `DB_PASSWORD` (or use `${{MySQL.MYSQLPASSWORD}}`)
  - [ ] `DB_NAME` (or use `${{MySQL.MYSQLDATABASE}}`)
  - [ ] `JWT_SECRET` (strong random string, 32+ chars)
  - [ ] `JWT_EXPIRES_IN` (e.g., `24h`)
  - [ ] `PORT` (Railway sets automatically, but can specify)
  - [ ] `NODE_ENV=production`
  - [ ] `CLIENT_URL` (frontend URL - set after frontend deploy)
  - [ ] `UPLOAD_DIR=uploads` (optional)
  - [ ] `MAX_FILE_SIZE=10485760` (optional)

### Frontend Service
- [ ] Frontend service added (from GitHub repo)
- [ ] Root directory set to `frontend`
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start` (or `npx serve -s dist -l $PORT`)
- [ ] Public domain generated
- [ ] All environment variables set:
  - [ ] `VITE_API_URL` (backend Railway URL)
  - [ ] `VITE_WS_URL` (backend WebSocket URL with `wss://`)
  - [ ] `NODE_ENV=production`

### Final Configuration
- [ ] Backend `CLIENT_URL` updated with frontend Railway URL
- [ ] Frontend `VITE_API_URL` updated with backend Railway URL
- [ ] Frontend `VITE_WS_URL` updated with backend WebSocket URL

---

## Post-Deployment Verification

### Backend Health Check
- [ ] Visit `https://your-backend.railway.app/api/health`
- [ ] Response: `{"status":"ok","timestamp":"..."}`
- [ ] Check backend logs for "MySQL connected successfully"
- [ ] Check backend logs for "Meetat API Server running"

### Frontend Verification
- [ ] Visit frontend Railway URL
- [ ] Login page loads correctly
- [ ] Can register a new account
- [ ] Can log in with credentials

### Database Verification
- [ ] User registration creates database record
- [ ] Can create projects
- [ ] Can create missions and tasks

### WebSocket Verification
- [ ] Open browser console on frontend
- [ ] See "WebSocket connected" message
- [ ] Real-time updates work (test with two users)
- [ ] Notifications work in real-time

### API Verification
- [ ] All API endpoints respond correctly
- [ ] Authentication works (JWT tokens)
- [ ] File uploads work (if tested)
- [ ] CORS allows frontend requests

---

## Troubleshooting

### If Backend Won't Start
- [ ] Check build logs in Railway dashboard
- [ ] Verify all environment variables are set
- [ ] Check that `JWT_SECRET` is set and valid
- [ ] Verify database credentials are correct
- [ ] Check that `PORT` is not hardcoded

### If Frontend Won't Build
- [ ] Check build logs for errors
- [ ] Verify `VITE_API_URL` and `VITE_WS_URL` are set
- [ ] Ensure `serve` package is in dependencies
- [ ] Test build locally first: `npm run build`

### If Database Connection Fails
- [ ] Verify all database variables are set
- [ ] Check MySQL service is running
- [ ] Verify schema has been executed
- [ ] Test connection with Railway MySQL CLI

### If CORS Errors
- [ ] Verify `CLIENT_URL` matches frontend URL exactly
- [ ] Check for trailing slashes (should be none)
- [ ] Ensure protocol is `https://` in production
- [ ] Restart backend after changing `CLIENT_URL`

### If WebSocket Fails
- [ ] Verify `VITE_WS_URL` uses `wss://` (not `ws://`)
- [ ] Check backend WebSocket server is running
- [ ] Verify WebSocket path is `/ws`
- [ ] Check browser console for connection errors

---

## Security Checklist

- [ ] `JWT_SECRET` is a strong random string (32+ characters)
- [ ] `NODE_ENV` is set to `production`
- [ ] No default secrets in code
- [ ] Database credentials are secure
- [ ] CORS is restricted to frontend domain only
- [ ] File upload size limits are set
- [ ] No sensitive data in client-side code

---

## Performance Optimization

- [ ] Database connection pooling is configured
- [ ] Frontend build is optimized (minified)
- [ ] Static assets are properly cached
- [ ] Image optimization (if applicable)
- [ ] Monitoring is set up in Railway dashboard

---

## Documentation

- [ ] `RAILWAY_DEPLOYMENT.md` is reviewed
- [ ] `ENVIRONMENT_VARIABLES.md` is reviewed
- [ ] Team members have access to Railway project
- [ ] Environment variables are documented

---

## Next Steps After Deployment

1. **Set up monitoring** - Check Railway metrics regularly
2. **Configure backups** - Railway auto-backs up MySQL, but verify
3. **Set up custom domain** (optional) - In Railway service settings
4. **Configure scaling** (if needed) - In Railway service settings
5. **Set up alerts** - For service failures or high usage

---

**Last Updated:** December 2024

