import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Flame, RotateCcw } from 'lucide-react';
import { formatMoney } from '../lib/store.js';

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

function buildGoalMilestones(customTarget, defaults) {
  const base = Number(customTarget) || 0;
  if (base <= 0) return defaults;
  const steps = [
    Math.max(500, Math.round(base * 0.25)),
    Math.max(1000, Math.round(base * 0.5)),
    base,
    base * 2,
    base * 5,
  ];
  return Array.from(new Set(steps)).sort((a, b) => a - b);
}

function getTierProgress(amount = 0, milestones = [1000, 3000, 10000, 25000, 50000, 100000], customTarget = 0) {
  const clean = Math.max(0, Number(amount) || 0);
  if (customTarget > 0 && clean <= customTarget) {
    const exactPct = clean >= customTarget ? 100 : Math.round((clean / customTarget) * 100);
    const visualFillPct = clean <= 0 ? 0 : Math.min(100, Math.max(10, exactPct));
    const level = exactPct >= 75 ? 3 : exactPct >= 35 ? 2 : 1;
    return {
      level,
      target: customTarget,
      exactPct,
      visualFillPct,
    };
  }
  let idx = milestones.findIndex((m) => clean < m);
  if (idx === -1) idx = milestones.length - 1;
  const target = milestones[idx];
  const level = idx + 1;
  const exactPct = clean >= target ? 100 : Math.round((clean / target) * 100);
  const visualFillPct = clean <= 0 ? 0 : Math.min(100, Math.max(10, exactPct));
  return {
    level,
    target,
    exactPct,
    visualFillPct,
  };
}

function getNetWorthMilestone(netWorth = 0, hasAnyData = false, customNetWorthTarget = 0) {
  if (!hasAnyData && netWorth === 0) {
    const goalLabel = customNetWorthTarget > 0 ? formatGoalShort(customNetWorthTarget) : '$1k';
    return {
      label: `Quest: Reach ${goalLabel} Net Worth`,
      subtext: 'Connect accounts to fill your buckets',
      pct: 0,
    };
  }
  if (netWorth < 0) {
    return {
      label: 'Quest: Positive Net Worth ($0)',
      subtext: `${formatCompactMoney(Math.abs(netWorth))} away from break-even`,
      pct: 12,
    };
  }
  if (customNetWorthTarget > 0 && netWorth <= customNetWorthTarget) {
    const pct = netWorth === 0 ? 0 : Math.min(100, Math.max(4, Math.round((netWorth / customNetWorthTarget) * 100)));
    const remaining = Math.max(0, customNetWorthTarget - netWorth);
    return {
      label: `Goal: ${formatGoalShort(customNetWorthTarget)} Net Worth`,
      subtext: remaining > 0 ? `${formatCompactMoney(remaining)} to reach your goal` : 'Custom Net Worth Goal Reached!',
      pct,
    };
  }
  const ladders = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  const next = ladders.find((m) => netWorth < m) || 1000000;
  const prevIdx = ladders.indexOf(next) - 1;
  const prev = prevIdx >= 0 ? ladders[prevIdx] : 0;
  const span = Math.max(1, next - prev);
  const pct = netWorth >= next ? 100 : Math.min(100, Math.max(4, Math.round(((netWorth - prev) / span) * 100)));
  const remaining = Math.max(0, next - netWorth);
  return {
    label: `Road to ${formatGoalShort(next)} Net Worth`,
    subtext: remaining > 0 ? `${formatCompactMoney(remaining)} to unlock next tier` : 'Top Milestone Unlocked!',
    pct,
  };
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
  theme = 'blue', // 'blue' | 'emerald' | 'amber' | 'shield'
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
      {/* Top Level Badge */}
      <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${p.pillBg} mb-2 whitespace-nowrap`}>
        {badgeText}
      </span>

      {/* Glass Bucket Vessel */}
      <div
        className={`relative w-14 h-20 sm:w-16 sm:h-24 rounded-b-2xl rounded-t-md border-2 ${p.vesselBorder} bg-zinc-900/80 overflow-hidden ${fillPct > 0 ? p.glow : ''}`}
      >
        {/* Rim Highlight */}
        <div className="absolute top-0 inset-x-0 h-1 bg-white/15 z-20 pointer-events-none" />

        {/* Left Glass Specular Reflection */}
        <div className="absolute left-1.5 top-2 bottom-2.5 w-1 rounded-full bg-white/15 z-20 pointer-events-none" />

        {/* Right Beaker Graduation Ticks (75%, 50%, 25%) */}
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
          {/* Animated Dual SVG Sloshing Waves on Surface */}
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

          {/* Effervescent Rising Micro-Bubbles */}
          {fillPct >= 18 && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <span className="absolute bottom-1 left-3 w-1.5 h-1.5 rounded-full bg-white/50 bucket-bubble-1" />
              <span className="absolute bottom-1 left-7 w-1 h-1 rounded-full bg-white/45 bucket-bubble-2" />
              <span className="absolute bottom-1 right-3.5 w-1.5 h-1.5 rounded-full bg-white/40 bucket-bubble-3" />
            </div>
          )}
        </motion.div>

        {/* Center Percentage / Status Readout */}
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
 * Gamified Wealth Buckets Showcase (Cash Cushion • Investment Engine • Debt Drain)
 */
export default function WealthBuckets({
  totalCashInBank = 0,
  totalPortfolioValue = 0,
  totalDebts = 0,
  totalCreditBalance = 0,
  totalNetWorth = 0,
  debts = [],
  linkedAccountsCount = 0,
  gameProfile,
  onSelectMetric,
}) {
  const [replayKey, setReplayKey] = useState(0);

  const hasAnyData =
    linkedAccountsCount > 0 ||
    totalCashInBank > 0 ||
    totalPortfolioValue > 0 ||
    totalDebts > 0 ||
    debts.length > 0;

  const customCashGoal = gameProfile?.isCustomized ? Number(gameProfile.cashBucketTarget) || 0 : 0;
  const customInvestGoal = gameProfile?.isCustomized ? Number(gameProfile.investBucketTarget) || 0 : 0;
  const customNetWorthGoal = gameProfile?.isCustomized ? Number(gameProfile.netWorthTarget) || 0 : 0;
  const customDebtStart = gameProfile?.isCustomized ? Number(gameProfile.debtPayoffTarget) || 0 : 0;

  // 1. Cash Bucket Progress
  const cashMilestones = buildGoalMilestones(customCashGoal, [1000, 3000, 10000, 25000, 50000, 100000]);
  const cashMeta = getTierProgress(totalCashInBank, cashMilestones, customCashGoal);

  // 2. Investments Bucket Progress
  const investMilestones = buildGoalMilestones(customInvestGoal, [1000, 5000, 10000, 25000, 50000, 100000, 250000]);
  const investMeta = getTierProgress(totalPortfolioValue, investMilestones, customInvestGoal);

  // 3. Debt Crusher Tank Progress
  // When Debt > 0, tank shows amber lava proportional to debt burden (drains to 0% as you pay off!).
  // When accounts are linked & Debt === 0, tank celebrates 100% Debt-Free Shield!
  const originalDebtSum = Math.max(
    customDebtStart,
    debts.reduce((sum, d) => sum + (Number(d.principal || d.originalBalance || d.balance) || 0), 0) +
      totalCreditBalance,
  );
  const totalAssets = totalCashInBank + totalPortfolioValue;
  const debtCeiling = Math.max(originalDebtSum, totalAssets, totalDebts, 1000);

  const isVerifiedDebtFree = hasAnyData && totalDebts === 0;
  const debtLavaPct =
    totalDebts > 0
      ? Math.min(92, Math.max(14, Math.round((totalDebts / debtCeiling) * 100)))
      : isVerifiedDebtFree
      ? 100
      : 0;

  const debtPaidOffPct =
    originalDebtSum > totalDebts && originalDebtSum > 0
      ? Math.round(((originalDebtSum - totalDebts) / originalDebtSum) * 100)
      : null;

  // 4. Overall Net Worth Milestone Bar
  const nwMilestone = getNetWorthMilestone(totalNetWorth, hasAnyData, customNetWorthGoal);

  const cashShortTitle =
    gameProfile?.isCustomized && gameProfile?.primaryGoalName
      ? gameProfile.primaryGoalName.split(' ').slice(0, 2).join(' ')
      : 'Cash Bucket';

  return (
    <div className="space-y-3.5">
      {/* Gamified Net Worth XP / Milestone Bar */}
      <div className="p-3 rounded-2xl bg-zinc-950/75 border border-zinc-800/90 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
          <span className="font-extrabold text-emerald-400 flex items-center gap-1.5 truncate">
            <Sparkles size={12} className="text-yellow-400 shrink-0" />
            <span className="truncate">{nwMilestone.label}</span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono font-bold text-zinc-200">{nwMilestone.pct}%</span>
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
            key={`nw-${replayKey}-${nwMilestone.pct}`}
            initial={{ width: '0%' }}
            animate={{ width: `${nwMilestone.pct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="relative h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 to-teal-300 overflow-hidden"
          >
            {nwMilestone.pct > 0 && (
              <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent xp-bar-shimmer" />
            )}
          </motion.div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="truncate">{nwMilestone.subtext}</span>
          <span className="text-zinc-500 shrink-0">Tap any bucket</span>
        </div>
      </div>

      {/* 3 Symmetrical Animated Liquid Buckets */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Bucket 1: Cash Cushion */}
        <LiquidBucket
          title={cashShortTitle}
          amountText={formatCompactMoney(totalCashInBank)}
          badgeText={`Lv.${cashMeta.level} Cash`}
          goalText={`Goal: ${formatGoalShort(cashMeta.target)}`}
          percentLabel={`${cashMeta.exactPct}%`}
          fillPct={cashMeta.visualFillPct}
          theme="blue"
          replayKey={`${replayKey}-${cashMeta.target}`}
          onClick={() => onSelectMetric?.('cash')}
        />

        {/* Bucket 2: Investments Engine */}
        <LiquidBucket
          title="Invest Bucket"
          amountText={formatCompactMoney(totalPortfolioValue)}
          badgeText={`Lv.${investMeta.level} Growth`}
          goalText={`Goal: ${formatGoalShort(investMeta.target)}`}
          percentLabel={`${investMeta.exactPct}%`}
          fillPct={investMeta.visualFillPct}
          theme="emerald"
          replayKey={`${replayKey}-${investMeta.target}`}
          onClick={() => onSelectMetric?.('investments')}
        />

        {/* Bucket 3: Debt Crusher Tank */}
        <LiquidBucket
          title={isVerifiedDebtFree ? 'Debt Shield' : 'Debt Tank'}
          amountText={totalDebts > 0 ? `-${formatCompactMoney(totalDebts)}` : '$0.00'}
          badgeText={
            isVerifiedDebtFree ? (
              <span className="inline-flex items-center gap-0.5">
                <ShieldCheck size={10} /> Clean
              </span>
            ) : totalDebts > 0 ? (
              <span className="inline-flex items-center gap-0.5">
                <Flame size={10} /> Crush
              </span>
            ) : (
              'Debt $0'
            )
          }
          goalText={
            isVerifiedDebtFree
              ? '100% Debt-Free!'
              : totalDebts > 0
              ? debtPaidOffPct !== null
                ? `${debtPaidOffPct}% Crushed`
                : 'Drain to $0'
              : 'Target: $0 Owed'
          }
          percentLabel={
            isVerifiedDebtFree
              ? 'FREE'
              : totalDebts > 0
              ? `${debtLavaPct}%`
              : '0%'
          }
          fillPct={debtLavaPct}
          theme={isVerifiedDebtFree ? 'shield' : 'amber'}
          replayKey={replayKey}
          onClick={() => onSelectMetric?.('debts')}
        />
      </div>
    </div>
  );
}

