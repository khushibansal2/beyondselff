/**
 * Job Service — Real job data from public APIs
 *
 * Sources (in priority order):
 *   1. Remotive    — free, no auth, remote-only roles worldwide
 *   2. Adzuna IN   — India-specific, needs app_id + app_key → proxied via backend
 *   3. Jooble      — aggregates Naukri / Shine / TimesJobs / LinkedIn India
 *                    needs api key from jooble.org/api → proxied via backend
 *
 * Get free keys:
 *   Adzuna : https://developer.adzuna.com  (ADZUNA_APP_ID + ADZUNA_APP_KEY)
 *   Jooble : https://jooble.org/api/index  (JOOBLE_API_KEY)
 *
 * Note: Arbeitnow was removed — it is a German job board and always returns EU jobs.
 */

const REMOTIVE_URL  = 'https://remotive.com/api/remote-jobs';
const BACKEND_BASE  = (import.meta.env.VITE_API_BASE || 'http://localhost:8080');

// ── Skill taxonomy ────────────────────────────────────────────────────────────
// Used for extracting required skills from raw job description text.

export const SKILL_GROUPS = {
  frontend:  ['React', 'Vue', 'Angular', 'Next.js', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Tailwind', 'Redux', 'Svelte', 'Webpack', 'Vite'],
  backend:   ['Node.js', 'Python', 'Java', 'Spring Boot', 'Django', 'FastAPI', 'Express', 'Go', 'Rust', 'PHP', 'Laravel', 'Ruby on Rails', 'Kotlin', 'Scala'],
  database:  ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB', 'Cassandra', 'Elasticsearch', 'SQL', 'SQLite', 'InfluxDB', 'Snowflake'],
  devops:    ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'Linux', 'Nginx', 'Prometheus'],
  ml_ai:     ['TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'NumPy', 'OpenCV', 'Hugging Face', 'LangChain', 'Machine Learning', 'Deep Learning', 'NLP', 'MLOps'],
  tools:     ['Git', 'GitHub', 'REST API', 'GraphQL', 'gRPC', 'Kafka', 'RabbitMQ', 'Microservices', 'System Design', 'Agile', 'Scrum', 'JIRA'],
  mobile:    ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Android', 'iOS', 'Expo'],
  data:      ['Spark', 'Hadoop', 'Airflow', 'dbt', 'Tableau', 'Power BI', 'BigQuery', 'ETL', 'Databricks'],
};

export const ALL_SKILLS = Object.values(SKILL_GROUPS).flat();

// Canonical display form for skills that APIs return in various casings
const SKILL_CANONICAL = {
  'react': 'React', 'reactjs': 'React', 'react.js': 'React',
  'typescript': 'TypeScript', 'javascript': 'JavaScript', 'js': 'JavaScript',
  'nodejs': 'Node.js', 'node': 'Node.js', 'node.js': 'Node.js',
  'nextjs': 'Next.js', 'next.js': 'Next.js', 'next': 'Next.js',
  'vuejs': 'Vue', 'vue.js': 'Vue', 'vue': 'Vue',
  'angularjs': 'Angular', 'angular': 'Angular',
  'postgresql': 'PostgreSQL', 'postgres': 'PostgreSQL',
  'mongodb': 'MongoDB', 'mongo': 'MongoDB',
  'springboot': 'Spring Boot', 'spring boot': 'Spring Boot', 'spring': 'Spring Boot',
  'tensorflow': 'TensorFlow', 'pytorch': 'PyTorch',
  'kubernetes': 'Kubernetes', 'k8s': 'Kubernetes',
  'docker': 'Docker', 'aws': 'AWS', 'azure': 'Azure', 'gcp': 'GCP',
  'graphql': 'GraphQL', 'restapi': 'REST API', 'rest api': 'REST API',
  'cicd': 'CI/CD', 'ci/cd': 'CI/CD',
  'ml': 'Machine Learning', 'machinelearning': 'Machine Learning',
  'deeplearning': 'Deep Learning', 'nlp': 'NLP',
  'tailwindcss': 'Tailwind', 'tailwind': 'Tailwind',
  'reactnative': 'React Native',
  'python': 'Python', 'java': 'Java', 'go': 'Go', 'rust': 'Rust',
  'git': 'Git', 'linux': 'Linux', 'sql': 'SQL',
  'redis': 'Redis', 'kafka': 'Kafka',
  'microservices': 'Microservices', 'systemdesign': 'System Design',
};

export function canonicalSkill(s) {
  if (!s) return '';
  const key = s.toLowerCase().replace(/[.\s\-_]/g, '');
  return SKILL_CANONICAL[key] || SKILL_CANONICAL[s.toLowerCase()] || (s.charAt(0).toUpperCase() + s.slice(1));
}

// Extract known tech skills from any free-form job description text
export function extractSkillsFromText(text) {
  if (!text) return [];
  const stripped = text.replace(/<[^>]+>/g, ' ').toLowerCase();
  const found = [];
  for (const skill of ALL_SKILLS) {
    const norm = skill.toLowerCase().replace(/[. -]/g, '').replace(/\s+/g, '\\s*');
    if (new RegExp(`\\b${norm}\\b`).test(stripped.replace(/[. -]/g, ''))) {
      found.push(skill);
    }
  }
  return [...new Set(found)];
}

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalizeRemotive(job) {
  const rawTags = (job.tags || []).map(t => canonicalSkill(typeof t === 'string' ? t : t.name || ''));
  const descSkills = extractSkillsFromText(job.description || '');
  return {
    id:             `remotive_${job.id}`,
    source:         'Remotive',
    sourceColor:    '#10b981',
    title:          job.title || 'Software Engineer',
    company:        job.company_name || 'Company',
    companyLogo:    job.company_logo_url || job.company_logo || null,
    location:       job.candidate_required_location || 'Worldwide',
    remote:         true,
    description:    (job.description || '').replace(/<[^>]+>/g, ' ').slice(0, 600),
    tags:           rawTags,
    requiredSkills: [...new Set([...rawTags, ...descSkills])].filter(Boolean),
    url:            job.url,
    postedAt:       job.publication_date || null,
    salary:         job.salary || null,
    type:           (job.job_type || 'full_time').replace('_', '-'),
    visaSponsorship: false,
  };
}

function normalizeAdzuna(job) {
  const descSkills = extractSkillsFromText(job.description || '');
  const salary = (job.salary_min && job.salary_max)
    ? `₹${Math.round(job.salary_min / 100000)}L–${Math.round(job.salary_max / 100000)}L`
    : null;
  return {
    id:             `adzuna_${job.id}`,
    source:         'Adzuna',
    sourceColor:    '#f59e0b',
    title:          job.title || 'Software Engineer',
    company:        job.company?.display_name || 'Company',
    location:       job.location?.display_name || 'India',
    remote:         false,
    description:    (job.description || '').replace(/<[^>]+>/g, ' ').slice(0, 600),
    tags:           descSkills,
    requiredSkills: descSkills,
    url:            job.redirect_url || job.url || '#',
    postedAt:       job.created || null,
    salary,
    salaryMin:      job.salary_min || null,
    salaryMax:      job.salary_max || null,
    type:           'Full-time',
    visaSponsorship: false,
  };
}

function normalizeJooble(job) {
  // Jooble aggregates Indian portals: Naukri, Shine, TimesJobs, LinkedIn India, etc.
  // The `source` field shows which portal the listing originally came from.
  const descSkills = extractSkillsFromText((job.snippet || '') + ' ' + (job.title || ''));
  // Jooble salary is a raw string like "₹3,00,000 – ₹5,00,000" — keep as-is
  const salary = job.salary ? String(job.salary).trim() : null;
  return {
    id:             `jooble_${encodeURIComponent(job.link || job.title || Math.random())}`,
    source:         `Jooble · ${job.source || 'India'}`,
    sourceColor:    '#f97316',
    title:          job.title || 'Software Engineer',
    company:        job.company || 'Company',
    location:       job.location || 'India',
    remote:         /remote/i.test(job.location || '') || /remote/i.test(job.type || ''),
    description:    (job.snippet || '').replace(/<[^>]+>/g, ' ').slice(0, 600),
    tags:           descSkills,
    requiredSkills: descSkills,
    url:            job.link || '#',
    postedAt:       job.updated || null,
    salary,
    type:           job.type || 'Full-time',
    visaSponsorship: false,
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchRemotive(query, limit = 15) {
  const url = `${REMOTIVE_URL}?${new URLSearchParams({ search: query, limit })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`Remotive ${res.status}`);
  const data = await res.json();
  return (data.jobs || []).map(normalizeRemotive);
}

async function fetchViaProxy(endpoint, params = {}, method = 'GET') {
  const stored = localStorage.getItem('dt_auth');
  const token  = stored ? JSON.parse(stored)?.token : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const isPost = method === 'POST';
  const url = isPost
    ? `${BACKEND_BASE}/api/jobs/${endpoint}`
    : `${BACKEND_BASE}/api/jobs/${endpoint}?${new URLSearchParams(params)}`;

  const res = await fetch(url, {
    method,
    headers,
    body: isPost ? JSON.stringify(params) : undefined,
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Proxy ${endpoint} ${res.status}`);
  return res.json();
}

// ── Public API ────────────────────────────────────────────────────────────────

// Locations that are clearly NOT India — used to filter out Remotive listings
// that specify a region where Indian applicants cannot apply.
const NON_INDIA_REGIONS = [
  'germany', 'berlin', 'munich', 'hamburg', 'frankfurt',
  'uk only', 'united kingdom', 'london', 'europe only', 'eu only',
  'us only', 'usa only', 'canada only', 'australia only',
  'latam only', 'latin america only',
];

function isIndiaRelevant(job) {
  if (job.remote) return true; // remote jobs are open to India
  const loc = (job.location || '').toLowerCase();
  if (NON_INDIA_REGIONS.some(r => loc.includes(r))) return false;
  return true;
}

/**
 * Search jobs from all configured sources.
 * Always tries Remotive (free, no key needed).
 * Also fires Adzuna India + Jooble via backend if keys are configured.
 * Jooble aggregates Naukri, Shine, TimesJobs, LinkedIn India — best for Indian roles.
 */
export async function fetchJobs(query, { location = 'India', limit = 24 } = {}) {
  if (!query?.trim()) return [];

  const settled = await Promise.allSettled([
    fetchRemotive(query),
    // Adzuna India — dedicated /in/ endpoint, returns INR salaries
    fetchViaProxy('adzuna', { query: `${query} ${location}`, country: 'in' })
      .then(d => (d.results || []).map(normalizeAdzuna))
      .catch(() => []),
    // Jooble — aggregates Naukri, Shine, TimesJobs, LinkedIn India
    fetchViaProxy('jooble', { keywords: query, location: location || 'India' }, 'POST')
      .then(d => (d.jobs || []).map(normalizeJooble))
      .catch(() => []),
  ]);

  const all = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  if (!all.length) throw new Error('NO_RESULTS');

  // Filter out non-India-relevant jobs, then deduplicate on title+company
  const seen = new Set();
  return all
    .filter(isIndiaRelevant)
    .filter(j => {
      const key = `${j.title.toLowerCase().slice(0, 30)}_${j.company.toLowerCase().slice(0, 20)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/** Fetch salary market data for a role from Adzuna (optional, graceful fallback). */
export async function fetchSalaryMarketData(role) {
  try {
    return await fetchViaProxy('salary', { role });
  } catch {
    return null;
  }
}
