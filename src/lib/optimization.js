/**
 * Smart Budget Optimization & Spending Cuts Engine
 * Analyzes transaction patterns, recurring overhead, and category allocations
 * to provide specific, actionable suggestions: "Cut This Out" vs "Spend Less Here",
 * tied directly to core goals: Paying off 2018 Kia Sportage, Amount in HYSA, and Investment Funds.
 */

import { formatMoney } from './store.js';

function getMatchingTransactions(entries = [], keywords = [], selectedMonth = null) {
  return entries
    .filter((e) => {
      if (e.kind === 'income' || e.kind === 'debt') return false;
      if (selectedMonth && e.date && !e.date.startsWith(selectedMonth)) return false;
      const cat = (e.category || '').toLowerCase();
      const name = (e.name || '').toLowerCase();
      return keywords.some((kw) => cat.includes(kw) || name.includes(kw));
    })
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 4);
}

// Case-insensitive & formatting-agnostic category spend resolver
function getCatSpend(categoryTotals = {}, targetKeys = []) {
  const normKeys = targetKeys.map((k) => k.toLowerCase().replace(/[\s_&]+/g, ''));
  for (const [k, val] of Object.entries(categoryTotals)) {
    const cleanK = k.toLowerCase().replace(/[\s_&]+/g, '');
    if (normKeys.some((nk) => cleanK === nk || cleanK.includes(nk) || nk.includes(cleanK))) {
      return Number(val) || 0;
    }
  }
  return 0;
}

// Find existing key in categoryTotals for updating budgets
function findMatchingCatKey(categoryTotals = {}, targetKeys = [], defaultKey = '') {
  const normKeys = targetKeys.map((k) => k.toLowerCase().replace(/[\s_&]+/g, ''));
  for (const k of Object.keys(categoryTotals)) {
    const cleanK = k.toLowerCase().replace(/[\s_&]+/g, '');
    if (normKeys.some((nk) => cleanK === nk || cleanK.includes(nk) || nk.includes(cleanK))) {
      return k;
    }
  }
  return defaultKey;
}

export function generateOptimizationInsights({
  entries = [],
  categoryTotals = {},
  totalVariable = 0,
  totalFixed = 0,
  debts = [],
  currentNet = 0,
  budgets: _budgets = {},
  selectedMonth = null,
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
  const feeTxsThisMonth = getMatchingTransactions(entries, feeKeywords, selectedMonth);
  const allFeeTxs = getMatchingTransactions(entries, feeKeywords, null);
  const monthFeeSpend =
    getCatSpend(categoryTotals, ['bank_fees', 'bank fees', 'fees', 'fee']) ||
    feeTxsThisMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const distinctFeeMonths = new Set(
    allFeeTxs.map((e) => e.date?.slice(0, 7)).filter(Boolean),
  ).size || 1;
  const totalHistoricalFees = allFeeTxs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const avgMonthlyFee = Math.round(totalHistoricalFees / Math.max(distinctFeeMonths, 1));
  const monthlyFeeRate = monthFeeSpend > 0 ? monthFeeSpend : (avgMonthlyFee > 0 ? avgMonthlyFee : 0);
  const feeCatKey = findMatchingCatKey(categoryTotals, ['bank_fees', 'bank fees', 'fees'], 'Bank Fees');

  if (monthlyFeeRate > 0) {
    const reversalNote =
      distinctFeeMonths > 1 && totalHistoricalFees > monthlyFeeRate
        ? `Call your bank to request a courtesy fee reversal for ${formatMoney(totalHistoricalFees)} (${distinctFeeMonths} months of $${monthlyFeeRate}/mo detected). Keep required minimum balances to eliminate this charge going forward.`
        : `Call your bank to request a one-time courtesy fee reversal for ${formatMoney(monthlyFeeRate)}. Keep required minimum balances or link accounts to ensure monthly fees stay at $0.`;

    suggestions.push({
      id: 'cut-fees',
      actionType: 'cut',
      actionBadge: 'CUT THIS OUT',
      title: 'Eliminate Bank & Service Charges',
      category: 'Bank Fees',
      categoryKey: feeCatKey,
      currentSpend: monthlyFeeRate,
      targetSpend: 0,
      monthlySavings: monthlyFeeRate,
      annualSavings: monthlyFeeRate * 12,
      impact: 'quick-win',
      exactAction: reversalNote,
      goalTarget: 'car',
      goalImpact: `Routes +${formatMoney(monthlyFeeRate)}/mo straight to your 2018 Kia Sportage payoff.`,
      actionLabel: 'Set Cap to $0 (Cut Out)',
      recommendedBudget: 0,
      topTransactions: feeTxsThisMonth.length > 0 ? feeTxsThisMonth : allFeeTxs.slice(0, 2),
    });
  }

  // 2. Unnecessary Outgoing Peer Transfers / Digital Cash Leakage
  const transferKeywords = ['transfer_out', 'transfer out', 'transfer', 'venmo', 'cash app', 'zelle', 'goldman'];
  const transferTxs = getMatchingTransactions(entries, transferKeywords, selectedMonth);
  const transferSpend = getCatSpend(categoryTotals, ['transfer_out', 'transfer out', 'transfer']);
  const transferCatKey = findMatchingCatKey(categoryTotals, ['transfer_out', 'transfer out', 'transfer'], 'Transfer Out');

  if (transferSpend > 50) {
    const target = Math.round(transferSpend * 0.4); // Cap to 40% (cut 60% of unnecessary transfers)
    const savings = transferSpend - target;
    suggestions.push({
      id: 'cut-transfers',
      actionType: 'cut',
      actionBadge: 'CUT THIS OUT',
      title: 'Eliminate Non-Essential Peer & Outgoing Transfers',
      category: 'Transfer Out',
      categoryKey: transferCatKey,
      currentSpend: transferSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'high',
      exactAction: `You transferred ${formatMoney(transferSpend)} out this month. Audit external transfers, pause casual spot-lending, and cap transfers at ${formatMoney(target)} to prevent cash leaking out of your bank.`,
      goalTarget: 'hysa',
      goalImpact: `Builds your HYSA Move-In Buffer +${formatMoney(savings)}/mo faster.`,
      actionLabel: `Cap Transfers at ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: transferTxs,
    });
  }

  // 3. Uncategorized / Miscellaneous ("Other") Heavy Spending
  const otherTxs = getMatchingTransactions(entries, ['other', 'purchase', 'debit'], selectedMonth);
  const otherSpend = getCatSpend(categoryTotals, ['other']);
  const otherCatKey = findMatchingCatKey(categoryTotals, ['other'], 'Other');

  if (otherSpend > 100) {
    const target = Math.round(otherSpend * 0.5); // Trim 50% of mystery debit card purchases
    const savings = otherSpend - target;
    suggestions.push({
      id: 'cut-other',
      actionType: 'cut',
      actionBadge: 'CUT THIS OUT',
      title: 'Audit & Cap Uncategorized Debit Card Purchases',
      category: 'Other',
      categoryKey: otherCatKey,
      currentSpend: otherSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'high',
      exactAction: `You have ${formatMoney(otherSpend)} in miscellaneous "Other" transactions. These are often point-of-sale impulse purchases or recurring auto-debits. Cap this bucket at ${formatMoney(target)} to retain ${formatMoney(savings)} monthly.`,
      goalTarget: 'car',
      goalImpact: `Accelerates your 2018 Kia Sportage auto loan payoff by +${formatMoney(savings)}/mo.`,
      actionLabel: `Cap Other Spend at ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: otherTxs,
    });
  }

  // ----------------------------------------------------
  // TYPE 2: "SPEND LESS HERE" (Cap & Trim Discretionary)
  // ----------------------------------------------------

  // 4. General Merchandise & Online Retail (Amazon, Walmart, Best Buy)
  const merchKeywords = ['merchandise', 'shopping', 'amazon', 'target', 'walmart', 'best buy', '7-eleven'];
  const merchTxs = getMatchingTransactions(entries, merchKeywords, selectedMonth);
  const merchSpend = getCatSpend(categoryTotals, ['general_merchandise', 'general merchandise', 'merchandise', 'shopping', 'retail']);
  const merchCatKey = findMatchingCatKey(categoryTotals, ['general_merchandise', 'general merchandise', 'shopping'], 'General Merchandise');

  if (merchSpend > 60) {
    const target = Math.round(merchSpend * 0.65); // Trim 35%
    const savings = merchSpend - target;
    suggestions.push({
      id: 'reduce-merch',
      actionType: 'reduce',
      actionBadge: 'SPEND LESS HERE',
      title: 'Cap Retail, Convenience & Electronics Purchases',
      category: 'General Merchandise',
      categoryKey: merchCatKey,
      currentSpend: merchSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'high',
      exactAction: `You spent ${formatMoney(merchSpend)} on retail goods (e.g. Best Buy, Walmart, convenience stores). Enforce a 48-hour wait rule on non-essentials and cap merchandise at ${formatMoney(target)}.`,
      goalTarget: 'funds',
      goalImpact: `Frees up +${formatMoney(savings * 12)}/yr to invest into your Robinhood portfolio & Roth IRA.`,
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: merchTxs,
    });
  }

  // 5. Food & Dining Out / Quick Bites
  const foodKeywords = ['food', 'dining', 'restaurant', 'doordash', 'uber eats', 'grubhub', 'mcdonald', 'chipotle', 'starbucks'];
  const foodTxs = getMatchingTransactions(entries, foodKeywords, selectedMonth);
  const foodSpend = getCatSpend(categoryTotals, ['food_and_drink', 'food & drink', 'dining', 'restaurants', 'food']);
  const foodCatKey = findMatchingCatKey(categoryTotals, ['food_and_drink', 'food & drink', 'dining'], 'Food & Drink');

  if (foodSpend > 30) {
    const target = Math.round(foodSpend * 0.7); // Trim 30%
    const savings = foodSpend - target;
    suggestions.push({
      id: 'reduce-food',
      actionType: 'reduce',
      actionBadge: 'SPEND LESS HERE',
      title: 'Trim Dining Out, Cafes & Food Delivery',
      category: 'Food & Drink',
      categoryKey: foodCatKey,
      currentSpend: foodSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'medium',
      exactAction: `You spent ${formatMoney(foodSpend)} on takeout, cafes, or dining. Prepare meals at home and set a target ceiling of ${formatMoney(target)} to pocket ${formatMoney(savings)} each month.`,
      goalTarget: 'car',
      goalImpact: `Routes +${formatMoney(savings)}/mo into your 12.5% Kia Sportage loan payoff.`,
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: foodTxs,
    });
  }

  // 6. Transportation, Gas & Rideshare
  const transKeywords = ['transportation', 'transit', 'gas', 'fuel', 'uber', 'lyft', 'parking', 'toll', 'chevron', 'shell'];
  const transTxs = getMatchingTransactions(entries, transKeywords, selectedMonth);
  const transSpend = getCatSpend(categoryTotals, ['transportation', 'transport', 'gas', 'transit']);
  const transCatKey = findMatchingCatKey(categoryTotals, ['transportation', 'transport'], 'Transportation');

  if (transSpend > 25) {
    const target = Math.round(transSpend * 0.75); // Trim 25%
    const savings = transSpend - target;
    suggestions.push({
      id: 'reduce-transport',
      actionType: 'reduce',
      actionBadge: 'SPEND LESS HERE',
      title: 'Optimize Local Transport & Fuel Usage',
      category: 'Transportation',
      categoryKey: transCatKey,
      currentSpend: transSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'medium',
      exactAction: `Audit ${formatMoney(transSpend)} in transit, toll, and ride fees. Bundle car trips and cap discretionary rides at ${formatMoney(target)}.`,
      goalTarget: 'hysa',
      goalImpact: `Routes +${formatMoney(savings)}/mo toward your $3,000 HYSA Move-In Buffer.`,
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: transTxs,
    });
  }

  // 7. Travel & Flights
  const travelTxs = getMatchingTransactions(entries, ['travel', 'flight', 'airline', 'hotel', 'airbnb'], selectedMonth);
  const travelSpend = getCatSpend(categoryTotals, ['travel', 'flights', 'lodging']);
  const travelCatKey = findMatchingCatKey(categoryTotals, ['travel'], 'Travel');

  if (travelSpend > 100) {
    const target = Math.round(travelSpend * 0.75);
    const savings = travelSpend - target;
    suggestions.push({
      id: 'reduce-travel',
      actionType: 'reduce',
      actionBadge: 'SPEND LESS HERE',
      title: 'Trim Travel & Flight Bookings',
      category: 'Travel',
      categoryKey: travelCatKey,
      currentSpend: travelSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'high',
      exactAction: `Book flights 3+ weeks out and set a ceiling of ${formatMoney(target)} to pocket ${formatMoney(savings)} each month.`,
      goalTarget: 'hysa',
      goalImpact: `Routes +${formatMoney(savings)}/mo toward your $3,000 HYSA Move-In Buffer.`,
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: travelTxs,
    });
  }

  // 8. General Services & Digital Subscriptions
  const servicesTxs = getMatchingTransactions(entries, ['service', 'subscription', 'software', 'cloud', 'membership'], selectedMonth);
  const servicesSpend = getCatSpend(categoryTotals, ['general_services', 'general services', 'services']);
  const servicesCatKey = findMatchingCatKey(categoryTotals, ['general_services', 'general services'], 'General Services');

  if (servicesSpend > 50) {
    const target = Math.round(servicesSpend * 0.7);
    const savings = servicesSpend - target;
    suggestions.push({
      id: 'reduce-services',
      actionType: 'reduce',
      actionBadge: 'SPEND LESS HERE',
      title: 'Cancel Unused Software & Service Memberships',
      category: 'General Services',
      categoryKey: servicesCatKey,
      currentSpend: servicesSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'medium',
      exactAction: `Audit ${formatMoney(servicesSpend)} in service overhead: cancel unused memberships and cap spend at ${formatMoney(target)}.`,
      goalTarget: 'car',
      goalImpact: `Routes +${formatMoney(savings)}/mo into paying down the 12.5% Kia loan.`,
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
      topTransactions: servicesTxs,
    });
  }

  // 9. Entertainment & Media Streaming
  const entTxs = getMatchingTransactions(entries, ['entertainment', 'streaming', 'netflix', 'spotify', 'movie', 'games'], selectedMonth);
  const entSpend = getCatSpend(categoryTotals, ['entertainment', 'streaming', 'media']);
  const entCatKey = findMatchingCatKey(categoryTotals, ['entertainment'], 'Entertainment');

  if (entSpend > 15) {
    const target = Math.round(entSpend * 0.6);
    const savings = entSpend - target;
    suggestions.push({
      id: 'cut-entertainment',
      actionType: 'reduce',
      actionBadge: 'SPEND LESS HERE',
      title: 'Rotate Streaming & Entertainment',
      category: 'Entertainment',
      categoryKey: entCatKey,
      currentSpend: entSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'quick-win',
      exactAction: `Rotate streaming services month-to-month instead of paying simultaneously. Cap spend at ${formatMoney(target)}.`,
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
        cat.toLowerCase().includes(s.category.toLowerCase()) ||
        s.category.toLowerCase().replace(/[\s_&]+/g, '') === cat.toLowerCase().replace(/[\s_&]+/g, ''),
    );
    if (matchedSuggestion) {
      recommendedBudgets[cat] = matchedSuggestion.targetSpend;
    } else {
      recommendedBudgets[cat] = Math.max(Math.round(currentAmount * 0.8), 25);
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
  if (monthlyFeeRate > 0) healthScore -= 10;
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
