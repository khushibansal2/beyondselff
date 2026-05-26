const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 9000; // abort if Groq takes longer than 9 s

// Compact prompt — shorter = faster response
const SYSTEM = `Parse voice commands for a life-tracking app. Return ONLY a single JSON object, no markdown.

Schema: {"domain":"finance|health|career|unknown","action":"expense|income|meal|workout|sleep|mood|water|study|other","entities":{"amount":null,"merchant":null,"category":null,"transactionType":null,"calories":null,"durationMinutes":null,"sleepHours":null,"mood":null,"stressLevel":null,"waterIntake":null,"topic":null,"studyHours":null},"confidence":0.0,"humanReadable":"","xpReward":10}

Rules:
- amounts: "50k"=50000, "50 thousand"=50000
- merchants→category: swiggy/zomato=Food, uber/ola=Transport, amazon/flipkart=Shopping, netflix/spotify=Entertainment, airtel/jio/electricity=Bills, bigbasket/blinkit/zepto=Groceries, pharmacy/doctor=Health, coursera/udemy=Education
- transactionType: expense→debit, income→credit
- xpReward: expense=10,income=15,meal=10,workout=25,sleep=15,study=20,mood=5,water=5
- confidence: 0.0-1.0

Examples (only the JSON, nothing else):
"spent 450 on swiggy" → {"domain":"finance","action":"expense","entities":{"amount":450,"merchant":"Swiggy","category":"Food","transactionType":"debit","calories":null,"durationMinutes":null,"sleepHours":null,"mood":null,"stressLevel":null,"waterIntake":null,"topic":null,"studyHours":null},"confidence":0.97,"humanReadable":"₹450 at Swiggy (Food)","xpReward":10}
"worked out 45 minutes" → {"domain":"health","action":"workout","entities":{"amount":null,"merchant":null,"category":null,"transactionType":null,"calories":null,"durationMinutes":45,"sleepHours":null,"mood":null,"stressLevel":null,"waterIntake":null,"topic":null,"studyHours":null},"confidence":0.95,"humanReadable":"45-min workout","xpReward":25}`;

async function extractWithGroq(text) {
  if (!GROQ_KEY) throw new Error('NO_KEY');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user',   content: text.trim() },
        ],
        temperature: 0,
        max_tokens: 250,
      }),
      signal: controller.signal,
    });

    if (res.status === 429) throw new Error('RATE_LIMITED');
    if (!res.ok)           throw new Error(`HTTP_${res.status}`);

    const data = await res.json();
    const raw  = data.choices?.[0]?.message?.content ?? '';

    // Strip markdown fences if model wraps in ```json ... ```
    const jsonStr = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const match   = jsonStr.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('NO_JSON');

    return JSON.parse(match[0]);
  } finally {
    clearTimeout(timer);
  }
}

// ── Regex fallback (runs offline / when Groq fails) ────────────────────────
const MERCHANT_CAT = {
  swiggy:'Food', zomato:'Food', dominos:'Food', kfc:'Food', mcdonald:'Food', starbucks:'Food',
  uber:'Transport', ola:'Transport', rapido:'Transport',
  amazon:'Shopping', flipkart:'Shopping', myntra:'Shopping',
  netflix:'Entertainment', spotify:'Entertainment', hotstar:'Entertainment',
  airtel:'Bills', jio:'Bills', electricity:'Bills',
  bigbasket:'Groceries', blinkit:'Groceries', zepto:'Groceries',
  pharmacy:'Health', doctor:'Health', apollo:'Health',
  coursera:'Education', udemy:'Education', byju:'Education',
  groww:'Investments', zerodha:'Investments',
};

function catFromText(t) {
  const low = t.toLowerCase();
  for (const [k,v] of Object.entries(MERCHANT_CAT)) if (low.includes(k)) return v;
  return 'Others';
}

function parseAmt(n, suffix = '') {
  let v = parseFloat(String(n).replace(/,/g,''));
  if (/k$/i.test(suffix) || /thousand/i.test(suffix)) v *= 1000;
  if (/lakh|lac/i.test(suffix)) v *= 100000;
  return v;
}

function regexFallback(text) {
  let m;

  // expense
  m = text.match(/(?:spent|paid|spend|bought|pay)\s+(?:rs\.?|₹|rupees?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|lakh)?\s*(?:on|for|at|to)?\s*(.*)/i);
  if (m) {
    const amount = parseAmt(m[1], m[2]);
    const rest   = (m[3] || '').trim();
    const cat    = catFromText(rest);
    return { domain:'finance', action:'expense', entities:{ amount, merchant: rest || 'Unknown', category: cat, transactionType:'debit' }, confidence:0.78, humanReadable:`₹${amount.toLocaleString()} at ${rest || 'merchant'}`, xpReward:10 };
  }

  // income
  m = text.match(/(?:received|earned|got|salary|income|credited)\s+(?:of\s+)?(?:rs\.?|₹|rupees?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|lakh)?/i);
  if (m) {
    const amount = parseAmt(m[1], m[2]);
    return { domain:'finance', action:'income', entities:{ amount, category:'Salary', transactionType:'credit' }, confidence:0.82, humanReadable:`₹${amount.toLocaleString()} income`, xpReward:15 };
  }

  // workout
  m = text.match(/(?:worked\s*out|exercised|gym|ran|jog|walk|yoga|swim|cycling|training|workout)\s+(?:for\s+)?(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
  if (m) {
    let mins = parseInt(m[1]);
    if (/hours?|hrs?/i.test(m[2])) mins *= 60;
    return { domain:'health', action:'workout', entities:{ durationMinutes: mins }, confidence:0.87, humanReadable:`${mins}-min workout`, xpReward:25 };
  }

  // calories
  m = text.match(/(?:ate|eaten|consumed|had)\s+(\d+)\s*(?:calories?|cal)/i)
   || text.match(/(\d+)\s*(?:calories?|cal)\s/i);
  if (m) return { domain:'health', action:'meal', entities:{ calories: parseInt(m[1]) }, confidence:0.85, humanReadable:`${m[1]} calories`, xpReward:10 };

  // sleep
  m = text.match(/(?:slept|sleep)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  if (m) return { domain:'health', action:'sleep', entities:{ sleepHours: parseFloat(m[1]) }, confidence:0.90, humanReadable:`${m[1]}h sleep`, xpReward:15 };

  // mood
  m = text.match(/(?:mood|feeling)\s+(?:is\s+)?(\d+)/i);
  if (m) return { domain:'health', action:'mood', entities:{ mood: Math.min(10,Math.max(1,parseInt(m[1]))) }, confidence:0.80, humanReadable:`Mood ${m[1]}/10`, xpReward:5 };

  // water
  m = text.match(/(?:drank|had|consumed)\s+(\d+)\s*(?:glasses?|bottles?|litres?|liters?)/i);
  if (m) return { domain:'health', action:'water', entities:{ waterIntake: parseInt(m[1]) }, confidence:0.85, humanReadable:`${m[1]} glasses water`, xpReward:5 };

  // study
  m = text.match(/(?:studied|studying|study|learned|learning)\s+(.*?)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)/i)
   || text.match(/(?:studied|studying)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)/i);
  if (m) {
    const topic = m.length === 4 ? m[1].trim() : 'General';
    const num   = parseFloat(m[m.length === 4 ? 2 : 1]);
    const unit  = m[m.length === 4 ? 3 : 2];
    const hours = /min/i.test(unit) ? num/60 : num;
    const mins  = Math.round(hours*60);
    return { domain:'career', action:'study', entities:{ topic, studyHours: parseFloat(hours.toFixed(2)), durationMinutes: mins }, confidence:0.83, humanReadable:`${mins}min ${topic} study`, xpReward:20 };
  }

  return null;
}

// ── Public ─────────────────────────────────────────────────────────────────
export async function extractLogEntry(text) {
  if (!text?.trim()) return null;

  // 1. Groq (with hard timeout)
  try {
    const r = await extractWithGroq(text);
    if (r?.domain && r.domain !== 'unknown' && r.entities) return { ...r, source:'ai' };
  } catch (e) {
    // Timeout (AbortError), rate-limit, missing key, or network error — fall through
    console.warn('[VoiceLog] Groq skipped:', e.message);
  }

  // 2. Regex fallback
  const fb = regexFallback(text);
  if (fb) return { ...fb, source:'regex' };

  return { domain:'unknown', action:'other', entities:{}, confidence:0, humanReadable: text, xpReward:0, source:'none' };
}

export const DOMAIN_META = {
  finance: { icon:'💰', label:'Finance',  color:'#f59e0b', bg:'bg-amber-500/15',   border:'border-amber-500/30',   text:'text-amber-300' },
  health:  { icon:'🏥', label:'Health',   color:'#10b981', bg:'bg-emerald-500/15', border:'border-emerald-500/30', text:'text-emerald-300' },
  career:  { icon:'🎯', label:'Career',   color:'#3b82f6', bg:'bg-blue-500/15',    border:'border-blue-500/30',    text:'text-blue-300' },
  unknown: { icon:'❓', label:'Unknown',  color:'#6b7280', bg:'bg-slate-500/15',   border:'border-slate-500/30',   text:'text-slate-400' },
};

export const ACTION_LABELS = {
  expense:'Expense Logged', income:'Income Logged', meal:'Meal Logged',
  workout:'Workout Logged', sleep:'Sleep Logged',   mood:'Mood Logged',
  stress:'Stress Logged',   water:'Water Intake',   study:'Study Session', other:'Entry Logged',
};
