// GitHub REST API — no auth required for public data
// Optional: set VITE_GITHUB_TOKEN for higher rate limits (5000 req/hr vs 60/hr)

const GITHUB_API = 'https://api.github.com';
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function ghHeaders() {
  const token = import.meta.env.VITE_GITHUB_TOKEN || localStorage.getItem('github_token') || '';
  const base = { 'Accept': 'application/vnd.github.v3+json' };
  return token ? { ...base, 'Authorization': `Bearer ${token}` } : base;
}

function groqKey() {
  return import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchGitHubProfile(username) {
  const [userRes, reposRes] = await Promise.all([
    fetch(`${GITHUB_API}/users/${username}`,                                          { headers: ghHeaders() }),
    fetch(`${GITHUB_API}/users/${username}/repos?per_page=100&sort=updated`,          { headers: ghHeaders() }),
  ]);

  if (!userRes.ok) {
    if (userRes.status === 404) throw new Error('GitHub user not found');
    if (userRes.status === 403) throw new Error('GitHub rate limit hit. Add VITE_GITHUB_TOKEN to .env for higher limits.');
    throw new Error(`GitHub error ${userRes.status}`);
  }

  const user  = await userRes.json();
  const repos = reposRes.ok ? await reposRes.json() : [];

  // Language distribution
  const langMap = {};
  repos.forEach(r => { if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1; });
  const languages = Object.entries(langMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([lang, count]) => ({ lang, count, pct: Math.round((count / repos.length) * 100) }));

  // Top repos
  const topRepos = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6);

  // Metrics
  const totalStars   = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks   = repos.reduce((s, r) => s + r.forks_count, 0);
  const now          = Date.now();
  const recentRepos  = repos.filter(r => (now - new Date(r.updated_at)) / 86400000 <= 30).length;
  const hasReadmes   = repos.filter(r => r.description).length;
  const uniqueLangs  = languages.length;

  // Developer score (0-100)
  const devScore = Math.min(100, Math.round(
    Math.min(25, repos.length     * 1.2)  +  // repo breadth (max 25)
    Math.min(20, totalStars       * 2.5)  +  // stars (max 20)
    Math.min(20, uniqueLangs      * 3.5)  +  // tech breadth (max 20)
    Math.min(20, recentRepos      * 5)    +  // activity (max 20)
    Math.min(10, user.followers   * 0.5)  +  // network (max 10)
    Math.min(5,  hasReadmes       * 0.3)     // docs quality (max 5)
  ));

  // Domain tags from languages
  const domainMap = {
    JavaScript: 'Frontend', TypeScript: 'Frontend', CSS: 'Frontend', HTML: 'Frontend', Vue: 'Frontend', Svelte: 'Frontend',
    Python: 'Backend/ML', Go: 'Backend', Rust: 'Systems', Java: 'Backend', 'C++': 'Systems', C: 'Systems',
    Kotlin: 'Mobile', Swift: 'Mobile', Dart: 'Mobile',
    Dockerfile: 'DevOps', Shell: 'DevOps', HCL: 'DevOps',
    Jupyter: 'Data Science', R: 'Data Science',
  };
  const domains = [...new Set(languages.map(l => domainMap[l.lang]).filter(Boolean))];

  return { user, repos, languages, topRepos, domains, metrics: { totalStars, totalForks, recentRepos, devScore, uniqueLangs } };
}

// ── AI Analysis via Groq ──────────────────────────────────────────────────────

export async function analyzeGitHubWithAI(profileData) {
  const key = groqKey();
  if (!key) throw new Error('NO_KEY');

  const { user, languages, topRepos, domains, metrics } = profileData;

  const prompt = `You are a senior engineering hiring manager analyzing a developer's GitHub profile.

PROFILE:
- Name: ${user.name || user.login}
- Bio: ${user.bio || 'Not provided'}
- Repos: ${user.public_repos} | Stars earned: ${metrics.totalStars} | Followers: ${user.followers}
- Top languages: ${languages.map(l => `${l.lang} (${l.pct}%)`).join(', ')}
- Domains: ${domains.join(', ')}
- Recent activity (30d): ${metrics.recentRepos} repos updated
- Top repos: ${topRepos.map(r => `${r.name} (${r.language}, ★${r.stargazers_count})`).join(' | ')}

Analyze this developer profile and return ONLY valid JSON, no markdown:
{
  "overallLevel": "Junior|Mid|Senior|Principal",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "gaps": ["missing skill 1", "missing skill 2", "missing skill 3"],
  "careerPaths": ["path 1", "path 2", "path 3"],
  "resumeTips": ["tip 1", "tip 2"],
  "nextSkills": ["skill 1", "skill 2", "skill 3"],
  "hirability": <integer 40-95>,
  "summary": "2-sentence developer summary suitable for a resume"
}`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 800, temperature: 0.3 }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content ?? '';
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  return JSON.parse(s !== -1 && e > s ? raw.slice(s, e + 1) : raw);
}

export const LANG_COLORS = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572a5', Java: '#b07219',
  'C++': '#f34b7d', C: '#555555', Go: '#00add8', Rust: '#dea584',
  Swift: '#f05138', Kotlin: '#a97bff', Dart: '#00b4ab', Ruby: '#701516',
  PHP: '#4f5d95', Shell: '#89e051', HTML: '#e34c26', CSS: '#563d7c',
  Dockerfile: '#384d54', Jupyter: '#da5b0b', R: '#198ce7', Vue: '#41b883',
};
