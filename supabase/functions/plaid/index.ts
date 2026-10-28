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

  const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID') || '';
  const PLAID_SECRET = Deno.env.get('PLAID_SECRET') || '';
  const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return new Response(
      JSON.stringify({
        error: 'Plaid secrets (PLAID_CLIENT_ID, PLAID_SECRET) are missing from Supabase Edge Function Secrets.',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV] || PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
    },
  });

  const plaidClient = new PlaidApi(configuration);

  try {
    const { action, public_token, access_token, account_type } = await req.json();

    // 1. Create Link Token
    if (action === 'create-link-token') {
      const response = await plaidClient.linkTokenCreate({
        user: { client_user_id: 'user-default' },
        client_name: 'Personal Finance Tracker',
        products: [Products.Transactions, Products.Investments],
        country_codes: [CountryCode.Us],
        language: 'en',
      });

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
          accounts: accountsResponse.data.accounts.map((acc) => ({
            id: acc.account_id,
            name: acc.name,
            officialName: acc.official_name,
            type: acc.type,
            subtype: acc.subtype,
            balance: acc.balances.current,
            available: acc.balances.available,
            mask: acc.mask,
          })),
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
        } catch (e: any) {
          console.warn('Investments holdings error:', e?.message);
        }
      }

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

