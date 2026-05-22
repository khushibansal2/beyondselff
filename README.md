# BeyondSelf: Personal Digital Twin 🧠⚡️

BeyondSelf is an intelligent, cross-domain "Digital Twin" application that ingests your real-world data (Health, Finance, and Career) and deterministically models how they interact. Instead of tracking habits in isolation, BeyondSelf reveals the hidden cascades in your life—like how poor sleep impacts your emotional spending, or how financial stress degrades your career placement readiness.

---

## ✨ Core Features

### 1. Cross-Domain Intelligence Engine
The platform abandons traditional siloed tracking. It uses a custom deterministic rules engine to map cause-and-effect relationships across your life:
* **Health → Career:** Calculates how sleep debt directly degrades focus and coding efficiency.
* **Health → Finance:** Models "emotional spending risk" triggered by high stress and burnout levels.
* **Finance → Career:** Evaluates how financial runway impacts your ability to focus on long-term upskilling vs. short-term survival.

### 2. Time-Travel Simulator
An interactive projection engine that lets you simulate future lifestyle choices. 
* **Scenario Modeling:** Toggle habits like "+1.5 hours of sleep" or "+2 DSA problems/day".
* **Future Projections:** See a 3 to 12-month trajectory of your Life Balance Score, mapping out stable recoveries vs. compounding decline.
* **Burnout Trajectories:** Predicts when a "hustle" routine will mathematically force a burnout crash.

### 3. AI Digital Twin Coach (Gemini Powered)
Chat with a highly contextual AI coach grounded entirely in your deterministic data.
* **Explainability:** Ask *"Why did my balance score drop?"* and the coach will cite exact data cascades from the engine.
* **Resilient Local Mode:** If the cloud AI is rate-limited or offline, the app seamlessly falls back to a built-in deterministic reasoning layer, ensuring the coach remains intelligent and helpful without hallucinations.

### 4. Unified Dashboard & Data Ingestion
* **Document Parsing:** Upload bank statements, health logs, or academic transcripts. The backend parses and normalizes raw data into standard metrics.
* **Holistic Scoring:** Aggregates your life into three core pillars (Health, Finance, Career), which feed into a unified 0-100 Life Balance Score.

### 5. Gamification & Goal Tracking
* Turn life management into a game with XP, streaks, and unlockable badges.
* Set cross-domain goals and track your progress in real-time.

---

## 🛠️ Technology Stack

### Frontend
* **Framework:** React + Vite
* **Styling:** Tailwind CSS (Glassmorphism, Dark UI)
* **Charts:** Recharts for dynamic timeline projections
* **State Management:** Custom Context APIs (`DataContext`, `AuthContext`)

### Backend
* **Framework:** Spring Boot (Java 23)
* **Database:** H2 / PostgreSQL (Hibernate/JPA)
* **AI Integration:** Google Gemini 2.0 Flash
* **File Processing:** Apache PDFBox, Apache Commons CSV

---

## 🚀 Running the Project Locally

### Prerequisites
* **Node.js** (v18+)
* **Java** (JDK 23)
* **Maven** (v3.9+)
* Gemini API Key

### 1. Start the Backend
Navigate to the backend directory, add your API key, and start the Spring Boot server:
```bash
cd backend
# Edit src/main/resources/application.properties and insert your gemini.api.key
mvn spring-boot:run
```
*The backend will run on `http://localhost:8080`*

### 2. Start the Frontend
Open a new terminal window, navigate to the root directory, install dependencies, and start the Vite development server:
```bash
npm install
npm run dev
```
*The frontend will run on `http://localhost:5173`*

---

## 📂 Project Architecture
* `/src/engines/` - Deterministic mathematical models (Simulator, Balance, Burnout).
* `/src/services/` - External integrations (AI Coach routing, Local Fallback handlers).
* `/src/pages/` - Core UI views (Dashboard, Simulator, Coach, Gamification).
* `/backend/` - Spring Boot server handling OCR, file parsing, and API proxying.

---

*Designed to help you understand your data, predict your future, and build a sustainable life.*
