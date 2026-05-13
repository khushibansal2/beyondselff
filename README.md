# 🧬 Personal Digital Twin

> **An emotionally intelligent AI life operating system.**

Personal Digital Twin helps users optimize health, finances, and career growth **together — not separately**.

Unlike traditional apps that track isolated metrics, our platform understands the hidden relationships between:
- 😴 Sleep & productivity
- 😰 Stress & emotional spending
- 💪 Fitness & learning consistency
- 💰 Financial discipline & career growth

By combining **cross-domain intelligence**, **future-life simulation**, **burnout prediction**, and **personalized AI coaching**, the system helps users make sustainable life decisions — before problems become irreversible.

> Instead of promoting hustle culture, Personal Digital Twin promotes **balanced, sustainable success powered by AI.**

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Spring Boot 3 + Java 21 |
| Database | PostgreSQL 16 |
| AI Integration | Google Gemini API (via Backend Proxy) |
| OCR | Tesseract.js |
| Voice | Web Speech API |
| Styling | TailwindCSS v4 + Vanilla CSS |
| Animations | Framer Motion |
| Charts | Recharts |

---

## 🧠 Core Modules

| Module | Description |
|---|---|
| **Dashboard** | AI Digital Twin Summary with cross-domain urgency alerts |
| **Health** | Sleep, stress, mood, burnout prediction engine |
| **Finance** | Budget analysis, AI OCR receipt scanning, emotional spending detection |
| **Career** | Skill tracking, placement readiness, DSA progress |
| **AI Coach** | Contextual voice-enabled AI life advice with cross-domain memory |
| **Simulator** | What-If deterministic life scenario simulator |
| **Insights** | Explainable AI-generated cross-domain patterns with source traceability |
| **Goals** | SMART goals with AI-suggested milestones |
| **Rewards** | Gamified streaks, challenges, XP, badges derived from single-source-of-truth |
| **Data Import** | CSV/PDF upload + API connections |
| **Settings** | Privacy controls, security dashboard |

---

## 🎭 Demo Accounts

| Persona | Email | Password |
|---|---|---|
| Stressed Student | arjun@demo.com | demo123 |
| Fitness Learner | priya@demo.com | demo123 |
| Overspender | rahul@demo.com | demo123 |
| Burnout Risk | sneha@demo.com | demo123 |
| Placement Coder | karthik@demo.com | demo123 |

---

## ▶️ How to Run Locally

Since this is a full-stack application, you need to run both the Spring Boot Backend and the React Frontend.

### 1. Database Setup
1. Ensure **PostgreSQL** is running on your machine.
2. Create a database named `digitaltwin`.
3. Update `backend/src/main/resources/application.properties` with your PostgreSQL username and password if they differ from the defaults (`postgres`/`postgres`).

### 2. Start the Backend (Spring Boot + Gemini Proxy)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Set your Gemini API key as an environment variable (or hardcode it for local testing in `GeminiService.java`):
   ```bash
   export GEMINI_API_KEY="your_api_key_here"
   ```
3. Run the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```
   *(The backend will start on `http://localhost:8080`)*

### 3. Start the Frontend (React + Vite)
1. Open a new terminal and navigate to the project root:
   ```bash
   cd "new wise"
   ```
2. Install dependencies (including Tesseract.js for OCR):
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *(The frontend will start on `http://localhost:5174`)*

---

*Built for Hackathon 2026 — Wise Hackathon*
