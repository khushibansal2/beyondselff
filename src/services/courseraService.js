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

const BACKEND = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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

// ─── public API ─────────────────────────────────────────────────────────────

export async function searchCoursera(query, { onProgress, limit = 20 } = {}) {
  const key = query.toLowerCase().trim();
  if (!key) return [];
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

  if (!data) {
    throw new Error(
      `Could not reach Coursera. ` +
      `Start the Spring Boot backend (port 8080) or use the Vite dev server. ` +
      `Last error: ${lastErr?.message}`
    );
  }

  const courses = parseResponse(data);

  if (courses.length === 0) {
    throw new Error(
      `Coursera returned 0 results for "${query}". Try a different or broader search term.`
    );
  }

  sessionCache.set(key, courses);
  return courses;
}

export function clearCourseraCache() { sessionCache.clear(); }
export function hasCourseraCache()   { return sessionCache.size > 0; }
