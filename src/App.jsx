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

  // Timeline Phase: Current (Now - Dec 2026) vs Future (Jan 2027+ Rockville Move)
  const isSystem2027 = new Date().getFullYear() >= 2027;
  const [timelinePhase, setTimelinePhase] = useState(isSystem2027 ? 'future' : 'current');
  const [matchCaptured, setMatchCaptured] = useState(false);

  // Dynamic Surplus Calculation based on Phase:
  // Current Phase: Variable hourly client income based on live deposits minus expenses
  // Future Phase: $90k salary baseline (~$5,475 net/mo base + $125/mo bonus potential) minus expenses
  const estimated2027Net = 5475;
  const activeMonthlySurplus =
    timelinePhase === 'current'
      ? Math.max(cashSurplus, 0)
      : Math.max(estimated2027Net - totalFixed - totalVariable, 800);

  // 1. Identify Live Savings / HYSA Balance
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

  // 2. Identify 2018 Kia Sportage Auto Loan
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

  // Waterfall Phase Calculations & Locking Rules:
  // Phase 1: Maryland Move-In Buffer ($3,000 Target)
  const phase1Target = 3000;
  const phase1Current = Math.min(liquidSavings, phase1Target);
  const phase1Pct = Math.min((phase1Current / phase1Target) * 100, 100);
  const isPhase1Complete = liquidSavings >= phase1Target;

  // Phase 2: Employer 401(k) Match (Unlocks Jan 2027)
  const isPhase2Unlocked = isPhase1Complete;
  const isPhase2Active = isPhase2Unlocked && timelinePhase === 'future';
  const isPhase2Complete = isPhase2Unlocked && matchCaptured;

  // Phase 3: The 2018 Kia Sportage Payoff Strategy
  const isPhase3Unlocked = isPhase1Complete;
  const isPhase3Active = isPhase3Unlocked && hasKiaDebt;
  const phase3Progress =
    kiaOriginal > 0
      ? Math.min(Math.max(((kiaOriginal - kiaBalance) / kiaOriginal) * 100, 0), 100)
      : isKiaPaidOff
      ? 100
      : 0;

  // Phase 4: Emergency Fund (3-Month Baseline Runway ~$10,000)
  // Unlocks once auto loan balance drops to $0
  const isPhase4Unlocked = isPhase1Complete && (isKiaPaidOff || !hasKiaDebt);
  const emergencyTarget = 10000;
  const emergencySavings = Math.max(0, Math.min(liquidSavings - phase1Target, emergencyTarget));
  const emergencyPct = Math.min((emergencySavings / emergencyTarget) * 100, 100);
  const isPhase4Complete = isPhase4Unlocked && emergencySavings >= emergencyTarget;

  // Phase 5: Tax-Advantaged Growth (Roth IRA + 30% Marginal Tax Shield)
  // Unlocks once emergency fund is 100% full
  const isPhase5Unlocked = isPhase4Complete;
  const rothIraTarget = 7000;
  const rothCurrent = Math.min(totalInvestmentAssets, rothIraTarget);
  const rothPct = Math.min((rothCurrent / rothIraTarget) * 100, 100);

  // Active Routing Destination Logic
  let activeDestination = 'Phase 1: Maryland Move-In Buffer';
  let routingAdvice = 'Route 100% of current variable hourly surplus here first.';
  let activeBadgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';

  if (isPhase1Complete) {
    if (hasKiaDebt) {
      activeDestination = 'Phase 3: 2018 Kia Sportage Payoff';
      routingAdvice = 'Dedicated: $800/month from cash flow + bonuses.';
      activeBadgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    } else if (!isPhase4Complete) {
      activeDestination = 'Phase 4: 3-Month Emergency Fund';
      routingAdvice = 'Auto loan is $0! 100% of surplus redirects to HYSA runway.';
      activeBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else {
      activeDestination = 'Phase 5: Tax-Advantaged Growth';
      routingAdvice = 'Emergency runway full! Maxing Roth IRA & scaling 401(k) 30% tax shield.';
      activeBadgeColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    }
  }

  return (
    <div className="space-y-5">
      {/* Timeline Phase Switcher */}
      <div className="flex bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-inner">
        <button
          onClick={() => setTimelinePhase('current')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            timelinePhase === 'current'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Current Phase (Now – Dec 2026)
        </button>
        <button
          onClick={() => setTimelinePhase('future')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            timelinePhase === 'future'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Rockville Move (Jan 2027+)
        </button>
      </div>

      {/* Surplus Distributor Engine Card */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-zinc-900/80 to-black/90 backdrop-blur-2xl border border-indigo-500/25 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                Surplus Distributor Engine
              </p>
              <h2 className="text-2xl font-extrabold text-white">
                {formatMoney(activeMonthlySurplus)}
                <span className="text-xs text-gray-400 font-normal"> / month surplus</span>
              </h2>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${activeBadgeColor}`}>
            Active Routing
          </span>
        </div>

        {/* Timeline Context Note */}
        <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-1">
          <p className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Target size={13} className="text-indigo-400" />
            <span>Currently Routing To: <strong>{activeDestination}</strong></span>
          </p>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            {timelinePhase === 'current'
              ? 'Operating under Variable Hourly Client Income. Cash surplus is derived dynamically from live deposits minus expenses.'
              : 'Operating under Rockville, MD Transition. Budgeted on $90,000 base salary (~$5,475/mo net) with up to $1,500 annual bonus.'}
          </p>
          <p className="text-[11px] text-emerald-400 font-medium pt-0.5">
            {routingAdvice}
          </p>
        </div>
      </div>

      {/* The 5 Waterfall Priority Tiers */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-400">
            Surplus Priority Waterfall Tiers
          </h3>
          <span className="text-[10px] text-indigo-400 font-medium">Strict Sequential Locking</span>
        </div>

        {/* TIER 1: Maryland Move-In Buffer */}
        <div
          className={`p-5 rounded-3xl backdrop-blur-2xl border transition-all ${
            isPhase1Complete
              ? 'bg-emerald-950/20 border-emerald-500/25'
              : 'bg-zinc-900/85 border-blue-500/30 shadow-lg shadow-blue-500/5'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl ${
                  isPhase1Complete
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {isPhase1Complete ? <CheckCircle2 size={22} /> : <Unlock size={22} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Phase 1 · Priority 1
                  </span>
                  {isPhase1Complete && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      100% Funded
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-white mt-1">Maryland Move-In Buffer</h4>
                <p className="text-xs text-gray-400">
                  Apartment security deposits & MVA vehicle registration for Rockville, MD move.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-white">{formatMoney(phase1Current)}</span>
              <p className="text-[10px] text-gray-500">Target: {formatMoney(phase1Target)}</p>
            </div>
          </div>

          <div className="mt-3.5 space-y-1.5">
            <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${phase1Pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${isPhase1Complete ? 'bg-emerald-400' : 'bg-blue-500'}`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>{phase1Pct.toFixed(0)}% Funded in Linked HYSA</span>
              <span>
                {isPhase1Complete
                  ? 'Ready for Jan 2027 Move'
                  : `${formatMoney(phase1Target - phase1Current)} remaining`}
              </span>
            </div>
          </div>

          {!isPhase1Complete && (
            <p className="mt-2.5 text-[11px] text-blue-300 bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
              ⚡ <strong>Active Rule:</strong> Route 100% of current variable hourly client surplus here first. All downstream tiers remain locked until this buffer is full.
            </p>
          )}
        </div>

        {/* TIER 2: Employer 401(k) Match (Unlocks Jan 2027) */}
        <div
          className={`p-5 rounded-3xl backdrop-blur-2xl border transition-all ${
            isPhase2Complete
              ? 'bg-emerald-950/20 border-emerald-500/25'
              : isPhase2Active
              ? 'bg-zinc-900/85 border-indigo-500/30'
              : 'bg-zinc-900/40 border-white/5 opacity-70'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl ${
                  isPhase2Complete
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isPhase2Active
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'bg-white/5 text-gray-500'
                }`}
              >
                {isPhase2Complete ? (
                  <CheckCircle2 size={22} />
                ) : isPhase2Active ? (
                  <Unlock size={22} />
                ) : (
                  <Lock size={22} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Phase 2 · Jan 2027
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isPhase2Complete
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isPhase2Active
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-white/5 text-gray-400'
                    }`}
                  >
                    {isPhase2Complete
                      ? '100% Match Captured'
                      : isPhase2Active
                      ? 'Unlocks Jan 2027'
                      : 'Locked'}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">Employer 401(k) Match Flag</h4>
                <p className="text-xs text-gray-400">
                  Ensure 100% of employer match is captured upon $90k salary transition.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
            Employer match represents an <strong>immediate 100% guaranteed return</strong>. This tier enforces that match contributions are activated before cash flow is aggressively routed into debt payoff.
          </p>

          {isPhase2Unlocked && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-300">
                Status: {matchCaptured ? '100% Match Active' : 'Pending Salary Transition'}
              </span>
              <button
                onClick={() => setMatchCaptured(!matchCaptured)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  matchCaptured
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {matchCaptured ? '✓ Match Confirmed' : 'Mark 100% Match Captured'}
              </button>
            </div>
          )}

          {!isPhase2Unlocked && (
            <p className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
              <Lock size={12} /> Locked until Phase 1 Maryland Buffer reaches $3,000.
            </p>
          )}
        </div>

        {/* TIER 3: The 2018 Kia Sportage Payoff Strategy (~12.5% APR) */}
        <div
          className={`p-5 rounded-3xl backdrop-blur-2xl border transition-all ${
            isKiaPaidOff
              ? 'bg-emerald-950/20 border-emerald-500/25'
              : isPhase3Active
              ? 'bg-zinc-900/85 border-amber-500/30 shadow-lg shadow-amber-500/5'
              : 'bg-zinc-900/40 border-white/5 opacity-70'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl ${
                  isKiaPaidOff
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isPhase3Active
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-white/5 text-gray-500'
                }`}
              >
                {isKiaPaidOff ? (
                  <CheckCircle2 size={22} />
                ) : isPhase3Active ? (
                  <Unlock size={22} />
                ) : (
                  <Lock size={22} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Phase 3 · Debt Acceleration
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    ~{kiaApr}% APR
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">2018 Kia Sportage Payoff</h4>
                <p className="text-xs text-gray-400">
                  Target: Dedicated $800/mo cash flow + all lump-sum bonuses.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-white">
                {isKiaPaidOff ? '$0 Balance' : formatMoney(kiaBalance)}
              </span>
              <p className="text-[10px] text-gray-500">Live Auto Loan</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3.5 space-y-1.5">
            <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${phase3Progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${isKiaPaidOff ? 'bg-emerald-400' : 'bg-amber-400'}`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>{phase3Progress.toFixed(0)}% Principal Paid Off</span>
              <span>
                {isKiaPaidOff
                  ? 'Paid in Full ✓'
                  : `${formatMoney(kiaBalance)} remaining`}
              </span>
            </div>
          </div>

          {/* Mandatory Strategy Notes & Persistent Tooltip */}
          <div className="mt-3 space-y-2">
            {/* Tooltip: Principal-Only Payments */}
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200">
              <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Payment Instruction:</strong>
                Always mark extra payments as <strong>&apos;Principal-Only&apos;</strong> with your auto lender. This bypasses future interest accrual and immediately crushes the 12.5% balance.
              </div>
            </div>

            {/* Strategic Note: Hold and pay off — do not lease */}
            <div className="flex items-center justify-between p-2.5 bg-black/40 rounded-xl border border-white/5 text-xs text-gray-300">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <ShieldCheck size={14} /> Strategic Rule:
              </span>
              <span className="font-bold text-white tracking-wide">
                &ldquo;Hold and pay off — do not lease&rdquo;
              </span>
            </div>
          </div>

          {!isPhase3Unlocked && (
            <p className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
              <Lock size={12} /> Locked until Phase 1 Maryland Buffer reaches $3,000.
            </p>
          )}
        </div>

        {/* TIER 4: Emergency Fund ($10,000 Runway in HYSA) */}
        <div
          className={`p-5 rounded-3xl backdrop-blur-2xl border transition-all ${
            isPhase4Complete
              ? 'bg-emerald-950/20 border-emerald-500/25'
              : isPhase4Unlocked
              ? 'bg-zinc-900/85 border-blue-500/30'
              : 'bg-zinc-900/40 border-white/5 opacity-70'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl ${
                  isPhase4Complete
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isPhase4Unlocked
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-500'
                }`}
              >
                {isPhase4Complete ? (
                  <CheckCircle2 size={22} />
                ) : isPhase4Unlocked ? (
                  <Unlock size={22} />
                ) : (
                  <Lock size={22} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Phase 4 · Stability
                  </span>
                  {isPhase4Complete && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Fully Funded
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-white mt-1">3-Month Emergency Fund</h4>
                <p className="text-xs text-gray-400">
                  Target: ~$10,000 baseline liquid runway in linked HYSA.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-white">{formatMoney(emergencySavings)}</span>
              <p className="text-[10px] text-gray-500">Target: {formatMoney(emergencyTarget)}</p>
            </div>
          </div>

          <div className="mt-3.5 space-y-1.5">
            <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${emergencyPct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${isPhase4Complete ? 'bg-emerald-400' : 'bg-blue-400'}`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>{emergencyPct.toFixed(0)}% Funded Runway</span>
              <span>
                {isPhase4Complete
                  ? '3-Month Reserve Secure'
                  : `${formatMoney(emergencyTarget - emergencySavings)} remaining`}
              </span>
            </div>
          </div>

          <p className="mt-2.5 text-[11px] text-gray-400 leading-relaxed">
            {isPhase4Unlocked
              ? '⚡ Auto loan balance is $0! 100% of your monthly cash flow surplus is now redirected here to establish your core emergency buffer.'
              : '🔒 Locked: Will automatically unlock and redirect monthly surplus once the 2018 Kia Sportage loan reaches $0.'}
          </p>
        </div>

        {/* TIER 5: Tax-Advantaged Growth (Roth IRA + 30% Marginal Tax Shield) */}
        <div
          className={`p-5 rounded-3xl backdrop-blur-2xl border transition-all ${
            isPhase5Unlocked
              ? 'bg-zinc-900/85 border-purple-500/30'
              : 'bg-zinc-900/40 border-white/5 opacity-70'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl ${
                  isPhase5Unlocked
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-white/5 text-gray-500'
                }`}
              >
                {isPhase5Unlocked ? <Unlock size={22} /> : <Lock size={22} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Phase 5 · Wealth Maximizer
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    ~30% Tax Shield
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">Tax-Advantaged Growth</h4>
                <p className="text-xs text-gray-400">
                  Max Roth IRA ($7k) + scale Traditional 401(k) to shield Rockville, MD taxes.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-emerald-400">{formatMoney(rothCurrent)}</span>
              <p className="text-[10px] text-gray-500">Portfolio</p>
            </div>
          </div>

          {/* Tax Shield Breakdown */}
          <div className="mt-3.5 p-3 bg-black/40 rounded-2xl border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Federal Marginal Tax Rate:</span>
              <span className="font-semibold text-white">22.0%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Maryland State Tax Rate:</span>
              <span className="font-semibold text-white">4.75%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Montgomery County (Rockville) Tax:</span>
              <span className="font-semibold text-white">3.20%</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-purple-300">Combined Marginal Tax Bracket:</span>
              <span className="text-emerald-400 text-sm">~29.95% (~30%)</span>
            </div>
          </div>

          <p className="mt-2.5 text-[11px] text-gray-400 leading-relaxed">
            Every $1,000 contributed to your Traditional 401(k) shields approximately <strong>$300 from immediate taxes</strong>. Max out your Roth IRA first for tax-free retirement compounding, then scale 401(k) contributions to lower taxable income.
          </p>

          {!isPhase5Unlocked && (
            <p className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
              <Lock size={12} /> Locked until 3-month emergency fund is fully funded ($10,000).
            </p>
          )}
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

  const handleApplyAll = () => {
    onSetAllBudgets(optimization.recommendedBudgets);
    setAppliedAll(true);
    setTimeout(() => setAppliedAll(false), 3000);
  };

  const handleApplySingle = (cat, target) => {
    onUpdateBudget(cat, target);
    setAppliedCategory((prev) => ({ ...prev, [cat]: true }));
    setTimeout(() => {
      setAppliedCategory((prev) => ({ ...prev, [cat]: false }));
    }, 2500);
  };

  const monthlySavings = optimization?.totalPotentialSavings || 0;
  const tenYearCompound = Math.round(
    monthlySavings * ((Math.pow(1 + 0.07 / 12, 120) - 1) / (0.07 / 12)),
  );

  return (
    <div className="space-y-5">
      {/* 1. Hero Savings Card */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-indigo-900/50 via-purple-900/35 to-zinc-900/90 backdrop-blur-2xl border border-indigo-500/25 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Budget Optimization
              </p>
              <h2 className="text-2xl font-extrabold text-white">
                +{formatMoney(monthlySavings)}
                <span className="text-xs text-gray-400 font-normal"> / month</span>
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
          Identified{' '}
          <strong className="text-white font-semibold">
            {optimization.suggestions.length} high-leverage opportunities
          </strong>{' '}
          to eliminate unnecessary fees, right-size discretionary categories, and boost your monthly surplus.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <p className="text-[10px] uppercase text-gray-500 font-semibold mb-0.5">Annual Potential</p>
            <p className="text-sm font-bold text-emerald-400">
              +{formatMoney(monthlySavings * 12)} / yr
            </p>
          </div>
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <p className="text-[10px] uppercase text-gray-500 font-semibold mb-0.5">10-Yr Wealth Addition</p>
            <p className="text-sm font-bold text-indigo-300">
              +{formatMoney(tenYearCompound)}
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

      {/* 2. 50 / 30 / 20 Diagnostic Meter */}
      <GlassCard
        title="50 / 30 / 20 Rule Diagnostic"
        icon={<PieChart className="text-purple-400" />}
        amount={`${optimization.budgetRatio.wants.pct}% Wants`}
      >
        <p className="text-xs text-gray-400 mb-3">
          Comparing your current spending allocation against gold-standard financial targets.
        </p>

        <div className="space-y-3">
          {/* Needs */}
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

          {/* Wants */}
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

          {/* Savings */}
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

      {/* 3. Personalized Spending Cut Candidates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-400">
            Recommended Spending Cuts ({optimization.suggestions.length})
          </h3>
          <span className="text-[10px] text-indigo-400 font-semibold">Priority Ranked</span>
        </div>

        {optimization.suggestions.length === 0 ? (
          <GlassCard title="Everything Optimized" icon={<CheckCircle2 className="text-emerald-400" />}>
            <p className="text-xs text-gray-400 py-3 text-center">
              Your spending is lean and fully aligned with your budget targets!
            </p>
          </GlassCard>
        ) : (
          optimization.suggestions.map((sug) => {
            const isApplied = budgets[sug.category] === sug.targetSpend || appliedCategory[sug.category];
            return (
              <div
                key={sug.id}
                className="p-4 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-lg space-y-3 hover:border-white/15 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        sug.impact === 'quick-win'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : sug.impact === 'high'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {sug.badge}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1.5">{sug.title}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-400">
                      +{formatMoney(sug.monthlySavings)}/mo
                    </span>
                    <p className="text-[10px] text-gray-500">+{formatMoney(sug.annualSavings)}/yr</p>
                  </div>
                </div>

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
                    <span className="text-gray-500 block text-[10px]">Monthly Cut</span>
                    <span className="font-bold text-emerald-400">-{formatMoney(sug.monthlySavings)}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">{sug.advice}</p>

                <div className="pt-1 flex gap-2">
                  <button
                    onClick={() => handleApplySingle(sug.category, sug.targetSpend)}
                    className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isApplied
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                        : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle2 size={13} /> Target Cap Applied
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

      {/* 4. Goal Accelerator Impact Card */}
      {optimization.debtAccelerationMonths ? (
        <GlassCard
          title="Debt Payoff Accelerator"
          icon={<Car className="text-red-400" />}
          amount={`-${optimization.debtAccelerationMonths} Months`}
        >
          <p className="text-xs text-gray-300 leading-relaxed">
            By applying these spending cuts and directing your{' '}
            <strong className="text-emerald-400 font-semibold">
              +{formatMoney(monthlySavings)}/mo
            </strong>{' '}
            surplus directly into debt payoff, you will be completely debt-free{' '}
            <strong className="text-white font-bold">{optimization.debtAccelerationMonths} months earlier</strong>{' '}
            and save hundreds in interest charges!
          </p>
          <button
            onClick={() => onNavigateTab?.('debt')}
            className="mt-3 w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-gray-200 flex items-center justify-center gap-1 transition-colors"
          >
            Review Debt Strategy <ArrowRight size={13} />
          </button>
        </GlassCard>
      ) : (
        <GlassCard
          title="10-Year Wealth Multiplier"
          icon={<TrendingUp className="text-emerald-400" />}
          amount={formatMoney(tenYearCompound)}
        >
          <p className="text-xs text-gray-300 leading-relaxed">
            If you channel your{' '}
            <strong className="text-emerald-400 font-semibold">
              +{formatMoney(monthlySavings)}/mo
            </strong>{' '}
            optimized savings into low-cost index funds at an average 7% annual return, it compounds into{' '}
            <strong className="text-white font-bold">{formatMoney(tenYearCompound)}</strong> in 10 years!
          </p>
          <button
            onClick={() => onNavigateTab?.('wealth')}
            className="mt-3 w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-gray-200 flex items-center justify-center gap-1 transition-colors"
          >
            View Invest & Save Waterfall <ArrowRight size={13} />
          </button>
        </GlassCard>
      )}
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


