import Tesseract from 'tesseract.js';

/**
 * Extracts text from an image using Tesseract.js
 * @param {File|string} imageFile - The uploaded image file or URL
 * @param {Function} progressCallback - Optional callback for tracking progress (0-100)
 * @returns {Promise<string>} The extracted raw text
 */
export async function extractTextFromImage(imageFile, progressCallback) {
  try {
    const result = await Tesseract.recognize(
      imageFile,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text' && progressCallback) {
            progressCallback(Math.round(m.progress * 100));
          }
        }
      }
    );
    return result.data.text;
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Failed to extract text from receipt image.");
  }
}

/**
 * Parses raw receipt text to find the total amount and a likely category.
 * Uses deterministic regex heuristics.
 * 
 * @param {string} text - The raw OCR text
 * @returns {object} Extracted data: { amount, category, confidence }
 */
export function parseReceiptData(text) {
  const lines = text.split('\n').map(l => l.trim().toLowerCase());
  
  let totalAmount = 0;
  let category = 'other';
  let confidence = 50;
  
  // Try to find a total amount using keywords
  const amountRegex = /(?:total|amount|due|balance|sum|₹|rs\.?)\s*[:=\-]?\s*[₹]?\s*(\d+(?:[.,]\d{2})?)/i;
  
  let foundTotalKeyword = false;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.includes('total') || line.includes('amount') || line.includes('pay')) {
      const match = line.match(amountRegex);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(val) && val > 0) {
          totalAmount = val;
          foundTotalKeyword = true;
          confidence += 30;
          break; // Use the first matching line from bottom up
        }
      }
    }
  }

  // If keyword search failed, look for currency symbols
  if (totalAmount === 0) {
    const fallbackRegex = /[₹$]\s*(\d+(?:[.,]\d{2})?)/g;
    const matches = [...text.matchAll(fallbackRegex)];
    if (matches.length > 0) {
      const amounts = matches.map(m => parseFloat(m[1].replace(',', '.')));
      totalAmount = Math.max(...amounts); // Guess the largest currency amount is the total
      confidence += 10;
    }
  }

  // Categorization heuristics based on keywords
  const fullText = text.toLowerCase();
  if (fullText.match(/restaurant|cafe|food|swiggy|zomato|pizza|burger|menu|dining|bakes|kitchen/)) {
    category = 'food';
    confidence += 10;
  } else if (fullText.match(/uber|ola|taxi|cab|train|metro|flight|fuel|petrol|hpcl|bpcl/)) {
    category = 'transport';
    confidence += 10;
  } else if (fullText.match(/amazon|flipkart|myntra|supermarket|grocery|mart|store|reliance|dmart/)) {
    category = 'shopping';
    confidence += 10;
  } else if (fullText.match(/netflix|spotify|prime|subscription|membership/)) {
    category = 'subscriptions';
    confidence += 10;
  } else if (fullText.match(/electricity|water|wifi|broadband|bill|recharge|airtel|jio/)) {
    category = 'bills';
    confidence += 10;
  }

  return {
    amount: Math.round(totalAmount),
    category,
    confidence: Math.min(100, confidence)
  };
}
