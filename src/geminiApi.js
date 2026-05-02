const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const commaIdx = result.indexOf(',');
      resolve(result.slice(commaIdx + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildPrompt(categories) {
  const incomeList = categories.income.join(', ');
  const expenseList = categories.expense.join(', ');
  return `You extract financial transactions from images.

The image is either:
- A single receipt/invoice (extract ONE transaction, almost always an expense)
- A bank or credit-card statement (extract MULTIPLE transactions — one per row)
- A photo of any document showing transactions with dates and amounts

For each transaction, extract:
- date: ISO format YYYY-MM-DD. If only partial date is visible, use best guess; if no date at all, use today.
- type: "income" or "expense". For statements, negative / debit / "withdrawal" entries are expenses; positive / credit / "deposit" / "payroll" entries are income. For receipts: always expense.
- category: Pick the BEST match from the lists below. If nothing fits, use "Other".
- amount: positive number only, no currency symbol, no commas. e.g. 45.50
- description: merchant or short transaction description (<= 60 chars)

Available income categories: ${incomeList}
Available expense categories: ${expenseList}

Return ONLY a JSON array, no prose, no markdown fences. Example:
[{"date":"2026-04-19","type":"expense","category":"Food","amount":12.50,"description":"Starbucks"}]

If the image has no readable financial data, return [].`;
}

function validateEntries(raw, categories) {
  if (!Array.isArray(raw)) return [];
  const validTypes = new Set(['income', 'expense']);
  return raw
    .filter((e) => e && validTypes.has(e.type) && typeof e.amount === 'number' && e.amount > 0)
    .map((e) => {
      const type = e.type;
      const pool = categories[type] || [];
      const category = pool.includes(e.category) ? e.category : 'Other';
      const date = /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : new Date().toISOString().slice(0, 10);
      return {
        date,
        type,
        category,
        amount: Math.round(e.amount * 100) / 100,
        description: typeof e.description === 'string' ? e.description.slice(0, 200) : '',
      };
    });
}

export async function parseFinancialImage(file, categories, apiKey, model = DEFAULT_MODEL) {
  if (!apiKey) throw new Error('Gemini API key is not set. Open Settings to add one.');
  if (!file) throw new Error('No file provided');
  if (file.size > MAX_FILE_BYTES) throw new Error('File too large (max 10 MB)');
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
  }

  const base64 = await fileToBase64(file);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: file.type, data: base64 } },
          { text: buildPrompt(categories) },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = `Gemini API error ${res.status}`;
    try {
      const err = JSON.parse(errText);
      if (err.error?.message) msg += `: ${err.error.message}`;
    } catch {
      msg += `: ${errText.slice(0, 200)}`;
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from model');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Model returned invalid JSON:\n${text.slice(0, 300)}`);
  }

  return validateEntries(parsed, categories);
}
