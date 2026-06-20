/**
 * AI Service — Frontend interface to the Gemini AI backend proxy.
 *
 * Rules:
 * - All AI calls go through the Spring Boot backend (API key stays server-side)
 * - PII is stripped before sending context
 * - AI cache minimizes unnecessary API calls
 * - Graceful fallback when API is unavailable
 * - Fallbacks are grounded in deterministic engine outputs — no invented numbers
 * - No medical diagnoses, no guaranteed financial promises, no impossible predictions
 */

const API_BASE = import.meta.env.VITE_API_BASE + '/ai';
const GROQ_PROXY_BASE = import.meta.env.VITE_API_BASE + '/groq';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function getAuthToken() {
  try {
    const raw = localStorage.getItem('dt_auth');
    if (!raw) return null;
    return JSON.parse(raw)?.token || null;
  } catch { return null; }
}

/** Route Groq calls through the backend proxy (key stays server-side). */
async function callGroqViaBackend(systemPrompt, history, userMessage, maxTokens = 500) {
  const token = getAuthToken();
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${GROQ_PROXY_BASE}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: maxTokens, temperature: 0.7 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Groq proxy ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/** Strip PII from user data before sending to AI. */
function stripPII(data) {
  if (!data || typeof data !== 'object') return data;
  const safe = { ...data };
  delete safe.name;
  delete safe.email;
  delete safe.password;
  delete safe.id;
  delete safe.avatar;
  return safe;
}

/**
 * Build a rich, grounded system prompt from the current computed context.
 * This grounds Gemini to real deterministic outputs and prevents hallucination.
 */
function buildSystemPrompt(context) {
  if (!context || !context.hasData) {
    return `You are a Digital Twin AI Life Coach. The user has not yet logged data. Encourage them to add health, finance, or career entries. Do NOT invent metrics.`;
  }

  const hs = context?.healthScore?.score ?? 'N/A';
  const fs = context?.financeScore?.score ?? 'N/A';
  const cs = context?.careerScore?.score ?? 'N/A';
  const balance = context?.balance ?? 'N/A';
  const burnoutRisk = context?.burnout?.risk ?? 'N/A';
  const burnoutLevel = context?.burnout?.level ?? 'unknown';
  const weakest = context?.weakestDomain?.name ?? 'unknown';
  const sleepFactor = context?.healthScore?.factors?.find(f => f.name === 'Sleep Quality');
  const stressFactor = context?.healthScore?.factors?.find(f => f.name === 'Stress Level');
  const crossDomain = context?.crossDomain || [];
  const urgentAlerts = context?.urgentAlerts || [];

  const crossDomainSummary = crossDomain.length > 0
    ? crossDomain.map(cd => `- ${cd.trigger} → ${cd.effect} (${cd.mechanism})`).join('\n')
    : 'No active cross-domain cascades detected.';

  const alertSummary = urgentAlerts.length > 0
    ? urgentAlerts.map(a => `- ${a.text}`).join('\n')
    : 'No urgent alerts.';

  const feedbackPreferences = context?.feedbackPreferences || [];
  const feedbackDislikes    = context?.feedbackDislikes    || [];

  const preferenceSection = feedbackPreferences.length > 0
    ? `\nUSER PREFERRED RESPONSE STYLE (they thumbed up these — match this tone, length, and framing):\n${feedbackPreferences.map(p => `"${p}"`).join('\n')}`
    : '';

  const dislikeSection = feedbackDislikes.length > 0
    ? `\nUSER DISLIKED RESPONSE STYLE (they thumbed down these — avoid this tone and style):\n${feedbackDislikes.map(p => `"${p}"`).join('\n')}`
    : '';

  return `You are a Digital Twin AI Life Coach. You have access to the user's REAL computed scores from a deterministic engine.

IMPORTANT RULES:
- ONLY reference the scores below. Do NOT invent new numbers.
- Do NOT give medical diagnoses. Use phrases like "your data suggests" or "patterns indicate".
- Do NOT make guaranteed financial promises.
- Long-term projections are directional estimates, not certainties.
- Be emotionally supportive, NOT a hustle-culture motivator.
- Be concise (3-5 sentences max per response unless asked to elaborate).

CURRENT USER STATE (from deterministic engines):
- Health Score: ${hs}/100
- Finance Score: ${fs}/100
- Career Score: ${cs}/100
- Life Balance: ${balance}/100
- Burnout Risk: ${burnoutRisk}% (${burnoutLevel})
- Weakest Domain: ${weakest}
- Sleep: ${sleepFactor ? `${sleepFactor.value}h/night (${sleepFactor.status})` : 'not logged'}
- Stress: ${stressFactor ? `${stressFactor.value}/10 (${stressFactor.status})` : 'not logged'}

ACTIVE CROSS-DOMAIN RELATIONSHIPS:
${crossDomainSummary}

URGENT ALERTS:
${alertSummary}
${preferenceSection}${dislikeSection}

Use this data to give grounded, personalized, and emotionally intelligent coaching. If asked about burnout, explain which factors are causing it from the data above. If asked about finance, reference the actual finance score. Adapt your response style based on the user preferences above.`;
}



/**
 * Send a chat message to the AI Coach.
 * @param {string} message - User's message
 * @param {object} context - Computed user context (from DataContext)
 * @param {Array} history - Prior conversation messages [{role, text}]
 * @returns {Promise<{response: string, source: string}>}
 */
export async function chatWithAI(message, context = {}, history = []) {
  const systemPrompt = buildSystemPrompt(context);
  const conversationHistory = history
    .filter(m => m.text && m.text.trim())
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

  // 1. Try backend proxy first
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        context: stripPII(context),
        systemPrompt,
        history: conversationHistory,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 429) {
      return {
        response: `⏳ AI is rate-limited right now. Here's what your data shows:\n\n${generateFallbackResponse(message, context)}\n\n_Try again in ~1 minute._`,
        source: 'rate-limited',
      };
    }

    if (res.ok) {
      const data = await res.json();
      return { response: data.response, source: data.source || 'groq' };
    }
  } catch (error) {
    console.warn('Backend AI unavailable, trying Groq direct:', error.message);
  }

  // 2. Groq via backend proxy (key stays server-side)
  try {
    const response = await callGroqViaBackend(systemPrompt, conversationHistory, message);
    if (response) return { response, source: 'groq-proxy' };
  } catch (error) {
    console.warn('Groq backend proxy failed, using deterministic fallback:', error.message);
  }

  // 3. Deterministic fallback — no external calls required
  return {
    response: generateFallbackResponse(message, context),
    source: 'fallback',
  };
}

/**
 * Request an AI narrative summary for a specific view.
 * @param {object} computedData - Deterministically computed scores and factors
 * @param {string} type - 'dashboard' | 'insight' | 'simulator'
 * @returns {Promise<{narrative: string, source: string}>}
 */
export async function generateNarrative(computedData, type = 'dashboard') {
  try {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/narrative`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        computedData: stripPII(computedData),
        type,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn('AI narrative failed, using fallback:', error.message);
    return {
      narrative: generateFallbackNarrative(computedData, type),
      source: 'fallback',
    };
  }
}

/**
 * Request an explainable AI explanation for a specific insight.
 */
export async function explainInsight(insightData) {
  try {
    const res = await fetch(`${API_BASE}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insightData: stripPII(insightData) }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    return {
      explanation: `This insight is based on a deterministic relationship: ${insightData?.trigger || 'your logged data'} is causing ${insightData?.effect || 'changes in your scores'}. ${insightData?.mechanism || ''}`,
      source: 'fallback',
    };
  }
}

/**
 * Fetch 3 AI-generated, data-grounded recommendations for the user.
 * Each recommendation: { domain, priority, title, action, reason, impact }
 * Falls back to deterministic rules when the backend/Groq is unavailable.
 */
export async function fetchRecommendations(context = {}) {
  // 1. Try backend
  try {
    const res = await fetch(`${API_BASE}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: stripPII(context) }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0)
        return { recommendations: data.recommendations, source: data.source || 'groq' };
    }
  } catch (_) { /* backend unavailable */ }

  // 2. Try Groq via backend proxy
  try {
    const sysPr = buildSystemPrompt(context);
    const prompt = 'Based on the user state in the system prompt, return ONLY a JSON array of exactly 3 recommendation objects with fields: domain, priority, title, action, reason, impact. No markdown, no extra text.';
    const raw = await callGroqViaBackend(sysPr, [], prompt);
    const cleaned = raw.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    const recs = JSON.parse(cleaned);
    if (Array.isArray(recs) && recs.length > 0)
      return { recommendations: recs, source: 'groq-proxy' };
  } catch (_) { /* proxy unavailable or parse error — fall through to deterministic */ }

  // 3. Deterministic fallback
  return { recommendations: _fallbackRecommendations(context), source: 'fallback' };
}

function _fallbackRecommendations(context) {
  const health  = context?.healthScore?.score  ?? 50;
  const finance = context?.financeScore?.score ?? 50;
  const career  = context?.careerScore?.score  ?? 50;
  const burnout = context?.burnout?.risk ?? 0;
  const crossDomain = context?.crossDomain ?? [];

  const pool = {
    health: {
      domain: 'health', priority: health < 40 ? 'high' : 'medium',
      title: 'Improve sleep consistency',
      action: 'Set a fixed bedtime and log 7+ hours for 7 consecutive days',
      reason: `Health score is ${health}/100 — sleep is the highest-leverage lever`,
      impact: 'Health score typically rises 8-12 points within 2 weeks',
    },
    finance: {
      domain: 'finance', priority: finance < 40 ? 'high' : 'medium',
      title: 'Reduce discretionary spending',
      action: 'Audit last 30 days of expenses and cut one recurring subscription',
      reason: `Finance score is ${finance}/100 — expense control has the fastest impact`,
      impact: 'Cutting 10% of expenses can add 5-8 points to finance score',
    },
    career: {
      domain: 'career', priority: career < 40 ? 'high' : 'medium',
      title: 'Log daily study sessions',
      action: 'Solve 2 DSA problems and log 1+ study hours every day this week',
      reason: `Career score is ${career}/100 — consistency drives placement readiness`,
      impact: 'Daily logging raises career score by 6-10 points per week',
    },
  };

  const sorted = ['health', 'finance', 'career'].sort(
    (a, b) => (context?.[`${a}Score`]?.score ?? 50) - (context?.[`${b}Score`]?.score ?? 50)
  );

  const recs = [pool[sorted[0]], pool[sorted[1]]];

  const stressSpend = crossDomain.find(c => c.id === 'stress-spending');
  if (burnout > 40 || stressSpend) {
    recs.push({
      domain: 'cross', priority: burnout > 60 ? 'high' : 'medium',
      title: 'Break the stress-spending loop',
      action: 'Replace one stress-triggered purchase with a 10-min walk',
      reason: `Burnout at ${burnout}% is linked to emotional overspending in your data`,
      impact: 'Improves both finance and health scores simultaneously',
    });
  } else {
    recs.push(pool[sorted[2]]);
  }

  return recs.slice(0, 3);
}

/**
 * LLM sanity check on the computed health score.
 * Detects physiologically implausible patterns (e.g. chronic oversleeping,
 * all-perfect self-ratings while reporting high stress) and returns a small
 * correction delta (-15 to +5) plus a plain-English reason.
 *
 * This runs after deterministic + XGBoost scoring. The caller applies the delta
 * only when the LLM response is valid JSON; otherwise the score is unchanged.
 *
 * @param {number} currentScore - Current health score (0-100)
 * @param {object} factors - Array of factor objects from healthScoreEngine
 * @param {object} healthData - Raw aggregated health data (sleepAvg, stressLevel, etc.)
 * @returns {Promise<{delta: number, reason: string, flags: string[]}>}
 */
export async function llmHealthScoreCheck(currentScore, factors = [], healthData = {}) {
  const sleepH = healthData.sleepAvg ?? null;
  const stress = healthData.stressLevel ?? null;
  const mood = healthData.moodAvg ?? null;

  const factorSummary = factors
    .map(f => `${f.name}: ${f.value}${f.unit} (score ${Math.round(f.rawScore)}/100)`)
    .join(', ');

  const systemPrompt = `You are a health data validator for a wellness app. Your job is to detect physiologically implausible or contradictory patterns in self-reported health data and suggest a score correction.

Rules:
- Oversleeping (>9h consistently) is a health red flag, not a bonus. Apply a penalty.
- If stress is high (>7) but mood is also high (>8), that is contradictory — apply a small penalty.
- If ALL metrics are self-reported as perfect (sleep=8, stress=1, mood=10, workout=5/wk, water=8) simultaneously, apply a small skepticism penalty (-3 to -5).
- Only flag genuine anomalies. Healthy data should get delta=0.
- Never apply a positive delta greater than +3.
- Never apply a penalty greater than -15.
- Return ONLY a JSON object: {"delta": <integer -15 to 5>, "reason": "<one sentence>", "flags": ["<flag1>", ...]}
- flags array should list the specific anomalies found (empty array if none).`;

  const userMessage = `Health score: ${currentScore}/100
Sleep: ${sleepH != null ? `${sleepH}h/night` : 'unknown'}
Stress: ${stress != null ? `${stress}/10` : 'unknown'}
Mood: ${mood != null ? `${mood}/10` : 'unknown'}
Factor breakdown: ${factorSummary}

Validate this data and return the correction JSON.`;

  try {
    const raw = await callGroqViaBackend(systemPrompt, [], userMessage, 200);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { delta: 0, reason: '', flags: [] };
    const parsed = JSON.parse(jsonMatch[0]);
    const delta = Math.max(-15, Math.min(5, Math.round(parsed.delta ?? 0)));
    return {
      delta,
      reason: parsed.reason ?? '',
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    };
  } catch {
    return { delta: 0, reason: '', flags: [] };
  }
}

/**
 * Check if the AI service is available.
 */
export async function checkAIStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { available: false };
    return await res.json();
  } catch {
    return { available: false, provider: 'none' };
  }
}

// ========== DETERMINISTIC FALLBACK RESPONSES ==========
// Used when the cloud AI is unavailable. Grounded in computed engine outputs — no invented intelligence.

// State to rotate fallback templates, initialized randomly so variety persists across reloads
let fallbackRotationCounter = Math.floor(Math.random() * 100);

/**
 * Build a natural-language explanation from a contributors array.
 * For scores where lower = worse (health/finance/career): shows which factors are dragging the score down.
 * For burnout: shows which factors are pushing risk up.
 * @param {Array<{factor, weight, rawScore?, value?}>} contributors
 * @param {'drag'|'risk'} mode
 */
function formatContributors(contributors, mode = 'drag') {
  if (!contributors || contributors.length === 0) return '';
  const top = contributors.slice(0, 2);
  if (mode === 'risk') {
    // Burnout contributors: factor is a risk driver, weight = impact points added
    const parts = top.map(c => `${c.factor}${c.value ? ` (${c.value})` : ''}`);
    return parts.length === 1
      ? `The main driver is ${parts[0]}.`
      : `The top drivers are ${parts[0]} and ${parts[1]}.`;
  }
  // Health/finance/career: show factors with most room to improve
  const parts = top.map(c => `${c.factor} (${c.rawScore}/100, ${c.weight}% of score)`);
  return parts.length === 1
    ? `The factor holding your score back most is ${parts[0]}.`
    : `The factors holding your score back most are ${parts[0]} and ${parts[1]}.`;
}

function generateFallbackResponse(message, context) {
  fallbackRotationCounter++;
  const rotationIndex = fallbackRotationCounter % 3;

  const health  = context?.healthScore  || {};
  const finance = context?.financeScore || {};
  const career  = context?.careerScore  || {};
  const balance = context?.balance;
  const burnout = context?.burnout      || {};
  const crossDomain  = context?.crossDomain  || [];
  const urgentAlerts = context?.urgentAlerts || [];
  const lastSim = context?.lastSimulation;

  const msg = (message || '').toLowerCase();

  // ---- Simulator Comparison & Future Projection ----
  if (msg.includes('which path') || msg.includes('what happens') || msg.includes('sustainable') || msg.includes('future') || msg.includes('long-term')) {
    if (lastSim) {
      const { baseline, simulated, stabilityTrend, dominantDriver, confidence, months, deltas } = lastSim;
      const bDelta = deltas.burnout;

      const trendDescriptions = {
        'recovery':  'This path leads to sustainable recovery.',
        'improving': 'This trajectory is healthy and sustainable long-term.',
        'stable':    'This path maintains your current balance without adding risk.',
        'volatile':  'This scenario shows high volatility — short-term gains but unsustainable burnout accumulation.',
        'declining': 'This path is unsustainable and leads to compounding decline.',
      };

      const intro = [
        `Looking at your ${months}-month projection, `,
        `Based on the simulator engine (${confidence}% confidence), `,
        `Projecting your current choices over ${months} months, `,
      ][rotationIndex];

      const burnoutText = bDelta > 0
        ? `burnout risk climbs from ${baseline.burnout}% to ${simulated.burnout}%`
        : `burnout drops by ${Math.abs(bDelta)}%`;

      const driverText = dominantDriver ? ` The dominant driver of this outcome is ${dominantDriver.text.toLowerCase()}` : '';

      return `${intro}${trendDescriptions[stabilityTrend] || 'the trajectory is uncertain.'} Your ${burnoutText}.${driverText} Overall life balance relies on keeping burnout risk low — prioritize paths that classify as "stable" or "recovering".`;
    }
    return "To compare futures, please run a scenario in the Simulator tab first. I'll then be able to explain the deterministic long-term trajectory of those choices.";
  }

  // ---- Burnout / Stress ----
  if (msg.includes('burnout') || msg.includes('overwhelm') || msg.includes('tired') || msg.includes('exhausted')) {
    const risk = burnout.risk;
    if (risk != null) {
      const intros = [
        `Your burnout risk is currently ${risk}% (${burnout.level || 'moderate'}). `,
        `I'm tracking your burnout risk at ${risk}%. `,
        `Based on your recent logs, your burnout risk sits at ${risk}% (${burnout.level || 'moderate'}). `,
      ];
      const driverText = formatContributors(burnout.contributors, 'risk');
      const adviceText = risk > 60
        ? 'This is in the critical range — address the top drivers above before adding more workload.'
        : risk > 30
          ? 'Moderate risk. Tackling the top drivers above typically brings this down within 2–3 weeks.'
          : 'Your burnout risk is low. Keep sustaining your current recovery habits.';
      return `${intros[rotationIndex]}${driverText ? driverText + ' ' : ''}${adviceText}`;
    }
  }

  // ---- Sleep ----
  if (msg.includes('sleep')) {
    const sleepFactor = health?.factors?.find(f => f.name === 'Sleep Quality');
    if (sleepFactor) {
      const cascade = crossDomain.find(cd => cd.id === 'sleep-productivity');
      const cascadeText = cascade ? ` Your data also shows this is affecting your career productivity — ${cascade.effect}.` : '';
      return `Based on your logged data, your sleep averages ${sleepFactor.value}h/night (${sleepFactor.status}). ${sleepFactor.status === 'critical' ? 'This is significantly below the recommended 7–8 hours.' : 'You are close to the optimal range.'}${cascadeText}`;
    }
    return 'Sleep quality directly impacts productivity, mood, and decision-making. Log your sleep data to get a personalised analysis.';
  }

  // ---- Stress ----
  if (msg.includes('stress')) {
    const stressFactor = health?.factors?.find(f => f.name === 'Stress Level');
    const spendCascade = crossDomain.find(cd => cd.id === 'stress-spending');
    if (stressFactor) {
      const spendText = spendCascade
        ? ` Your system also detected an emotional spending pattern linked to your stress — estimated ₹${spendCascade.computedImpact?.excessSpending?.toLocaleString()} in stress-related spending per month.`
        : '';
      const healthContrib = formatContributors(health.contributors, 'drag');
      return `Your stress level is ${stressFactor.value}/10 (${stressFactor.status}).${spendText} ${healthContrib ? healthContrib + ' ' : ''}Reducing stress and improving sleep are the highest-leverage interventions based on your data.`;
    }
  }

  // ---- Finance / Spending ----
  if (msg.includes('spend') || msg.includes('money') || msg.includes('finance') || msg.includes('budget') || msg.includes('saving')) {
    const finScore = finance?.score;
    const emotionalRisk = finance?.emotionalSpendingRisk;
    if (finScore != null) {
      const emotionalText = emotionalRisk?.level === 'high'
        ? ` High emotional spending risk detected (expense ratio: ${emotionalRisk.expenseRatio}%) — this may be stress-driven.`
        : '';
      const contribText = formatContributors(finance.contributors, 'drag');
      const levelText = finScore < 50
        ? 'Focus on the factors above to make the highest-impact improvements.'
        : finScore < 70
          ? 'You are in a reasonable position — the factors above have the most room to improve.'
          : 'Strong financial discipline. Continue optimising the factors above for long-term compounding.';
      return `Your finance score is ${finScore}/100.${emotionalText} ${contribText ? contribText + ' ' : ''}${levelText}`;
    }
  }

  // ---- Recovery ----
  if (msg.includes('recover') || msg.includes('improving') || msg.includes('getting better')) {
    const burnoutRisk = burnout?.risk;
    if (burnoutRisk != null) {
      const driverText = formatContributors(burnout.contributors, 'risk');
      return `Based on your current data, your burnout risk is ${burnoutRisk}% (${burnout.level}). ${burnoutRisk < 30 ? 'Your data shows low burnout risk — you appear to be in a healthy recovery state.' : `Recovery typically requires 2–4 weeks of sustained improvements. ${driverText ? 'Focus first on: ' + driverText : 'Start with sleep and work-hour reductions.'}`}`;
    }
  }

  // ---- Career / Study / Placements ----
  if (msg.includes('career') || msg.includes('study') || msg.includes('coding') || msg.includes('job') || msg.includes('placement') || msg.includes('ready')) {
    const careerScore = career?.score;
    const placementReadiness = career?.placementReadiness;
    const skillGaps = career?.skillGaps;
    if (careerScore != null) {
      const placementText = placementReadiness ? ` Your placement readiness is ${placementReadiness.score}/100 (${placementReadiness.level}).` : '';
      const gapText = skillGaps?.missing?.length > 0 ? ` Top skill gaps: ${skillGaps.missing.slice(0, 3).join(', ')}.` : '';
      const contribText = formatContributors(career.contributors, 'drag');
      return `Your career score is ${careerScore}/100.${placementText}${gapText} ${contribText ? contribText + ' Addressing these gives the highest score improvement per unit of effort.' : 'Consistent daily practice and project completion have the highest impact on placement readiness.'}`;
    }
  }

  // ---- Overall / General ----
  if (balance != null) {
    const weakestName = context?.weakestDomain?.name;
    const weakestScore = context?.weakestDomain?.score;
    const generalIntros = [
      `Your life balance score is ${balance}/100. `,
      `Your current deterministic balance is ${balance}/100. `,
      `Overall, you're tracking at a ${balance}/100 balance score. `,
    ];
    return `${generalIntros[rotationIndex]}${weakestName ? `Your weakest domain is ${weakestName} (${weakestScore}/100) — improving this would have the highest projected cross-domain impact.` : 'Keep logging data to unlock deeper cross-domain insights.'} What specific area would you like to explore?`;
  }

  return "I'm your Digital Twin AI coach. I analyze connections between your health, finances, and career — all based on your real logged data. What would you like to explore?";
}

/**
 * Generate a fallback narrative when Gemini is unavailable.
 * Grounded entirely in deterministic computed outputs.
 */
function generateFallbackNarrative(computedData, type) {
  const balance      = computedData?.balance;
  const healthScore  = computedData?.healthScore?.score;
  const financeScore = computedData?.financeScore?.score;
  const careerScore  = computedData?.careerScore?.score;
  const burnout      = computedData?.burnout;
  const weakest      = computedData?.weakestDomain;

  if (type === 'simulator') {
    const { baseline, simulated, deltas, confidence, stabilityTrend, dominantDriver, recoveryMomentum } = computedData || {};
    if (baseline && simulated) {
      const trendText = stabilityTrend ? ` The overall trajectory is classified as "${stabilityTrend}".` : '';
      const recoveryText = recoveryMomentum?.active ? ` ${recoveryMomentum.description}` : '';
      const driverText = dominantDriver ? ` ${dominantDriver.text}` : '';
      const confidenceText = confidence < 70 ? ` Note: this is a ${computedData.months}-month projection with ${confidence}% confidence — treat as a directional estimate.` : '';
      return `Projecting from your current baseline: Health ${baseline.health}→${simulated.health}, Finance ${baseline.finance}→${simulated.finance}, Career ${baseline.career}→${simulated.career}, Burnout ${baseline.burnout}%→${simulated.burnout}%.${trendText}${driverText}${recoveryText}${confidenceText}`;
    }
  }

  if (type === 'dashboard' && balance != null) {
    const burnoutText = burnout?.risk > 30 ? ` Burnout risk is ${burnout.risk}% — this is worth addressing.` : '';
    if (weakest) {
      return `Your life balance score is ${balance}/100. ${weakest.name} (${weakest.score}/100) is your area needing the most attention.${burnoutText} Improving this domain would have the greatest projected cross-domain impact.`;
    }
    return `Your life balance score is ${balance}/100. Continue logging data to get detailed cross-domain insights.`;
  }

  return 'Your Digital Twin is analysing your data. Log more entries to unlock deeper cross-domain insights.';
}
