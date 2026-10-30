import { getSupabaseClient } from './supabase.js';

const STORAGE_KEY_MAIN = 'finance-tracker:v2';
const STORAGE_KEY_ACCOUNTS = 'finance-tracker:linked-accounts:v1';
const STORAGE_KEY_PLAID = 'finance-tracker:plaid-config:v1';
const STORAGE_KEY_SYNC_TIME = 'finance-tracker:last-cloud-sync';

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
 * If found, applies it automatically and clears the hash.
 */
export async function checkAndApplyUrlSync() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  if (!hash.startsWith('#sync=')) return null;

  try {
    const payloadStr = hash.replace(/^#sync=/, '');
    const snapshot = await decompressData(payloadStr);
    const success = applyLocalSnapshot(snapshot);
    if (success) {
      // Clean URL hash without triggering page reload
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return snapshot;
    }
  } catch (err) {
    console.error('URL Sync error:', err);
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

