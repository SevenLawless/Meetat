# Railway Deployment Guide for Meetat

This guide will walk you through deploying the Meetat project management application to Railway, including both the backend API and frontend React application.

> **📋 For detailed environment variable documentation, see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)**

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Railway Setup](#railway-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Environment Variables](#environment-variables)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- A Railway account (sign up at [railway.app](https://railway.app))
- GitHub account (for connecting your repository)
- Your code pushed to a GitHub repository
- Basic understanding of environment variables

---

## Railway Setup

### 1. Create a New Project

1. Log in to [Railway](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Railway will create a new project

### 2. Add Services

You'll need to create **3 services**:
- **MySQL Database** (for data storage)
- **Backend Service** (Node.js API)
- **Frontend Service** (React app)

---

## Database Setup

### 1. Add MySQL Service

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add MySQL"**
3. Railway will automatically provision a MySQL database

### 2. Get Database Credentials

1. Click on the MySQL service
2. Go to the **"Variables"** tab
3. Note down these values (you'll need them for the backend):
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`

### 3. Run Database Schema

1. Click on the MySQL service
2. Go to the **"Data"** tab
3. Click **"Query"**
4. Copy and paste the entire contents of `database/schema.sql`
5. Click **"Run"** to execute the schema

**Alternative:** You can also use Railway's MySQL CLI:
```bash
railway connect mysql
```
Then run:
```sql
source database/schema.sql
```

---

## Backend Deployment

### 1. Add Backend Service

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"** → Choose your repository
3. Railway will detect it as a Node.js project

### 2. Configure Backend Service

1. Click on the backend service
2. Go to **"Settings"** tab
3. Set the following:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### 3. Set Environment Variables

Go to the **"Variables"** tab and add:

#### Required Variables

```env
# Database (from MySQL service)
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}

# JWT Configuration
JWT_SECRET=your_super_secret_random_string_min_32_chars
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=production

# Client URL (will be set after frontend deployment)
CLIENT_URL=https://your-frontend-domain.railway.app

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```

**Important:** 
- Replace `your_super_secret_random_string_min_32_chars` with a strong random string (use a password generator)
- The `CLIENT_URL` will be your frontend Railway URL (set this after deploying frontend)

### 4. Generate Public URL

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Note the generated URL (e.g., `your-backend.railway.app`)
4. This is your backend API URL

### 5. Deploy

Railway will automatically deploy when you:
- Push to your connected branch, OR
- Click **"Deploy"** in the Railway dashboard

---

## Frontend Deployment

### 1. Add Frontend Service

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"** → Choose the same repository
3. Railway will detect it as a Node.js project

### 2. Configure Frontend Service

1. Click on the frontend service
2. Go to **"Settings"** tab
3. Set the following:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s dist -l $PORT`

### 3. Install Serve Package

Add `serve` to your frontend dependencies:

1. Go to **"Settings"** → **"NPM Scripts"**
2. Or update `frontend/package.json` to include:
   ```json
   "scripts": {
     "start": "serve -s dist -l $PORT"
   },
   "dependencies": {
     "serve": "^14.2.1"
   }
   ```

### 4. Set Environment Variables

Go to the **"Variables"** tab and add:

```env
VITE_API_URL=https://your-backend.railway.app
VITE_WS_URL=wss://your-backend.railway.app
NODE_ENV=production
```

**Important:** Replace `your-backend.railway.app` with your actual backend Railway URL.

### 5. Generate Public URL

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Note the generated URL (e.g., `your-frontend.railway.app`)

### 6. Update Backend CORS

Go back to your **Backend Service** → **"Variables"** and update:

```env
CLIENT_URL=https://your-frontend.railway.app
```

Replace with your actual frontend Railway URL.

### 7. Deploy

Railway will automatically deploy when you push changes.

---

## Environment Variables

### Backend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DB_HOST` | Yes | MySQL host | `containers-us-west-xxx.railway.app` |
| `DB_PORT` | Yes | MySQL port | `3306` |
| `DB_USER` | Yes | MySQL username | `root` |
| `DB_PASSWORD` | Yes | MySQL password | (auto-generated) |
| `DB_NAME` | Yes | Database name | `railway` |
| `JWT_SECRET` | Yes | Secret for JWT tokens | (generate strong random string) |
| `JWT_EXPIRES_IN` | No | JWT expiration time | `24h` |
| `PORT` | No | Server port | `3001` (Railway sets this) |
| `NODE_ENV` | Yes | Environment | `production` |
| `CLIENT_URL` | Yes | Frontend URL | `https://your-frontend.railway.app` |
| `UPLOAD_DIR` | No | Upload directory | `uploads` |
| `MAX_FILE_SIZE` | No | Max file size (bytes) | `10485760` (10MB) |

### Frontend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API URL | `https://your-backend.railway.app` |
| `VITE_WS_URL` | Yes | WebSocket URL | `wss://your-backend.railway.app` |
| `NODE_ENV` | Yes | Environment | `production` |

**Note:** Vite requires the `VITE_` prefix for environment variables to be exposed to the client.

---

## Post-Deployment

### 1. Verify Backend

1. Visit `https://your-backend.railway.app/api/health`
2. You should see: `{"status":"ok","timestamp":"..."}`

### 2. Verify Frontend

1. Visit your frontend Railway URL
2. You should see the login page
3. Try registering a new account

### 3. Test WebSocket

1. Log in to the application
2. Open browser console (F12)
3. You should see "WebSocket connected" message
4. Create a task and verify real-time updates work

### 4. Set Up Custom Domain (Optional)

1. Go to your service → **"Settings"** → **"Networking"**
2. Click **"Custom Domain"**
3. Add your domain and follow Railway's DNS instructions

---

## Troubleshooting

### Backend Issues

#### "Cannot connect to database"
- **Solution:** Verify all database environment variables are set correctly
- Check that the MySQL service is running
- Ensure you're using Railway's variable references: `${{MySQL.MYSQLHOST}}`

#### "CORS error"
- **Solution:** Verify `CLIENT_URL` in backend matches your frontend URL exactly
- Include protocol: `https://your-frontend.railway.app`
- No trailing slash

#### "Port already in use"
- **Solution:** Railway sets `PORT` automatically - don't hardcode it
- Use `process.env.PORT || 3001` in your code

### Frontend Issues

#### "Failed to fetch" or API errors
- **Solution:** Verify `VITE_API_URL` is set correctly
- Check that backend is deployed and running
- Verify CORS is configured in backend

#### "WebSocket connection failed"
- **Solution:** Verify `VITE_WS_URL` uses `wss://` (secure WebSocket)
- Check that backend WebSocket server is running
- Verify WebSocket path is `/ws`

#### "Blank page after deployment"
- **Solution:** Check build logs for errors
- Verify `serve` package is installed
- Check that `dist` folder exists after build

### Database Issues

#### "Table doesn't exist"
- **Solution:** Run the schema SQL file in Railway's MySQL query interface
- Verify you're connected to the correct database

#### "Access denied"
- **Solution:** Verify database credentials match Railway's MySQL service variables
- Check that you're using the correct database name

### General Issues

#### "Service won't start"
- **Solution:** Check build logs in Railway dashboard
- Verify all dependencies are in `package.json`
- Check that start command is correct

#### "Environment variables not working"
- **Solution:** Variables are case-sensitive
- Restart the service after adding new variables
- For Vite, ensure variables start with `VITE_`

---

## Railway-Specific Tips

### Using Railway Variables

Railway allows you to reference variables from other services:

```env
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
```

This automatically syncs when the MySQL service credentials change.

### Monitoring

1. Go to your service → **"Metrics"** tab
2. View CPU, Memory, and Network usage
3. Check logs in the **"Deployments"** tab

### Scaling

1. Go to **"Settings"** → **"Scaling"**
2. Adjust instance count if needed
3. Railway auto-scales based on traffic

### Backups

Railway automatically backs up MySQL databases. To restore:
1. Go to MySQL service → **"Data"** tab
2. Click **"Backups"**
3. Select a backup to restore

---

## Security Checklist

- [ ] `JWT_SECRET` is a strong random string (32+ characters)
- [ ] `NODE_ENV` is set to `production`
- [ ] Database credentials are secure (using Railway variables)
- [ ] CORS is configured to only allow your frontend domain
- [ ] File upload size limits are set appropriately
- [ ] No sensitive data in code (use environment variables)

---

## Cost Optimization

- Railway offers a free tier with $5 credit monthly
- MySQL database uses credits based on usage
- Consider using Railway's sleep feature for development
- Monitor usage in the **"Usage"** tab

---

## Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Check Railway status: [status.railway.app](https://status.railway.app)

---

## Quick Reference

### Backend Service Settings
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### Frontend Service Settings
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npx serve -s dist -l $PORT`

### Database Connection
Use Railway's MySQL service variables:
- `${{MySQL.MYSQLHOST}}`
- `${{MySQL.MYSQLPORT}}`
- `${{MySQL.MYSQLUSER}}`
- `${{MySQL.MYSQLPASSWORD}}`
- `${{MySQL.MYSQLDATABASE}}`

---

**Last Updated:** December 2024
**Version:** 1.0

