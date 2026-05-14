export function parseVoiceIntent(transcript) {
  if (!transcript || typeof transcript !== 'string') return { action: 'unknown', domain: null, data: {}, confirm: true, message: '' };
  
  const text = transcript.toLowerCase().trim();
  const intent = { action: 'unknown', domain: null, data: {}, confirm: true, message: '' };

  // 1. Health Log (check BEFORE finance because "cost" appears in health context too)
  if (text.includes('sleep') || text.includes('stress') || text.includes('workout') || text.includes('water') || text.includes('mood')) {
    let msg = [];
    
    // Sleep: "7 hours sleep", "sleep 7", "slept for 7 hours", "log 7 hours of sleep"
    const sleepMatch = text.match(/(\d+(?:\.\d+)?)\s*hours?(?:\s*of)?\s*sleep/) ||
                       text.match(/sleep(?:ing|t)?(?:\s*for)?\s*(\d+(?:\.\d+)?)/) ||
                       text.match(/log\s*(\d+(?:\.\d+)?)\s*hours?\s*(?:of\s*)?sleep/);
    if (sleepMatch) {
      intent.data.sleepAvg = parseFloat(sleepMatch[1]);
      msg.push(`${intent.data.sleepAvg}h sleep`);
    }

    // Stress: "stress 4", "stress level 4", "4 stress"
    const stressMatch = text.match(/stress(?:\s*level)?\s*(?:of\s*)?(\d+)/) ||
                        text.match(/(\d+)\s*stress/);
    if (stressMatch) {
      const val = parseInt(stressMatch[1]);
      if (val >= 0 && val <= 10) {
        intent.data.stressLevel = val;
        msg.push(`stress ${val}/10`);
      }
    }

    // Workout: "2 workouts", "worked out 3 times", "workout 4"
    const workoutMatch = text.match(/(\d+)\s*workouts?/) ||
                         text.match(/worked?\s*out\s*(\d+)/);
    if (workoutMatch) {
      intent.data.workoutsPerWeek = parseInt(workoutMatch[1]);
      msg.push(`${intent.data.workoutsPerWeek} workouts`);
    }

    // Water: "8 glasses water", "drank 6 glasses"
    const waterMatch = text.match(/(\d+)\s*glasses?(?:\s*(?:of\s*)?water)?/) ||
                       text.match(/water\s*(\d+)/);
    if (waterMatch) {
      intent.data.waterIntake = parseInt(waterMatch[1]);
      msg.push(`${intent.data.waterIntake} glasses water`);
    }

    if (Object.keys(intent.data).length > 0) {
      intent.action = 'log';
      intent.domain = 'health';
      intent.message = `Log ${msg.join(' and ')}?`;
      return intent;
    }
  }

  // 2. Finance Log — explicit financial keywords only
  const financeKeywords = ['expense', 'spent', 'bought', 'cost', 'add expense', 'log expense', 'spent on', 'paid'];
  if (financeKeywords.some(kw => text.includes(kw))) {
    // Extract the first numeric value
    const amtMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (amtMatch) {
      const amount = parseInt(amtMatch[1].replace(/,/g, ''));
      if (amount > 0) {
        intent.action = 'log';
        intent.domain = 'finance';
        intent.data = { __delta_expense: amount };
        intent.message = `Add ₹${amount.toLocaleString()} to your expenses?`;
        return intent;
      }
    }
  }

  // 3. Career Log
  if (text.includes('studied') || text.includes('study') || text.includes('coded') || text.includes('coding') || text.includes('dsa') || text.includes('practised') || text.includes('practiced')) {
    const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*hours?/);
    if (hoursMatch) {
      intent.action = 'log';
      intent.domain = 'career';
      intent.data.studyHoursDaily = parseFloat(hoursMatch[1]);
      intent.message = `Log ${hoursMatch[1]}h of study?`;
      return intent;
    }
    // DSA problems: "solved 5 dsa"
    const dsaMatch = text.match(/(\d+)\s*(?:dsa|problems?|questions?|leetcode)/);
    if (dsaMatch) {
      intent.action = 'log';
      intent.domain = 'career';
      intent.data.dsaPractice = parseInt(dsaMatch[1]);
      intent.message = `Log ${dsaMatch[1]} DSA problems?`;
      return intent;
    }
  }

  // 4. Coach Question — broad question words and personal pronouns
  const questionWords = ['why', 'how', 'what', 'which', 'when', 'coach', 'explain', 'tell me', 'am i', 'is my', 'should i', 'can you', 'help me'];
  if (questionWords.some(w => text.includes(w))) {
    intent.action = 'coach';
    intent.message = transcript;
    intent.confirm = false;
    return intent;
  }

  return intent;
}
