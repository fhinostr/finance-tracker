import { useState, useCallback } from 'react';

/**
 * Mock data hook: useSavingsSync
 * Simulates pulling balance data from a High-Yield Savings Account (HYSA)
 * tailored to a January 2027 relocation milestone ($3,000 target).
 */
export function useSavingsSync(targetGoal = 3000) {
  const [savingsBalance, setSavingsBalance] = useState(() => {
    const saved = localStorage.getItem('relocation_hysa_balance');
    return saved !== null ? Number(saved) : 1350.0;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(() => {
    return localStorage.getItem('relocation_hysa_last_synced') || 'Just now';
  });

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    // Simulate network delay to High-Yield Savings Account
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simulate minor monthly yield interest credit (+4.5% APY monthly slice)
    setSavingsBalance((prev) => {
      const monthlyInterest = (prev * 0.045) / 12;
      const updated = Math.round((prev + monthlyInterest) * 100) / 100;
      localStorage.setItem('relocation_hysa_balance', String(updated));
      return updated;
    });

    const nowStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setLastSynced(`Today at ${nowStr}`);
    localStorage.setItem('relocation_hysa_last_synced', `Today at ${nowStr}`);
    setIsSyncing(false);
  }, []);

  const addFunds = useCallback((amount) => {
    setSavingsBalance((prev) => {
      const updated = Math.min(targetGoal * 2, Math.round((prev + amount) * 100) / 100);
      localStorage.setItem('relocation_hysa_balance', String(updated));
      return updated;
    });
    const nowStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setLastSynced(`Today at ${nowStr}`);
    localStorage.setItem('relocation_hysa_last_synced', `Today at ${nowStr}`);
  }, [targetGoal]);

  return {
    savingsBalance,
    isSyncing,
    lastSynced,
    syncNow,
    addFunds,
  };
}

