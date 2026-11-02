import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  TrendingDown,
  ShoppingBag,
} from 'lucide-react';
import { formatMoney, formatMonthName, getCategoryStyle } from '../lib/store.js';

function formatCategory(cat) {
  if (!cat) return 'Other';
  return cat
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, '&');
}

export default function SpendingTab({
  totalVariable = 0,
  categoryTotals = {},
  budgets = {},
  entries = [],
  activeMonth,
  onAdd,
  onDelete,
}) {
  const [activityScope, setActivityScope] = useState('month'); // 'month' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  const allCategories = Object.keys(categoryTotals);

  const monthTransactions = useMemo(() => {
    return entries
      .filter((e) => e.kind !== 'debt' && (!e.date || e.date.startsWith(activeMonth)))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [entries, activeMonth]);

  const allRecentTransactions = useMemo(() => {
    return entries
      .filter((e) => e.kind !== 'debt')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 50);
  }, [entries]);

  const rawTransactions = activityScope === 'month' ? monthTransactions : allRecentTransactions;

  const filteredTransactions = useMemo(() => {
    return rawTransactions.filter((tx) => {
      const matchesSearch =
        searchQuery === '' ||
        (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tx.category && tx.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategoryFilter === 'all' || tx.category === selectedCategoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [rawTransactions, searchQuery, selectedCategoryFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-950/40 via-zinc-900/90 to-zinc-950 border border-blue-500/20 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <CreditCard size={18} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                In-Depth Spending & Transactions
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Variable Expense Breakdown
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Detailed tracking of daily discretionary spend for {formatMonthName(activeMonth)}.
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Variable Spend</span>
            <span className="text-3xl font-black text-white">
              {formatMoney(totalVariable)}
            </span>
          </div>
        </div>

        {/* Action button */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-400">
            {allCategories.length} active spending {allCategories.length === 1 ? 'category' : 'categories'} logged this month
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* 2. Category Spending Progress Cards */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-blue-400" />
            <h3 className="text-base font-bold text-white">Categories vs Budget Caps</h3>
          </div>
          <span className="text-xs text-zinc-400">{formatMonthName(activeMonth)}</span>
        </div>

        <div className="space-y-4 pt-2">
          {allCategories.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">
              No variable expenses logged for {formatMonthName(activeMonth)}. Click &quot;Add Transaction&quot; to begin!
            </p>
          ) : (
            allCategories.map((cat) => {
              const spent = categoryTotals[cat] || 0;
              const hasBudget = budgets[cat] != null && budgets[cat] > 0;
              const max = hasBudget ? budgets[cat] : (totalVariable > 0 ? totalVariable : spent || 100);
              const pct = Math.min((spent / max) * 100, 100);
              const catStyle = getCategoryStyle(cat);
              const isOver = hasBudget && spent > max;

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">{formatCategory(cat)}</span>
                      {hasBudget && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                          Cap: {formatMoney(max)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className={isOver ? 'text-amber-400 font-bold' : 'text-zinc-200 font-semibold'}>
                        {formatMoney(spent)}
                      </span>
                      {hasBudget && (
                        <span className="text-[10px] text-zinc-500">
                          ({pct.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800/80">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        isOver ? 'bg-gradient-to-r from-amber-500 to-rose-500' : catStyle.bar || 'bg-blue-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Detailed Transaction Ledger */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl backdrop-blur-xl space-y-4">
        {/* Ledger Header & Scope Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-emerald-400" />
            <h3 className="text-base font-bold text-white">Transaction History</h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActivityScope('month')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activityScope === 'month'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {formatMonthName(activeMonth)} ({monthTransactions.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityScope('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activityScope === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Recent ({allRecentTransactions.length})
              </button>
            </div>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />

          {allCategories.length > 0 && (
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {formatCategory(c)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Transactions List */}
        <div className="space-y-2 pt-1">
          {filteredTransactions.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">
              No transactions match your current search or filter.
            </p>
          ) : (
            filteredTransactions.map((item) => {
              const isIncome = item.type === 'income';
              const catStyle = getCategoryStyle(item.category);

              return (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : `${catStyle.badge} border`
                      }`}
                    >
                      {isIncome ? <DollarSign size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-200 truncate">
                        {item.description || formatCategory(item.category)}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>{formatCategory(item.category)}</span>
                        {item.date && (
                          <>
                            <span>•</span>
                            <span>{new Date(item.date).toLocaleDateString()}</span>
                          </>
                        )}
                        {item.source && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-600">{item.source}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-sm font-black font-mono ${
                        isIncome ? 'text-emerald-400' : 'text-zinc-200'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatMoney(item.amount)}
                    </span>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Delete this transaction"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
