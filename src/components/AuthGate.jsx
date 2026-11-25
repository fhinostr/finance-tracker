import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  getVaultUsers,
  getLastActiveUser,
  checkBiometricSupport,
  createVaultUser,
  verifyPasswordLogin,
  registerFaceIdForUser,
  unlockWithFaceId,
} from '../lib/auth.js';
import { processGoalChatMessage, getGameProfile, saveGameProfile } from '../lib/goalEngine.js';

/**
 * Crisp Apple-style Face ID SVG Icon
 */
function FaceIdIcon({ size = 22, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Corner scan brackets */}
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      {/* Eyes */}
      <line x1="9" y1="9" x2="9" y2="10.5" />
      <line x1="15" y1="9" x2="15" y2="10.5" />
      {/* Nose */}
      <path d="M12 9v3.5h-1" />
      {/* Smile */}
      <path d="M9.5 15.5c.8.9 1.6 1.3 2.5 1.3s1.7-.4 2.5-1.3" />
    </svg>
  );
}

export default function AuthGate({ onAuthenticated }) {
  const existingUsers = getVaultUsers();
  const initialUser = getLastActiveUser();

  const [mode, setMode] = useState(() => (existingUsers.length > 0 ? 'login' : 'signup'));
  const [users, setUsers] = useState(existingUsers);
  const [selectedUser, setSelectedUser] = useState(initialUser);
  const [biometricSupported, setBiometricSupported] = useState(false);

  // Login form state
  const [loginUsername, setLoginUsername] = useState(initialUser?.username || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [enableFaceIdOnLogin, setEnableFaceIdOnLogin] = useState(true);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupGoal, setSignupGoal] = useState('');
  const [enableFaceIdOnSignup, setEnableFaceIdOnSignup] = useState(true);

  // Shared UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isScanningFaceId, setIsScanningFaceId] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    let active = true;
    checkBiometricSupport().then((supported) => {
      if (active) setBiometricSupported(supported);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectSavedUser = (u) => {
    setSelectedUser(u);
    setLoginUsername(u.username);
    setLoginPassword('');
    setErrorMsg('');
    setStatusMsg('');
  };

  const handleFaceIdUnlock = async () => {
    const targetUser =
      selectedUser ||
      users.find((u) => u.username === loginUsername.trim().toLowerCase()) ||
      users[0];

    if (!targetUser) {
      setErrorMsg('Create your account once first to link Face ID.');
      return;
    }

    if (!targetUser.faceIdEnabled || !targetUser.faceIdCredentialId) {
      setErrorMsg(
        'Enter your password below once with "Enable Face ID" checked to pair Face ID to your account.',
      );
      setEnableFaceIdOnLogin(true);
      return;
    }

    setErrorMsg('');
    setStatusMsg('Verifying with Face ID...');
    setIsScanningFaceId(true);
    try {
      const verifiedUser = await unlockWithFaceId(targetUser);
      onAuthenticated?.(verifiedUser);
    } catch (err) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Face ID scan was cancelled. Tap "Use Face ID" to try again or enter your password.'
        : err?.message || 'Face ID could not verify. Please sign in with your password.';
      setErrorMsg(msg);
      setStatusMsg('');
    } finally {
      setIsScanningFaceId(false);
    }
  };

  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setLoading(true);
    try {
      let user = await verifyPasswordLogin(loginUsername, loginPassword);

      // If user requested to enable Face ID during this sign-in
      if (biometricSupported && !user.faceIdEnabled && enableFaceIdOnLogin) {
        try {
          setStatusMsg('Activating Face ID for next time...');
          user = await registerFaceIdForUser(user);
        } catch {
          // Non-fatal: still sign the user in even if they skipped the biometric prompt
        }
      }

      onAuthenticated?.(user);
    } catch (err) {
      setErrorMsg(err?.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setLoading(true);
    try {
      let newUser = await createVaultUser({
        name: signupName,
        username: signupUsername || signupName,
        password: signupPassword,
      });

      // Personalize Game Profile name & optional financial objective
      const currentGame = getGameProfile();
      if (signupGoal.trim()) {
        processGoalChatMessage(
          `My name is ${newUser.name}, ${signupGoal.trim()}`,
          currentGame,
        );
      } else if (newUser.name) {
        saveGameProfile({
          ...currentGame,
          playerName: newUser.name,
        });
      }

      if (biometricSupported && enableFaceIdOnSignup) {
        try {
          setStatusMsg('Scan Face ID to enable 1-tap unlock...');
          setIsScanningFaceId(true);
          newUser = await registerFaceIdForUser(newUser);
        } catch {
          // Still proceed into app if biometric prompt is dismissed
        } finally {
          setIsScanningFaceId(false);
        }
      }

      setUsers(getVaultUsers());
      onAuthenticated?.(newUser);
    } catch (err) {
      setErrorMsg(err?.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  const canDirectFaceId = Boolean(selectedUser?.faceIdEnabled && selectedUser?.faceIdCredentialId);

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans relative overflow-x-hidden flex flex-col justify-center">
      {/* iOS PWA Status Bar Shield */}
      <div
        className="fixed top-0 inset-x-0 z-50 bg-black pointer-events-none sm:hidden"
        style={{ height: 'env(safe-area-inset-top, 48px)' }}
      />

      {/* Ambient Glow Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-12 left-1/4 w-80 h-80 bg-emerald-600/15 rounded-full blur-[130px]" />
        <div className="absolute bottom-12 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-[130px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-5 pb-10 app-safe-top">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="p-6 sm:p-7 rounded-[32px] bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-2xl space-y-5"
        >
          {/* Brand Vault Emblem */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div
              className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg transition-all ${
                isScanningFaceId
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 scale-105 animate-pulse'
                  : 'bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {isScanningFaceId ? <FaceIdIcon size={32} /> : <ShieldCheck size={30} />}
            </div>

            {mode === 'login' ? (
              <>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                  Secure Financial Vault
                </span>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {selectedUser?.name ? `Welcome back, ${selectedUser.name}` : 'Sign In'}
                </h1>
                <p className="text-xs text-zinc-400">
                  Verify your identity to unlock your live balances & goals
                </p>
              </>
            ) : (
              <>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                  Private Account Setup
                </span>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Create Your Login
                </h1>
                <p className="text-xs text-zinc-400">
                  Protect your balances with a password/PIN & Face ID
                </p>
              </>
            )}
          </div>

          {/* Saved Account Switcher (if multiple friends/family share one device) */}
          {mode === 'login' && users.length > 1 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1 justify-center">
                <Users size={11} /> Choose Account
              </span>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {users.map((u) => {
                  const active = selectedUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectSavedUser(u)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        active
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {u.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status & Error Alerts */}
          {statusMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <div className="space-y-4">
              {/* Primary Bank-Style "Use Face ID" Button */}
              {(canDirectFaceId || biometricSupported) && (
                <button
                  type="button"
                  onClick={handleFaceIdUnlock}
                  disabled={isScanningFaceId || loading}
                  className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer shadow-lg ${
                    canDirectFaceId
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black'
                      : 'bg-zinc-800/90 hover:bg-zinc-700 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  <FaceIdIcon size={20} />
                  <span>
                    {isScanningFaceId
                      ? 'Scanning Face ID...'
                      : canDirectFaceId
                      ? 'Use Face ID'
                      : 'Use Face ID'}
                  </span>
                </button>
              )}

              {(canDirectFaceId || biometricSupported) && (
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                    or password / PIN
                  </span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>
              )}

              {/* Password / PIN Form */}
              <form onSubmit={handlePasswordSignIn} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/70 border border-zinc-800 focus:border-emerald-400 focus:outline-none text-sm text-white placeholder-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Password or PIN
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter password or 4+ digit PIN"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/70 border border-zinc-800 focus:border-emerald-400 focus:outline-none text-sm text-white placeholder-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Offer Face ID enrollment if device supports it and not yet enabled */}
                {biometricSupported && !canDirectFaceId && (
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableFaceIdOnLogin}
                      onChange={(e) => setEnableFaceIdOnLogin(e.target.checked)}
                      className="rounded accent-emerald-500 w-4 h-4"
                    />
                    <FaceIdIcon size={16} className="text-emerald-400 shrink-0" />
                    <span className="text-xs text-zinc-200 font-medium">
                      Enable <strong>Face ID</strong> for 1-tap login next time
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                    canDirectFaceId
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                      : 'bg-white hover:bg-zinc-200 text-black'
                  }`}
                >
                  <LogIn size={16} />
                  <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                </button>
              </form>

              {/* Footer Switch to Signup */}
              <div className="pt-2 border-t border-zinc-800/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setStatusMsg('');
                    setMode('signup');
                  }}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>New user? Create your own account</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Flavio"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/70 border border-zinc-800 focus:border-emerald-400 focus:outline-none text-sm text-white placeholder-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="e.g. flavio"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/70 border border-zinc-800 focus:border-emerald-400 focus:outline-none text-sm text-white placeholder-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Password or PIN (4+ characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a password or 4-digit PIN"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/70 border border-zinc-800 focus:border-emerald-400 focus:outline-none text-sm text-white placeholder-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
                  <Sparkles size={12} /> Your Financial Objective (Optional)
                </label>
                <input
                  type="text"
                  value={signupGoal}
                  onChange={(e) => setSignupGoal(e.target.value)}
                  placeholder="e.g. Save $15k for a house & pay off debt"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/70 border border-zinc-800 focus:border-emerald-400 focus:outline-none text-xs text-white placeholder-zinc-600"
                />
              </div>

              {biometricSupported && (
                <label className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableFaceIdOnSignup}
                    onChange={(e) => setEnableFaceIdOnSignup(e.target.checked)}
                    className="rounded accent-emerald-500 w-4 h-4 shrink-0"
                  />
                  <FaceIdIcon size={20} className="text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block">
                      Enable Face ID Unlock
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      Sign in with a glance every time you open the app
                    </span>
                  </div>
                </label>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg"
              >
                <Lock size={16} />
                <span>
                  {loading
                    ? 'Setting Up Vault...'
                    : biometricSupported && enableFaceIdOnSignup
                    ? 'Create Account & Enable Face ID'
                    : 'Create Account & Continue'}
                </span>
              </button>

              {users.length > 0 && (
                <div className="pt-2 border-t border-zinc-800/80 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setStatusMsg('');
                      setMode('login');
                    }}
                    className="text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    &larr; Back to Sign In
                  </button>
                </div>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
