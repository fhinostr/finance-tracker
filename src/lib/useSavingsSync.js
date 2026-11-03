import { useState, useCallback, useEffect } from 'react';
import { getStoredAccounts, getGoalAccountMapping, saveStoredAccounts } from './store.js';

/**
 * useSavingsSync
 * Pulls real balance data directly from the user's connected accounts.
 * Defaults strictly to 0 if no accounts are connected.
 */
export function useSavingsSync(targetGoal = 3000) {
  const getAccountBalance = useCallback(() => {
    const mapping = getGoalAccountMapping();
    const stored = getStoredAccounts();
    const targetAcc = stored.find((a) => a.id === mapping.relocationAccountId);
    if (targetAcc) return Number(targetAcc.balance) || 0;

    const savingsAcc = stored.find(
      (a) =>
        a.subtype?.toLowerCase().includes('savings') ||
        a.name?.toLowerCase().includes('savings') ||
        a.name?.toLowerCase().includes('hysa'),
    );
    if (savingsAcc) return Number(savingsAcc.balance) || 0;

    const saved = localStorage.getItem('relocation_hysa_balance');
    return saved !== null && stored.length > 0 ? Number(saved) : 0;
  }, []);

  const [savingsBalance, setSavingsBalance] = useState(getAccountBalance);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(() => {
    const stored = getStoredAccounts();
    if (stored.length === 0) return 'No accounts linked yet';
    return localStorage.getItem('relocation_hysa_last_synced') || 'Just now';
  });

  useEffect(() => {
    const handleUpdate = () => {
      setSavingsBalance(getAccountBalance());
    };
    window.addEventListener('finance-tracker:accounts-updated', handleUpdate);
    window.addEventListener('finance-tracker:goal-accounts-updated', handleUpdate);
    return () => {
      window.removeEventListener('finance-tracker:accounts-updated', handleUpdate);
      window.removeEventListener('finance-tracker:goal-accounts-updated', handleUpdate);
    };
  }, [getAccountBalance]);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const bal = getAccountBalance();
    setSavingsBalance(bal);
    const nowStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setLastSynced(`Synced at ${nowStr}`);
    localStorage.setItem('relocation_hysa_last_synced', `Synced at ${nowStr}`);
    setIsSyncing(false);
  }, [getAccountBalance]);

  const addFunds = useCallback((amount) => {
    const mapping = getGoalAccountMapping();
    const stored = getStoredAccounts();
    const targetAcc = stored.find((a) => a.id === mapping.relocationAccountId);
    if (targetAcc) {
      const nextBal = (Number(targetAcc.balance) || 0) + amount;
      const updated = stored.map((a) => (a.id === targetAcc.id ? { ...a, balance: nextBal } : a));
      saveStoredAccounts(updated);
      setSavingsBalance(nextBal);
    } else {
      setSavingsBalance((prev) => {
        const updated = Math.min(targetGoal * 2, Math.round((prev + amount) * 100) / 100);
        localStorage.setItem('relocation_hysa_balance', String(updated));
        return updated;
      });
    }
    const nowStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setLastSynced(`Updated at ${nowStr}`);
    localStorage.setItem('relocation_hysa_last_synced', `Updated at ${nowStr}`);
  }, [targetGoal]);

  return {
    savingsBalance,
    isSyncing,
    lastSynced,
    syncNow,
    addFunds,
  };
}

