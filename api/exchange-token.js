import { plaidClient, isConfigured } from './_plaid.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { public_token, institution, accounts } = req.body || {};

  if (!isConfigured) {
    // Demo mode: Return simulated linked institution
    return res.status(200).json({
      success: true,
      demoMode: true,
      item: {
        institution: institution?.name || 'Linked Financial Institution',
        accounts: accounts || [
          { id: 'demo-1', name: 'Primary Checking', type: 'depository', subtype: 'checking', balance: 3420.50 },
        ],
      },
    });
  }

  if (!public_token) {
    return res.status(400).json({ error: 'Missing public_token' });
  }

  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Fetch account details to return to the frontend
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    return res.status(200).json({
      success: true,
      access_token: accessToken,
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
    });
  } catch (error) {
    console.error('Error exchanging token:', error?.response?.data || error);
    return res.status(500).json({
      error: error?.response?.data?.error_message || error.message || 'Failed to exchange public token',
    });
  }
}

