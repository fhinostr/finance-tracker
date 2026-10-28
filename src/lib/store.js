import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'finance-tracker:v1';
const STORAGE_KEY_ACCOUNTS = 'finance-tracker:linked-accounts:v1';

export function getStoredAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return [];
}

export function saveStoredAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch {
    // fallback
  }
}

export const EXPENSE_CATEGORIES = [
  'Groceries',
  'Dining',
  'Gas',
  'Transport',
  'Bills',
  'Shopping',
  'Entertainment',
  'Health',
  'Other',
];

/** Monthly spending targets for variable (one-time) expenses, by category. */
export const DEFAULT_BUDGETS = {
  Groceries: 185,
  Dining: 150,
  Gas: 146,
};

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Local date as YYYY-MM-DD (avoids the UTC shift from toISOString). */
export function toISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const currentMonthKey = () => toISODate().slice(0, 7);

export function formatMoney(value, { cents = 'auto' } = {}) {
  const n = Number(value) || 0;
  const showCents = cents === 'always' || (cents === 'auto' && Math.round(n * 100) % 100 !== 0);
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Starting data — mirrors the numbers that used to be hard-coded in the UI. */
function seedEntries() {
  const today = toISODate();
  return [
    { id: uid(), kind: 'income', name: 'Salary (net)', amount: 5475, frequency: 'monthly', date: today },
    { id: uid(), kind: 'income', name: 'Performance Bonus (net)', amount: 980, frequency: 'monthly', optional: true, date: today },

    { id: uid(), kind: 'expense', name: 'Rent (Maryland)', amount: 2000, category: 'Bills', frequency: 'monthly', note: '1st of Month', date: today },
    { id: uid(), kind: 'expense', name: 'Utilities & Internet', amount: 220, category: 'Bills', frequency: 'monthly', note: 'Varies', date: today },
    { id: uid(), kind: 'expense', name: 'Auto Insurance', amount: 160, category: 'Bills', frequency: 'monthly', note: '15th of Month', date: today },
    { id: uid(), kind: 'expense', name: 'Gemini Advanced', amount: 8, category: 'Entertainment', frequency: 'monthly', note: 'Auto-renews', date: today },

    { id: uid(), kind: 'expense', name: 'Bulk Clean Prep (Costco/Walmart)', amount: 185, category: 'Groceries', frequency: 'one-time', date: today },
    { id: uid(), kind: 'expense', name: 'Dining Out (CAVA, Chipotle)', amount: 65, category: 'Dining', frequency: 'one-time', date: today },
    { id: uid(), kind: 'expense', name: 'Gasoline (1,000 miles)', amount: 146, category: 'Gas', frequency: 'one-time', date: today },

    { id: uid(), kind: 'debt', name: '2018 Kia Sportage', balance: 9000, original: 12500, minPayment: 230, extraPayment: 570, apr: null, date: today },
  ];
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.entries)) return parsed;
    }
  } catch {
    // Corrupt or unavailable storage — fall back to seed data.
  }
  return { entries: seedEntries(), budgets: DEFAULT_BUDGETS };
}

/** Current balance of a debt = starting balance minus every logged payment toward it. */
export function debtBalance(debt, entries) {
  const paid = entries
    .filter((e) => e.kind === 'payment' && e.debtId === debt.id)
    .reduce((sum, e) => sum + e.amount, 0);
  return Math.max(debt.balance - paid, 0);
}

/** Months to pay off, accounting for APR when known. Returns null if the payment can't cover interest. */
export function monthsToPayoff(balance, monthlyPayment, apr) {
  if (balance <= 0) return 0;
  if (!monthlyPayment || monthlyPayment <= 0) return null;
  const r = apr ? apr / 100 / 12 : 0;
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  if (monthlyPayment <= balance * r) return null;
  return Math.ceil(-Math.log(1 - (r * balance) / monthlyPayment) / Math.log(1 + r));
}

export function useFinanceData() {
  const [data, setData] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or disabled (e.g. private mode) — keep working in memory.
    }
  }, [data]);

  const addEntry = useCallback((entry) => {
    setData((d) => ({ ...d, entries: [{ id: uid(), date: toISODate(), ...entry }, ...d.entries] }));
  }, []);

  const removeEntry = useCallback((id) => {
    setData((d) => ({
      ...d,
      // Removing a debt also removes the payments logged against it.
      entries: d.entries.filter((e) => e.id !== id && e.debtId !== id),
    }));
  }, []);

  return { entries: data.entries, budgets: data.budgets ?? DEFAULT_BUDGETS, addEntry, removeEntry };
}

