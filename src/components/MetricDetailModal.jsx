import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Building2,
  CreditCard,
  TrendingUp,
  Compass,
  Sparkles,
  Car,
  Layers,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { formatMoney } from '../lib/store.js';

// Interactive Simulators
import RelocationGoalWidget from './RelocationGoalWidget.jsx';
import KiaPayoffGauge from './KiaPayoffGauge.jsx';
import TaxShieldSlider from './TaxShieldSlider.jsx';
import WaterfallCashFlow from './WaterfallCashFlow.jsx';

/**
 * MetricDetailModal
 *
 * Modeled after the Apple Health detail view.
 * When a user taps ANY high-level metric tile on the overview,
 * this sheet opens with:
 *  1. Big bold numbers & friendly status
 *  2. "About This Metric" written for a high school student (zero confusing jargon)
 *  3. Interactive simulator or quick action tool
 *  4. Deep-dive navigation link to the full tab
 */
export default function MetricDetailModal({
  isOpen,
  metricType, // 'cash' | 'spending' | 'debts' | 'goal_cushion' | 'investments' | 'sim_tax' | 'sim_car' | 'sim_waterfall'
  onClose,
  data = {},
  onNavigateTab,
  onOpenLink,
  onAddEntry,
}) {
  if (!isOpen || !metricType) return null;

  const {
    totalCashInBank = 0,
    totalCreditBalance = 0,
    totalPortfolioValue = 0,
    totalVariable = 0,
    bankAccounts = [],
    creditAccounts = [],
    investmentAccounts = [],
    debts = [],
    entries = [],
    budgets = {},
    relocationSaved = 0,
    relocationTarget = 3000,
    actualNetIncome = 0,
    vehicleLoanBalance = 0,
  } = data;

  const relocationPct = Math.min(100, Math.round((relocationSaved / relocationTarget) * 100));

  // Configuration for each Apple Health style metric
  const configs = {
    cash: {
      title: 'Cash in Accounts',
      badge: 'Liquid Money',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: <Building2 className="text-blue-400" size={24} />,
      bigValue: formatMoney(totalCashInBank),
      subtext: `${bankAccounts.length} bank account${bankAccounts.length === 1 ? '' : 's'} linked`,
      studentExplanation: {
        what: 'This is the money sitting in your checking and savings accounts right now.',
        why: 'Keeping 1 to 2 months of living expenses in checking means you will never bounce a check, pay an overdraft fee, or stress over everyday bills.',
        tip: 'Money in a High-Yield Savings Account (HYSA) earns 4%–5% interest every year just for sitting there, while regular checking usually earns almost nothing.',
      },
      targetTab: 'wealth',
      actionLabel: 'Manage Accounts',
    },
    spending: {
      title: 'Spending This Month',
      badge: 'Daily Activity',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      icon: <CreditCard className="text-orange-400" size={24} />,
      bigValue: formatMoney(totalVariable),
      subtext: 'Spent on food, shopping, gas & fun',
      studentExplanation: {
        what: 'Every dollar you spend each day on things like takeout, groceries, coffee, and entertainment.',
        why: 'Tracking your spending keeps small $10 and $15 daily purchases from silently adding up to hundreds of dollars by the end of the month.',
        tip: 'Cooking at home just 2 extra nights a week can easily save $200 a month without feeling like you are restricting yourself.',
      },
      targetTab: 'spending',
      actionLabel: 'Open Spending Tab',
    },
    debts: {
      title: 'Bills & Debts Owed',
      badge: 'Obligations',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: <Car className="text-amber-400" size={24} />,
      bigValue: totalCreditBalance > 0 ? formatMoney(totalCreditBalance) : (debts.length > 0 ? `${debts.length} Active Debts` : '$0.00'),
      subtext: debts.length > 0 ? `${debts.length} active loan / credit line` : 'No debts linked',
      studentExplanation: {
        what: 'Money you currently owe to credit card companies, banks, or auto lenders, plus your monthly fixed bills.',
        why: 'Credit card interest can be 20% or higher, which means debt doubles fast if you only pay minimums. Paying off debt gives you an instant guaranteed return.',
        tip: 'Whenever you have extra money, send it to the debt with the highest interest rate first (called the Debt Avalanche method).',
      },
      targetTab: 'debts',
      actionLabel: 'Open Debts & Bills',
    },
    goal_cushion: {
      title: 'Move & Emergency Cushion',
      badge: 'Primary Goal • Phase 1',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      icon: <Compass className="text-cyan-400" size={24} />,
      bigValue: `${formatMoney(relocationSaved)} / ${formatMoney(relocationTarget)}`,
      subtext: `${relocationPct}% funded towards $3,000 goal`,
      studentExplanation: {
        what: 'A dedicated $3,000 cash fund reserved for apartment deposits, moving costs, and unexpected emergencies.',
        why: 'Without an emergency buffer, a flat tire or surprise medical bill forces you into credit card debt. Having this money gives you peace of mind.',
        tip: 'Once this $3,000 goal hits 100%, any extra savings automatically routes to your car loan and long-term investments!',
      },
      targetTab: 'optimize',
      actionLabel: 'View Goal Simulator',
    },
    investments: {
      title: 'Investments & Growth',
      badge: 'Long-Term Wealth',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: <TrendingUp className="text-emerald-400" size={24} />,
      bigValue: formatMoney(totalPortfolioValue),
      subtext: investmentAccounts.length > 0 ? `${investmentAccounts.length} portfolio account` : 'Robinhood & retirement accounts',
      studentExplanation: {
        what: 'Money invested in index funds, stocks, or retirement accounts like a Roth IRA or 401(k).',
        why: 'Money in savings loses buying power over time due to inflation. Investing in the stock market historically grows at ~8%–10% per year, compounding your wealth.',
        tip: 'Thanks to compound interest, starting to invest at age 18 or 22 means you need to save thousands less than someone who starts at age 35.',
      },
      targetTab: 'wealth',
      actionLabel: 'Open Wealth Tab',
    },
    sim_tax: {
      title: 'Paycheck & 401(k) Tax Shield',
      badge: 'Smart Tool',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      icon: <Sparkles className="text-indigo-400" size={24} />,
      bigValue: 'Save 30% on Taxes',
      subtext: 'Interactive retirement simulator',
      studentExplanation: {
        what: 'A tool that shows how investing into a 401(k) lowers the taxes taken out of your paycheck.',
        why: 'Money you contribute to a traditional 401(k) is taken out before taxes are calculated. If your tax rate is 30%, a $100 investment only reduces your take-home pay by $70!',
        tip: 'Always contribute at least enough to get your full employer match—it is 100% free money on top of your salary.',
      },
      targetTab: 'optimize',
      actionLabel: 'Open in Simulators',
    },
    sim_car: {
      title: 'Car Loan Payoff Speedometer',
      badge: 'Debt Crusher',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: <Car className="text-amber-400" size={24} />,
      bigValue: vehicleLoanBalance > 0 ? formatMoney(vehicleLoanBalance) : 'Car Payoff Plan',
      subtext: 'Slide extra payments to crush loan interest',
      studentExplanation: {
        what: 'A calculator that reveals how fast an extra $50 to $200 per month will eliminate an auto loan.',
        why: 'Car loans charge interest every month. When you send extra payments marked "Principal-Only", you shorten the loan by months and save hundreds in bank interest.',
        tip: 'Keeping a reliable paid-off car long-term permanently saves you $400–$800 a month compared to jumping into another lease.',
      },
      targetTab: 'optimize',
      actionLabel: 'Open in Simulators',
    },
    sim_waterfall: {
      title: 'Monthly Money Flow Waterfall',
      badge: 'Cash Flow',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      icon: <Layers className="text-teal-400" size={24} />,
      bigValue: actualNetIncome > 0 ? `${formatMoney(actualNetIncome)}/mo` : 'Cash Flow Map',
      subtext: 'Step-by-step route of your paycheck',
      studentExplanation: {
        what: 'A visual map showing how each paycheck flows through fixed rent, groceries, and into your savings surplus.',
        why: 'Paycheck-to-paycheck stress happens when money flows out faster than it flows in. Seeing the flow helps you clearly spot where you can save.',
        tip: 'Pay your future self first: set up an automatic transfer on payday directly into savings before you have a chance to spend it.',
      },
      targetTab: 'optimize',
      actionLabel: 'Open in Simulators',
    },
  };

  const current = configs[metricType] || configs.cash;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Apple Health style Sheet Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* iOS-style drag handle */}
          <div className="w-12 h-1.5 bg-zinc-700/60 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

          {/* Top Bar */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${current.badgeColor}`}>
                {current.badge}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* 1. Header & Big Metric */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 text-zinc-400">
                {current.icon}
                <span className="text-xs font-bold uppercase tracking-wider">{current.title}</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight pt-1">
                {current.bigValue}
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                {current.subtext}
              </p>
            </div>

            {/* 2. High School Plain English "About This Metric" */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 space-y-3">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-bold">
                <HelpCircle size={15} className="text-blue-400 shrink-0" />
                <span>The Basics (High School Plain English)</span>
              </div>

              <div className="space-y-2 text-xs leading-relaxed text-zinc-300">
                <p>
                  <strong className="text-white">What it is: </strong>
                  {current.studentExplanation.what}
                </p>
                <p>
                  <strong className="text-white">Why it matters: </strong>
                  {current.studentExplanation.why}
                </p>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 flex items-start gap-2 mt-2">
                  <CheckCircle2 size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">
                    <strong>Rule of thumb: </strong>{current.studentExplanation.tip}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Embedded Quick Tool / Interactive Simulator */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block px-1">
                Interactive Detail & Tool
              </span>

              {metricType === 'goal_cushion' && (
                <div className="rounded-2xl border border-zinc-800 overflow-hidden">
                  <RelocationGoalWidget cap={relocationTarget} emergencyTarget={10000} />
                </div>
              )}

              {metricType === 'sim_tax' && (
                <div className="rounded-2xl border border-zinc-800 overflow-hidden">
                  <TaxShieldSlider
                    annualSalary={actualNetIncome > 0 ? actualNetIncome * 12 : 0}
                    marginalTaxRate={0.30}
                  />
                </div>
              )}

              {metricType === 'sim_car' && (
                <div className="rounded-2xl border border-zinc-800 overflow-hidden">
                  <KiaPayoffGauge
                    loanBalance={vehicleLoanBalance}
                    annualApr={0.125}
                    baseMinPayment={vehicleLoanBalance > 0 ? 230 : 0}
                  />
                </div>
              )}

              {metricType === 'sim_waterfall' && (
                <div className="rounded-2xl border border-zinc-800 overflow-hidden">
                  <WaterfallCashFlow
                    netIncome={actualNetIncome}
                    rentExpense={budgets?.['rent'] || budgets?.['housing'] || 0}
                    groceryExpense={budgets?.['groceries'] || budgets?.['food'] || 0}
                  />
                </div>
              )}

              {metricType === 'cash' && (
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-300 font-semibold">
                    <span>Connected Bank Accounts</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenLink?.();
                      }}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Plus size={13} /> Link Plaid
                    </button>
                  </div>
                  {bankAccounts.length === 0 ? (
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 text-center space-y-2">
                      <p className="text-xs text-zinc-400">No bank accounts linked yet.</p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenLink?.();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Building2 size={13} /> Connect Bank Account
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bankAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-white block">{acc.name}</span>
                            <span className="text-[10px] text-zinc-500 capitalize">{acc.subtype || acc.type} ••••{acc.mask || '••••'}</span>
                          </div>
                          <span className="font-mono font-bold text-white">
                            {formatMoney(acc.balanceCurrent ?? acc.balanceAvailable ?? 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {metricType === 'spending' && (
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-300 font-semibold">
                    <span>Recent Spending Items</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onAddEntry?.();
                      }}
                      className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Plus size={13} /> Add Expense
                    </button>
                  </div>
                  {entries.length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-3">No expenses logged yet this month.</p>
                  ) : (
                    <div className="space-y-2">
                      {entries.slice(0, 4).map((entry) => (
                        <div
                          key={entry.id}
                          className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-white block">{entry.description || entry.category}</span>
                            <span className="text-[10px] text-zinc-500">{entry.date || 'Today'}</span>
                          </div>
                          <span className="font-mono font-bold text-orange-400">
                            -{formatMoney(entry.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {metricType === 'debts' && (
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-300 font-semibold">
                    <span>Debts & Active Loans</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateTab?.('debts');
                      }}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Plus size={13} /> Add Debt
                    </button>
                  </div>
                  {debts.length === 0 && totalCreditBalance === 0 ? (
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 text-center space-y-1">
                      <p className="text-xs text-emerald-400 font-bold">Debt Free!</p>
                      <p className="text-[11px] text-zinc-500">No active debts or credit card balances found.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {debts.map((d) => (
                        <div
                          key={d.id}
                          className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-white block">{d.name}</span>
                            <span className="text-[10px] text-zinc-500">{d.apr ? `${d.apr}% APR` : 'Fixed loan'}</span>
                          </div>
                          <span className="font-mono font-bold text-amber-400">
                            {formatMoney(d.balance || 0)}
                          </span>
                        </div>
                      ))}
                      {creditAccounts.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-white block">{c.name}</span>
                            <span className="text-[10px] text-zinc-500">Credit Card ••••{c.mask || '••••'}</span>
                          </div>
                          <span className="font-mono font-bold text-red-400">
                            -{formatMoney(c.balanceCurrent || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {metricType === 'investments' && (
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                  <span className="text-xs text-zinc-300 font-semibold block">Investment Portfolios</span>
                  {investmentAccounts.length === 0 ? (
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 text-center space-y-1">
                      <p className="text-xs text-zinc-400">No investment accounts linked yet.</p>
                      <p className="text-[11px] text-zinc-500">Connect Robinhood or your 401(k) provider in Accounts.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {investmentAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-white block">{acc.name}</span>
                            <span className="text-[10px] text-zinc-500 capitalize">{acc.subtype || 'Portfolio'}</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-400">
                            {formatMoney(acc.balanceCurrent || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 px-6 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between shrink-0">
            <span className="text-xs text-zinc-500">Apple Health Style Metric Detail</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateTab?.(current.targetTab);
              }}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{current.actionLabel}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
