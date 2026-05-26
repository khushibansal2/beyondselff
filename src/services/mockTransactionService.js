// Mock real-time transaction stream — purely simulated, no real data.

const MOCK_POOL = [
  { merchant: 'Swiggy', category: 'Food', min: 120, max: 850, bank: 'HDFC', mode: 'UPI' },
  { merchant: 'Zomato', category: 'Food', min: 150, max: 700, bank: 'SBI', mode: 'UPI' },
  { merchant: 'Blinkit', category: 'Groceries', min: 300, max: 1500, bank: 'ICICI', mode: 'UPI' },
  { merchant: 'Zepto', category: 'Groceries', min: 200, max: 900, bank: 'Kotak', mode: 'UPI' },
  { merchant: 'Uber', category: 'Transport', min: 80, max: 600, bank: 'Axis', mode: 'UPI' },
  { merchant: 'Ola', category: 'Transport', min: 60, max: 400, bank: 'SBI', mode: 'UPI' },
  { merchant: 'Amazon', category: 'Shopping', min: 299, max: 4999, bank: 'HDFC', mode: 'Credit Card' },
  { merchant: 'Flipkart', category: 'Shopping', min: 199, max: 3499, bank: 'ICICI', mode: 'Debit Card' },
  { merchant: 'Myntra', category: 'Shopping', min: 499, max: 2999, bank: 'Axis', mode: 'Credit Card' },
  { merchant: 'Netflix', category: 'Entertainment', min: 149, max: 649, bank: 'HDFC', mode: 'Credit Card' },
  { merchant: 'Spotify', category: 'Entertainment', min: 119, max: 119, bank: 'Kotak', mode: 'UPI' },
  { merchant: 'BookMyShow', category: 'Entertainment', min: 250, max: 1200, bank: 'ICICI', mode: 'Credit Card' },
  { merchant: 'Apollo Pharmacy', category: 'Health', min: 150, max: 2000, bank: 'SBI', mode: 'UPI' },
  { merchant: 'Airtel', category: 'Bills', min: 149, max: 599, bank: 'HDFC', mode: 'Auto-debit' },
  { merchant: 'Jio', category: 'Bills', min: 179, max: 399, bank: 'SBI', mode: 'Auto-debit' },
  { merchant: 'Starbucks', category: 'Food', min: 250, max: 700, bank: 'Axis', mode: 'Credit Card' },
  { merchant: 'Rapido', category: 'Transport', min: 30, max: 200, bank: 'GPay', mode: 'UPI' },
  { merchant: 'Coursera', category: 'Education', min: 1999, max: 8999, bank: 'HDFC', mode: 'Credit Card' },
  { merchant: 'Groww', category: 'Investments', min: 500, max: 10000, bank: 'ICICI', mode: 'Net Banking' },
  { merchant: 'PVR Cinemas', category: 'Entertainment', min: 300, max: 1200, bank: 'Axis', mode: 'Credit Card' },
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let counter = 0;

export function generateMockTransaction() {
  const template = MOCK_POOL[randInt(0, MOCK_POOL.length - 1)];
  const amount = randInt(template.min, template.max);
  counter++;
  return {
    id: Date.now() + counter,
    amount,
    merchant: template.merchant,
    category: template.category,
    bank: template.bank,
    type: 'Debit',
    paymentMode: template.mode,
    rawMessage: `Rs. ${amount} spent on ${template.merchant} via ${template.bank} ${template.mode}. Balance: Rs. ${randInt(5000, 50000)}.`,
    parsedAt: new Date().toISOString(),
    source: 'live',
  };
}

export const SPEED_OPTIONS = {
  Slow: 8000,
  Normal: 4000,
  Fast: 1800,
};
