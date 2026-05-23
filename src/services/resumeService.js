// Resume Intelligence Service
// PDF text extraction: pdfjs-dist (client-side, no backend needed)
// AI parsing: Groq llama-3.3-70b-versatile

import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker — avoids Vite bundling issues with the worker thread
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function groqKey() {
  return import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
}

// ── PDF Text Extraction ───────────────────────────────────────────────────────

export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Preserve rough layout by grouping items by their Y position
    const lines = {};
    content.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      lines[y] = lines[y] ? lines[y] + ' ' + item.str : item.str;
    });

    const pageText = Object.keys(lines)
      .sort((a, b) => b - a)   // top-to-bottom
      .map(y => lines[y])
      .join('\n');

    fullText += pageText + '\n\n';
  }

  if (!fullText.trim()) throw new Error('Could not extract text from this PDF. Try a text-based (not scanned) resume.');
  return fullText;
}

// ── AI Resume Parsing ─────────────────────────────────────────────────────────

export async function parseResumeWithAI(resumeText, onStep) {
  const key = groqKey();
  if (!key) throw new Error('NO_KEY');

  onStep?.('Sending to Groq AI for intelligent parsing…');

  const prompt = `You are an expert resume parser and career intelligence AI. Analyze this resume completely.

RESUME TEXT:
---
${resumeText.slice(0, 6000)}
---

Extract ALL information and generate career insights. Return ONLY valid JSON, no markdown, no code fences:
{
  "personalInfo": {
    "name": "full name or empty string",
    "email": "email or empty string",
    "phone": "phone or empty string",
    "location": "city/state or empty string",
    "linkedin": "linkedin url or null",
    "github": "github url or null",
    "portfolio": "portfolio url or null"
  },
  "summary": "extracted or inferred professional summary (2-3 sentences)",
  "totalExperienceYears": <number or 0>,
  "skills": ["all skills as flat array"],
  "skillCategories": {
    "languages": ["Python", "JavaScript", ...],
    "frameworks": ["React", "FastAPI", ...],
    "tools": ["Git", "Docker", ...],
    "databases": ["PostgreSQL", ...],
    "cloud": ["AWS", ...],
    "other": [...]
  },
  "experience": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2023 – Present",
      "location": "city or remote",
      "highlights": ["bullet point 1", "bullet point 2", "bullet point 3"]
    }
  ],
  "education": [
    {
      "degree": "B.Tech Computer Science",
      "institution": "University Name",
      "year": "2020–2024",
      "gpa": "8.5 or null"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "1-2 sentence description",
      "technologies": ["tech1", "tech2"],
      "link": "url or null"
    }
  ],
  "certifications": ["AWS Certified Solutions Architect", ...],
  "achievements": ["achievement or award if any"],
  "atsScore": <integer 40-95, based on formatting keywords completeness>,
  "profileStrength": <integer 40-95, based on content quality>,
  "overallLevel": "Fresher|Junior|Mid|Senior|Lead",
  "hirability": <integer 40-95>,
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "skillGaps": ["gap 1", "gap 2", "gap 3"],
  "recommendations": ["actionable recommendation 1", "rec 2", "rec 3", "rec 4"],
  "targetRoles": ["best-fit role 1", "role 2", "role 3"],
  "salaryRange": "₹X–₹Y LPA (estimated for India)",
  "learningRoadmap": [
    {"skill": "skill name", "reason": "why this skill matters for your profile", "priority": "high|medium|low", "resource": "course or platform suggestion"}
  ]
}`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content ?? '';
  if (!raw) throw new Error('Empty response from AI');

  let text = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
  const s  = text.indexOf('{');
  const e  = text.lastIndexOf('}');
  if (s !== -1 && e > s) text = text.slice(s, e + 1);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`AI returned malformed JSON. Raw: ${raw.slice(0, 200)}`);
  }
}

export const RESUME_STORAGE_KEY = 'resume_parsed_data';

export function saveResumeData(data) {
  localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(data));
}

export function loadResumeData() {
  try { return JSON.parse(localStorage.getItem(RESUME_STORAGE_KEY) || 'null'); } catch { return null; }
}

export function clearResumeData() {
  localStorage.removeItem(RESUME_STORAGE_KEY);
}
