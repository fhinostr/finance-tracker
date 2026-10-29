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
  ShieldCheck,
  Trash2,
  KeyRound,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatMoney, getStoredAccounts, saveStoredAccounts } from '../lib/store.js';
import {
  callPlaidApi,
  getPlaidConfig,
  savePlaidConfig,
} from '../lib/supabase.js';

export default function LinkedAccountsModal({ onClose, onSyncTransactions, onUpdateInvestmentTotal }) {
  const [accounts, setAccounts] = useState(getStoredAccounts);
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Plaid Configuration State
  const initialPlaid = getPlaidConfig();
  const [plaidClientId, setPlaidClientId] = useState(initialPlaid.clientId);
  const [plaidSecret, setPlaidSecret] = useState(initialPlaid.secret);
  const [plaidEnv, setPlaidEnv] = useState(initialPlaid.env || 'sandbox');
  const [showKeySettings, setShowKeySettings] = useState(!initialPlaid.clientId || !initialPlaid.secret);
  const [keysSaved, setKeysSaved] = useState(false);

  // Initialize or Refresh Link Token
  const requestLinkToken = useCallback(async (accountType = 'bank') => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await callPlaidApi('create-link-token', { account_type: accountType });
      if (data?.link_token) {
        setLinkToken(data.link_token);
        setShowKeySettings(false);
      }
    } catch (err) {
      setErrorMessage(
        `${err.message || 'Unable to connect to Plaid'}. If you copied the Sandbox secret, make sure Environment is set to Sandbox (or Production if using Production secret).`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    callPlaidApi('create-link-token', { account_type: 'bank' })
      .then((data) => {
        if (!active) return;
        if (data?.link_token) {
          setLinkToken(data.link_token);
          setShowKeySettings(false);
        }
      })
      .catch((err) => {
        if (active) {
          setErrorMessage(err.message || 'Plaid keys required');
          setShowKeySettings(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next) => {
    setAccounts(next);
    saveStoredAccounts(next);
  }, []);

  const handleSavePlaidKeys = (e) => {
    e.preventDefault();
    if (!plaidClientId.trim() || !plaidSecret.trim()) {
      setErrorMessage('Please enter both your Plaid Client ID and Secret.');
      return;
    }
    savePlaidConfig(plaidClientId, plaidSecret, plaidEnv);
    setKeysSaved(true);
    setErrorMessage('');
    setTimeout(() => setKeysSaved(false), 2000);
    requestLinkToken();
  };

  // Exchange Plaid Public Token
  const onSuccess = useCallback(
    async (public_token, metadata) => {
      setLoading(true);
      setErrorMessage('');
      try {
        const data = await callPlaidApi('exchange-token', {
          public_token,
          institution: metadata?.institution,
          accounts: metadata?.accounts,
        });

        const institutionName = metadata?.institution?.name || 'Linked Financial Account';
        const isRobinhood = institutionName.toLowerCase().includes('robinhood');

        let newAccounts = [];
        if (Array.isArray(data.accounts) && data.accounts.length > 0) {
          newAccounts = data.accounts.map((acc, idx) => ({
            id: acc.id || `${data.item_id || 'acc'}-${idx}`,
            name: `${institutionName}${acc.name ? ` (${acc.name})` : ''}`.trim(),
            type: isRobinhood || acc.type === 'investment' ? 'investment' : 'bank',
            balance: acc.balance || 0,
            mask: acc.mask || '••••',
            accessToken: data.access_token || 'token_' + Date.now(),
            lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
        } else {
          newAccounts = [
            {
              id: data.item_id || 'acc-' + Date.now(),
              name: institutionName,
              type: isRobinhood ? 'investment' : 'bank',
              balance: 0,
              mask: '••••',
              accessToken: data.access_token || 'token_' + Date.now(),
              lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ];
        }

        const next = [...accounts, ...newAccounts];
        persist(next);
        setStatusMessage(`Connected ${institutionName}!`);

        if (newAccounts[0]) {
          syncAccount(newAccounts[0]);
        }
      } catch (err) {
        setErrorMessage(`Connection failed: ${err.message || 'Error connecting account'}`);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accounts, persist],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const removeAccount = (id) => {
    const next = accounts.filter((a) => a.id !== id);
    persist(next);
  };

  const syncAccount = async (acc) => {
    setSyncingId(acc.id);
    try {
      const data = await callPlaidApi('sync', {
        access_token: acc.accessToken,
        account_type: acc.type,
      });

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
      setStatusMessage('Sync complete.');
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
        {/* Header */}
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

        {/* Notifications */}
        {statusMessage && (
          <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2 text-xs text-blue-300">
            <CheckCircle2 size={16} />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
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
                        ••••{acc.mask}
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-400">Connect Institution</h3>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Supabase Backend Active
            </span>
          </div>

          {/* Plaid Link Official Button */}
          {linkToken && ready ? (
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  requestLinkToken('bank').then(() => open());
                }}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-transform"
              >
                <Building2 size={18} /> Connect Bank Account (Checking, Savings, Cards)
              </button>

              <button
                onClick={() => {
                  requestLinkToken('investment').then(() => open());
                }}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-transform"
              >
                <TrendingUp size={18} /> Connect Robinhood Portfolio
              </button>

              {plaidEnv === 'sandbox' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>Sandbox Test Credentials</span>
                  </div>
                  <p className="leading-relaxed">
                    Because you are in <strong>Sandbox Mode</strong>, Plaid only connects to mock test logins. Do not enter your real banking password!
                    <br />
                    • Username: <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-white">user_good</code>
                    <br />
                    • Password: <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-white">pass_good</code>
                    <br />
                    • SMS / MFA Code: <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-white">1234</code>
                    <br />
                    <span className="text-gray-400">
                      To connect your real bank or Robinhood with your real login, switch Environment below to <strong>Production</strong> using your Production secret.
                    </span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => setShowKeySettings(true)}
                className="w-full py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
              >
                <KeyRound size={17} /> Enter Plaid Keys to Connect Live Accounts
              </button>
            </div>
          )}

          {/* Plaid API Keys Setup Panel */}
          <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <button
              onClick={() => setShowKeySettings(!showKeySettings)}
              className="w-full p-3.5 text-left flex items-center justify-between text-xs font-semibold text-gray-300 hover:text-white"
            >
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-blue-400" />
                <span>Plaid API Credentials</span>
              </div>
              {showKeySettings ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showKeySettings && (
              <form onSubmit={handleSavePlaidKeys} className="p-3.5 pt-0 space-y-3 text-xs border-t border-white/5">
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Paste your keys from{' '}
                  <a
                    href="https://dashboard.plaid.com/developers/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 underline inline-flex items-center gap-0.5"
                  >
                    Plaid Dashboard <ExternalLink size={10} />
                  </a>
                  . Once saved, the official Plaid popup will activate above.
                </p>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Plaid Client ID</label>
                  <input
                    type="text"
                    value={plaidClientId}
                    onChange={(e) => setPlaidClientId(e.target.value)}
                    placeholder="e.g. 64f12ab..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400/60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Plaid Secret</label>
                  <input
                    type="password"
                    value={plaidSecret}
                    onChange={(e) => setPlaidSecret(e.target.value)}
                    placeholder="e.g. 79bc3d..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400/60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Environment</label>
                  <select
                    value={plaidEnv}
                    onChange={(e) => setPlaidEnv(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-400/60"
                  >
                    <option value="sandbox">Sandbox (Testing — use your Plaid 'Sandbox' secret)</option>
                    <option value="production">Production (Live Accounts — use your Plaid 'Production' secret)</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Check which row your secret came from on the Plaid Keys page:
                    <br />
                    • If copied from the <strong>Sandbox</strong> row → select <strong>Sandbox</strong>.
                    <br />
                    • If copied from the <strong>Production</strong> row → select <strong>Production</strong>.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 size={14} />
                  <span>{keysSaved ? 'Saved! Connecting…' : 'Save Keys & Activate Plaid'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Reset Tracker to Clean Slate */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all stored entries and reset to a clean, empty tracker?')) {
                  try {
                    localStorage.removeItem('finance-tracker:v1');
                    localStorage.removeItem('finance-tracker:v2');
                    localStorage.removeItem('finance-tracker:linked-accounts:v1');
                  } catch {
                    // ignore
                  }
                  window.location.reload();
                }
              }}
              className="text-[11px] text-gray-500 hover:text-red-400 underline transition-colors"
            >
              Reset tracker & clear any cached placeholder data
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
