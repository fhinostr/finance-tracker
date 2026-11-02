import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  RefreshCw,
  Building,
  Car,
  Calendar,
} from 'lucide-react';
import { useSavingsSync } from '../lib/useSavingsSync.js';

function getRelocationMonthsRemaining() {
  const target = new Date('2027-01-01T00:00:00');
  const current = new Date();
  const diffTime = target - current;
  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  return Math.max(0, Math.round((diffDays / 30.4) * 10) / 10);
}

/**
 * Phase 4: Relocation Buffer Progress Ring
 *
 * - Circular progress indicator component tailored to a January 2027 relocation.
 * - Target goal: $3,000 (earmarked for apartment deposits and titling).
 * - Mock data hook `useSavingsSync` that simulates pulling balance data from
 *   a High-Yield Savings Account (HYSA) to fill the progress ring.
 */

export default function RelocationBufferRing({
  targetGoal = 3000,
  syncHook,
}) {
  const defaultHook = useSavingsSync(targetGoal);
  const { savingsBalance, isSyncing, lastSynced, syncNow, addFunds } = syncHook || defaultHook;

  const diffMonths = useMemo(() => getRelocationMonthsRemaining(), []);

  const pct = Math.min(100, Math.max(0, (savingsBalance / targetGoal) * 100));
  const remaining = Math.max(0, targetGoal - savingsBalance);
  const monthlyRequired = diffMonths > 0 ? remaining / diffMonths : 0;

  // Circular SVG dimensions
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-zinc-900/90 via-zinc-900/75 to-zinc-950/90 border border-zinc-800/80 shadow-2xl backdrop-blur-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Compass size={18} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Phase 4 • Capital Goal Milestone
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Relocation Buffer (January 2027)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Earmarked $3,000 for apartment security deposits & out-of-state vehicle titling.
          </p>
        </div>

        {/* HYSA Sync Trigger */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">HYSA Balance</span>
            <span className="text-xs text-zinc-400 font-mono">Sync: {lastSynced}</span>
          </div>
          <button
            type="button"
            onClick={syncNow}
            disabled={isSyncing}
            className="p-2.5 rounded-2xl bg-zinc-950/70 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer disabled:opacity-50"
            title="Simulate pulling latest balance from High-Yield Savings Account"
          >
            <RefreshCw size={17} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content: Ring + Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center mt-6">
        {/* Left: Animated Circular Progress Ring (4 cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-3">
          <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#27272a"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Animated Progress Stroke */}
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="url(#relocationGradient)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                strokeLinecap="round"
                fill="transparent"
              />
              <defs>
                <linearGradient id="relocationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Inner Content */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-white tracking-tight">
                {pct.toFixed(0)}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Funded
              </span>
              <span className="text-[11px] font-semibold text-zinc-400 mt-1">
                ${Math.round(savingsBalance).toLocaleString()} of ${targetGoal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
            <Calendar size={13} className="text-cyan-400" />
            <span>Target: <strong>January 1, 2027</strong> ({diffMonths} mos away)</span>
          </div>
        </div>

        {/* Right: Allocation Breakdown & Pacing (7 cols) */}
        <div className="md:col-span-7 space-y-3.5">
          {/* Milestone Target Sub-allocations */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold mb-1">
                <Building size={15} className="text-cyan-400" />
                <span>Lease & Deposits</span>
              </div>
              <div className="text-lg font-black text-white">$2,200</div>
              <p className="text-[10px] text-zinc-400 mt-0.5">Security deposit & first month buffer</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold mb-1">
                <Car size={15} className="text-blue-400" />
                <span>Vehicle Titling</span>
              </div>
              <div className="text-lg font-black text-white">$800</div>
              <p className="text-[10px] text-zinc-400 mt-0.5">DMV titling, plates & state inspection</p>
            </div>
          </div>

          {/* Savings Pace Card */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Required Monthly HYSA Contribution:</span>
              <span className="font-black text-cyan-400 font-mono text-sm">
                ${monthlyRequired.toFixed(2)}/mo
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Remaining Capital Gap:</span>
              <span className="font-semibold text-zinc-300 font-mono">
                ${remaining.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/60">
              <span className="text-zinc-400">Est. 4.5% APY Compounding:</span>
              <span className="font-semibold text-emerald-400">
                +${((savingsBalance * 0.045)).toFixed(0)}/yr passive yield
              </span>
            </div>
          </div>

          {/* Quick deposit simulation buttons */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-zinc-500">
              Simulate HYSA Transfer:
            </span>
            <div className="flex gap-1.5">
              {[50, 100, 250].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => addFunds(amt)}
                  className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[11px] font-bold text-cyan-300 border border-zinc-800 cursor-pointer transition-colors"
                >
                  +${amt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
