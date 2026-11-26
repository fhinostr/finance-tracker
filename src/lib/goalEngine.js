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
    label: 'Safe & Steady (1–3 yr horizon)',
    summary: 'Prioritizes stability and guaranteed yield while keeping modest stock upside.',
    slices: [
      { name: 'High-Yield Cash / T-Bills (HYSA · SGOV)', pct: 50, color: '#3b82f6' },
      { name: 'US S&P 500 / Total Market (VOO · VTI)', pct: 30, color: '#10b981' },
      { name: 'Short-Term US Bonds (BND)', pct: 20, color: '#06b6d4' },
    ],
  },
  moderate: {
    label: 'Balanced Growth (3–7 yr horizon)',
    summary: 'Classic diversified mix balancing stock market growth with a bond cushion.',
    slices: [
      { name: 'US Total Stock / S&P 500 (VOO · VTI)', pct: 60, color: '#10b981' },
      { name: 'International Stocks (VXUS)', pct: 20, color: '#06b6d4' },
      { name: 'US Bond & Treasury Index (BND)', pct: 20, color: '#3b82f6' },
    ],
  },
  growth: {
    label: 'Long-Term Index Growth (7+ yr horizon)',
    summary: 'Proven 3-fund index strategy built for strong long-term compounding.',
    slices: [
      { name: 'US Total Stock / S&P 500 (VOO · VTI)', pct: 70, color: '#10b981' },
      { name: 'International Stocks (VXUS)', pct: 20, color: '#06b6d4' },
      { name: 'US Bond Buffer (BND)', pct: 10, color: '#3b82f6' },
    ],
  },
  aggressive: {
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

  // Recommended benchmark percentages by focus mode
  let idealExpensesPct = 55;
  let idealSavingsPct = 20;
  let idealInvestPct = 25;
  let idealDebtPct = 0;

  if (hasDebtFocus) {
    idealExpensesPct = 55;
    idealDebtPct = 25;
    idealSavingsPct = 10;
    idealInvestPct = 10; // Still capture employer 401(k) match!
  } else if (focus === 'saver') {
    idealExpensesPct = 55;
    idealSavingsPct = 30;
    idealInvestPct = 15;
  } else if (focus === 'wealth_builder') {
    idealExpensesPct = 50;
    idealSavingsPct = 15;
    idealInvestPct = 35;
  }

  // If user reported real expenses, adapt the remaining surplus realistically while showing ideal vs actual
  let expensesDollar = Math.round((income * idealExpensesPct) / 100);
  let expenseNote = `Target ~${idealExpensesPct}% of take-home pay for rent, bills, food & daily life.`;

  if (reportedExpenses > 0) {
    expensesDollar = Math.min(income, reportedExpenses);
    const actualExpPct = Math.round((reportedExpenses / income) * 100);
    if (actualExpPct > 65) {
      expenseNote = `Your current expenses are ${actualExpPct}% of income (${formatMoney(reportedExpenses)}). Trimming closer to 55%–60% (${formatMoney(Math.round(income * 0.58))}) will supercharge your goals!`;
    } else if (actualExpPct <= 50) {
      expenseNote = `Awesome—your expenses are a lean ${actualExpPct}% of income (${formatMoney(reportedExpenses)}), leaving a huge ${100 - actualExpPct}% wealth-building margin!`;
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

  // Portfolio split in exact monthly dollars
  const portfolioTemplate = PORTFOLIO_SPLITS[riskKey];
  const portfolioBreakdown = portfolioTemplate.slices.map((s) => ({
    ...s,
    monthlyAmount: Math.round((investDollar * s.pct) / 100),
  }));

  // Suggested variable category budgets (assuming ~40% of total expenses are flexible food/gas/shopping/fun, or remaining after fixed rent)
  const flexiblePool = Math.max(300, Math.round(expensesDollar * 0.42));
  const suggestedBudgets = {
    Groceries: Math.round(flexiblePool * 0.34),
    Dining: Math.round(flexiblePool * 0.18),
    Gas: Math.round(flexiblePool * 0.14),
    Shopping: Math.round(flexiblePool * 0.14),
    Entertainment: Math.round(flexiblePool * 0.10),
    Health: Math.round(flexiblePool * 0.10),
  };

  // Months to reach primary cash goal at this monthly savings rate
  const cashGoal = Math.max(500, Number(profile.primaryGoalTarget) || 3000);
  const monthsToCashGoal = savingsDollar > 0 ? Math.ceil(cashGoal / savingsDollar) : null;

  return {
    income,
    reportedExpenses,
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
          ? `Hits ${formatMoney(cashGoal)} in ~${monthsToCashGoal} mo (4.5% HYSA)`
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
              sub: 'Highest-APR card/loan first (Avalanche)',
            },
          ]
        : []),
      {
        key: 'invest',
        label: 'Long-Term Investments',
        amount: investDollar,
        pct: investPct,
        color: '#10b981',
        sub: '401(k) match -> Roth IRA -> Index ETFs',
      },
    ],
    riskKey,
    portfolioLabel: portfolioTemplate.label,
    portfolioSummary: portfolioTemplate.summary,
    portfolioBreakdown,
    suggestedBudgets,
    flexiblePool,
  };
}

export const DEFAULT_GAME_PROFILE = {
  isCustomized: false,
  playerName: '',
  focusMode: 'balanced',
  focusLabel: FOCUS_WEIGHTS.balanced.label,
  primaryGoalName: 'Emergency & Move Cushion',
  primaryGoalTarget: 3000,
  cashBucketTarget: 3000,
  investBucketTarget: 10000,
  netWorthTarget: 25000,
  monthlySpendCap: 0,
  debtPayoffTarget: 0,
  monthlyIncome: 0,
  monthlyFixedExpenses: 0,
  riskProfile: 'growth',
  interviewStep: 'goal', // 'goal' | 'income' | 'expenses' | 'risk' | 'complete'
  pillarWeights: { ...FOCUS_WEIGHTS.balanced.weights },
  chatHistory: [
    {
      id: 'welcome',
      role: 'coach',
      text: "Hi! Let's build your personalized financial game plan in 4 quick questions. Step 1/4: What's your #1 goal right now? (e.g., Save $20k for a house, build a $5k emergency fund, pay off debt, or grow investments)",
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
        return {
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
      }
    }
  } catch {
    // ignore storage read errors
  }
  return { ...DEFAULT_GAME_PROFILE };
}

export function saveGameProfile(profile) {
  const clean = {
    ...DEFAULT_GAME_PROFILE,
    ...profile,
    chatHistory: Array.isArray(profile?.chatHistory)
      ? profile.chatHistory.slice(-14)
      : DEFAULT_GAME_PROFILE.chatHistory,
  };
  try {
    localStorage.setItem(STORAGE_KEY_GAME_PROFILE, JSON.stringify(clean));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finance-tracker:game-profile-updated', { detail: clean }));
    }
  } catch {
    // ignore storage write errors
  }
  return clean;
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
  const greeting = currentProfile.playerName ? `Let's do it, ${currentProfile.playerName}! ` : "Let's build your full plan! ";
  const updated = {
    ...currentProfile,
    interviewStep: 'goal',
    chatHistory: [
      ...currentProfile.chatHistory.slice(-10),
      {
        id: `c-${Date.now()}`,
        role: 'coach',
        text: `${greeting}Step 1/4: What's your #1 financial objective right now? (e.g., Save $15k for a house, build an emergency cushion, crush debt, or invest for retirement)`,
        changes: [],
      },
    ],
  };
  return saveGameProfile(updated);
}

/**
 * Extracts dollar/number amounts like "$15,000", "15k", "$1.5m", "4500" from a clause.
 * Supports allowSmallPlainNumbers when the coach explicitly asked for a monthly dollar figure.
 */
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
    // Convert gross annual salary to realistic ~76% after-tax monthly take-home
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
    return { name: 'House Down Payment', defaultTarget: 20000 };
  }
  if (/\b(wedding|engagement|honeymoon|ring)\b/.test(lower)) {
    return { name: 'Wedding Fund', defaultTarget: 12000 };
  }
  if (/\b(baby|child|kid|maternity|family fund)\b/.test(lower)) {
    return { name: 'Family & Baby Fund', defaultTarget: 10000 };
  }
  if (/\b(vacation|trip|travel|europe|japan|holiday|flight)\b/.test(lower)) {
    const placeMatch = lower.match(/\b(japan|europe|italy|hawaii|mexico|paris|asia)\b/);
    const label = placeMatch
      ? `${placeMatch[1].charAt(0).toUpperCase() + placeMatch[1].slice(1)} Trip Fund`
      : 'Travel & Vacation Fund';
    return { name: label, defaultTarget: 4000 };
  }
  if (/\b(car|truck|vehicle|suv|tesla|honda|toyota)\b/.test(lower) && !/\b(pay\s*off|loan|debt)\b/.test(lower)) {
    return { name: 'Next Car Fund', defaultTarget: 8000 };
  }
  if (/\b(tuition|college|school|degree|masters|education)\b/.test(lower) && !/\b(loan|debt)\b/.test(lower)) {
    return { name: 'Education Fund', defaultTarget: 10000 };
  }
  if (/\b(business|startup|side hustle|company)\b/.test(lower)) {
    return { name: 'Startup Launch Fund', defaultTarget: 10000 };
  }
  if (/\b(move|moving|relocat|apartment|lease)\b/.test(lower)) {
    return { name: 'Move & Apartment Fund', defaultTarget: 3500 };
  }
  if (/\b(emergency|rainy day|safety net|cushion|buffer|hysa|savings)\b/.test(lower)) {
    return { name: 'Emergency Cushion', defaultTarget: 5000 };
  }
  return null;
}

/**
 * Formats a concise conversational summary of the user's personalized blueprint.
 */
function buildBlueprintCoachSummary(profile) {
  const bp = computeFinancialBlueprint(profile);
  if (!bp) return '';
  const allocParts = bp.allocations
    .map((a) => `${a.label}: ${formatMoney(a.amount)}/mo (${a.pct}%)`)
    .join(' · ');
  const splitParts = bp.portfolioBreakdown
    .map((s) => `${s.pct}% ${s.name.split(' (')[0]} (${formatMoney(s.monthlyAmount)}/mo)`)
    .join(', ');

  return `Here is your custom Monthly Blueprint on ${formatMoney(bp.income)}/mo: ${allocParts}. ${bp.expenseNote} For your ${formatMoney(bp.allocations.find((a) => a.key === 'invest')?.amount || 0)}/mo investments (${bp.portfolioLabel}), aim for: ${splitParts}. Tap "Apply Blueprint to App" below to load your income & budgets directly into your tracker!`;
}

/**
 * Multi-turn Guided Financial Coach + Free-Form Natural Language Goal Engine.
 */
export function processGoalChatMessage(rawText = '', currentProfile = getGameProfile()) {
  const trimmed = rawText.trim();
  if (!trimmed) return { profile: currentProfile, reply: null };

  const lowerAll = trimmed.toLowerCase();

  // Handle reset request
  if (/^(reset|default|start over|clear goals|restore default)\b/i.test(lowerAll)) {
    const reset = {
      ...DEFAULT_GAME_PROFILE,
      chatHistory: [
        ...currentProfile.chatHistory.slice(-8),
        { id: `u-${Date.now()}`, role: 'user', text: trimmed },
        {
          id: `c-${Date.now() + 1}`,
          role: 'coach',
          text: "Reset complete! Step 1/4: What's your #1 financial goal right now?",
          changes: ['Balanced Mode Restored'],
        },
      ],
    };
    return { profile: saveGameProfile(reset) };
  }

  // Handle explicit request to start guided Q&A
  if (/\b(guide me|quiz|ask me|step by step|interview|help me plan)\b/i.test(lowerAll)) {
    return { profile: startGuidedInterview(currentProfile) };
  }

  const next = {
    ...currentProfile,
    isCustomized: true,
  };
  const changes = [];
  const prevStep = currentProfile.interviewStep || 'goal';

  // 1. Optional player name detection
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

  // Split sentence into clauses (preserving commas inside numbers like $12,000)
  const clauses = trimmed
    .split(/(?:,(?!\d)|;|\band\b|\balso\b|\bplus\b|\bwhile\b|\bthen\b|\.\s+)/i)
    .map((c) => c.trim())
    .filter(Boolean);

  let detectedFocus = null;
  let updatedGoal = false;
  let updatedRisk = false;

  for (const clause of clauses) {
    const cl = clause.toLowerCase();
    const allowPlain = prevStep === 'income' || prevStep === 'expenses';
    const amounts = extractAmountsFromClause(clause, allowPlain);
    const amount = amounts[0] || null;

    // 1. Explicit Income Mention ("I make $5,200/mo", "income is $4500", "$80k salary")
    if (
      /\b(income|make|earn|earning|take[\s-]*home|salary|paycheck|bring\s*in|net\s*pay|paid)\b/.test(cl) &&
      amount
    ) {
      const norm = normalizeIncomeToMonthly(amount, clause);
      next.monthlyIncome = norm.monthly;
      changes.push(norm.note);
      continue;
    }

    // 2. Explicit Expenses / Rent / Bills Mention ("my expenses are $2,400", "rent and bills are $2,100")
    if (
      /\b(expense|expenses|rent|mortgage|bills|cost|living|overhead|spend|spending|budget|burn)\b/.test(cl) &&
      amount &&
      !/\b(save|invest|down\s*payment)\b/.test(cl)
    ) {
      next.monthlyFixedExpenses = amount;
      next.monthlySpendCap = amount;
      changes.push(`Monthly Expenses: ${formatMoney(amount)}/mo`);
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
      changes.push(`Portfolio: ${PORTFOLIO_SPLITS[riskMatch].label.split(' (')[0]}`);
      updatedRisk = true;
      if (riskMatch === 'aggressive' && !detectedFocus && !currentProfile.isCustomized) {
        detectedFocus = 'wealth_builder';
      }
      continue;
    }

    // 4. Net Worth Goal
    if (/\b(net\s*worth)\b/.test(cl)) {
      const target = amount || 50000;
      next.netWorthTarget = target;
      changes.push(`Net Worth Goal: ${formatMoney(target)}`);
      if (!detectedFocus) detectedFocus = 'wealth_builder';
      updatedGoal = true;
      continue;
    }

    // 5. Debt Payoff
    if (/\b(debt|credit\s*card|loan|student\s*loan|auto\s*loan|car\s*loan|pay\s*off|paydown|crush|owe)\b/.test(cl)) {
      detectedFocus = 'debt_crusher';
      if (amount) {
        next.debtPayoffTarget = amount;
        changes.push(`Debt Crush Target: ${formatMoney(amount)}`);
      } else {
        changes.push('Priority: Crush Debt to $0');
      }
      updatedGoal = true;
      continue;
    }

    // 6. Investing / Retirement Goal
    if (/\b(invest|investing|portfolio|retirement|401\s*\(?k\)?|ira|roth|stock|etf|brokerage|robinhood|fire|compound|wealth)\b/.test(cl)) {
      if (!detectedFocus) detectedFocus = 'wealth_builder';
      const target = amount || Math.max(next.investBucketTarget, 25000);
      next.investBucketTarget = target;
      if (next.netWorthTarget < target) {
        next.netWorthTarget = Math.round(target * 1.5);
      }
      changes.push(`Invest Bucket: ${formatMoney(target)}`);
      updatedGoal = true;
      continue;
    }

    // 7. Named Savings / Cash Goal
    const namedGoal = detectNamedSavingsGoal(clause);
    if (namedGoal || /\b(save|saving|cash|fund|goal|cushion|bank)\b/.test(cl)) {
      if (!detectedFocus) detectedFocus = 'saver';
      const goalTitle = namedGoal ? namedGoal.name : 'Cash Savings Goal';
      const target = amount || (namedGoal ? namedGoal.defaultTarget : 5000);
      next.primaryGoalName = goalTitle;
      next.primaryGoalTarget = target;
      next.cashBucketTarget = target;
      if (next.netWorthTarget < target + next.investBucketTarget) {
        next.netWorthTarget = target + next.investBucketTarget;
      }
      changes.push(`${goalTitle}: ${formatMoney(target)}`);
      updatedGoal = true;
      continue;
    }

    // 8. Context-sensitive plain answer when user is answering a specific interview question!
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
        changes.push(`Monthly Expenses: ${formatMoney(amount)}/mo`);
        continue;
      }
      next.primaryGoalTarget = amount;
      next.cashBucketTarget = amount;
      changes.push(`${next.primaryGoalName}: ${formatMoney(amount)}`);
      updatedGoal = true;
    }
  }

  // Apply Focus Mode & Pillar Weights if detected
  if (detectedFocus && FOCUS_WEIGHTS[detectedFocus]) {
    next.focusMode = detectedFocus;
    next.focusLabel = FOCUS_WEIGHTS[detectedFocus].label;
    next.pillarWeights = { ...FOCUS_WEIGHTS[detectedFocus].weights };
    changes.push(`Mode: ${next.focusLabel}`);
  }

  // Determine Next Guided Question in the Coaching Sequence!
  let coachReply = '';
  const asksForSplitAdvice = /\b(split|suggest|recommend|how\s*much|allocation|blueprint|breakdown|50\/30\/20)\b/.test(lowerAll);

  if (asksForSplitAdvice && next.monthlyIncome > 0) {
    next.interviewStep = 'complete';
    coachReply = buildBlueprintCoachSummary(next);
  } else if (!next.monthlyIncome) {
    // Ask Step 2: Monthly Take-Home Income
    next.interviewStep = 'income';
    const intro = updatedGoal
      ? `Awesome${next.playerName ? `, ${next.playerName}` : ''}! I've set your buckets for ${next.focusLabel}. `
      : '';
    coachReply = `${intro}Step 2/4: Roughly how much is your monthly take-home pay (after taxes)? Type an amount like "$4,500/mo" or "$75k/yr", or tap a quick option below so I can calculate your ideal savings & investment split!`;
  } else if (!next.monthlyFixedExpenses) {
    // Ask Step 3: Monthly Essential Expenses
    next.interviewStep = 'expenses';
    coachReply = `Got it—${formatMoney(next.monthlyIncome)}/mo take-home! Step 3/4: About how much do your monthly essentials & bills (rent, utilities, groceries, gas, minimum payments) cost right now?`;
  } else if (prevStep !== 'complete' && !updatedRisk) {
    // Ask Step 4: Risk Tolerance & Investment Horizon
    next.interviewStep = 'risk';
    const surplus = Math.max(0, next.monthlyIncome - next.monthlyFixedExpenses);
    coachReply =
      surplus > 0
        ? `Nice! That gives you ${formatMoney(surplus)}/mo in wealth-building power above your ${formatMoney(next.monthlyFixedExpenses)} expenses. Step 4/4: What's your investing comfort level & timeline so I can recommend an exact portfolio split?`
        : `Right now your ${formatMoney(next.monthlyFixedExpenses)}/mo expenses match or exceed ${formatMoney(next.monthlyIncome)}/mo income—we'll build a plan to free up cash! Step 4/4: What's your investing comfort level once cash flow opens up?`;
  } else {
    // Step 4 Complete -> Deliver Full Personalized Blueprint & Investment Split!
    next.interviewStep = 'complete';
    coachReply = buildBlueprintCoachSummary(next);
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
