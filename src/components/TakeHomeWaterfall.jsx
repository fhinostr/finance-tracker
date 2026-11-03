import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  ArrowDown,
  Building,
  Zap,
  ShieldCheck,
  Fuel,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
} from 'lucide-react';

/**
 * Phase 1: The Take-Home Waterfall Component (Framer Motion)
 *
 * - Baseline monthly net income: $5,475
 * - "Maryland Tax Mode" toggle: calculates combined state (5.75%) and county (3.2%) = 8.95% taxes
 * - Sequential fixed outflows:
 *    1. Rent: $2,000
 *    2. Utilities: $220
 *    3. Auto Insurance: $160
 *    4. Gas: $146
 * - Final terminating node: True Discretionary Cash Pool
 */

export default function TakeHomeWaterfall({
  actualNetIncome = 0,
  useCustomBaseline: _useCustomBaseline = false,
}) {
  const [useMdTax, setUseMdTax] = useState(() => {
    return localStorage.getItem('waterfall_md_tax') === 'true';
  });

  const handleToggleMdTax = () => {
    const nextVal = !useMdTax;
    setUseMdTax(nextVal);
    localStorage.setItem('waterfall_md_tax', String(nextVal));
  };

  // Baseline net income: strictly use actualNetIncome if available, otherwise 0
  const baselineGross = actualNetIncome > 0 ? actualNetIncome : 0;

  // Maryland tax calculation: 5.75% State + 3.20% County = 8.95% total
  const mdTaxRate = 0.0895;
  const mdTaxDeduction = useMdTax ? baselineGross * mdTaxRate : 0;
  const netTakeHome = Math.max(0, baselineGross - mdTaxDeduction);

  // Fixed outflows sequentially (only active if baseline income exists)
  const outflows = baselineGross > 0 ? [
    {
      id: 'rent',
      name: 'Apartment Rent',
      amount: 2000,
      icon: Building,
      color: 'from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30',
      barColor: 'bg-amber-500',
    },
    {
      id: 'utilities',
      name: 'Utilities (Electric, Water, Internet)',
      amount: 220,
      icon: Zap,
      color: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30',
      barColor: 'bg-blue-500',
    },
    {
      id: 'insurance',
      name: 'Auto Insurance',
      amount: 160,
      icon: ShieldCheck,
      color: 'from-violet-500/20 to-violet-600/10 text-violet-400 border-violet-500/30',
      barColor: 'bg-violet-500',
    },
    {
      id: 'gas',
      name: 'Vehicle Fuel & Gas',
      amount: 146,
      icon: Fuel,
      color: 'from-rose-500/20 to-rose-600/10 text-rose-400 border-rose-500/30',
      barColor: 'bg-rose-500',
    },
  ] : [];

  const totalFixedOutflows = outflows.reduce((acc, curr) => acc + curr.amount, 0);
  const trueDiscretionaryCash = Math.max(0, netTakeHome - totalFixedOutflows);

  // Cascading step calculations
  let runningBalance = netTakeHome;
  const steps = outflows.map((item) => {
    const prev = runningBalance;
    runningBalance -= item.amount;
    return {
      ...item,
      prevBalance: prev,
      remainingAfter: runningBalance,
      percentageOfNet: netTakeHome > 0 ? ((item.amount / netTakeHome) * 100).toFixed(1) : '0',
    };
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  };

  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-zinc-900/90 via-zinc-900/70 to-zinc-950/90 border border-zinc-800/80 shadow-2xl backdrop-blur-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Layers size={18} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Phase 1 • Cash Flow Architecture
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Take-Home Waterfall & True Discretionary Pool
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sequential cash drain analysis from gross take-home to pure surplus.
          </p>
        </div>

        {/* Maryland Tax Mode Toggle */}
        <div className="flex items-center gap-3 self-start sm:self-auto bg-zinc-950/60 p-2.5 rounded-2xl border border-zinc-800/80">
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-200">Maryland Tax Mode</span>
              {useMdTax && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  -8.95%
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400">
              State (5.75%) + County (3.20%)
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleMdTax}
            className={`cursor-pointer transition-colors ${
              useMdTax ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-400'
            }`}
            title="Toggle Maryland state & county income tax deduction"
          >
            {useMdTax ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </div>
      </div>

      {/* Waterfall Flow Nodes */}
      {baselineGross <= 0 ? (
        <div className="mt-6 p-8 rounded-2xl bg-zinc-950/60 border border-dashed border-zinc-800 text-center space-y-2">
          <p className="text-sm font-semibold text-zinc-300">No monthly income connected yet</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Once you connect your bank account via Plaid or record your monthly paycheck, your real cash flow waterfall will route automatically here with zero placeholders.
          </p>
        </div>
      ) : (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mt-6 space-y-3"
      >
        {/* Node 0: Initial Take-Home */}
        <motion.div
          variants={itemVariants}
          className="relative rounded-2xl p-4 bg-zinc-900/90 border border-emerald-500/30 shadow-lg shadow-emerald-500/5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-300">Starting Take-Home Income</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    Baseline
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  {useMdTax
                    ? `Gross $${baselineGross.toLocaleString()} − MD Tax ($${Math.round(mdTaxDeduction).toLocaleString()})`
                    : 'Gross monthly baseline net income'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-400">
                ${Math.round(netTakeHome).toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-500 font-medium">100.0% of cash in</div>
            </div>
          </div>
        </motion.div>

        {/* Step Nodes: Sequential Outflows */}
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.id}>
              {/* Connector Line */}
              <div className="flex items-center justify-center -my-1.5">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-950/80 border border-zinc-800 text-[10px] text-zinc-500 font-mono">
                  <ArrowDown size={11} className="text-zinc-400 animate-pulse" />
                  <span>leaves ${Math.round(step.prevBalance).toLocaleString()}</span>
                </div>
              </div>

              {/* Outflow Card */}
              <motion.div
                variants={itemVariants}
                className="rounded-2xl p-3.5 bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center ${step.color}`}
                    >
                      <Icon size={17} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-200">{step.name}</div>
                      <div className="text-[11px] text-zinc-400">
                        {step.percentageOfNet}% of take-home
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-rose-400">
                      -${step.amount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      rem: ${Math.round(step.remainingAfter).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Progress bar of drain */}
                <div className="mt-2.5 w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (step.amount / netTakeHome) * 100 * 2.5)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`h-full rounded-full ${step.barColor}`}
                  />
                </div>
              </motion.div>
            </React.Fragment>
          );
        })}

        {/* Connector Line to Terminating Node */}
        <div className="flex items-center justify-center -my-1">
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] text-emerald-300 font-bold">
            <ArrowDown size={11} className="text-emerald-400" />
            <span>TERMINATING LIQUID POOL</span>
          </div>
        </div>

        {/* Final Terminating Node: True Discretionary Cash Pool */}
        <motion.div
          variants={itemVariants}
          className="relative rounded-2xl p-5 bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-indigo-950/60 border-2 border-emerald-500/60 shadow-xl shadow-emerald-500/10 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={16} />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  True Discretionary Cash Pool
                </span>
              </div>
              <p className="text-xs text-zinc-300 max-w-sm">
                Unencumbered surplus available for debt acceleration, relocation savings, and food allocation.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-emerald-400 tracking-tight">
                ${Math.round(trueDiscretionaryCash).toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 font-medium">
                {((trueDiscretionaryCash / netTakeHome) * 100).toFixed(1)}% of net cash retained
              </div>
            </div>
          </div>

          {/* Breakdown summary pills */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-300">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Fixed Outflows</span>
              <span className="font-bold text-rose-400">${totalFixedOutflows.toLocaleString()}/mo</span>
            </div>
            <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-300">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Daily Free Cash</span>
              <span className="font-bold text-emerald-400">
                ${(trueDiscretionaryCash / 30).toFixed(2)}/day
              </span>
            </div>
            <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-300 col-span-2 sm:col-span-1">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Discretionary Ratio</span>
              <span className="font-bold text-indigo-300">
                {((trueDiscretionaryCash / netTakeHome) * 100).toFixed(0)}% surplus margin
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </div>
  );
}
