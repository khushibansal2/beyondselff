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
Before you start, make sure you have the following installed on your machine:
* **Node.js** (v18+)
* **Java** (JDK 21 or higher)
* **Maven** (v3.9+)
* **PostgreSQL** (running on port 5432)

### 1. Database Setup (PostgreSQL)
The backend requires a PostgreSQL database to store user records, goals, and sync history.

**For Mac Users (via Homebrew):**
1. Install PostgreSQL (if not already installed):
   ```bash
   brew install postgresql@14
   ```
2. Start the database service:
   ```bash
   brew services start postgresql@14
   ```
3. Open the PostgreSQL terminal interface:
   ```bash
   psql postgres
   ```
4. Create the required database (press Enter after typing):
   ```sql
   CREATE DATABASE digitaltwin;
   ```
5. Type `\q` and press Enter to exit.

*(Note: The backend defaults to using your Mac's username with no password. If your setup is different, update `DB_USERNAME` and `DB_PASSWORD` in the backend properties.)*

### 2. Backend Setup (Spring Boot)
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Set up your environment variables (or copy `.env.example` to `.env`):
   ```bash
   export GEMINI_API_KEY="your-new-gemini-api-key-here"
   export DB_USERNAME="your-postgres-username"
   ```
3. Clean and build the backend dependencies:
   ```bash
   mvn clean install
   ```
4. Start the backend server:
   ```bash
   mvn spring-boot:run
   ```
*The backend will now be running on `http://localhost:8080`.*

### 3. Frontend Setup (React/Vite)
1. Open a **new** terminal window and navigate to the main project folder:
   ```bash
   cd BeyondSelf-Complete # (or wherever you cloned the repo)
   ```
2. Install all the necessary Node modules (this will install all the AI/TensorFlow dependencies):
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm run dev
   ```
*The frontend will run on `http://localhost:5173`.*

### 4. Final Verification
* Open your browser and go to the frontend URL (`http://localhost:5173`).
* Log in or continue as a demo user.
* To test the real integrations, go to **Settings -> Integrations** and connect your GitHub or upload a CSV file to see the AI engines process real deterministic data!

---

## 📂 Project Architecture
* `/src/engines/` - Deterministic mathematical models (Simulator, Balance, Burnout).
* `/src/services/` - External integrations (AI Coach routing, Local Fallback handlers).
* `/src/pages/` - Core UI views (Dashboard, Simulator, Coach, Gamification).
* `/backend/` - Spring Boot server handling OCR, file parsing, and API proxying.

---

*Designed to help you understand your data, predict your future, and build a sustainable life.*
