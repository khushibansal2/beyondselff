/**
 * Medical Report / Lab Result Parser
 *
 * Handles both:
 *   - Image uploads  → Groq llama-4-scout vision model
 *   - PDF uploads    → pdfjs-dist text extraction → Groq llama-3.3-70b text model
 *
 * Returns structured lab data + a health-domain patch ready for updateDomain('health', patch).
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

// ── PDF text extraction (reuse pdfjs like resumeService) ─────────────────────

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

// ── File → base64 for vision model ───────────────────────────────────────────

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

// ── Prompt ────────────────────────────────────────────────────────────────────

const LAB_SCHEMA = `{
  "reportType": "<e.g. Complete Blood Count | Lipid Profile | Thyroid | HbA1c | LFT | KFT | Vitamin Panel | etc.>",
  "labName": "<lab/hospital name or null>",
  "patientName": "<patient name or null>",
  "reportDate": "<DD Mon YYYY or null>",
  "markers": [
    {
      "name": "<test name>",
      "value": <numeric value or null>,
      "unit": "<unit string>",
      "referenceMin": <number or null>,
      "referenceMax": <number or null>,
      "status": "normal" | "low" | "high" | "critical",
      "interpretation": "<one sentence clinical note>"
    }
  ],
  "summary": "<two sentence overall health interpretation>",
  "flags": ["<any critical or borderline finding>"]
}`;

const LAB_PROMPT_TEXT = (text) => `You are a medical lab report parser. Extract all test results from this lab report text.

LAB REPORT TEXT:
---
${text.slice(0, 6000)}
---

Return ONLY valid JSON matching this schema exactly — no markdown fences:
${LAB_SCHEMA}

Rules:
- Extract every test marker present (CBC, glucose, cholesterol, creatinine, TSH, vitamins, etc.)
- Determine status by comparing value to the reference range in the report
- If reference range is not in the report, use standard clinical norms
- Numeric values only (no units in the value field)`;

const LAB_PROMPT_IMAGE = `You are a medical lab report reader. Carefully read this lab report image and extract ALL test results shown.

Return ONLY valid JSON matching this schema exactly — no markdown fences:
${LAB_SCHEMA}

Extract every row in the results table including test name, result value, unit, reference range, and whether it is normal/abnormal.`;

// ── Health domain patch from markers ─────────────────────────────────────────

// Maps common lab marker names → health domain fields
const MARKER_MAP = {
  // Blood sugar
  'glucose': 'bloodSugar', 'fasting glucose': 'bloodSugar', 'blood glucose': 'bloodSugar',
  'hba1c': 'hba1c', 'glycated hemoglobin': 'hba1c',
  // Lipids
  'total cholesterol': 'cholesterol', 'cholesterol': 'cholesterol',
  'ldl': 'ldlCholesterol', 'hdl': 'hdlCholesterol',
  'triglycerides': 'triglycerides',
  // CBC
  'hemoglobin': 'hemoglobin', 'hgb': 'hemoglobin',
  'rbc': 'rbc', 'wbc': 'wbc', 'platelets': 'platelets',
  // Thyroid
  'tsh': 'tsh', 'thyroid stimulating hormone': 'tsh',
  't3': 't3', 't4': 't4',
  // Kidneys
  'creatinine': 'creatinine', 'urea': 'urea', 'bun': 'bun',
  // Liver
  'alt': 'alt', 'ast': 'ast', 'bilirubin': 'bilirubin',
  // Vitamins
  'vitamin d': 'vitaminD', 'vitamin b12': 'vitaminB12',
  // BMI-adjacent
  'bmi': 'bmi',
};

export function buildHealthPatch(markers = []) {
  const patch = { labResults: markers, lastLabDate: new Date().toISOString().split('T')[0] };
  const flagged = [];

  for (const m of markers) {
    const key = MARKER_MAP[m.name?.toLowerCase()?.trim()];
    if (key && m.value != null) patch[key] = m.value;
    if (m.status === 'high' || m.status === 'low' || m.status === 'critical') {
      flagged.push(`${m.name}: ${m.value} ${m.unit} (${m.status})`);
    }
  }

  if (flagged.length) patch.labFlags = flagged;
  return patch;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Parse a medical report file (PDF or image).
 * Returns { reportType, labName, patientName, reportDate, markers[], summary, flags[], healthPatch }
 */
export async function parseMedicalReport(file) {
  const key = groqKey();
  if (!key) throw new Error('NO_KEY');

  const isPdf  = file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/');

  if (!isPdf && !isImage) throw new Error('Unsupported file type. Upload a PDF or image of your lab report.');

  let result;

  if (isPdf) {
    // Extract text then use text model
    const text = await extractPdfText(file);
    if (!text.trim()) throw new Error('Could not extract text from PDF. Try uploading a photo/image of the report instead.');

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_TEXT_MODEL,
        messages: [{ role: 'user', content: LAB_PROMPT_TEXT(text) }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) throw new Error(`Groq error ${res.status}`);
    const data = await res.json();
    result = extractJson(data.choices?.[0]?.message?.content ?? '');

  } else {
    // Image — use vision model
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
            { type: 'text', text: LAB_PROMPT_IMAGE },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) throw new Error(`Groq vision error ${res.status}`);
    const data = await res.json();
    result = extractJson(data.choices?.[0]?.message?.content ?? '');
  }

  return { ...result, healthPatch: buildHealthPatch(result.markers || []) };
}

// ── Demo fallback ─────────────────────────────────────────────────────────────

export function getDemoLabResult() {
  return {
    reportType: 'Complete Blood Count + Lipid Profile',
    labName: 'Demo Diagnostics Pvt Ltd',
    patientName: 'Demo User',
    reportDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    markers: [
      { name: 'Hemoglobin',        value: 13.2, unit: 'g/dL', referenceMin: 12,   referenceMax: 17,   status: 'normal',   interpretation: 'Within normal range.' },
      { name: 'Total Cholesterol', value: 215,  unit: 'mg/dL',referenceMin: null, referenceMax: 200,  status: 'high',     interpretation: 'Borderline high. Consider dietary changes.' },
      { name: 'LDL',               value: 138,  unit: 'mg/dL',referenceMin: null, referenceMax: 130,  status: 'high',     interpretation: 'Slightly elevated LDL. Reduce saturated fats.' },
      { name: 'HDL',               value: 52,   unit: 'mg/dL',referenceMin: 40,   referenceMax: null, status: 'normal',   interpretation: 'Good protective cholesterol level.' },
      { name: 'Glucose (Fasting)', value: 94,   unit: 'mg/dL',referenceMin: 70,   referenceMax: 100,  status: 'normal',   interpretation: 'Normal fasting glucose.' },
      { name: 'TSH',               value: 2.8,  unit: 'μIU/mL',referenceMin: 0.5, referenceMax: 5.0,  status: 'normal',   interpretation: 'Thyroid function normal.' },
    ],
    summary: 'Overall health markers are mostly within normal limits. Lipid profile shows borderline elevated cholesterol that warrants monitoring.',
    flags: ['Total Cholesterol: 215 mg/dL (high)', 'LDL: 138 mg/dL (high)'],
    healthPatch: {
      cholesterol: 215, ldlCholesterol: 138, hdlCholesterol: 52,
      bloodSugar: 94, hemoglobin: 13.2, tsh: 2.8,
      labFlags: ['Total Cholesterol: 215 mg/dL (high)', 'LDL: 138 mg/dL (high)'],
      lastLabDate: new Date().toISOString().split('T')[0],
    },
  };
}
