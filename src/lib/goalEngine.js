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
  pillarWeights: { ...FOCUS_WEIGHTS.balanced.weights },
  chatHistory: [
    {
      id: 'welcome',
      role: 'coach',
      text: "Tell me what you're working toward—like saving $15k for a house, building an emergency fund, paying off debt, or investing for retirement—and I'll customize your buckets, score weights, and quests!",
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
              ? parsed.chatHistory.slice(-12)
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
      ? profile.chatHistory.slice(-12)
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

/**
 * Extracts dollar/number amounts like "$15,000", "15k", "$1.5m", "4500" from a clause.
 * Ignores years like 2026 or retirement terms like 401k / 403b / 529.
 */
function extractAmountsFromClause(clause = '') {
  const cleaned = clause
    .replace(/\b401\s*\(?k\)?\b/gi, ' retirement_acc ')
    .replace(/\b403\s*\(?b\)?\b/gi, ' retirement_acc ')
    .replace(/\b457\s*\(?b\)?\b/gi, ' retirement_acc ')
    .replace(/\b529\b/g, ' college_acc ');

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

    // Filter out standalone small numbers like "in 6 months" or years like "2027" unless prefixed with $ or k/m
    if (!hasDollar && mult === 1) {
      if (val < 100) continue;
      if (val >= 2024 && val <= 2040 && /\b(by|in|year)\s+20\d{2}\b/i.test(cleaned)) continue;
    }

    results.push(val);
  }
  return results;
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
 * Parses a natural-language user message and returns the updated GameProfile + friendly Coach response.
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
          text: 'Reset complete! Your buckets, score weights, and quests are back to the balanced starter defaults.',
          changes: ['Balanced Mode Restored', 'Cash Goal: $3,000', 'Invest Goal: $10,000'],
        },
      ],
    };
    return { profile: saveGameProfile(reset) };
  }

  const next = {
    ...currentProfile,
    isCustomized: true,
  };
  const changes = [];

  // 1. Optional player name detection ("I'm Sofia", "My name is Alex")
  const nameMatch = trimmed.match(/\b(?:my name is|i am|i'm)\s+([A-Za-z]{2,15})\b/i);
  if (
    nameMatch &&
    !['saving', 'trying', 'looking', 'working', 'focused', 'planning', 'paying', 'investing', 'hoping', 'building', 'new', 'here', 'ready', 'debt'].includes(
      nameMatch[1].toLowerCase(),
    )
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
  let updatedAnyGoal = false;

  for (const clause of clauses) {
    const cl = clause.toLowerCase();
    const amounts = extractAmountsFromClause(clause);
    const amount = amounts[0] || null;

    // A. Net Worth goal
    if (/\b(net\s*worth)\b/.test(cl)) {
      const target = amount || 50000;
      next.netWorthTarget = target;
      changes.push(`Net Worth Goal: ${formatMoney(target)}`);
      if (!detectedFocus) detectedFocus = 'wealth_builder';
      updatedAnyGoal = true;
      continue;
    }

    // B. Monthly Spending / Budget limit
    if (/\b(spend|spending|budget|expenses|burn)\b/.test(cl) && /\b(under|below|cap|limit|max|month|mo|less than)\b/.test(cl)) {
      if (amount) {
        next.monthlySpendCap = amount;
        changes.push(`Spend Cap: ${formatMoney(amount)}/mo`);
        updatedAnyGoal = true;
        continue;
      }
    }

    // C. Debt Payoff / Credit Card / Student or Car Loan
    if (/\b(debt|credit\s*card|loan|student\s*loan|auto\s*loan|car\s*loan|pay\s*off|paydown|crush|owe)\b/.test(cl)) {
      detectedFocus = 'debt_crusher';
      if (amount) {
        next.debtPayoffTarget = amount;
        changes.push(`Debt Crush Target: ${formatMoney(amount)}`);
      } else {
        changes.push('Priority: Crush Debt to $0');
      }
      updatedAnyGoal = true;
      continue;
    }

    // D. Investing / Portfolio / Retirement / Stocks / FIRE
    if (/\b(invest|investing|portfolio|retirement|401\s*\(?k\)?|ira|roth|stock|etf|brokerage|robinhood|fire|compound|wealth)\b/.test(cl)) {
      if (!detectedFocus) detectedFocus = 'wealth_builder';
      const target = amount || Math.max(next.investBucketTarget, 25000);
      next.investBucketTarget = target;
      if (next.netWorthTarget < target) {
        next.netWorthTarget = Math.round(target * 1.5);
      }
      changes.push(`Invest Bucket: ${formatMoney(target)}`);
      updatedAnyGoal = true;
      continue;
    }

    // E. Specific Savings / Cash Goal (House, Emergency, Vacation, Wedding, Car, Move, etc.)
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
      updatedAnyGoal = true;
      continue;
    }

    // F. Fallback if user just typed a standalone amount like "$15,000"
    if (amount && clauses.length === 1) {
      next.primaryGoalTarget = amount;
      next.cashBucketTarget = amount;
      changes.push(`${next.primaryGoalName}: ${formatMoney(amount)}`);
      updatedAnyGoal = true;
    }
  }

  // Apply Focus Mode & Pillar Weights if detected
  if (detectedFocus && FOCUS_WEIGHTS[detectedFocus]) {
    next.focusMode = detectedFocus;
    next.focusLabel = FOCUS_WEIGHTS[detectedFocus].label;
    next.pillarWeights = { ...FOCUS_WEIGHTS[detectedFocus].weights };
    changes.push(`Game Mode: ${next.focusLabel}`);
  } else if (!updatedAnyGoal) {
    // User wrote a general objective without keywords matched above
    if (/\b(aggressive|grow|millionaire|rich)\b/.test(lowerAll)) {
      next.focusMode = 'wealth_builder';
      next.focusLabel = FOCUS_WEIGHTS.wealth_builder.label;
      next.pillarWeights = { ...FOCUS_WEIGHTS.wealth_builder.weights };
      changes.push(`Game Mode: ${next.focusLabel}`);
      updatedAnyGoal = true;
    } else if (/\b(safe|security|peace of mind|stability)\b/.test(lowerAll)) {
      next.focusMode = 'saver';
      next.focusLabel = FOCUS_WEIGHTS.saver.label;
      next.pillarWeights = { ...FOCUS_WEIGHTS.saver.weights };
      changes.push(`Game Mode: ${next.focusLabel}`);
      updatedAnyGoal = true;
    }
  }

  // Compose warm, concise Coach response
  let coachReply = '';
  const greeting = next.playerName ? `Awesome, ${next.playerName}! ` : 'Got it! ';

  if (updatedAnyGoal) {
    const weightSummary =
      next.focusMode === 'debt_crusher'
        ? `boosted your Debt Control pillar to ${next.pillarWeights.debt}/100 pts`
        : next.focusMode === 'saver'
        ? `boosted your Cash Cushion pillar to ${next.pillarWeights.cash}/100 pts`
        : next.focusMode === 'wealth_builder'
        ? `boosted your Wealth Growth pillar to ${next.pillarWeights.invest}/100 pts`
        : 'calibrated your 4 score pillars';

    coachReply = `${greeting}I've updated your game for ${next.focusLabel}, resized your animated buckets, and ${weightSummary}. You can refine any target anytime—just tell me!`;
  } else {
    coachReply =
      "I'm ready to tune your game! Try telling me a specific target like \"Save $12,000 for a house down payment\", \"Crush $6,000 of credit card debt\", or \"Grow investments to $25k\".";
  }

  next.chatHistory = [
    ...currentProfile.chatHistory.slice(-9),
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
  return { profile: saved, reply: coachReply, changes };
}
