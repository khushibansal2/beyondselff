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

const API_BASE = 'http://localhost:8080/api/ai';

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
  const anomalies = context?.anomalies || [];
  const feedbackHistory = context?.feedbackHistory || [];

  const crossDomainSummary = crossDomain.length > 0
    ? crossDomain.map(cd => `- ${cd.trigger} → ${cd.effect} (${cd.mechanism})`).join('\n')
    : 'No active cross-domain cascades detected.';

  const anomaliesSummary = anomalies.length > 0
    ? anomalies.map(a => `- ${a.title} (${a.severity}): ${a.description} (Baseline: ${a.baseline}, Current: ${a.current})`).join('\n')
    : 'No unusual anomalies detected recently.';

  const alertSummary = urgentAlerts.length > 0
    ? urgentAlerts.map(a => `- ${a.text}`).join('\n')
    : 'No urgent alerts.';

  const feedbackSummary = feedbackHistory.length > 0
    ? feedbackHistory.slice(0, 5).map(f => `- User ${f.action.toUpperCase()}ED recommendation category '${f.category}'`).join('\n')
    : 'No prior recommendation feedback.';

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

RECENT USER FEEDBACK ON RECOMMENDATIONS:
${feedbackSummary}
(Use this to understand what advice the user likes/dislikes. If they ask about a recommendation, explain how it aligns with their preferences).

YOUR PERSONALITY: Use this data to give grounded, personalized, and emotionally intelligent coaching. If asked about burnout, explain which factors are causing it from the data above. If asked about finance, reference the actual finance score.`;
}

/**
 * Send a chat message to the AI Coach.
 * @param {string} message - User's message
 * @param {object} context - Computed user context (from DataContext)
 * @returns {Promise<{response: string, source: string}>}
 */
export async function chatWithAI(message, context = {}) {
  const systemPrompt = buildSystemPrompt(context);
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        context: stripPII(context),
        systemPrompt,
      }),
    });

    if (res.status === 429) {
      // Rate limited — show friendly retry message, still grounded
      return {
        response: `⏳ Gemini is rate-limited right now (free-tier quota). Here's what your data shows:\n\n${generateFallbackResponse(message, context)}\n\n_Gemini will be available again in ~1 minute._`,
        source: 'rate-limited',
      };
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn('AI chat failed, using fallback:', error.message);
    return {
      response: generateFallbackResponse(message, context),
      source: 'fallback',
      error: error.message,
    };
  }
}

/**
 * Request an AI narrative summary for a specific view.
 * @param {object} computedData - Deterministically computed scores and factors
 * @param {string} type - 'dashboard' | 'insight' | 'simulator'
 * @returns {Promise<{narrative: string, source: string}>}
 */
export async function generateNarrative(computedData, type = 'dashboard') {
  try {
    const res = await fetch(`${API_BASE}/narrative`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
// Used when Gemini is unavailable. Grounded in computed engine outputs — no invented intelligence.

// State to rotate fallback templates, initialized randomly so variety persists across reloads
let fallbackRotationCounter = Math.floor(Math.random() * 100);

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
        'recovery': 'This path leads to sustainable recovery.',
        'improving': 'This trajectory is healthy and sustainable long-term.',
        'stable': 'This path maintains your current balance without adding risk.',
        'volatile': 'This scenario shows high volatility — short-term gains but unsustainable burnout accumulation.',
        'declining': 'This path is unsustainable and leads to compounding decline.'
      };

      const intro = [
        `Looking at your ${months}-month projection, `,
        `Based on the simulator engine (${confidence}% confidence), `,
        `Projecting your current choices over ${months} months, `
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
    const factors = burnout.factors || [];
    if (risk != null) {
      let response = "";
      const alerts = [...(context.urgentAlerts || []), ...(context.anomalies || []).map(a => ({ text: `Anomaly detected: ${a.title} - ${a.description}` }))].map(u => u.text);
      if (alerts.length > 0) {
        response += `\n\nI must also alert you to the following: ${alerts[0]}`;
      }
      const intros = [
        `Your burnout risk is currently ${risk}% (${burnout.level || 'moderate'}). `,
        `I'm tracking your burnout risk at ${risk}%. `,
        `Based on your recent logs, your burnout risk sits at ${risk}% (${burnout.level || 'moderate'}). `
      ];
      const factorText = factors.length > 0
        ? `The main contributing factors your system detected are: ${factors.map(f => `${f.name} (${f.value})`).join(', ')}.`
        : '';
      return `${intros[rotationIndex]}${factorText} ${risk > 60 ? 'This is in the critical range — your data suggests reducing your total daily work hours and prioritising sleep recovery as the highest-impact changes.' : risk > 30 ? 'Moderate burnout risk detected. Small consistent improvements in sleep and exercise typically reduce this within 2–3 weeks.' : 'Your burnout risk is low. Keep maintaining your current recovery habits.'}${response}`;
    }
  }


  // ---- Sleep ----
  if (msg.includes('sleep')) {
    const sleepFactor = health?.factors?.find(f => f.name === 'Sleep Quality');
    if (sleepFactor) {
      const cascade = crossDomain.find(cd => cd.id === 'sleep-productivity');
      const cascadeText = cascade ? ` Your data also shows this is affecting your career productivity — ${cascade.effect}.` : '';
      return `Based on your logged data, your sleep averages ${sleepFactor.value}h/night (${sleepFactor.status}). ${sleepFactor.status === 'critical' ? 'This is significantly below the recommended 7-8 hours.' : 'You are close to optimal range.'}${cascadeText}`;
    }
    return 'Sleep quality directly impacts productivity, mood, and decision-making. Log your sleep data to get a personalised analysis.';
  }

  // ---- Stress ----
  if (msg.includes('stress')) {
    const stressFactor = health?.factors?.find(f => f.name === 'Stress Level');
    const spendCascade = crossDomain.find(cd => cd.id === 'stress-spending');
    if (stressFactor) {
      const spendText = spendCascade ? ` Your system also detected an emotional spending pattern linked to your stress — estimated ₹${spendCascade.computedImpact?.excessSpending?.toLocaleString()} in stress-related spending per month.` : '';
      return `Your stress level is ${stressFactor.value}/10 (${stressFactor.status}).${spendText} Exercise and consistent sleep are the highest-leverage interventions based on your current data.`;
    }
  }

  // ---- Finance / Spending / Balance ----
  if (msg.includes('spend') || msg.includes('money') || msg.includes('finance') || msg.includes('budget') || msg.includes('balance') || msg.includes('saving')) {
    const finScore = finance?.score;
    const spendCascade = crossDomain.find(cd => cd.id === 'stress-spending');
    const emotionalRisk = finance?.emotionalSpendingRisk;
    if (finScore != null) {
      const emotionalText = emotionalRisk?.level === 'high' ? ` Your system also detected high emotional spending risk (expense ratio: ${emotionalRisk.expenseRatio}%) — this may be stress-driven.` : '';
      return `Your finance score is ${finScore}/100.${emotionalText} ${finScore < 50 ? 'Your system analysis suggests reviewing your expense-to-income ratio and building an emergency fund as priority actions.' : finScore < 70 ? 'You are in a reasonable position but there is room to improve savings rate and reduce subscriptions.' : 'Strong financial discipline. Focus on growing your investment rate for long-term compounding.'}`;
    }
  }

  // ---- Recovery / Recovering ----
  if (msg.includes('recover') || msg.includes('improving') || msg.includes('getting better')) {
    const burnoutRisk = burnout?.risk;
    const urgentAlertCount = urgentAlerts.length;
    if (burnoutRisk != null) {
      return `Based on your current data, your burnout risk is ${burnoutRisk}% (${burnout.level}). ${burnoutRisk < 30 ? 'Your data shows low burnout risk — you appear to be in a healthy recovery state. Keep sustaining your current habits.' : 'Recovery typically requires 2–4 weeks of consistent sleep improvements, reduced work hours, and light exercise. Your Digital Twin will track this and update your scores as you log new data.'}`;
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
      return `Your career score is ${careerScore}/100.${placementText}${gapText} Consistent daily DSA practice and project completion have the highest impact on placement readiness.`;
    }
  }

  // ---- Overall / General ----
  if (balance != null) {
    const weakestName = context?.weakestDomain?.name;
    const weakestScore = context?.weakestDomain?.score;
    const generalIntros = [
      `Your life balance score is ${balance}/100. `,
      `Your current deterministic balance is ${balance}/100. `,
      `Overall, you're tracking at a ${balance}/100 balance score. `
    ];
    return `${generalIntros[rotationIndex]}${weakestName ? `Your weakest domain is ${weakestName} (${weakestScore}/100) — improving this would have the highest projected positive impact across all areas.` : 'Keep logging data to unlock deeper cross-domain insights.'} What specific area would you like to explore?`;
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
