import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Car,
  TrendingDown,
  ShieldCheck,
  Calendar,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';

/**
 * Phase 2: Accelerated Principal Paydown Widget
 *
 * - Base metrics: $9,000 remaining balance, 12.5% APR vehicle loan.
 * - Draggable slider: $230 min payment -> $800 max.
 * - Dynamic calculations:
 *    - Months to Payoff (shrinks from ~50 down to ~12-16)
 *    - Total Interest Saved (vs baseline $230/mo)
 * - Persistent "Apply to Principal" checkbox state as a behavioral reminder.
 */

// Helper to calculate exact amortization months and interest
function calcAmortization(monthlyPayment, balance, monthlyRate) {
  const minInterestOnly = balance * monthlyRate;
  if (monthlyPayment <= minInterestOnly) {
    return { months: 999, totalInterest: 999999 };
  }
  const months = -Math.log(1 - (monthlyRate * balance) / monthlyPayment) / Math.log(1 + monthlyRate);
  const totalPaid = months * monthlyPayment;
  const totalInterest = Math.max(0, totalPaid - balance);
  return { months, totalInterest };
}

function getPayoffDateLabel(monthsAhead) {
  const now = new Date();
  const targetYear = now.getFullYear() + Math.floor((now.getMonth() + Math.ceil(monthsAhead)) / 12);
  const targetMonth = (now.getMonth() + Math.ceil(monthsAhead)) % 12;
  const dateObj = new Date(targetYear, targetMonth, 1);
  return dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function AcceleratedPrincipalPaydown({
  principalBalance = 9000,
  interestRate = 0.125, // 12.5% APR
  onPaymentChange,
}) {
  const [payment, setPayment] = useState(() => {
    const saved = localStorage.getItem('paydown_monthly_slider');
    return saved ? Number(saved) : 350;
  });

  const [applyToPrincipal, setApplyToPrincipal] = useState(() => {
    return localStorage.getItem('paydown_apply_to_principal') === 'true';
  });

  const [savedSuccessFlash, setSavedSuccessFlash] = useState(false);

  const handleSliderChange = (e) => {
    const val = Number(e.target.value);
    setPayment(val);
    localStorage.setItem('paydown_monthly_slider', String(val));
    if (onPaymentChange) onPaymentChange(val);
  };

  const handleToggleApply = () => {
    const nextVal = !applyToPrincipal;
    setApplyToPrincipal(nextVal);
    localStorage.setItem('paydown_apply_to_principal', String(nextVal));
    if (nextVal) {
      setSavedSuccessFlash(true);
      setTimeout(() => setSavedSuccessFlash(false), 2000);
    }
  };

  const monthlyRate = interestRate / 12;
  const P = Math.max(1, principalBalance);

  // Baseline scenario at minimum $230/mo
  const baseMetrics = useMemo(() => {
    return calcAmortization(230, P, monthlyRate);
  }, [P, monthlyRate]);

  // Current slider scenario
  const currentMetrics = useMemo(() => {
    return calcAmortization(payment, P, monthlyRate);
  }, [payment, P, monthlyRate]);

  const monthsToPayoff = Math.max(1, Math.round(currentMetrics.months * 10) / 10);
  const baselineMonths = Math.max(1, Math.round(baseMetrics.months * 10) / 10);
  const monthsSaved = Math.max(0, Math.round((baselineMonths - monthsToPayoff) * 10) / 10);
  const totalInterestSaved = Math.max(0, Math.round(baseMetrics.totalInterest - currentMetrics.totalInterest));

  const targetDateStr = useMemo(() => getPayoffDateLabel(monthsToPayoff), [monthsToPayoff]);
  const baselineDateStr = useMemo(() => getPayoffDateLabel(baselineMonths), [baselineMonths]);

  // Quick preset buttons
  const presets = [
    { label: 'Minimum', amount: 230 },
    { label: 'Recommended', amount: 350 },
    { label: 'Aggressive', amount: 500 },
    { label: 'Max Sprint', amount: 800 },
  ];

  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-950/95 border border-zinc-800/80 shadow-2xl backdrop-blur-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Car size={18} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Phase 2 • Debt Liquidation Engine
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Accelerated Principal Paydown
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Interactive vehicle loan payoff accelerator ($9,000 balance @ 12.5% APR).
          </p>
        </div>

        {/* Loan Balance Badge */}
        <div className="bg-zinc-950/70 px-3.5 py-2 rounded-2xl border border-zinc-800 flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Remaining Loan</span>
            <span className="text-base font-black text-amber-400">${Math.round(P).toLocaleString()}</span>
          </div>
          <div className="h-7 w-px bg-zinc-800" />
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">APR</span>
            <span className="text-sm font-black text-rose-400">{(interestRate * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Paydown Section */}
      <div className="mt-6 space-y-6">
        {/* Slider Card */}
        <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/90 space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="principal-paydown-slider" className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Monthly Payment Allocation
            </label>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">${payment}</span>
              <span className="text-xs text-zinc-400">/ month</span>
            </div>
          </div>

          {/* Draggable Slider */}
          <div className="space-y-2">
            <input
              id="principal-paydown-slider"
              type="range"
              min={230}
              max={800}
              step={10}
              value={payment}
              onChange={handleSliderChange}
              aria-label="Monthly Payment Allocation"
              className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
              <span>$230 (Min)</span>
              <span>$500</span>
              <span>$800 (Max Sprint)</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {presets.map((preset) => (
              <button
                key={preset.amount}
                type="button"
                onClick={() => {
                  setPayment(preset.amount);
                  localStorage.setItem('paydown_monthly_slider', String(preset.amount));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  payment === preset.amount
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {preset.label} (${preset.amount})
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Metric Results Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Metric 1: Months to Payoff */}
          <motion.div
            key={`months-${monthsToPayoff}`}
            initial={{ scale: 0.96, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-950 border border-indigo-500/30 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Calendar size={13} />
                  Months to Payoff
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                  {targetDateStr}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">{monthsToPayoff}</span>
                <span className="text-sm text-zinc-400 font-semibold">months</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Baseline at $230/mo:</span>
              <span className="font-semibold text-zinc-300 line-through">
                {baselineMonths} mos ({baselineDateStr})
              </span>
            </div>
            {monthsSaved > 0 && (
              <div className="mt-1 text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <TrendingDown size={13} />
                <span>Eliminates {monthsSaved} months (~{(monthsSaved / 12).toFixed(1)} yrs) of debt!</span>
              </div>
            )}
          </motion.div>

          {/* Metric 2: Total Interest Saved */}
          <motion.div
            key={`interest-${totalInterestSaved}`}
            initial={{ scale: 0.96, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/30 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck size={13} />
                  Total Interest Saved
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  Pure Profit
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-emerald-400">
                  +${totalInterestSaved.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Interest remaining:</span>
              <span className="font-mono text-zinc-200">
                ${Math.round(currentMetrics.totalInterest).toLocaleString()}
                <span className="text-zinc-500 text-[11px] ml-1">
                  (was ${Math.round(baseMetrics.totalInterest).toLocaleString()})
                </span>
              </span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              Money kept in your pocket instead of paid to lender interest.
            </div>
          </motion.div>
        </div>

        {/* UI Element: Persistent "Apply to Principal" checkbox state */}
        <div
          onClick={handleToggleApply}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
            applyToPrincipal
              ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
              : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                applyToPrincipal ? 'text-amber-400' : 'text-zinc-500'
              }`}
            >
              {applyToPrincipal ? <CheckSquare size={22} /> : <Square size={22} />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Apply Excess Payment Directly to Principal
                </span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  Behavioral Reminder
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Always instruct the servicer to apply the additional ${payment - 230}/month explicitly toward principal balance, preventing unallocated prepayments.
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            {applyToPrincipal ? (
              <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                <Sparkles size={14} /> Active Rule
              </span>
            ) : (
              <span className="text-xs font-semibold text-zinc-500">Click to lock</span>
            )}
          </div>
        </div>

        {savedSuccessFlash && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs text-center font-bold"
          >
            ✓ Reminder state locked in! All extra cash flow committed to principal paydown.
          </motion.div>
        )}
      </div>
    </div>
  );
}
