import { Products, CountryCode } from 'plaid';
import { plaidClient, isConfigured } from './_plaid.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // If Plaid keys are not set up yet in environment, return a helpful status
  if (!isConfigured) {
    return res.status(200).json({
      demoMode: true,
      message: 'Plaid API keys not yet detected in environment. Operating in sandbox demo mode.',
    });
  }

  try {
    const products = (process.env.PLAID_PRODUCTS || 'transactions,investments')
      .split(',')
      .map((p) => p.trim())
      .filter((p) => Object.values(Products).includes(p));

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'user-' + (req.body?.userId || 'default') },
      client_name: 'Personal Finance Tracker',
      products: products.length > 0 ? products : [Products.Transactions, Products.Investments],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    return res.status(200).json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating Plaid link token:', error?.response?.data || error);
    return res.status(500).json({
      error: error?.response?.data?.error_message || error.message || 'Failed to create link token',
    });
  }
}
