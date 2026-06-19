/**
 * piiStrip.js — Client-side PII stripping utilities.
 *
 * Two concerns:
 *   1. Raw text (SMS) — regex scrub before any storage or logging
 *   2. Structured AI results — remove identity fields from Groq-returned JSON
 *      before the result is shown in the UI or written to context/localStorage
 *
 * None of this touches image bytes — we cannot redact PII from a JPEG before
 * it is sent to the vision model. That is a known limitation documented below.
 */

// ── Text / SMS stripping ─────────────────────────────────────────────────────

const TEXT_RULES = [
  // Indian mobile numbers  (10 digits starting 6-9)
  { label: 'phone',      re: /\b[6-9]\d{9}\b/g,                                        sub: '[PHONE]'   },
  // UPI VPAs  (anything@anything)
  { label: 'upi_id',     re: /\b[\w.+%-]{2,}@[\w]{2,}\b/g,                             sub: '[UPI_ID]'  },
  // Bank account patterns  (XX**1234, acct no XXXXX1234, A/c 001234)
  { label: 'account',    re: /\b(?:[Xx*]{2,}\d{2,6}|\d{9,18})\b/g,                     sub: '[ACCT]'    },
  // Available balance / credit limit disclosures
  { label: 'balance',    re: /(?:avl\.?\s*)?(?:bal(?:ance)?|limit)\s*(?:Rs\.?|INR|₹)?\s*[\d,]+(?:\.\d{1,2})?/gi, sub: '[BAL]' },
  // UPI / transaction reference numbers (long digit strings after keywords)
  { label: 'ref',        re: /(?:UPI\s*Ref(?:\.?\s*No\.?)?|Ref\.?\s*No\.?|Txn\.?\s*(?:Id|No)|Transaction\s*(?:Id|No|Ref))\s*:?\s*[\w\d]+/gi, sub: '[REF]' },
  // Order / booking IDs  (alphanumeric, typically 8-20 chars, after #)
  { label: 'order_id',   re: /(?:#|Order\s*(?:Id|No|#)?:?\s*)[\w\d-]{5,24}/gi,          sub: '[ORDER_ID]' },
  // Card last-4 patterns  ("Card 1234", "Card ending 1234", "XX1234")
  { label: 'card',       re: /(?:card\s*(?:no\.?|ending|xx+)?|debit\s+card|credit\s+card)\s*[\dXx]{4,}/gi, sub: '[CARD]' },
  // Email addresses
  { label: 'email',      re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,            sub: '[EMAIL]'   },
];

/**
 * Scrub PII from a raw SMS / message string.
 * Returns the sanitised string — all matched patterns replaced with tokens.
 */
export function stripTextPII(text) {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  for (const { re, sub } of TEXT_RULES) {
    out = out.replace(re, sub);
  }
  return out;
}

// ── Structured AI result stripping ──────────────────────────────────────────

/**
 * Fields in Groq-returned JSON that contain personal identity information.
 * These are set to null before the result reaches the UI or DataContext.
 *
 * NOTE: numeric/clinical values (amounts, test results, balances) are kept —
 * those are the useful signals. Only direct identifiers are removed.
 */
const IDENTITY_FIELD_KEYS = new Set([
  'patientName',
  'recipientName',
  'accountHolder',
  'employeeName',
  'holderName',
  'name',        // top-level generic name fields
]);

/**
 * Field labels inside the `fields` array (salary slip, hospital bill, etc.)
 * whose VALUE is a personal name or account identifier.
 * Matched case-insensitively as a substring of the label string.
 */
const IDENTITY_LABEL_SUBSTRINGS = [
  'patient', 'employee', 'account holder', 'holder', 'recipient',
  'member', 'insured', 'subscriber', 'customer name',
];

/**
 * Strip direct identity fields from a Groq document analysis result.
 *
 * Works on the objects returned by:
 *   - analyzeDocument()   (visionService)
 *   - parseMedicalReport() (medicalReportService)
 *   - parseCertificate()  (certificateService)
 *
 * Mutates a shallow clone — does not modify the original object.
 */
export function stripDocumentPII(result) {
  if (!result || typeof result !== 'object') return result;

  const out = { ...result };

  // Nullify top-level identity keys
  for (const key of Object.keys(out)) {
    if (IDENTITY_FIELD_KEYS.has(key)) {
      out[key] = null;
    }
  }

  // Scrub identity values inside the `fields` array
  if (Array.isArray(out.fields)) {
    out.fields = out.fields.map(f => {
      if (!f || typeof f !== 'object') return f;
      const labelLower = (f.label || '').toLowerCase();
      const isIdentity = IDENTITY_LABEL_SUBSTRINGS.some(sub => labelLower.includes(sub));
      return isIdentity ? { ...f, value: '[REDACTED]' } : f;
    });
  }

  // Propagate into nested patches if present
  if (out.healthPatch) out.healthPatch = stripDocumentPII(out.healthPatch);
  if (out.careerPatch) out.careerPatch = stripCareerPatchPII(out.careerPatch);

  return out;
}

/**
 * Strip recipient names from certificate careerPatch objects.
 * Skills and certification metadata are kept intact.
 */
function stripCareerPatchPII(patch) {
  if (!patch || typeof patch !== 'object') return patch;
  const out = { ...patch };
  if (Array.isArray(out.certifications)) {
    out.certifications = out.certifications.map(c => {
      const cleaned = { ...c };
      // credentialId can identify a person — redact it
      if (cleaned.credentialId) cleaned.credentialId = '[REDACTED]';
      return cleaned;
    });
  }
  return out;
}

/**
 * KNOWN LIMITATION — image bytes:
 * When a file is sent as base64 to the Groq vision API, the raw image content
 * (which may contain visible names, addresses, account numbers) leaves the
 * browser before we can redact it. Client-side image PII redaction would
 * require running a full OCR pass (e.g. Tesseract.js) first, locating bounding
 * boxes for text regions, blacking them out on canvas, then re-encoding —
 * significantly increasing latency. The current mitigation is to scrub all
 * identity fields from the structured JSON result that comes back.
 */
