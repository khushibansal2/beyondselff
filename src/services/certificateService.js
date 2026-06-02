/**
 * Career Certificate / Document Parser
 *
 * Handles certificates, diplomas, transcripts, and professional documents.
 * Supports both image uploads (vision model) and PDF (text extraction + LLM).
 *
 * Returns structured data + a career-domain patch with extracted skills and certifications.
 */

import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const GROQ_URL        = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_VIS_MODEL  = 'meta-llama/llama-4-scout-17b-16e-instruct';

function groqKey() {
  return import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
}

function extractJson(raw) {
  let text = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s !== -1 && e > s) text = text.slice(s, e + 1);
  return JSON.parse(text);
}

async function extractPdfText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lines   = {};
    content.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      lines[y] = lines[y] ? lines[y] + ' ' + item.str : item.str;
    });
    text += Object.keys(lines).sort((a, b) => b - a).map(y => lines[y]).join('\n') + '\n\n';
  }
  return text;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else                { width  = Math.round(width  * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Prompt schema ─────────────────────────────────────────────────────────────

const CERT_SCHEMA = `{
  "certType": "professional_cert" | "course_completion" | "degree" | "transcript" | "award" | "other",
  "certificationName": "<full name of the certification or degree>",
  "issuingOrganization": "<AWS, Google, Coursera, university name, etc.>",
  "recipientName": "<name on the certificate or null>",
  "issueDate": "<Month YYYY or null>",
  "expiryDate": "<Month YYYY or null>",
  "credentialId": "<ID or null>",
  "skills": ["<skill or technology 1>", "<skill or technology 2>"],
  "level": "beginner" | "intermediate" | "advanced" | "professional" | null,
  "score": "<grade/score if on certificate, or null>",
  "summary": "<one sentence describing what this document certifies>"
}`;

const CERT_PROMPT_IMAGE = `You are a career document parser. Read this certificate/document image carefully.

Extract all relevant information and return ONLY valid JSON — no markdown:
${CERT_SCHEMA}

For skills: infer from the certification topic (e.g. "AWS Certified Developer" → ["AWS", "Cloud", "Lambda", "S3"])
Be specific — extract the actual technologies and skills the document certifies.`;

const CERT_PROMPT_TEXT = (text) => `You are a career document parser. Extract certification/qualification data from this document text.

DOCUMENT TEXT:
---
${text.slice(0, 4000)}
---

Return ONLY valid JSON — no markdown:
${CERT_SCHEMA}

For skills: infer from the certification topic (e.g. "AWS Certified Developer" → ["AWS", "Cloud", "Lambda", "S3"])`;

// ── Career domain patch builder ───────────────────────────────────────────────

export function buildCareerPatch(parsed, existingCareer = {}) {
  const existingSkills = existingCareer.skills || [];
  const existingCerts  = existingCareer.certifications || [];

  // Merge new skills deduped
  const newSkills = (parsed.skills || []).filter(
    s => !existingSkills.some(e => e.toLowerCase() === s.toLowerCase())
  );
  const mergedSkills = [...existingSkills, ...newSkills];

  // Append certification record
  const certRecord = {
    id:           `cert-${Date.now()}`,
    name:         parsed.certificationName || 'Unknown Certificate',
    issuer:       parsed.issuingOrganization || '',
    issuedAt:     parsed.issueDate || '',
    expiresAt:    parsed.expiryDate || '',
    credentialId: parsed.credentialId || '',
    skills:       parsed.skills || [],
    level:        parsed.level || '',
    score:        parsed.score || '',
    addedAt:      new Date().toISOString(),
  };
  const mergedCerts = [...existingCerts, certRecord];

  return { skills: mergedSkills, certifications: mergedCerts };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Parse a career certificate (PDF or image).
 * Returns { certificationName, issuingOrganization, skills[], summary, ... , careerPatch }
 */
export async function parseCertificate(file, existingCareer = {}) {
  const key = groqKey();
  if (!key) throw new Error('NO_KEY');

  const isPdf   = file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/');

  if (!isPdf && !isImage) throw new Error('Unsupported file type. Upload a PDF or image of your certificate.');

  let result;

  if (isPdf) {
    const text = await extractPdfText(file);
    if (!text.trim()) throw new Error('Could not extract text from PDF. Try uploading an image of the certificate instead.');

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_TEXT_MODEL,
        messages: [{ role: 'user', content: CERT_PROMPT_TEXT(text) }],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });
    if (!res.ok) throw new Error(`Groq error ${res.status}`);
    const data = await res.json();
    result = extractJson(data.choices?.[0]?.message?.content ?? '');

  } else {
    const base64  = await fileToBase64(file);
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_VIS_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: CERT_PROMPT_IMAGE },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });
    if (!res.ok) throw new Error(`Groq vision error ${res.status}`);
    const data = await res.json();
    result = extractJson(data.choices?.[0]?.message?.content ?? '');
  }

  return { ...result, careerPatch: buildCareerPatch(result, existingCareer) };
}

// ── Demo fallback ─────────────────────────────────────────────────────────────

export function getDemoCertResult() {
  return {
    certType: 'professional_cert',
    certificationName: 'AWS Certified Developer – Associate',
    issuingOrganization: 'Amazon Web Services',
    recipientName: 'Demo User',
    issueDate: 'Jan 2025',
    expiryDate: 'Jan 2028',
    credentialId: 'AWS-DEV-2025-DEMO',
    skills: ['AWS', 'Lambda', 'S3', 'DynamoDB', 'API Gateway', 'CloudFormation', 'IAM'],
    level: 'intermediate',
    score: null,
    summary: 'AWS Developer Associate certification validating expertise in building and deploying cloud-native applications on AWS.',
    careerPatch: {
      skills: ['AWS', 'Lambda', 'S3', 'DynamoDB', 'API Gateway', 'CloudFormation', 'IAM'],
      certifications: [{
        id: 'cert-demo',
        name: 'AWS Certified Developer – Associate',
        issuer: 'Amazon Web Services',
        issuedAt: 'Jan 2025',
        expiresAt: 'Jan 2028',
        credentialId: 'AWS-DEV-2025-DEMO',
        skills: ['AWS', 'Lambda', 'S3', 'DynamoDB', 'API Gateway'],
        level: 'intermediate',
      }],
    },
  };
}
