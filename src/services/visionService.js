// Vision Service — powered by Groq (llama-3.2-11b-vision)
import { stripDocumentPII } from '../utils/piiStrip.js';
// Free tier: 14,400 req/day, no credit card, no regional restrictions
// Get a free key at console.groq.com → API Keys

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

function getApiKey() {
  const key = import.meta.env.VITE_GROQ_API_KEY
    || localStorage.getItem('groq_api_key')
    || '';
  console.log('[VisionService] key:', key ? key.slice(0, 12) + '...' : 'NONE');
  return key;
}

export function saveApiKey(key) {
  if (key) localStorage.setItem('groq_api_key', key.trim());
  else localStorage.removeItem('groq_api_key');
}

export function hasApiKey() {
  return !!(import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key'));
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
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl.split(',')[1]);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function extractJson(raw) {
  let text = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

async function callVision(prompt, imageFile) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_KEY');

  const base64 = await fileToBase64(imageFile);
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      }],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[VisionService] HTTP error:', res.status, errText.slice(0, 300));
    throw new Error(`${res.status}::${errText}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Empty response from Groq');

  try {
    return extractJson(raw);
  } catch {
    throw new Error(`JSON parse failed. Raw: ${raw.slice(0, 200)}`);
  }
}

function handleError(err) {
  console.error('[VisionService] error:', err.message?.slice(0, 200));
  if (err.message === 'NO_KEY')
    throw new Error('NO_KEY');
  if (err.message?.includes('401') || err.message?.includes('invalid_api_key'))
    throw new Error('Invalid API key. Please re-enter your Groq API key.');
  if (err.message?.includes('429') || err.message?.includes('rate_limit'))
    throw new Error('QUOTA_EXCEEDED');
  throw new Error(err.message || 'Unknown error');
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const MEAL_PROMPT = `Look at this image very carefully. Identify EXACTLY what food is shown.
If you see a pizza, say pizza. If you see a burger, say burger. Be specific about the actual food visible.

Return ONLY a raw JSON object — no markdown, no backticks, no extra text.
Keys: "foodName" (exact food name, string), "calories" (integer), "protein" (grams, integer),
"carbs" (grams, integer), "fat" (grams, integer), "fiber" (grams, integer),
"healthScore" (0-100, integer), "portionSize" (string), "tags" (string array, max 3).

Example: {"foodName":"Pepperoni Pizza (2 slices)","calories":560,"protein":24,"carbs":62,"fat":24,"fiber":4,"healthScore":45,"portionSize":"2 slices (~200g)","tags":["high-carb","cheesy","comfort-food"]}`;

const SUPPLEMENT_PROMPT = `Analyze this supplement/product label image.
Return ONLY a raw JSON object — no markdown, no backticks, no extra text.
Keys: "productName" (string), "brand" (string), "servingSize" (string),
"keyIngredients" (array of {name, amount}, max 6), "calories" (integer),
"mainBenefit" (string), "warnings" (string or "None").`;

const DOCUMENT_PROMPT = `Analyze this document image and extract all key information.
Identify the document type, then extract all relevant fields.

Return ONLY a raw JSON object — no markdown, no backticks, no extra text.
Keys:
- "docType": one of "salary_slip"|"hospital_bill"|"lab_report"|"utility_bill"|"bank_statement"|"invoice"|"unknown"
- "confidence": integer 0-100
- "summary": one sentence describing the document
- "fields": array of {label, value, category} covering all key data
  - salary_slip: grossSalary, netSalary, employer, employeeName, month, deductions
  - hospital_bill: totalAmount, hospitalName, date, patientName, diagnosis
  - lab_report: testName, date, labName, all test results with normal/abnormal
  - utility_bill: amount, provider, billMonth, utilityType
  - bank_statement: accountHolder, bankName, period, closingBalance, totalCredits, totalDebits
- "logTo": "finance"|"health"|"both"|"none"
- "autoFill": {income (number)} for salary, {expenses (number), expenseCategory (string)} for bills

Example salary slip: {"docType":"salary_slip","confidence":92,"summary":"Salary slip for March 2024 from Infosys","fields":[{"label":"Employer","value":"Infosys Ltd","category":"employer"},{"label":"Month","value":"March 2024","category":"period"},{"label":"Gross Salary","value":"65000","category":"income"},{"label":"Net Salary","value":"54200","category":"income"},{"label":"Deductions","value":"10800","category":"deduction"}],"logTo":"finance","autoFill":{"income":54200}}`;

// ── Exports ───────────────────────────────────────────────────────────────────

export async function analyzeMealImage(imageFile) {
  try { return await callVision(MEAL_PROMPT, imageFile); }
  catch (err) { handleError(err); }
}

export async function analyzeSupplementImage(imageFile) {
  try { return await callVision(SUPPLEMENT_PROMPT, imageFile); }
  catch (err) { handleError(err); }
}

export async function analyzeDocument(imageFile) {
  try {
    const result = await callVision(DOCUMENT_PROMPT, imageFile);
    return stripDocumentPII(result);
  }
  catch (err) { handleError(err); }
}

// ── Demo fallbacks ────────────────────────────────────────────────────────────

export function getDemoMealResult() {
  const MEALS = [
    { foodName: 'Grilled Chicken & Rice Bowl', calories: 520, protein: 42, carbs: 55, fat: 12, fiber: 4, healthScore: 84, portionSize: '1 bowl (~400g)', tags: ['high-protein', 'balanced'] },
    { foodName: 'Avocado Toast with Eggs', calories: 440, protein: 18, carbs: 34, fat: 26, fiber: 8, healthScore: 88, portionSize: '2 slices (~250g)', tags: ['high-fiber', 'healthy-fats'] },
    { foodName: 'Margherita Pizza (2 slices)', calories: 510, protein: 18, carbs: 64, fat: 20, fiber: 3, healthScore: 48, portionSize: '2 slices (~200g)', tags: ['high-carb', 'comfort-food'] },
  ];
  return MEALS[Math.floor(Math.random() * MEALS.length)];
}

export function getDemoSupplementResult() {
  return { productName: 'Whey Protein Isolate', brand: 'Demo Brand', servingSize: '1 scoop (30g)', keyIngredients: [{ name: 'Whey Protein', amount: '25g' }, { name: 'BCAAs', amount: '2.5g' }], calories: 120, mainBenefit: 'Supports muscle recovery.', warnings: 'Contains milk.' };
}
