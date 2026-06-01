# BeyondSelf Deployment Guide

Complete step-by-step guide to deploy the BeyondSelf full-stack application on Render.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Steps](#deployment-steps)
   - [Backend Deployment](#backend-deployment)
   - [Frontend Deployment](#frontend-deployment)
   - [Database Setup](#database-setup)
4. [Environment Variables](#environment-variables)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

**BeyondSelf** is a full-stack application with three components:

```
┌─────────────────────────────────────────────────────────────┐
│                     RENDER CLOUD PLATFORM                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐      ┌──────────────────────┐     │
│  │  FRONTEND (Static)  │      │  BACKEND (Docker)    │     │
│  │  React + Vite       │◄────►│  Spring Boot + Java  │     │
│  │  Hosted on Render   │      │  Port: Auto (Render) │     │
│  │  Static Site        │      │  Service             │     │
│  └─────────────────────┘      └──────────────────────┘     │
│                                        │                      │
│                                        │                      │
│                                        ▼                      │
│                              ┌──────────────────────┐        │
│                              │  PostgreSQL (Render) │        │
│                              │  Database            │        │
│                              └──────────────────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Before Starting, You Need:

1. **Render Account** — Sign up at [render.com](https://render.com)
2. **GitHub Account** — Repository access to `khushibansal2/beyondselff`
3. **Git Installed** — For local development
4. **Node.js v18+** — For frontend builds
5. **API Keys:**
   - `GROQ_API_KEY` — Get from [console.groq.com](https://console.groq.com) (free)
   - `JWT_SECRET` — Any random string (we'll provide a default)

---

## Deployment Steps

### Part 1: Backend Deployment

#### Step 1.1: Create PostgreSQL Database on Render

1. **Go to Render dashboard** → Click **New +** → Select **PostgreSQL**
2. **Configure Database:**
   - **Name:** `digitaltwin`
   - **Database:** `digitaltwin_xv3h`
   - **User:** `admin` (auto-filled)
   - **Region:** Choose closest to you
   - **Plan:** Free tier
3. **Click "Create Database"**
4. **Wait for creation** (~2 minutes)
5. **Copy the Internal Database URL** from Info tab (you'll need this)
   - Format: `postgresql://admin:password@hostname:5432/digitaltwin_xv3h`

---

#### Step 1.2: Create Backend Web Service on Render

1. **Go to Render dashboard** → Click **New +** → Select **Web Service**
2. **Connect Repository:**
   - Click "Connect to GitHub"
   - Select: `khushibansal2/beyondselff`
   - Branch: `main`
3. **Configure Service:**
   - **Name:** `digital-twin-backend`
   - **Runtime:** `Docker`
   - **Build Command:** (leave blank — uses Dockerfile)
   - **Start Command:** (leave blank — uses Dockerfile)
   - **Plan:** Free tier
4. **Click "Create Web Service"**
5. **Wait for deployment to start** (Render will automatically build from Dockerfile)

---

#### Step 1.3: Set Backend Environment Variables

1. **In the backend service** → Go to **Environment** tab
2. **Add these variables:**

```
SPRING_DATASOURCE_URL=jdbc:postgresql://admin:PASSWORD@HOSTNAME:5432/digitaltwin_xv3h
SPRING_DATASOURCE_USERNAME=admin
SPRING_DATASOURCE_PASSWORD=PASSWORD
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=beyondself-hackathon-jwt-secret-key-2025
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend-url.onrender.com
```

**Replace with your actual values:**
- `PASSWORD` — From your PostgreSQL database URL
- `HOSTNAME` — From your PostgreSQL database URL (e.g., `dpg-xxxxx.ondigitalocean.app`)
- `GROQ_API_KEY` — Your Groq API key
- `your-frontend-url` — Your frontend Render URL (you'll get this in Part 2)

3. **Click "Save Changes"**
4. **Redeploy** — Backend service will automatically redeploy with new env vars

---

#### Step 1.4: Verify Backend Deployment

1. **Go to backend service Logs tab**
2. **Look for success message:**
   ```
   Tomcat initialized with port [PORT] (http)
   ```
3. **Get your backend URL:**
   - Format: `https://digital-twin-backend-xxxx.onrender.com`
   - Found in service info at top

4. **Test the backend:**
   ```bash
   curl https://digital-twin-backend-xxxx.onrender.com/api/auth/me
   ```
   - Should return error (expected, not authenticated) or empty response

---

### Part 2: Frontend Deployment

#### Step 2.1: Create Static Site on Render

1. **Go to Render dashboard** → Click **New +** → Select **Static Site**
2. **Connect Repository:**
   - Click "Connect to GitHub"
   - Select: `khushibansal2/beyondselff`
   - Branch: `main`
3. **Configure Build:**
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
   - **Plan:** Free tier
4. **Click "Create Static Site"**
5. **Wait for build and deployment** (~3-5 minutes)

---

#### Step 2.2: Set Frontend Environment Variables

1. **In the Static Site** → Go to **Environment** tab
2. **Add these variables:**

```
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxx
VITE_BACKEND_URL=https://digital-twin-backend-xxxx.onrender.com
```

**Replace with:**
- `VITE_GROQ_API_KEY` — Your Groq API key
- `VITE_BACKEND_URL` — Your backend URL from Step 1.4

3. **Click "Save Changes"**
4. **Frontend will auto-redeploy**

---

#### Step 2.3: Get Your Frontend URL

1. **In Static Site service** → Look at top for deployment URL
2. **Format:** `https://yourapp-xxxxx.onrender.com`
3. **Copy this URL** — you'll need it for CORS configuration

---

### Part 3: Final CORS Configuration

#### Step 3.1: Update Backend CORS

1. **Go to backend service** → **Environment** tab
2. **Edit `CORS_ALLOWED_ORIGINS`** to include your frontend URL:
   ```
   http://localhost:5173,https://yourapp-xxxxx.onrender.com
   ```
3. **Click "Save Changes"**
4. **Redeploy backend**

---

#### Step 3.2: Verify Deployment

1. **Open frontend URL** in browser: `https://yourapp-xxxxx.onrender.com`
2. **You should see the BeyondSelf Landing page**
3. **Try signing up** with demo account:
   - Email: `arjun@demo.com`
   - Password: `demo123`
4. **Dashboard should load** with demo data

---

## Environment Variables

### Backend Environment Variables

Required variables for `application.properties`:

| Variable | Example | Notes |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://admin:pwd@host:5432/db` | **Required** — PostgreSQL connection |
| `SPRING_DATASOURCE_USERNAME` | `admin` | **Required** — DB user |
| `SPRING_DATASOURCE_PASSWORD` | `xxxxxx` | **Required** — DB password |
| `PORT` | (auto-set by Render) | **Optional** — Render sets this automatically |
| `GROQ_API_KEY` | `gsk_xxxxxx` | **Required** — AI coach functionality |
| `JWT_SECRET` | `beyondself-2025` | **Required** — Auth token signing |
| `CORS_ALLOWED_ORIGINS` | `https://app.onrender.com` | **Required** — Frontend URL |
| `FITBIT_CLIENT_ID` | (optional) | For Fitbit integration |
| `FITBIT_CLIENT_SECRET` | (optional) | For Fitbit integration |
| `ADZUNA_APP_ID` | (optional) | For job board integration |
| `ADZUNA_APP_KEY` | (optional) | For job board integration |
| `JOOBLE_API_KEY` | (optional) | For job aggregator |
| `FILE_ENCRYPTION_KEY` | (optional) | For file encryption at rest |

### Frontend Environment Variables

Required variables for Vite build:

| Variable | Example | Notes |
|---|---|---|
| `VITE_GROQ_API_KEY` | `gsk_xxxxxx` | **Required** — AI features |
| `VITE_BACKEND_URL` | `https://backend-xxxx.onrender.com` | **Required** — API endpoint |
| `VITE_GITHUB_TOKEN` | (optional) | For GitHub integration |
| `VITE_NUTRITIONIX_APP_ID` | (optional) | For food lookup |
| `VITE_NUTRITIONIX_APP_KEY` | (optional) | For food lookup |

---

## Verification

### Checklist: Verify All Services Are Running

- [ ] **Backend Service**
  - [ ] Logs show "Tomcat initialized with port"
  - [ ] No error messages in logs
  - [ ] Database connection successful (check logs for "HikariPool" messages)

- [ ] **Frontend Static Site**
  - [ ] Build completed successfully
  - [ ] No build errors in logs
  - [ ] Static site is accessible via browser

- [ ] **Database**
  - [ ] PostgreSQL service is running
  - [ ] Status shows "Available"

### Manual Testing

#### Test 1: Frontend Loads
```bash
curl https://your-frontend.onrender.com
# Should return HTML content (landing page)
```

#### Test 2: Backend API Responds
```bash
curl https://your-backend.onrender.com/api/auth/me
# Should return 401 (unauthorized) — this is correct, means backend is running
```

#### Test 3: Login Works
1. Open frontend URL in browser
2. Click "Sign In"
3. Use demo credentials:
   - Email: `arjun@demo.com`
   - Password: `demo123`
4. Should see Dashboard with data

#### Test 4: Backend Integration
1. Logged in on Dashboard
2. Click "Settings" → "Integrations"
3. Should be able to reach backend without errors

---

## Troubleshooting

### Backend Won't Start

**Error:** `Exited with status 1`

**Solutions:**
1. **Check logs** for the actual error message
2. **Database connection issue?**
   - Verify `SPRING_DATASOURCE_URL` is correct
   - Verify `SPRING_DATASOURCE_PASSWORD` matches database
   - Check database is running (status: "Available")
3. **Missing env var?**
   - Re-check all required variables are set
   - Redeploy after adding variables
4. **Java/Maven issue?**
   - Check `pom.xml` is valid
   - Dockerfile builds correctly locally: `docker build -f backend/Dockerfile -t test .`

---

### Frontend Won't Build

**Error:** `Build failed`

**Solutions:**
1. **Check build logs** for the specific error
2. **Node version?**
   - Render requires Node v18+ (should auto-detect)
3. **Dependencies issue?**
   - Ensure `package.json` and `package-lock.json` are in sync
   - Try local build: `npm run build`
4. **Environment variables?**
   - Some env vars might be required at build time
   - Check `vite.config.js` for env requirements

---

### CORS Errors in Frontend

**Error:** `Access to XMLHttpRequest blocked by CORS`

**Solutions:**
1. **Check backend CORS config:**
   - Go to backend service → Environment
   - `CORS_ALLOWED_ORIGINS` should include your frontend URL
   - Should NOT have trailing slash
2. **Redeploy backend** after updating CORS
3. **Clear browser cache** and hard refresh (Ctrl+Shift+R)

---

### Database Connection Timeout

**Error:** `Connection attempt failed` / `UnknownHostException`

**Solutions:**
1. **Verify hostname** in `SPRING_DATASOURCE_URL`
   - Should be internal database URL, not external
   - Format: `dpg-xxxxx.render.ondigitalocean.app` (no `jdbc:`)
   - Wait — should be: `jdbc:postgresql://dpg-xxxxx:5432/db`
2. **Check database is running** — Go to database service, verify status
3. **Verify password** matches exactly (copy-paste from database info)

---

### Login Not Working

**Error:** `Invalid credentials` / `Authentication failed`

**Solutions:**
1. **Using demo account?**
   - Email: `arjun@demo.com`
   - Password: `demo123`
   - These work without backend
2. **Backend not running?**
   - Check backend service status
   - Frontend falls back to demo mode if backend unavailable
3. **JWT_SECRET mismatch?**
   - All backend instances must have same `JWT_SECRET`
   - Restart backend if you changed it

---

### Data Not Persisting

**Error:** Data disappears after refresh / resets on redeploy

**Solutions:**
1. **Using demo account?** (expected behavior — localStorage only)
2. **Backend not connected?** Check CORS and network tab
3. **Database not connected?** Check `SPRING_DATASOURCE_URL`

---

## Advanced: Manual Deployment from Command Line

### For developers who prefer CLI:

```bash
# 1. Clone repository
git clone https://github.com/khushibansal2/beyondselff.git
cd beyondselff

# 2. Build frontend locally (optional, Render does this)
npm install
npm run build

# 3. Build backend Docker image locally (optional)
docker build -f backend/Dockerfile -t beyondselff-backend .

# 4. Push to Render (automatic via GitHub)
git push origin main
# → Render auto-deploys on push
```

---

## Support & Troubleshooting Resources

- **Render Docs:** https://render.com/docs
- **Spring Boot Docs:** https://spring.io/projects/spring-boot
- **React/Vite Docs:** https://vite.dev
- **PostgreSQL Docs:** https://www.postgresql.org/docs

---

## Deployment Checklist

Before going live:

- [ ] PostgreSQL database created and running
- [ ] Backend service deployed with all env vars
- [ ] Frontend static site deployed
- [ ] CORS configured with frontend URL
- [ ] Database migrations ran (check logs)
- [ ] Demo account login works
- [ ] API calls from frontend to backend succeed
- [ ] No error messages in browser console
- [ ] No error messages in backend logs

---

## Team Notes

- **Deployment time:** 10-15 minutes for full stack
- **Free tier limits:** 750 build hours/month, database backups not included
- **Next steps:** Set up monitoring, backups, custom domain
- **Questions?** Check Render docs or contact team lead

---

Last Updated: 2026-06-01
