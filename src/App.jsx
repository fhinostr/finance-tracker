import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Car, TrendingUp, CreditCard, ChevronRight, PieChart, Repeat, DollarSign, PiggyBank } from 'lucide-react';

const springAnim = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export default function PersonalFinanceTracker() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [includeBonus, setIncludeBonus] = useState(false);

  const baseNetIncome = 5475;
  const bonusNet = 980;
  const currentNet = includeBonus ? baseNetIncome + bonusNet : baseNetIncome;

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden font-sans selection:bg-blue-500/30 p-4 sm:p-8">
      {/* Ambient Liquid Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full mix-blend-screen filter blur-[120px] opacity-70 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full mix-blend-screen filter blur-[120px] opacity-70 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col space-y-6">
        
        {/* Header - Income Tracking */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-start pt-4"
        >
          <div>
            <p className="text-gray-400 text-sm font-medium tracking-wide uppercase mb-1">Monthly Net Income</p>
            <h1 className="text-5xl font-semibold tracking-tight">
              ${currentNet.toLocaleString()}<span className="text-2xl text-gray-500">.00</span>
            </h1>
            <button 
              onClick={() => setIncludeBonus(!includeBonus)}
              className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${includeBonus ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-gray-400'}`}
            >
              {includeBonus ? '+ $980 Net Bonus Applied' : 'Include Performance Bonus'}
            </button>
          </div>
          <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
            <DollarSign className="text-green-400" size={24} />
          </div>
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
            className="flex-1 pb-12"
          >
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'subscriptions' && <SubscriptionsTab />}
            {activeTab === 'debt' && <DebtTab />}
            {activeTab === 'wealth' && <WealthTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- TABS ---

function DashboardTab() {
  return (
    <div className="space-y-5">
      <GlassCard title="Variable Expenses" icon={<CreditCard className="text-blue-400" />} amount="$335">
        <ProgressBar label="Bulk Clean Prep (Costco/Walmart)" current={185} max={185} color="bg-blue-400" />
        <ProgressBar label="Dining Out (CAVA, Chipotle)" current={65} max={150} color="bg-purple-400" />
        <ProgressBar label="Gasoline (1,000 miles)" current={146} max={146} color="bg-emerald-400" />
      </GlassCard>

      <GlassCard title="Cash Flow Surplus" icon={<PieChart className="text-green-400" />} amount="$2,275">
        <p className="text-sm text-gray-400 mb-3">Available monthly for debt acceleration and investments.</p>
        <div className="flex space-x-2">
          <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/5">
            <p className="text-xs text-gray-500 mb-1">To Debt</p>
            <p className="text-lg font-semibold text-red-400">$800</p>
          </div>
          <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/5">
            <p className="text-xs text-gray-500 mb-1">To Savings</p>
            <p className="text-lg font-semibold text-green-400">$1,475</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function SubscriptionsTab() {
  return (
    <div className="space-y-5">
      <GlassCard title="Fixed Overhead" icon={<Repeat className="text-orange-400" />} amount="$2,388">
        <div className="space-y-3 mt-4">
          <SubscriptionItem name="Rent (Maryland)" price="$2,000" date="1st of Month" />
          <SubscriptionItem name="Utilities & Internet" price="$220" date="Varies" />
          <SubscriptionItem name="Auto Insurance" price="$160" date="15th of Month" />
          <SubscriptionItem name="Gemini Advanced" price="$8" date="Auto-renews" />
        </div>
      </GlassCard>
    </div>
  );
}

function DebtTab() {
  return (
    <GlassCard title="2018 Kia Sportage" icon={<Car className="text-red-400" />} amount="$9,000 Left">
      <div className="space-y-5 mt-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Target Payoff Date</span>
          <span className="font-medium text-white">12 - 14 Months</span>
        </div>
        
        <ProgressBar label="Principal Progress" current={3500} max={12500} color="bg-red-400" />
        
        <div className="p-4 bg-black/30 rounded-xl border border-white/5 flex flex-col space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">Scheduled Minimum</p>
            <p className="font-medium text-white">$230.00</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">Principal-Only Extra</p>
            <p className="font-medium text-green-400">+$570.00</p>
          </div>
          <div className="h-px w-full bg-white/10" />
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-gray-200">Total Monthly Allocation</p>
            <p className="text-lg font-bold text-white">$800.00</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function WealthTab() {
  return (
    <div className="space-y-3">
      <GlassCard title="Savings & Investments" icon={<PiggyBank className="text-green-400" />} amount="Waterfall">
        <p className="text-xs text-gray-400 mb-4">Capital is automatically routed to the highest priority active tier.</p>
        <div className="space-y-3">
          <WaterfallItem step="1" title="MD Move-in Buffer" target="$3,000" current="$1,200" status="active" />
          <WaterfallItem step="2" title="Employer 401(k) Match" target="Max Match" current="Active" status="active" />
          <WaterfallItem step="3" title="Kia Payoff" target="$9,000" current="$0" status="locked" />
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
          <div className="p-2 bg-white/10 rounded-2xl shadow-inner border border-white/5">
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
        </div>
        <span className="text-xl font-bold">{amount}</span>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </motion.div>
  );
}

function ProgressBar({ label, current, max, color = "bg-white" }) {
  const percentage = Math.min((current / max) * 100, 100);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-200">${current} / ${max}</span>
      </div>
      <div className="h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, delay: 0.1, type: "spring", bounce: 0.4 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function SubscriptionItem({ name, price, date }) {
  return (
    <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
      <div>
        <p className="text-sm font-medium text-gray-200">{name}</p>
        <p className="text-xs text-gray-500">{date}</p>
      </div>
      <p className="text-sm font-semibold text-white">{price}</p>
    </div>
  );
}

function WaterfallItem({ step, title, target, current, status }) {
  const isActive = status === 'active';
  
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-2xl border flex items-center space-x-4 backdrop-blur-xl transition-all ${
        isActive 
          ? 'bg-white/15 border-white/30 shadow-lg' 
          : 'bg-black/20 border-white/5 opacity-50 grayscale'
      }`}
    >
      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ${
        isActive ? 'bg-white text-black' : 'bg-white/10 text-gray-500'
      }`}>
        {step}
      </div>
      <div className="flex-1">
        <h3 className={`font-medium tracking-tight ${isActive ? 'text-white' : 'text-gray-400'}`}>{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{current} of {target}</p>
      </div>
      <TrendingUp size={18} className={isActive ? 'text-blue-400' : 'text-gray-600'} />
    </motion.div>
  );
}
