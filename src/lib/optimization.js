/**
 * Smart Budget Optimization & Spending Cuts Engine
 * Analyzes transaction patterns, recurring overhead, and category allocations
 * to provide specific, actionable suggestions: "Cut This Out" vs "Spend Less Here",
 * tied directly to core goals: Paying off 2018 Kia Sportage, Amount in HYSA, and Investment Funds.
 */

import { formatMoney } from './store.js';

function getMatchingTransactions(entries = [], keywords = []) {
  return entries
    .filter((e) => {
      if (e.kind === 'income') return false;
      const cat = (e.category || '').toLowerCase();
      const name = (e.name || '').toLowerCase();
      return keywords.some((kw) => cat.includes(kw) || name.includes(kw));
    })
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 4);
}

export function generateOptimizationInsights({
  entries = [],
  categoryTotals = {},
  totalVariable = 0,
  totalFixed = 0,
  debts = [],
  currentNet = 0,
  budgets: _budgets = {},
}) {
  const suggestions = [];
  const recommendedBudgets = {};

  // Find 2018 Kia Sportage debt
  const kiaDebt = debts.find((d) => {
    const name = (d.name || '').toLowerCase();
    return (
      name.includes('kia') ||
      name.includes('sportage') ||
      name.includes('auto') ||
      name.includes('car')
    );
  }) || debts.find((d) => d.kind === 'debt');
  const kiaBalance = kiaDebt ? Number(kiaDebt.balance) || 0 : 0;

  // ----------------------------------------------------
  // TYPE 1: "CUT THIS OUT" (100% Elimination Candidates)
  // ----------------------------------------------------

  // 1. Bank & Service Fees (100% Avoidable Waste)
  const feeKeywords = ['fee', 'overdraft', 'atm fee', 'service charge', 'bank fee', 'late fee'];
  const feeTxs = getMatchingTransactions(entries, feeKeywords);
  const totalFees = feeTxs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) ||
    (categoryTotals['Bank_Fees'] || categoryTotals['Bank Fees'] || 0);

  if (totalFees > 0) {
    suggestions.push({
      id: 'cut-fees',
      actionType: 'cut',
      actionBadge: 'CUT THIS OUT',
      title: 'Eliminate Bank & Service Charges',
      category: 'Bank Fees',
      categoryKey: 'Bank_Fees',
      currentSpend: totalFees,
      targetSpend: 0,
      monthlySavings: totalFees,
      annualSavings: totalFees * 12,
      impact: 'quick-win',
      exactAction: `Call your bank to request a one-time courtesy fee reversal for ${formatMoney(totalFees)}. Keep minimum balances or link accounts to ensure fees stay at $0.`,
      goalTarget: 'car',
      goalImpact: `Routes +${formatMoney(totalFees)}/mo straight to your 2018 Kia Sportage payoff.`,
      actionLabel: 'Set Cap to $0 (Cut Out)',
      recommendedBudget: 0,
      topTransactions: feeTxs,
    });
  }

  // 2. Unnecessary Recurring Transfers / Digital Leakage
  const transferKeywords = ['transfer_out', 'transfer out', 'transfer', 'venmo', 'cash app', 'zelle'];
  const transferTxs = getMatchingTransactions(entries, transferKeywords);
  const transferSpend = categoryTotals['Transfer_Out'] || categoryTotals['Transfer Out'] || 0;

  if (transferSpend > 50) {
    const target = Math.round(transferSpend * 0.4);
    const savings = transferSpend - target;
    suggestions.push({
      id: 'cut-transfers',
      actionType: 'cut',
      actionBadge: 'CUT THIS OUT',
      title: 'Review Non-Essential Peer Transfers',
      category: 'Transfer Out',
      categoryKey: 'Transfer_Out',
      currentSpend: transferSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'high',
      exactAction: `Audit ${formatMoney(transferSpend)} in outgoing transfers. Eliminate casual spot-lending and non-essential peer pay outs to keep cash in your account.`,
      goalTarget: 'hysa',
      goalImpact: `Builds your HYSA Move-In Buffer +${formatMoney(savings)}/mo faster.`,
      actionLabel: `Cap Transfers at ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: transferTxs,
    });
  }

  // ----------------------------------------------------
  // TYPE 2: "SPEND LESS HERE" (Cap & Trim Discretionary)
  // ----------------------------------------------------

  // 3. Travel & Transportation Spending
  const travelTxs = getMatchingTransactions(entries, ['travel', 'flight', 'airline', 'hotel', 'airbnb']);
  const travelSpend = categoryTotals['Travel'] || 0;

  if (travelSpend > 150) {
    const target = Math.round(travelSpend * 0.75); // Cut 25%
    const savings = travelSpend - target;
    suggestions.push({
      id: 'reduce-travel',
      actionType: 'reduce',
      actionBadge: 'SPEND LESS HERE',
      title: 'Trim Travel & Flight Bookings',
      category: 'Travel',
      categoryKey: 'Travel',
      currentSpend: travelSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'high',
      exactAction: `Spend less on flexible travel: book flights 3+ weeks out and set a hard ceiling of ${formatMoney(target)} to pocket ${formatMoney(savings)} each month.`,
      goalTarget: 'hysa',
      goalImpact: `Routes +${formatMoney(savings)}/mo toward your $3,000 HYSA Move-In Buffer.`,
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: travelTxs,
    });
  }

  // 4. Food & Drink / Takeout Optimization
  const foodTxs = getMatchingTransactions(entries, ['food', 'dining', 'restaurant', 'doordash', 'uber eats', 'grubhub']);
  const foodSpend = categoryTotals['Food_and_Drink'] || categoryTotals['Food & Drink'] || 0;

  if (foodSpend > 75) {
    const target = Math.round(foodSpend * 0.72); // Cut ~28%
    const savings = foodSpend - target;
    suggestions.push({
      id: 'reduce-food',
      actionType: 'reduce',
      actionBadge: 'SPEND LESS HERE',
      title: 'Trim Dining Out & Food Delivery',
      category: 'Food & Drink',
      categoryKey: 'Food_and_Drink',
      currentSpend: foodSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'high',
      exactAction: `Spend less on restaurant delivery markups and dining: cook 2 additional meals at home per week and cap takeout at ${formatMoney(target)}.`,
      goalTarget: 'car',
      goalImpact: `Accelerates your 2018 Kia Sportage auto loan payoff by +${formatMoney(savings)}/mo.`,
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: foodTxs,
    });
  }

  // 5. General Merchandise & Online Shopping
  const merchTxs = getMatchingTransactions(entries, ['merchandise', 'shopping', 'amazon', 'target', 'walmart']);
  const merchSpend = categoryTotals['General_Merchandise'] || categoryTotals['General Merchandise'] || 0;

  if (merchSpend > 100) {
    const target = Math.round(merchSpend * 0.75); // Cut 25%
    const savings = merchSpend - target;
    suggestions.push({
      id: 'reduce-merch',
      actionType: 'reduce',
      actionBadge: 'SPEND LESS HERE',
      title: 'Cap Discretionary Retail & Online Purchases',
      category: 'General Merchandise',
      categoryKey: 'General_Merchandise',
      currentSpend: merchSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'high',
      exactAction: `Enforce the 48-Hour Cart Rule on Amazon & retail: wait two days before checkout to eliminate impulse buys and cap spend at ${formatMoney(target)}.`,
      goalTarget: 'funds',
      goalImpact: `Frees up +${formatMoney(savings * 12)}/yr to invest into your Robinhood portfolio & Roth IRA.`,
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: merchTxs,
    });
  }

  // 6. General Services & Subscriptions
  const servicesTxs = getMatchingTransactions(entries, ['service', 'subscription', 'software', 'cloud', 'membership']);
  const servicesSpend = categoryTotals['General_Services'] || categoryTotals['General Services'] || 0;

  if (servicesSpend > 100) {
    const target = Math.round(servicesSpend * 0.75); // Cut 25%
    const savings = servicesSpend - target;
    suggestions.push({
      id: 'reduce-services',
      actionType: 'reduce',
      actionBadge: 'SPEND LESS HERE',
      title: 'Cancel Unused Software & Service Memberships',
      category: 'General Services',
      categoryKey: 'General_Services',
      currentSpend: servicesSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'medium',
      exactAction: `Audit your ${formatMoney(servicesSpend)} digital overhead: cancel recurring memberships or subscriptions not used in 30 days and cap spend at ${formatMoney(target)}.`,
      goalTarget: 'car',
      goalImpact: `Routes +${formatMoney(savings)}/mo into paying down the 12.5% APR Kia Sportage loan.`,
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: servicesTxs,
    });
  }

  // 7. Entertainment & Media Streaming
  const entTxs = getMatchingTransactions(entries, ['entertainment', 'streaming', 'netflix', 'spotify', 'movie', 'games']);
  const entSpend = categoryTotals['Entertainment'] || 0;

  if (entSpend > 25) {
    const target = Math.round(entSpend * 0.6); // Cut 40%
    const savings = entSpend - target;
    suggestions.push({
      id: 'cut-entertainment',
      actionType: 'reduce',
      actionBadge: 'SPEND LESS HERE',
      title: 'Rotate Streaming & Entertainment',
      category: 'Entertainment',
      categoryKey: 'Entertainment',
      currentSpend: entSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'quick-win',
      exactAction: `Rotate streaming services month-to-month instead of paying simultaneously for multiple platforms. Cap spend at ${formatMoney(target)}.`,
      goalTarget: 'funds',
      goalImpact: `Adds +${formatMoney(savings)}/mo into tax-advantaged compound growth.`,
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: entTxs,
    });
  }

  // Calculate Total Potential Monthly & Annual Savings
  const totalPotentialSavings = suggestions.reduce((sum, s) => sum + s.monthlySavings, 0);

  // Split into Cut Out vs Spend Less
  const cutOutSuggestions = suggestions.filter((s) => s.actionType === 'cut');
  const spendLessSuggestions = suggestions.filter((s) => s.actionType === 'reduce');

  // Generate recommended budget ceilings across all active categories
  Object.entries(categoryTotals).forEach(([cat, currentAmount]) => {
    const matchedSuggestion = suggestions.find(
      (s) =>
        s.categoryKey === cat ||
        s.category.toLowerCase() === cat.toLowerCase() ||
        cat.toLowerCase().includes(s.category.toLowerCase()),
    );
    if (matchedSuggestion) {
      recommendedBudgets[cat] = matchedSuggestion.targetSpend;
    } else {
      recommendedBudgets[cat] = Math.max(Math.round(currentAmount * 0.95), 25);
    }
  });

  // Goal Acceleration Calculations:
  // 1. Car Payoff Impact (Kia Sportage 12.5% APR)
  const currentMonthlyCarPmt = 800;
  const carPayoffMonthsCurrent = kiaBalance > 0 ? Math.ceil(kiaBalance / currentMonthlyCarPmt) : 0;
  const carPayoffMonthsAccelerated =
    kiaBalance > 0
      ? Math.ceil(kiaBalance / (currentMonthlyCarPmt + totalPotentialSavings))
      : 0;
  const carMonthsSaved = Math.max(carPayoffMonthsCurrent - carPayoffMonthsAccelerated, 1);
  const carInterestSaved = Math.round(
    kiaBalance * 0.125 * (carMonthsSaved / 12),
  );

  // 2. HYSA Runway Impact ($3k buffer + $10k emergency fund)
  const hysaTarget = 3000;
  const hysaWeeksFaster = totalPotentialSavings > 0
    ? Math.round((hysaTarget / (totalPotentialSavings / 4)))
    : 0;

  // 3. Investment Wealth Compounding (10 years at 8% annual return)
  const tenYearCompound = Math.round(
    totalPotentialSavings * ((Math.pow(1 + 0.08 / 12, 120) - 1) / (0.08 / 12)),
  );

  // 50 / 30 / 20 Budget Rule Diagnostics
  const effectiveIncome = Math.max(currentNet, totalFixed + totalVariable);
  const needsSpend = totalFixed;
  const wantsSpend = totalVariable;
  const surplus = Math.max(effectiveIncome - needsSpend - wantsSpend, 0);

  const needsPct = effectiveIncome > 0 ? Math.round((needsSpend / effectiveIncome) * 100) : 0;
  const wantsPct = effectiveIncome > 0 ? Math.round((wantsSpend / effectiveIncome) * 100) : 0;
  const savingsPct = effectiveIncome > 0 ? Math.round((surplus / effectiveIncome) * 100) : 0;

  let healthScore = 80;
  if (wantsPct > 40) healthScore -= 15;
  else if (wantsPct <= 30) healthScore += 10;
  if (needsPct > 60) healthScore -= 15;
  if (totalFees > 0) healthScore -= 10;
  if (totalPotentialSavings > 250) healthScore -= 5;
  healthScore = Math.min(Math.max(healthScore, 40), 98);

  return {
    healthScore,
    suggestions,
    cutOutSuggestions,
    spendLessSuggestions,
    totalPotentialSavings,
    recommendedBudgets,
    budgetRatio: {
      needs: { pct: needsPct, target: 50, amount: needsSpend },
      wants: { pct: wantsPct, target: 30, amount: wantsSpend },
      savings: { pct: savingsPct, target: 20, amount: surplus },
    },
    goalImpacts: {
      car: {
        monthsSaved: carMonthsSaved,
        interestSaved: carInterestSaved,
        acceleratedMonths: carPayoffMonthsAccelerated,
      },
      hysa: {
        weeksFaster: Math.min(hysaWeeksFaster, 24),
      },
      funds: {
        tenYearTotal: tenYearCompound,
      },
    },
    debtAccelerationMonths: carMonthsSaved,
  };
}
