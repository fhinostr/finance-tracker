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

export function categorizeAccounts(accounts = []) {
  const isCredit = (a) =>
    a.type === 'credit' ||
    a.subtype?.toLowerCase().includes('credit') ||
    a.name?.toLowerCase().includes('credit card') ||
    a.name?.toLowerCase().includes('visa') ||
    a.name?.toLowerCase().includes('mastercard') ||
    a.name?.toLowerCase().includes('amex');

  const isInvestment = (a) =>
    a.type === 'investment' ||
    a.subtype?.toLowerCase().includes('brokerage') ||
    a.subtype?.toLowerCase().includes('investment') ||
    a.name?.toLowerCase().includes('robinhood') ||
    a.name?.toLowerCase().includes('vanguard') ||
    a.name?.toLowerCase().includes('fidelity') ||
    a.name?.toLowerCase().includes('schwab');

  const creditAccounts = accounts.filter(isCredit);
  const investmentAccounts = accounts.filter(isInvestment);
  const bankAccounts = accounts.filter((a) => !isCredit(a) && !isInvestment(a));

  const totalCashInBank = bankAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const totalCreditBalance = creditAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const totalPortfolioValue = investmentAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  return {
    bankAccounts,
    creditAccounts,
    investmentAccounts,
    totalCashInBank,
    totalCreditBalance,
    totalPortfolioValue,
  };
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

/**
 * Intelligent Gas & Fuel Recognizer:
 * Detects gas station brands (7-Eleven, Wawa, Sheetz, Speedway, Shell, Chevron, etc.)
 * where transactions >= $20 represent gas fill-ups rather than convenience store snacks.
 */
export function isGasTransaction(name = '', amount = 0, currentCat = '') {
  const n = String(name || '').toLowerCase();
  const amt = Number(amount) || 0;
  const cat = String(currentCat || '').toLowerCase();

  if (cat.includes('gas') || cat.includes('fuel')) return true;

  const gasStationBrands = [
    '7-eleven',
    '7 eleven',
    '7eleven',
    'wawa',
    'sheetz',
    'circle k',
    'racetrac',
    'quiktrip',
    'qt ',
    'bucc-ee',
    'buc-ee',
    'cumberland farms',
    'speedway',
    'sunoco',
    'exxon',
    'mobil',
    'shell',
    'chevron',
    'bp ',
    'citgo',
    'valero',
    'marathon',
    'phillips 66',
    'conoco',
    'gulf',
    'sinclair',
    'arco',
    'casey',
    'murphy usa',
    'murphy express',
    'pilot flying j',
    'loves travel',
    "love's",
    'ta travel',
    'thorntons',
    'kum & go',
    'kum and go',
    'holiday station',
    'royal farms',
    'kroger fuel',
    'costco gas',
    'sam\'s club gas',
    'sams club gas',
    'bj\'s gas',
    'bjs gas',
  ];

  const hasGasStation = gasStationBrands.some((brand) => n.includes(brand));
  const hasGasKeyword =
    n.includes('gas') ||
    n.includes('fuel') ||
    n.includes('petro') ||
    n.includes('oil co') ||
    n.includes('pump');

  // Charges over $20 at known gas/convenience stations are gas fill-ups
  if ((hasGasStation && amt >= 20) || hasGasKeyword) {
    return true;
  }
  return false;
}

/**
 * Resolves normalized category, upgrading convenience store fuel charges to 'Gas'
 */
export function normalizeCategory(category = 'Other', name = '', amount = 0) {
  if (isGasTransaction(name, amount, category)) {
    return 'Gas';
  }
  return category;
}

export function getCategoryStyle(category = '', kind = 'expense') {
  if (kind === 'income') {
    return {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
      bar: 'bg-emerald-400',
    };
  }
  if (kind === 'payment') {
    return {
      bg: 'bg-rose-500/20',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
      bar: 'bg-rose-400',
    };
  }

  const c = String(category).toUpperCase().replace(/\s+/g, '_');
  if (c.includes('FOOD') || c.includes('DRINK') || c.includes('DINING') || c.includes('GROCER') || c.includes('RESTAURANT')) {
    return {
      bg: 'bg-amber-500/20',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
      bar: 'bg-amber-400',
    };
  }
  if (c.includes('TRAVEL') || c.includes('FLIGHT') || c.includes('HOTEL')) {
    return {
      bg: 'bg-sky-500/20',
      text: 'text-sky-300',
      border: 'border-sky-500/30',
      bar: 'bg-sky-400',
    };
  }
  if (c.includes('MERCHANDISE') || c.includes('SHOPPING') || c.includes('RETAIL')) {
    return {
      bg: 'bg-purple-500/20',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      bar: 'bg-purple-400',
    };
  }
  if (c.includes('TRANSPORT') || c.includes('GAS') || c.includes('AUTO') || c.includes('PARKING')) {
    return {
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-300',
      border: 'border-cyan-500/30',
      bar: 'bg-cyan-400',
    };
  }
  if (c.includes('SERVICE')) {
    return {
      bg: 'bg-indigo-500/20',
      text: 'text-indigo-300',
      border: 'border-indigo-500/30',
      bar: 'bg-indigo-400',
    };
  }
  if (c.includes('ENTERTAINMENT') || c.includes('STREAMING') || c.includes('MOVIES') || c.includes('MUSIC')) {
    return {
      bg: 'bg-pink-500/20',
      text: 'text-pink-300',
      border: 'border-pink-500/30',
      bar: 'bg-pink-400',
    };
  }
  if (c.includes('LOAN') || c.includes('DEBT') || c.includes('CAR_PAYMENT') || c.includes('MORTGAGE')) {
    return {
      bg: 'bg-rose-500/20',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
      bar: 'bg-rose-400',
    };
  }
  if (c.includes('FEE') || c.includes('OVERDRAFT') || c.includes('ATM')) {
    return {
      bg: 'bg-red-500/20',
      text: 'text-red-300',
      border: 'border-red-500/30',
      bar: 'bg-red-400',
    };
  }
  if (c.includes('TRANSFER')) {
    return {
      bg: 'bg-teal-500/20',
      text: 'text-teal-300',
      border: 'border-teal-500/30',
      bar: 'bg-teal-400',
    };
  }
  if (c.includes('SUBSCRIPTION') || c.includes('BILL') || c.includes('UTILITY')) {
    return {
      bg: 'bg-violet-500/20',
      text: 'text-violet-300',
      border: 'border-violet-500/30',
      bar: 'bg-violet-400',
    };
  }
  return {
    bg: 'bg-zinc-500/20',
    text: 'text-zinc-300',
    border: 'border-zinc-500/30',
    bar: 'bg-blue-400',
  };
}

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

export function formatMonthName(monthKey) {
  if (!monthKey || typeof monthKey !== 'string') return '';
  const parts = monthKey.split('-');
  if (parts.length < 2) return monthKey;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

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
      if (Array.isArray(parsed?.entries)) {
        // Automatically ensure gas station transactions (7-Eleven, Wawa, etc >= $20) are categorized as Gas
        const normalizedEntries = parsed.entries.map((e) => {
          const cat = normalizeCategory(e.category || 'Other', e.name, e.amount);
          return cat !== e.category ? { ...e, category: cat } : e;
        });
        return { ...parsed, entries: normalizedEntries };
      }
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
    const rawCat = entry.category || 'Other';
    const finalCat = normalizeCategory(rawCat, entry.name, entry.amount);
    setData((d) => ({
      ...d,
      entries: [{ id: uid(), date: toISODate(), ...entry, category: finalCat }, ...d.entries],
    }));
  }, []);

  const addEntries = useCallback((newItems) => {
    if (!Array.isArray(newItems) || newItems.length === 0) return;
    setData((d) => {
      const existing = d.entries || [];
      const toAdd = [];
      for (const item of newItems) {
        const isDuplicate = existing.some(
          (e) =>
            (item.id && e.id === item.id) ||
            (e.name === item.name && Math.abs(e.amount - item.amount) < 0.01 && e.date === item.date),
        );
        if (
          !isDuplicate &&
          !toAdd.some((t) => t.name === item.name && Math.abs(t.amount - item.amount) < 0.01 && t.date === item.date)
        ) {
          const rawCat = item.category || 'Other';
          const finalCat = normalizeCategory(rawCat, item.name, item.amount);
          toAdd.push({
            id: item.id || uid(),
            kind: item.kind || 'expense',
            name: item.name,
            amount: Number(item.amount) || 0,
            category: finalCat,
            frequency: item.frequency || 'one-time',
            date: item.date || toISODate(),
            pending: Boolean(item.pending),
          });
        }
      }
      if (toAdd.length === 0) return d;
      const combined = [...toAdd, ...existing].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return { ...d, entries: combined };
    });
  }, []);

  const removeEntry = useCallback((id) => {
    setData((d) => ({
      ...d,
      entries: d.entries.filter((e) => e.id !== id && e.debtId !== id),
    }));
  }, []);

  const updateBudget = useCallback((category, maxAmount) => {
    setData((d) => ({
      ...d,
      budgets: {
        ...(d.budgets || {}),
        [category]: Number(maxAmount) || 0,
      },
    }));
  }, []);

  const setAllBudgets = useCallback((newBudgets) => {
    setData((d) => ({
      ...d,
      budgets: {
        ...(d.budgets || {}),
        ...newBudgets,
      },
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
    addEntries,
    updateBudget,
    setAllBudgets,
    removeEntry,
    resetAllData,
  };
}
