import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Utensils,
  ShoppingBag,
  Coffee,
  AlertTriangle,
  Plus,
  RotateCcw,
} from 'lucide-react';

/**
 * Phase 3: Bifurcated Food Tracker
 *
 * - Constrain total monthly food allocation to $335/month.
 * - Split-pane glassmorphism card replacing standard categorized budgets.
 * - Two specific tracking sub-categories:
 *    1. Prep & Bulk (Cap: $185)
 *    2. Dining Out (Cap: $150)
 * - UI Element: Progress bar that changes to an amber/warning color state if either
 *   specific sub-category exceeds its threshold.
 */

export default function BifurcatedFoodTracker({
  onAddFoodEntry,
}) {
  // Caps
  const PREP_BULK_CAP = 185;
  const DINING_OUT_CAP = 150;
  const TOTAL_CAP = PREP_BULK_CAP + DINING_OUT_CAP; // $335

  // Local state for tracking spend (defaults strictly to 0 when starting clean)
  const [prepBulkSpent, setPrepBulkSpent] = useState(() => {
    const val = localStorage.getItem('food_prep_bulk_spent');
    return val !== null ? Number(val) : 0;
  });

  const [diningOutSpent, setDiningOutSpent] = useState(() => {
    const val = localStorage.getItem('food_dining_out_spent');
    return val !== null ? Number(val) : 0;
  });

  const [quickAddAmount, setQuickAddAmount] = useState('');
  const [selectedPane, setSelectedPane] = useState('prep'); // 'prep' or 'dining'

  // Persist
  useEffect(() => {
    localStorage.setItem('food_prep_bulk_spent', String(prepBulkSpent));
  }, [prepBulkSpent]);

  useEffect(() => {
    localStorage.setItem('food_dining_out_spent', String(diningOutSpent));
  }, [diningOutSpent]);

  // Derived metrics
  const totalSpent = prepBulkSpent + diningOutSpent;
  const totalRemaining = Math.max(0, TOTAL_CAP - totalSpent);

  const prepRemaining = PREP_BULK_CAP - prepBulkSpent;
  const prepPct = Math.min(200, (prepBulkSpent / PREP_BULK_CAP) * 100);
  const isPrepExceeded = prepBulkSpent > PREP_BULK_CAP;

  const diningRemaining = DINING_OUT_CAP - diningOutSpent;
  const diningPct = Math.min(200, (diningOutSpent / DINING_OUT_CAP) * 100);
  const isDiningExceeded = diningOutSpent > DINING_OUT_CAP;

  const handleQuickAdd = (pane, amount) => {
    if (pane === 'prep') {
      const next = Math.max(0, prepBulkSpent + amount);
      setPrepBulkSpent(next);
      if (onAddFoodEntry) onAddFoodEntry({ category: 'Groceries (Prep & Bulk)', amount });
    } else {
      const next = Math.max(0, diningOutSpent + amount);
      setDiningOutSpent(next);
      if (onAddFoodEntry) onAddFoodEntry({ category: 'Dining Out', amount });
    }
  };

  const handleCustomAdd = (e) => {
    e.preventDefault();
    const val = parseFloat(quickAddAmount);
    if (!isNaN(val) && val > 0) {
      handleQuickAdd(selectedPane, val);
      setQuickAddAmount('');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset both food spend categories to $0 for a new month?')) {
      setPrepBulkSpent(0);
      setDiningOutSpent(0);
    }
  };

  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-zinc-900/90 via-zinc-900/75 to-zinc-950/90 border border-zinc-800/80 shadow-2xl backdrop-blur-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Utensils size={18} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
              Phase 3 • Behavioral Nutrition Budget
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Bifurcated Food Tracker ($335 Total Cap)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Strict split-pane constraints separating grocery prep from high-friction dining.
          </p>
        </div>

        {/* Global Food Pool Status */}
        <div className="flex items-center gap-3">
          <div className="bg-zinc-950/70 px-3.5 py-2 rounded-2xl border border-zinc-800 flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Spent / Cap</span>
              <span className="text-sm font-black text-white">
                ${totalSpent.toFixed(0)} <span className="text-zinc-500 text-xs">/ ${TOTAL_CAP}</span>
              </span>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Remaining</span>
              <span
                className={`text-sm font-black ${
                  totalRemaining > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ${totalRemaining.toFixed(0)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="p-2.5 rounded-2xl bg-zinc-950/60 text-zinc-500 hover:text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            title="Reset monthly food spending"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Split-Pane Glassmorphism Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Pane 1: Prep & Bulk ($185 Cap) */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isPrepExceeded
              ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-500/10'
              : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  isPrepExceeded
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                <ShoppingBag size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Prep & Bulk</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                    Groceries
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">Costco, Trader Joe’s, weekly essentials</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-black text-white">
                ${prepBulkSpent.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                Cap: ${PREP_BULK_CAP}.00
              </div>
            </div>
          </div>

          {/* Progress Bar with Amber/Warning Color State */}
          <div className="space-y-1.5 my-3">
            <div className="flex justify-between text-[11px] font-medium">
              <span className={isPrepExceeded ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                {prepPct.toFixed(1)}% consumed
              </span>
              <span className={prepRemaining >= 0 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-bold'}>
                {prepRemaining >= 0
                  ? `$${prepRemaining.toFixed(2)} remaining`
                  : `+$${Math.abs(prepRemaining).toFixed(2)} OVER CAP!`}
              </span>
            </div>

            <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, prepPct)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`h-full rounded-full transition-colors ${
                  isPrepExceeded
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-md shadow-amber-500/50'
                    : prepPct > 80
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
            </div>
          </div>

          {/* Warning Banner if Exceeded */}
          {isPrepExceeded && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 font-semibold"
            >
              <AlertTriangle size={15} className="shrink-0 text-amber-400" />
              <span>Threshold exceeded! Shift next grocery trip to staple inventory.</span>
            </motion.div>
          )}

          {/* Quick Add Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 mt-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Log Grocery Spend:</span>
            <div className="flex gap-1.5">
              {[15, 30, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAdd('prep', amt)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-bold text-zinc-300 border border-zinc-800 cursor-pointer transition-colors"
                >
                  +${amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pane 2: Dining Out ($150 Cap) */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDiningExceeded
              ? 'bg-rose-950/20 border-rose-500/60 shadow-lg shadow-rose-500/10'
              : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  isDiningExceeded
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                }`}
              >
                <Coffee size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Dining Out</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                    Restaurants & Social
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">Coffee, takeout, social dinners</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-black text-white">
                ${diningOutSpent.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                Cap: ${DINING_OUT_CAP}.00
              </div>
            </div>
          </div>

          {/* Progress Bar with Amber/Warning Color State */}
          <div className="space-y-1.5 my-3">
            <div className="flex justify-between text-[11px] font-medium">
              <span className={isDiningExceeded ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                {diningPct.toFixed(1)}% consumed
              </span>
              <span className={diningRemaining >= 0 ? 'text-violet-300 font-semibold' : 'text-rose-400 font-bold'}>
                {diningRemaining >= 0
                  ? `$${diningRemaining.toFixed(2)} remaining`
                  : `+$${Math.abs(diningRemaining).toFixed(2)} OVER CAP!`}
              </span>
            </div>

            <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, diningPct)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`h-full rounded-full transition-colors ${
                  isDiningExceeded
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-md shadow-rose-500/50'
                    : diningPct > 80
                    ? 'bg-amber-400'
                    : 'bg-violet-400'
                }`}
              />
            </div>
          </div>

          {/* Warning Banner if Exceeded */}
          {isDiningExceeded && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-3 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-semibold"
            >
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>Dining cap breached! Freeze takeout spending for rest of month.</span>
            </motion.div>
          )}

          {/* Quick Add Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 mt-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Log Dining Spend:</span>
            <div className="flex gap-1.5">
              {[8, 15, 30].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAdd('dining', amt)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-bold text-zinc-300 border border-zinc-800 cursor-pointer transition-colors"
                >
                  +${amt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Quick Entry Row */}
      <form
        onSubmit={handleCustomAdd}
        className="mt-4 p-3 rounded-2xl bg-zinc-950/50 border border-zinc-800/70 flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-semibold">Custom Food Entry:</span>
          <div className="flex rounded-xl bg-zinc-900 p-0.5 border border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedPane('prep')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                selectedPane === 'prep'
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Prep & Bulk
            </button>
            <button
              type="button"
              onClick={() => setSelectedPane('dining')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                selectedPane === 'dining'
                  ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dining Out
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={quickAddAmount}
              onChange={(e) => setQuickAddAmount(e.target.value)}
              className="w-24 pl-6 pr-2 py-1 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs flex items-center gap-1 hover:brightness-110 cursor-pointer shadow-sm"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </form>
    </div>
  );
}
