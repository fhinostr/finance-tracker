import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  CheckCircle2,
  ChevronRight,
  X,
  Sparkles,
  Flame,
} from 'lucide-react';

/**
 * Calculates a dynamic, gamified Financial Health Score (0 - 100)
 * based on 4 real-world pillars:
 * 1. Cash Cushion (up to 30 pts)
 * 2. Debt Control (up to 25 pts)
 * 3. Living Below Means / Surplus (up to 25 pts)
 * 4. Future Wealth & Investments (up to 20 pts)
 */
function calculateFinancialScore({
  totalCashInBank = 0,
  totalCreditBalance = 0,
  totalPortfolioValue = 0,
  totalVariable = 0,
  actualNetIncome = 0,
  relocationSaved = 0,
  debts = [],
  linkedAccountsCount = 0,
}) {
  const hasAnyData =
    linkedAccountsCount > 0 ||
    totalCashInBank > 0 ||
    relocationSaved > 0 ||
    debts.length > 0 ||
    actualNetIncome > 0 ||
    totalVariable > 0;

  if (!hasAnyData) {
    return {
      score: 0,
      level: 0,
      levelName: 'No Accounts Linked',
      levelIcon: '🔒',
      badgeColor: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      nextLevelTarget: 25,
      summaryTagline: 'Link your accounts in Accounts to calculate your real Financial Health Score.',
      pillars: {
        cash: { score: 0, max: 30, label: 'Cash Cushion' },
        debt: { score: 0, max: 25, label: 'Debt Control' },
        surplus: { score: 0, max: 25, label: 'Spending Control' },
        invest: { score: 0, max: 20, label: 'Wealth Growth' },
      },
    };
  }

  // 1. Cash Cushion (Max 30 pts)
  let cashScore = 0;
  const realCash = Math.max(totalCashInBank, relocationSaved);
  if (realCash >= 3000) {
    cashScore = 30;
  } else if (realCash > 0) {
    cashScore = Math.min(30, Math.round((realCash / 3000) * 30));
  }

  // 2. Debt Control (Max 25 pts)
  let debtScore = 0;
  if (linkedAccountsCount > 0 || debts.length > 0) {
    if (totalCreditBalance === 0) {
      debtScore = debts.length === 0 ? 25 : 20;
    } else {
      debtScore = Math.max(0, Math.round(25 - (totalCreditBalance / 500) * 5));
    }
  }

  // 3. Living Below Means (Max 25 pts)
  let surplusScore = 0;
  if (actualNetIncome > 0) {
    const surplus = actualNetIncome - totalVariable;
    if (surplus >= actualNetIncome * 0.2) {
      surplusScore = 25;
    } else if (surplus > 0) {
      surplusScore = Math.min(25, Math.round((surplus / actualNetIncome) * 25));
    }
  }

  // 4. Future Investments (Max 20 pts)
  let investScore = 0;
  if (totalPortfolioValue >= 5000) {
    investScore = 20;
  } else if (totalPortfolioValue > 0) {
    investScore = Math.min(20, Math.round((totalPortfolioValue / 5000) * 20));
  }

  const totalScore = Math.min(100, Math.max(0, cashScore + debtScore + surplusScore + investScore));

  // Determine Level & Tier
  let level = 1;
  let levelName = 'Starter Builder';
  let levelIcon = '🌱';
  let badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  let nextLevelTarget = 40;
  let summaryTagline = 'Laying the foundation. Link accounts & start your cushion.';

  if (totalScore >= 90) {
    level = 5;
    levelName = 'Financial Boss';
    levelIcon = '👑';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    nextLevelTarget = 100;
    summaryTagline = 'Master tier! High savings, zero toxic debt & growing wealth.';
  } else if (totalScore >= 75) {
    level = 4;
    levelName = 'Wealth Builder';
    levelIcon = '💎';
    badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    nextLevelTarget = 90;
    summaryTagline = 'Strong cash buffer and solid monthly wealth growth.';
  } else if (totalScore >= 55) {
    level = 3;
    levelName = 'Debt Crusher';
    levelIcon = '🚀';
    badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    nextLevelTarget = 75;
    summaryTagline = 'Great momentum! Crushing interest and pacing goals.';
  } else if (totalScore >= 40) {
    level = 2;
    levelName = 'Shield Protector';
    levelIcon = '🛡️';
    badgeColor = 'bg-teal-500/20 text-teal-300 border-teal-500/30';
    nextLevelTarget = 55;
    summaryTagline = 'Protected! Emergency buffer is forming to shield surprises.';
  }

  return {
    score: totalScore,
    level,
    levelName,
    levelIcon,
    badgeColor,
    nextLevelTarget,
    summaryTagline,
    pillars: {
      cash: { score: cashScore, max: 30, label: 'Cash Cushion' },
      debt: { score: debtScore, max: 25, label: 'Debt Control' },
      surplus: { score: surplusScore, max: 25, label: 'Spending Control' },
      invest: { score: investScore, max: 20, label: 'Wealth Growth' },
    },
  };
}

export default function FinancialHealthScore({
  data = {},
  onOpenMetricModal,
}) {
  const [showDetailModal, setShowDetailModal] = useState(false);

  const stats = calculateFinancialScore(data);

  // SVG Circular progress constants
  const size = 110;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.score / 100) * circumference;

  // Gamified Power-Up Quests strictly reflecting real account & goal status
  const quests = [
    {
      id: 'link_account',
      title: 'Link Your First Bank Account',
      reward: '+25 XP',
      completed: (data.linkedAccountsCount || 0) > 0,
      actionMetric: 'cash',
    },
    {
      id: 'cushion_500',
      title: 'Save First $500 in Move Cushion',
      reward: '+20 XP',
      completed: (data.relocationSaved || 0) >= 500 && (data.relocationSaved || 0) > 0,
      actionMetric: 'goal_cushion',
    },
    {
      id: 'zero_credit',
      title: 'Keep Credit Card Debt at $0',
      reward: '+25 XP',
      completed: (data.linkedAccountsCount || 0) > 0 && (data.totalCreditBalance || 0) === 0,
      actionMetric: 'debts',
    },
  ];

  return (
    <>
      {/* Gamified Hero Score Banner (Apple Health / Activity Ring Style) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Left: Score Gauge Ring + Level Title */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0 flex items-center justify-center">
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
                  stroke="url(#scoreGradient)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  strokeLinecap="round"
                  fill="transparent"
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Inner Score Number */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white tracking-tight">
                  {stats.score}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                  / 100
                </span>
              </div>
            </div>

            {/* Level Information */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${stats.badgeColor} flex items-center gap-1`}>
                  <span>{stats.levelIcon}</span>
                  <span>Level {stats.level} • {stats.levelName}</span>
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                Financial Health Score
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                {stats.summaryTagline}
              </p>
            </div>
          </div>

          {/* Right: Quick Breakdown & Detail Button */}
          <div className="flex flex-col sm:items-end justify-between gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
            <div className="flex items-center gap-2 sm:justify-end">
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <Flame size={14} className="text-orange-400" />
                <span>Next Rank: Level {Math.min(5, stats.level + 1)} at {stats.nextLevelTarget} pts</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDetailModal(true)}
              className="px-4 py-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-zinc-700 cursor-pointer flex items-center justify-center gap-1.5 group shadow-sm"
            >
              <Trophy size={14} className="text-yellow-400 group-hover:scale-110 transition-transform" />
              <span>View Score & Quests</span>
              <ChevronRight size={13} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 4 Pillar Mini Progress Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-4 border-t border-zinc-800/80">
          {Object.entries(stats.pillars).map(([key, pillar]) => {
            const pct = Math.round((pillar.score / pillar.max) * 100);
            return (
              <div
                key={key}
                onClick={() => setShowDetailModal(true)}
                className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-400 font-medium">{pillar.label}</span>
                  <span className="font-mono font-bold text-white">{pillar.score}/{pillar.max}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gamification Detail Modal (Quests & Level Roadmap) */}
      <AnimatePresence>
        {showDetailModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* iOS-style drag handle */}
              <div className="w-12 h-1.5 bg-zinc-700/60 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${stats.badgeColor}`}>
                    Level {stats.level} • {stats.levelName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Score Hero Summary */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-cyan-950/40 border border-emerald-500/30 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Total Score
                    </span>
                    <div className="text-4xl font-black text-white">
                      {stats.score} <span className="text-xs font-normal text-zinc-400">/ 100 pts</span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">
                      {stats.summaryTagline}
                    </p>
                  </div>
                  <div className="text-4xl shrink-0 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800">
                    {stats.levelIcon}
                  </div>
                </div>

                {/* 4 Pillars Breakdown */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block px-1">
                    Your 4 Health Pillars
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.entries(stats.pillars).map(([key, pillar]) => {
                      const pct = Math.round((pillar.score / pillar.max) * 100);
                      return (
                        <div key={key} className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white">{pillar.label}</span>
                            <span className="font-mono font-bold text-emerald-400">{pillar.score}/{pillar.max}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quests to Level Up */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-yellow-400" />
                      <span>Level-Up Quests</span>
                    </span>
                    <span className="text-[10px] text-zinc-500">Complete tasks to gain XP</span>
                  </div>

                  <div className="space-y-2">
                    {quests.map((quest) => (
                      <div
                        key={quest.id}
                        className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          {quest.completed ? (
                            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-4.5 h-4.5 rounded-full border-2 border-zinc-600 shrink-0" />
                          )}
                          <div>
                            <span className={`font-semibold ${quest.completed ? 'text-zinc-400 line-through' : 'text-white'}`}>
                              {quest.title}
                            </span>
                            <span className="text-[10px] font-bold text-amber-400 block mt-0.5">
                              {quest.reward}
                            </span>
                          </div>
                        </div>

                        {!quest.completed && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowDetailModal(false);
                              onOpenMetricModal?.(quest.actionMetric);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold transition-all cursor-pointer shrink-0"
                          >
                            Do Quest
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5 Rank Roadmap */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block px-1">
                    Rank Roadmap
                  </span>

                  <div className="space-y-1.5 text-xs">
                    {[
                      { lvl: 1, name: 'Starter Builder', icon: '🌱', range: '0–39 pts', desc: 'First savings & bank link' },
                      { lvl: 2, name: 'Shield Protector', icon: '🛡️', range: '40–54 pts', desc: 'Emergency cushion forming' },
                      { lvl: 3, name: 'Debt Crusher', icon: '🚀', range: '55–74 pts', desc: 'No revolving debt & saving' },
                      { lvl: 4, name: 'Wealth Builder', icon: '💎', range: '75–89 pts', desc: 'Solid investing & high surplus' },
                      { lvl: 5, name: 'Financial Boss', icon: '👑', range: '90–100 pts', desc: 'Complete financial freedom' },
                    ].map((rank) => {
                      const isCurrent = stats.level === rank.lvl;
                      const isPast = stats.level > rank.lvl;
                      return (
                        <div
                          key={rank.lvl}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                            isCurrent
                              ? 'bg-zinc-900 border-emerald-500/50 text-white font-bold'
                              : isPast
                              ? 'bg-zinc-950/40 border-zinc-800/40 text-zinc-500'
                              : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span>{rank.icon}</span>
                            <div>
                              <span>Level {rank.lvl}: {rank.name}</span>
                              <span className="text-[10px] text-zinc-500 block">{rank.desc}</span>
                            </div>
                          </div>
                          <span className="font-mono text-[11px] text-zinc-400">{rank.range}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 px-6 border-t border-zinc-800 bg-zinc-950 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
