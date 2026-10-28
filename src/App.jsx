import React, { useMemo, useState } from 'react';
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
} from 'lucide-react';
import {
  useFinanceData,
  debtBalance,
  monthsToPayoff,
  formatMoney,
  currentMonthKey,
} from './lib/store.js';
import AddEntrySheet from './components/AddEntrySheet.jsx';

const springAnim = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export default function PersonalFinanceTracker() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [includeBonus, setIncludeBonus] = useState(false);
  const [sheet, setSheet] = useState({ isOpen: false, autoListen: false });

  const { entries, budgets, addEntry, removeEntry } = useFinanceData();

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
    // Income
    const monthlyIncomes = entries.filter((e) => e.kind === 'income' && e.frequency === 'monthly');
    const base = monthlyIncomes
      .filter((e) => !e.optional)
      .reduce((sum, e) => sum + e.amount, 0);
    const bonus = monthlyIncomes
      .filter((e) => e.optional)
      .reduce((sum, e) => sum + e.amount, 0);

    const net = includeBonus ? base + bonus : base;

    // Fixed overhead (recurring monthly expenses)
    const fixed = entries.filter((e) => e.kind === 'expense' && e.frequency === 'monthly');
    const fixedSum = fixed.reduce((sum, e) => sum + e.amount, 0);

    // Variable expenses (one-time expenses this month)
    const thisMonth = currentMonthKey();
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
          <button
            onClick={() => openAdd(false)}
            aria-label="Add income or entry"
            className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg"
          >
            <DollarSign className="text-green-400" size={24} />
          </button>
        </motion.header>

        {/* Tab Navigation (iOS Segmented Control Style) */}
        <div className="flex bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-inner overflow-x-auto no-scrollbar">
          {['dashboard', 'subscriptions', 'debt', 'wealth'].map((tab) => (
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
                {tab === 'wealth' ? 'Invest & Save' : tab}
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
                onDelete={removeEntry}
                onAdd={() => openAdd(false)}
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

function DashboardTab({
  totalVariable,
  categoryTotals,
  budgets,
  cashSurplus,
  debtSplit,
  savingsSplit,
  entries,
  onDelete,
  onAdd,
}) {
  // Combine all categories that either have a budget or have spending
  const allCategories = Array.from(
    new Set([...Object.keys(budgets), ...Object.keys(categoryTotals)]),
  );

  // Recent entries (excluding seed debts themselves, showing transactions)
  const recentTransactions = entries
    .filter((e) => e.kind !== 'debt')
    .slice(0, 6);

  return (
    <div className="space-y-5">
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
              const color =
                cat === 'Groceries'
                  ? 'bg-blue-400'
                  : cat === 'Dining'
                  ? 'bg-purple-400'
                  : cat === 'Gas'
                  ? 'bg-emerald-400'
                  : 'bg-amber-400';
              return (
                <ProgressBar
                  key={cat}
                  label={cat}
                  current={spent}
                  max={max}
                  color={color}
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
                      {item.kind === 'payment' ? 'Debt Pay' : item.category || item.kind}
                    </span>
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

function WealthTab({ debts, entries }) {
  const kiaDebt = debts.find((d) => d.name.toLowerCase().includes('kia')) || debts[0];
  const kiaRemaining = kiaDebt ? debtBalance(kiaDebt, entries) : 0;

  return (
    <div className="space-y-3">
      <GlassCard
        title="Savings & Investments"
        icon={<PiggyBank className="text-green-400" />}
        amount="Waterfall"
      >
        <p className="text-xs text-gray-400 mb-4">Capital is automatically routed to the highest priority active tier.</p>
        <div className="space-y-3">
          <WaterfallItem step="1" title="MD Move-in Buffer" target="$3,000" current="$1,200" status="active" />
          <WaterfallItem step="2" title="Employer 401(k) Match" target="Max Match" current="Active" status="active" />
          <WaterfallItem
            step="3"
            title={kiaDebt ? `${kiaDebt.name} Payoff` : 'Debt Payoff'}
            target={kiaDebt ? formatMoney(kiaDebt.original || kiaDebt.balance) : '$0'}
            current={kiaDebt ? `${formatMoney(kiaRemaining)} Left` : 'Done'}
            status={kiaRemaining > 0 ? 'active' : 'completed'}
          />
          <WaterfallItem step="4" title="Emergency HYSA" target="$10,000" current="$0" status="locked" />
          <WaterfallItem step="5" title="Roth IRA" target="$7,000" current="$0" status="locked" />
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

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-200">
          ${Math.round(current).toLocaleString()} / ${Math.round(max).toLocaleString()}
        </span>
      </div>
      <div className="h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, delay: 0.1, type: 'spring', bounce: 0.4 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function WaterfallItem({ step, title, target, current, status }) {
  const isActive = status === 'active';
  const isCompleted = status === 'completed';

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-2xl border flex items-center space-x-4 backdrop-blur-xl transition-all ${
        isActive
          ? 'bg-white/15 border-white/30 shadow-lg'
          : isCompleted
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-black/20 border-white/5 opacity-50 grayscale'
      }`}
    >
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ${
          isActive
            ? 'bg-white text-black'
            : isCompleted
            ? 'bg-emerald-400 text-black'
            : 'bg-white/10 text-gray-500'
        }`}
      >
        {step}
      </div>
      <div className="flex-1">
        <h3 className={`font-medium tracking-tight ${isActive || isCompleted ? 'text-white' : 'text-gray-400'}`}>
          {title}
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {current} of {target}
        </p>
      </div>
      <TrendingUp
        size={18}
        className={isActive ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-gray-600'}
      />
    </motion.div>
  );
}
