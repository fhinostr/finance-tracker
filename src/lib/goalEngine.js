import { formatMoney } from './store.js';

export const STORAGE_KEY_GAME_PROFILE = 'finance-tracker:game-profile:v1';

export const FOCUS_WEIGHTS = {
  balanced: {
    label: 'Balanced Wealth',
    weights: { cash: 30, debt: 25, surplus: 25, invest: 20 },
  },
  saver: {
    label: 'Savings & Cushion Focus',
    weights: { cash: 40, debt: 20, surplus: 25, invest: 15 },
  },
  debt_crusher: {
    label: 'Debt Crusher Mode',
    weights: { cash: 25, debt: 40, surplus: 25, invest: 10 },
  },
  wealth_builder: {
    label: 'Investor & FIRE Mode',
    weights: { cash: 20, debt: 20, surplus: 25, invest: 35 },
  },
};

export const PORTFOLIO_SPLITS = {
  conservative: {
    shortTag: 'Safe Split',
    label: 'Safe & Steady (1–3 yr horizon)',
    summary: 'Prioritizes stability and guaranteed yield while keeping modest stock upside.',
    slices: [
      { name: 'High-Yield Cash / T-Bills (HYSA · SGOV)', pct: 50, color: '#3b82f6' },
      { name: 'US S&P 500 / Total Market (VOO · VTI)', pct: 30, color: '#10b981' },
      { name: 'Short-Term US Bonds (BND)', pct: 20, color: '#06b6d4' },
    ],
  },
  moderate: {
    shortTag: 'Balanced',
    label: 'Balanced Growth (3–7 yr horizon)',
    summary: 'Classic diversified mix balancing stock market growth with a bond cushion.',
    slices: [
      { name: 'US Total Stock / S&P 500 (VOO · VTI)', pct: 60, color: '#10b981' },
      { name: 'International Stocks (VXUS)', pct: 20, color: '#06b6d4' },
      { name: 'US Bond & Treasury Index (BND)', pct: 20, color: '#3b82f6' },
    ],
  },
  growth: {
    shortTag: 'Growth ETF',
    label: 'Long-Term Index Growth (7+ yr horizon)',
    summary: 'Proven 3-fund index strategy built for strong long-term compounding.',
    slices: [
      { name: 'US Total Stock / S&P 500 (VOO · VTI)', pct: 70, color: '#10b981' },
      { name: 'International Stocks (VXUS)', pct: 20, color: '#06b6d4' },
      { name: 'US Bond Buffer (BND)', pct: 10, color: '#3b82f6' },
    ],
  },
  aggressive: {
    shortTag: 'Max Growth',
    label: 'Max Compounding (10+ yr horizon)',
    summary: '100% equities tilted toward high-growth US & global index leaders.',
    slices: [
      { name: 'S&P 500 & US Total Market (VOO · VTI)', pct: 75, color: '#10b981' },
      { name: 'US Growth / Innovation Index (QQQM · VUG)', pct: 15, color: '#8b5cf6' },
      { name: 'International Stocks (VXUS)', pct: 10, color: '#06b6d4' },
    ],
  },
};

/**
 * Computes a personalized Monthly Paycheck Split (Expenses, Savings, Debt, Investing)
 * + Investment Portfolio Allocation whenever monthlyIncome > 0.
 */
export function computeFinancialBlueprint(profile = {}) {
  const income = Math.max(0, Number(profile.monthlyIncome) || 0);
  if (income <= 0) return null;

  const reportedExpenses = Math.max(0, Number(profile.monthlyFixedExpenses) || 0);
  const focus = profile.focusMode || 'balanced';
  const hasDebtFocus = focus === 'debt_crusher' || (Number(profile.debtPayoffTarget) || 0) > 0;
  const riskKey = PORTFOLIO_SPLITS[profile.riskProfile] ? profile.riskProfile : 'growth';

  let idealExpensesPct = 55;
  let idealSavingsPct = 20;
  let idealInvestPct = 25;
  let idealDebtPct = 0;

  if (hasDebtFocus) {
    idealExpensesPct = 55;
    idealDebtPct = 25;
    idealSavingsPct = 10;
    idealInvestPct = 10;
  } else if (focus === 'saver') {
    idealExpensesPct = 55;
    idealSavingsPct = 30;
    idealInvestPct = 15;
  } else if (focus === 'wealth_builder') {
    idealExpensesPct = 50;
    idealSavingsPct = 15;
    idealInvestPct = 35;
  }

  let expensesDollar = Math.round((income * idealExpensesPct) / 100);
  let expenseNote = `Target ~${idealExpensesPct}% of take-home pay for rent, bills, food & daily life.`;

  if (reportedExpenses > 0) {
    expensesDollar = Math.min(income, reportedExpenses);
    const actualExpPct = Math.round((reportedExpenses / income) * 100);
    if (actualExpPct > 65) {
      expenseNote = `Your current expenses are ${actualExpPct}% of income (${formatMoney(reportedExpenses)}). Trimming closer to 55%–60% (${formatMoney(Math.round(income * 0.58))}) will accelerate your buckets!`;
    } else if (actualExpPct <= 50) {
      expenseNote = `Awesome—your expenses are a lean ${actualExpPct}% of income (${formatMoney(reportedExpenses)}), leaving a ${100 - actualExpPct}% wealth-building margin!`;
    } else {
      expenseNote = `Healthy range: your expenses take ${actualExpPct}% of income (${formatMoney(reportedExpenses)}), right near the 50%–60% sweet spot.`;
    }
  }

  const remainingSurplus = Math.max(0, income - expensesDollar);
  const nonExpenseWeightSum = Math.max(1, idealSavingsPct + idealInvestPct + idealDebtPct);

  const savingsDollar = Math.round((remainingSurplus * idealSavingsPct) / nonExpenseWeightSum);
  const debtDollar = hasDebtFocus
    ? Math.round((remainingSurplus * idealDebtPct) / nonExpenseWeightSum)
    : 0;
  const investDollar = Math.max(0, remainingSurplus - savingsDollar - debtDollar);

  const expensesPct = Math.round((expensesDollar / income) * 100);
  const savingsPct = Math.round((savingsDollar / income) * 100);
  const debtPct = Math.round((debtDollar / income) * 100);
  const investPct = Math.max(0, 100 - expensesPct - savingsPct - debtPct);

  const portfolioTemplate = PORTFOLIO_SPLITS[riskKey];
  const portfolioBreakdown = portfolioTemplate.slices.map((s) => ({
    ...s,
    monthlyAmount: Math.round((investDollar * s.pct) / 100),
  }));

  const flexiblePool = Math.max(300, Math.round(expensesDollar * 0.42));
  const suggestedBudgets = {
    Groceries: Math.round(flexiblePool * 0.34),
    Dining: Math.round(flexiblePool * 0.18),
    Gas: Math.round(flexiblePool * 0.14),
    Shopping: Math.round(flexiblePool * 0.14),
    Entertainment: Math.round(flexiblePool * 0.10),
    Health: Math.round(flexiblePool * 0.10),
  };

  const cashGoal = Number(profile.primaryGoalTarget) || 0;
  const monthsToCashGoal =
    cashGoal > 0 && savingsDollar > 0 ? Math.ceil(cashGoal / savingsDollar) : null;

  return {
    income,
    reportedExpenses,
    expensesDollar,
    savingsDollar,
    debtDollar,
    investDollar,
    surplus: remainingSurplus,
    expenseNote,
    allocations: [
      {
        key: 'expenses',
        label: 'Living Expenses & Bills',
        amount: expensesDollar,
        pct: expensesPct,
        color: '#f97316',
        sub: 'Rent, utilities, groceries & fun',
      },
      {
        key: 'savings',
        label: profile.primaryGoalName || 'HYSA Cash Savings',
        amount: savingsDollar,
        pct: savingsPct,
        color: '#3b82f6',
        sub: monthsToCashGoal
          ? `Hits ${formatMoney(cashGoal)} in ~${monthsToCashGoal} mo`
          : 'High-Yield Savings (4%–5% APY)',
      },
      ...(hasDebtFocus
        ? [
            {
              key: 'debt',
              label: 'Extra Debt Paydown',
              amount: debtDollar,
              pct: debtPct,
              color: '#f59e0b',
              sub: 'Highest-APR card/loan first',
            },
          ]
        : []),
      {
        key: 'invest',
        label: 'Long-Term Investments',
        amount: investDollar,
        pct: investPct,
        color: '#10b981',
        sub: '401(k) match -> Roth IRA -> ETFs',
      },
    ],
    riskKey,
    portfolioShortTag: portfolioTemplate.shortTag,
    portfolioLabel: portfolioTemplate.label,
    portfolioSummary: portfolioTemplate.summary,
    portfolioBreakdown,
    suggestedBudgets,
    flexiblePool,
  };
}

/**
 * Calibrates all bucket names and dollar targets strictly from the user's stated goals,
 * income, expenses, debt focus, and risk horizon once all 4 questions are answered.
 */
export function calibrateBucketsFromCircumstances(profile = {}) {
  const next = { ...profile };
  const income = Number(next.monthlyIncome) || 0;
  const expenses = Number(next.monthlyFixedExpenses) || 0;
  const isComplete = next.interviewStep === 'complete' && income > 0 && expenses > 0;

  if (!isComplete) {
    next.areBucketsUnlocked = false;
    return next;
  }

  next.areBucketsUnlocked = true;

  // 1. Primary Cash Bucket Target — derived from explicit goal OR real expense runway
  if ((Number(next.userExplicitCashTarget) || 0) > 0) {
    next.cashBucketTarget = Number(next.userExplicitCashTarget);
    next.primaryGoalTarget = next.cashBucketTarget;
    if (!next.primaryGoalName) next.primaryGoalName = 'Custom Savings Goal';
  } else if (next.focusMode === 'debt_crusher' || (Number(next.debtPayoffTarget) || 0) > 0) {
    // Debt Crusher circumstance: 1-Month Starter Safety Buffer while routing max surplus to debt
    next.cashBucketTarget = Math.max(1000, Math.round(expenses / 100) * 100);
    next.primaryGoalTarget = next.cashBucketTarget;
    if (!next.primaryGoalName) next.primaryGoalName = '1-Mo Starter Buffer';
  } else if (next.riskProfile === 'conservative') {
    // Conservative circumstance: 6-Month Emergency Runway
    next.cashBucketTarget = Math.max(3000, Math.round((expenses * 6) / 100) * 100);
    next.primaryGoalTarget = next.cashBucketTarget;
    if (!next.primaryGoalName) next.primaryGoalName = '6-Mo Safety Runway';
  } else {
    // Standard / Growth circumstance: 3-Month Emergency Runway based on user's actual bills
    next.cashBucketTarget = Math.max(1500, Math.round((expenses * 3) / 100) * 100);
    next.primaryGoalTarget = next.cashBucketTarget;
    if (!next.primaryGoalName) next.primaryGoalName = '3-Mo Emergency Runway';
  }

  // 2. Investment Bucket Target — derived from explicit target OR 12 months of their blueprint's investing power
  const bp = computeFinancialBlueprint(next);
  if ((Number(next.userExplicitInvestTarget) || 0) > 0) {
    next.investBucketTarget = Number(next.userExplicitInvestTarget);
  } else {
    const annualInvestCapacity = (bp?.investDollar || 0) * 12;
    next.investBucketTarget = Math.max(
      1200,
      Math.round((annualInvestCapacity > 0 ? annualInvestCapacity : income * 2) / 100) * 100,
    );
  }

  // 3. Overall Net Worth Milestone — derived from explicit target OR combined custom buckets
  if ((Number(next.userExplicitNetWorthTarget) || 0) > 0) {
    next.netWorthTarget = Number(next.userExplicitNetWorthTarget);
  } else {
    next.netWorthTarget = next.cashBucketTarget + next.investBucketTarget;
  }

  return next;
}

export const DEFAULT_GAME_PROFILE = {
  isCustomized: false,
  areBucketsUnlocked: false,
  hasGoalAnswer: false,
  playerName: '',
  focusMode: 'balanced',
  focusLabel: FOCUS_WEIGHTS.balanced.label,
  primaryGoalName: '',
  primaryGoalTarget: 0,
  cashBucketTarget: 0,
  investBucketTarget: 0,
  netWorthTarget: 0,
  userExplicitCashTarget: 0,
  userExplicitInvestTarget: 0,
  userExplicitNetWorthTarget: 0,
  monthlySpendCap: 0,
  debtPayoffTarget: 0,
  monthlyIncome: 0,
  monthlyFixedExpenses: 0,
  riskProfile: '',
  interviewStep: 'goal', // 'goal' | 'income' | 'expenses' | 'risk' | 'complete'
  pillarWeights: { ...FOCUS_WEIGHTS.balanced.weights },
  chatHistory: [
    {
      id: 'welcome',
      role: 'coach',
      text: "Welcome! Answer 4 quick questions about your goals, income, bills, and investing style so I can create custom buckets & splits tailored to your exact circumstances. Step 1/4: What's your #1 financial goal right now?",
      changes: [],
    },
  ],
};

export function getGameProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GAME_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const mode = FOCUS_WEIGHTS[parsed.focusMode] ? parsed.focusMode : 'balanced';
        const merged = {
          ...DEFAULT_GAME_PROFILE,
          ...parsed,
          focusMode: mode,
          focusLabel: parsed.focusLabel || FOCUS_WEIGHTS[mode].label,
          pillarWeights: {
            ...FOCUS_WEIGHTS[mode].weights,
            ...(parsed.pillarWeights || {}),
          },
          chatHistory:
            Array.isArray(parsed.chatHistory) && parsed.chatHistory.length > 0
              ? parsed.chatHistory.slice(-14)
              : DEFAULT_GAME_PROFILE.chatHistory,
        };
        return calibrateBucketsFromCircumstances(merged);
      }
    }
  } catch {
    // ignore storage read errors
  }
  return { ...DEFAULT_GAME_PROFILE };
}

export function saveGameProfile(profile) {
  const calibrated = calibrateBucketsFromCircumstances({
    ...DEFAULT_GAME_PROFILE,
    ...profile,
    chatHistory: Array.isArray(profile?.chatHistory)
      ? profile.chatHistory.slice(-14)
      : DEFAULT_GAME_PROFILE.chatHistory,
  });
  try {
    localStorage.setItem(STORAGE_KEY_GAME_PROFILE, JSON.stringify(calibrated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finance-tracker:game-profile-updated', { detail: calibrated }));
    }
  } catch {
    // ignore storage write errors
  }
  return calibrated;
}

export function resetGameProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY_GAME_PROFILE);
  } catch {
    // ignore
  }
  const fresh = { ...DEFAULT_GAME_PROFILE };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finance-tracker:game-profile-updated', { detail: fresh }));
  }
  return fresh;
}

export function startGuidedInterview(currentProfile = getGameProfile()) {
  const greeting = currentProfile.playerName ? `Let's recalibrate, ${currentProfile.playerName}! ` : "Let's build your custom buckets! ";
  const updated = {
    ...currentProfile,
    interviewStep: 'goal',
    areBucketsUnlocked: false,
    chatHistory: [
      ...currentProfile.chatHistory.slice(-10),
      {
        id: `c-${Date.now()}`,
        role: 'coach',
        text: `${greeting}Step 1/4: What's your #1 financial objective right now? (e.g., Save $20k for a house, build an emergency fund, crush debt, or invest for retirement)`,
        changes: [],
      },
    ],
  };
  return saveGameProfile(updated);
}

function extractAmountsFromClause(clause = '', allowPlainNumbers = false) {
  const cleaned = clause
    .replace(/\b401\s*\(?k\)?\b/gi, ' retirement_acc ')
    .replace(/\b403\s*\(?b\)?\b/gi, ' retirement_acc ')
    .replace(/\b457\s*\(?b\)?\b/gi, ' retirement_acc ')
    .replace(/\b529\b/g, ' college_acc ')
    .replace(/\b[1-9]\s*[–-]\s*\d+\s*(?:yr|yrs|year|years)\b/gi, ' ')
    .replace(/\b\d+\+?\s*(?:yr|yrs|year|years)\b/gi, (m) => (/\b\d{4,}\b/.test(m) ? m : ' '));

  const results = [];
  const regex = /\$?\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|thousand|m|mil|million)?\b/gi;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    const rawNum = parseFloat(match[1].replace(/,/g, ''));
    if (isNaN(rawNum) || rawNum <= 0) continue;
    const suffix = (match[2] || '').toLowerCase();
    const hasDollar = match[0].trim().startsWith('$');

    let mult = 1;
    if (suffix === 'k' || suffix === 'thousand') mult = 1000;
    if (suffix === 'm' || suffix === 'mil' || suffix === 'million') mult = 1000000;

    const val = Math.round(rawNum * mult);

    if (!hasDollar && mult === 1) {
      if (!allowPlainNumbers && val < 100) continue;
      if (allowPlainNumbers && val < 50) continue;
      if (val >= 2024 && val <= 2040 && /\b(by|in|year)\s+20\d{2}\b/i.test(cleaned)) continue;
    }

    results.push(val);
  }
  return results;
}

function normalizeIncomeToMonthly(rawAmount, text = '') {
  const lower = text.toLowerCase();
  if (/\b(year|yearly|annual|annually|salary|per\s*yr|\/yr)\b/.test(lower) || rawAmount >= 28000) {
    const netMonthly = Math.round((rawAmount * 0.76) / 12);
    return { monthly: netMonthly, note: `Est. ${formatMoney(netMonthly)}/mo net (from ${formatMoney(rawAmount)}/yr)` };
  }
  if (/\b(biweekly|bi-weekly|every\s*2\s*weeks|every\s*two\s*weeks)\b/.test(lower)) {
    const monthly = Math.round((rawAmount * 26) / 12);
    return { monthly, note: `Income: ${formatMoney(monthly)}/mo (biweekly)` };
  }
  if (/\b(twice\s*a\s*month|semi-monthly|semimonthly)\b/.test(lower)) {
    const monthly = Math.round(rawAmount * 2);
    return { monthly, note: `Income: ${formatMoney(monthly)}/mo` };
  }
  if (/\b(weekly|per\s*week|a\s*week|\/wk)\b/.test(lower)) {
    const monthly = Math.round((rawAmount * 52) / 12);
    return { monthly, note: `Income: ${formatMoney(monthly)}/mo (weekly)` };
  }
  return { monthly: rawAmount, note: `Take-Home: ${formatMoney(rawAmount)}/mo` };
}

function detectRiskProfile(text = '') {
  const lower = text.toLowerCase();
  if (/\b(safe|conservative|low\s*risk|steady|short[\s-]*term|1\s*[–-]\s*3|cautious|preserve)\b/.test(lower)) {
    return 'conservative';
  }
  if (/\b(balanced|moderate|medium|middle|3\s*[–-]\s*7)\b/.test(lower)) {
    return 'moderate';
  }
  if (/\b(aggressive|max|high\s*growth|all\s*in|10\+|10\s*plus|tech|bold|yolo)\b/.test(lower)) {
    return 'aggressive';
  }
  if (/\b(growth|long[\s-]*term|7\+|index|s&p|vti|voo|retire|compound)\b/.test(lower)) {
    return 'growth';
  }
  return null;
}

function detectNamedSavingsGoal(text = '') {
  const lower = text.toLowerCase();
  if (/\b(house|home|down\s*payment|mortgage|condo|property)\b/.test(lower)) {
    return { name: 'House Down Payment' };
  }
  if (/\b(wedding|engagement|honeymoon|ring)\b/.test(lower)) {
    return { name: 'Wedding Fund' };
  }
  if (/\b(baby|child|kid|maternity|family fund)\b/.test(lower)) {
    return { name: 'Family & Baby Fund' };
  }
  if (/\b(vacation|trip|travel|europe|japan|holiday|flight)\b/.test(lower)) {
    const placeMatch = lower.match(/\b(japan|europe|italy|hawaii|mexico|paris|asia)\b/);
    const label = placeMatch
      ? `${placeMatch[1].charAt(0).toUpperCase() + placeMatch[1].slice(1)} Trip Fund`
      : 'Travel & Vacation Fund';
    return { name: label };
  }
  if (/\b(car|truck|vehicle|suv|tesla|honda|toyota)\b/.test(lower) && !/\b(pay\s*off|loan|debt)\b/.test(lower)) {
    return { name: 'Next Car Fund' };
  }
  if (/\b(tuition|college|school|degree|masters|education)\b/.test(lower) && !/\b(loan|debt)\b/.test(lower)) {
    return { name: 'Education Fund' };
  }
  if (/\b(business|startup|side hustle|company)\b/.test(lower)) {
    return { name: 'Startup Launch Fund' };
  }
  if (/\b(move|moving|relocat|apartment|lease)\b/.test(lower)) {
    return { name: 'Move & Apartment Fund' };
  }
  if (/\b(emergency|rainy day|safety net|cushion|buffer|hysa|savings)\b/.test(lower)) {
    return { name: 'Emergency Runway' };
  }
  return null;
}

function buildBlueprintCoachSummary(profile) {
  const bp = computeFinancialBlueprint(profile);
  if (!bp) return '';
  const allocParts = bp.allocations
    .map((a) => `${a.label}: ${formatMoney(a.amount)}/mo (${a.pct}%)`)
    .join(' · ');
  const splitParts = bp.portfolioBreakdown
    .map((s) => `${s.pct}% ${s.name.split(' (')[0]} (${formatMoney(s.monthlyAmount)}/mo)`)
    .join(', ');

  return `Your custom buckets are now unlocked and sized to your circumstances! Monthly split on ${formatMoney(bp.income)}/mo: ${allocParts}. Investment split (${bp.portfolioLabel}): ${splitParts}.`;
}

/**
 * Multi-turn Guided Financial Coach + Free-Form Natural Language Goal Engine.
 * Buckets remain locked until all 4 questions (goal, income, expenses, risk) are answered!
 */
export function processGoalChatMessage(rawText = '', currentProfile = getGameProfile()) {
  const trimmed = rawText.trim();
  if (!trimmed) return { profile: currentProfile, reply: null };

  const lowerAll = trimmed.toLowerCase();

  if (/^(reset|default|start over|clear goals|restore default)\b/i.test(lowerAll)) {
    const reset = {
      ...DEFAULT_GAME_PROFILE,
      chatHistory: [
        ...currentProfile.chatHistory.slice(-8),
        { id: `u-${Date.now()}`, role: 'user', text: trimmed },
        {
          id: `c-${Date.now() + 1}`,
          role: 'coach',
          text: "Reset complete! Buckets are locked until we set your new plan. Step 1/4: What's your #1 financial goal right now?",
          changes: ['Buckets Locked · Awaiting Goals'],
        },
      ],
    };
    return { profile: saveGameProfile(reset) };
  }

  if (/\b(guide me|quiz|ask me|step by step|interview|help me plan)\b/i.test(lowerAll)) {
    return { profile: startGuidedInterview(currentProfile) };
  }

  const next = {
    ...currentProfile,
    isCustomized: true,
  };
  const changes = [];
  const prevStep = currentProfile.interviewStep || 'goal';

  const nameMatch = trimmed.match(/\b(?:my name is|i am|i'm)\s+([A-Za-z]{2,15})\b/i);
  if (
    nameMatch &&
    ![
      'saving', 'trying', 'looking', 'working', 'focused', 'planning',
      'paying', 'investing', 'hoping', 'building', 'new', 'here',
      'ready', 'debt', 'making', 'earning', 'spending', 'comfortable',
      'safe', 'moderate', 'aggressive',
    ].includes(nameMatch[1].toLowerCase())
  ) {
    const rawName = nameMatch[1];
    next.playerName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    changes.push(`Player: ${next.playerName}`);
  }

  const clauses = trimmed
    .split(/(?:,(?!\d)|;|\band\b|\balso\b|\bplus\b|\bwhile\b|\bthen\b|\.\s+)/i)
    .map((c) => c.trim())
    .filter(Boolean);

  let detectedFocus = null;
  let updatedRisk = false;

  for (const clause of clauses) {
    const cl = clause.toLowerCase();
    const allowPlain = prevStep === 'income' || prevStep === 'expenses';
    const amounts = extractAmountsFromClause(clause, allowPlain);
    const amount = amounts[0] || null;

    // 1. Explicit Income Mention
    if (
      /\b(income|make|earn|earning|take[\s-]*home|salary|paycheck|bring\s*in|net\s*pay|paid)\b/.test(cl) &&
      amount
    ) {
      const norm = normalizeIncomeToMonthly(amount, clause);
      next.monthlyIncome = norm.monthly;
      changes.push(norm.note);
      continue;
    }

    // 2. Explicit Expenses / Bills Mention
    if (
      /\b(expense|expenses|rent|mortgage|bills|cost|living|overhead|spend|spending|budget|burn)\b/.test(cl) &&
      amount &&
      !/\b(save|invest|down\s*payment)\b/.test(cl)
    ) {
      next.monthlyFixedExpenses = amount;
      next.monthlySpendCap = amount;
      changes.push(`Monthly Bills: ${formatMoney(amount)}/mo`);
      continue;
    }

    // 3. Risk / Portfolio Style Mention
    const riskMatch = detectRiskProfile(clause);
    if (
      riskMatch &&
      (prevStep === 'risk' ||
        /\b(risk|portfolio|split|allocate|allocation|horizon|timeline|style|etf|conservative|moderate|aggressive)\b/.test(cl) ||
        clauses.length === 1)
    ) {
      next.riskProfile = riskMatch;
      changes.push(`Style: ${PORTFOLIO_SPLITS[riskMatch].label.split(' (')[0]}`);
      updatedRisk = true;
      if (riskMatch === 'aggressive' && !detectedFocus && !next.hasGoalAnswer) {
        detectedFocus = 'wealth_builder';
      }
      continue;
    }

    // 4. Net Worth Goal
    if (/\b(net\s*worth)\b/.test(cl)) {
      if (amount) {
        next.userExplicitNetWorthTarget = amount;
        changes.push(`Net Worth Goal: ${formatMoney(amount)}`);
      }
      if (!detectedFocus) detectedFocus = 'wealth_builder';
      next.hasGoalAnswer = true;
      continue;
    }

    // 5. Debt Payoff
    if (/\b(debt|credit\s*card|loan|student\s*loan|auto\s*loan|car\s*loan|pay\s*off|paydown|crush|owe)\b/.test(cl)) {
      detectedFocus = 'debt_crusher';
      next.hasGoalAnswer = true;
      if (amount) {
        next.debtPayoffTarget = amount;
        changes.push(`Debt Target: ${formatMoney(amount)}`);
      } else {
        changes.push('Goal: Crush Debt Fast');
      }
      continue;
    }

    // 6. Investing / Retirement Goal
    if (/\b(invest|investing|portfolio|retirement|401\s*\(?k\)?|ira|roth|stock|etf|brokerage|robinhood|fire|compound|wealth)\b/.test(cl)) {
      if (!detectedFocus) detectedFocus = 'wealth_builder';
      next.hasGoalAnswer = true;
      if (amount) {
        next.userExplicitInvestTarget = amount;
        changes.push(`Invest Goal: ${formatMoney(amount)}`);
      } else {
        changes.push('Goal: Long-Term Wealth');
      }
      continue;
    }

    // 7. Named Savings / Cash Goal
    const namedGoal = detectNamedSavingsGoal(clause);
    if (namedGoal || /\b(save|saving|cash|fund|goal|cushion|bank)\b/.test(cl)) {
      if (!detectedFocus) detectedFocus = 'saver';
      next.hasGoalAnswer = true;
      const goalTitle = namedGoal ? namedGoal.name : 'Cash Savings Goal';
      next.primaryGoalName = goalTitle;
      if (amount) {
        next.userExplicitCashTarget = amount;
        changes.push(`${goalTitle}: ${formatMoney(amount)}`);
      } else {
        changes.push(`Goal: ${goalTitle}`);
      }
      continue;
    }

    // 8. Context-sensitive plain numeric answer
    if (amount && clauses.length === 1) {
      if (prevStep === 'income') {
        const norm = normalizeIncomeToMonthly(amount, clause);
        next.monthlyIncome = norm.monthly;
        changes.push(norm.note);
        continue;
      }
      if (prevStep === 'expenses') {
        next.monthlyFixedExpenses = amount;
        next.monthlySpendCap = amount;
        changes.push(`Monthly Bills: ${formatMoney(amount)}/mo`);
        continue;
      }
      next.hasGoalAnswer = true;
      next.userExplicitCashTarget = amount;
      changes.push(`Savings Target: ${formatMoney(amount)}`);
    }
  }

  if (detectedFocus && FOCUS_WEIGHTS[detectedFocus]) {
    next.focusMode = detectedFocus;
    next.focusLabel = FOCUS_WEIGHTS[detectedFocus].label;
    next.pillarWeights = { ...FOCUS_WEIGHTS[detectedFocus].weights };
    changes.push(`Focus: ${next.focusLabel}`);
  }

  // Advance Guided Step Strictly: Goal -> Income -> Expenses -> Risk -> Complete (Unlock Buckets!)
  let coachReply = '';

  if (!next.hasGoalAnswer) {
    next.interviewStep = 'goal';
    coachReply =
      'Step 1/4: Tell me your #1 financial goal first (for example: "Save $20k for a house", "Build an emergency fund", "Pay off debt", or "Invest for retirement")!';
  } else if (!next.monthlyIncome) {
    next.interviewStep = 'income';
    coachReply = `Got your goal${next.playerName ? `, ${next.playerName}` : ''}! Step 2/4: What is your monthly take-home income (after taxes)? Type an amount like "$4,500/mo" or "$75k/yr" so we size your buckets to your real income.`;
  } else if (!next.monthlyFixedExpenses) {
    next.interviewStep = 'expenses';
    coachReply = `Great (${formatMoney(next.monthlyIncome)}/mo take-home)! Step 3/4: Roughly how much are your essential monthly bills & living costs (rent, groceries, gas, utilities, minimum payments)?`;
  } else if (!next.riskProfile && !updatedRisk) {
    next.interviewStep = 'risk';
    const surplus = Math.max(0, next.monthlyIncome - next.monthlyFixedExpenses);
    coachReply =
      surplus > 0
        ? `That leaves ${formatMoney(surplus)}/mo above your ${formatMoney(next.monthlyFixedExpenses)} bills! Final Step 4/4: Choose your investing comfort & timeline (Safe 1–3 yrs, Balanced 3–7 yrs, Growth 7+ yrs, or Max Aggressive 10+ yrs) to unlock your custom buckets!`
        : `Your ${formatMoney(next.monthlyFixedExpenses)}/mo bills currently match ${formatMoney(next.monthlyIncome)}/mo income—we'll size a protective buffer first! Final Step 4/4: Choose your investing comfort style to unlock your custom buckets!`;
  } else {
    next.interviewStep = 'complete';
    if (!next.riskProfile) next.riskProfile = 'growth';
    const calibratedPreview = calibrateBucketsFromCircumstances(next);
    coachReply = buildBlueprintCoachSummary(calibratedPreview);
  }

  next.chatHistory = [
    ...currentProfile.chatHistory.slice(-11),
    {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    },
    {
      id: `c-${Date.now() + 1}`,
      role: 'coach',
      text: coachReply,
      changes,
    },
  ];

  const saved = saveGameProfile(next);
  return {
    profile: saved,
    reply: coachReply,
    changes,
    blueprint: computeFinancialBlueprint(saved),
  };
}
