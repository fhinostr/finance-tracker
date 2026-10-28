import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE = 'finance-tracker:supabase-config:v1';

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

export function getSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

/**
 * Invokes the Plaid edge function or falls back to local /api if configured.
 * @param {string} action - 'create-link-token' | 'exchange-token' | 'sync'
 * @param {object} payload
 */
export async function callPlaidApi(action, payload = {}) {
  const { url, anonKey } = getSupabaseConfig();

  // If Supabase is configured, invoke the Supabase Edge Function
  if (url && anonKey) {
    const endpoint = `${url.replace(/\/$/, '')}/functions/v1/plaid`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Supabase function error: ${res.statusText}`);
    }

    return await res.json();
  }

  // Fallback to local /api route (if running in an environment with serverless routes)
  const localEndpoints = {
    'create-link-token': '/api/create-link-token',
    'exchange-token': '/api/exchange-token',
    sync: '/api/sync',
  };

  const localRes = await fetch(localEndpoints[action] || '/api/create-link-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!localRes.ok) {
    const err = await localRes.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${localRes.statusText}`);
  }

  return await localRes.json();
}

