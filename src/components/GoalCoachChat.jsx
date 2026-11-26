import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Target,
  PieChart,
  Compass,
  Zap,
} from 'lucide-react';
import { formatMoney } from '../lib/store.js';
import {
  getGameProfile,
  processGoalChatMessage,
  resetGameProfile,
  startGuidedInterview,
  computeFinancialBlueprint,
  saveGameProfile,
} from '../lib/goalEngine.js';

const STEP_META = {
  goal: { num: 1, label: 'Step 1/4 · Goal', placeholder: 'Step 1: What is your #1 goal? (e.g. Save $20k for a house)' },
  income: { num: 2, label: 'Step 2/4 · Income', placeholder: 'Step 2: Monthly take-home pay? (e.g. $4,500/mo or $75k/yr)' },
  expenses: { num: 3, label: 'Step 3/4 · Expenses', placeholder: 'Step 3: Monthly bills & rent? (e.g. $2,400/mo)' },
  risk: { num: 4, label: 'Step 4/4 · Invest Style', placeholder: 'Step 4: Safe, Balanced, Growth, or Aggressive?' },
  complete: { num: 4, label: 'Blueprint Ready', placeholder: 'Ask to tweak income, expenses, goals, or investment split...' },
};

export default function GoalCoachChat({
  gameProfile,
  onProfileChange,
  onApplyBlueprint,
  variant = 'dashboard', // 'dashboard' | 'accounts'
}) {
  const profile = gameProfile || getGameProfile();
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [appliedBlueprint, setAppliedBlueprint] = useState(false);
  const recognitionRef = useRef(null);

  const step = STEP_META[profile.interviewStep] ? profile.interviewStep : 'goal';
  const stepInfo = STEP_META[step];

  const blueprint = useMemo(() => computeFinancialBlueprint(profile), [profile]);

  const latestCoachMsg =
    [...(profile.chatHistory || [])].reverse().find((m) => m.role === 'coach') || null;

  // Context-aware quick reply chips tailored to the current interview question
  const quickChips = useMemo(() => {
    if (step === 'income') {
      return [
        { label: '💵 $2,800/mo', prompt: 'My take-home income is $2,800 a month' },
        { label: '💵 $4,000/mo', prompt: 'My take-home income is $4,000 a month' },
        { label: '💵 $5,500/mo', prompt: 'My take-home income is $5,500 a month' },
        { label: '💵 $7,500/mo', prompt: 'My take-home income is $7,500 a month' },
        { label: '💵 $10,000/mo', prompt: 'My take-home income is $10,000 a month' },
      ];
    }
    if (step === 'expenses') {
      const inc = Number(profile.monthlyIncome) || 4000;
      const p45 = Math.round((inc * 0.45) / 50) * 50;
      const p55 = Math.round((inc * 0.55) / 50) * 50;
      const p65 = Math.round((inc * 0.65) / 50) * 50;
      const p75 = Math.round((inc * 0.75) / 50) * 50;
      return [
        { label: `🏠 ${formatMoney(p45)}/mo (45%)`, prompt: `My monthly expenses are ${formatMoney(p45)}` },
        { label: `🏠 ${formatMoney(p55)}/mo (55%)`, prompt: `My monthly expenses are ${formatMoney(p55)}` },
        { label: `🏠 ${formatMoney(p65)}/mo (65%)`, prompt: `My monthly expenses are ${formatMoney(p65)}` },
        { label: `🏠 ${formatMoney(p75)}/mo (75%)`, prompt: `My monthly expenses are ${formatMoney(p75)}` },
      ];
    }
    if (step === 'risk') {
      return [
        { label: '🛡️ Safe & Steady (1–3 yrs)', prompt: 'Safe and conservative 1-3 years' },
        { label: '⚖️ Balanced (3–7 yrs)', prompt: 'Balanced moderate growth 3-7 years' },
        { label: '🚀 Index Growth (7+ yrs)', prompt: 'Long-term index growth 7+ years' },
        { label: '🔥 Max Aggressive (10+ yrs)', prompt: 'Max aggressive growth 10+ years' },
      ];
    }
    if (step === 'complete') {
      return [
        { label: '🧭 Retake 4-Step Guide', prompt: 'guide me step by step' },
        { label: '🏠 $20k House Goal', prompt: 'Save $20,000 for a house down payment' },
        { label: '🔥 Debt Crusher Mode', prompt: 'Prioritize paying off debt fast' },
        { label: '🚀 Aggressive Split', prompt: 'Switch to max aggressive portfolio split' },
      ];
    }
    // Default Step 1: Goal
    return [
      { label: '🏠 $20k House Fund', prompt: 'Save $20,000 for a house down payment' },
      { label: '🛡️ $5k Emergency Fund', prompt: 'Build a $5,000 emergency fund' },
      { label: '🔥 Crush Debt Fast', prompt: 'Pay off my credit card and loan debt fast' },
      { label: '📈 $50k Retirement', prompt: 'Invest $50,000 for long-term wealth' },
      { label: '✈️ $4k Trip Fund', prompt: 'Save $4,000 for a vacation fund' },
    ];
  }, [step, profile.monthlyIncome]);

  const submitObjective = (text) => {
    const clean = (text || '').trim();
    if (!clean) return;
    if (clean.toLowerCase() === 'guide me step by step') {
      const restarted = startGuidedInterview(profile);
      onProfileChange?.(restarted);
      setInput('');
      setIsExpanded(true);
      return;
    }
    const { profile: updated } = processGoalChatMessage(clean, profile);
    onProfileChange?.(updated);
    setInput('');
    setJustUpdated(true);
    setShowBlueprint(true);
    setAppliedBlueprint(false);
    setTimeout(() => setJustUpdated(false), 5000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitObjective(input);
  };

  const handleSelectRiskDirect = (riskKey) => {
    const updated = saveGameProfile({
      ...profile,
      riskProfile: riskKey,
      interviewStep: 'complete',
    });
    onProfileChange?.(updated);
    setAppliedBlueprint(false);
  };

  const handleReset = () => {
    const fresh = resetGameProfile();
    onProfileChange?.(fresh);
    setJustUpdated(false);
    setAppliedBlueprint(false);
  };

  const handleApplyToApp = () => {
    if (!blueprint || !onApplyBlueprint) return;
    onApplyBlueprint(blueprint, profile);
    setAppliedBlueprint(true);
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const hasSpeechSupport =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div
      className={`rounded-2xl border transition-all ${
        variant === 'accounts'
          ? 'p-3.5 bg-gradient-to-br from-emerald-950/35 via-zinc-900/90 to-indigo-950/35 border-emerald-500/25 space-y-2.5'
          : 'p-3.5 sm:p-4 bg-gradient-to-br from-indigo-950/30 via-zinc-950/90 to-emerald-950/25 border-indigo-500/25 space-y-3'
      }`}
    >
      {/* Header Row with Step Pill & Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Target size={13} className="text-emerald-400" />
          </div>
          <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-white truncate">
              {profile.playerName ? `${profile.playerName}'s Financial Coach` : 'Financial Goal Coach'}
            </span>
            <span
              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border whitespace-nowrap ${
                step === 'complete'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/35'
              }`}
            >
              {stepInfo.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {profile.areBucketsUnlocked && blueprint && variant === 'dashboard' && (
            <button
              type="button"
              onClick={() => setShowBlueprint((v) => !v)}
              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <PieChart size={10} />
              <span>{showBlueprint ? 'Plan' : 'Show Plan'}</span>
            </button>
          )}
          {profile.isCustomized && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset coach & goals"
              className="px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-[10px] font-semibold text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw size={10} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-[10px] font-semibold text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Less' : 'History'}</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* 4-Step Progress Dots when in Guided Interview */}
      {step !== 'complete' && (
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { key: 'goal', title: '1. Goal' },
            { key: 'income', title: '2. Income' },
            { key: 'expenses', title: '3. Bills' },
            { key: 'risk', title: '4. Split' },
          ].map((item, idx) => {
            const activeIdx = stepInfo.num - 1;
            const done = idx < activeIdx;
            const current = idx === activeIdx;
            return (
              <div
                key={item.key}
                className={`px-2 py-1 rounded-lg text-center text-[9px] font-bold border transition-all truncate ${
                  current
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : done
                    ? 'bg-zinc-900/90 border-emerald-500/25 text-zinc-300'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-500'
                }`}
              >
                {done ? `✓ ${item.title.slice(3)}` : item.title}
              </div>
            );
          })}
        </div>
      )}

      {/* Active Coach Prompt / Expandable Chat Thread */}
      <AnimatePresence initial={false}>
        {latestCoachMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {isExpanded && profile.chatHistory?.length > 1 ? (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 pb-1">
                {profile.chatHistory.slice(-8).map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-500/25 border border-indigo-400/30 text-white'
                          : 'bg-zinc-900/95 border border-zinc-800 text-zinc-200 space-y-1.5'
                      }`}
                    >
                      <p>{msg.text}</p>
                      {Array.isArray(msg.changes) && msg.changes.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {msg.changes.map((ch, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300"
                            >
                              <CheckCircle2 size={10} />
                              {ch}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              (step !== 'complete' || justUpdated || !blueprint) && (
                <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-900/95 border border-zinc-800/90 text-[11px] sm:text-xs text-zinc-200 leading-relaxed space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Sparkles size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{latestCoachMsg.text}</span>
                  </div>
                  {Array.isArray(latestCoachMsg.changes) && latestCoachMsg.changes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-5">
                      {latestCoachMsg.changes.map((ch, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300"
                        >
                          <CheckCircle2 size={10} />
                          {ch}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personalized Monthly Paycheck Split & Investment Portfolio Blueprint Card */}
      <AnimatePresence initial={false}>
        {profile.areBucketsUnlocked && blueprint && showBlueprint && variant === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 rounded-2xl bg-zinc-950/95 border border-emerald-500/25 space-y-3.5"
          >
            {/* 1. Monthly Income Split (Expenses vs Savings vs Debt vs Investments) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Compass size={13} />
                  <span>Suggested Monthly Split ({formatMoney(blueprint.income)}/mo)</span>
                </span>
              </div>

              {/* Segmented Allocation Bar */}
              <div className="w-full h-2.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex">
                {blueprint.allocations.map((alloc) =>
                  alloc.pct > 0 ? (
                    <div
                      key={alloc.key}
                      style={{ width: `${alloc.pct}%`, backgroundColor: alloc.color }}
                      className="h-full transition-all duration-500"
                      title={`${alloc.label}: ${alloc.pct}%`}
                    />
                  ) : null,
                )}
              </div>

              {/* Allocation Cards */}
              <div className={`grid gap-2 ${blueprint.allocations.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                {blueprint.allocations.map((alloc) => (
                  <div
                    key={alloc.key}
                    className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 space-y-0.5 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="font-bold text-zinc-300 truncate flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: alloc.color }}
                        />
                        <span className="truncate">{alloc.label.split(' ')[0]}</span>
                      </span>
                      <span className="font-mono font-extrabold text-white shrink-0">{alloc.pct}%</span>
                    </div>
                    <div className="text-xs sm:text-sm font-black text-white tabular-nums truncate">
                      {formatMoney(alloc.amount)}<span className="text-[10px] font-normal text-zinc-400">/mo</span>
                    </div>
                    <p className="text-[9px] text-zinc-400 truncate">{alloc.sub}</p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-zinc-300 leading-snug bg-zinc-900/60 px-2.5 py-2 rounded-xl border border-zinc-800/70">
                {blueprint.expenseNote}
              </p>
            </div>

            {/* 2. Suggested Investment Portfolio Split */}
            <div className="pt-2.5 border-t border-zinc-800/90 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-400">
                  Suggested Investment Portfolio Split
                </span>

                {/* 1-Tap Risk Profile Switcher */}
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { key: 'conservative', short: 'Safe' },
                    { key: 'moderate', short: 'Balanced' },
                    { key: 'growth', short: 'Growth' },
                    { key: 'aggressive', short: 'Max' },
                  ].map((r) => {
                    const active = blueprint.riskKey === r.key;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => handleSelectRiskDirect(r.key)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          active
                            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {r.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[10px] text-zinc-400">{blueprint.portfolioSummary}</p>

              <div className="space-y-1.5">
                {blueprint.portfolioBreakdown.map((slice) => (
                  <div
                    key={slice.name}
                    className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="text-[11px] font-semibold text-zinc-200 truncate">
                        {slice.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-[11px] font-bold text-emerald-400">
                        {formatMoney(slice.monthlyAmount)}/mo
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-800 text-white">
                        {slice.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. One-Tap Apply Blueprint to Tracker */}
            {onApplyBlueprint && (
              <button
                type="button"
                onClick={handleApplyToApp}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  appliedBlueprint
                    ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black shadow-md'
                }`}
              >
                {appliedBlueprint ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Applied Income & Budgets to Your Tracker!</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>Apply Income & Suggested Budgets to Tracker</span>
                  </>
                )}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context-Aware Quick-Tap Reply Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {quickChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => submitObjective(chip.prompt)}
            className="px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-emerald-500/40 text-[10px] font-semibold text-zinc-300 hover:text-white whitespace-nowrap transition-colors cursor-pointer shrink-0"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={stepInfo.placeholder}
            className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-black/70 border border-zinc-700/90 focus:border-emerald-400 focus:outline-none text-xs text-white placeholder-zinc-500 transition-colors"
          />
          {hasSpeechSupport && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              title={isListening ? 'Stop listening' : 'Speak your answer'}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors cursor-pointer ${
                isListening
                  ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!input.trim()}
          className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0"
        >
          <Send size={13} />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}
