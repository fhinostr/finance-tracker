import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Car,
  TrendingDown,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { formatMoney } from '../lib/store.js';

/**
 * Component 2: Kia Payoff Gauge
 *
 * $9,000 auto loan balance @ 12.5% APR.
 * Base minimum monthly payment: $230/mo.
 * User slides principal-only extra payments between $370 and $570.
 * Total monthly payment = $230 + extra (ranges from $600 to $800).
 * Payoff timeline dynamically shrinks down to 12–16 months!
 */

function calcAmortizationMonths(balance, annualApr, monthlyPayment) {
  const i = annualApr / 12;
  const minInterest = balance * i;
  if (monthlyPayment <= minInterest) return 999;
  return -Math.log(1 - (i * balance) / monthlyPayment) / Math.log(1 + i);
}

function getPayoffDate(months) {
  const now = new Date();
  const targetYear = now.getFullYear() + Math.floor((now.getMonth() + Math.ceil(months)) / 12);
  const targetMonth = (now.getMonth() + Math.ceil(months)) % 12;
  const d = new Date(targetYear, targetMonth, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function KiaPayoffGauge({
  loanBalance = 9000,
  annualApr = 0.125, // 12.5% APR
  baseMinPayment = 230,
}) {
  // Slider ranges from $370 to $570 extra principal
  const [extraPrincipal, setExtraPrincipal] = useState(470);

  const totalMonthlyPayment = baseMinPayment + extraPrincipal; // $600 - $800

  // Calculate payoff months
  const baselineMonths = useMemo(() => {
    return calcAmortizationMonths(loanBalance, annualApr, baseMinPayment);
  }, [loanBalance, annualApr, baseMinPayment]);

  const currentMonths = useMemo(() => {
    return calcAmortizationMonths(loanBalance, annualApr, totalMonthlyPayment);
  }, [loanBalance, annualApr, totalMonthlyPayment]);

  // Total interest paid
  const baselineTotalInterest = baselineMonths * baseMinPayment - loanBalance;
  const currentTotalInterest = Math.max(0, currentMonths * totalMonthlyPayment - loanBalance);
  const interestSaved = Math.max(0, Math.round(baselineTotalInterest - currentTotalInterest));

  const displayMonths = Math.max(1, Math.round(currentMonths * 10) / 10);
  const monthsSaved = Math.max(0, Math.round((baselineMonths - currentMonths) * 10) / 10);
  const targetDateStr = useMemo(() => getPayoffDate(displayMonths), [displayMonths]);

  // Semi-circular gauge parameters
  // Range: 16.4 months (0% progress on sprint) down to 12.0 months (100% progress on sprint)
  // Or relative to slider: $370 (min sprint) to $570 (max sprint)
  const sprintRatio = (extraPrincipal - 370) / (570 - 370); // 0 to 1

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-zinc-900/90 to-zinc-950 border border-amber-500/25 shadow-2xl backdrop-blur-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Car size={18} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Debt Acceleration Engine
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Kia Payoff Speed Gauge
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            ${loanBalance.toLocaleString()} loan @ {(annualApr * 100).toFixed(1)}% APR • ${baseMinPayment}/mo minimum base.
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total Payment</span>
          <span className="text-3xl font-black text-amber-400 font-mono">
            ${totalMonthlyPayment}
            <span className="text-xs text-zinc-400 font-normal"> /mo</span>
          </span>
        </div>
      </div>

      {/* SVG Semi-Circle Gauge Visual */}
      <div className="flex flex-col items-center justify-center pt-2">
        <div className="relative w-64 h-36 flex items-end justify-center overflow-hidden">
          <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
            {/* Background Arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#27272a"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Active Colored Arc */}
            <motion.path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#kiaGaugeGradient)"
              strokeWidth="16"
              strokeDasharray="251.2"
              initial={{ strokeDashoffset: 251.2 }}
              animate={{ strokeDashoffset: 251.2 * (1 - sprintRatio) }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="kiaGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>

          {/* Needle Center Indicator */}
          <div className="absolute bottom-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {displayMonths}
            </span>
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-400">
              Months to Debt Free
            </span>
            <span className="text-[11px] font-semibold text-zinc-400">
              Payoff: <strong>{targetDateStr}</strong>
            </span>
          </div>
        </div>

        <div className="w-64 flex justify-between text-[11px] text-zinc-500 font-mono mt-1 px-2">
          <span>~16 Mos ($370 extra)</span>
          <span>~12 Mos ($570 extra)</span>
        </div>
      </div>

      {/* Slider: Principal-Only Extra Payments ($370 - $570) */}
      <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="kia-extra-principal-slider" className="font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={14} className="text-amber-400" />
            Principal-Only Extra Payment
          </label>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-lg font-black text-white">+${extraPrincipal}</span>
            <span className="text-xs text-zinc-500">/mo</span>
          </div>
        </div>

        {/* Draggable Slider */}
        <input
          id="kia-extra-principal-slider"
          type="range"
          min={370}
          max={570}
          step={10}
          value={extraPrincipal}
          onChange={(e) => setExtraPrincipal(parseInt(e.target.value, 10))}
          aria-label="Principal-Only Extra Payment"
          className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        />

        <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
          <span>$370 ($600 Total)</span>
          <span>$470 ($700 Total)</span>
          <span>$570 ($800 Max Sprint)</span>
        </div>

        {/* Quick Presets */}
        <div className="flex gap-2 pt-1">
          {[370, 420, 470, 520, 570].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setExtraPrincipal(amt)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                extraPrincipal === amt
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              +${amt}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row: Interest Saved & Months Eliminated */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <motion.div
          key={`interest-saved-${interestSaved}`}
          initial={{ scale: 0.96, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-2xl bg-zinc-950/70 border border-emerald-500/30 flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-0.5">
              Total Interest Saved
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              +{formatMoney(interestSaved)}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">vs paying $230/mo minimum</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <ShieldCheck size={20} />
          </div>
        </motion.div>

        <motion.div
          key={`months-saved-${monthsSaved}`}
          initial={{ scale: 0.96, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-2xl bg-zinc-950/70 border border-indigo-500/30 flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 block mb-0.5">
              Debt Freedom Accelerated
            </span>
            <div className="text-2xl font-black text-white font-mono">
              -{monthsSaved} Mos
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Eliminates ~{(monthsSaved / 12).toFixed(1)} years of debt
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <TrendingDown size={20} />
          </div>
        </motion.div>
      </div>

      {/* Behavioral Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
        <Sparkles size={16} className="text-amber-400 shrink-0" />
        <span>
          <strong>Principal-Only Rule:</strong> Remind loan servicer to credit all extra ${extraPrincipal}/mo strictly to principal, not future monthly installments.
        </span>
      </div>
    </div>
  );
}
