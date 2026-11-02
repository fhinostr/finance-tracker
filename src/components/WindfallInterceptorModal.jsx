import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertOctagon,
  Car,
  Compass,
  ArrowRight,
  ShieldAlert,
  Split,
} from 'lucide-react';

/**
 * Phase 5: Windfall Interceptor Modal
 *
 * - High-priority overlay modal that interrupts the standard UI flow when anomalous deposits occur.
 * - Triggered when mock inbound transaction > $900 (e.g. $980 bonus).
 * - 1-click CTA buttons to route "anomaly capital" directly to:
 *    1. Principal Paydown (Phase 2)
 *    2. Relocation Buffer (Phase 4)
 *    3. Or 50/50 split
 * - Requires user to interact with a CTA or explicitly decline before dismissal.
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop blur with dark vignette */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-2 border-amber-500/50 shadow-2xl shadow-amber-500/20 p-6 sm:p-7 overflow-hidden z-10"
        >
          {/* Glowing accent orb */}
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header pill */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <AlertOctagon size={18} className="animate-pulse" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                Windfall Interceptor • Phase 5
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              High Priority Overlay
            </span>
          </div>

          {/* Anomaly Amount Announcement */}
          <div className="mt-5 text-center space-y-2">
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-400 block">
              Inbound Anomaly Capital Detected
            </span>
            <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-emerald-400">
              +${windfallAmount.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-400">
              Source: <span className="text-zinc-200 font-semibold">{windfallSource}</span>
            </p>
          </div>

          {/* Behavioral Psychology Warning */}
          <div className="my-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-300 leading-relaxed">
              <strong className="text-amber-300">Behavioral Warning:</strong> Inbound deposits over $900 are historically vulnerable to "lifestyle drift." Intercept this capital now to compound wealth before it dissolves into daily friction.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3">
            {/* CTA 1: Route to Principal Paydown */}
            <button
              type="button"
              onClick={() => onRouteToDebt(windfallAmount)}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-zinc-900 to-amber-950/40 hover:from-amber-500/30 hover:to-amber-900/50 border border-amber-500/40 hover:border-amber-400 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Car size={20} />
                </div>
                <div>
                  <div className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                    Route 100% to Vehicle Principal
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Pay down $9,000 Kia loan • Saves ~4 months & ~$120 interest
                  </div>
                </div>
              </div>
              <ArrowRight size={18} className="text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            {/* CTA 2: Route to Relocation Buffer */}
            <button
              type="button"
              onClick={() => onRouteToRelocation(windfallAmount)}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-zinc-900 to-cyan-950/40 hover:from-cyan-500/30 hover:to-cyan-900/50 border border-cyan-500/40 hover:border-cyan-400 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <Compass size={20} />
                </div>
                <div>
                  <div className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                    Route 100% to January 2027 Relocation
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Fills +{((windfallAmount / 3000) * 100).toFixed(0)}% of the $3,000 apartment & titling buffer
                  </div>
                </div>
              </div>
              <ArrowRight size={18} className="text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            {/* CTA 3: 50 / 50 Split */}
            <button
              type="button"
              onClick={() => onRouteSplit(windfallAmount / 2, windfallAmount / 2)}
              className="w-full p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Split size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-200">
                    50 / 50 Balanced Split
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    ${(windfallAmount / 2).toLocaleString()} to Loan • ${(windfallAmount / 2).toLocaleString()} to Relocation
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                Execute
              </span>
            </button>
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
                  Are you sure? Capital in checking is 4.8x more likely to be spent unintentionally.
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
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold cursor-pointer"
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
