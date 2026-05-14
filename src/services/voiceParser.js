export function parseVoiceIntent(transcript) {
  const text = transcript.toLowerCase();
  const intent = { action: 'unknown', domain: null, data: {}, confirm: true, message: '' };

  // 1. Finance Log
  if (text.includes('expense') || text.includes('spent') || text.includes('bought') || text.includes('cost') || text.includes('add expense')) {
    const amtMatch = text.match(/\b(\d+)\b/);
    if (amtMatch) {
      intent.action = 'log';
      intent.domain = 'finance';
      // In Finance, we expect the frontend to pass the delta (amount) so the domain reducer handles it?
      // Actually, wait: DataContext UPDATE_DOMAIN does { ...state[domain], ...data }. So we need to compute expenses!
      // But we don't have current state here. The VoiceController will merge it.
      intent.data = { __delta_expense: parseInt(amtMatch[1]) };
      intent.message = `Log ₹${amtMatch[1]} expense?`;
      return intent;
    }
  }

  // 2. Health Log
  if (text.includes('sleep') || text.includes('stress') || text.includes('workout') || text.includes('water')) {
    let msg = [];
    
    // Support "7 hours sleep" or "sleep 7"
    const sleepMatch = text.match(/(\d+(?:\.\d+)?)\s*hours?(?:\s*of)?\s*sleep/) || text.match(/sleep(?:\s*for)?\s*(\d+(?:\.\d+)?)/);
    if (sleepMatch) {
      intent.data.sleepAvg = parseFloat(sleepMatch[1]);
      msg.push(`${intent.data.sleepAvg}h sleep`);
    }

    // Support "stress 4" or "stress level 4"
    const stressMatch = text.match(/stress(?:\s*level)?\s*(?:of\s*)?(\d+)/) || text.match(/(\d+)\s*stress/);
    if (stressMatch) {
      intent.data.stressLevel = parseInt(stressMatch[1]);
      msg.push(`stress ${intent.data.stressLevel}/10`);
    }

    if (Object.keys(intent.data).length > 0) {
      intent.action = 'log';
      intent.domain = 'health';
      intent.message = `Log ${msg.join(' and ')}?`;
      return intent;
    }
  }

  // 3. Career Log
  if (text.includes('studied') || text.includes('study') || text.includes('coded') || text.includes('coding')) {
    const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*hours?/);
    if (hoursMatch) {
      intent.action = 'log';
      intent.domain = 'career';
      intent.data.studyHoursDaily = parseFloat(hoursMatch[1]);
      intent.message = `Log ${hoursMatch[1]}h of study?`;
      return intent;
    }
  }

  // 4. Coach Question
  if (text.includes('why') || text.includes('how') || text.includes('what') || text.includes('coach') || text.includes('explain') || text.includes('can you')) {
    intent.action = 'coach';
    intent.message = transcript;
    intent.confirm = false; // direct routing
    return intent;
  }

  return intent;
}
