import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import {
  getGameProfile,
  processGoalChatMessage,
  resetGameProfile,
} from '../lib/goalEngine.js';

const QUICK_OBJECTIVES = [
  { label: '🏠 $20k House Fund', prompt: 'Save $20,000 for a house down payment and invest $25k' },
  { label: '🔥 Crush Debt Fast', prompt: 'My main priority is paying off credit card and loan debt fast, plus a $2,000 emergency cushion' },
  { label: '🛡️ $5k Emergency Fund', prompt: 'Build a $5,000 emergency fund for peace of mind' },
  { label: '📈 $50k Invest Goal', prompt: 'Focus on investing $50,000 for retirement and reaching $75k net worth' },
  { label: '✈️ $4k Trip Fund', prompt: 'Save $4,000 for a travel vacation fund' },
];

export default function GoalCoachChat({
  gameProfile,
  onProfileChange,
  variant = 'dashboard', // 'dashboard' | 'accounts'
}) {
  const profile = gameProfile || getGameProfile();
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const recognitionRef = useRef(null);

  const latestCoachMsg =
    [...(profile.chatHistory || [])].reverse().find((m) => m.role === 'coach') || null;

  const submitObjective = (text) => {
    const clean = (text || '').trim();
    if (!clean) return;
    const { profile: updated } = processGoalChatMessage(clean, profile);
    onProfileChange?.(updated);
    setInput('');
    setJustUpdated(true);
    setIsExpanded(true);
    setTimeout(() => setJustUpdated(false), 4500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitObjective(input);
  };

  const handleReset = () => {
    const fresh = resetGameProfile();
    onProfileChange?.(fresh);
    setJustUpdated(false);
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
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Target size={13} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-extrabold text-white truncate">
                {profile.playerName
                  ? `${profile.playerName}'s Goal Coach`
                  : 'Goal Coach • Customize Your Game'}
              </span>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                {profile.focusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {profile.isCustomized && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset goals to default"
              className="px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-[10px] font-semibold text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw size={10} />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-[10px] font-semibold text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Hide' : 'Chat'}</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expandable Chat History / Latest Coach Reply */}
      <AnimatePresence initial={false}>
        {(isExpanded || justUpdated || !profile.isCustomized) && latestCoachMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {isExpanded && profile.chatHistory?.length > 1 ? (
              <div className="max-h-44 overflow-y-auto space-y-2 pr-1 pb-1">
                {profile.chatHistory.slice(-6).map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
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
              <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 text-[11px] text-zinc-300 leading-relaxed space-y-1.5">
                <div className="flex items-start gap-2">
                  <Sparkles size={13} className="text-emerald-400 shrink-0 mt-0.5" />
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
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick-Tap Objective Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {QUICK_OBJECTIVES.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => submitObjective(preset.prompt)}
            className="px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-emerald-500/40 text-[10px] font-semibold text-zinc-300 hover:text-white whitespace-nowrap transition-colors cursor-pointer shrink-0"
          >
            {preset.label}
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
            placeholder="Tell me your goals (e.g. Save $12k for a house & pay off debt)..."
            className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-black/70 border border-zinc-700/90 focus:border-emerald-400 focus:outline-none text-xs text-white placeholder-zinc-500 transition-colors"
          />
          {hasSpeechSupport && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              title={isListening ? 'Stop listening' : 'Speak your financial goals'}
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
          <span className="hidden sm:inline">Set Goals</span>
        </button>
      </form>
    </div>
  );
}
