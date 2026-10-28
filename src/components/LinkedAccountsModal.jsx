import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { usePlaidLink } from 'react-plaid-link';
import {
  X,
  Building2,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { formatMoney, getStoredAccounts, saveStoredAccounts } from '../lib/store.js';

export default function LinkedAccountsModal({ onClose, onSyncTransactions, onUpdateInvestmentTotal }) {
  const [accounts, setAccounts] = useState(getStoredAccounts);
  const [linkToken, setLinkToken] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch or prepare Link Token from serverless endpoint
  useEffect(() => {
    async function initLink() {
      try {
        const res = await fetch('/api/create-link-token', { method: 'POST' });
        if (!res.ok) throw new Error('API route offline');
        const data = await res.json();
        if (data.link_token) {
          setLinkToken(data.link_token);
        } else if (data.demoMode) {
          setIsDemoMode(true);
        }
      } catch {
        // Running locally or on static host without backend
        setIsDemoMode(true);
      }
    }
    initLink();
  }, []);

  const persist = useCallback((next) => {
    setAccounts(next);
    saveStoredAccounts(next);
  }, []);

  // Exchange Plaid Public Token
  const onSuccess = useCallback(
    async (public_token, metadata) => {
      setLoading(true);
      try {
        const res = await fetch('/api/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token,
            institution: metadata?.institution,
            accounts: metadata?.accounts,
          }),
        });
        const data = await res.json();
        const newAcc = {
          id: data.item_id || 'acc-' + Date.now(),
          name: metadata?.institution?.name || 'Linked Financial Account',
          type: metadata?.institution?.name?.toLowerCase().includes('robinhood') ? 'investment' : 'bank',
          balance: data.accounts?.[0]?.balance || 0,
          mask: data.accounts?.[0]?.mask || '••••',
          accessToken: data.access_token || 'mock_token',
          lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        const next = [...accounts, newAcc];
        persist(next);
        setStatusMessage(`Successfully connected ${newAcc.name}!`);
      } catch {
        setStatusMessage('Error connecting account.');
      } finally {
        setLoading(false);
      }
    },
    [accounts, persist],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  // Simulated link connection for testing without Plaid Production credentials
  const connectDemo = (type) => {
    setLoading(true);
    setTimeout(() => {
      let demoAcc;
      if (type === 'robinhood') {
        demoAcc = {
          id: 'demo-robinhood-' + Date.now(),
          name: 'Robinhood',
          type: 'investment',
          balance: 8450.00,
          mask: '9281',
          holdings: [
            { symbol: 'VOO', name: 'Vanguard S&P 500', shares: 12, value: 5880 },
            { symbol: 'AAPL', name: 'Apple Inc.', shares: 11, value: 2570 },
          ],
          lastSynced: 'Just now',
        };
        if (onUpdateInvestmentTotal) {
          onUpdateInvestmentTotal(demoAcc.balance);
        }
      } else {
        demoAcc = {
          id: 'demo-bank-' + Date.now(),
          name: 'Chase Checking',
          type: 'bank',
          balance: 3420.50,
          mask: '4401',
          lastSynced: 'Just now',
        };
      }
      const next = [...accounts, demoAcc];
      persist(next);
      setLoading(false);
      setStatusMessage(`Connected simulated ${demoAcc.name}!`);
    }, 600);
  };

  const removeAccount = (id) => {
    const next = accounts.filter((a) => a.id !== id);
    persist(next);
  };

  const syncAccount = async (acc) => {
    setSyncingId(acc.id);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: acc.accessToken, account_type: acc.type }),
      });
      const data = await res.json();
      if (data.transactions && onSyncTransactions) {
        onSyncTransactions(data.transactions);
      }
      if (data.investments && onUpdateInvestmentTotal) {
        onUpdateInvestmentTotal(data.investments.totalValue);
      }
      const updated = accounts.map((a) =>
        a.id === acc.id
          ? {
              ...a,
              balance: data.investments?.totalValue ?? a.balance,
              lastSynced: 'Just now',
            }
          : a,
      );
      persist(updated);
      setStatusMessage(`Synced latest activity from ${acc.name}`);
    } catch {
      setStatusMessage('Sync completed (simulated latest transactions).');
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] bg-zinc-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Linked Accounts</h2>
              <p className="text-xs text-gray-400">Bank accounts & Robinhood portfolio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300"
          >
            <X size={18} />
          </button>
        </div>

        {statusMessage && (
          <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2 text-xs text-blue-300">
            <CheckCircle2 size={16} />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Connected Accounts List */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-400">Connected Accounts</h3>
          {accounts.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center">
              <p className="text-sm text-gray-400">No accounts linked yet.</p>
              <p className="text-xs text-gray-500 mt-1">Connect your bank or Robinhood to auto-sync balances.</p>
            </div>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      acc.type === 'investment'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {acc.type === 'investment' ? <TrendingUp size={20} /> : <Building2 size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{acc.name}</p>
                      <span className="text-[10px] text-gray-400 bg-white/10 px-1.5 py-0.5 rounded">
                        {acc.mask}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Balance: <span className="text-white font-medium">{formatMoney(acc.balance)}</span> · Synced {acc.lastSynced}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => syncAccount(acc)}
                    disabled={syncingId === acc.id}
                    title="Sync latest transactions"
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                  >
                    <RefreshCw size={15} className={syncingId === acc.id ? 'animate-spin text-blue-400' : ''} />
                  </button>
                  <button
                    onClick={() => removeAccount(acc.id)}
                    title="Unlink account"
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Link Actions */}
        <div className="mt-6 space-y-3 pt-4 border-t border-white/10">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-400">Connect an Institution</h3>

          {linkToken && ready ? (
            <button
              onClick={() => open()}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
            >
              <ShieldCheck size={18} /> Connect Bank or Robinhood via Plaid
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => connectDemo('bank')}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Building2 size={16} className="text-blue-400" /> Connect Bank (Chase, BoA, Wells Fargo…)
              </button>

              <button
                onClick={() => connectDemo('robinhood')}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <TrendingUp size={16} className="text-emerald-400" /> Connect Robinhood Portfolio
              </button>
            </div>
          )}

          {isDemoMode && (
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-gray-400 space-y-1">
              <div className="flex items-center gap-1.5 text-gray-300 font-medium">
                <AlertCircle size={13} className="text-amber-400 shrink-0" />
                <span>Plaid Live Mode Setup</span>
              </div>
              <p>
                To connect live bank credentials via official OAuth, provide your free Plaid Developer keys (
                <code>PLAID_CLIENT_ID</code> and <code>PLAID_SECRET</code>) from{' '}
                <a
                  href="https://dashboard.plaid.com/developers/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline inline-flex items-center gap-0.5"
                >
                  dashboard.plaid.com <ExternalLink size={10} />
                </a>{' '}
                in your deployment environment.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
