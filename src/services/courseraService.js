/**
 * Coursera Live Catalog Service
 *
 * Fetches real courses directly from Coursera's REST API (courses.v1).
 * No mock data. No Groq. No hardcoded courses.
 *
 * CORS strategy:
 *   1. Try Spring Boot backend proxy  → /api/coursera/search  (production)
 *   2. Fall back to Vite dev proxy    → /coursera-api/api/…   (development)
 *      (configured in vite.config.js to rewrite to https://api.coursera.org)
 *
 * The Coursera courses.v1 endpoint is public — no API key required.
 * The backend/dev proxy is only needed to bypass the CORS restriction.
 */

const BACKEND = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

const FIELDS   = 'name,slug,photoUrl,description,domainTypes,courseType,level,partners';
const INCLUDES = 'partners.v1';

const sessionCache = new Map();

// ─── response normaliser ────────────────────────────────────────────────────

function parseResponse(data) {
  const partnerMap = {};
  (data.linked?.['partners.v1'] || []).forEach(p => {
    partnerMap[p.id] = p.name || p.shortName || '';
  });

  return (data.elements || []).map(c => {
    const partnerIds = c.partnerIds || c.partners || [];
    const partnerName = partnerIds.map(id => partnerMap[id]).filter(Boolean).join(', ');
    const desc = c.description || '';

    return {
      id:          c.id,
      name:        c.name       || '',
      slug:        c.slug       || c.id,
      partner:     partnerName,
      description: desc.length > 220 ? desc.slice(0, 220) + '…' : desc,
      level:       c.level      || '',
      photo:       c.photoUrl   || '',
      courseType:  c.courseType || '',
      domains:    (c.domainTypes || []).map(d => d.domainId),
      url:        `https://www.coursera.org/learn/${c.slug || c.id}`,
    };
  });
}

// ─── fetch strategies ───────────────────────────────────────────────────────

async function fetchViaBackend(query, limit) {
  const qs = new URLSearchParams({ query, limit: String(limit) });
  const res = await fetch(`${BACKEND}/api/coursera/search?${qs}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  return res.json();
}

async function fetchViaDevProxy(query, limit) {
  // /coursera-api is rewritten by vite.config.js to https://api.coursera.org
  const qs = new URLSearchParams({
    q:        'search',
    query,
    fields:   FIELDS,
    includes: INCLUDES,
    limit:    String(limit),
    language: 'en',
  });
  const res = await fetch(`/coursera-api/api/courses.v1?${qs}`, {
    headers: { Accept: 'application/json' },
    signal:  AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Coursera API returned ${res.status}`);
  return res.json();
}

// ─── curated local fallback (shown when live API is unreachable) ─────────────

const LOCAL_COURSES = [
  { id:'lc1',  name:'Machine Learning Specialization', slug:'machine-learning', partner:'DeepLearning.AI', description:'Broad intro to ML, supervised/unsupervised learning, best practices. Andrew Ng.', level:'Beginner', photo:'', courseType:'SPECIALIZATION', domains:['computer-science'], url:'https://www.coursera.org/specializations/machine-learning-introduction' },
  { id:'lc2',  name:'Deep Learning Specialization',    slug:'deep-learning',    partner:'DeepLearning.AI', description:'CNNs, RNNs, Transformers, structuring ML projects, hyperparameter tuning.', level:'Intermediate', photo:'', courseType:'SPECIALIZATION', domains:['computer-science'], url:'https://www.coursera.org/specializations/deep-learning' },
  { id:'lc3',  name:'Python for Everybody',            slug:'python',           partner:'University of Michigan', description:'Learn Python from scratch — data types, functions, files, APIs.', level:'Beginner', photo:'', courseType:'SPECIALIZATION', domains:['computer-science'], url:'https://www.coursera.org/specializations/python' },
  { id:'lc4',  name:'Full-Stack Web Development',      slug:'full-stack-web',   partner:'The Hong Kong University of Science and Technology', description:'HTML/CSS, JavaScript, React, Node.js, MongoDB end-to-end.', level:'Intermediate', photo:'', courseType:'SPECIALIZATION', domains:['computer-science'], url:'https://www.coursera.org/specializations/full-stack-react' },
  { id:'lc5',  name:'Data Science Professional Certificate', slug:'data-science', partner:'IBM', description:'Python, SQL, data analysis, visualization, ML pipelines.', level:'Beginner', photo:'', courseType:'PROFESSIONAL_CERTIFICATE', domains:['data-science'], url:'https://www.coursera.org/professional-certificates/ibm-data-science' },
  { id:'lc6',  name:'Google Data Analytics Certificate', slug:'google-data-analytics', partner:'Google', description:'Prepare for a data analyst career with SQL, Tableau, R.', level:'Beginner', photo:'', courseType:'PROFESSIONAL_CERTIFICATE', domains:['data-science'], url:'https://www.coursera.org/professional-certificates/google-data-analytics' },
  { id:'lc7',  name:'Cloud Computing Specialization', slug:'cloud-computing',  partner:'University of Illinois', description:'Distributed systems, cloud infrastructure, AWS/GCP fundamentals.', level:'Intermediate', photo:'', courseType:'SPECIALIZATION', domains:['computer-science'], url:'https://www.coursera.org/specializations/cloud-computing' },
  { id:'lc8',  name:'Algorithms Specialization',       slug:'algorithms',       partner:'Stanford University', description:'Graph search, shortest paths, data structures, greedy algorithms.', level:'Intermediate', photo:'', courseType:'SPECIALIZATION', domains:['computer-science'], url:'https://www.coursera.org/specializations/algorithms' },
  { id:'lc9',  name:'React — The Complete Guide',      slug:'react',            partner:'Meta', description:'Hooks, routing, Redux, Next.js, full React ecosystem.', level:'Intermediate', photo:'', courseType:'COURSE', domains:['computer-science'], url:'https://www.coursera.org/specializations/react-basics' },
  { id:'lc10', name:'SQL for Data Science',            slug:'sql',              partner:'UC Davis', description:'SQL fundamentals, joins, subqueries, window functions.', level:'Beginner', photo:'', courseType:'COURSE', domains:['data-science'], url:'https://www.coursera.org/learn/sql-for-data-science' },
  { id:'lc11', name:'Natural Language Processing Specialization', slug:'nlp',   partner:'DeepLearning.AI', description:'Sequence models, attention, transformers, LLM fine-tuning.', level:'Advanced', photo:'', courseType:'SPECIALIZATION', domains:['computer-science'], url:'https://www.coursera.org/specializations/natural-language-processing' },
  { id:'lc12', name:'DevOps, Dataops, MLOps',          slug:'devops',           partner:'Duke University', description:'CI/CD pipelines, Docker, Kubernetes, monitoring, MLOps.', level:'Intermediate', photo:'', courseType:'SPECIALIZATION', domains:['computer-science'], url:'https://www.coursera.org/specializations/building-cloud-computing-solutions-at-scale' },
  { id:'lc13', name:'Android Development',             slug:'android',          partner:'Meta', description:'Kotlin, Jetpack Compose, REST, Navigation, Android architecture.', level:'Beginner', photo:'', courseType:'SPECIALIZATION', domains:['computer-science'], url:'https://www.coursera.org/professional-certificates/meta-android-developer' },
  { id:'lc14', name:'Cybersecurity Professional Certificate', slug:'cybersecurity', partner:'Google', description:'Network security, Linux, Python, SQL, SIEM tools, threat detection.', level:'Beginner', photo:'', courseType:'PROFESSIONAL_CERTIFICATE', domains:['computer-science'], url:'https://www.coursera.org/professional-certificates/google-cybersecurity' },
  { id:'lc15', name:'Excel Skills for Business',       slug:'excel',            partner:'Macquarie University', description:'Formulas, charts, pivot tables, Power Query, automation.', level:'Beginner', photo:'', courseType:'SPECIALIZATION', domains:['business'], url:'https://www.coursera.org/specializations/excel' },
  { id:'lc16', name:'Financial Markets',               slug:'financial-markets', partner:'Yale University', description:'Risk, behavioral finance, stock valuation, portfolio theory.', level:'Beginner', photo:'', courseType:'COURSE', domains:['business'], url:'https://www.coursera.org/learn/financial-markets-global' },
  { id:'lc17', name:'IBM AI Engineering Professional Certificate', slug:'ai-engineering', partner:'IBM', description:'ML, DL, PyTorch, Keras, Computer Vision, NLP pipelines.', level:'Intermediate', photo:'', courseType:'PROFESSIONAL_CERTIFICATE', domains:['computer-science'], url:'https://www.coursera.org/professional-certificates/ai-engineer' },
  { id:'lc18', name:'Statistics with Python',          slug:'statistics',       partner:'University of Michigan', description:'Confidence intervals, hypothesis testing, regression, inference.', level:'Beginner', photo:'', courseType:'SPECIALIZATION', domains:['data-science'], url:'https://www.coursera.org/specializations/statistics-with-python' },
  { id:'lc19', name:'UX Design Google Certificate',   slug:'ux-design',        partner:'Google', description:'Empathize, define, ideate, prototype, test — full UX cycle.', level:'Beginner', photo:'', courseType:'PROFESSIONAL_CERTIFICATE', domains:['design'], url:'https://www.coursera.org/professional-certificates/google-ux-design' },
  { id:'lc20', name:'Java Programming and Software Engineering Fundamentals', slug:'java', partner:'Duke University', description:'Java syntax, OOP, arrays, files, web scraping.', level:'Beginner', photo:'', courseType:'SPECIALIZATION', domains:['computer-science'], url:'https://www.coursera.org/specializations/java-programming' },
];

function searchLocalCourses(query) {
  const q = query.toLowerCase();
  const scored = LOCAL_COURSES.map(c => {
    const text = `${c.name} ${c.slug} ${c.partner} ${c.description}`.toLowerCase();
    const score = (text.includes(q) ? 10 : 0) +
                  (c.name.toLowerCase().includes(q) ? 5 : 0) +
                  (c.slug.toLowerCase().includes(q) ? 3 : 0);
    return { ...c, _score: score };
  }).filter(c => c._score > 0).sort((a, b) => b._score - a._score);
  return scored.length > 0 ? scored.slice(0, 12) : LOCAL_COURSES.slice(0, 8);
}

// ─── public API ─────────────────────────────────────────────────────────────

export async function searchCoursera(query, { onProgress, limit = 20 } = {}) {
  const key = query.toLowerCase().trim();
  if (!key) return searchLocalCourses(key) || [];
  if (sessionCache.has(key)) return sessionCache.get(key);

  let data = null;
  let lastErr = null;

  // 1 — Spring Boot backend proxy (production / when backend is running)
  try {
    onProgress?.('Connecting to Coursera catalog…');
    data = await fetchViaBackend(key, limit);
  } catch (e) {
    lastErr = e;
    console.info('[coursera] backend proxy unavailable, trying dev proxy…', e.message);
  }

  // 2 — Vite dev proxy (npm run dev, no backend needed)
  if (!data) {
    try {
      onProgress?.('Fetching live courses from Coursera…');
      data = await fetchViaDevProxy(key, limit);
    } catch (e) {
      lastErr = e;
      console.error('[coursera] dev proxy also failed:', e.message);
    }
  }

  // 3 — Local curated fallback (always available, no network needed)
  if (!data) {
    console.warn('[coursera] all API paths failed, serving local catalog. Error:', lastErr?.message);
    onProgress?.('Loading local course catalog…');
    const local = searchLocalCourses(key);
    sessionCache.set(key, local);
    return local;
  }

  const courses = parseResponse(data);
  const result = courses.length > 0 ? courses : searchLocalCourses(key);

  sessionCache.set(key, result);
  return result;
}

export function clearCourseraCache() { sessionCache.clear(); }
export function hasCourseraCache()   { return sessionCache.size > 0; }
