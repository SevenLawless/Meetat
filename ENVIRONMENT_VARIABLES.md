# Environment Variables Reference

This document lists all environment variables used in the Meetat application, organized by service.

## Backend Environment Variables

### Required Variables

#### Database Configuration

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `DB_HOST` | MySQL database hostname | `containers-us-west-xxx.railway.app` | Or use `MYSQLHOST` (Railway) |
| `DB_PORT` | MySQL database port | `3306` | Or use `MYSQLPORT` (Railway) |
| `DB_USER` | MySQL username | `root` | Or use `MYSQLUSER` (Railway) |
| `DB_PASSWORD` | MySQL password | `your_password` | Or use `MYSQLPASSWORD` (Railway) |
| `DB_NAME` | MySQL database name | `meetat` | Or use `MYSQLDATABASE` (Railway) |

**Railway Alternative:** Railway provides MySQL variables automatically. You can use either:
- Standard: `DB_HOST`, `DB_PORT`, etc.
- Railway: `MYSQLHOST`, `MYSQLPORT`, etc.
- Or reference: `${{MySQL.MYSQLHOST}}` (recommended)

#### JWT Configuration

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `JWT_SECRET` | Secret key for JWT token signing | `your_super_secret_32_char_min_string` | **MUST be 32+ characters, random** |
| `JWT_EXPIRES_IN` | JWT token expiration time | `24h` | Format: `1h`, `7d`, `30d` |

#### Server Configuration

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `PORT` | Server port | `3001` | Railway sets this automatically |
| `NODE_ENV` | Environment mode | `production` | `development` or `production` |
| `CLIENT_URL` | Frontend application URL | `https://your-app.railway.app` | Used for CORS, must match frontend URL exactly |

### Optional Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `UPLOAD_DIR` | Directory for file uploads | `uploads` | Relative to backend root |
| `MAX_FILE_SIZE` | Maximum file upload size (bytes) | `10485760` | 10MB default |

---

## Frontend Environment Variables

### Required Variables

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `VITE_API_URL` | Backend API base URL | `https://your-backend.railway.app` | **Must start with `VITE_` prefix** |
| `VITE_WS_URL` | WebSocket server URL | `wss://your-backend.railway.app` | Use `wss://` for production |
| `NODE_ENV` | Environment mode | `production` | `development` or `production` |

**Important:** Vite only exposes environment variables that start with `VITE_` to the client code.

### Optional Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `PORT` | Server port for preview | `4173` | Railway sets this automatically for production |

---

## Railway-Specific Variables

Railway automatically provides these variables for MySQL services:

| Variable | Description | Usage |
|----------|-------------|-------|
| `MYSQLHOST` | MySQL hostname | Use in backend: `DB_HOST=${{MySQL.MYSQLHOST}}` |
| `MYSQLPORT` | MySQL port | Use in backend: `DB_PORT=${{MySQL.MYSQLPORT}}` |
| `MYSQLUSER` | MySQL username | Use in backend: `DB_USER=${{MySQL.MYSQLUSER}}` |
| `MYSQLPASSWORD` | MySQL password | Use in backend: `DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}` |
| `MYSQLDATABASE` | MySQL database name | Use in backend: `DB_NAME=${{MySQL.MYSQLDATABASE}}` |

**Railway Variable References:** Use `${{ServiceName.VariableName}}` to reference variables from other services.

---

## Environment Setup Examples

### Local Development (.env file)

**Backend (`backend/.env`):**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_local_password
DB_NAME=meetat

JWT_SECRET=your_local_dev_secret_key_min_32_chars
JWT_EXPIRES_IN=24h

PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
NODE_ENV=development
```

### Railway Production

**Backend Service Variables:**
```env
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}

JWT_SECRET=your_production_secret_min_32_chars_random_string
JWT_EXPIRES_IN=24h

PORT=3001
NODE_ENV=production
CLIENT_URL=https://your-frontend.railway.app

UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```

**Frontend Service Variables:**
```env
VITE_API_URL=https://your-backend.railway.app
VITE_WS_URL=wss://your-backend.railway.app
NODE_ENV=production
```

---

## Security Best Practices

### JWT_SECRET

- **Minimum length:** 32 characters
- **Recommended:** 64+ characters
- **Generate with:** 
  ```bash
  # Linux/Mac
  openssl rand -base64 32
  
  # Or use Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- **Never commit** to version control
- **Use different secrets** for development and production

### Database Credentials

- **Never commit** credentials to version control
- **Use Railway variable references** when possible: `${{MySQL.MYSQLPASSWORD}}`
- **Rotate credentials** periodically in production

### CORS Configuration

- **Always set `CLIENT_URL`** in production
- **Use HTTPS** URLs in production
- **No trailing slashes** in URLs
- **Match exactly** the frontend domain

---

## Variable Validation

### Backend Startup Checks

The backend should validate these on startup:
- ✅ `JWT_SECRET` is set and has minimum length
- ✅ Database connection variables are present
- ✅ `CLIENT_URL` is set in production

### Frontend Build Checks

The frontend build will fail if:
- ❌ `VITE_API_URL` is not set in production
- ❌ `VITE_WS_URL` is not set in production

---

## Troubleshooting

### "JWT_SECRET is not set"
- **Solution:** Set `JWT_SECRET` environment variable
- **Check:** Backend service → Variables tab

### "Cannot connect to database"
- **Solution:** Verify all database variables are set
- **Check:** Use Railway's MySQL service variable references

### "CORS error"
- **Solution:** Verify `CLIENT_URL` matches frontend URL exactly
- **Check:** No trailing slash, includes `https://`

### "WebSocket connection failed"
- **Solution:** Verify `VITE_WS_URL` uses `wss://` (not `ws://`)
- **Check:** URL matches backend domain exactly

### "Environment variable not working in frontend"
- **Solution:** Ensure variable starts with `VITE_` prefix
- **Check:** Restart build after adding variables

---

## Quick Reference

### Minimum Required for Backend
```env
DB_HOST=...
DB_PORT=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
JWT_SECRET=...
CLIENT_URL=...
NODE_ENV=production
```

### Minimum Required for Frontend
```env
VITE_API_URL=...
VITE_WS_URL=...
NODE_ENV=production
```

---

**Last Updated:** December 2024

