import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Lock,
  Unlock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Shield,
} from 'lucide-react';
import { formatMoney } from '../lib/store.js';

/**
 * Component 4: Relocation Goal Widget
 *
 * Earmarked for a $3,000 relocation funding cap.
 * Visually locks upon reaching $3,000.
 * Automatically redirects any further cash flow into a General Emergency Fund component.
 */

export default function RelocationGoalWidget({
  cap = 3000,
  emergencyTarget = 10000,
}) {
  // Total cash accumulated across the relocation funnel
  const [accumulatedCash, setAccumulatedCash] = useState(() => {
    const saved = localStorage.getItem('relocation_accumulated_cash');
    return saved !== null ? Number(saved) : 2400; // start near cap to easily see lock
  });

  const handleAdd = (amount) => {
    setAccumulatedCash((prev) => {
      const next = prev + amount;
      localStorage.setItem('relocation_accumulated_cash', String(next));
      return next;
    });
  };

  const handleReset = () => {
    setAccumulatedCash(1500);
    localStorage.setItem('relocation_accumulated_cash', '1500');
  };

  // Splitting: First $3,000 fills Relocation Cap; overflow redirects into General Emergency Fund
  const relocationFunded = Math.min(cap, accumulatedCash);
  const isCapReached = accumulatedCash >= cap;
  const relocationPct = Math.min(100, (relocationFunded / cap) * 100);

  // Overflow into General Emergency Fund
  const emergencyFunded = Math.max(0, accumulatedCash - cap);
  const emergencyPct = Math.min(100, (emergencyFunded / emergencyTarget) * 100);

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-zinc-900/90 to-zinc-950 border border-cyan-500/25 shadow-2xl backdrop-blur-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Compass size={18} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Target Milestone Architecture
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Relocation Goal ($3,000 Cap) & Spillover
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Auto-locks at $3,000 and redirects subsequent surplus into your Emergency Fund.
          </p>
        </div>

        {/* Lock State Pill */}
        <div className="flex items-center gap-2">
          {isCapReached ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black shadow-lg shadow-emerald-500/10"
            >
              <Lock size={14} className="text-emerald-400" />
              <span>CAP LOCKED & SECURED</span>
            </motion.div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-semibold border border-zinc-700">
              <Unlock size={14} />
              <span>{relocationPct.toFixed(0)}% Filled</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl bg-zinc-950 text-zinc-500 hover:text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            title="Reset simulation balance"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Relocation Card (Target: $3,000) */}
      <motion.div
        animate={{
          borderColor: isCapReached ? 'rgba(16, 185, 129, 0.5)' : 'rgba(39, 39, 42, 0.8)',
        }}
        className={`p-5 rounded-2xl border transition-all ${
          isCapReached
            ? 'bg-gradient-to-r from-emerald-950/30 via-zinc-950 to-zinc-900 border-emerald-500/50 shadow-xl shadow-emerald-500/10'
            : 'bg-zinc-950/70 border-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isCapReached
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
              }`}
            >
              {isCapReached ? <Lock size={20} /> : <Compass size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Relocation Reserve</h3>
                {isCapReached && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Fully Funded
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">Apartment lease deposit & vehicle titling</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-white font-mono">
              {formatMoney(relocationFunded)}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Cap: {formatMoney(cap)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 my-3">
          <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden p-0.5 border border-zinc-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${relocationPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full transition-colors ${
                isCapReached
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-md shadow-emerald-500/40'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
            />
          </div>
        </div>

        {isCapReached && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 font-semibold"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Milestone reached! Security deposit & titling fully reserved.</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Active Lock
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Redirect Indicator Connector */}
      <div className="flex items-center justify-center -my-2">
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-bold transition-all ${
            isCapReached
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/20'
              : 'bg-zinc-950 border-zinc-800 text-zinc-500'
          }`}
        >
          <span>AUTO-REDIRECT SPILLOVER</span>
          <ArrowRight
            size={13}
            className={isCapReached ? 'text-emerald-400 animate-pulse' : 'text-zinc-600'}
          />
        </div>
      </div>

      {/* General Emergency Fund Spillover Component */}
      <motion.div
        animate={{
          opacity: isCapReached ? 1 : 0.75,
        }}
        className={`p-5 rounded-2xl border transition-all ${
          emergencyFunded > 0
            ? 'bg-gradient-to-r from-blue-950/30 via-zinc-950 to-zinc-900 border-blue-500/40 shadow-xl shadow-blue-500/10'
            : 'bg-zinc-950/70 border-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">General Emergency Fund</h3>
                {emergencyFunded > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Spillover Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">3-6 months liquid safety net ($10k goal)</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-blue-400 font-mono">
              {formatMoney(emergencyFunded)}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Target: {formatMoney(emergencyTarget)}</span>
          </div>
        </div>

        {/* Emergency Progress Bar */}
        <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-zinc-800 my-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${emergencyPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
          />
        </div>

        <p className="text-xs text-zinc-400 mt-2">
          {isCapReached
            ? `All further cash flow (+${formatMoney(emergencyFunded)}) is automatically compounding here.`
            : 'Activates automatically once the $3,000 relocation cap is fully filled.'}
        </p>
      </motion.div>

      {/* Interactive Simulation Controls */}
      <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
          <Sparkles size={14} className="text-cyan-400" /> Test Inbound Cash Flow:
        </span>
        <div className="flex gap-2">
          {[200, 500, 1000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleAdd(amt)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-300 font-bold border border-zinc-800 hover:border-cyan-500/40 transition-all cursor-pointer shadow-sm"
            >
              +${amt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
