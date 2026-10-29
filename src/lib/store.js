import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'finance-tracker:v2';
const STORAGE_KEY_ACCOUNTS = 'finance-tracker:linked-accounts:v1';

// Automatically clean up legacy mock seed data from v1
try {
  if (typeof window !== 'undefined') {
    const v1 = localStorage.getItem('finance-tracker:v1');
    if (v1 && v1.includes('Rent (Maryland)')) {
      localStorage.removeItem('finance-tracker:v1');
    }
  }
} catch {
  // ignore
}

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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finance-tracker:accounts-updated', { detail: accounts }));
    }
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

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.entries)) return parsed;
    }
  } catch {
    // fallback
  }
  // Start completely clean — zero placeholder/mock entries
  return { entries: [], budgets: {} };
}

/** Current balance of a debt = starting balance minus every logged payment toward it. */
export function debtBalance(debt, entries) {
  const paid = entries
    .filter((e) => e.kind === 'payment' && e.debtId === debt.id)
    .reduce((sum, e) => sum + e.amount, 0);
  return Math.max((debt.balance || 0) - paid, 0);
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
      // Storage full or disabled
    }
  }, [data]);

  const addEntry = useCallback((entry) => {
    setData((d) => ({ ...d, entries: [{ id: uid(), date: toISODate(), ...entry }, ...d.entries] }));
  }, []);

  const removeEntry = useCallback((id) => {
    setData((d) => ({
      ...d,
      entries: d.entries.filter((e) => e.id !== id && e.debtId !== id),
    }));
  }, []);

  const resetAllData = useCallback(() => {
    setData({ entries: [], budgets: {} });
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY_ACCOUNTS);
    } catch {
      // ignore
    }
  }, []);

  return {
    entries: data.entries,
    budgets: data.budgets ?? {},
    addEntry,
    removeEntry,
    resetAllData,
  };
}
