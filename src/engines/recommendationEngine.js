/**
 * Adaptive Recommendation Engine
 * 
 * Generates, ranks, and adapts personalized recommendations based on live state, 
 * anomalies, and user feedback history.
 */

export const FEEDBACK_ACTIONS = {
  ACCEPT: 'accept',
  REJECT: 'reject',
  DISMISS: 'dismiss',
  SAVE: 'save',
  NOT_RELEVANT: 'not_relevant',
  ALREADY_DOING: 'already_doing'
};

const RECOMMENDATION_LIBRARY = [
  // --- HEALTH ---
  {
    id: 'health_sleep_opt',
    domain: 'health',
    category: 'recovery',
    icon: '😴',
    title: 'Sleep Optimization',
    eval: (state) => {
      const h = state.health || {};
      const sleep = h.sleepAvg || 0;
      return {
        active: true,
        score: sleep < 6 ? 95 : sleep < 7 ? 75 : 30,
        text: sleep < 7 
          ? `Increase sleep from ${sleep}h to 7-8h. Try: wind-down routine at 10pm, no caffeine after 2pm, dim lights 1h before bed.` 
          : 'Great sleep habits! Maintain 7-8h consistently for optimal recovery.',
        risk: sleep < 6 ? 'high' : 'low'
      };
    }
  },
  {
    id: 'health_workout_plan',
    domain: 'health',
    category: 'maintenance',
    icon: '🏃',
    title: 'Workout Consistency',
    eval: (state) => {
      const h = state.health || {};
      const w = h.workoutsPerWeek || 0;
      return {
        active: true,
        score: w < 2 ? 90 : w < 3 ? 70 : 40,
        text: w < 3 
          ? `Increase from ${w} to 4 workouts/week. Start with 20-min sessions: Mon/Wed/Fri cardio, Sat strength.` 
          : `${w} workouts/week is excellent. Add variety with yoga or swimming for active recovery.`,
        risk: w < 2 ? 'high' : 'medium'
      };
    }
  },
  {
    id: 'health_stress_recovery',
    domain: 'health',
    category: 'recovery',
    icon: '🧘',
    title: 'Stress Recovery',
    eval: (state) => {
      const h = state.health || {};
      const stress = h.stressLevel || 0;
      return {
        active: stress >= 5,
        score: stress > 7 ? 95 : stress >= 6 ? 75 : 50,
        text: stress > 7 
          ? `Critical: stress at ${stress}/10. Immediate actions: 5-min breathing exercises, 15-min daily walks, disconnect from screens.` 
          : 'Stress levels are elevated. Maintain balance with regular breaks and mindfulness.',
        risk: stress > 7 ? 'high' : 'medium'
      };
    }
  },

  // --- FINANCE ---
  {
    id: 'fin_spend_opt',
    domain: 'finance',
    category: 'optimization',
    icon: '💳',
    title: 'Spending Optimization',
    eval: (state) => {
      const f = state.finance || {};
      const inc = f.income || 0;
      const exp = f.expenses || 0;
      const savingsRate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
      return {
        active: true,
        score: savingsRate < 10 ? 90 : savingsRate < 20 ? 70 : 40,
        text: savingsRate < 20 
          ? `Your savings rate is ${Math.round(savingsRate)}%. Target 20-30% by cutting ₹${Math.round(exp * 0.2)} in non-essential spending. Start with unused subscriptions.` 
          : `Great savings rate of ${Math.round(savingsRate)}%! Consider sweeping the surplus into index funds.`,
        risk: savingsRate < 10 ? 'high' : 'low'
      };
    }
  },
  {
    id: 'fin_emergency_fund',
    domain: 'finance',
    category: 'maintenance',
    icon: '🛡️',
    title: 'Emergency Fund',
    eval: (state) => {
      const f = state.finance || {};
      const sav = f.savings || 0;
      const exp = f.expenses || 1;
      const months = sav / exp;
      return {
        active: months < 4,
        score: months < 1 ? 95 : months < 3 ? 80 : 50,
        text: `Emergency fund (₹${sav}) covers only ${months.toFixed(1)} months of expenses. Build aggressively to 3-6 months.`,
        risk: months < 1 ? 'high' : 'medium'
      };
    }
  },
  {
    id: 'fin_emotional_spend',
    domain: 'finance',
    category: 'cross-domain',
    icon: '😰',
    title: 'Emotional Spending Alert',
    eval: (state) => {
      const stress = state.health?.stressLevel || 0;
      return {
        active: stress >= 7,
        score: stress >= 8 ? 95 : 85,
        text: `Your stress level (${stress}/10) correlates with impulsive spending. Implement a mandatory 24-hour wait rule for non-essential purchases over ₹500.`,
        risk: 'high'
      };
    }
  },

  // --- CAREER ---
  {
    id: 'career_skill_gap',
    domain: 'career',
    category: 'optimization',
    icon: '🧩',
    title: 'Skill Gap Analysis',
    eval: (state) => {
      const c = state.career || {};
      const skills = c.skills || [];
      return {
        active: true,
        score: skills.length < 3 ? 90 : skills.length < 5 ? 75 : 40,
        text: skills.length < 5 
          ? `You have ${skills.length} skills. Top tech companies expect 5-7+ core skills. Start learning Docker or AWS next.` 
          : 'Strong skill set! Focus on deepening expertise in 2-3 core skills via advanced projects.',
        risk: skills.length < 3 ? 'high' : 'low'
      };
    }
  },
  {
    id: 'career_dsa_strategy',
    domain: 'career',
    category: 'maintenance',
    icon: '📚',
    title: 'DSA Strategy',
    eval: (state) => {
      const c = state.career || {};
      const dsa = c.dsaPractice || 0;
      return {
        active: true,
        score: dsa < 2 ? 85 : dsa < 4 ? 65 : 30,
        text: dsa < 3 
          ? `Increase from ${dsa} to 3-5 problems/day. Focus pattern: Arrays → Strings → Trees → Graphs → DP. Use spaced repetition.` 
          : 'Excellent DSA consistency! Transition to timed mock contests to simulate interview pressure.',
        risk: dsa < 2 ? 'high' : 'low'
      };
    }
  },
  {
    id: 'career_sleep_efficiency',
    domain: 'career',
    category: 'cross-domain',
    icon: '⏰',
    title: 'Study Efficiency Drop',
    eval: (state) => {
      const sleep = state.health?.sleepAvg || 7;
      const study = state.career?.studyHoursDaily || 0;
      return {
        active: sleep < 6 && study >= 4,
        score: 90,
        text: `Low sleep (${sleep}h) severely reduces study retention. Even with ${study}h of study, effective learning is heavily degraded. Prioritize sleep over extra study hours today.`,
        risk: 'high'
      };
    }
  }
];

export function generateAdaptiveRecommendations(state, domainFilter = null) {
  const history = state.feedbackHistory || [];
  const now = Date.now();
  
  let candidates = RECOMMENDATION_LIBRARY.map(rec => {
    const result = rec.eval(state);
    
    // Default adaptation values
    let finalScore = result.score;
    let adaptationNote = null;
    let suppress = !result.active;
    
    // 1. Cross-reference Anomaly Engine
    const anomalies = state.anomalies || [];
    const relatedAnomaly = anomalies.find(a => a.affectedDomain === rec.domain || a.affectedDomain === 'cross-domain');
    if (relatedAnomaly && relatedAnomaly.severity === 'urgent') {
      finalScore += 15; // Boost if there's an urgent anomaly in the same domain
    }

    // 2. Feedback History Analysis
    const pastInteractions = history.filter(h => h.recId === rec.id);
    const recentInteractions = pastInteractions.filter(h => now - h.timestamp < 30 * 24 * 60 * 60 * 1000); // last 30 days
    
    recentInteractions.forEach(interaction => {
      if (interaction.action === FEEDBACK_ACTIONS.ALREADY_DOING) {
        suppress = true; // completely hide if already doing
      }
      else if (interaction.action === FEEDBACK_ACTIONS.NOT_RELEVANT || interaction.action === FEEDBACK_ACTIONS.DISMISS) {
        finalScore -= 30;
        adaptationNote = "Surfaced less often based on your past feedback.";
      }
      else if (interaction.action === FEEDBACK_ACTIONS.REJECT) {
        finalScore -= 50;
        adaptationNote = "Reduced priority based on past rejection.";
      }
      else if (interaction.action === FEEDBACK_ACTIONS.ACCEPT || interaction.action === FEEDBACK_ACTIONS.SAVE) {
        finalScore += 20;
        adaptationNote = "Prioritized because you accepted similar advice.";
      }
    });

    // Check category-level preferences (if they reject lots of 'maintenance', penalty it)
    const categoryInteractions = history.filter(h => h.category === rec.category && now - h.timestamp < 14 * 24 * 60 * 60 * 1000);
    const categoryRejects = categoryInteractions.filter(h => h.action === FEEDBACK_ACTIONS.REJECT || h.action === FEEDBACK_ACTIONS.DISMISS).length;
    const categoryAccepts = categoryInteractions.filter(h => h.action === FEEDBACK_ACTIONS.ACCEPT || h.action === FEEDBACK_ACTIONS.SAVE).length;
    
    if (categoryRejects > 2 && categoryAccepts === 0) {
      finalScore -= 15; // Category penalty
    } else if (categoryAccepts > 2) {
      finalScore += 10; // Category boost
      if (!adaptationNote) adaptationNote = "Matches the type of advice you usually prefer.";
    }

    return {
      id: rec.id,
      domain: rec.domain,
      category: rec.category,
      icon: rec.icon,
      title: rec.title,
      text: result.text,
      risk: result.risk,
      baseScore: result.score,
      finalScore: finalScore,
      adaptationNote: adaptationNote,
      suppress: suppress
    };
  });

  // Filter out suppressed and low score, then sort
  candidates = candidates
    .filter(c => !c.suppress && c.finalScore > 20)
    .sort((a, b) => b.finalScore - a.finalScore);

  if (domainFilter) {
    return candidates.filter(c => c.domain === domainFilter || c.domain === 'cross-domain');
  }

  return candidates;
}
