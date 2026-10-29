/**
 * Smart Budget Optimization & Spending Cuts Engine
 * Analyzes transaction patterns, recurring overhead, and category allocations
 * to provide high-impact, realistic suggestions to cut spending and grow surplus.
 */

import { formatMoney } from './store.js';

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

  // 1. Fee & Waste Elimination (Quick Wins)
  const feeEntries = entries.filter((e) => {
    const name = (e.name || '').toLowerCase();
    const cat = (e.category || '').toLowerCase();
    return (
      cat.includes('fee') ||
      name.includes('fee') ||
      name.includes('overdraft') ||
      name.includes('atm fee') ||
      name.includes('interest charge') ||
      name.includes('late fee')
    );
  });
  const totalFees = feeEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  if (totalFees > 0) {
    suggestions.push({
      id: 'cut-fees',
      title: 'Eliminate Bank & Service Fees',
      category: 'Bank Fees',
      currentSpend: totalFees,
      targetSpend: 0,
      monthlySavings: totalFees,
      annualSavings: totalFees * 12,
      impact: 'quick-win',
      badge: '100% Avoidable',
      advice:
        'Call your bank to request a one-time courtesy fee reversal. Consider moving funds or linking accounts to avoid maintenance or overdraft charges.',
      actionLabel: 'Target: $0 / mo',
      recommendedBudget: 0,
    });
  }

  // 2. Food & Drink / Dining Out Optimization
  const foodSpend = Object.entries(categoryTotals).reduce((sum, [cat, amt]) => {
    const c = cat.toLowerCase();
    return c.includes('food') || c.includes('dining') || c.includes('restaurant') ? sum + amt : sum;
  }, 0);

  if (foodSpend > 80) {
    const target = Math.round(foodSpend * 0.75); // 25% cut
    const savings = foodSpend - target;
    suggestions.push({
      id: 'cut-dining',
      title: 'Trim Dining & Takeout by 25%',
      category: 'Food & Drink',
      currentSpend: foodSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'high',
      badge: 'High Impact',
      advice: `Cooking just 2 more meals at home per week and reducing delivery markups/tips will save roughly ${formatMoney(savings)} each month without giving up weekend social dining.`,
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
    });
  }

  // 3. General Merchandise & Discretionary Retail Shopping
  const shoppingSpend = Object.entries(categoryTotals).reduce((sum, [cat, amt]) => {
    const c = cat.toLowerCase();
    return c.includes('merchandise') || c.includes('shopping') || c.includes('retail') ? sum + amt : sum;
  }, 0);

  if (shoppingSpend > 120) {
    const target = Math.round(shoppingSpend * 0.8); // 20% cut
    const savings = shoppingSpend - target;
    suggestions.push({
      id: 'cut-shopping',
      title: 'Adopt the 48-Hour Cart Rule',
      category: 'General Merchandise',
      currentSpend: shoppingSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'medium',
      badge: 'Discretionary',
      advice:
        'Leave non-essential online carts unpurchased for 48 hours. Studies show over 35% of impulse buys are abandoned once the immediate urge passes.',
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
    });
  }

  // 4. General Services & Digital Overhead
  const servicesSpend = Object.entries(categoryTotals).reduce((sum, [cat, amt]) => {
    const c = cat.toLowerCase();
    return c.includes('service') && !c.includes('fee') ? sum + amt : sum;
  }, 0);

  if (servicesSpend > 150) {
    const target = Math.round(servicesSpend * 0.85); // 15% cut
    const savings = servicesSpend - target;
    suggestions.push({
      id: 'cut-services',
      title: 'Audit General Service Subscriptions',
      category: 'General Services',
      currentSpend: servicesSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'medium',
      badge: 'Recurring Audit',
      advice:
        'Review recurring software, memberships, or service add-ons. Renegotiate cable/internet promo rates or cancel services not used in the past 30 days.',
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
    });
  }

  // 5. Entertainment & Media
  const entSpend = Object.entries(categoryTotals).reduce((sum, [cat, amt]) => {
    const c = cat.toLowerCase();
    return c.includes('entertainment') || c.includes('streaming') ? sum + amt : sum;
  }, 0);

  if (entSpend > 50) {
    const target = Math.round(entSpend * 0.7);
    const savings = entSpend - target;
    suggestions.push({
      id: 'cut-entertainment',
      title: 'Rotate Streaming Services',
      category: 'Entertainment',
      currentSpend: entSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'quick-win',
      badge: 'Streaming',
      advice:
        'Instead of maintaining 4–5 simultaneous streaming services, rotate them month-to-month based on the shows you are currently watching.',
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
    });
  }

  // 6. Travel & Transportation
  const travelSpend = Object.entries(categoryTotals).reduce((sum, [cat, amt]) => {
    const c = cat.toLowerCase();
    return c.includes('travel') || c.includes('transportation') ? sum + amt : sum;
  }, 0);

  if (travelSpend > 250) {
    const target = Math.round(travelSpend * 0.85);
    const savings = travelSpend - target;
    suggestions.push({
      id: 'cut-travel',
      title: 'Consolidate Rideshare & Transit',
      category: 'Travel & Transport',
      currentSpend: travelSpend,
      targetSpend: target,
      monthlySavings: savings,
      annualSavings: savings * 12,
      impact: 'medium',
      badge: 'Logistics',
      advice:
        'Rideshare surges and frequent short trips accumulate fast. Group errands and plan departures 10 minutes earlier to avoid peak pricing.',
      actionLabel: `Set Cap to ${formatMoney(target)}`,
      recommendedBudget: target,
    });
  }

  // Calculate Total Potential Monthly & Annual Savings
  const totalPotentialSavings = suggestions.reduce((sum, s) => sum + s.monthlySavings, 0);

  // Generate recommended budget ceilings across all active categories
  Object.entries(categoryTotals).forEach(([cat, currentAmount]) => {
    const matchedSuggestion = suggestions.find(
      (s) =>
        s.category.toLowerCase() === cat.toLowerCase() ||
        cat.toLowerCase().includes(s.category.toLowerCase()),
    );
    if (matchedSuggestion) {
      recommendedBudgets[cat] = matchedSuggestion.targetSpend;
    } else {
      // Conservative 5-10% buffer
      recommendedBudgets[cat] = Math.max(Math.round(currentAmount * 0.95), 25);
    }
  });

  // 50 / 30 / 20 Budget Rule Diagnostics
  const effectiveIncome = Math.max(currentNet, totalFixed + totalVariable);
  const needsSpend = totalFixed; // Rent, bills, loans
  const wantsSpend = totalVariable; // Dining, shopping, discretionary
  const surplus = Math.max(effectiveIncome - needsSpend - wantsSpend, 0);

  const needsPct = effectiveIncome > 0 ? Math.round((needsSpend / effectiveIncome) * 100) : 0;
  const wantsPct = effectiveIncome > 0 ? Math.round((wantsSpend / effectiveIncome) * 100) : 0;
  const savingsPct = effectiveIncome > 0 ? Math.round((surplus / effectiveIncome) * 100) : 0;

  // Calculate Health Score (0 - 100)
  let healthScore = 80;
  if (wantsPct > 40) healthScore -= 15;
  else if (wantsPct <= 30) healthScore += 10;

  if (needsPct > 60) healthScore -= 15;
  else if (needsPct <= 50) healthScore += 5;

  if (totalFees > 0) healthScore -= 10;
  if (totalPotentialSavings > 200) healthScore -= 5;
  healthScore = Math.min(Math.max(healthScore, 35), 98);

  // Debt acceleration simulation
  let debtAccelerationMonths = null;
  const totalDebtBalance = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
  if (totalDebtBalance > 0 && totalPotentialSavings > 0) {
    const currentMonthlyDebt = debts.reduce(
      (sum, d) => sum + (d.minPayment || 0) + (d.extraPayment || 0),
      0,
    );
    if (currentMonthlyDebt > 0) {
      const normalMonths = Math.ceil(totalDebtBalance / currentMonthlyDebt);
      const acceleratedMonths = Math.ceil(
        totalDebtBalance / (currentMonthlyDebt + totalPotentialSavings),
      );
      debtAccelerationMonths = Math.max(normalMonths - acceleratedMonths, 1);
    }
  }

  return {
    healthScore,
    suggestions,
    totalPotentialSavings,
    recommendedBudgets,
    budgetRatio: {
      needs: { pct: needsPct, target: 50, amount: needsSpend },
      wants: { pct: wantsPct, target: 30, amount: wantsSpend },
      savings: { pct: savingsPct, target: 20, amount: surplus },
    },
    debtAccelerationMonths,
  };
}
