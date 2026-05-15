# BeyondSelf: Personal Digital Twin 🧠⚡️

BeyondSelf is an intelligent, cross-domain **Personal Digital Twin** that consolidates your Health, Finance, and Career data into one unified AI-powered platform. It reveals hidden life cascades — like how poor sleep degrades your coding productivity, or how financial stress triggers emotional spending.

---

## 🚀 Quick Start (Fresh Clone)

### Prerequisites
| Tool | Version | Install |
|---|---|---|
| Java | 17+ | [adoptium.net](https://adoptium.net) |
| Maven | 3.8+ | bundled with most IDEs or `brew install maven` |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 14+ | [postgresql.org](https://www.postgresql.org/download/) |

### Option A — Automated Setup
```bash
git clone https://github.com/pavani0959/BeyondSelf.git
cd BeyondSelf
chmod +x setup.sh && ./setup.sh
```

### Option B — Manual Setup

**1. Create the PostgreSQL database**
```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql:
CREATE DATABASE digitaltwin;
\q
```

**2. Configure backend credentials**
```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials and Gemini API key
```

**3. Start the Backend**
```bash
cd backend
DB_USERNAME=postgres DB_PASSWORD=yourpassword mvn spring-boot:run
```
Wait for: `Started BackendApplication in X seconds`

**4. Install & Start the Frontend**
```bash
# From project root
npm install
npm run dev
```

**5. Open the app**
```
http://localhost:5173
```

---

## 🔑 Environment Variables

Set these before running `mvn spring-boot:run`:

| Variable | Description | Default |
|---|---|---|
| `DB_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/digitaltwin` |
| `DB_USERNAME` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | *(empty)* |
| `GEMINI_API_KEY` | Google Gemini AI key | *(get from [aistudio.google.com](https://aistudio.google.com))* |

**Set as shell variables (Mac/Linux):**
```bash
export DB_USERNAME=postgres
export DB_PASSWORD=yourpassword
export GEMINI_API_KEY=your_key_here
mvn spring-boot:run
```

**Or inline (one-time):**
```bash
DB_USERNAME=postgres DB_PASSWORD=secret GEMINI_API_KEY=AIza... mvn spring-boot:run
```

---

## 🎮 Demo Login (No Backend Needed!)

The app works **fully offline** with built-in demo personas — no database required:

| Persona | Email | Password |
|---|---|---|
| 🧑‍💻 Stressed Student | `arjun@demo.com` | `demo123` |
| 💪 Fitness Learner | `priya@demo.com` | `demo123` |
| 💸 Overspender | `rahul@demo.com` | `demo123` |
| 🔥 Burnout Risk | `sneha@demo.com` | `demo123` |
| 🎯 Placement Coder | `karthik@demo.com` | `demo123` |

Just click the persona buttons on the login page — no typing needed.

---

## ✨ Features

### 🧠 Intelligence Engines (Deterministic)
- **Life Balance Score** — cross-domain health/finance/career scoring
- **Burnout Prediction** — early warning system with risk trajectory
- **Anomaly Detection** — flags sudden changes in behavior patterns
- **Trend Analysis** — 30-day slope analysis per metric
- **Cross-Domain Cascades** — "poor sleep → reduced productivity → missed deadlines"

### 📊 Analytics & Visualization
- Consistency heatmaps, momentum charts, burnout timeline
- Behavioral pattern recognition
- Correlation mapping (sleep ↔ spending, workouts ↔ productivity)

### 🤖 AI Coach (Gemini-Powered)
- Grounded in your real deterministic data — never hallucinates metrics
- Conversational memory (last 4 messages carried as context)
- Falls back to local reasoning when Gemini is unavailable

### 🎙️ Voice Intelligence
- MediaRecorder-based recording (works on all browsers including Safari)
- Backend transcription pipeline via Spring Boot
- Typed fallback when backend is unreachable
- Smart intent routing: "log 7h sleep stress 4" → auto-saved to Health

### 📁 Data Import & Integrations
- Upload CSV, Excel, PDF, JSON files
- OCR-based bank statement parsing
- GitHub integration (real repo + commit sync)
- Fitbit, Plaid, LeetCode mock integrations

### 🎯 Goals & Gamification
- SMART goal tracking across all three domains
- AI-powered goal velocity analysis
- XP, badges, streaks, active challenges

### 🔐 Security
- JWT authentication (stateless)
- PII stripped before AI calls
- Cloud sync with conflict resolution (Spring Boot + PostgreSQL)
- Rate limiting on transcription and AI endpoints

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Framer Motion, Recharts |
| Styling | Vanilla CSS (Glassmorphism dark UI) |
| Backend | Spring Boot 3.2, Java 23 |
| Database | PostgreSQL 15 + Hibernate JPA |
| AI | Google Gemini 2.0 Flash |
| Auth | JWT (JJWT library) |
| File Parsing | Apache PDFBox, Commons CSV |
| Voice | MediaRecorder API + backend Whisper-ready pipeline |

---

## 📁 Project Structure

```
BeyondSelf/
├── src/                    # React frontend
│   ├── pages/              # Dashboard, Health, Finance, Career, etc.
│   ├── engines/            # Deterministic intelligence engines
│   ├── services/           # AI, sync, transcription, voice parser
│   ├── context/            # AuthContext, DataContext (global state)
│   └── components/         # UI components, charts, recommendations
├── backend/                # Spring Boot backend
│   └── src/main/java/com/digitaltwin/backend/
│       ├── controller/     # REST endpoints
│       ├── service/        # Business logic
│       ├── security/       # JWT filter + config
│       └── repository/     # JPA repositories
├── setup.sh                # One-command setup script
└── README.md
```

---

## 🔧 Troubleshooting

**Port 8080 already in use:**
```bash
lsof -ti :8080 | xargs kill -9
mvn spring-boot:run
```

**PostgreSQL connection refused:**
```bash
# Mac
brew services start postgresql@15
# Ubuntu
sudo systemctl start postgresql
```

**Cannot connect to database 'digitaltwin':**
```bash
createdb -U postgres digitaltwin
```

**Gemini AI not responding:**
The app has a built-in fallback — it will use deterministic reasoning instead. To enable live AI, set `GEMINI_API_KEY`.

---

## 📄 License
MIT
