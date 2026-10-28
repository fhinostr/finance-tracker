import { plaidClient, isConfigured } from './_plaid.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { access_token, account_type } = req.body || {};

  if (!isConfigured || !access_token) {
    // Return sample sync payload for demonstration
    const today = new Date().toISOString().slice(0, 10);
    return res.status(200).json({
      demoMode: true,
      transactions: [
        { id: 'tx-demo-1', name: 'Trader Joe\'s', amount: 64.20, category: 'Groceries', date: today },
        { id: 'tx-demo-2', name: 'Shell Oil', amount: 38.50, category: 'Gas', date: today },
      ],
      investments: {
        totalValue: 8450.00,
        holdings: [
          { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', quantity: 12, value: 5880.00 },
          { symbol: 'AAPL', name: 'Apple Inc.', quantity: 11, value: 2570.00 },
        ],
      },
    });
  }

  try {
    const results = {};

    // If it's an investment account or Robinhood
    if (account_type === 'investment' || !account_type) {
      try {
        const invRes = await plaidClient.investmentsHoldingsGet({ access_token });
        const totalValue = invRes.data.holdings.reduce(
          (sum, h) => sum + (h.institution_value || 0),
          0,
        );
        results.investments = {
          totalValue,
          holdings: invRes.data.holdings.map((h) => {
            const sec = invRes.data.securities.find((s) => s.security_id === h.security_id);
            return {
              symbol: sec?.ticker_symbol || 'N/A',
              name: sec?.name || 'Holding',
              quantity: h.quantity,
              value: h.institution_value,
            };
          }),
        };
      } catch (err) {
        console.warn('Investments check skipped or not supported on this item:', err?.message);
      }
    }

    // Pull transactions
    try {
      const syncRes = await plaidClient.transactionsSync({ access_token });
      results.transactions = syncRes.data.added.map((tx) => ({
        id: tx.transaction_id,
        name: tx.name,
        amount: Math.abs(tx.amount),
        kind: tx.amount < 0 ? 'income' : 'expense',
        category: tx.personal_finance_category?.primary || tx.category?.[0] || 'Other',
        date: tx.date,
      }));
    } catch (err) {
      console.warn('Transactions sync skipped:', err?.message);
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error syncing account:', error?.response?.data || error);
    return res.status(500).json({
      error: error?.response?.data?.error_message || error.message || 'Failed to sync data',
    });
  }
}
