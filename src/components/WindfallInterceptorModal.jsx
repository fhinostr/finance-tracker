import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertOctagon,
  Car,
  Compass,
  ArrowRight,
  ShieldAlert,
  Split,
  Calendar,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getGoalAccountMapping,
  getStoredAccounts,
  saveGoalAccountMapping,
  formatMoney,
} from '../lib/store.js';

/**
 * Phase 5: Windfall Interceptor Modal
 *
 * Sequence follows strategic phases:
 *  - Phase 1 (URGENT / CURRENT): Relocation Buffer ($3,000 Goal)
 *  - Phase 2 (STARTS JANUARY): Kia Vehicle Loan Acceleration ($9,000 @ 12.5% APR)
 *
 * Priority routing promotes Phase 1 first.
 */

export default function WindfallInterceptorModal({
  isOpen,
  windfallAmount = 980,
  windfallSource = 'Corporate Bonus / Anomaly Deposit',
  onRouteToDebt,
  onRouteToRelocation,
  onRouteSplit,
  onDecline,
}) {
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [goalMapping, setGoalMapping] = useState(getGoalAccountMapping);
  const [accounts, setAccounts] = useState(getStoredAccounts);

  useEffect(() => {
    const handleGoalUpdate = (e) => {
      if (e.detail) setGoalMapping(e.detail);
    };
    const handleAccUpdate = () => {
      setAccounts(getStoredAccounts());
    };
    window.addEventListener('finance-tracker:goal-accounts-updated', handleGoalUpdate);
    window.addEventListener('finance-tracker:accounts-updated', handleAccUpdate);
    return () => {
      window.removeEventListener('finance-tracker:goal-accounts-updated', handleGoalUpdate);
      window.removeEventListener('finance-tracker:accounts-updated', handleAccUpdate);
    };
  }, []);

  const handleAccountChange = (role, accountId) => {
    const next = { ...goalMapping, [role]: accountId };
    setGoalMapping(next);
    saveGoalAccountMapping(next);
  };

  if (!isOpen) return null;

  const relocPct = Math.round((windfallAmount / 3000) * 100);

  const relocationAcc = accounts.find((a) => a.id === goalMapping.relocationAccountId);
  const carPayoffAcc = accounts.find((a) => a.id === goalMapping.carPayoffAccountId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop blur with dark vignette */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/20 p-6 sm:p-7 overflow-hidden z-10"
        >
          {/* Glowing accent orb */}
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header pill */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <AlertOctagon size={18} className="animate-pulse" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400">
                Windfall Interceptor • Phase Alignment
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              High Priority Overlay
            </span>
          </div>

          {/* Anomaly Amount Announcement */}
          <div className="mt-5 text-center space-y-2">
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-400 block">
              Inbound Anomaly Capital Detected
            </span>
            <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-200 to-emerald-400">
              +${windfallAmount.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-400">
              Source: <span className="text-zinc-200 font-semibold">{windfallSource}</span>
            </p>
          </div>

          {/* Phase Roadmap Tracker */}
          <div className="my-4 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <div>
                <span className="text-[10px] uppercase font-extrabold text-cyan-400 block">
                  Phase 1 (Active Now)
                </span>
                <span className="text-zinc-200 font-bold">Relocation Buffer ($3,000)</span>
              </div>
            </div>

            <ArrowRight size={14} className="text-zinc-600 shrink-0" />

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                Phase 2 (Starts Jan)
              </span>
              <span className="text-zinc-400 font-medium">Kia Auto Loan Sprint</span>
            </div>
          </div>

          {/* Behavioral Psychology Warning */}
          <div className="mb-5 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-2.5 text-xs text-zinc-300">
            <ShieldAlert size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-cyan-300">Phase Rule:</strong> Secure the urgent <strong className="text-white">January 2027 Relocation Buffer</strong> first. The <strong className="text-white">Kia paydown plan activates in January</strong> once this foundation is locked.
            </p>
          </div>

          {/* Action CTAs in Phase Order */}
          <div className="space-y-3">
            {/* CTA 1: Route to Relocation Buffer (TOP / PRIMARY / RECOMMENDED) */}
            <button
              type="button"
              onClick={() => onRouteToRelocation(windfallAmount)}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-cyan-500/25 via-zinc-900 to-teal-950/50 hover:from-cyan-500/35 hover:to-teal-900/60 border-2 border-cyan-400/70 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                  <Compass size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                      Route 100% to Relocation Buffer
                    </span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-400 text-black">
                      Recommended
                    </span>
                  </div>
                  <div className="text-[11px] text-cyan-200/80 mt-0.5">
                    Fills +{relocPct}% of $3,000 apartment & titling reserve • Completes Phase 1
                  </div>
                  <div className="text-[10px] text-cyan-300 font-semibold mt-1 flex items-center gap-1">
                    <span>Depositing into:</span>
                    <span className="underline">
                      {relocationAcc ? `${relocationAcc.name} (••••${relocationAcc.mask || '••••'})` : 'Default Relocation Buffer'}
                    </span>
                  </div>
                </div>
              </div>
              <ArrowRight size={20} className="text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            {/* CTA 2: Route to Vehicle Principal (Starts January) */}
            <button
              type="button"
              onClick={() => onRouteToDebt(windfallAmount)}
              className="w-full p-3.5 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Car size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200 group-hover:text-amber-300 transition-colors">
                      Route to Kia Loan Principal
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Calendar size={10} /> Starts in January
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Optional early headstart on $9,000 auto loan (12.5% APR)
                  </div>
                  <div className="text-[10px] text-amber-300 font-semibold mt-1 flex items-center gap-1">
                    <span>Paid via:</span>
                    <span className="underline">
                      {carPayoffAcc ? `${carPayoffAcc.name} (••••${carPayoffAcc.mask || '••••'})` : 'Default Checking Account'}
                    </span>
                  </div>
                </div>
              </div>
              <ArrowRight size={16} className="text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            {/* CTA 3: Phase-Weighted Split */}
            <button
              type="button"
              onClick={() => onRouteSplit(windfallAmount * 0.25, windfallAmount * 0.75)}
              className="w-full p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Split size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-200">
                    Phase-Priority Split (75% Relocation / 25% Car)
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    +${Math.round(windfallAmount * 0.75).toLocaleString()} to Relocation • +${Math.round(windfallAmount * 0.25).toLocaleString()} to Kia
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                Execute
              </span>
            </button>

            {/* Quick Destination Account Selector */}
            <div className="p-2.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setShowAccountSettings(!showAccountSettings)}
                className="w-full flex items-center justify-between text-zinc-400 hover:text-white font-medium cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Settings2 size={13} className="text-cyan-400" />
                  <span>Choose Destination Accounts</span>
                </div>
                {showAccountSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showAccountSettings && (
                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 space-y-2 text-[11px]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-zinc-300">Relocation Buffer:</span>
                    <select
                      value={goalMapping.relocationAccountId || ''}
                      onChange={(e) => handleAccountChange('relocationAccountId', e.target.value)}
                      className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white text-[11px] focus:outline-none"
                    >
                      <option value="">Default Relocation Buffer</option>
                      {accounts.filter((a) => a.type !== 'credit').map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.mask ? `••••${a.mask}` : formatMoney(a.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-zinc-300">Car Paydown Source:</span>
                    <select
                      value={goalMapping.carPayoffAccountId || ''}
                      onChange={(e) => handleAccountChange('carPayoffAccountId', e.target.value)}
                      className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white text-[11px] focus:outline-none"
                    >
                      <option value="">Default Checking Account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.mask ? `••••${a.mask}` : formatMoney(a.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Explicit Decline / Friction Dismiss */}
          <div className="mt-5 pt-4 border-t border-zinc-800/80 text-center">
            {!showDeclineConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeclineConfirm(true)}
                className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors underline cursor-pointer"
              >
                Decline Optimization & leave in Everyday Checking account
              </button>
            ) : (
              <div className="space-y-2 p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                <p className="text-[11px] text-zinc-400">
                  Are you sure? Capital left unassigned in checking is 4.8x more likely to be spent unintentionally.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={onDecline}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-semibold cursor-pointer"
                  >
                    Confirm: Leave in Checking
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeclineConfirm(false)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 text-black text-xs font-bold cursor-pointer"
                  >
                    Back to Options
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
