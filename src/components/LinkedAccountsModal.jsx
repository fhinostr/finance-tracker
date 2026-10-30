import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlaidLink } from 'react-plaid-link';
import {
  X,
  Building2,
  TrendingUp,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Trash2,
  KeyRound,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit2,
  Check,
  PiggyBank,
  HelpCircle,
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
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Manual Account Entry State
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualType, setManualType] = useState('bank'); // bank, savings, credit, investment
  const [manualBalance, setManualBalance] = useState('');
  const [manualMask, setManualMask] = useState('');

  // Inline Account Balance Editing
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editBalanceVal, setEditBalanceVal] = useState('');

  // Troubleshooting dropdown
  const [showPlaidTroubleshoot, setShowPlaidTroubleshoot] = useState(false);

  const handleAddManualAccount = (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    const balanceNum = parseFloat(manualBalance) || 0;
    const current = getStoredAccounts();
    const isSavings = manualType === 'savings';
    const isCredit = manualType === 'credit';
    const isInv = manualType === 'investment';
    const resolvedType = isInv ? 'investment' : isCredit ? 'credit' : 'bank';

    const newAcc = {
      id: `manual-${Date.now()}`,
      name: manualName.trim(),
      type: resolvedType,
      subtype: isSavings
        ? 'savings'
        : isCredit
        ? 'credit card'
        : isInv
        ? 'brokerage'
        : 'checking',
      balance: balanceNum,
      available: balanceNum,
      mask: manualMask.trim().slice(-4) || '••••',
      accessToken: null,
      lastSynced: 'Manual entry',
      isManual: true,
    };

    const next = [newAcc, ...current];
    saveStoredAccounts(next);
    setAccounts(next);
    setManualName('');
    setManualBalance('');
    setManualMask('');
    setShowManualForm(false);
    setStatusMessage(`Added ${newAcc.name} (${formatMoney(balanceNum)})`);
  };

  const handleSaveBalanceEdit = (id) => {
    const num = parseFloat(editBalanceVal);
    if (isNaN(num)) {
      setEditingAccountId(null);
      return;
    }
    const current = getStoredAccounts();
    const next = current.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          balance: num,
          available: num,
          lastSynced: 'Just updated',
        };
      }
      return a;
    });
    saveStoredAccounts(next);
    setAccounts(next);
    setEditingAccountId(null);
    setEditBalanceVal('');
    setStatusMessage('Balance updated!');
  };

  // Initialize or Refresh Link Token
  const requestLinkToken = useCallback(async (accountType = 'bank') => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await callPlaidApi('create-link-token', { account_type: accountType });
      if (data?.link_token) {
        setLinkToken(data.link_token);
        setShowKeySettings(false);
        return data.link_token;
      }
    } catch (err) {
      setErrorMessage(
        `${err.message || 'Unable to connect to Plaid'}. If you copied the Sandbox secret, make sure Environment is set to Sandbox (or Production if using Production secret).`,
      );
    } finally {
      setLoading(false);
    }
    return null;
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

  useEffect(() => {
    const handleUpdate = () => {
      setAccounts(getStoredAccounts());
    };
    window.addEventListener('finance-tracker:accounts-updated', handleUpdate);
    return () => window.removeEventListener('finance-tracker:accounts-updated', handleUpdate);
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

  // Sync a single linked account
  const syncAccount = useCallback(async (acc) => {
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

      const current = getStoredAccounts();
      let updated = [...current];

      if (Array.isArray(data.accounts) && data.accounts.length > 0) {
        const institutionName = acc.name.split(' (')[0] || 'Bank';
        const isRobinhood = acc.type === 'investment' || institutionName.toLowerCase().includes('robinhood');

        // Remove old dummy placeholder that has mask '••••' for this access token
        updated = updated.filter(
          (ex) => !(ex.accessToken === acc.accessToken && ex.mask === '••••' && data.accounts.length > 0),
        );

        data.accounts.forEach((da) => {
          const rawType = (da.type || '').toLowerCase();
          const rawSub = (da.subtype || '').toLowerCase();
          const isCredit = rawType === 'credit' || rawSub.includes('credit');
          const isInv = isRobinhood || rawType === 'investment' || rawSub.includes('brokerage') || rawSub.includes('crypto');
          const resolvedType = isInv ? 'investment' : isCredit ? 'credit' : 'bank';

          // Preserve the specific account's balance from Plaid
          let balance = Number(da.balance != null ? da.balance : da.current) || 0;
          if (resolvedType === 'bank' && da.available != null) {
            balance = Number(da.available);
          }

          // If this account has its own specific holdings, use their sum if balance is zero
          const accHoldings = Array.isArray(da.holdings) && da.holdings.length > 0
            ? da.holdings
            : (data.investments?.holdings || []).filter((h) => h.account_id === da.id);

          if (resolvedType === 'investment' && balance === 0 && accHoldings.length > 0) {
            balance = accHoldings.reduce((sum, h) => sum + (Number(h.value) || 0), 0);
          }

          // ONLY if there is strictly 1 single investment account, and its balance is 0, fall back to totalValue
          if (resolvedType === 'investment' && balance === 0 && data.accounts.length === 1 && data.investments?.totalValue) {
            balance = Number(data.investments.totalValue) || 0;
          }

          const existingIdx = updated.findIndex(
            (ex) => ex.id === da.id || (ex.accessToken === acc.accessToken && ex.mask === da.mask),
          );

          const payload = {
            id: da.id,
            name: `${institutionName}${da.name ? ` (${da.name})` : ''}`.trim(),
            type: resolvedType,
            subtype: da.subtype,
            balance,
            available: da.available,
            mask: da.mask || '••••',
            accessToken: acc.accessToken,
            holdings: accHoldings,
            lastSynced: 'Just now',
          };

          if (existingIdx >= 0) {
            updated[existingIdx] = { ...updated[existingIdx], ...payload };
          } else {
            updated.push(payload);
          }
        });
      } else {
        const siblingAccounts = updated.filter((s) => s.accessToken === acc.accessToken);
        updated = updated.map((a) => {
          if (a.id === acc.id) {
            let bal = a.balance;
            // Never overwrite with totalValue if multiple accounts share this token!
            if (a.type === 'investment' && siblingAccounts.length === 1 && data.investments?.totalValue !== undefined) {
              bal = data.investments.totalValue;
            }
            return { ...a, balance: Number(bal) || 0, lastSynced: 'Just now' };
          }
          return a;
        });
      }

      saveStoredAccounts(updated);
      setAccounts(updated);
      setStatusMessage(`Synced latest activity from ${acc.name}`);
    } catch {
      setStatusMessage('Sync complete.');
    } finally {
      setSyncingId(null);
    }
  }, [onSyncTransactions, onUpdateInvestmentTotal]);

  // Sync all accounts
  const syncAllAccounts = useCallback(async () => {
    const current = getStoredAccounts();
    if (current.length === 0) return;
    setIsSyncingAll(true);
    setStatusMessage('Syncing latest balances and activity...');
    try {
      const seenTokens = new Set();
      for (const acc of current) {
        if (!seenTokens.has(acc.accessToken)) {
          seenTokens.add(acc.accessToken);
          await syncAccount(acc);
        }
      }
      setStatusMessage('All accounts successfully synced!');
    } catch (e) {
      console.warn('Sync all error:', e);
    } finally {
      setIsSyncingAll(false);
    }
  }, [syncAccount]);

  // Auto-sync if any account has 0 balance or hasn't synced
  useEffect(() => {
    const current = getStoredAccounts();
    const needsSync = current.some((a) => (Number(a.balance) === 0 || !a.lastSynced) && a.accessToken);
    if (needsSync && current.length > 0) {
      const timer = setTimeout(() => {
        syncAllAccounts();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [syncAllAccounts]);

  // Exchange Plaid Public Token
  const onSuccess = useCallback(
    async (public_token, metadata, explicitType = 'bank') => {
      setLoading(true);
      setErrorMessage('');
      try {
        const data = await callPlaidApi('exchange-token', {
          public_token,
          institution: metadata?.institution,
          accounts: metadata?.accounts,
        });

        const institutionName = metadata?.institution?.name || (explicitType === 'investment' ? 'Robinhood' : 'Linked Account');
        const isRobinhood = explicitType === 'investment' || institutionName.toLowerCase().includes('robinhood');

        let newAccounts = [];
        if (Array.isArray(data.accounts) && data.accounts.length > 0) {
          newAccounts = data.accounts.map((acc, idx) => {
            const rawType = (acc.type || '').toLowerCase();
            const rawSub = (acc.subtype || '').toLowerCase();
            const isCredit = rawType === 'credit' || rawSub.includes('credit');
            const isInv = isRobinhood || rawType === 'investment' || rawSub.includes('brokerage');
            const type = isInv ? 'investment' : isCredit ? 'credit' : 'bank';
            let balance = Number(acc.balance) || 0;
            if (type === 'bank' && acc.available != null) {
              balance = Number(acc.available);
            }
            return {
              id: acc.id || `${data.item_id || 'acc'}-${idx}`,
              name: `${institutionName}${acc.name ? ` (${acc.name})` : ''}`.trim(),
              type,
              subtype: acc.subtype,
              balance,
              available: acc.available,
              mask: acc.mask || '••••',
              accessToken: data.access_token || 'token_' + Date.now(),
              lastSynced: 'Just now',
            };
          });
        } else {
          newAccounts = [
            {
              id: data.item_id || 'acc-' + Date.now(),
              name: institutionName,
              type: isRobinhood ? 'investment' : 'bank',
              balance: 0,
              mask: '••••',
              accessToken: data.access_token || 'token_' + Date.now(),
              lastSynced: 'Just now',
            },
          ];
        }

        const current = getStoredAccounts();
        const filtered = current.filter(
          (ex) => !newAccounts.some((n) => n.id === ex.id || (n.name === ex.name && n.mask === ex.mask)),
        );
        const next = [...filtered, ...newAccounts];
        saveStoredAccounts(next);
        setAccounts(next);
        setStatusMessage(`Connected ${institutionName}!`);

        if (newAccounts[0]) {
          await syncAccount(newAccounts[0]);
        }
      } catch (err) {
        setErrorMessage(`Connection failed: ${err.message || 'Error connecting account'}`);
      } finally {
        setLoading(false);
      }
    },
    [syncAccount],
  );

  const { open } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => onSuccess(public_token, metadata, 'bank'),
  });

  // Launch Plaid with specific account type (bank vs investment)
  const launchPlaid = async (type = 'bank') => {
    setLoading(true);
    setErrorMessage('');
    setStatusMessage(type === 'investment' ? 'Opening Robinhood connection...' : 'Opening bank connection...');
    try {
      const data = await callPlaidApi('create-link-token', { account_type: type });
      if (!data?.link_token) {
        throw new Error('Could not generate link token.');
      }
      setLinkToken(data.link_token);

      if (typeof window !== 'undefined' && window.Plaid) {
        const handler = window.Plaid.create({
          token: data.link_token,
          onSuccess: (public_token, metadata) => {
            onSuccess(public_token, metadata, type);
          },
          onExit: (err) => {
            setLoading(false);
            if (err) console.warn('Plaid Link exit:', err);
          },
        });
        handler.open();
      } else {
        setTimeout(() => open(), 300);
      }
    } catch (err) {
      setErrorMessage(
        `${err.message || 'Unable to connect to Plaid'}. Check your Plaid keys and Environment setting.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const removeAccount = (id) => {
    const current = getStoredAccounts();
    const next = current.filter((a) => a.id !== id);
    saveStoredAccounts(next);
    setAccounts(next);
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-400">
              Connected Accounts {accounts.length > 0 ? `(${accounts.length})` : ''}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowManualForm(!showManualForm)}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all border border-emerald-500/20"
              >
                <Plus size={13} />
                <span>{showManualForm ? 'Close' : 'Add Manually'}</span>
              </button>
              {accounts.length > 0 && (
                <button
                  onClick={syncAllAccounts}
                  disabled={isSyncingAll}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 transition-all"
                >
                  <RefreshCw size={13} className={isSyncingAll ? 'animate-spin' : ''} />
                  <span>{isSyncingAll ? 'Syncing...' : 'Sync All'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Manual Account Add Form */}
          <AnimatePresence>
            {showManualForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddManualAccount}
                className="p-4 rounded-2xl bg-white/5 border border-emerald-500/30 space-y-3 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Plus size={14} /> Add Account / Set Balances
                  </span>
                  <span className="text-[10px] text-gray-400">Directly syncs to live dashboard</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualType('bank')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      manualType === 'bank'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-black/20 border-white/10 text-gray-400'
                    }`}
                  >
                    <Building2 size={13} /> Checking
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('savings')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      manualType === 'savings'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-black/20 border-white/10 text-gray-400'
                    }`}
                  >
                    <PiggyBank size={13} /> Savings / HYSA
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('credit')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      manualType === 'credit'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-black/20 border-white/10 text-gray-400'
                    }`}
                  >
                    <CreditCard size={13} /> Credit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('investment')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      manualType === 'investment'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-black/20 border-white/10 text-gray-400'
                    }`}
                  >
                    <TrendingUp size={13} /> Robinhood
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder={
                      manualType === 'investment'
                        ? 'Robinhood Portfolio'
                        : manualType === 'credit'
                        ? 'Credit Card Name (e.g. Apple Card)'
                        : manualType === 'savings'
                        ? 'High-Yield Savings (HYSA)'
                        : 'Checking Account Name'
                    }
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2 text-xs text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={manualBalance}
                        onChange={(e) => setManualBalance(e.target.value)}
                        placeholder="Current Balance"
                        className="w-full pl-6 pr-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <input
                      type="text"
                      maxLength={4}
                      value={manualMask}
                      onChange={(e) => setManualMask(e.target.value)}
                      placeholder="Last 4 (opt)"
                      className="w-24 px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-center"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <Plus size={14} /> Save Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {accounts.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-2">
              <p className="text-sm text-gray-300 font-medium">No accounts linked yet.</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Connect your live bank or Robinhood account below, or tap <strong>Add Manually</strong> above to set your real balances directly.
              </p>
            </div>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      acc.type === 'investment'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : acc.type === 'credit'
                        ? 'bg-amber-500/20 text-amber-400'
                        : acc.subtype?.toLowerCase().includes('savings')
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {acc.type === 'investment' ? (
                      <TrendingUp size={18} />
                    ) : acc.type === 'credit' ? (
                      <CreditCard size={18} />
                    ) : acc.subtype?.toLowerCase().includes('savings') ? (
                      <PiggyBank size={18} />
                    ) : (
                      <Building2 size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 truncate">
                      <p className="text-sm font-semibold text-white truncate">{acc.name}</p>
                      <span className="text-[10px] text-gray-400 bg-white/10 px-1.5 py-0.5 rounded shrink-0">
                        ••••{acc.mask}
                      </span>
                    </div>

                    {editingAccountId === acc.id ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={editBalanceVal}
                          onChange={(e) => setEditBalanceVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveBalanceEdit(acc.id);
                            if (e.key === 'Escape') setEditingAccountId(null);
                          }}
                          className="w-24 px-2 py-0.5 rounded bg-black/60 border border-emerald-500 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveBalanceEdit(acc.id)}
                          className="p-1 rounded bg-emerald-500 text-black hover:bg-emerald-400"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAccountId(null)}
                          className="p-1 rounded bg-white/10 text-gray-400 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">
                          {acc.type === 'credit' ? 'Balance Owed (Debt): ' : 'Balance: '}
                          <span className={acc.type === 'credit' ? 'text-amber-300 font-semibold' : 'text-white font-medium'}>
                            {acc.type === 'credit' ? `-${formatMoney(acc.balance)}` : formatMoney(acc.balance)}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccountId(acc.id);
                            setEditBalanceVal(String(acc.balance));
                          }}
                          title="Edit balance"
                          className="text-gray-500 hover:text-emerald-400 transition-colors"
                        >
                          <Edit2 size={11} />
                        </button>
                        <span className="text-[10px] text-gray-500">· {acc.lastSynced}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {acc.accessToken && (
                    <button
                      onClick={() => syncAccount(acc)}
                      disabled={syncingId === acc.id}
                      title="Sync latest transactions"
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                    >
                      <RefreshCw size={14} className={syncingId === acc.id ? 'animate-spin text-blue-400' : ''} />
                    </button>
                  )}
                  <button
                    onClick={() => removeAccount(acc.id)}
                    title="Unlink account"
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
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

          {/* Plaid Link Connect Buttons */}
          {plaidClientId?.trim() && plaidSecret?.trim() ? (
            <div className="space-y-2.5">
              <button
                onClick={() => launchPlaid('bank')}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-transform"
              >
                <Building2 size={18} /> Connect Bank Account (Checking, Savings, Cards)
              </button>

              <button
                onClick={() => launchPlaid('investment')}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-transform"
              >
                <TrendingUp size={18} /> Connect Robinhood Portfolio
              </button>

              {/* Troubleshooting Card for 'Couldn't connect to your institution' */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowPlaidTroubleshoot(!showPlaidTroubleshoot)}
                  className="w-full flex items-center justify-between text-xs text-gray-300 hover:text-white font-medium"
                >
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <AlertCircle size={14} />
                    <span>Plaid says &quot;Couldn&apos;t connect to your institution&quot;?</span>
                  </div>
                  {showPlaidTroubleshoot ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showPlaidTroubleshoot && (
                  <div className="text-[11px] text-gray-400 space-y-2 pt-2 border-t border-white/5 leading-relaxed">
                    <p>
                      <strong className="text-white">1. Sandbox vs. Production:</strong> If your Plaid Environment is set to <em>Sandbox</em>, Plaid will reject real logins with this message. To connect your real bank, switch the environment to <strong>Production</strong> using your Production secret under <em>Plaid API Credentials</em> below.
                    </p>
                    <p>
                      <strong className="text-white">2. Robinhood Brokerage Limitation:</strong> Robinhood frequently restricts third-party aggregators or delays automated 2FA verification. Use the <strong>&quot;Add Manually&quot;</strong> button above to track your real Robinhood balance right away.
                    </p>
                    <p>
                      <strong className="text-white">3. OAuth / Bank Maintenance:</strong> Banks like Chase or Capital One occasionally undergo routine downtime. If Plaid doesn&apos;t complete, you can enter your balances manually and sync again anytime.
                    </p>
                  </div>
                )}
              </div>

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
