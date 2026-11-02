import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  TrendingUp,
  Percent,
  Sparkles,
} from 'lucide-react';
import { formatMoney } from '../lib/store.js';

/**
 * Component 1: Tax Shield Slider
 *
 * Salary: $90,000/year ($7,500/mo gross).
 * Adjusts 401(k) pre-tax contribution (0% to 10%, default 6%).
 * Calculates:
 *  - Gross Investment: e.g. 6% of $7,500 = $450/mo.
 *  - Tax Shield Savings: 30% marginal tax rate = $135/mo tax subsidy.
 *  - Net Paycheck Reduction: $450 - $135 = $315/mo.
 */

export default function TaxShieldSlider({
  annualSalary = 90000,
  marginalTaxRate = 0.30,
}) {
  const [contributionPct, setContributionPct] = useState(6.0);

  const monthlyGross = annualSalary / 12; // $7,500
  const grossMonthlyInvestment = (monthlyGross * contributionPct) / 100;
  const monthlyTaxSavings = grossMonthlyInvestment * marginalTaxRate;
  const netPaycheckDrop = grossMonthlyInvestment - monthlyTaxSavings;
  const annualGrossInvestment = grossMonthlyInvestment * 12;
  const annualTaxSavings = monthlyTaxSavings * 12;

  // 10-year compound growth projection at 8% annual return
  const tenYearFV = Math.round(
    grossMonthlyInvestment * (((Math.pow(1 + 0.08 / 12, 120) - 1) / (0.08 / 12)))
  );

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-zinc-900/90 to-zinc-950 border border-indigo-500/25 shadow-2xl backdrop-blur-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck size={18} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Pre-Tax Wealth Optimization
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            401(k) Tax Shield Slider
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Based on a ${annualSalary.toLocaleString()} salary (${monthlyGross.toLocaleString()}/mo gross) and a {(marginalTaxRate * 100).toFixed(0)}% marginal tax rate.
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase font-bold text-zinc-500 block">Contribution Rate</span>
          <span className="text-3xl font-black text-indigo-400 font-mono">
            {contributionPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Interactive Slider Card */}
      <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="tax-shield-slider-input" className="font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Percent size={13} className="text-indigo-400" />
            401(k) Salary Contribution Rate
          </label>
          <span className="text-xs font-mono text-zinc-400">
            {contributionPct === 6 ? '⭐ Match Sweet Spot' : `${contributionPct}% of Gross`}
          </span>
        </div>

        {/* Range Slider */}
        <input
          id="tax-shield-slider-input"
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={contributionPct}
          onChange={(e) => setContributionPct(parseFloat(e.target.value))}
          aria-label="401(k) Salary Contribution Rate"
          className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />

        <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
          <span>0%</span>
          <span className={contributionPct === 6 ? 'text-indigo-400 font-bold' : ''}>6% (Match)</span>
          <span>10%</span>
        </div>

        {/* Quick Select Buttons */}
        <div className="flex gap-2 pt-1">
          {[3, 6, 8, 10].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setContributionPct(rate)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                contributionPct === rate
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {rate}% {rate === 6 && '★'}
            </button>
          ))}
        </div>
      </div>

      {/* The Animated Tax Shield Contrast Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Gross Investment Box */}
        <motion.div
          key={`gross-${grossMonthlyInvestment}`}
          initial={{ scale: 0.96, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-1">
              Gross Capital Invested
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {formatMoney(grossMonthlyInvestment)}
              <span className="text-xs text-zinc-400 font-normal"> /mo</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 text-[11px] text-zinc-400">
            {formatMoney(annualGrossInvestment)}/year flowing directly into your 401(k).
          </div>
        </motion.div>

        {/* Tax Shield Subsidy Box */}
        <motion.div
          key={`tax-${monthlyTaxSavings}`}
          initial={{ scale: 0.96, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/40 flex flex-col justify-between shadow-lg shadow-indigo-500/10"
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 block mb-1">
              IRS Tax Shield Discount
            </span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-300 font-mono">
              +{formatMoney(monthlyTaxSavings)}
              <span className="text-xs text-indigo-200/70 font-normal"> /mo</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-indigo-500/20 text-[11px] text-indigo-200/80">
            {formatMoney(annualTaxSavings)}/yr in income taxes avoided.
          </div>
        </motion.div>

        {/* Actual Net Paycheck Drop Box */}
        <motion.div
          key={`net-${netPaycheckDrop}`}
          initial={{ scale: 0.96, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-2xl bg-zinc-950/70 border border-amber-500/30 flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block mb-1">
              Actual Paycheck Impact
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
              -{formatMoney(netPaycheckDrop)}
              <span className="text-xs text-zinc-400 font-normal"> /mo</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 text-[11px] text-zinc-400">
            True take-home cost out of your pocket.
          </div>
        </motion.div>
      </div>

      {/* Behavioral Psychology Callout Banner */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3">
        <Sparkles size={20} className="text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white">
            The Tax Shield Advantage
          </h4>
          <p className="text-xs text-zinc-300 leading-relaxed">
            By contributing <strong className="text-white">{formatMoney(grossMonthlyInvestment)}</strong> to your retirement account, your net paycheck only reduces by <strong className="text-amber-300">{formatMoney(netPaycheckDrop)}</strong>. The federal & state tax code effectively funds the remaining <strong className="text-indigo-300">{formatMoney(monthlyTaxSavings)}</strong> every month.
          </p>
          <div className="pt-1.5 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
            <TrendingUp size={13} />
            <span>10-Yr Compounded Value @ 8%: ~{formatMoney(tenYearFV)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
