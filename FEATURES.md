# BeyondSelf: Comprehensive Features & Integration Documentation

This document outlines all the major features, architectures, and external integrations built into the **BeyondSelf** (Personal Digital Twin) platform.

---

## 1. 🧠 Core Engines & Deterministic Math
At the heart of the platform are offline, deterministic logic engines. Instead of relying solely on LLMs (which can hallucinate), the app uses strict math models.

* **Health Score Engine:** Calculates scores based on sleep quality, stress levels, and workout frequency.
* **Finance Score Engine:** Analyzes bank balance, monthly savings, and spending habits to create a 0-100 financial health score.
* **Career Score Engine:** Evaluates DSA progress, study hours, and project completions.
* **Life Balance Engine:** Aggregates the three domain scores into an overall Life Balance Score.
* **Cross-Domain Cascade Engine:** Detects chained events. For example, if sleep is < 6 hours and stress is > 7, it triggers a "High Burnout Risk" which then automatically deducts points from the Career/Placement Readiness score and increases "Emotional Spending Risk" in Finance.

## 2. 🔮 The Simulator (Time-Travel Engine)
A tool to visualize the long-term impact of today's habits.

* **Interactive Scenario Toggles:** Add habits like "+1.5 hours of sleep" or "Cut expenses by ₹2000".
* **Timeline Projection Chart:** Uses `Recharts` to draw a 3 to 12-month trajectory line showing exactly how Health, Finance, Career, and Burnout will trend over time.
* **State Persistence:** The simulator saves your active projections in the global state, meaning if you navigate away to another tab and come back, your simulation timeline and charts are fully preserved without blinking or resetting.

## 3. 🤖 AI Digital Twin Coach (Google Gemini Integration)
A conversational AI assistant that acts as your personalized life coach.

* **Contextual Grounding:** The Coach is fed your exact deterministic scores, simulator projections, and cross-domain cascades so its advice is strictly based on your actual data.
* **Intelligent Future Comparisons:** If you ask the coach *"Which path is healthier long-term?"*, it automatically reads your latest simulation cache, quotes the confidence level, identifies the dominant driver of your future, and explains why a path is sustainable or volatile.
* **Rotational Fallback Architecture:** If the Google Gemini API is offline, rate-limited (HTTP 429), or unreachable, the system automatically falls back to a **Local AI Mode**. This local mode uses a robust rotational template system to provide varied, mathematically accurate explanations without ever looking "broken".

## 4. 📄 Data Ingestion & OCR Processing
The platform is designed to take unstructured real-world data and convert it into metrics.

* **Upload Interface:** A dedicated upload dashboard for PDFs (Bank statements, health reports, transcripts) and CSV files.
* **Backend OCR:** The Spring Boot backend utilizes Apache PDFBox and Apache Commons CSV to parse uploaded documents securely.
* **Normalization Layers:** Custom backend normalizers translate raw parsed text into structured `HealthRecord`, `FinanceRecord`, and `CareerRecord` database entities.

## 5. 🎮 Gamification & Goal Tracking
Designed to keep users motivated and engaged.

* **XP & Leveling System:** Logging positive data or improving your Life Balance Score earns XP.
* **Dynamic Streaks:** Tracks consecutive days of positive data logging.
* **Goal Setting:** Users can set actionable, cross-domain goals (e.g., "Hit 80% Placement Readiness" or "Reduce Emotional Spending").

## 6. 💾 Architecture & Persistence
A robust, modern tech stack designed for scalability.

* **Global DataContext (React):** A centralized state management system that handles UI state, caches AI responses, and manages the Simulator timeline to prevent unnecessary re-renders.
* **Backend Proxy:** The React frontend never talks to Gemini directly. Instead, it securely routes requests through the Spring Boot `AIProxyController`, keeping your API keys safe and allowing the backend to handle rate-limit errors gracefully.
* **Database (H2/PostgreSQL):** The backend uses Spring Data JPA / Hibernate to persist uploaded records, user history, and parsed data.
* **Automated Migrations:** The frontend features a schema migration adapter (`storageAdapter`) that ensures local storage structures upgrade seamlessly without breaking the user experience.
