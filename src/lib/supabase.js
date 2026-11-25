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

export const DEFAULT_PLAID_CLIENT_ID = '6ae243721cb88b000d857aa3';
const PLAID_CLOUD_RELAY_TOPIC = 'fhinostr_plaid_keys_v1';

export function getPlaidConfig() {
  const envClientId = import.meta.env?.VITE_PLAID_CLIENT_ID || DEFAULT_PLAID_CLIENT_ID;
  const envSecret = import.meta.env?.VITE_PLAID_SECRET || '';
  const envPlaidEnv = import.meta.env?.VITE_PLAID_ENV || 'production';

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAID);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        clientId: (parsed.clientId || envClientId || DEFAULT_PLAID_CLIENT_ID).trim(),
        secret: (parsed.secret || envSecret || '').trim(),
        env: parsed.env === 'sandbox' ? 'sandbox' : (parsed.env || envPlaidEnv || 'production'),
      };
    }
  } catch {
    // ignore
  }
  return {
    clientId: envClientId || DEFAULT_PLAID_CLIENT_ID,
    secret: envSecret || '',
    env: envPlaidEnv || 'production',
  };
}

export async function pushPlaidConfigToCloud(config) {
  if (!config?.clientId || !config?.secret) return;
  try {
    await fetch(`https://ntfy.sh/${PLAID_CLOUD_RELAY_TOPIC}`, {
      method: 'POST',
      headers: { Title: 'Plaid Config Sync' },
      body: JSON.stringify({
        clientId: config.clientId.trim(),
        secret: config.secret.trim(),
        env: config.env || 'production',
        updatedAt: Date.now(),
      }),
    });
  } catch {
    // ignore network errors
  }
}

export async function pullPlaidConfigFromCloud() {
  try {
    const current = getPlaidConfig();
    if (current.clientId && current.secret) {
      // If this device already has the secret, ensure cloud relay also has it for other devices
      pushPlaidConfigToCloud(current);
      return current;
    }

    const res = await fetch(`https://ntfy.sh/${PLAID_CLOUD_RELAY_TOPIC}/json?poll=1&since=all`);
    if (!res.ok) return current;
    const rawText = await res.text();
    const lines = rawText.trim().split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const event = JSON.parse(lines[i]);
        if (event.message) {
          const parsed = JSON.parse(event.message);
          if (parsed?.clientId && parsed?.secret) {
            const cleanConfig = {
              clientId: parsed.clientId.trim(),
              secret: parsed.secret.trim(),
              env: parsed.env || 'production',
            };
            localStorage.setItem(STORAGE_KEY_PLAID, JSON.stringify(cleanConfig));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('finance-tracker:plaid-updated', { detail: cleanConfig }));
            }
            return cleanConfig;
          }
        }
      } catch {
        // continue
      }
    }
  } catch {
    // ignore
  }
  return getPlaidConfig();
}

export function savePlaidConfig(clientId, secret, env = 'production') {
  try {
    const cleanConfig = {
      clientId: (clientId || DEFAULT_PLAID_CLIENT_ID).trim(),
      secret: secret.trim(),
      env: env || 'production',
    };
    localStorage.setItem(STORAGE_KEY_PLAID, JSON.stringify(cleanConfig));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finance-tracker:plaid-updated', { detail: cleanConfig }));
    }
    pushPlaidConfigToCloud(cleanConfig);
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
