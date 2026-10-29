import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  TrendingUp,
  CreditCard,
  PieChart,
  Repeat,
  DollarSign,
  PiggyBank,
  Plus,
  Mic,
  Trash2,
  Calendar,
  Layers,
  Building2,
  Sparkles,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  Target,
  TrendingDown,
  Lock,
  Unlock,
  Info,
  ShieldCheck,
  Scissors,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import {
  useFinanceData,
  debtBalance,
  monthsToPayoff,
  formatMoney,
  currentMonthKey,
  getStoredAccounts,
  categorizeAccounts,
} from './lib/store.js';
import { generateOptimizationInsights } from './lib/optimization.js';
import AddEntrySheet from './components/AddEntrySheet.jsx';
import LinkedAccountsModal from './components/LinkedAccountsModal.jsx';

const springAnim = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export default function PersonalFinanceTracker() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [includeBonus, setIncludeBonus] = useState(false);
  const [sheet, setSheet] = useState({ isOpen: false, autoListen: false });
  const [showLinkedModal, setShowLinkedModal] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState(getStoredAccounts);

  useEffect(() => {
    const handleUpdate = () => {
      setLinkedAccounts(getStoredAccounts());
    };
    window.addEventListener('finance-tracker:accounts-updated', handleUpdate);
    return () => window.removeEventListener('finance-tracker:accounts-updated', handleUpdate);
  }, []);

  const { entries, budgets, addEntry, addEntries, updateBudget, setAllBudgets, removeEntry } = useFinanceData();

  const handleSyncTransactions = (newTxs) => {
    if (!Array.isArray(newTxs) || newTxs.length === 0) return;
    addEntries(newTxs);
  };

  const handleUpdateInvestmentTotal = () => {
    setLinkedAccounts(getStoredAccounts());
  };

  // --- Calculations ---
  const {
    bonusNet,
    currentNet,
    fixedExpenses,
    totalFixed,
    totalVariable,
    debts,
    cashSurplus,
    debtSplit,
    savingsSplit,
    categoryTotals,
  } = useMemo(() => {
    // Income: recurring monthly salary/retainers + live client hourly deposits this month
    const thisMonth = currentMonthKey();
    const monthlyIncomes = entries.filter((e) => e.kind === 'income' && e.frequency === 'monthly');
    const base = monthlyIncomes
      .filter((e) => !e.optional)
      .reduce((sum, e) => sum + e.amount, 0);
    const bonus = monthlyIncomes
      .filter((e) => e.optional)
      .reduce((sum, e) => sum + e.amount, 0);

    const liveDeposits = entries.filter(
      (e) =>
        e.kind === 'income' &&
        e.frequency !== 'monthly' &&
        (e.date?.startsWith(thisMonth) ?? true),
    );
    const liveDepositSum = liveDeposits.reduce((sum, e) => sum + e.amount, 0);

    const net = (includeBonus ? base + bonus : base) + liveDepositSum;

    // Fixed overhead (recurring monthly expenses)
    const fixed = entries.filter((e) => e.kind === 'expense' && e.frequency === 'monthly');
    const fixedSum = fixed.reduce((sum, e) => sum + e.amount, 0);

    // Variable expenses (one-time expenses this month)
    const variable = entries.filter(
      (e) => e.kind === 'expense' && e.frequency === 'one-time' && (e.date?.startsWith(thisMonth) ?? true),
    );
    const variableSum = variable.reduce((sum, e) => sum + e.amount, 0);

    // Debts
    const debtList = entries.filter((e) => e.kind === 'debt');
    const debtMonthly = debtList.reduce((sum, d) => sum + (d.minPayment || 0) + (d.extraPayment || 0), 0);

    // Cash flow surplus
    const surplus = Math.max(net - fixedSum - variableSum - debtMonthly, 0);
    const toDebt = Math.round(surplus * 0.35);
    const toSavings = surplus - toDebt;

    // Spending by category for variable expenses
    const catMap = {};
    for (const exp of variable) {
      const cat = exp.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + exp.amount;
    }

    return {
      baseNetIncome: base,
      bonusNet: bonus,
      currentNet: net,
      fixedExpenses: fixed,
      totalFixed: fixedSum,
      variableExpenses: variable,
      totalVariable: variableSum,
      debts: debtList,
      totalDebtAllocation: debtMonthly,
      cashSurplus: surplus,
      debtSplit: toDebt,
      savingsSplit: toSavings,
      categoryTotals: catMap,
    };
  }, [entries, includeBonus]);

  const optimization = useMemo(() => {
    return generateOptimizationInsights({
      entries,
      categoryTotals,
      totalVariable,
      totalFixed,
      debts,
      currentNet,
      budgets,
    });
  }, [entries, categoryTotals, totalVariable, totalFixed, debts, currentNet, budgets]);

  const openAdd = (autoListen = false) => {
    setSheet({ isOpen: true, autoListen });
  };

  const closeAdd = () => {
    setSheet({ isOpen: false, autoListen: false });
  };

  const handleSaveEntry = (newEntry) => {
    addEntry(newEntry);
    closeAdd();
  };

  return (
    <div className="relative min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 p-4 sm:p-8">
      {/* Ambient Liquid Background */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full mix-blend-screen filter blur-[120px] opacity-70 pointer-events-none animate-pulse" />
      <div
        className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full mix-blend-screen filter blur-[120px] opacity-70 pointer-events-none animate-pulse"
        style={{ animationDelay: '2s' }}
      />

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col space-y-6 pb-24">
        {/* Header - Income Tracking */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-start pt-4"
        >
          <div>
            <p className="text-gray-400 text-sm font-medium tracking-wide uppercase mb-1">Monthly Net Income</p>
            <h1 className="text-5xl font-semibold tracking-tight">
              ${Math.floor(currentNet).toLocaleString()}
              <span className="text-2xl text-gray-500">
                .{(currentNet % 1).toFixed(2).slice(2)}
              </span>
            </h1>
            {bonusNet > 0 && (
              <button
                onClick={() => setIncludeBonus(!includeBonus)}
                className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  includeBonus
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {includeBonus
                  ? `+ ${formatMoney(bonusNet)} Net Bonus Applied`
                  : `Include Performance Bonus (${formatMoney(bonusNet)})`}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLinkedAccounts(getStoredAccounts());
                setShowLinkedModal(true);
              }}
              aria-label="Linked bank and Robinhood accounts"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md border border-white/20 text-xs font-semibold text-gray-200 shadow-lg"
            >
              <Building2 className="text-blue-400" size={15} />
              <span>{linkedAccounts.length > 0 ? `${linkedAccounts.length} Linked` : 'Link Accounts'}</span>
            </button>
            <button
              onClick={() => openAdd(false)}
              aria-label="Add income or entry"
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg"
            >
              <DollarSign className="text-green-400" size={20} />
            </button>
          </div>
        </motion.header>

        {/* Tab Navigation (iOS Segmented Control Style) */}
        <div className="flex bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-inner overflow-x-auto no-scrollbar">
          {['dashboard', 'optimize', 'subscriptions', 'debt', 'wealth'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative flex-1 py-2 px-3 text-xs sm:text-sm font-medium capitalize z-10 whitespace-nowrap"
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-white/20 rounded-xl shadow-sm"
                  transition={springAnim}
                />
              )}
              <span className={`relative z-20 ${activeTab === tab ? 'text-white' : 'text-gray-400'}`}>
                {tab === 'optimize' ? 'Optimize' : tab === 'wealth' ? 'Invest & Save' : tab}
              </span>
            </button>
          ))}
        </div>

        {/* Dynamic Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={springAnim}
            className="flex-1"
          >
            {activeTab === 'dashboard' && (
              <DashboardTab
                totalVariable={totalVariable}
                categoryTotals={categoryTotals}
                budgets={budgets}
                cashSurplus={cashSurplus}
                debtSplit={debtSplit}
                savingsSplit={savingsSplit}
                entries={entries}
                linkedAccounts={linkedAccounts}
                optimization={optimization}
                onNavigateTab={setActiveTab}
                onOpenLink={() => {
                  setLinkedAccounts(getStoredAccounts());
                  setShowLinkedModal(true);
                }}
                onDelete={removeEntry}
                onAdd={() => openAdd(false)}
              />
            )}
            {activeTab === 'optimize' && (
              <OptimizationTab
                optimization={optimization}
                budgets={budgets}
                onUpdateBudget={updateBudget}
                onSetAllBudgets={setAllBudgets}
                categoryTotals={categoryTotals}
                totalVariable={totalVariable}
                onNavigateTab={setActiveTab}
              />
            )}
            {activeTab === 'subscriptions' && (
              <SubscriptionsTab
                fixedExpenses={fixedExpenses}
                totalFixed={totalFixed}
                onDelete={removeEntry}
                onAdd={() => openAdd(false)}
              />
            )}
            {activeTab === 'debt' && (
              <DebtTab
                debts={debts}
                entries={entries}
                onDelete={removeEntry}
                onAdd={() => openAdd(false)}
              />
            )}
            {activeTab === 'wealth' && (
              <WealthTab
                debts={debts}
                entries={entries}
                linkedAccounts={linkedAccounts}
                cashSurplus={cashSurplus}
                currentNet={currentNet}
                totalFixed={totalFixed}
                totalVariable={totalVariable}
                optimization={optimization}
                onOpenLink={() => {
                  setLinkedAccounts(getStoredAccounts());
                  setShowLinkedModal(true);
                }}
                onNavigateTab={setActiveTab}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Bottom Quick Action Dock */}
      <div className="fixed bottom-5 inset-x-0 z-40 flex justify-center items-center pointer-events-none px-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-2 p-1.5 rounded-full bg-zinc-900/80 backdrop-blur-2xl border border-white/20 shadow-2xl pointer-events-auto"
        >
          {/* Voice Dictation Button */}
          <button
            onClick={() => openAdd(true)}
            aria-label="Dictate expense, income, or debt"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            <Mic size={18} />
            <span>Dictate</span>
          </button>

          {/* Plus Add Button */}
          <button
            onClick={() => openAdd(false)}
            aria-label="Add new entry"
            className="h-10 w-10 rounded-full bg-white text-black hover:bg-gray-100 flex items-center justify-center shadow-lg active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </motion.div>
      </div>

      {/* Linked Accounts Modal */}
      <AnimatePresence>
        {showLinkedModal && (
          <LinkedAccountsModal
            onClose={() => {
              setLinkedAccounts(getStoredAccounts());
              setShowLinkedModal(false);
            }}
            onSyncTransactions={handleSyncTransactions}
            onUpdateInvestmentTotal={handleUpdateInvestmentTotal}
          />
        )}
      </AnimatePresence>

      {/* Add / Dictate Modal Sheet */}
      <AnimatePresence>
        {sheet.isOpen && (
          <AddEntrySheet
            entries={entries}
            autoListen={sheet.autoListen}
            onSave={handleSaveEntry}
            onClose={closeAdd}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- TABS ---

function formatCategory(cat) {
  if (!cat) return 'Other';
  return cat
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, '&');
}

function DashboardTab({
  totalVariable,
  categoryTotals,
  budgets,
  cashSurplus,
  debtSplit,
  savingsSplit,
  entries,
  linkedAccounts = [],
  optimization,
  onNavigateTab,
  onOpenLink,
  onDelete,
  onAdd,
}) {
  const allCategories = Object.keys(categoryTotals);
  const recentTransactions = entries
    .filter((e) => e.kind !== 'debt')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 10);

  const {
    bankAccounts,
    creditAccounts,
    investmentAccounts,
    totalCashInBank,
    totalCreditBalance,
    totalPortfolioValue,
  } = categorizeAccounts(linkedAccounts);

  return (
    <div className="space-y-5">
      {/* Important Overview Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Cash in Bank */}
        <button
          onClick={onOpenLink}
          className="p-3 sm:p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/10 shadow-lg text-left transition-all active:scale-95"
        >
          <div className="flex items-center gap-1.5 mb-1.5 text-blue-400">
            <Building2 size={15} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Cash in Bank</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
            {formatMoney(totalCashInBank)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
            {bankAccounts.length > 0 ? `${bankAccounts.length} ${bankAccounts.length === 1 ? 'account' : 'accounts'}` : 'Tap to link'}
          </p>
        </button>

        {/* Credit Card Balance */}
        <button
          onClick={onOpenLink}
          className="p-3 sm:p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/10 shadow-lg text-left transition-all active:scale-95"
        >
          <div className="flex items-center gap-1.5 mb-1.5 text-amber-400">
            <CreditCard size={15} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Credit Cards</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-amber-300 tracking-tight truncate">
            {formatMoney(totalCreditBalance)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
            {creditAccounts.length > 0 ? `${creditAccounts.length} ${creditAccounts.length === 1 ? 'card' : 'cards'}` : 'Tap to link'}
          </p>
        </button>

        {/* Portfolio Value */}
        <button
          onClick={onOpenLink}
          className="p-3 sm:p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/10 shadow-lg text-left transition-all active:scale-95"
        >
          <div className="flex items-center gap-1.5 mb-1.5 text-emerald-400">
            <TrendingUp size={15} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Portfolio</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-emerald-300 tracking-tight truncate">
            {formatMoney(totalPortfolioValue)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
            {investmentAccounts.length > 0 ? 'Robinhood' : 'Tap to link'}
          </p>
        </button>
      </div>

      {/* Connected Accounts Breakdown if any connected */}
      {linkedAccounts.length > 0 && (
        <GlassCard
          title="Connected Balances"
          icon={<Building2 className="text-blue-400" />}
          amount={formatMoney(totalCashInBank + totalPortfolioValue)}
        >
          <div className="space-y-2">
            {linkedAccounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-2.5 bg-black/30 rounded-xl border border-white/5"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-1.5 rounded-lg ${
                      acc.type === 'investment'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : acc.type === 'credit'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {acc.type === 'investment' ? (
                      <TrendingUp size={14} />
                    ) : acc.type === 'credit' ? (
                      <CreditCard size={14} />
                    ) : (
                      <Building2 size={14} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{acc.name}</p>
                    <p className="text-[10px] text-gray-500">••••{acc.mask}</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold ${
                    acc.type === 'credit' ? 'text-amber-300' : 'text-white'
                  }`}
                >
                  {formatMoney(acc.balance)}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={onOpenLink}
            className="mt-2 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors"
          >
            Manage & Sync Accounts
          </button>
        </GlassCard>
      )}

      {/* Smart Budget Optimization Callout */}
      {optimization?.totalPotentialSavings > 0 && (
        <div className="relative overflow-hidden p-4 rounded-3xl bg-gradient-to-br from-indigo-900/50 via-purple-900/35 to-zinc-900/80 backdrop-blur-xl border border-indigo-500/25 shadow-xl space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sparkles size={18} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
                  Optimization Insights
                </span>
                <p className="text-sm font-bold text-white">
                  Save up to {formatMoney(optimization.totalPotentialSavings)}/mo
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Score: {optimization.healthScore}/100
            </span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            Identified <strong className="text-white font-semibold">{optimization.suggestions.length} spending cut opportunities</strong> (saving roughly <span className="text-emerald-400 font-semibold">{formatMoney(optimization.totalPotentialSavings * 12)}/yr</span>).
          </p>

          <button
            onClick={() => onNavigateTab?.('optimize')}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Lightbulb size={14} /> Review Spending Cuts & Budget Caps <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Variable Expenses */}
      <GlassCard
        title="Variable Expenses"
        icon={<CreditCard className="text-blue-400" />}
        amount={formatMoney(totalVariable)}
      >
        <div className="space-y-3.5">
          {allCategories.length === 0 ? (
            <p className="text-sm text-gray-500">No variable expenses logged this month.</p>
          ) : (
            allCategories.map((cat) => {
              const spent = categoryTotals[cat] || 0;
              const max = budgets[cat] || spent || 100;
              return (
                <ProgressBar
                  key={cat}
                  label={formatCategory(cat)}
                  current={spent}
                  max={max}
                  color="bg-blue-400"
                />
              );
            })
          )}
        </div>

        <button
          onClick={onAdd}
          className="mt-4 w-full py-2.5 rounded-xl border border-dashed border-white/15 text-xs font-medium text-gray-400 hover:text-white hover:border-white/30 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus size={14} /> Add Variable Expense
        </button>
      </GlassCard>

      {/* Cash Flow Surplus */}
      <GlassCard
        title="Cash Flow Surplus"
        icon={<PieChart className="text-green-400" />}
        amount={formatMoney(cashSurplus)}
      >
        <p className="text-sm text-gray-400 mb-3">Available monthly for debt acceleration and investments.</p>
        <div className="flex space-x-2">
          <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/5">
            <p className="text-xs text-gray-500 mb-1">To Debt</p>
            <p className="text-lg font-semibold text-red-400">{formatMoney(debtSplit)}</p>
          </div>
          <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/5">
            <p className="text-xs text-gray-500 mb-1">To Savings</p>
            <p className="text-lg font-semibold text-green-400">{formatMoney(savingsSplit)}</p>
          </div>
        </div>
      </GlassCard>

      {/* Recent Activity List */}
      <GlassCard
        title="Recent Activity"
        icon={<Layers className="text-indigo-400" />}
        amount={`${recentTransactions.length} items`}
      >
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions recorded yet.</p>
        ) : (
          <div className="space-y-2 mt-2">
            {recentTransactions.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                        item.kind === 'income'
                          ? 'bg-green-500/20 text-green-400'
                          : item.kind === 'payment'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {item.kind === 'payment' ? 'Debt Pay' : formatCategory(item.category || item.kind)}
                    </span>
                    {item.pending && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Pending
                      </span>
                    )}
                    <p className="text-sm font-medium text-gray-200 truncate">{item.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <Calendar size={11} />
                    {item.date || 'Recent'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      item.kind === 'income' ? 'text-green-400' : 'text-white'
                    }`}
                  >
                    {item.kind === 'income' ? '+' : '-'}
                    {formatMoney(item.amount)}
                  </span>
                  <button
                    onClick={() => onDelete(item.id)}
                    aria-label={`Delete ${item.name}`}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function SubscriptionsTab({ fixedExpenses, totalFixed, onDelete, onAdd }) {
  return (
    <div className="space-y-5">
      <GlassCard
        title="Fixed Overhead"
        icon={<Repeat className="text-orange-400" />}
        amount={formatMoney(totalFixed)}
      >
        <div className="space-y-3 mt-4">
          {fixedExpenses.length === 0 ? (
            <p className="text-sm text-gray-500">No monthly recurring expenses added yet.</p>
          ) : (
            fixedExpenses.map((sub) => (
              <div
                key={sub.id}
                className="group flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-200">{sub.name}</p>
                  <p className="text-xs text-gray-500">{sub.note || 'Monthly recurring'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{formatMoney(sub.amount)}</p>
                  <button
                    onClick={() => onDelete(sub.id)}
                    aria-label={`Delete ${sub.name}`}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onAdd}
          className="mt-4 w-full py-2.5 rounded-xl border border-dashed border-white/15 text-xs font-medium text-gray-400 hover:text-white hover:border-white/30 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus size={14} /> Add Recurring Subscription or Bill
        </button>
      </GlassCard>
    </div>
  );
}

function DebtTab({ debts, entries, onDelete, onAdd }) {
  if (debts.length === 0) {
    return (
      <GlassCard title="Debts & Loans" icon={<Car className="text-red-400" />} amount="$0">
        <p className="text-sm text-gray-400 py-4 text-center">
          No debts or loans tracked. Tap below or dictate “I owe 5,000 on my credit card”.
        </p>
        <button
          onClick={onAdd}
          className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={16} /> Add a Debt
        </button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5">
      {debts.map((debt) => {
        const remaining = debtBalance(debt, entries);
        const original = debt.original || debt.balance || remaining;
        const paidSoFar = Math.max(original - remaining, 0);
        const monthlyTotal = (debt.minPayment || 0) + (debt.extraPayment || 0);
        const months = monthsToPayoff(remaining, monthlyTotal, debt.apr);

        const payments = entries.filter((e) => e.kind === 'payment' && e.debtId === debt.id);

        return (
          <GlassCard
            key={debt.id}
            title={debt.name}
            icon={<Car className="text-red-400" />}
            amount={`${formatMoney(remaining)} Left`}
          >
            <div className="space-y-5 mt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Target Payoff Date</span>
                <span className="font-medium text-white">
                  {months === null
                    ? 'Payment too low for APR'
                    : months === 0
                    ? 'Paid off!'
                    : `${months} Month${months === 1 ? '' : 's'}`}
                </span>
              </div>

              <ProgressBar
                label="Principal Progress"
                current={paidSoFar}
                max={original}
                color="bg-red-400"
              />

              <div className="p-4 bg-black/30 rounded-xl border border-white/5 flex flex-col space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-400">Scheduled Minimum</p>
                  <p className="font-medium text-white">{formatMoney(debt.minPayment || 0, { cents: 'always' })}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-400">Principal-Only Extra</p>
                  <p className="font-medium text-green-400">
                    +{formatMoney(debt.extraPayment || 0, { cents: 'always' })}
                  </p>
                </div>
                {debt.apr && (
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <p>Annual Interest (APR)</p>
                    <p>{debt.apr}%</p>
                  </div>
                )}
                <div className="h-px w-full bg-white/10" />
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-gray-200">Total Monthly Allocation</p>
                  <p className="text-lg font-bold text-white">
                    {formatMoney(monthlyTotal, { cents: 'always' })}
                  </p>
                </div>
              </div>

              {/* Payments logged */}
              {payments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-xs uppercase font-medium text-gray-500">Logged Payments</p>
                  {payments.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center text-xs p-2 bg-black/20 rounded-lg"
                    >
                      <span className="text-gray-400">{p.date || 'Recent payment'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-semibold">-{formatMoney(p.amount)}</span>
                        <button
                          onClick={() => onDelete(p.id)}
                          aria-label="Remove payment"
                          className="text-gray-500 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onAdd}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus size={14} /> Log Payment
                </button>
                <button
                  onClick={() => onDelete(debt.id)}
                  aria-label={`Delete ${debt.name}`}
                  className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </GlassCard>
        );
      })}

      <button
        onClick={onAdd}
        className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-dashed border-white/15 text-sm font-medium text-gray-300 flex items-center justify-center gap-2 transition-colors"
      >
        <Plus size={16} /> Add Another Debt / Loan
      </button>
    </div>
  );
}

function WealthTab({
  debts = [],
  entries = [],
  linkedAccounts = [],
  cashSurplus = 0,
  currentNet: _currentNet = 0,
  totalFixed = 0,
  totalVariable = 0,
  optimization,
  onOpenLink,
  onNavigateTab,
}) {
  const {
    bankAccounts,
    investmentAccounts,
    totalCashInBank,
    totalCreditBalance,
    totalPortfolioValue,
  } = categorizeAccounts(linkedAccounts);

  const totalBankAssets = totalCashInBank;
  const totalInvestmentAssets = totalPortfolioValue;
  const totalUserDebts = debts.reduce((sum, d) => sum + debtBalance(d, entries), 0);
  const totalDebts = totalCreditBalance + totalUserDebts;
  const netWorth = totalBankAssets + totalInvestmentAssets - totalDebts;

  const [matchCaptured, setMatchCaptured] = useState(false);

  // Dynamic Monthly Cash Surplus
  const activeMonthlySurplus = Math.max(cashSurplus, 0);

  // 1. Live HYSA / Savings Balance
  const savingsAccounts = bankAccounts.filter(
    (a) =>
      a.subtype?.toLowerCase().includes('savings') ||
      a.name?.toLowerCase().includes('savings') ||
      a.name?.toLowerCase().includes('hysa'),
  );
  const liquidSavings =
    savingsAccounts.length > 0
      ? savingsAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
      : totalBankAssets;

  // 2. 2018 Kia Sportage Auto Loan
  const kiaDebt =
    debts.find((d) => {
      const name = (d.name || '').toLowerCase();
      return (
        name.includes('kia') ||
        name.includes('sportage') ||
        name.includes('auto') ||
        name.includes('car')
      );
    }) || debts.find((d) => d.kind === 'debt') || null;

  const kiaBalance = kiaDebt ? debtBalance(kiaDebt, entries) : 0;
  const kiaOriginal = kiaDebt?.original || kiaDebt?.balance || (kiaBalance > 0 ? kiaBalance : 9000);
  const kiaApr = kiaDebt?.apr || 12.5;
  const isKiaPaidOff = kiaDebt ? kiaBalance <= 0 : false;
  const hasKiaDebt = kiaDebt != null && kiaBalance > 0;
  const phase3Progress =
    kiaOriginal > 0
      ? Math.min(Math.max(((kiaOriginal - kiaBalance) / kiaOriginal) * 100, 0), 100)
      : isKiaPaidOff
      ? 100
      : 0;

  // HYSA Goal Milestones
  const moveInBufferTarget = 3000;
  const moveInCurrent = Math.min(liquidSavings, moveInBufferTarget);
  const moveInPct = Math.min((moveInCurrent / moveInBufferTarget) * 100, 100);
  const isMoveInComplete = liquidSavings >= moveInBufferTarget;

  const emergencyTarget = 10000;
  const emergencySavings = Math.max(0, Math.min(liquidSavings - moveInBufferTarget, emergencyTarget));
  const emergencyPct = Math.min((emergencySavings / emergencyTarget) * 100, 100);
  const isEmergencyComplete = emergencySavings >= emergencyTarget;

  // Investment Targets
  const rothIraTarget = 7000;
  const rothCurrent = Math.min(totalInvestmentAssets, rothIraTarget);
  const rothPct = Math.min((rothCurrent / rothIraTarget) * 100, 100);

  // Optimization impacts
  const optSavings = optimization?.totalPotentialSavings || 0;
  const carMonthsSaved = optimization?.goalImpacts?.car?.monthsSaved || 3;
  const carInterestSaved = optimization?.goalImpacts?.car?.interestSaved || 450;
  const hysaWeeksFaster = optimization?.goalImpacts?.hysa?.weeksFaster || 4;
  const tenYearCompound = optimization?.goalImpacts?.funds?.tenYearTotal || 45000;

  return (
    <div className="space-y-5">
      {/* Strategic Goals Header & Surplus Engine */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-indigo-950/70 via-zinc-900/85 to-black/90 backdrop-blur-2xl border border-indigo-500/25 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Target size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                Core Financial Goals Engine
              </p>
              <h2 className="text-2xl font-extrabold text-white">
                {formatMoney(activeMonthlySurplus)}
                <span className="text-xs text-gray-400 font-normal"> / month surplus</span>
              </h2>
            </div>
          </div>
          <button
            onClick={onOpenLink}
            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 transition-all"
          >
            Manage Accounts
          </button>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          Your live cash flow surplus and identified spending optimizations are channeled directly into your 3 core financial priorities: paying off your car loan, securing your HYSA buffer, and growing tax-advantaged funds.
        </p>

        {/* Goal Impact Highway */}
        {optSavings > 0 && (
          <div className="p-3 bg-black/40 rounded-2xl border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <Sparkles size={14} /> Optimization Opportunities Active
              </span>
              <span className="text-white font-bold">+{formatMoney(optSavings)} / mo</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Applying your identified spending cuts accelerates your car payoff by <strong>{carMonthsSaved} months</strong> and saves roughly <strong>{formatMoney(carInterestSaved)}</strong> in loan interest!
            </p>
            <button
              onClick={() => onNavigateTab?.('optimize')}
              className="w-full py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Lightbulb size={13} /> View Specific Spending Cuts (Cut This Out & Spend Less Here) <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* 3 Core Financial Goals */}
      <div className="space-y-4">
        {/* GOAL 2: Amount in HYSA (Move-In Buffer + Emergency Fund) */}
        <div className="p-5 rounded-3xl bg-zinc-900/85 backdrop-blur-2xl border border-cyan-500/25 shadow-lg shadow-cyan-500/5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400">
                <PiggyBank size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Liquid Savings Goal
                  </span>
                  {isMoveInComplete && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Buffer Funded
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-white mt-1">Amount in HYSA (High-Yield Savings)</h4>
                <p className="text-xs text-gray-400">
                  Targeting $3,000 move-in buffer first, then expanding to $10,000 (3-month emergency runway).
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-cyan-400">{formatMoney(liquidSavings)}</span>
              <p className="text-[10px] text-gray-500">Live Liquid Cash</p>
            </div>
          </div>

          {/* Milestone 1: $3k Move-In Buffer */}
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-white">Milestone 1: Maryland Move-In Buffer</span>
              <span className="text-gray-300 font-bold">{formatMoney(moveInCurrent)} / {formatMoney(moveInBufferTarget)}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${isMoveInComplete ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                style={{ width: `${moveInPct}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400">
              Reserved for Rockville apartment security deposit and MVA vehicle registration.
            </p>
          </div>

          {/* Milestone 2: $10k Emergency Fund */}
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-white">Milestone 2: 3-Month Emergency Runway</span>
              <span className="text-gray-300 font-bold">{formatMoney(emergencySavings)} / {formatMoney(emergencyTarget)}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${isEmergencyComplete ? 'bg-emerald-400' : 'bg-blue-400'}`}
                style={{ width: `${emergencyPct}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400">
              Full baseline financial shield once the car loan is cleared.
            </p>
          </div>
        </div>

        {/* GOAL 1: 2018 Kia Sportage Payoff Strategy */}
        <div className="p-5 rounded-3xl bg-zinc-900/85 backdrop-blur-2xl border border-amber-500/25 shadow-lg shadow-amber-500/5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
                <Car size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    High-Priority Debt Goal
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400">
                    ~{kiaApr}% APR Auto Loan
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">Pay Off 2018 Kia Sportage</h4>
                <p className="text-xs text-gray-400">
                  Dedicating $800/mo cash flow + any detected bonuses directly to debt elimination.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold ${isKiaPaidOff ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isKiaPaidOff ? '$0 (Paid Off!)' : formatMoney(kiaBalance)}
              </span>
              <p className="text-[10px] text-gray-500">Remaining Balance</p>
            </div>
          </div>

          {/* Payoff Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${phase3Progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${isKiaPaidOff ? 'bg-emerald-400' : 'bg-amber-400'}`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>{phase3Progress.toFixed(0)}% Paid Off</span>
              <span>
                {isKiaPaidOff
                  ? 'Debt Eliminated!'
                  : `${formatMoney(kiaBalance)} left to clear note`}
              </span>
            </div>
          </div>

          {/* Persistent Strategic Notes & Tooltips */}
          <div className="space-y-2 pt-1">
            <div className="p-3 rounded-2xl bg-black/50 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200">
              <Info size={16} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong className="text-white block mb-0.5">Payment Rule: Principal-Only Payments</strong>
                When sending extra monthly cash beyond your minimum payment, always specify the payment as <strong>&quot;Principal-Only&quot;</strong>. This bypasses future interest compounding at ~12.5% APR.
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-black/30 border border-white/5 flex items-start gap-2.5 text-xs text-gray-300">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <strong className="text-white block mb-0.5">Strategy: Hold and Pay Off — Do Not Lease</strong>
                Keeping the 2018 Kia Sportage long-term post-payoff eliminates depreciation and permanently frees up <strong>$800+/month</strong> in recurring cash flow.
              </div>
            </div>
          </div>
        </div>

        {/* GOAL 3: Tax-Advantaged Funds & Wealth Compounding */}
        <div className="p-5 rounded-3xl bg-zinc-900/85 backdrop-blur-2xl border border-purple-500/25 shadow-lg shadow-purple-500/5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400">
                <TrendingUp size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Investing Goal
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    ~30% Tax Shield
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">Funds & Tax-Advantaged Growth</h4>
                <p className="text-xs text-gray-400">
                  Robinhood portfolio, 100% 401(k) match capture, and Roth IRA compounding.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-purple-400">{formatMoney(totalInvestmentAssets)}</span>
              <p className="text-[10px] text-gray-500">Live Portfolio</p>
            </div>
          </div>

          {/* 3 Pillars */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
              <div>
                <strong className="text-white block">1. 100% Employer 401(k) Match</strong>
                <span className="text-[10px] text-gray-400">Capture 100% of free matching dollars upon transition.</span>
              </div>
              <button
                onClick={() => setMatchCaptured(!matchCaptured)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                  matchCaptured
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-gray-400'
                }`}
              >
                {matchCaptured ? '✓ Captured' : 'Mark Captured'}
              </button>
            </div>

            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
              <div>
                <strong className="text-white block">2. Max Roth IRA ($7,000 / yr)</strong>
                <span className="text-[10px] text-gray-400">Tax-free compounding in low-cost broad index funds.</span>
              </div>
              <span className="font-bold text-emerald-400">{formatMoney(rothCurrent)}</span>
            </div>

            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-white">3. Traditional 401(k) Tax Shield</span>
                <span className="text-emerald-400">~29.95% (~30%) Tax Saved</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Federal (22.0%) + Maryland (4.75%) + Montgomery County (3.20%). Every $1,000 saved into your 401(k) protects ~$300 from immediate taxes.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between">
            <span>10-Yr Compounding Projection:</span>
            <strong className="text-white text-sm">+{formatMoney(tenYearCompound)}</strong>
          </div>
        </div>
      </div>

      {/* Live Net Worth & Account Summaries */}
      <GlassCard
        title="Live Net Worth"
        icon={<PiggyBank className="text-green-400" />}
        amount={formatMoney(netWorth)}
      >
        <p className="text-xs text-gray-400 mb-3">
          Calculated dynamically from your live linked checking, savings, brokerage, and auto loans.
        </p>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <p className="text-[10px] uppercase font-semibold text-gray-500 mb-1">Cash in Bank</p>
            <p className="text-sm font-bold text-blue-400">{formatMoney(totalBankAssets)}</p>
          </div>
          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <p className="text-[10px] uppercase font-semibold text-gray-500 mb-1">Investments</p>
            <p className="text-sm font-bold text-emerald-400">{formatMoney(totalInvestmentAssets)}</p>
          </div>
          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <p className="text-[10px] uppercase font-semibold text-gray-500 mb-1">Debts</p>
            <p className="text-sm font-bold text-red-400">{formatMoney(totalDebts)}</p>
          </div>
        </div>
      </GlassCard>

      {/* Robinhood Portfolio Card */}
      {investmentAccounts.length > 0 ? (
        investmentAccounts.map((acc) => (
          <GlassCard
            key={acc.id}
            title={acc.name}
            icon={<TrendingUp className="text-emerald-400" />}
            amount={formatMoney(acc.balance)}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Account ••••{acc.mask}</span>
                <span className="text-emerald-400 font-medium">Synced {acc.lastSynced}</span>
              </div>

              {acc.holdings && acc.holdings.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Portfolio Holdings
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {acc.holdings.map((h) => (
                      <div key={h.symbol} className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white">{h.symbol}</span>
                          <span className="text-xs font-semibold text-gray-200">{formatMoney(h.value)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{h.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onOpenLink}
                className="mt-2 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors"
              >
                Manage in Linked Accounts
              </button>
            </div>
          </GlassCard>
        ))
      ) : (
        <button
          onClick={onOpenLink}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/20 text-left flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Connect Robinhood Portfolio</p>
              <p className="text-xs text-gray-400">Sync your live stock holdings and investment value</p>
            </div>
          </div>
          <Plus size={16} className="text-emerald-400" />
        </button>
      )}

      {/* Connected Bank Accounts */}
      {bankAccounts.length > 0 ? (
        <GlassCard
          title="Bank Accounts"
          icon={<Building2 className="text-blue-400" />}
          amount={formatMoney(totalBankAssets)}
        >
          <div className="space-y-2">
            {bankAccounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-2.5 bg-black/30 rounded-xl border border-white/5"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                    <Building2 size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{acc.name}</p>
                    <p className="text-[10px] text-gray-500">••••{acc.mask}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-white">{formatMoney(acc.balance)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onOpenLink}
            className="mt-2 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors"
          >
            Manage Bank Accounts
          </button>
        </GlassCard>
      ) : (
        <button
          onClick={onOpenLink}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 border border-blue-500/20 text-left flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Connect Bank Account</p>
              <p className="text-xs text-gray-400">Sync live checking & savings balances via Plaid</p>
            </div>
          </div>
          <Plus size={16} className="text-blue-400" />
        </button>
      )}

      {/* Debts Summary */}
      {hasAnyDebts && (
        <GlassCard
          title="Active Debts"
          icon={<CreditCard className="text-red-400" />}
          amount={formatMoney(totalDebts)}
        >
          <div className="space-y-3">
            {debts.map((d) => {
              const rem = debtBalance(d, entries);
              return (
                <div key={d.id} className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-medium">{d.name}</span>
                  <span className="text-red-400 font-semibold">{formatMoney(rem)}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function OptimizationTab({
  optimization,
  budgets,
  onUpdateBudget,
  onSetAllBudgets,
  onNavigateTab,
}) {
  const [appliedAll, setAppliedAll] = useState(false);
  const [appliedCategory, setAppliedCategory] = useState({});
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'cut', 'reduce'

  const handleApplyAll = () => {
    onSetAllBudgets(optimization.recommendedBudgets);
    setAppliedAll(true);
    setTimeout(() => setAppliedAll(false), 3000);
  };

  const handleApplySingle = (catKey, target) => {
    onUpdateBudget(catKey, target);
    setAppliedCategory((prev) => ({ ...prev, [catKey]: true }));
    setTimeout(() => {
      setAppliedCategory((prev) => ({ ...prev, [catKey]: false }));
    }, 2500);
  };

  const monthlySavings = optimization?.totalPotentialSavings || 0;
  const goalImpacts = optimization?.goalImpacts || {};
  const carImpact = goalImpacts.car || { monthsSaved: 3, interestSaved: 450 };
  const hysaImpact = goalImpacts.hysa || { weeksFaster: 4 };
  const fundsImpact = goalImpacts.funds || { tenYearTotal: 45000 };

  const displayedSuggestions =
    activeFilter === 'all'
      ? optimization.suggestions
      : activeFilter === 'cut'
      ? optimization.cutOutSuggestions
      : optimization.spendLessSuggestions;

  return (
    <div className="space-y-5">
      {/* 1. Hero Optimization Card */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-indigo-900/50 via-purple-900/35 to-zinc-900/90 backdrop-blur-2xl border border-indigo-500/25 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Spending Optimization & Goal Accelerators
              </p>
              <h2 className="text-2xl font-extrabold text-white">
                +{formatMoney(monthlySavings)}
                <span className="text-xs text-gray-400 font-normal"> / month recoverable cash</span>
              </h2>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Budget Health</span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                optimization.healthScore >= 80
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {optimization.healthScore}/100
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          Actionable, concrete recommendations categorized into <strong>&quot;Cut This Out&quot;</strong> (100% elimination) and <strong>&quot;Spend Less Here&quot;</strong> (smart category trimming), tied directly to your financial goals.
        </p>

        {/* Goals Acceleration Highway */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <div className="p-3 bg-black/40 rounded-2xl border border-amber-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
              <Car size={14} /> 2018 Kia Payoff
            </div>
            <p className="text-sm font-extrabold text-white">
              -{carImpact.monthsSaved} Months Earlier
            </p>
            <p className="text-[10px] text-gray-400">
              Saves ~{formatMoney(carImpact.interestSaved)} in 12.5% loan interest.
            </p>
          </div>

          <div className="p-3 bg-black/40 rounded-2xl border border-cyan-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-bold">
              <PiggyBank size={14} /> HYSA Move-In Buffer
            </div>
            <p className="text-sm font-extrabold text-white">
              ~{hysaImpact.weeksFaster} Weeks Faster
            </p>
            <p className="text-[10px] text-gray-400">
              Secures your $3,000 apartment & MVA reserve sooner.
            </p>
          </div>

          <div className="p-3 bg-black/40 rounded-2xl border border-purple-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-purple-300 font-bold">
              <TrendingUp size={14} /> 10-Yr Wealth Addition
            </div>
            <p className="text-sm font-extrabold text-emerald-400">
              +{formatMoney(fundsImpact.tenYearTotal)}
            </p>
            <p className="text-[10px] text-gray-400">
              Compounded in Robinhood & Roth IRA at 8% annual return.
            </p>
          </div>
        </div>

        <button
          onClick={handleApplyAll}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
        >
          {appliedAll ? (
            <>
              <CheckCircle2 size={16} className="text-emerald-300" />
              <span>Applied All Recommended Caps!</span>
            </>
          ) : (
            <>
              <Target size={16} />
              <span>Apply All Recommended Budget Caps</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Action Filter Tabs: All, Cut This Out, Spend Less Here */}
      <div className="flex bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-inner">
        <button
          onClick={() => setActiveFilter('all')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeFilter === 'all'
              ? 'bg-white text-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          All Recommendations ({optimization.suggestions.length})
        </button>
        <button
          onClick={() => setActiveFilter('cut')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeFilter === 'cut'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-rose-300 hover:text-white'
          }`}
        >
          <Scissors size={13} />
          <span>Cut This Out ({optimization.cutOutSuggestions?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveFilter('reduce')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeFilter === 'reduce'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-blue-300 hover:text-white'
          }`}
        >
          <TrendingDown size={13} />
          <span>Spend Less Here ({optimization.spendLessSuggestions?.length || 0})</span>
        </button>
      </div>

      {/* 3. Detailed Action Cards */}
      <div className="space-y-3.5">
        {displayedSuggestions.length === 0 ? (
          <GlassCard title="No Items Found" icon={<CheckCircle2 className="text-emerald-400" />}>
            <p className="text-xs text-gray-400 py-4 text-center">
              No recommendations matching this filter. Your budget is lean!
            </p>
          </GlassCard>
        ) : (
          displayedSuggestions.map((sug) => {
            const isApplied =
              budgets[sug.categoryKey] === sug.targetSpend ||
              budgets[sug.category] === sug.targetSpend ||
              appliedCategory[sug.categoryKey] ||
              appliedCategory[sug.category];

            return (
              <div
                key={sug.id}
                className={`p-4 rounded-3xl backdrop-blur-xl border shadow-lg space-y-3 transition-all ${
                  sug.actionType === 'cut'
                    ? 'bg-rose-950/20 border-rose-500/25'
                    : 'bg-zinc-900/80 border-white/10'
                }`}
              >
                {/* Header: Action Badge & Goal Alignment */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          sug.actionType === 'cut'
                            ? 'bg-rose-500/25 text-rose-300 border-rose-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {sug.actionBadge}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                        {sug.goalTarget === 'car'
                          ? '🏎️ Fuels Kia Payoff'
                          : sug.goalTarget === 'hysa'
                          ? '🏦 Fuels HYSA Buffer'
                          : '📈 Fuels Investing'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white">{sug.title}</h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-emerald-400">
                      +{formatMoney(sug.monthlySavings)}/mo
                    </span>
                    <p className="text-[10px] text-gray-500">+{formatMoney(sug.annualSavings)}/yr</p>
                  </div>
                </div>

                {/* EXACT ACTION INSTRUCTION */}
                <div
                  className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                    sug.actionType === 'cut'
                      ? 'bg-rose-950/30 border-rose-500/20 text-rose-100'
                      : 'bg-black/40 border-white/10 text-gray-200'
                  }`}
                >
                  <strong className="text-white block font-semibold mb-0.5">
                    {sug.actionType === 'cut' ? '🛑 What to Cut Out:' : '📉 How to Spend Less:'}
                  </strong>
                  {sug.exactAction}
                </div>

                {/* Current Spend vs Target Ceiling Meter */}
                <div className="p-3 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Current Spend</span>
                    <span className="font-semibold text-gray-300">{formatMoney(sug.currentSpend)}</span>
                  </div>
                  <TrendingDown size={14} className="text-emerald-400" />
                  <div>
                    <span className="text-gray-500 block text-[10px]">Target Cap</span>
                    <span className="font-bold text-white">{formatMoney(sug.targetSpend)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 block text-[10px]">Monthly Savings</span>
                    <span className="font-bold text-emerald-400">+{formatMoney(sug.monthlySavings)}</span>
                  </div>
                </div>

                {/* Top Contributing Transactions */}
                {sug.topTransactions && sug.topTransactions.length > 0 && (
                  <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                      Culprit Line Items Detected:
                    </p>
                    <div className="space-y-1">
                      {sug.topTransactions.map((tx, idx) => (
                        <div key={tx.id || idx} className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-300 truncate max-w-[200px]">{tx.name}</span>
                          <span className="text-white font-medium">{formatMoney(tx.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Goal Impact */}
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                  <ArrowRight size={12} /> {sug.goalImpact}
                </p>

                {/* 1-Click Action Button */}
                <div className="pt-1">
                  <button
                    onClick={() => handleApplySingle(sug.categoryKey || sug.category, sug.targetSpend)}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isApplied
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                        : sug.actionType === 'cut'
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-95'
                        : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle2 size={13} /> Target Budget Cap Active
                      </>
                    ) : (
                      <>
                        <Target size={13} /> {sug.actionLabel}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. 50 / 30 / 20 Rule Diagnostic */}
      <GlassCard
        title="50 / 30 / 20 Rule Diagnostic"
        icon={<PieChart className="text-purple-400" />}
        amount={`${optimization.budgetRatio.wants.pct}% Wants`}
      >
        <p className="text-xs text-gray-400 mb-3">
          Comparing your current spending allocation against healthy financial targets.
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-gray-300">Needs (Fixed Bills & Debts)</span>
              <span className="text-gray-400">
                {optimization.budgetRatio.needs.pct}% <span className="text-gray-500">(Target: ≤50%)</span>
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${optimization.budgetRatio.needs.pct > 55 ? 'bg-amber-400' : 'bg-blue-400'}`}
                style={{ width: `${Math.min(optimization.budgetRatio.needs.pct, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-gray-300">Wants (Discretionary Variable)</span>
              <span className="text-gray-400">
                {optimization.budgetRatio.wants.pct}% <span className="text-gray-500">(Target: ≤30%)</span>
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${optimization.budgetRatio.wants.pct > 35 ? 'bg-red-400' : 'bg-purple-400'}`}
                style={{ width: `${Math.min(optimization.budgetRatio.wants.pct, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-gray-300">Savings & Surplus</span>
              <span className="text-gray-400">
                {optimization.budgetRatio.savings.pct}% <span className="text-gray-500">(Target: ≥20%)</span>
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${Math.min(optimization.budgetRatio.savings.pct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// --- UI COMPONENTS ---

function GlassCard({ title, amount, icon, children }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="p-5 rounded-[28px] bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/10 rounded-2xl shadow-inner border border-white/5">{icon}</div>
          <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
        </div>
        <span className="text-xl font-bold">{amount}</span>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

function ProgressBar({ label, current, max, color = 'bg-white' }) {
  const safeMax = max > 0 ? max : 1;
  const percentage = Math.min((current / safeMax) * 100, 100);
  const isOver = current > max && max > 0;
  const isNear = max > 0 && current / max >= 0.85;
  const barColor = isOver ? 'bg-red-400' : isNear ? 'bg-amber-400' : color;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-gray-400">{label}</span>
        <span className={isOver ? 'text-red-400 font-semibold' : 'text-gray-200'}>
          ${Math.round(current).toLocaleString()} / ${Math.round(max).toLocaleString()}
          {isOver && <span className="ml-1 text-[10px] text-red-400 font-bold">(Over Cap)</span>}
        </span>
      </div>
      <div className="h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, delay: 0.1, type: 'spring', bounce: 0.4 }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
    </div>
  );
}


