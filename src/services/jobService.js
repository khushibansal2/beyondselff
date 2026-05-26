/**
 * Job Service — Real job data from public APIs
 *
 * Sources (in priority order):
 *   1. Arbeitnow   — free, no auth, CORS-friendly, tech-focused
 *   2. Remotive    — free, no auth, remote-only roles
 *   3. Adzuna      — needs app_id + app_key → proxied via Spring Boot backend
 *   4. JSearch     — needs RapidAPI key → proxied via Spring Boot backend
 *
 * Add keys to backend/.env to unlock sources 3 & 4.
 */

const ARBEITNOW_URL = 'https://www.arbeitnow.com/api/job-board-api';
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

function normalizeArbeitnow(job) {
  const rawTags = (job.tags || []).map(t => canonicalSkill(String(t)));
  const descSkills = extractSkillsFromText(job.description || '');
  return {
    id:             `arbeitnow_${job.slug}`,
    source:         'Arbeitnow',
    sourceColor:    '#6366f1',
    title:          job.title || 'Software Engineer',
    company:        job.company_name || 'Company',
    location:       job.location || 'Remote',
    remote:         Boolean(job.remote),
    description:    (job.description || '').replace(/<[^>]+>/g, ' ').slice(0, 600),
    tags:           rawTags,
    requiredSkills: [...new Set([...rawTags, ...descSkills])].filter(Boolean),
    url:            job.url,
    postedAt:       job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
    salary:         null,
    type:           (job.job_types || ['full_time'])[0]?.replace('_', '-') || 'Full-time',
    visaSponsorship: Boolean(job.visa_sponsorship),
  };
}

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

function normalizeJSearch(job) {
  const requiredSkills = [
    ...(job.job_required_skills || []).map(canonicalSkill),
    ...extractSkillsFromText((job.job_description || '') + ' ' + (job.job_title || '')),
  ];
  const salary = (job.job_min_salary && job.job_max_salary)
    ? `$${Math.round(job.job_min_salary / 1000)}k–$${Math.round(job.job_max_salary / 1000)}k`
    : null;
  return {
    id:             `jsearch_${job.job_id}`,
    source:         'JSearch',
    sourceColor:    '#3b82f6',
    title:          job.job_title || 'Software Engineer',
    company:        job.employer_name || 'Company',
    companyLogo:    job.employer_logo || null,
    location:       [job.job_city, job.job_country].filter(Boolean).join(', ') || 'Remote',
    remote:         Boolean(job.job_is_remote),
    description:    (job.job_description || '').slice(0, 600),
    tags:           requiredSkills.slice(0, 10),
    requiredSkills: [...new Set(requiredSkills)],
    url:            job.job_apply_link || job.job_google_link || '#',
    postedAt:       job.job_posted_at_datetime_utc || null,
    salary,
    salaryMin:      job.job_min_salary || null,
    salaryMax:      job.job_max_salary || null,
    type:           job.job_employment_type || 'FULLTIME',
    visaSponsorship: false,
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchArbeitnow(query, page = 1) {
  const url = `${ARBEITNOW_URL}?${new URLSearchParams({ search: query, page })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`Arbeitnow ${res.status}`);
  const data = await res.json();
  return (data.data || []).map(normalizeArbeitnow);
}

async function fetchRemotive(query, limit = 15) {
  const url = `${REMOTIVE_URL}?${new URLSearchParams({ search: query, limit })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`Remotive ${res.status}`);
  const data = await res.json();
  return (data.jobs || []).map(normalizeRemotive);
}

async function fetchViaProxy(endpoint, params = {}) {
  const stored = localStorage.getItem('dt_auth');
  const token  = stored ? JSON.parse(stored)?.token : null;
  const url    = `${BACKEND_BASE}/api/jobs/${endpoint}?${new URLSearchParams(params)}`;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Proxy ${endpoint} ${res.status}`);
  return res.json();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Search jobs from all configured sources.
 * Always tries Arbeitnow + Remotive (free, no key needed).
 * Also fires Adzuna + JSearch via backend if keys are configured.
 */
export async function fetchJobs(query, { location = '', limit = 24 } = {}) {
  if (!query?.trim()) return [];
  const q = location ? `${query} ${location}` : query;

  const settled = await Promise.allSettled([
    fetchArbeitnow(q),
    fetchRemotive(query),
    fetchViaProxy('adzuna', { query: q, country: 'in' })
      .then(d => (d.results || []).map(normalizeAdzuna))
      .catch(() => []),
    fetchViaProxy('jsearch', { q })
      .then(d => (d.data || []).map(normalizeJSearch))
      .catch(() => []),
  ]);

  const all = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  if (!all.length) throw new Error('NO_RESULTS');

  // Deduplicate on title+company
  const seen = new Set();
  return all
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
