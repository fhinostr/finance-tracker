import { getGoalAccountMapping, saveGoalAccountMapping, saveStoredAccounts } from './store.js';
import { getGameProfile, saveGameProfile, DEFAULT_GAME_PROFILE } from './goalEngine.js';

const STORAGE_KEY_USERS = 'finance-tracker:vault-users:v1';
const STORAGE_KEY_LAST_USER_ID = 'finance-tracker:vault-last-user:v1';
const STORAGE_KEY_MAIN = 'finance-tracker:v2';
const STORAGE_KEY_ACCOUNTS = 'finance-tracker:linked-accounts:v1';

function bytesToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(base64url) {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function fallbackHash(input) {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

export async function hashSecret(secret, salt) {
  const combined = `${salt}:${secret}`;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const encoded = new TextEncoder().encode(combined);
      const digest = await window.crypto.subtle.digest('SHA-256', encoded);
      return bytesToBase64Url(digest);
    } catch {
      return fallbackHash(combined);
    }
  }
  return fallbackHash(combined);
}

export function getVaultUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveVaultUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch {
    // ignore
  }
}

export function getLastActiveUser() {
  const users = getVaultUsers();
  if (users.length === 0) return null;
  try {
    const lastId = localStorage.getItem(STORAGE_KEY_LAST_USER_ID);
    if (lastId) {
      const found = users.find((u) => u.id === lastId);
      if (found) return found;
    }
  } catch {
    // ignore
  }
  return users[0];
}

export function setLastActiveUserId(userId) {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_USER_ID, userId);
  } catch {
    // ignore
  }
}

/**
 * Saves and switches per-user local workspaces when multiple people share one device.
 */
export function saveUserWorkspace(userId) {
  if (!userId) return;
  try {
    const main = localStorage.getItem(STORAGE_KEY_MAIN);
    const accounts = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    const goalAccounts = getGoalAccountMapping();
    const gameProfile = getGameProfile();
    const bundle = {
      main: main ? JSON.parse(main) : { entries: [], budgets: {} },
      accounts: accounts ? JSON.parse(accounts) : [],
      goalAccounts,
      gameProfile,
    };
    localStorage.setItem(`finance-tracker:user-vault:${userId}`, JSON.stringify(bundle));
  } catch {
    // ignore
  }
}

export function activateUserWorkspace(userId, isFirstUserOnDevice = false) {
  if (!userId) return;
  const previousUserId = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY_LAST_USER_ID);
    } catch {
      return null;
    }
  })();

  if (previousUserId && previousUserId !== userId) {
    saveUserWorkspace(previousUserId);
  }

  try {
    const rawBundle = localStorage.getItem(`finance-tracker:user-vault:${userId}`);
    if (rawBundle) {
      const bundle = JSON.parse(rawBundle);
      localStorage.setItem(STORAGE_KEY_MAIN, JSON.stringify(bundle.main || { entries: [], budgets: {} }));
      saveStoredAccounts(bundle.accounts || []);
      saveGoalAccountMapping(bundle.goalAccounts || {});
      saveGameProfile(bundle.gameProfile || DEFAULT_GAME_PROFILE);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('finance-tracker:data-synced', { detail: bundle }));
      }
    } else if (!isFirstUserOnDevice) {
      // Brand new secondary user on this device starts with a clean $0.00 slate
      localStorage.setItem(STORAGE_KEY_MAIN, JSON.stringify({ entries: [], budgets: {} }));
      saveStoredAccounts([]);
      saveGoalAccountMapping({});
      saveGameProfile({ ...DEFAULT_GAME_PROFILE });
      saveUserWorkspace(userId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('finance-tracker:data-synced', { detail: {} }));
      }
    } else {
      // First user registered on this device adopts existing local accounts & transactions seamlessly
      saveUserWorkspace(userId);
    }
  } catch {
    // ignore
  }

  setLastActiveUserId(userId);
}

/**
 * Checks if WebAuthn platform biometrics (Face ID / Touch ID / Windows Hello) are supported.
 */
export async function checkBiometricSupport() {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    !navigator.credentials ||
    !window.isSecureContext
  ) {
    return false;
  }
  try {
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a new local vault account with hashed password/PIN.
 */
export async function createVaultUser({ name, username, password }) {
  const cleanName = (name || '').trim() || 'Member';
  const cleanUsername = (username || cleanName).trim().toLowerCase();
  if (!password || password.length < 4) {
    throw new Error('Please choose a password or PIN with at least 4 characters.');
  }

  const users = getVaultUsers();
  if (users.some((u) => u.username === cleanUsername)) {
    throw new Error('That username already exists on this device. Please sign in instead.');
  }

  const isFirstUser = users.length === 0;
  const randomBytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  }
  const salt = bytesToBase64Url(randomBytes.buffer);
  const passwordHash = await hashSecret(password, salt);

  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    username: cleanUsername,
    salt,
    passwordHash,
    faceIdEnabled: false,
    faceIdCredentialId: null,
    createdAt: Date.now(),
  };

  const nextUsers = [...users, newUser];
  saveVaultUsers(nextUsers);
  activateUserWorkspace(newUser.id, isFirstUser);
  return newUser;
}

/**
 * Verifies username + password/PIN and activates the user's workspace.
 */
export async function verifyPasswordLogin(username, password) {
  const cleanUsername = (username || '').trim().toLowerCase();
  const users = getVaultUsers();
  const user = users.find((u) => u.username === cleanUsername || u.name.toLowerCase() === cleanUsername);
  if (!user) {
    throw new Error('Account not found. Check your username or create an account.');
  }
  const computed = await hashSecret(password || '', user.salt);
  if (computed !== user.passwordHash) {
    throw new Error('Incorrect password or PIN.');
  }
  activateUserWorkspace(user.id, users.length === 1);
  return user;
}

/**
 * Enrolls Apple Face ID / Touch ID / Platform Passkey via WebAuthn for quick bank-app unlock.
 */
export async function registerFaceIdForUser(user) {
  if (!user) throw new Error('No user selected');
  const supported = await checkBiometricSupport();
  if (!supported) {
    throw new Error('Face ID / Touch ID is not available in this browser.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  const userIdBytes = new TextEncoder().encode(user.id);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Wealth & Health Tracker',
        id: window.location.hostname,
      },
      user: {
        id: userIdBytes,
        name: user.username,
        displayName: user.name,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256 (Apple Face ID / Touch ID)
        { type: 'public-key', alg: -257 }, // RS256 (Windows Hello / Android)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  });

  if (!credential || !credential.rawId) {
    throw new Error('Face ID setup was cancelled.');
  }

  const credentialId = bytesToBase64Url(credential.rawId);
  const users = getVaultUsers();
  const updatedUsers = users.map((u) =>
    u.id === user.id
      ? { ...u, faceIdEnabled: true, faceIdCredentialId: credentialId }
      : u,
  );
  saveVaultUsers(updatedUsers);
  return updatedUsers.find((u) => u.id === user.id) || user;
}

/**
 * Prompts native iOS Face ID / Touch ID hardware scan to unlock the user's account.
 */
export async function unlockWithFaceId(user) {
  if (!user?.faceIdCredentialId) {
    throw new Error('Face ID has not been enabled for this account yet. Sign in once with your password to enable Face ID.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [
        {
          type: 'public-key',
          id: base64UrlToBytes(user.faceIdCredentialId),
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  if (!assertion) {
    throw new Error('Face ID verification did not complete.');
  }

  const users = getVaultUsers();
  activateUserWorkspace(user.id, users.length === 1);
  return user;
}
