import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE = 'finance-tracker:supabase-config:v1';
const STORAGE_KEY_PLAID = 'finance-tracker:plaid-config:v1';

const DEFAULT_SUPABASE_URL = 'https://bilryjjivfslyipdhgsk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbHJ5amppdmZzbHlpcGRoZ3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMTI2MDEsImV4cCI6MjEwODc4ODYwMX0.t9mdbey2K_Dt0gyXLZ9AMa9pbKGe3Ro2wE-gCrWs9qo';

export function getSupabaseConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPABASE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) return parsed;
    }
  } catch {
    // ignore
  }

  return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
}

export function saveSupabaseConfig(url, anonKey) {
  try {
    localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
  } catch {
    // ignore
  }
}

export function getPlaidConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAID);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { clientId: '', secret: '', env: 'sandbox' };
}

export function savePlaidConfig(clientId, secret, env = 'sandbox') {
  try {
    localStorage.setItem(
      STORAGE_KEY_PLAID,
      JSON.stringify({ clientId: clientId.trim(), secret: secret.trim(), env }),
    );
  } catch {
    // ignore
  }
}

export function getSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

/**
 * Invokes the Plaid edge function on Supabase.
 * @param {string} action - 'create-link-token' | 'exchange-token' | 'sync'
 * @param {object} payload
 */
export async function callPlaidApi(action, payload = {}) {
  const { url, anonKey } = getSupabaseConfig();
  const plaid = getPlaidConfig();

  const fullPayload = {
    action,
    plaid_client_id: plaid.clientId || undefined,
    plaid_secret: plaid.secret || undefined,
    plaid_env: plaid.env || 'development',
    ...payload,
  };

  // Invoke Supabase Edge Function
  if (url && anonKey) {
    const endpoint = `${url.replace(/\/$/, '')}/functions/v1/plaid`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify(fullPayload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Supabase function error: ${res.statusText}`);
    }

    return data;
  }

  // Fallback to local /api route
  const localEndpoints = {
    'create-link-token': '/api/create-link-token',
    'exchange-token': '/api/exchange-token',
    sync: '/api/sync',
  };

  const localRes = await fetch(localEndpoints[action] || '/api/create-link-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullPayload),
  });

  const localData = await localRes.json().catch(() => ({}));
  if (!localRes.ok) {
    throw new Error(localData.error || `API error: ${localRes.statusText}`);
  }

  return localData;
}
