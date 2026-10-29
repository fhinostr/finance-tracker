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
            if (acc.type === 'depository' && (balance === null || balance === undefined)) {
              balance = acc.balances.available;
            }
            return {
              id: acc.account_id,
              name: acc.name,
              officialName: acc.official_name,
              type: acc.type,
              subtype: acc.subtype,
              balance: balance != null ? balance : 0,
              available: acc.balances.available,
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
        results.accounts = accRes.data.accounts.map((acc: any) => {
          let balance = acc.balances.current;
          if (acc.type === 'depository' && (balance === null || balance === undefined)) {
            balance = acc.balances.available;
          }
          return {
            id: acc.account_id,
            name: acc.name,
            officialName: acc.official_name,
            type: acc.type,
            subtype: acc.subtype,
            balance: balance != null ? balance : 0,
            available: acc.balances.available,
            mask: acc.mask,
          };
        });

        // If Robinhood totalValue was 0 from holdings, check account balance
        if (account_type === 'investment' && results.investments) {
          const inv = results.investments as { totalValue: number; holdings: any[] };
          if (inv.totalValue === 0) {
            const invAcc = accRes.data.accounts.find(
              (a: any) => a.type === 'investment' || a.subtype === 'brokerage',
            );
            if (invAcc && invAcc.balances?.current != null) {
              inv.totalValue = Number(invAcc.balances.current) || 0;
            }
          }
        }
      } catch (e: any) {
        console.warn('Accounts balance fetch error:', e?.message);
      }

      try {
        const syncRes = await plaidClient.transactionsSync({ access_token });
        results.transactions = syncRes.data.added.map((tx: any) => ({
          id: tx.transaction_id,
          name: tx.name,
          amount: Math.abs(tx.amount),
          kind: tx.amount < 0 ? 'income' : 'expense',
          category: tx.personal_finance_category?.primary || tx.category?.[0] || 'Other',
          date: tx.date,
        }));
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
