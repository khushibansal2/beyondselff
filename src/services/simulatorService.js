// AI Life Simulator Service — powered by Groq (llama-3.3-70b-versatile)
// Uses the same VITE_GROQ_API_KEY / localStorage groq_api_key as visionService

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';

function getApiKey() {
  return import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
}

// ── Baseline Scoring ──────────────────────────────────────────────────────────

export function computeBaselineScores(health = {}, finance = {}, career = {}) {
  // Health (0-100): sleep quality, stress, mood, activity
  const sleepScore  = Math.min(100, Math.round(((health.sleepAvg  ?? 6) / 8) * 100));
  const stressScore = Math.round((10 - (health.stressLevel ?? 6)) * 10);
  const moodScore   = Math.round((health.moodAvg ?? 5) * 10);
  const fitScore    = Math.min(100, Math.round(((health.workoutsPerWeek ?? 2) / 5) * 100));
  const healthScore = Math.max(0, Math.min(100, Math.round((sleepScore + stressScore + moodScore + fitScore) / 4)));

  // Finance (0-100): savings rate, debt load, investment activity
  const monthlyIncome = ((finance.income ?? 0) / 12) || 1;
  const savingsRatio  = Math.min(100, Math.round(((finance.savings ?? 0) / monthlyIncome) * 30));
  const debtLoad      = Math.max(0, 100 - Math.round(((finance.debt ?? 0) / monthlyIncome) * 5));
  const investBonus   = (finance.investments ?? 0) > 0 ? 15 : 0;
  const expenseRatio  = Math.min(100, Math.round(((finance.expenses ?? 0) / monthlyIncome) * 100));
  const expensePenalty = expenseRatio > 80 ? -10 : expenseRatio > 60 ? -5 : 0;
  const financeScore  = Math.max(0, Math.min(100, Math.round(savingsRatio * 0.45 + debtLoad * 0.4 + investBonus + expensePenalty)));

  // Career (0-100): study intensity, skill breadth, project output
  const studyScore   = Math.min(100, Math.round(((career.studyHoursDaily ?? 2) / 6) * 100));
  const skillScore   = Math.min(100, Math.round(((career.skills ?? []).length) * 8));
  const projectScore = Math.min(100, Math.round(((career.projectsCompleted ?? 0)) * 8));
  const careerScore  = Math.max(0, Math.min(100, Math.round(studyScore * 0.4 + skillScore * 0.35 + projectScore * 0.25)));

  // Wellbeing: composite
  const wellbeingScore = Math.round(healthScore * 0.4 + financeScore * 0.3 + careerScore * 0.3);

  return { health: healthScore, finance: financeScore, career: careerScore, wellbeing: wellbeingScore };
}

// ── Prompt Builder ────────────────────────────────────────────────────────────

function buildPrompt(scenarioText, health = {}, finance = {}, career = {}, baseline) {
  const fmt = (n) => (n ?? 0).toLocaleString('en-IN');

  const profile = `CURRENT USER METRICS:
Health  — Sleep: ${health.sleepAvg ?? '?'}h/night | Stress: ${health.stressLevel ?? '?'}/10 | Mood: ${health.moodAvg ?? '?'}/10 | Workouts: ${health.workoutsPerWeek ?? 0}/week | BMI: ${health.bmi ?? '?'} | Calories: ${health.calories ?? '?'} kcal | Water: ${health.waterIntake ?? '?'} glasses
Finance — Income: ₹${fmt(finance.income)}/yr | Expenses: ₹${fmt(finance.expenses)}/mo | Savings: ₹${fmt(finance.savings)} | Investments: ₹${fmt(finance.investments)} | Debt: ₹${fmt(finance.debt)} | Subscriptions: ₹${fmt(finance.subscriptions)}/mo
Career  — Study: ${career.studyHoursDaily ?? 0}h/day | Coding: ${career.codingHoursDaily ?? 0}h/day | DSA: ${career.dsaPractice ?? 0}h/day | Skills: [${(career.skills ?? []).join(', ') || 'none listed'}] | Projects: ${career.projectsCompleted ?? 0} | Courses: ${career.coursesActive ?? 0} active | GPA: ${career.gpa ?? 'N/A'}
Current Scores — Health: ${baseline.health}/100 | Finance: ${baseline.finance}/100 | Career: ${baseline.career}/100 | Wellbeing: ${baseline.wellbeing}/100`;

  return `You are a Life Simulation AI that acts as a digital twin engine. You analyze real life decisions and predict their realistic cross-domain effects on a person's health, finances, career, and overall wellbeing.

${profile}

SCENARIO: "${scenarioText}"

Your job:
1. Deeply interpret what this scenario means given the user's actual current state
2. Identify every domain affected, including secondary chain effects
3. Reason through the causal chain step by step
4. Project realistic outcomes at 6 time horizons
5. Quantify score changes (0-100 per domain) from the baseline scores above — be realistic, not dramatic
6. Surface trade-offs, risks, and specific actionable steps

Critical rules:
- Reference the user's ACTUAL numbers when reasoning (e.g., "With ₹${fmt(finance.savings)} in savings, a job loss means...")
- Be specific — avoid vague platitudes. Give real estimates.
- Confidence should reflect genuine uncertainty (40–90 range; use low scores for life-changing or highly variable decisions)
- projected scores must differ meaningfully from baseline but stay within plausible bounds

Respond with ONLY a valid JSON object. No markdown fences. No extra text. Just JSON:
{
  "scenarioTitle": "concise 5-8 word title",
  "interpretation": "what you understood this scenario to mean and what assumptions you're making",
  "scenarioType": "health|finance|career|lifestyle|mixed",
  "confidence": <integer 40-90>,
  "reasoning": [
    {"step": 1, "title": "string", "detail": "2-3 sentence explanation referencing user's actual data"},
    {"step": 2, "title": "string", "detail": "..."},
    {"step": 3, "title": "string", "detail": "..."},
    {"step": 4, "title": "string", "detail": "..."}
  ],
  "impacts": [
    {"domain": "health|finance|career|wellbeing", "metric": "specific metric name", "direction": "positive|negative|neutral", "magnitude": "low|medium|high|critical", "detail": "specific explanation with numbers"},
    ... (4-7 impacts covering multiple domains)
  ],
  "timeline": [
    {"period": "1 month",  "label": "Immediate",     "events": ["specific event 1", "specific event 2"]},
    {"period": "3 months", "label": "Short-term",    "events": ["specific event 1", "specific event 2"]},
    {"period": "6 months", "label": "Mid-term",      "events": ["specific event 1", "specific event 2"]},
    {"period": "1 year",   "label": "Annual Review", "events": ["specific event 1", "specific event 2"]},
    {"period": "2 years",  "label": "Compounding",   "events": ["specific event 1", "specific event 2"]},
    {"period": "5 years",  "label": "Long Vision",   "events": ["specific event 1", "specific event 2"]}
  ],
  "scoreTimeline": [
    {"period": "Now",      "label": "Baseline",   "health": ${baseline.health}, "finance": ${baseline.finance}, "career": ${baseline.career}, "wellbeing": ${baseline.wellbeing}},
    {"period": "1 month",  "label": "1M",  "health": <int>, "finance": <int>, "career": <int>, "wellbeing": <int>},
    {"period": "3 months", "label": "3M",  "health": <int>, "finance": <int>, "career": <int>, "wellbeing": <int>},
    {"period": "6 months", "label": "6M",  "health": <int>, "finance": <int>, "career": <int>, "wellbeing": <int>},
    {"period": "1 year",   "label": "1Y",  "health": <int>, "finance": <int>, "career": <int>, "wellbeing": <int>},
    {"period": "2 years",  "label": "2Y",  "health": <int>, "finance": <int>, "career": <int>, "wellbeing": <int>},
    {"period": "5 years",  "label": "5Y",  "health": <int>, "finance": <int>, "career": <int>, "wellbeing": <int>}
  ],
  "scores": {
    "baseline":  {"health": ${baseline.health}, "finance": ${baseline.finance}, "career": ${baseline.career}, "wellbeing": ${baseline.wellbeing}},
    "projected": {"health": <integer>, "finance": <integer>, "career": <integer>, "wellbeing": <integer>}
  },
  "tradeoffs": {
    "pros": ["specific advantage 1", "specific advantage 2", "specific advantage 3"],
    "cons": ["specific risk 1", "specific risk 2", "specific risk 3"]
  },
  "warnings": ["critical warning if any — empty array if none"],
  "recommendations": ["specific step 1", "specific step 2", "specific step 3", "specific step 4"],
  "summary": "One precise sentence predicting the most likely net outcome for this specific user"
}`;
}

// ── API Call ──────────────────────────────────────────────────────────────────

export async function runAISimulation(scenarioText, { health, finance, career } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_KEY');

  const baseline = computeBaselineScores(health, finance, career);
  const prompt   = buildPrompt(scenarioText, health, finance, career, baseline);

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2500,
      temperature: 0.35,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[SimulatorService] HTTP error:', res.status, errText.slice(0, 300));
    throw new Error(`${res.status}::${errText}`);
  }

  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Empty response from Groq');

  // Strip any markdown fences and extract JSON object
  let text  = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
  const s   = text.indexOf('{');
  const e   = text.lastIndexOf('}');
  if (s !== -1 && e > s) text = text.slice(s, e + 1);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`JSON parse failed. Raw: ${raw.slice(0, 300)}`);
  }
}
