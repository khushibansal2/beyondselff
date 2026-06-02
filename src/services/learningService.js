// Learning Path Service — powered by Groq AI
// Handles AI generation of structured career transition learning paths.

import { authFetch } from './backendApi';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function getApiKey() {
  return import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
}

function extractJson(raw) {
  let text = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

// ── Hardcoded curated course URL database ────────────────────────────────────
export const LEARNING_PATH_COURSES = [
  {
    transition: 'Software Engineer → Machine Learning Engineer',
    courses: [
      { title: 'Machine Learning by Andrew Ng', platform: 'Coursera', hours: 60, cost: 'Free to audit', url: 'https://www.coursera.org/learn/machine-learning' },
      { title: 'Python for Data Science', platform: 'Coursera', hours: 25, cost: 'Free to audit', url: 'https://www.coursera.org/learn/python-for-applied-data-science-ai' },
      { title: 'Deep Learning Specialization', platform: 'Coursera', hours: 80, cost: 'Free to audit', url: 'https://www.coursera.org/specializations/deep-learning' },
      { title: 'TensorFlow Developer Certificate', platform: 'Coursera', hours: 40, cost: 'Free to audit', url: 'https://www.coursera.org/professional-certificates/tensorflow-in-practice' },
      { title: 'ML Crash Course by Google', platform: 'YouTube', hours: 15, cost: 'Free', url: 'https://www.youtube.com/playlist?list=PLRKtJ4IpxJpDxl0NTvNYQWKCYzHNuy2xG' },
    ]
  },
  {
    transition: 'Software Engineer → Product Manager',
    courses: [
      { title: 'Product Management First Steps', platform: 'Coursera', hours: 10, cost: 'Free to audit', url: 'https://www.coursera.org/learn/product-management' },
      { title: 'Become a Product Manager', platform: 'Udemy', hours: 12, cost: 'Paid ~₹499', url: 'https://www.udemy.com/course/become-a-product-manager-learn-the-skills-get-a-job/' },
      { title: 'Product Design by Google', platform: 'Coursera', hours: 20, cost: 'Free to audit', url: 'https://www.coursera.org/learn/ux-design' },
      { title: 'PM Interview Prep', platform: 'YouTube', hours: 8, cost: 'Free', url: 'https://www.youtube.com/playlist?list=PLrtCHHeadkHp92LyglDS8hPJBDFMSFzHb' },
    ]
  },
  {
    transition: 'Software Engineer → Data Engineer',
    courses: [
      { title: 'Data Engineering Zoomcamp', platform: 'YouTube', hours: 40, cost: 'Free', url: 'https://www.youtube.com/playlist?list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb' },
      { title: 'IBM Data Engineering', platform: 'Coursera', hours: 70, cost: 'Free to audit', url: 'https://www.coursera.org/professional-certificates/ibm-data-engineer' },
      { title: 'Apache Kafka for Beginners', platform: 'Udemy', hours: 10, cost: 'Paid ~₹499', url: 'https://www.udemy.com/course/apache-kafka/' },
      { title: 'dbt (Data Build Tool)', platform: 'YouTube', hours: 6, cost: 'Free', url: 'https://www.youtube.com/playlist?list=PLy4OcwImJzBLJzLYxpxaPUmCWp8j1esvT' },
    ]
  },
  {
    transition: 'Software Engineer → DevOps Engineer',
    courses: [
      { title: 'DevOps Beginners to Advanced', platform: 'Udemy', hours: 40, cost: 'Paid ~₹499', url: 'https://www.udemy.com/course/devsecops/' },
      { title: 'Docker and Kubernetes', platform: 'Coursera', hours: 20, cost: 'Free to audit', url: 'https://www.coursera.org/learn/ibm-containers-docker-kubernetes-openshift' },
      { title: 'DevOps Roadmap', platform: 'YouTube', hours: 10, cost: 'Free', url: 'https://www.youtube.com/watch?v=9pZ2xmsSDdo' },
      { title: 'Git & GitHub Full Course', platform: 'YouTube', hours: 6, cost: 'Free', url: 'https://www.youtube.com/watch?v=RGOj5yH7evk' },
    ]
  },
  {
    transition: 'Marketing → Product Manager',
    courses: [
      { title: 'Digital Marketing + PM Transition', platform: 'Coursera', hours: 15, cost: 'Free to audit', url: 'https://www.coursera.org/learn/digital-marketing' },
      { title: 'Product Management by Google', platform: 'Coursera', hours: 40, cost: 'Free to audit', url: 'https://www.coursera.org/professional-certificates/google-project-management' },
      { title: 'Agile with Atlassian Jira', platform: 'Coursera', hours: 10, cost: 'Free to audit', url: 'https://www.coursera.org/learn/agile-atlassian-jira' },
      { title: 'PM Skills: Stakeholder Management', platform: 'YouTube', hours: 5, cost: 'Free', url: 'https://www.youtube.com/playlist?list=PLrtCHHeadkHp92LyglDS8hPJBDFMSFzHb' },
    ]
  },
  {
    transition: 'Data Analyst → Data Scientist',
    courses: [
      { title: 'IBM Data Science Professional', platform: 'Coursera', hours: 80, cost: 'Free to audit', url: 'https://www.coursera.org/professional-certificates/ibm-data-science' },
      { title: 'Statistics for Data Science', platform: 'Coursera', hours: 20, cost: 'Free to audit', url: 'https://www.coursera.org/learn/statistics-for-data-science-python' },
      { title: 'Applied Data Science with Python', platform: 'Coursera', hours: 30, cost: 'Free to audit', url: 'https://www.coursera.org/specializations/data-science-python' },
      { title: 'Kaggle ML Courses', platform: 'YouTube', hours: 15, cost: 'Free', url: 'https://www.youtube.com/playlist?list=PLqFaTIg4myu8t5ycqvp7I07jTjol3RCl9' },
    ]
  },
  {
    transition: 'Any Role → Full Stack Developer',
    courses: [
      { title: 'The Web Developer Bootcamp', platform: 'Udemy', hours: 65, cost: 'Paid ~₹499', url: 'https://www.udemy.com/course/the-web-developer-bootcamp/' },
      { title: 'Full Stack Open', platform: 'YouTube', hours: 50, cost: 'Free', url: 'https://www.youtube.com/playlist?list=PLy18-NIZnow2HBCGBYmEqY-8VdAv0ZLHM' },
      { title: 'React Full Course', platform: 'YouTube', hours: 12, cost: 'Free', url: 'https://www.youtube.com/watch?v=bMknfKXIFA8' },
      { title: 'Node.js Full Course', platform: 'YouTube', hours: 8, cost: 'Free', url: 'https://www.youtube.com/watch?v=Oe421EPjeBE' },
    ]
  },
  {
    transition: 'Software Engineer → Cybersecurity Analyst',
    courses: [
      { title: 'Google Cybersecurity Certificate', platform: 'Coursera', hours: 45, cost: 'Free to audit', url: 'https://www.coursera.org/professional-certificates/google-cybersecurity' },
      { title: 'Ethical Hacking Full Course', platform: 'YouTube', hours: 15, cost: 'Free', url: 'https://www.youtube.com/watch?v=fNzpcB7ODxQ' },
      { title: 'CompTIA Security+ Prep', platform: 'Udemy', hours: 20, cost: 'Paid ~₹499', url: 'https://www.udemy.com/course/securityplus/' },
      { title: 'Cybersecurity for Everyone', platform: 'Coursera', hours: 10, cost: 'Free to audit', url: 'https://www.coursera.org/learn/cybersecurity-for-everyone' },
    ]
  },
  {
    transition: 'Finance → Data Analyst',
    courses: [
      { title: 'Excel to MySQL Analytics', platform: 'Coursera', hours: 25, cost: 'Free to audit', url: 'https://www.coursera.org/specializations/excel-mysql' },
      { title: 'Google Data Analytics', platform: 'Coursera', hours: 60, cost: 'Free to audit', url: 'https://www.coursera.org/professional-certificates/google-data-analytics' },
      { title: 'Power BI Full Course', platform: 'YouTube', hours: 10, cost: 'Free', url: 'https://www.youtube.com/watch?v=AGrl-H87pRU' },
      { title: 'SQL for Data Analysis', platform: 'Udemy', hours: 10, cost: 'Paid ~₹499', url: 'https://www.udemy.com/course/sqldatabases/' },
    ]
  },
  {
    transition: 'HR → People Analytics',
    courses: [
      { title: 'People Analytics', platform: 'Coursera', hours: 15, cost: 'Free to audit', url: 'https://www.coursera.org/learn/wharton-people-analytics' },
      { title: 'HR Analytics using Excel', platform: 'Udemy', hours: 8, cost: 'Paid ~₹499', url: 'https://www.udemy.com/course/hr-analytics/' },
      { title: 'Data Driven HR', platform: 'YouTube', hours: 5, cost: 'Free', url: 'https://www.youtube.com/watch?v=4p1NMRJqCdE' },
    ]
  },
  {
    transition: 'Any Role → UI/UX Designer',
    courses: [
      { title: 'Google UX Design Certificate', platform: 'Coursera', hours: 55, cost: 'Free to audit', url: 'https://www.coursera.org/professional-certificates/google-ux-design' },
      { title: 'UI/UX Design Bootcamp', platform: 'Udemy', hours: 30, cost: 'Paid ~₹499', url: 'https://www.udemy.com/course/ui-ux-web-design-using-adobe-xd/' },
      { title: 'Figma Full Course', platform: 'YouTube', hours: 8, cost: 'Free', url: 'https://www.youtube.com/watch?v=HZuk6Wkx_Eg' },
      { title: 'Design Thinking', platform: 'Coursera', hours: 12, cost: 'Free to audit', url: 'https://www.coursera.org/learn/design-thinking-innovation' },
    ]
  },
  {
    transition: 'Software Engineer → Blockchain Developer',
    courses: [
      { title: 'Blockchain Specialization', platform: 'Coursera', hours: 40, cost: 'Free to audit', url: 'https://www.coursera.org/specializations/blockchain' },
      { title: 'Ethereum and Solidity Full Course', platform: 'YouTube', hours: 16, cost: 'Free', url: 'https://www.youtube.com/watch?v=M576WGiDBdQ' },
      { title: 'Blockchain A-Z', platform: 'Udemy', hours: 14, cost: 'Paid ~₹499', url: 'https://www.udemy.com/course/build-your-blockchain-az/' },
    ]
  },
];

// ── AI-Powered Learning Path Generation ─────────────────────────────────────
function isBackendConnected() {
  try {
    const raw = localStorage.getItem('dt_auth');
    if (!raw) return false;
    const { token, isDemo } = JSON.parse(raw);
    return !isDemo && token && !token.startsWith('DEMO_SESSION_') && !token.startsWith('dt_jwt_');
  } catch {
    return false;
  }
}

// ── AI-Powered Learning Path Generation ─────────────────────────────────────
export async function generateLearningPath(currentRole, targetRole) {
  const apiKey = getApiKey();

  const courseDbString = LEARNING_PATH_COURSES.map(t =>
    `Transition: ${t.transition}\nCourses:\n${t.courses.map(c =>
      `  - "${c.title}" | ${c.platform} | ${c.hours}hrs | ${c.cost} | ${c.url}`
    ).join('\n')}`
  ).join('\n\n');

  const prompt = `
You are a career counselor AI. The user wants to transition from "${currentRole}" to "${targetRole}".

Using ONLY the courses provided in the course database below, create a structured learning path with 2-3 phases.

Each phase should have:
- A phase name (e.g. "Phase 1 — Foundations")
- 2-3 courses picked from the database below that are most relevant for this transition

COURSE DATABASE:
${courseDbString}

Rules:
- ONLY use courses from the database above. Do not invent or hallucinate any course or URL.
- If the exact role transition is not in the database, pick the closest matching courses based on skills needed.
- If the match is approximate (not exact), set "approximate": true in the response.
- Return ONLY raw JSON, no markdown, no backticks.

Schema:
{
  "from": "${currentRole}",
  "to": "${targetRole}",
  "totalHours": 120,
  "totalCost": "Mostly Free",
  "approximate": false,
  "phases": [
    {
      "phase": "Phase 1 — Foundations",
      "courses": [
        {
          "title": "Course Title",
          "platform": "Coursera",
          "hours": 20,
          "cost": "Free to audit",
          "url": "https://..."
        }
      ]
    }
  ]
}
`;

  // 1. Try backend proxy first if connected
  if (isBackendConnected()) {
    try {
      console.log('[LearningService] Connecting to backend simulation endpoint...');
      const data = await authFetch('/ai/simulate', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      if (data && data.response) {
        const result = extractJson(data.response);
        if (result && result.phases && Array.isArray(result.phases)) {
          return result;
        }
      }
    } catch (err) {
      console.warn('[LearningService] Backend proxy generation failed, trying direct Groq/fallback:', err.message);
    }
  }

  // 2. Fallback to client-side API key direct Groq call
  if (apiKey) {
    try {
      console.log('[LearningService] Connecting to Groq direct API...');
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) throw new Error('Empty response from Groq');

      const result = extractJson(raw);
      if (!result.phases || !Array.isArray(result.phases)) {
        throw new Error('Invalid JSON structure from AI');
      }

      return result;
    } catch (err) {
      console.error('[LearningService] Direct Groq learning path generation failed:', err);
    }
  }

  console.warn('[LearningService] No API keys or backend connectivity active, returning local demo matching path');
  return getDemoLearningPath(currentRole, targetRole);
}

function getDemoLearningPath(currentRole, targetRole) {
  const currentLower = (currentRole || '').toLowerCase().trim();
  const targetLower = (targetRole || '').toLowerCase().trim();

  // 1. Try to find exact transition match (case-insensitive)
  let matchedTransition = LEARNING_PATH_COURSES.find(t => {
    const parts = t.transition.split('→');
    if (parts.length === 2) {
      const fromPart = parts[0].toLowerCase().trim();
      const toPart = parts[1].toLowerCase().trim();
      return fromPart === currentLower && toPart === targetLower;
    }
    return false;
  });

  // 2. Try to find "Any Role → targetRole"
  if (!matchedTransition) {
    matchedTransition = LEARNING_PATH_COURSES.find(t => {
      const parts = t.transition.split('→');
      if (parts.length === 2) {
        const fromPart = parts[0].toLowerCase().trim();
        const toPart = parts[1].toLowerCase().trim();
        return fromPart === 'any role' && toPart === targetLower;
      }
      return false;
    });
  }

  // 3. Try to find any transition ending in targetRole
  if (!matchedTransition) {
    matchedTransition = LEARNING_PATH_COURSES.find(t => {
      const parts = t.transition.split('→');
      if (parts.length === 2) {
        const toPart = parts[1].toLowerCase().trim();
        return toPart === targetLower;
      }
      return false;
    });
  }

  // 4. Try to find transition whose target contains targetRole, or vice versa
  if (!matchedTransition) {
    matchedTransition = LEARNING_PATH_COURSES.find(t => {
      const parts = t.transition.split('→');
      if (parts.length === 2) {
        const toPart = parts[1].toLowerCase().trim();
        return toPart.includes(targetLower) || targetLower.includes(toPart);
      }
      return false;
    });
  }

  // 5. Try keyword matching
  if (!matchedTransition) {
    if (targetLower.includes('developer') || targetLower.includes('development') || targetLower.includes('web') || targetLower.includes('full stack') || targetLower.includes('frontend') || targetLower.includes('backend') || targetLower.includes('software') || targetLower.includes('engineer')) {
      matchedTransition = LEARNING_PATH_COURSES.find(t => t.transition.includes('Full Stack Developer'));
    } else if (targetLower.includes('data') || targetLower.includes('analyst') || targetLower.includes('analytics') || targetLower.includes('science') || targetLower.includes('scientist')) {
      matchedTransition = LEARNING_PATH_COURSES.find(t => t.transition.includes('Data Analyst') || t.transition.includes('Data Scientist'));
    } else if (targetLower.includes('manager') || targetLower.includes('product') || targetLower.includes('project')) {
      matchedTransition = LEARNING_PATH_COURSES.find(t => t.transition.includes('Product Manager'));
    } else if (targetLower.includes('design') || targetLower.includes('ui') || targetLower.includes('ux') || targetLower.includes('user experience') || targetLower.includes('user interface')) {
      matchedTransition = LEARNING_PATH_COURSES.find(t => t.transition.includes('UI/UX Designer'));
    } else if (targetLower.includes('security') || targetLower.includes('cyber') || targetLower.includes('cybersecurity') || targetLower.includes('infosec')) {
      matchedTransition = LEARNING_PATH_COURSES.find(t => t.transition.includes('Cybersecurity Analyst'));
    } else if (targetLower.includes('devops') || targetLower.includes('cloud') || targetLower.includes('sre') || targetLower.includes('system')) {
      matchedTransition = LEARNING_PATH_COURSES.find(t => t.transition.includes('DevOps Engineer'));
    } else if (targetLower.includes('machine learning') || targetLower.includes('ml') || targetLower.includes('ai') || targetLower.includes('artificial intelligence') || targetLower.includes('deep learning')) {
      matchedTransition = LEARNING_PATH_COURSES.find(t => t.transition.includes('Machine Learning Engineer'));
    } else if (targetLower.includes('blockchain') || targetLower.includes('crypto') || targetLower.includes('solidity') || targetLower.includes('ethereum')) {
      matchedTransition = LEARNING_PATH_COURSES.find(t => t.transition.includes('Blockchain Developer'));
    }
  }

  // 6. Default fallback
  const matched = matchedTransition || LEARNING_PATH_COURSES[0];
  const courses = matched.courses;

  // Decide if this is an approximate match
  let isApproximate = true;
  if (matchedTransition) {
    const parts = matchedTransition.transition.split('→');
    if (parts.length === 2) {
      const fromPart = parts[0].toLowerCase().trim();
      const toPart = parts[1].toLowerCase().trim();
      if (fromPart === currentLower && toPart === targetLower) {
        isApproximate = false;
      }
    }
  }

  const phases = [];
  if (courses.length > 0) {
    if (courses.length >= 4) {
      phases.push({
        phase: 'Phase 1 — Foundations',
        courses: courses.slice(0, 2),
      });
      phases.push({
        phase: 'Phase 2 — Core Skills',
        courses: courses.slice(2, 3),
      });
      phases.push({
        phase: 'Phase 3 — Specialization',
        courses: courses.slice(3),
      });
    } else if (courses.length === 3) {
      phases.push({
        phase: 'Phase 1 — Foundations',
        courses: courses.slice(0, 1),
      });
      phases.push({
        phase: 'Phase 2 — Core Skills',
        courses: courses.slice(1, 2),
      });
      phases.push({
        phase: 'Phase 3 — Specialization',
        courses: courses.slice(2),
      });
    } else {
      phases.push({
        phase: 'Phase 1 — Foundations',
        courses: [courses[0]],
      });
      if (courses[1]) {
        phases.push({
          phase: 'Phase 2 — Advanced Skills',
          courses: [courses[1]],
        });
      }
    }
  }

  const plan = {
    from: currentRole,
    to: targetRole,
    totalHours: courses.reduce((acc, c) => acc + c.hours, 0),
    totalCost: courses[0]?.cost?.includes('Paid') ? 'Mostly Paid' : 'Mostly Free',
    approximate: isApproximate,
    phases,
  };

  return new Promise(resolve => setTimeout(() => resolve(plan), 1200));
}
