# AGENTS.md

Guidance for Codex when working in this repository.

## Project Overview

**BeyondSelf** is a full-stack "Digital Twin" life management web app for a hackathon. It unifies health, finance, and career data into a single AI-driven life score with cross-domain cascade effects (e.g. poor sleep → emotional spending). Fully functional offline via demo personas — the Spring Boot backend is optional.

Three co-located services:
- **Frontend** (`src/`) — React 19 + Vite 8 + Tailwind CSS v4
- **Backend** (`backend/`) — Spring Boot 3.2.5, Java 21, PostgreSQL
- **ML Service** (`ml_service/`) — Python FastAPI, 4-agent meal analysis pipeline

## Prerequisites

- Node.js v18+
- Java JDK 21+
- Maven v3.9+
- PostgreSQL on port 5432 (database: `digitaltwin`, user: `postgres`, password: `password`)
- Python 3.10+ (ML service only)

## Commands

### Frontend (repo root)
```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run lint
```

### Backend (`backend/` directory)
```bash
cd backend
mvn clean install
mvn spring-boot:run   # http://localhost:8080
```

### ML Service (`ml_service/` directory)
```bash
cd ml_service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Demo login (no backend needed)
- `arjun@demo.com` / `demo123`
- `priya@demo.com` / `demo123`

## Database Setup (first run)
```sql
-- in psql:
CREATE DATABASE digitaltwin;
```
Credentials go in `backend/src/main/resources/application.properties` (gitignored — copy from `application.properties.example`).

## Environment / API Keys

All keys live in `.env` at the repo root (gitignored). Vite reads `VITE_*` vars automatically. Backend reads its vars from `application.properties` directly (also gitignored).

Key vars:
| Variable | Used by | Where to get |
|---|---|---|
| `VITE_GROQ_API_KEY` + `GROQ_API_KEY` | AI coach, voice, nutrition, career intel | console.groq.com (free) |
| `VITE_GITHUB_TOKEN` | GitHub integration | github.com/settings/tokens |
| `VITE_NUTRITIONIX_APP_ID/KEY` | Food lookup | developer.nutritionix.com (free) |
| `FITBIT_CLIENT_ID/SECRET` | Fitbit OAuth | dev.fitbit.com — get from team |
| `ADZUNA_APP_ID/KEY` | Job board | developer.adzuna.com or get from team |
| `JOOBLE_API_KEY` | Indian job aggregator | get from team |
| `FILE_ENCRYPTION_KEY` | AES-256 file encryption | optional, leave blank for dev |

## Tests

No automated test infrastructure. To test data ingestion: **Settings → Integrations** in the running app, then upload a CSV/PDF/Excel or connect GitHub.

---

## Architecture

### Frontend — State & Data Flow

Two React contexts are the backbone:

- **[AuthContext](src/context/AuthContext.jsx)** — JWT auth with dual token support: real JWT from backend + legacy `dt_jwt_` base64 for demo users. Async login/signup calls backend first, falls back to localStorage demo users if offline.
- **[DataContext](src/context/DataContext.jsx)** — Single source of truth for all domain data (health/finance/career records, simulator state, AI cache). Uses `useReducer` with ~13 action types. Persists via `storageAdapter.js`. Syncs across browser tabs via `localStorage` events.
- **[ThemeContext](src/context/ThemeContext.jsx)** — Light/dark theme.

All pages in `src/pages/` consume DataContext — no per-page data fetching.

### Pages (`src/pages/`)

| Page | What it does |
|---|---|
| **Landing.jsx** | Public marketing page — features, personas, sign-up CTA |
| **Auth.jsx** | Login/Signup forms — backend auth with demo fallback |
| **Dashboard.jsx** | Main hub — unified life scores, timeline, AI narrative, Doom Mode toggle |
| **Health.jsx** | Sleep, stress, workout, nutrition tracking — meal plans, supplement logging |
| **Finance.jsx** | Income, expenses, debt, savings — receipt OCR, transaction parsing, robo-advisor |
| **Career.jsx** | Resume upload, job matching, learning paths, DSA tracking, interview prep |
| **Goals.jsx** | SMART goal CRUD — milestones, AI suggestions, progress from domain data |
| **Coach.jsx** | AI chat with voice input — full context, 40-message history |
| **Simulator.jsx** | What-if scenario modeling — project 3–12 months forward |
| **Insights.jsx** | Pattern detection — correlations, anomalies, burnout warnings |
| **NeuralCore.jsx** | Neural Engine analytics — cross-domain composite metrics |
| **Gamification.jsx** | RPG progression — XP, badges, tier system (Wanderer → Legendary), challenges |
| **Sustainability.jsx** | Carbon footprint tracking — transport/energy/food, eco-actions |
| **Upload.jsx** | File import — CSV/PDF/Excel/JSON with demo mock data |
| **Integrations.jsx** | Third-party connections — GitHub, Fitbit, Nutritionix, LeetCode |
| **LifeMarket.jsx** | Peer life-asset trading and contracts system |
| **Settings** | User preferences, data export, theme, privacy |

### Scoring Engines (`src/engines/`)

All scoring is **deterministic rule-based math** (no ML) to prevent hallucination:

- **[lifeBalanceEngine.js](src/engines/lifeBalanceEngine.js)** — Orchestrates domain scores and applies **cross-domain cascade effects**: sleep debt → emotional spending, financial stress → career readiness decline, runway → upskilling focus.
- `healthScoreEngine.js`, `financeScoreEngine.js`, `careerScoreEngine.js` — Domain 0–100 scoring.
- `simulatorEngine.js` — Forward project habit changes 3–12 months; burnout crash prediction.
- `goalProgressEngine.js` — Auto-computes goal progress from live domain data.
- `NeuralEngine.js` — Composite cross-domain metrics.
- `burnoutEngine.js`, `anomalyEngine.js`, `trendEngine.js`, `recommendationEngine.js` — Supporting analytics.

### Services (`src/services/`)

| Service | Covers |
|---|---|
| `aiService.js` | Gemini proxy — PII stripping, 429 fallback to template system, direct Groq fallback |
| `visionService.js` | Image → Gemini vision (meal detection, supplement ID) |
| `ocrService.js` | Tesseract.js OCR — receipts, PDFs |
| `voiceService.js` / `voiceLogService.js` | Web Speech API, voice log persistence |
| `githubService.js` | GitHub API v3 — profile, repos, contribution stats, AI analysis |
| `jobService.js` | Job listings (Adzuna/Jooble proxy via backend) |
| `careerIntelligenceService.js` | Skill gap analysis, salary benchmarks, job matching |
| `nutritionService.js` | AI meal plan generation (Groq) |
| `nutritionixService.js` | Nutritionix API client — food lookup |
| `resumeService.js` | PDF extraction + AI resume parsing |
| `learningService.js` | Learning path generation by skill |
| `studyService.js` | Study session logging + heatmap data |
| `transactionParserService.js` | SMS/receipt parser — merchant mapping, categorization |
| `mockTransactionService.js` | Synthetic demo transaction generator |
| `simulatorService.js` | AI-backed what-if scenario simulation |
| `syncService.js` | localStorage → backend sync queue |
| `recommendationFeedbackService.js` | Save recommendation ratings |

### AI Integration

Two AI providers used:
1. **Google Gemini 2.0 Flash** — via backend proxy at `POST /api/ai/chat`. Key never exposed to browser. Falls back to deterministic template system ([RoboAdvisor.jsx](src/components/ui/RoboAdvisor.jsx)) on failure.
2. **Groq (llama-3.3-70b-versatile / llama-4-scout)** — called directly from frontend via `VITE_GROQ_API_KEY`. Used for voice logging, nutrition, career intel, simulator narratives. Falls back to `localStorage('groq_api_key')` if env var missing.

### UI Conventions

- Glassmorphism dark UI — Tailwind CSS v4 with custom `glass`, `glass-card`, `bg-mesh`, `gradient-text`, `btn-primary` classes in [index.css](src/index.css).
- Animations — Framer Motion (page transitions, score rings, card entrances).
- Charts — Recharts (`AreaChart`, `BarChart`, `RadialBarChart`).
- Icons — Lucide React + React Icons.
- Reusable primitives (`ScoreRing`, `GlassCard`, `MetricCard`, etc.) in [Components.jsx](src/components/ui/Components.jsx).
- Use `storageAdapter.js` instead of raw `localStorage` — handles schema versioning and auto-migration.
- Use `safeMath.js` for arithmetic on domain values that could be null/undefined.
- Heavy pages are lazy-loaded with React `Suspense` + `LoadingScreen` fallback in `App.jsx`.

### Routing (`src/App.jsx`)

Public: `/`, `/login`, `/signup`. All other routes wrapped in `ProtectedRoute` (checks `AuthContext`). Layout shell (Sidebar + TopNavbar) wraps all authenticated pages.

---

## Backend (Spring Boot, port 8080)

### Controllers → Routes

| Controller | Prefix | Key endpoints |
|---|---|---|
| `AuthController` | `/api/auth` | `POST /signup`, `POST /login`, `GET /me` |
| `RecordController` | `/api/records` | CRUD for `health`, `finance`, `career` domains |
| `UploadController` | `/api/uploads` | `POST /` (file upload), `GET /history` |
| `AIProxyController` | `/api/ai` | `POST /chat` (Gemini proxy) |
| `GoalController` | `/api/goals` | Full CRUD + `PATCH /{id}/progress` |
| `GamificationController` | `/api/gamification` | `GET /stats`, `GET /badges`, `GET /summary` |
| `SyncController` | `/api/sync` | `POST /state` |
| `TransactionController` | `/api/transactions` | `POST /parse` |
| `StudySessionController` | `/api/study-sessions` | CRUD + `GET /heatmap` |
| `JobProxyController` | `/api/jobs` | `GET /search` (proxies Adzuna/Jooble) |
| `FitbitController` | `/api/fitbit` | OAuth flow + sync |

### Entities & Tables

| Entity | Table | Key fields |
|---|---|---|
| `User` | `users` | UUID pk, email (unique), passwordHash, name, createdAt |
| `HealthRecord` | `health_records` | userId, recordDate, sleepHours, stressLevel, moodScore, workoutMinutes, waterGlasses, calories, bmi, heartRate, steps |
| `FinanceRecord` | `finance_records` | userId, transactionDate, income, expenses, debt, savings, investmentAmount |
| `CareerRecord` | `career_records` | userId, activityDate, jobTitle, company, skills, salary, yearsExperience, projectsCompleted |
| `Goal` | `goals` | userId, title, domain, targetValue, currentValue, unit, deadline, status, priority, milestones (JSON) |
| `TransactionRecord` | `transactions` | userId, date, merchant, amount, category, source |
| `StudySession` | `study_sessions` | userId, topic, duration, startTime, endTime, cognitiveLoad |
| `UserStats` | `user_stats` | userId (PK), xp, level, currentStreak, longestStreak, lastActivityDate |
| `UserBadge` | `user_badges` | userId, badgeId, badgeName, domain, icon, earnedAt |
| `ImportHistory` | `import_history` | userId, filename, status, importedAt, recordCount |

### Services

- `AuthService` — BCrypt signup/login, JWT generation via `JwtUtil`
- `UploadService` — routes CSV/PDF/Excel to `FileParserService` → normalizers
- `GeminiService` — Gemini API wrapper with PII filtering
- `GamificationService` — XP (10/log, 15/goal created, 50/goal done), streaks, 15 badge types
- `FileEncryptionService` — AES-256-GCM for uploaded files at rest

### Auth Token Formats

Two formats are supported simultaneously:
- **Real JWT** (from backend signup/login) — standard HS256, exp in seconds
- **Legacy `dt_jwt_`** (demo users, offline) — base64-encoded JSON, exp in milliseconds

Both `AuthUtil.java` (backend) and `AuthContext.jsx` + `decodeTokenPayload()` (frontend) handle both formats.

### CORS

Configured in `CorsConfig.java` for: `localhost:5173–5180`.

---

## ML Service (FastAPI, port 8000)

4-step agent pipeline at `POST /api/analyze-meal`:

1. **VisionAgent** — Food detection from image (MobileNet V3 or mock by file size)
2. **PortionAgent** — Portion size estimation (1.0–3.0× multiplier)
3. **NutritionAgent** — Nutrition lookup from local JSON DB
4. **TrackingAgent** — Persists meal to `meals.db` (SQLite) with userId + timestamp

Returns: `{ food, portion, calories, protein, carbs, fat, logId }`

---

## Key Files Quick Reference

| File | What to know |
|---|---|
| [src/context/AuthContext.jsx](src/context/AuthContext.jsx) | Dual-token auth, async backend calls with demo/localStorage fallback |
| [src/context/DataContext.jsx](src/context/DataContext.jsx) | useReducer store — all domain data lives here |
| [src/engines/lifeBalanceEngine.js](src/engines/lifeBalanceEngine.js) | Cross-domain cascade logic — start here for scoring bugs |
| [src/components/ui/Components.jsx](src/components/ui/Components.jsx) | All shared UI primitives |
| [src/index.css](src/index.css) | All custom CSS classes (glass, bg-mesh, gradient-text, etc.) |
| [src/utils/storageAdapter.js](src/utils/storageAdapter.js) | Use instead of raw localStorage |
| [backend/.../AuthService.java](backend/src/main/java/com/digitaltwin/backend/service/AuthService.java) | BCrypt + JWT — entry point for auth bugs |
| [backend/.../GamificationService.java](backend/src/main/java/com/digitaltwin/backend/service/GamificationService.java) | XP, badges, streaks logic |
| [backend/.../application.properties](backend/src/main/resources/application.properties) | Gitignored local config — DB creds, JWT secret, API keys |
