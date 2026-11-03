import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  ArrowDown,
  Building,
  ShoppingBag,
  Zap,
  Sparkles,
  Car,
  Compass,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { formatMoney } from '../lib/store.js';

/**
 * Component 3: Waterfall Cash Flow
 *
 * Routes a $5,160 net monthly income through fixed expenses:
 *  - $2,000 Rent
 *  - $330 Prep Groceries
 *  - $870 Essential Fixed Bills (Utilities $220, Insurance $160, Fuel $146, Base Loan $230, Phone $114)
 * Down into an interactive $1,960 surplus bucket.
 * The interactive surplus bucket allows testing routing among Debt, Relocation, and Wealth.
 */

export default function WaterfallCashFlow({
  netIncome = 5160,
  rentExpense = 2000,
  groceryExpense = 330,
}) {
  const otherFixed = 870; // Utilities, auto insurance, base car min, fuel
  const totalOutflows = rentExpense + groceryExpense + otherFixed; // $3,200
  const surplusTotal = Math.max(0, netIncome - totalOutflows); // exactly $1,960

  // Interactive surplus bucket allocations (Phase 1: Relocation Buffer is urgent; Phase 2: Kia Debt starts January)
  const [relocAlloc, setRelocAlloc] = useState(1200);
  const [debtAlloc, setDebtAlloc] = useState(400);
  const wealthAlloc = Math.max(0, surplusTotal - relocAlloc - debtAlloc);

  const steps = [
    {
      id: 'rent',
      name: 'Apartment Rent',
      amount: rentExpense,
      icon: Building,
      color: 'from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30',
      bar: 'bg-amber-500',
      remAfter: netIncome - rentExpense,
    },
    {
      id: 'groceries',
      name: 'Prep Groceries (Costco & Staples)',
      amount: groceryExpense,
      icon: ShoppingBag,
      color: 'from-orange-500/20 to-orange-600/10 text-orange-400 border-orange-500/30',
      bar: 'bg-orange-500',
      remAfter: netIncome - rentExpense - groceryExpense,
    },
    {
      id: 'other',
      name: 'Utilities, Insurance, Fuel & Minimums',
      amount: otherFixed,
      icon: Zap,
      color: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30',
      bar: 'bg-blue-500',
      remAfter: surplusTotal,
    },
  ];

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-950 border border-zinc-800 shadow-2xl backdrop-blur-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Layers size={18} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Cash Flow Waterfall Architecture
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Take-Home to Surplus Drain
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Routes ${netIncome.toLocaleString()} take-home through fixed foundations down into unencumbered surplus.
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase font-bold text-zinc-500 block">Surplus Cash Pool</span>
          <span className="text-3xl font-black text-emerald-400 font-mono">
            {formatMoney(surplusTotal)}
            <span className="text-xs text-zinc-400 font-normal"> /mo</span>
          </span>
        </div>
      </div>

      {/* Waterfall Flow Nodes */}
      <div className="space-y-3">
        {/* Starting Net Node */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-emerald-500/30 shadow-lg shadow-emerald-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-xs font-bold text-white">Starting Net Monthly Income</span>
              <p className="text-[11px] text-zinc-400">Total paycheck cash landing in checking</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {formatMoney(netIncome)}
            </span>
            <span className="text-[10px] text-zinc-500 block font-medium">100.0% Initial Cash</span>
          </div>
        </div>

        {/* Sequential Outflow Steps */}
        {steps.map((step) => {
          const Icon = step.icon;
          const drainPct = ((step.amount / netIncome) * 100).toFixed(1);

          return (
            <React.Fragment key={step.id}>
              {/* Connector Pin */}
              <div className="flex justify-center -my-1.5">
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-500 font-mono">
                  <ArrowDown size={11} className="text-zinc-400" />
                  <span>leaves {formatMoney(step.remAfter)}</span>
                </div>
              </div>

              {/* Outflow Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${step.color}`}>
                    <Icon size={17} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-200">{step.name}</div>
                    <div className="text-[11px] text-zinc-500">{drainPct}% of monthly net</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-rose-400 font-mono">
                    -{formatMoney(step.amount)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    rem: {formatMoney(step.remAfter)}
                  </div>
                </div>
              </motion.div>
            </React.Fragment>
          );
        })}

        {/* Connector Pin to Terminating Node */}
        <div className="flex justify-center -my-1">
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] text-emerald-300 font-bold">
            <ArrowDown size={12} className="text-emerald-400 animate-pulse" />
            <span>TERMINATING SURPLUS RESERVOIR</span>
          </div>
        </div>

        {/* Interactive $1,960 Surplus Bucket */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-indigo-950/50 border-2 border-emerald-500/50 shadow-xl shadow-emerald-500/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={16} />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  Interactive Surplus Bucket
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                ${surplusTotal.toLocaleString()}/mo discretionary power available for wealth execution.
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-400 font-mono">
                {formatMoney(surplusTotal)}
              </span>
              <span className="text-[10px] text-zinc-400 block">38.0% Margin Retained</span>
            </div>
          </div>

          {/* Surplus Routing Interactive Sliders */}
          <div className="pt-3 border-t border-zinc-800 space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
              Test Route Your $1,960 Surplus:
            </span>

            {/* Allocation 1: Urgent Relocation Buffer (Phase 1) */}
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-cyan-500/30 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
                  <Compass size={13} className="text-cyan-400" />
                  <span>Jan 2027 Relocation Buffer</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                    Phase 1 • Urgent
                  </span>
                </div>
                <span className="font-mono font-bold text-cyan-400">{formatMoney(relocAlloc)}/mo</span>
              </div>
              <input
                type="range"
                min={0}
                max={surplusTotal - debtAlloc}
                step={50}
                value={relocAlloc}
                onChange={(e) => setRelocAlloc(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Allocation 2: Kia Debt Acceleration (Phase 2 - Starts Jan) */}
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
                  <Car size={13} className="text-amber-400" />
                  <span>Kia Loan Payoff Sprint</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                    Phase 2 • Starts Jan
                  </span>
                </div>
                <span className="font-mono font-bold text-amber-400">{formatMoney(debtAlloc)}/mo</span>
              </div>
              <input
                type="range"
                min={0}
                max={surplusTotal - relocAlloc}
                step={50}
                value={debtAlloc}
                onChange={(e) => setDebtAlloc(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Allocation 3: Index Wealth Residual */}
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 flex justify-between items-center text-xs">
              <span className="text-zinc-300 flex items-center gap-1.5 font-semibold">
                <TrendingUp size={13} className="text-indigo-400" /> Roth IRA & Index Funds (Remainder)
              </span>
              <span className="font-mono font-black text-indigo-300 text-sm">{formatMoney(wealthAlloc)}/mo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
