/**
 * Turns a spoken (or typed) sentence into a draft finance entry.
 *
 * Examples it understands:
 *   "Spent $45 at Chipotle yesterday"              -> expense, Dining, one-time
 *   "Netflix subscription 15.99 a month"           -> expense, Entertainment, monthly
 *   "Got paid 2,700 every two weeks from work"     -> income, monthly (converted to $5,850/mo)
 *   "I owe 5000 on my credit card at 22 percent
 *    with a 150 minimum"                           -> new debt
 *   "Paid 800 toward the Kia"                      -> payment on an existing debt
 *
 * It's rule-based and runs entirely in the browser — nothing is sent anywhere.
 */
import { toISODate } from './store.js';

// ---------- number words -> digits ("forty five" -> "45") ----------

const UNITS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES = { hundred: 100, thousand: 1000, million: 1e6 };
const NUM_WORD = [...Object.keys(UNITS), ...Object.keys(TENS), ...Object.keys(SCALES)].join('|');
const NUM_SEQ = new RegExp(
  `\\b(?:a[\\s-]+(?:hundred|thousand|million)|${NUM_WORD})(?:[\\s-]+(?:and[\\s-]+)?(?:${NUM_WORD}))*\\b`,
  'gi',
);

function wordsToDigits(text) {
  return text.replace(NUM_SEQ, (match) => {
    const words = match.toLowerCase().split(/[\s-]+/).filter((w) => w !== 'and');
    let total = 0;
    let current = 0;
    for (const w of words) {
      if (w === 'a') current = 1;
      else if (w in UNITS) current += UNITS[w];
      else if (w in TENS) current += TENS[w];
      else if (w === 'hundred') current = (current || 1) * 100;
      else {
        total += (current || 1) * SCALES[w];
        current = 0;
      }
    }
    return String(total + current);
  });
}

// ---------- amounts ----------

const AMOUNT_RE = /(\$\s?)?(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?(\s*(?:k\b|thousand\b|grand\b|million\b))?/gi;

function findNumbers(text) {
  const found = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const after = text.slice(m.index + m[0].length);
    if (/^(st|nd|rd|th)\b/i.test(after)) continue; // "15th of the month"
    let value = parseFloat(m[2].replace(/,/g, '') + (m[3] ?? ''));
    const scale = m[4]?.trim().toLowerCase();
    if (scale === 'k' || scale === 'thousand' || scale === 'grand') value *= 1000;
    if (scale === 'million') value *= 1e6;
    const percent = /^\s*(%|percent|per cent)/i.test(after);
    const explicitMoney = Boolean(m[1]) || /^\s*(dollars?|bucks|usd)\b/i.test(after);
    const yearLike = !explicitMoney && !m[3] && value >= 1900 && value <= 2099;
    found.push({ value, index: m.index, end: m.index + m[0].length, percent, explicitMoney, yearLike });
  }
  return found;
}

/** Text between the previous number and this one / this one and the next — used to read labels like "minimum". */
function contextFor(text, nums, i) {
  const start = Math.max(i > 0 ? nums[i - 1].end : 0, nums[i].index - 30);
  const end = Math.min(i < nums.length - 1 ? nums[i + 1].index : text.length, nums[i].end + 20);
  return {
    before: text.slice(start, nums[i].index).toLowerCase(),
    after: text.slice(nums[i].end, end).toLowerCase(),
  };
}

function pickPrimary(nums) {
  const money = nums.filter((n) => !n.percent);
  return money.find((n) => n.explicitMoney) ?? money.find((n) => !n.yearLike) ?? money[0];
}

// ---------- frequency ----------

const FREQUENCIES = [
  { re: /\b(every (two|2|other) weeks?|bi-?weekly|every paycheck)\b/, factor: 26 / 12, label: 'every 2 weeks' },
  { re: /\b(every week|each week|per week|a week|weekly)\b/, factor: 52 / 12, label: 'weekly' },
  { re: /\b(every year|each year|per year|a year|yearly|annually|annual)\b/, factor: 1 / 12, label: 'yearly' },
  { re: /\b(every month|each month|per month|a month|monthly|subscription|recurring|rent)\b|\/mo\b/, factor: 1, label: 'monthly' },
];

// ---------- categories ----------

const CATEGORY_KEYWORDS = [
  ['Groceries', ['grocer', 'costco', 'walmart', 'trader joe', 'whole foods', 'safeway', 'aldi', 'kroger', 'giant', 'wegmans', 'publix', 'food lion', 'harris teeter', "sam's club", 'supermarket', 'lidl', 'meal prep']],
  ['Dining', ['restaurant', 'cava', 'chipotle', 'coffee', 'starbucks', 'dunkin', 'lunch', 'dinner', 'breakfast', 'brunch', 'takeout', 'take out', 'doordash', 'uber eats', 'grubhub', 'pizza', 'burger', 'mcdonald', 'chick-fil-a', 'sushi', 'drinks', 'cafe', 'dining', 'sweetgreen', 'panera']],
  ['Bills', ['rent', 'utilit', 'electric', 'water bill', 'internet', 'wifi', 'phone bill', 'insurance', 'mortgage', 'verizon', 'comcast', 'xfinity', 't-mobile', 'at&t', 'bge', 'pepco']],
  ['Gas', ['gas', 'fuel', 'shell', 'exxon', 'chevron', 'sunoco', 'wawa', 'sheetz', 'fill up', 'filled up']],
  ['Transport', ['uber', 'lyft', 'parking', 'toll', 'metro', 'train', 'bus fare', 'taxi', 'car wash', 'oil change', 'flight', 'airline', 'tires']],
  ['Shopping', ['amazon', 'target', 'clothes', 'clothing', 'shoes', 'best buy', 'apple store', 'mall', 'nike', 'ikea', 'home depot', 'lowes']],
  ['Entertainment', ['netflix', 'spotify', 'hulu', 'disney', 'youtube', 'hbo', 'movie', 'cinema', 'concert', 'tickets', 'video game', 'steam', 'playstation', 'xbox', 'gemini', 'chatgpt', 'subscription', 'apple music']],
  ['Health', ['doctor', 'dentist', 'pharmacy', 'cvs', 'walgreens', 'gym', 'medicine', 'hospital', 'therapy', 'copay', 'vitamin', 'prescription']],
];

function detectCategory(text) {
  const lower = text.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(lower))) {
      return category;
    }
  }
  return 'Other';
}

// ---------- names ----------

const STOP = String.raw`(?=\s+(?:for|on|at|with|every|each|per|a month|a week|a year|monthly|weekly|yearly|today|yesterday|last|this|and|which|that|because|using|via|by|in|of)\b|[.,!?]|$)`;
const FILLER = new Set(
  ('i im i\'m me my we our the a an some just today yesterday tonight last night this morning spent spend paid pay ' +
    'bought buy got get was is it that cost costs for on at from to of with add new expense income debt ' +
    'dollars dollar bucks usd every each per month monthly week weekly year yearly a annually percent minimum min ' +
    'payment owe owed borrowed made earned received toward towards about around like').split(' '),
);

function titleCase(s) {
  const small = new Set(['and', 'of', 'the', 'a', 'an', 'at', 'for', 'to', 'in', 'on']);
  return s
    .split(/\s+/)
    .map((w, i) => {
      if (w !== w.toLowerCase()) return w; // keep "CAVA", "iPhone"
      if (i > 0 && small.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function cleanName(raw) {
  const name = raw
    .replace(/^(?:my|the|a|an|some|our)\s+/i, '')
    .replace(/[.,!?]+$/, '')
    .trim();
  return name ? titleCase(name).slice(0, 40) : '';
}

function extractName(cleaned, prepositions) {
  for (const prep of prepositions) {
    const m = cleaned.match(new RegExp(String.raw`\b${prep}\s+([\w'&-]+(?:\s+[\w'&-]+)*?)${STOP}`, 'i'));
    const name = m && cleanName(m[1]);
    if (name && !FILLER.has(name.toLowerCase())) return name;
  }
  const leftover = cleaned
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w.toLowerCase().replace(/[.,!?]/g, '')))
    .join(' ');
  return cleanName(leftover);
}

// ---------- main ----------

/**
 * @param {string} input   the transcript
 * @param {Array}  debts   existing debt entries, used to match payments ("paid 300 on the Kia")
 */
export function parseDictation(input, debts = []) {
  const original = input.trim();
  const lower = original.toLowerCase();
  const text = wordsToDigits(original);
  const nums = findNumbers(text);
  const cleaned = text
    .replace(AMOUNT_RE, ' ')
    .replace(/\$|%|\b(dollars?|bucks|usd|percent|per cent)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const result = {
    kind: 'expense',
    debtMode: 'new',
    debtId: '',
    name: '',
    amount: '',
    category: 'Other',
    frequency: 'one-time',
    date: toISODate(),
    balance: '',
    original: '',
    minPayment: '',
    extraPayment: '',
    apr: '',
    hint: '',
  };

  if (/\b(yesterday|last night)\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    result.date = toISODate(d);
  }

  // Which existing debt (if any) is mentioned by name?
  const mentionedDebt = debts.find((debt) =>
    debt.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !/^\d+$/.test(t))
      .some((t) => new RegExp(`\\b${t}\\b`).test(lower)),
  );

  const isPayment =
    debts.length > 0 &&
    /\b(paid|pay|paying|payment|put|sent)\b/.test(lower) &&
    !/\b(got paid|paid me|was paid|get paid)\b/.test(lower) &&
    (mentionedDebt || /\b(toward|towards|off|loan payment|car payment|card payment|debt payment)\b/.test(lower));

  const isDebt = /\b(owe|owed|debt|loan|borrowed|financed|credit card balance|balance of|mortgage)\b/.test(lower);
  const isIncome =
    /\b(got paid|get paid|paid me|was paid|earned|earn|received|receive|income|salary|paycheck|bonus|refund|reimburs\w*|sold|made|deposit\w*|freelance|side hustle|tips?|venmo(?:ed)? me|cashback|cash back|dividend\w*|interest earned)\b/.test(
      lower,
    );

  const primary = pickPrimary(nums);

  if (isPayment) {
    result.kind = 'debt';
    result.debtMode = 'payment';
    result.debtId = (mentionedDebt ?? debts[0]).id;
    result.amount = primary?.value ?? '';
    return result;
  }

  if (isDebt) {
    result.kind = 'debt';
    const apr = nums.find((n) => n.percent);
    if (apr) result.apr = apr.value;
    nums.forEach((n, i) => {
      if (n.percent) return;
      const { before, after } = contextFor(text, nums, i);
      if (/\b(minimum|min)\b/.test(before + ' ' + after)) result.minPayment = n.value;
      else if (/\bextra\b/.test(before + ' ' + after)) result.extraPayment = n.value;
      else if (/\b(original|originally|started at|out of|borrowed)\b/.test(before)) result.original = n.value;
      else if (result.balance === '') result.balance = n.value;
    });
    if (result.balance === '' && result.original !== '') result.balance = result.original;
    result.name = extractName(cleaned, ['on', 'for', 'to']) || 'New Debt';
    return result;
  }

  result.kind = isIncome ? 'income' : 'expense';
  if (primary) result.amount = primary.value;

  const freq = FREQUENCIES.find((f) => f.re.test(lower));
  if (freq) {
    result.frequency = 'monthly';
    if (freq.factor !== 1 && primary) {
      result.amount = Math.round(primary.value * freq.factor * 100) / 100;
      result.hint = `Converted $${primary.value.toLocaleString()} ${freq.label} to a monthly amount.`;
    }
  }

  if (isIncome) {
    result.name =
      extractName(cleaned, ['from', 'for']) ||
      (lower.match(/\b(salary|paycheck|bonus|refund|freelance|tips|dividends?)\b/)?.[1] ?? 'Income');
    result.name = cleanName(result.name);
  } else {
    result.category = detectCategory(text);
    result.name = extractName(cleaned, ['at', 'from', 'for', 'on']) || result.category;
  }

  return result;
}
