// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This serves as the Supabase Edge Function for Plaid + Robinhood integrations.

import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'npm:plaid@^31.0.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const PLAID_CLIENT_ID = (Deno.env.get('PLAID_CLIENT_ID') || body.plaid_client_id || '').trim();
  const PLAID_SECRET = (Deno.env.get('PLAID_SECRET') || body.plaid_secret || '').trim();
  const rawEnv = (Deno.env.get('PLAID_ENV') || body.plaid_env || 'sandbox').toLowerCase().trim();
  const PLAID_ENV = rawEnv === 'production' ? 'production' : 'sandbox';

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return new Response(
      JSON.stringify({
        error: 'Plaid secrets (PLAID_CLIENT_ID, PLAID_SECRET) are missing. Enter them in the app settings below or set them in Supabase Secrets.',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const configuration = new Configuration({
    basePath: PLAID_ENV === 'production' ? PlaidEnvironments.production : PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
    },
  });

  const plaidClient = new PlaidApi(configuration);

  try {
    const { action, public_token, access_token, account_type } = body;

    // 1. Create Link Token
    if (action === 'create-link-token') {
      const isInvestment = account_type === 'investment';
      // Banks require transactions; Robinhood/brokerages require investments
      const products = isInvestment ? [Products.Investments] : [Products.Transactions];

      const linkTokenRequest: any = {
        user: { client_user_id: 'user-default' },
        client_name: 'Personal Finance Tracker',
        products,
        country_codes: [CountryCode.Us],
        language: 'en',
      };

      const response = await plaidClient.linkTokenCreate(linkTokenRequest);

      return new Response(
        JSON.stringify({ link_token: response.data.link_token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Exchange Public Token
    if (action === 'exchange-token') {
      if (!public_token) {
        return new Response(
          JSON.stringify({ error: 'Missing public_token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
      const itemAccessToken = exchangeResponse.data.access_token;
      const itemId = exchangeResponse.data.item_id;

      const accountsResponse = await plaidClient.accountsGet({ access_token: itemAccessToken });

      return new Response(
        JSON.stringify({
          success: true,
          access_token: itemAccessToken,
          item_id: itemId,
          accounts: accountsResponse.data.accounts.map((acc: any) => {
            let balance = acc.balances.current;
            if (acc.type === 'depository' && acc.balances.available != null) {
              // Prioritize available balance for checking/savings so pending debits/purchases are deducted immediately
              balance = acc.balances.available;
            } else if (acc.type === 'credit' && acc.balances.limit != null && acc.balances.available != null) {
              const pendingOwed = acc.balances.limit - acc.balances.available;
              balance = Math.max(acc.balances.current || 0, pendingOwed);
            }
            return {
              id: acc.account_id,
              name: acc.name,
              officialName: acc.official_name,
              type: acc.type,
              subtype: acc.subtype,
              balance: balance != null ? balance : 0,
              current: acc.balances.current,
              available: acc.balances.available,
              limit: acc.balances.limit,
              mask: acc.mask,
            };
          }),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Sync Accounts & Holdings
    if (action === 'sync') {
      if (!access_token) {
        return new Response(
          JSON.stringify({ error: 'Missing access_token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const results: Record<string, unknown> = {};

      if (account_type === 'investment') {
        let totalValue = 0;
        let holdingsList: any[] = [];
        try {
          const invRes = await plaidClient.investmentsHoldingsGet({ access_token });
          holdingsList = (invRes.data.holdings || []).map((h: any) => {
            const sec = invRes.data.securities?.find((s: any) => s.security_id === h.security_id);
            return {
              account_id: h.account_id,
              symbol: sec?.ticker_symbol || 'N/A',
              name: sec?.name || 'Holding',
              quantity: h.quantity,
              value: h.institution_value,
            };
          });
          totalValue = holdingsList.reduce(
            (sum: number, h: any) => sum + (Number(h.value) || 0),
            0,
          );
        } catch (e: any) {
          console.warn('Investments holdings error:', e?.message);
        }

        results.investments = {
          totalValue,
          holdings: holdingsList,
        };
      }

      // Always fetch fresh account balances (checking, savings, credit cards, investments)
      try {
        const accRes = await plaidClient.accountsGet({ access_token });
        const allHoldings = (results.investments as any)?.holdings || [];

        results.accounts = accRes.data.accounts.map((acc: any) => {
          let balance = acc.balances.current;
          const accountHoldings = allHoldings.filter((h: any) => h.account_id === acc.account_id);
          const accountHoldingsVal = accountHoldings.reduce((sum: number, h: any) => sum + (Number(h.value) || 0), 0);

          if (acc.type === 'depository' && acc.balances.available != null) {
            // Prioritize available balance for checking/savings so pending debits/purchases are deducted immediately
            balance = acc.balances.available;
          } else if (acc.type === 'credit' && acc.balances.limit != null && acc.balances.available != null) {
            const pendingOwed = acc.balances.limit - acc.balances.available;
            balance = Math.max(acc.balances.current || 0, pendingOwed);
          } else if ((acc.type === 'investment' || acc.subtype === 'brokerage' || acc.subtype === 'crypto') && (balance == null || balance === 0) && accountHoldingsVal > 0) {
            balance = accountHoldingsVal;
          }

          return {
            id: acc.account_id,
            name: acc.name,
            officialName: acc.official_name,
            type: acc.type,
            subtype: acc.subtype,
            balance: balance != null ? balance : 0,
            current: acc.balances.current,
            available: acc.balances.available,
            limit: acc.balances.limit,
            mask: acc.mask,
            holdings: accountHoldings,
          };
        });

        // If Robinhood totalValue was 0 from holdings, sum up individual account balances
        if (account_type === 'investment' && results.investments) {
          const inv = results.investments as { totalValue: number; holdings: any[] };
          if (inv.totalValue === 0) {
            const totalFromAccs = accRes.data.accounts
              .filter((a: any) => a.type === 'investment' || a.subtype === 'brokerage' || a.subtype === 'crypto')
              .reduce((sum: number, a: any) => sum + (Number(a.balances?.current) || 0), 0);
            if (totalFromAccs > 0) {
              inv.totalValue = totalFromAccs;
            }
          }
        }
      } catch (e: any) {
        console.warn('Accounts balance fetch error:', e?.message);
      }

      try {
        const today = new Date().toISOString().slice(0, 10);
        const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 86400000).toISOString().slice(0, 10);

        let txList: any[] = [];
        try {
          const getRes = await plaidClient.transactionsGet({
            access_token,
            start_date: thirtyFiveDaysAgo,
            end_date: today,
            options: {
              count: 100,
              include_original_description: true,
            },
          });
          if (Array.isArray(getRes.data?.transactions) && getRes.data.transactions.length > 0) {
            txList = getRes.data.transactions;
          }
        } catch (getErr: any) {
          console.warn('transactionsGet fallback:', getErr?.message);
        }

        // Also check transactionsSync if transactionsGet returned nothing
        if (txList.length === 0) {
          try {
            const syncRes = await plaidClient.transactionsSync({ access_token });
            txList = [...(syncRes.data.added || []), ...(syncRes.data.modified || [])];
          } catch (syncErr: any) {
            console.warn('transactionsSync error:', syncErr?.message);
          }
        }

        const accountMap = new Map((results.accounts as any[] || []).map((a: any) => [a.id, a]));

        results.transactions = txList.map((tx: any) => {
          const acc = accountMap.get(tx.account_id);
          const isCredit = acc?.type === 'credit' || acc?.subtype?.toLowerCase().includes('credit');
          const primaryCat = tx.personal_finance_category?.primary || tx.category?.[0] || 'Other';
          const catLower = primaryCat.toLowerCase();
          const nameLower = (tx.merchant_name || tx.name || '').toLowerCase();

          const isTransferOrPayment =
            catLower.includes('loan_payments') ||
            catLower.includes('transfer') ||
            catLower.includes('payment') ||
            nameLower.includes('payment') ||
            nameLower.includes('autopay') ||
            nameLower.includes('credit card');

          let kind = 'expense';
          if (isCredit) {
            // Credit card transactions: positive is purchase/charge, negative is payment toward balance (never income!)
            kind = tx.amount < 0 ? 'payment' : 'expense';
          } else {
            // Depository / Bank account: negative is money coming in. Exclude loan payments and transfers from income.
            if (tx.amount < 0) {
              kind = isTransferOrPayment ? 'transfer' : 'income';
            } else {
              kind = 'expense';
            }
          }

          return {
            id: tx.transaction_id,
            name: tx.merchant_name || tx.name,
            amount: Math.abs(tx.amount),
            kind,
            category: primaryCat,
            date: tx.authorized_date || tx.date,
            pending: Boolean(tx.pending),
            accountId: tx.account_id,
            isCredit,
          };
        });
      } catch (e: any) {
        console.warn('Transactions sync error:', e?.message);
      }

      return new Response(
        JSON.stringify(results),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.response?.data?.error_message || err?.message || 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
