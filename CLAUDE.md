# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BeyondSelf is a full-stack "Digital Twin" life management web app. It tracks health, finance, and career data to produce unified life scores and AI-driven predictions. The app is fully functional offline via demo personas — the Spring Boot backend is optional.

All source code lives inside the `BeyondSelf-Complete/` subdirectory.

## Prerequisites

- Node.js v18+
- Java JDK 21+
- Maven v3.9+
- PostgreSQL (running on port 5432)

## Commands

### Frontend (`BeyondSelf-Complete/` directory)
```bash
cd BeyondSelf-Complete
npm install        # Install dependencies
npm run dev        # Start Vite dev server at http://localhost:5173
npm run build      # Production build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Backend (`BeyondSelf-Complete/backend/` directory)
```bash
cd BeyondSelf-Complete/backend
mvn clean install      # Build and install
mvn spring-boot:run    # Start server at http://localhost:8080
```

### One-command setup
```bash
cd BeyondSelf-Complete
./setup.sh   # Checks Java/Node/PostgreSQL, installs all dependencies
```

### Demo login (no backend needed)
- `arjun@demo.com` / `demo123`
- `priya@demo.com` / `demo123`

## Database Setup (first time)

```sql
-- In psql:
CREATE DATABASE digitaltwin;
```

Then set environment variables before running the backend:
```bash
export GEMINI_API_KEY="your-gemini-api-key"
export DB_USERNAME="your-postgres-username"
# DB_PASSWORD if your PostgreSQL requires one
```

Or copy `BeyondSelf-Complete/backend/.env.example` to `BeyondSelf-Complete/backend/.env`. The backend defaults to the OS username with no password on a standard local PostgreSQL install.

## Architecture

### Frontend — State & Data Flow

The app uses two React contexts as its backbone:

- **[AuthContext](BeyondSelf-Complete/src/context/AuthContext.jsx)** — JWT auth, demo user fallback, localStorage session persistence.
- **[DataContext](BeyondSelf-Complete/src/context/DataContext.jsx)** — Single source of truth for all domain data (health/finance/career records, simulator state, AI cache). Uses `useReducer` with ~13 action types. Persists to localStorage via `storageAdapter.js`. Also syncs across browser tabs via `localStorage` events.

All pages (`src/pages/`) are consumers of DataContext — they do not have their own data-fetching logic.

### Scoring Engines (`BeyondSelf-Complete/src/engines/`)

All scoring is **deterministic rule-based math**, not ML, to prevent hallucination:

- `lifeBalanceEngine.js` — Orchestrates the three domain scores and applies **cross-domain cascade effects**: sleep debt → emotional spending, financial stress → career readiness decline, financial runway → upskilling focus.
- `healthScoreEngine.js`, `financeScoreEngine.js`, `careerScoreEngine.js` — Domain-specific scoring.
- `simulatorEngine.js` — Projects habit changes forward 3–12 months for the Simulator page, including burnout crash prediction.
- `burnoutEngine.js`, `anomalyEngine.js`, `trendEngine.js`, `recommendationEngine.js` — Supporting analytics.

### AI Integration (`BeyondSelf-Complete/src/services/aiService.js`)

Proxies to Google Gemini 2.0 Flash via the Spring Boot backend (`POST /api/ai`). Key behaviors:
- Strips PII before sending to Gemini.
- Falls back to a deterministic template system ([RoboAdvisor.jsx](BeyondSelf-Complete/src/components/ui/RoboAdvisor.jsx)) on 429 or network failure — the coach stays intelligent without hallucinations.
- API key lives in the backend (`backend/.env`) — never exposed to the browser.

### Backend (Spring Boot, port 8080)

Controllers → Services → JPA Repositories → PostgreSQL. Key controllers:

- `AuthController` — `/login`, `/signup` with JWT via `JwtUtil`.
- `UploadController` → `UploadService` → parsers (`PDFParser`, `CSVParser`, `ExcelParser`) → normalizers (`HealthNormalizer`, etc.).
- `AIProxyController` — Receives sanitized prompts from frontend, calls Gemini, returns response.
- `RecordController` — CRUD for health/finance/career records.

Backend config: `BeyondSelf-Complete/backend/src/main/resources/application.properties`.

### Routing (`BeyondSelf-Complete/src/App.jsx`)

Public routes: `/`, `/auth`. All other routes are wrapped in a `ProtectedRoute` that checks `AuthContext`. The layout shell (Sidebar + TopNavbar) wraps all authenticated pages.

### UI Conventions

- Glassmorphism dark UI via Tailwind CSS v4.
- Animations via Framer Motion (page transitions, score rings).
- Charts via Recharts.
- Icons via Lucide React.
- Reusable primitives (`ScoreRing`, `GlassCard`, etc.) in [Components.jsx](BeyondSelf-Complete/src/components/ui/Components.jsx).
- `storageAdapter.js` handles localStorage versioning and auto-migration of user data schemas — use it instead of raw `localStorage` calls.
- `safeMath.js` for arithmetic that could encounter null/undefined domain values.

### Testing Integrations

To test real data ingestion: **Settings → Integrations** → connect GitHub or upload a CSV/PDF bank statement/health log.
