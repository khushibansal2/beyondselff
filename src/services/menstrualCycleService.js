export const PHASES = {
  menstrual: {
    name: 'Menstrual', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',
    border: 'rgba(244,63,94,0.25)', emoji: '🔴', days: [1, 5],
  },
  follicular: {
    name: 'Follicular', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.25)', emoji: '🌸', days: [6, 13],
  },
  ovulation: {
    name: 'Ovulation', color: '#34d399', bg: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.25)', emoji: '✨', days: [14, 16],
  },
  luteal: {
    name: 'Luteal', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.25)', emoji: '🌙', days: [17, 28],
  },
};

export const PHASE_DIET = {
  menstrual: {
    focus: 'Iron & Anti-inflammatory',
    foods: [
      'Dark leafy greens (spinach, kale)',
      'Red meat or lentils — replenish iron',
      'Dark chocolate (magnesium)',
      'Ginger & turmeric tea',
      'Pumpkin seeds',
    ],
    avoid: ['Caffeine (worsens cramps)', 'Salty snacks (bloating)', 'Alcohol', 'Processed foods'],
    tip: 'Replenish iron lost during bleeding. Anti-inflammatory foods ease cramps and fatigue.',
    calorie_note: 'Maintain normal intake',
    workout: 'Light yoga, walking — avoid high intensity',
    supplements: ['Iron', 'Magnesium glycinate', 'Omega-3'],
    mood: 'Low energy, possible cramps — rest is productive.',
  },
  follicular: {
    focus: 'Light & Energizing',
    foods: [
      'Fermented foods (yogurt, kimchi)',
      'Flaxseeds (lignans support estrogen)',
      'Broccoli & cruciferous veggies',
      'Avocados & eggs',
      'Lean protein',
    ],
    avoid: ['Heavy fried foods', 'Excess sugar'],
    tip: 'Estrogen rises — metabolism is efficient. Great time for lighter, nutrient-dense meals.',
    calorie_note: 'Slightly lower intake is fine',
    workout: 'Cardio, HIIT, strength training — energy is building',
    supplements: ['B-complex vitamins', 'Zinc', 'Probiotics'],
    mood: 'Rising energy and motivation — lean into it.',
  },
  ovulation: {
    focus: 'Raw & Fiber-rich',
    foods: [
      'Raw fruits & veggies',
      'Cruciferous vegetables',
      'Quinoa & brown rice',
      'Salmon or sardines',
      'Flaxseeds & chia seeds',
    ],
    avoid: ['Excess red meat', 'Refined sugar', 'Processed snacks'],
    tip: 'Support estrogen metabolism with fiber. This is your peak energy window — push your workouts!',
    calorie_note: 'Normal intake',
    workout: 'Peak performance — best time for personal bests',
    supplements: ['Vitamin C', 'Zinc', 'Antioxidants (Vitamin E)'],
    mood: 'Peak confidence and social energy.',
  },
  luteal: {
    focus: 'Complex Carbs & Magnesium',
    foods: [
      'Sweet potato & oats',
      'Dark chocolate (magnesium + mood)',
      'Spinach & bananas',
      'Chickpeas & lentils',
      'Whole grain bread',
    ],
    avoid: ['Caffeine (anxiety + poor sleep)', 'Alcohol', 'High-sodium foods (bloating)', 'Refined sugar (mood swings)'],
    tip: 'Progesterone peaks — cravings and mood swings rise. Complex carbs stabilize blood sugar and boost serotonin.',
    calorie_note: '+100–200 kcal naturally — honour your hunger',
    workout: 'Moderate intensity — pilates, yoga, lighter weights',
    supplements: ['Magnesium', 'Calcium + D3', 'Vitamin B6'],
    mood: 'PMS possible in the last 5 days. Prioritise sleep and self-care.',
  },
};

/** Returns cycle day (1-based) from last period date. Returns null if not set. */
export function getCycleDay(lastPeriodDate, cycleLength = 28) {
  if (!lastPeriodDate) return null;
  const last = new Date(lastPeriodDate);
  const today = new Date();
  last.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - last) / 86400000);
  if (diff < 0) return null;
  return (diff % cycleLength) + 1;
}

/** Returns phase key: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' */
export function getPhaseKey(cycleDay) {
  if (!cycleDay) return null;
  if (cycleDay <= 5) return 'menstrual';
  if (cycleDay <= 13) return 'follicular';
  if (cycleDay <= 16) return 'ovulation';
  return 'luteal';
}

/** Days remaining until next period starts. */
export function getDaysUntilNextPeriod(lastPeriodDate, cycleLength = 28) {
  const day = getCycleDay(lastPeriodDate, cycleLength);
  if (!day) return null;
  return cycleLength - day + 1;
}

/** True when period is arriving within `threshold` days. */
export function isNearPeriod(lastPeriodDate, cycleLength = 28, threshold = 3) {
  const days = getDaysUntilNextPeriod(lastPeriodDate, cycleLength);
  return days !== null && days <= threshold;
}

/** Friendly label for days until next period. */
export function periodCountdownLabel(days) {
  if (days === null) return null;
  if (days === 1) return 'Period expected tomorrow';
  if (days <= 3) return `Period in ${days} days`;
  return `${days} days until next period`;
}
