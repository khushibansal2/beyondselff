// Coursera doesn't offer a public search API — their catalog API has no search finder.
// This service uses Groq (already in the project) to recommend real Coursera courses
// by name + slug, then links directly to coursera.org.

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key');
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const sessionCache = new Map(); // query → results, lives for browser session

async function askGroq(query) {
  const key = GROQ_KEY;
  if (!key) throw new Error('No Groq API key — add VITE_GROQ_API_KEY to .env');

  const prompt = `You are a Coursera course expert. Return a JSON array of exactly 10 real Coursera courses that best match the topic: "${query}".

Each item must have:
- "name": exact course title as it appears on Coursera
- "slug": the URL slug from coursera.org/learn/<slug>
- "partner": university or company offering it (e.g. "DeepLearning.AI", "Google", "University of Michigan")
- "level": "Beginner" | "Intermediate" | "Advanced"
- "duration": e.g. "4 weeks", "3 months"

Only include courses you are confident exist on Coursera. Return ONLY the JSON array, no markdown, no explanation.`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) throw new Error(`Groq API error ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '[]';

  // Strip markdown fences if present
  const json = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  const courses = JSON.parse(json);

  return courses.map(c => ({
    id: c.slug,
    name: c.name,
    slug: c.slug,
    partner: c.partner || '',
    level: c.level || '',
    duration: c.duration || '',
    photo: '',
    url: `https://www.coursera.org/learn/${c.slug}`,
  }));
}

export async function searchCoursera(query, { onProgress } = {}) {
  const lower = query.toLowerCase().trim();
  if (!lower) return [];
  if (sessionCache.has(lower)) return sessionCache.get(lower);

  onProgress?.('Asking AI for Coursera recommendations…');
  const results = await askGroq(query);
  sessionCache.set(lower, results);
  return results;
}

export function clearCourseraCache() {
  sessionCache.clear();
}

export function hasCourseraCache() {
  return sessionCache.size > 0;
}
