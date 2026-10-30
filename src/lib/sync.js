import { getSupabaseClient } from './supabase.js';

const STORAGE_KEY_MAIN = 'finance-tracker:v2';
const STORAGE_KEY_ACCOUNTS = 'finance-tracker:linked-accounts:v1';
const STORAGE_KEY_PLAID = 'finance-tracker:plaid-config:v1';
const STORAGE_KEY_SYNC_TIME = 'finance-tracker:last-cloud-sync';
const STORAGE_KEY_SYNC_TOPIC = 'finance-tracker:sync-topic';

export const DEFAULT_SYNC_TOPIC = 'fhinostr_wealth_sync';

export function getSyncTopic() {
  try {
    return localStorage.getItem(STORAGE_KEY_SYNC_TOPIC) || DEFAULT_SYNC_TOPIC;
  } catch {
    return DEFAULT_SYNC_TOPIC;
  }
}

export function saveSyncTopic(topic) {
  try {
    const clean = (topic || DEFAULT_SYNC_TOPIC).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    localStorage.setItem(STORAGE_KEY_SYNC_TOPIC, clean || DEFAULT_SYNC_TOPIC);
    return clean || DEFAULT_SYNC_TOPIC;
  } catch {
    return DEFAULT_SYNC_TOPIC;
  }
}

/**
 * Pushes the current local data snapshot to the secure cloud relay.
 */
export async function pushSyncToRelay(topic = getSyncTopic()) {
  const snapshot = getLocalSnapshot();
  const payloadStr = JSON.stringify(snapshot);

  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: 'POST',
    headers: {
      Title: 'Finance Sync',
      Tags: 'sync',
      Priority: 'urgent',
    },
    body: payloadStr,
  });

  if (!res.ok) {
    throw new Error(`Sync relay push failed with status ${res.status}`);
  }

  localStorage.setItem(STORAGE_KEY_SYNC_TIME, String(Date.now()));
  return { success: true, timestamp: Date.now() };
}

/**
 * Pulls the latest data snapshot from the cloud relay.
 */
export async function pullSyncFromRelay(topic = getSyncTopic()) {
  const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1`);
  if (!res.ok) {
    throw new Error(`Sync relay poll failed with status ${res.status}`);
  }

  const rawText = await res.text();
  const lines = rawText.trim().split('\n').filter(Boolean);
  if (lines.length === 0) {
    throw new Error('No sync data found on cloud channel yet. Push from your laptop first.');
  }

  // Parse latest message event
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (parsed.message) {
        const snapshot = JSON.parse(parsed.message);
        if (snapshot && typeof snapshot === 'object' && (snapshot.accounts || snapshot.main)) {
          applyLocalSnapshot(snapshot);
          return { success: true, snapshot };
        }
      }
    } catch {
      // continue searching backwards
    }
  }

  throw new Error('Unable to parse data from sync relay');
}

/**
 * Generates an ultra-short, reliable sync URL (only ~55 chars) for QR codes.
 */
export function generateRelaySyncUrl(topic = getSyncTopic()) {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}#sync-code=${topic}`;
}

/**
 * Compresses an arbitrary JS object into a compact, URL-safe Base64 string.
 */
export async function compressData(dataObj) {
  const jsonStr = JSON.stringify(dataObj);
  const stream = new Blob([jsonStr]).stream().pipeThrough(new CompressionStream('gzip'));
  const compressedBuffer = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(compressedBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decompresses a URL-safe Base64 string back into a JS object.
 */
export async function decompressData(base64Str) {
  const binary = atob(base64Str.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const decompressStream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const decompressedText = await new Response(decompressStream).text();
  return JSON.parse(decompressedText);
}

/**
 * Packs all local finance tracker data into an exportable bundle.
 * Strips verbose raw Plaid metadata to keep the sync payload ultra-lightweight.
 */
export function getLocalSnapshot() {
  let main = { entries: [], budgets: {} };
  let accounts = [];
  let plaid = {};

  try {
    const rawMain = localStorage.getItem(STORAGE_KEY_MAIN);
    if (rawMain) main = JSON.parse(rawMain);
  } catch {}

  try {
    const rawAcc = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (rawAcc) accounts = JSON.parse(rawAcc);
  } catch {}

  try {
    const rawPlaid = localStorage.getItem(STORAGE_KEY_PLAID);
    if (rawPlaid) plaid = JSON.parse(rawPlaid);
  } catch {}

  // Strip non-essential raw Plaid metadata from entries to reduce payload by >85%
  const cleanEntries = (main.entries || []).map((e) => ({
    id: e.id,
    name: e.name,
    amount: Number(e.amount) || 0,
    kind: e.kind || 'expense',
    category: e.category || 'Other',
    date: e.date,
    frequency: e.frequency,
    pending: Boolean(e.pending),
    debtId: e.debtId,
    note: e.note,
  }));

  const cleanAccounts = (accounts || []).map((a) => ({
    id: a.id,
    name: a.name,
    balance: Number(a.balance) || 0,
    type: a.type,
    subtype: a.subtype,
    mask: a.mask,
    accessToken: a.accessToken,
  }));

  const cleanBudgets = main.budgets || {};

  const cleanPlaid = {
    clientId: plaid.clientId || '',
    secret: plaid.secret || '',
    env: plaid.env || 'sandbox',
  };

  return {
    version: 2,
    timestamp: Date.now(),
    main: {
      entries: cleanEntries,
      budgets: cleanBudgets,
    },
    accounts: cleanAccounts,
    plaid: cleanPlaid,
  };
}

/**
 * Restores a snapshot into localStorage and triggers all UI reload events.
 */
export function applyLocalSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;

  try {
    if (snapshot.main) {
      localStorage.setItem(STORAGE_KEY_MAIN, JSON.stringify(snapshot.main));
    }
    if (Array.isArray(snapshot.accounts)) {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(snapshot.accounts));
    }
    if (snapshot.plaid) {
      localStorage.setItem(STORAGE_KEY_PLAID, JSON.stringify(snapshot.plaid));
    }
    localStorage.setItem(STORAGE_KEY_SYNC_TIME, String(Date.now()));

    // Broadcast update events so React state in active tabs re-reads immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finance-tracker:accounts-updated', { detail: snapshot.accounts || [] }));
      window.dispatchEvent(new CustomEvent('finance-tracker:data-synced', { detail: snapshot }));
    }
    return true;
  } catch (err) {
    console.error('Failed to apply sync snapshot:', err);
    return false;
  }
}

/**
 * Generates a full sync URL containing the compressed data payload.
 */
export async function generateSyncUrl() {
  const snapshot = getLocalSnapshot();
  const compressed = await compressData(snapshot);
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}#sync=${compressed}`;
}

/**
 * Checks on application startup if a sync hash is present in the URL.
 * Supports both #sync-code=<topic> (cloud relay) and #sync=<compressed> (direct payload).
 */
export async function checkAndApplyUrlSync() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';

  // 1. Cloud Relay Sync Code (#sync-code=...)
  if (hash.startsWith('#sync-code=')) {
    try {
      const topic = hash.replace(/^#sync-code=/, '').trim();
      if (topic) {
        saveSyncTopic(topic);
        const res = await pullSyncFromRelay(topic);
        if (res?.success) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          return res.snapshot;
        }
      }
    } catch (err) {
      console.error('URL Sync-Code error:', err);
    }
    return null;
  }

  // 2. Direct Compressed URL Payload (#sync=...)
  if (hash.startsWith('#sync=')) {
    try {
      const payloadStr = hash.replace(/^#sync=/, '');
      const snapshot = await decompressData(payloadStr);
      const success = applyLocalSnapshot(snapshot);
      if (success) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        return snapshot;
      }
    } catch (err) {
      console.error('URL Sync error:', err);
    }
  }

  return null;
}

/**
 * Cloud Sync (Supabase): Pushes current snapshot to Supabase if table exists.
 */
export async function pushToCloudSync() {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: 'Supabase client not configured' };

  const snapshot = getLocalSnapshot();
  const { data, error } = await supabase.from('finance_sync').upsert({
    id: 'primary',
    data: snapshot,
    updated_at: new Date().toISOString(),
  });

  if (!error) {
    localStorage.setItem(STORAGE_KEY_SYNC_TIME, String(Date.now()));
  }
  return { data, error };
}

/**
 * Cloud Sync (Supabase): Pulls latest snapshot from Supabase if table exists.
 */
export async function pullFromCloudSync() {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: 'Supabase client not configured' };

  const { data, error } = await supabase.from('finance_sync').select('*').eq('id', 'primary').single();
  if (error) return { error };

  if (data?.data) {
    applyLocalSnapshot(data.data);
    return { success: true, data: data.data };
  }
  return { error: 'No data found' };
}

