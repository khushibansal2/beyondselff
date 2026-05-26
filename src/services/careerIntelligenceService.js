/**
 * Career Intelligence Service
 *
 * - Job Match Engine    : score user skills vs. job requirements
 * - Salary Benchmarks   : Indian tech market salary table + skill premiums
 * - Market Insights     : demand signals across role levels
 * - AI Career Coach     : Groq-powered personalized roadmap generation
 */

import { canonicalSkill, extractSkillsFromText } from './jobService';

// ── Salary benchmark table (Indian tech market, 2025) ─────────────────────────

const SALARY_TABLE = {
  intern:         { min: 2,   max: 6,   label: '₹2–6 LPA',     monthly: '₹15k–50k/mo'  },
  junior:         { min: 5,   max: 12,  label: '₹5–12 LPA',    monthly: '₹40k–1L/mo'   },
  sde1:           { min: 8,   max: 18,  label: '₹8–18 LPA',    monthly: '₹65k–1.5L/mo' },
  sde2:           { min: 15,  max: 30,  label: '₹15–30 LPA',   monthly: '₹1.2L–2.5L/mo'},
  senior:         { min: 25,  max: 50,  label: '₹25–50 LPA',   monthly: '₹2L–4.2L/mo'  },
  lead:           { min: 35,  max: 70,  label: '₹35–70 LPA',   monthly: '₹3L–5.8L/mo'  },
  principal:      { min: 50,  max: 100, label: '₹50–100 LPA',  monthly: '₹4.2L–8.3L/mo'},
  em:             { min: 40,  max: 80,  label: '₹40–80 LPA',   monthly: '₹3.3L–6.7L/mo'},
  aiml:           { min: 12,  max: 28,  label: '₹12–28 LPA',   monthly: '₹1L–2.3L/mo'  },
  data_scientist: { min: 10,  max: 22,  label: '₹10–22 LPA',   monthly: '₹85k–1.8L/mo' },
  devops:         { min: 10,  max: 28,  label: '₹10–28 LPA',   monthly: '₹85k–2.3L/mo' },
  fullstack:      { min: 10,  max: 30,  label: '₹10–30 LPA',   monthly: '₹85k–2.5L/mo' },
  frontend:       { min: 7,   max: 22,  label: '₹7–22 LPA',    monthly: '₹60k–1.8L/mo' },
  backend:        { min: 8,   max: 25,  label: '₹8–25 LPA',    monthly: '₹65k–2L/mo'   },
  mobile:         { min: 8,   max: 24,  label: '₹8–24 LPA',    monthly: '₹65k–2L/mo'   },
};

// High-demand skills that command a salary premium
const PREMIUM_SKILLS = [
  'AWS', 'Kubernetes', 'Go', 'Rust', 'Machine Learning', 'Deep Learning',
  'System Design', 'TypeScript', 'React', 'Next.js', 'Kafka', 'Spark',
  'Terraform', 'MLOps', 'LangChain', 'Microservices',
];

// ── Role level detection ──────────────────────────────────────────────────────

export function detectRoleLevel(title = '') {
  const t = title.toLowerCase();
  if (t.includes('intern'))                           return 'intern';
  if (t.includes('junior') || t.includes('associate')) return 'junior';
  if (t.includes('principal') || t.includes('staff')) return 'principal';
  if (t.includes('senior') || t.includes('sr.') || t.includes('sr ')) return 'senior';
  if (t.includes('lead') || t.includes('architect'))  return 'lead';
  if (t.includes('manager') || t.includes(' em ') || t.includes('engineering manager')) return 'em';
  if (t.includes('ai ') || t.includes('ml ') || t.includes('machine learning')) return 'aiml';
  if (t.includes('data scientist'))                   return 'data_scientist';
  if (t.includes('devops') || t.includes('sre') || t.includes('platform engineer')) return 'devops';
  if (t.includes('full stack') || t.includes('fullstack')) return 'fullstack';
  if (t.includes('frontend') || t.includes('front-end') || t.includes('ui engineer')) return 'frontend';
  if (t.includes('backend') || t.includes('back-end'))    return 'backend';
  if (t.includes('mobile') || t.includes('android') || t.includes('ios')) return 'mobile';
  if (t.includes('sde') || t.includes('swe') || t.includes('software engineer')) return 'sde1';
  return 'sde1';
}

// ── Skill normalization ───────────────────────────────────────────────────────

function normKey(s) {
  return (s || '').toLowerCase().replace(/[.\s\-_.]/g, '');
}

// ── Job Match Engine ──────────────────────────────────────────────────────────

/**
 * Score how well a user's skills match a specific job.
 * Returns: { score 0-100, matched[], missing[], strengths[], level }
 */
export function calculateJobMatch(userSkills = [], job) {
  const jobSkills = [
    ...new Set([
      ...(job.requiredSkills || []),
      ...(job.tags || []),
      ...extractSkillsFromText(job.description || ''),
    ].map(canonicalSkill).filter(Boolean)),
  ];

  if (!jobSkills.length) {
    // No skill data — estimate from title keywords
    return { score: 50, matched: [], missing: [], strengths: userSkills.slice(0, 4), level: detectRoleLevel(job.title) };
  }

  const userNorms = userSkills.map(s => ({ orig: s, key: normKey(s) }));

  const matched  = [];
  const missing  = [];

  for (const js of jobSkills) {
    const jKey = normKey(js);
    const hit  = userNorms.find(u =>
      u.key === jKey ||
      u.key.includes(jKey) ||
      jKey.includes(u.key)
    );
    if (hit) matched.push(js);
    else     missing.push(js);
  }

  const score = Math.round((matched.length / jobSkills.length) * 100);

  // Top strengths = user skills that appear in many job postings (high demand)
  const strengths = userSkills
    .filter(s => PREMIUM_SKILLS.some(p => normKey(p) === normKey(s)))
    .slice(0, 4);

  return {
    score:    Math.min(100, score),
    matched:  matched.slice(0, 10),
    missing:  missing.slice(0, 8),
    strengths,
    level:    detectRoleLevel(job.title),
  };
}

/**
 * Batch-match multiple jobs, sort by score descending.
 */
export function rankJobsByMatch(userSkills = [], jobs = []) {
  return jobs
    .map(job => ({ ...job, match: calculateJobMatch(userSkills, job) }))
    .sort((a, b) => b.match.score - a.match.score);
}

// ── Aggregate missing skills across all jobs ──────────────────────────────────

/**
 * Count how many job listings require each missing skill.
 * Returns [{skill, count, priority}] sorted by count desc.
 */
export function aggregateMissingSkills(userSkills = [], jobs = []) {
  const counter = {};
  for (const job of jobs) {
    const { missing } = calculateJobMatch(userSkills, job);
    for (const s of missing) {
      const key = normKey(s);
      counter[key] = { skill: s, count: (counter[key]?.count || 0) + 1 };
    }
  }
  return Object.values(counter)
    .sort((a, b) => b.count - a.count)
    .map(({ skill, count }) => ({
      skill,
      count,
      pct: Math.round((count / Math.max(jobs.length, 1)) * 100),
      priority: count >= jobs.length * 0.6 ? 'critical' : count >= jobs.length * 0.3 ? 'high' : 'medium',
    }))
    .slice(0, 12);
}

// ── Salary Benchmarking ───────────────────────────────────────────────────────

/**
 * Estimate salary range for a role + skill set.
 * Applies a premium multiplier for high-demand skills.
 */
export function getSalaryBenchmark(roleTitle = '', skills = []) {
  const level = detectRoleLevel(roleTitle);
  const base  = SALARY_TABLE[level] || SALARY_TABLE.sde1;

  const premiumCount = skills.filter(s =>
    PREMIUM_SKILLS.some(p => normKey(p) === normKey(s))
  ).length;
  const multiplier = 1 + Math.min(0.35, premiumCount * 0.06);

  return {
    level,
    min:        base.min,
    max:        Math.round(base.max * multiplier),
    mid:        Math.round((base.min + base.max * multiplier) / 2),
    label:      `₹${base.min}–${Math.round(base.max * multiplier)} LPA`,
    monthly:    base.monthly,
    currency:   'INR',
    premiumSkills: skills.filter(s => PREMIUM_SKILLS.some(p => normKey(p) === normKey(s))),
  };
}

/**
 * Full salary chart data for the salary analytics view.
 * Each entry has { role, min, max, mid } for Recharts BarChart.
 */
export function getSalaryChartData() {
  return [
    { role: 'Intern',        min: 2,  max: 6,   mid: 4  },
    { role: 'Junior SDE',    min: 5,  max: 12,  mid: 8  },
    { role: 'SDE I',         min: 8,  max: 18,  mid: 13 },
    { role: 'SDE II',        min: 15, max: 30,  mid: 22 },
    { role: 'Senior',        min: 25, max: 50,  mid: 37 },
    { role: 'Tech Lead',     min: 35, max: 70,  mid: 52 },
    { role: 'AI/ML Eng',     min: 12, max: 28,  mid: 20 },
    { role: 'DevOps',        min: 10, max: 28,  mid: 19 },
    { role: 'Full Stack',    min: 10, max: 30,  mid: 20 },
    { role: 'Eng Manager',   min: 40, max: 80,  mid: 60 },
  ];
}

// ── AI Career Coach (Groq) ────────────────────────────────────────────────────

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function groqKey() {
  return import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
}

/**
 * Generate a full AI career coaching report.
 * Input: { skills[], targetRole, missingSkills[], matchScore, salaryRange, studyHours, sleepAvg }
 * Output: structured JSON with roadmap, projects, interview tips, weekly plan.
 */
export async function generateCareerCoach({
  skills = [], targetRole = 'Software Engineer',
  missingSkills = [], matchScore = 0,
  salaryRange = '', studyHours = 0, sleepAvg = 7,
}) {
  const key = groqKey();
  if (!key) throw new Error('NO_KEY');

  const prompt = `You are an AI Career Coach for a Personal Digital Twin platform. Provide a concise, data-grounded career analysis.

USER PROFILE:
- Skills: ${skills.slice(0, 15).join(', ') || 'None specified'}
- Target Role: ${targetRole}
- Market Match Score: ${matchScore}%
- Missing Skills (by market demand): ${missingSkills.slice(0, 8).join(', ') || 'None'}
- Estimated Salary Range: ${salaryRange || 'Unknown'}
- Daily Study Hours: ${studyHours}h
- Avg Sleep: ${sleepAvg}h/night

Return ONLY valid JSON (no markdown fences). Use exactly this schema:
{
  "readinessScore": <integer 0-100>,
  "verdict": "<one sentence honest assessment>",
  "topSkillsToLearn": [
    { "skill": "<name>", "reason": "<why it matters for this role>", "resource": "<specific course or platform>", "weeks": <integer> }
  ],
  "portfolioProjects": [
    { "title": "<project name>", "impact": "<what this signals to employers>", "stack": ["<tech>"] }
  ],
  "interviewTips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "weeklyPlan": [
    { "days": "Mon–Tue", "focus": "<topic>", "task": "<concrete action>" },
    { "days": "Wed–Thu", "focus": "<topic>", "task": "<concrete action>" },
    { "days": "Fri–Sun", "focus": "<topic>", "task": "<concrete action>" }
  ],
  "salaryTip": "<one tactical salary negotiation insight>",
  "digitalTwinInsight": "<cross-domain insight connecting sleep/health/study to career performance>"
}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22000);
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.35,
        max_tokens: 1600,
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    let raw = data.choices?.[0]?.message?.content ?? '';
    // strip markdown fences if any
    raw = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s !== -1 && e > s) raw = raw.slice(s, e + 1);
    return JSON.parse(raw);
  } finally {
    clearTimeout(timer);
  }
}

// ── Cross-domain Digital Twin insights ───────────────────────────────────────

/**
 * Generate deterministic cross-domain insights (no AI needed).
 * Connects health/finance signals to career performance.
 */
export function getDigitalTwinInsights({ sleepAvg, stressLevel, financeScore, studyHoursDaily }) {
  const insights = [];

  if (sleepAvg != null && sleepAvg < 6) {
    const retention = Math.round((sleepAvg / 8) * 100);
    insights.push({
      type: 'warning',
      icon: '😴',
      domain: 'Health → Career',
      text: `${sleepAvg}h average sleep reduces memory consolidation by ~${100 - retention}%. Your ${studyHoursDaily}h of study yields only ~${Math.round(studyHoursDaily * sleepAvg / 8)}h of effective retention.`,
    });
  }

  if (stressLevel != null && stressLevel >= 7) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      domain: 'Health → Career',
      text: `High stress (${stressLevel}/10) impairs problem-solving and interview performance. Consider scheduling lighter study days this week.`,
    });
  }

  if (financeScore != null && financeScore < 50) {
    insights.push({
      type: 'info',
      icon: '💸',
      domain: 'Finance → Career',
      text: `Low financial runway can increase urgency pressure during job searches. Building a 3-month emergency fund reduces negotiation anxiety.`,
    });
  }

  if (studyHoursDaily != null && studyHoursDaily >= 4 && (sleepAvg ?? 8) >= 7) {
    insights.push({
      type: 'positive',
      icon: '🚀',
      domain: 'Health + Career',
      text: `Good sleep + ${studyHoursDaily}h study is an optimal combination. Your brain is in a high-retention window — ideal for complex DSA or system design topics.`,
    });
  }

  if (!insights.length) {
    insights.push({
      type: 'info',
      icon: '🔗',
      domain: 'Digital Twin',
      text: 'Log health and study data to unlock cross-domain career intelligence insights.',
    });
  }

  return insights;
}
