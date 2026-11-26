import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Flame, RotateCcw, Lock, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '../lib/store.js';
import { computeFinancialBlueprint } from '../lib/goalEngine.js';

function formatCompactMoney(val = 0) {
  const abs = Math.abs(Number(val) || 0);
  if (abs >= 1000000) {
    return `${val < 0 ? '-' : ''}$${(abs / 1000000).toFixed(2)}M`;
  }
  if (abs >= 100000) {
    return `${val < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}k`;
  }
  if (abs >= 10000) {
    return `${val < 0 ? '-' : ''}$${Math.round(abs).toLocaleString('en-US')}`;
  }
  return val < 0 ? `-${formatMoney(abs)}` : formatMoney(abs);
}

function formatGoalShort(target = 1000) {
  if (target >= 1000000) {
    const m = target / 1000000;
    return `$${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (target >= 1000) {
    const k = target / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `$${target}`;
}

function calcBucketFill(amount = 0, target = 1000) {
  const cleanAmt = Math.max(0, Number(amount) || 0);
  const cleanTarget = Math.max(1, Number(target) || 1);
  const exactPct = cleanAmt >= cleanTarget ? 100 : Math.round((cleanAmt / cleanTarget) * 100);
  const visualFillPct = cleanAmt <= 0 ? 0 : Math.min(100, Math.max(10, exactPct));
  const level = exactPct >= 100 ? 4 : exactPct >= 66 ? 3 : exactPct >= 33 ? 2 : 1;
  return { exactPct, visualFillPct, level };
}

/**
 * Single Animated Glass Liquid Bucket
 */
function LiquidBucket({
  title,
  amountText,
  badgeText,
  goalText,
  percentLabel,
  fillPct = 0,
  theme = 'blue', // 'blue' | 'emerald' | 'amber' | 'shield' | 'cyan'
  replayKey = 0,
  onClick,
}) {
  const palettes = {
    blue: {
      border: 'border-blue-500/30 hover:border-blue-400/60',
      vesselBorder: 'border-blue-400/35',
      titleColor: 'text-blue-400',
      amountColor: 'text-white',
      pillBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      liquidGradient: 'from-blue-600/95 via-blue-500/90 to-cyan-400/90',
      waveFront: '#38bdf8',
      waveBack: '#2563eb',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.22)]',
    },
    cyan: {
      border: 'border-cyan-500/30 hover:border-cyan-400/60',
      vesselBorder: 'border-cyan-400/35',
      titleColor: 'text-cyan-400',
      amountColor: 'text-white',
      pillBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      liquidGradient: 'from-cyan-600/95 via-teal-500/90 to-sky-300/90',
      waveFront: '#22d3ee',
      waveBack: '#0891b2',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.22)]',
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-400/60',
      vesselBorder: 'border-emerald-400/35',
      titleColor: 'text-emerald-400',
      amountColor: 'text-emerald-400',
      pillBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      liquidGradient: 'from-emerald-600/95 via-emerald-500/90 to-teal-300/90',
      waveFront: '#34d399',
      waveBack: '#059669',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.22)]',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-400/60',
      vesselBorder: 'border-amber-400/35',
      titleColor: 'text-amber-400',
      amountColor: 'text-amber-400',
      pillBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      liquidGradient: 'from-rose-600/95 via-amber-500/90 to-orange-400/90',
      waveFront: '#fbbf24',
      waveBack: '#e11d48',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.22)]',
    },
    shield: {
      border: 'border-teal-500/35 hover:border-teal-400/60',
      vesselBorder: 'border-teal-400/45',
      titleColor: 'text-teal-300',
      amountColor: 'text-teal-300',
      pillBg: 'bg-teal-500/15 text-teal-200 border-teal-500/35',
      liquidGradient: 'from-teal-600/80 via-emerald-500/75 to-cyan-400/80',
      waveFront: '#2dd4bf',
      waveBack: '#0d9488',
      glow: 'shadow-[0_0_22px_rgba(45,212,191,0.28)]',
    },
  };

  const p = palettes[theme] || palettes.blue;

  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`p-2.5 sm:p-3.5 rounded-2xl bg-zinc-950/85 border ${p.border} transition-colors cursor-pointer flex flex-col items-center text-center justify-between group w-full min-w-0`}
    >
      {/* Top Level / Strategy Badge */}
      <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${p.pillBg} mb-2 whitespace-nowrap truncate max-w-full`}>
        {badgeText}
      </span>

      {/* Glass Bucket Vessel */}
      <div
        className={`relative w-14 h-20 sm:w-16 sm:h-24 rounded-b-2xl rounded-t-md border-2 ${p.vesselBorder} bg-zinc-900/80 overflow-hidden ${fillPct > 0 ? p.glow : ''}`}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-white/15 z-20 pointer-events-none" />
        <div className="absolute left-1.5 top-2 bottom-2.5 w-1 rounded-full bg-white/15 z-20 pointer-events-none" />

        {/* Right Beaker Graduation Ticks */}
        <div className="absolute right-1 inset-y-0 flex flex-col justify-evenly items-end py-2 z-20 pointer-events-none opacity-45">
          <span className="w-2 h-[1.5px] bg-zinc-300 rounded-full" />
          <span className="w-3 h-[1.5px] bg-zinc-200 rounded-full" />
          <span className="w-2 h-[1.5px] bg-zinc-300 rounded-full" />
        </div>

        {/* Animated Liquid Fill */}
        <motion.div
          key={`${replayKey}-${fillPct}`}
          initial={{ height: '0%' }}
          animate={{ height: `${fillPct}%` }}
          transition={{ type: 'spring', stiffness: 68, damping: 15, mass: 0.9 }}
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t ${p.liquidGradient}`}
        >
          {fillPct > 0 && fillPct < 100 && (
            <div className="absolute -top-2.5 left-0 w-[200%] h-3 overflow-hidden pointer-events-none">
              <svg
                viewBox="0 0 120 12"
                preserveAspectRatio="none"
                className="w-full h-full bucket-wave-slow opacity-65"
              >
                <path
                  d="M0,6 Q15,0 30,6 T60,6 T90,6 T120,6 L120,12 L0,12 Z"
                  fill={p.waveBack}
                />
              </svg>
              <svg
                viewBox="0 0 120 12"
                preserveAspectRatio="none"
                className="w-full h-full absolute inset-0 bucket-wave-fast opacity-90"
              >
                <path
                  d="M0,6 Q15,12 30,6 T60,6 T90,6 T120,6 L120,12 L0,12 Z"
                  fill={p.waveFront}
                />
              </svg>
            </div>
          )}

          {fillPct >= 18 && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <span className="absolute bottom-1 left-3 w-1.5 h-1.5 rounded-full bg-white/50 bucket-bubble-1" />
              <span className="absolute bottom-1 left-7 w-1 h-1 rounded-full bg-white/45 bucket-bubble-2" />
              <span className="absolute bottom-1 right-3.5 w-1.5 h-1.5 rounded-full bg-white/40 bucket-bubble-3" />
            </div>
          )}
        </motion.div>

        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <span className="px-1.5 py-0.5 rounded-md bg-black/55 backdrop-blur-[2px] text-[10px] sm:text-[11px] font-black text-white tabular-nums shadow-sm">
            {percentLabel}
          </span>
        </div>
      </div>

      {/* Bottom Symmetrical Labels */}
      <div className="mt-2.5 w-full min-w-0 space-y-0.5">
        <div className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider ${p.titleColor} truncate`}>
          {title}
        </div>
        <div className={`text-xs sm:text-base font-black ${p.amountColor} tabular-nums truncate`}>
          {amountText}
        </div>
        <p className="text-[9px] sm:text-[10px] text-zinc-400 font-medium truncate">
          {goalText}
        </p>
      </div>
    </motion.button>
  );
}

/**
 * Circumstance-Adjusted Gamified Wealth Buckets.
 * Buckets are NOT created until the user answers all 4 Goal Coach questions!
 */
export default function WealthBuckets({
  totalCashInBank = 0,
  totalPortfolioValue = 0,
  totalDebts = 0,
  totalCreditBalance = 0,
  totalNetWorth = 0,
  totalVariable = 0,
  debts = [],
  linkedAccountsCount = 0,
  gameProfile,
  onSelectMetric,
}) {
  const [replayKey, setReplayKey] = useState(0);

  const unlocked = Boolean(gameProfile?.areBucketsUnlocked);
  const blueprint = useMemo(() => computeFinancialBlueprint(gameProfile), [gameProfile]);

  // Locked state BEFORE the user answers the 4 Goal Coach questions
  if (!unlocked) {
    const checklist = [
      { label: '1. Main Goal', done: Boolean(gameProfile?.hasGoalAnswer) },
      { label: '2. Income', done: (Number(gameProfile?.monthlyIncome) || 0) > 0 },
      { label: '3. Monthly Bills', done: (Number(gameProfile?.monthlyFixedExpenses) || 0) > 0 },
      { label: '4. Invest Style', done: Boolean(gameProfile?.riskProfile) },
    ];
    const completedCount = checklist.filter((c) => c.done).length;

    return (
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-dashed border-zinc-700/80 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Lock size={14} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-white truncate">
                Custom Buckets Locked ({completedCount}/4 Answered)
              </p>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Answer the Goal Coach questions above so your buckets are built around your exact goals, income & expenses.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {checklist.map((item) => (
            <div
              key={item.label}
              className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 ${
                item.done
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-zinc-900/70 border-zinc-800 text-zinc-500'
              }`}
            >
              {item.done ? (
                <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full border border-zinc-600 shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- UNLOCKED: Build Buckets Directly From User's Goals & Circumstances ---
  const hasAnyData =
    linkedAccountsCount > 0 ||
    totalCashInBank > 0 ||
    totalPortfolioValue > 0 ||
    totalDebts > 0 ||
    debts.length > 0;

  const cashTarget = Math.max(500, Number(gameProfile?.cashBucketTarget) || 1000);
  const investTarget = Math.max(500, Number(gameProfile?.investBucketTarget) || 1200);
  const netWorthTarget = Math.max(1000, Number(gameProfile?.netWorthTarget) || cashTarget + investTarget);
  const monthlyExpenses = Math.max(100, Number(gameProfile?.monthlyFixedExpenses) || 1000);

  // Bucket 1: User's Tailored Cash / Savings Goal Bucket
  const cashFill = calcBucketFill(totalCashInBank, cashTarget);
  const cashShortTitle = gameProfile?.primaryGoalName
    ? gameProfile.primaryGoalName.split(' ').slice(0, 2).join(' ')
    : 'Cash Goal';
  const cashSubtext =
    blueprint?.savingsDollar > 0
      ? `+${formatCompactMoney(blueprint.savingsDollar)}/mo · ${formatGoalShort(cashTarget)}`
      : `Target: ${formatGoalShort(cashTarget)}`;

  // Bucket 2: User's Tailored Investment Engine Bucket
  const investFill = calcBucketFill(totalPortfolioValue, investTarget);
  const investBadge = blueprint?.portfolioShortTag || `Lv.${investFill.level} Invest`;
  const investSubtext =
    blueprint?.investDollar > 0
      ? `+${formatCompactMoney(blueprint.investDollar)}/mo · ${formatGoalShort(investTarget)}`
      : `Target: ${formatGoalShort(investTarget)}`;

  // Bucket 3: Circumstance-Adaptive Bucket!
  // A) Has Debt or Debt Crusher Focus -> Debt Paydown Tank
  // B) Zero Debt & Specific Non-Emergency Goal (e.g. House/Trip/Wedding) -> 3-Mo Emergency Runway Bucket
  // C) Zero Debt & Primary Bucket IS Emergency Runway -> Monthly Living Surplus Bucket
  const hasDebtCircumstance =
    totalDebts > 0 ||
    (Number(gameProfile?.debtPayoffTarget) || 0) > 0 ||
    gameProfile?.focusMode === 'debt_crusher';

  const isPrimaryGoalNonEmergency =
    Boolean(gameProfile?.primaryGoalName) &&
    !/\b(emergency|runway|buffer|cushion|safety)\b/i.test(gameProfile.primaryGoalName);

  let thirdBucketProps;

  if (hasDebtCircumstance) {
    const customDebtStart = Number(gameProfile?.debtPayoffTarget) || 0;
    const originalDebtSum = Math.max(
      customDebtStart,
      debts.reduce((sum, d) => sum + (Number(d.principal || d.originalBalance || d.balance) || 0), 0) +
        totalCreditBalance,
    );
    const debtCeiling = Math.max(originalDebtSum, totalCashInBank + totalPortfolioValue, totalDebts, 1000);
    const isVerifiedDebtFree = hasAnyData && totalDebts === 0;
    const debtLavaPct =
      totalDebts > 0
        ? Math.min(92, Math.max(14, Math.round((totalDebts / debtCeiling) * 100)))
        : isVerifiedDebtFree
        ? 100
        : 0;
    const monthlyDebtPower = Math.max(blueprint?.debtDollar || 0, Math.round((blueprint?.surplus || 0) * 0.5));
    const monthsLeft =
      totalDebts > 0 && monthlyDebtPower > 0 ? Math.ceil(totalDebts / monthlyDebtPower) : null;

    thirdBucketProps = {
      title: isVerifiedDebtFree ? 'Debt Shield' : 'Debt Payoff',
      amountText: totalDebts > 0 ? `-${formatCompactMoney(totalDebts)}` : '$0.00',
      badgeText: isVerifiedDebtFree ? (
        <span className="inline-flex items-center gap-0.5">
          <ShieldCheck size={10} /> Clean
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5">
          <Flame size={10} /> Crush
        </span>
      ),
      goalText: isVerifiedDebtFree
        ? '100% Debt-Free!'
        : monthsLeft
        ? `~${monthsLeft} mo at ${formatCompactMoney(monthlyDebtPower)}/mo`
        : 'Drain to $0',
      percentLabel: isVerifiedDebtFree ? 'FREE' : totalDebts > 0 ? `${debtLavaPct}%` : '0%',
      fillPct: debtLavaPct,
      theme: isVerifiedDebtFree ? 'shield' : 'amber',
      metricKey: 'debts',
    };
  } else if (isPrimaryGoalNonEmergency) {
    // 3-Month Emergency Safety Net alongside their House / Trip / Wedding goal
    const emergencyTarget = Math.max(1500, Math.round((monthlyExpenses * 3) / 100) * 100);
    const emergFill = calcBucketFill(totalCashInBank, emergencyTarget);
    thirdBucketProps = {
      title: '3-Mo Safety',
      amountText: formatCompactMoney(totalCashInBank),
      badgeText: 'Safety Net',
      goalText: `3x Bills (${formatGoalShort(emergencyTarget)})`,
      percentLabel: `${emergFill.exactPct}%`,
      fillPct: emergFill.visualFillPct,
      theme: 'cyan',
      metricKey: 'goal_cushion',
    };
  } else {
    // Debt-free & Emergency Runway already in Bucket 1 -> Monthly Cash Surplus Bucket!
    const targetSurplus = Math.max(200, blueprint?.surplus || Math.round(monthlyExpenses * 0.25));
    const liveUnspentSurplus = Math.max(0, (Number(gameProfile?.monthlyIncome) || 0) - totalVariable);
    const cappedSurplus = hasAnyData ? Math.min(targetSurplus, liveUnspentSurplus) : 0;
    const surplusFill = calcBucketFill(cappedSurplus, targetSurplus);
    thirdBucketProps = {
      title: 'Mo. Surplus',
      amountText: formatCompactMoney(cappedSurplus),
      badgeText: 'Cash Flow',
      goalText: `Target: ${formatGoalShort(targetSurplus)}/mo`,
      percentLabel: `${surplusFill.exactPct}%`,
      fillPct: surplusFill.visualFillPct,
      theme: 'cyan',
      metricKey: 'sim_waterfall',
    };
  }

  // Custom Net Worth Milestone Bar
  const nwPct =
    totalNetWorth <= 0
      ? totalNetWorth < 0
        ? 10
        : 0
      : Math.min(100, Math.max(4, Math.round((totalNetWorth / netWorthTarget) * 100)));
  const nwRemaining = Math.max(0, netWorthTarget - Math.max(0, totalNetWorth));

  return (
    <div className="space-y-3.5">
      {/* Circumstance-Adjusted Net Worth Milestone Bar */}
      <div className="p-3 rounded-2xl bg-zinc-950/75 border border-zinc-800/90 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
          <span className="font-extrabold text-emerald-400 flex items-center gap-1.5 truncate">
            <Sparkles size={12} className="text-yellow-400 shrink-0" />
            <span className="truncate">
              {totalNetWorth < 0
                ? 'Quest: Positive Net Worth ($0)'
                : `Custom Net Worth Target: ${formatGoalShort(netWorthTarget)}`}
            </span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono font-bold text-zinc-200">{nwPct}%</span>
            <button
              type="button"
              onClick={() => setReplayKey((k) => k + 1)}
              title="Replay bucket fill animation"
              className="p-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Replay bucket animation"
            >
              <RotateCcw size={11} />
            </button>
          </div>
        </div>

        <div className="relative w-full h-2.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
          <motion.div
            key={`nw-${replayKey}-${nwPct}-${netWorthTarget}`}
            initial={{ width: '0%' }}
            animate={{ width: `${nwPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="relative h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 to-teal-300 overflow-hidden"
          >
            {nwPct > 0 && (
              <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent xp-bar-shimmer" />
            )}
          </motion.div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="truncate">
            {totalNetWorth < 0
              ? `${formatCompactMoney(Math.abs(totalNetWorth))} away from break-even`
              : nwRemaining > 0
              ? `${formatCompactMoney(nwRemaining)} to reach your ${formatGoalShort(netWorthTarget)} target`
              : 'Custom Net Worth Target Reached!'}
          </span>
          <span className="text-zinc-500 shrink-0">Tap any bucket</span>
        </div>
      </div>

      {/* 3 Circumstance-Calibrated Animated Liquid Buckets */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Bucket 1: Custom Cash / Primary Goal Bucket */}
        <LiquidBucket
          title={cashShortTitle}
          amountText={formatCompactMoney(totalCashInBank)}
          badgeText={`Lv.${cashFill.level} Cash`}
          goalText={cashSubtext}
          percentLabel={`${cashFill.exactPct}%`}
          fillPct={cashFill.visualFillPct}
          theme="blue"
          replayKey={`${replayKey}-${cashTarget}`}
          onClick={() => onSelectMetric?.('cash')}
        />

        {/* Bucket 2: Custom Investment Bucket */}
        <LiquidBucket
          title="Invest Plan"
          amountText={formatCompactMoney(totalPortfolioValue)}
          badgeText={investBadge}
          goalText={investSubtext}
          percentLabel={`${investFill.exactPct}%`}
          fillPct={investFill.visualFillPct}
          theme="emerald"
          replayKey={`${replayKey}-${investTarget}`}
          onClick={() => onSelectMetric?.('investments')}
        />

        {/* Bucket 3: Circumstance-Adaptive Bucket (Debt Tank / 3-Mo Safety / Monthly Surplus) */}
        <LiquidBucket
          title={thirdBucketProps.title}
          amountText={thirdBucketProps.amountText}
          badgeText={thirdBucketProps.badgeText}
          goalText={thirdBucketProps.goalText}
          percentLabel={thirdBucketProps.percentLabel}
          fillPct={thirdBucketProps.fillPct}
          theme={thirdBucketProps.theme}
          replayKey={`${replayKey}-${thirdBucketProps.title}`}
          onClick={() => onSelectMetric?.(thirdBucketProps.metricKey)}
        />
      </div>
    </div>
  );
}
