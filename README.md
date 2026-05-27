# BeyondSelf: Personal Digital Twin 🧠⚡️

BeyondSelf is an intelligent, cross-domain **"Digital Twin"** platform that ingests your real-world data (Health, Finance, and Career) and models how they interact. Instead of tracking habits in isolation, BeyondSelf reveals the hidden cascades in your life—like how poor sleep impacts your emotional spending, or how financial stress degrades your career placement readiness.

---

## ✨ Advanced Features & Core Architecture

### 1. 🔑 Normalized 3NF Database Schema
The database architecture has been completely refactored to conform to strict **3NF (Third Normal Form)** guidelines to ensure data consistency, enforce referential integrity, and eradicate redundancy:
* **Referential Integrity:** All child records (`HealthRecord`, `FinanceRecord`, `CareerRecord`, `StudySession`, and `TransactionRecord`) use `@ManyToOne` foreign key mappings directly to the parent `User` and `ImportHistory` tables.
* **1NF Compliance:** Multi-valued comma-separated strings are eliminated. Attributes like coding languages, projects, and custom skills are refactored into dedicated element collection tables (e.g., `career_record_skills`, `career_record_languages`), mapped via database joins.

### 2. 📸 Snapchat-Style Reactive SVG Avatar (`LifeAvatar.jsx`)
Your twin is represented visually by a reactive vector avatar that morphs in real-time to reflect your cross-domain status (Thriving, Balanced, Fatigued, Overloaded, Struggling, or Burned Out):
* **Real-time Postures:** Dynamically adjusts arm positions (arms raised in triumph vs. drooping), torso slouching, eye expressions (happy, blank, tired, "X" eyes), aura glows, and room backgrounds.
* **AI Camera scanning (`CameraSnap`):** Utilizes HTML5 `getUserMedia` and canvas pixel profiling to capture a user's face. It runs real-time color distance matching against HSL color palettes to estimate skin tone, hair color, and calculates geometric face shape (slim, oval, round, square).
* **Interactive Editor:** Features an in-app slide-out panel to manually configure hair style, color, and face shape.

### 3. 💼 Career Intelligence & Live Job Markets (`Career.jsx`)
A comprehensive suite of intelligence tools designed to accelerate professional placement:
* **Resume AI Intelligence:** Upload a PDF resume. The system uses `pdfjs-dist` to parse textual layouts, extracts skills and accomplishments, and leverages backend AI to calculate **ATS score, Profile Strength, and Hirability**.
* **Personalized Roadmap:** Generates a custom multi-stage learning path pointing out skill gaps, prioritizing topics (High, Medium, Low), and linking to online training resources.
* **Live Job Search Engine:** Queries live listings across Job APIs (Arbeitnow, Remotive, Adzuna, Jooble) with India-focused filtering.
* **Smart Matching:** Computes a real-time matching score on every job card against your scanned skills and highlights missing skills.

### 4. 📈 Unified Data Ingestions & Trackers
* **Fitbit Live Sync:** Real OAuth authorization flow fetching sleep, heart-rate, and activity logs. Configurable callback URIs enable seamless production tunneling (e.g., via ngrok).
* **Secure Financial Ingestions:** Cryptographic security (`FileEncryptionService`) encrypts bank statements, transaction databases, and normalized imports before committing to disk.
* **Study & Focus Tracker:** Track learning sessions (duration, focus quality, topic) and display study frequency on a Github-style **52-week activity heatmap**.
* **Voice Logger:** Fully interactive sound logger with instant transcript mockups.

### 5. 🤖 Python-Based ML Agents Service (`ml_service`)
An independent Python sub-service containing dedicated machine learning agents:
* **Vision Agent:** Analyzes food images for scanning.
* **Portion Estimator:** Estimates food portion size.
* **Nutrition & Tracking Agents:** Computes macronutrients and logs historical records into a local SQLite database (`meals.db`).

---

## 🛠️ Unified Technology Stack

```
   ┌────────────────────────────────────────────────────────┐
   │                       FRONTEND                         │
   │        React + Vite | Tailwind CSS | Framer Motion     │
   │               Recharts | Lucide React | PDFJS          │
   └───────────┬────────────────────────────────┬───────────┘
               │                                │
               ▼ (REST API / JWT)               ▼ (REST API)
   ┌────────────────────────┐      ┌────────────────────────┐
   │     JAVA BACKEND       │      │   PYTHON ML SERVICES   │
   │ Spring Boot | JPA/JJWT │      │ FastAPI | sqlite3      │
   │ Apache PDFBox | Maven  │      │ OpenAI / Groq (Llama)  │
   └───────────┬────────────┘      └────────────────────────┘
               │
               ▼
   ┌────────────────────────┐
   │     DATABASE LAYER     │
   │ PostgreSQL / H2 (3NF)  │
   └────────────────────────┘
```

---

## 📂 Directory Layout

* `/src/components/` - Interactive widgets, sidebar, navigation, and `VoiceLogger`.
* `/src/components/ui/` - Vector `LifeAvatar`, timelines, cards, and reusable indicators.
* `/src/pages/` - Core SPA views (`Career`, `Finance`, `Health`, `Integrations`, `Dashboard`, `Simulator`, `Gamification`).
* `/src/services/` - Integrations for OAuth, career intelligence, resume extraction, study heatmaps, and recommendation feedbacks.
* `/src/context/` - Auth, Data, and Theme (`ThemeContext` for dark/light transitions) states.
* `/backend/` - Spring Boot server handling token validation (`AuthUtil`), database mappings, security encryption, and Fitbit integration.
* `/ml_service/` - Python ML microservice containing modular tracking and vision agents.

---

## 🚀 Running the Project Locally

### 1. Spring Boot Backend Setup
1. Open `backend/src/main/resources/application.properties` and add your database configuration, JWT secret, and Groq/Gemini credentials.
2. Compile and run:
   ```bash
   cd backend
   mvn clean compile
   mvn spring-boot:run
   ```
   *The backend will run on `http://localhost:8080`*

### 2. Python ML Service Setup (Optional)
1. Install Python dependencies:
   ```bash
   cd ml_service
   pip install -r requirements.txt
   ```
2. Start the FastAPI server:
   ```bash
   python main.py
   ```
   *The ML service will run on `http://localhost:8000`*

### 3. React Frontend Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
   *The UI will be accessible at `http://localhost:5173`*

---

*Designed to help you understand your data, protect your privacy, model your future, and build a sustainable life.*
