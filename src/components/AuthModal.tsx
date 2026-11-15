import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, Mail, User as UserIcon, X } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { BrandMark } from './BrandMark';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        await sendEmailVerification(cred.user).catch(() => {});
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('operation-not-allowed')) {
        setError(
          'Email/Password provider is not enabled yet in Firebase Console -> Authentication -> Sign-in method. Please use Google Sign-In or enable Email/Password in Firebase Console.',
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className="glass-surface w-full max-w-md rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandMark size={38} />
                <div>
                  <h2 className="font-display text-lg font-bold text-white">
                    D&apos;s platforms — DATA ENGINEER 360
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sync progress, SM-2 queue, Live Mock Scorecards &amp; Job Tracker
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Close sign in dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn-primary mb-5 flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60"
            >
              <span>Continue with Google</span>
            </button>

            <div className="mb-5 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-[var(--border-subtle)]" />
              <span>or use email</span>
              <div className="h-px flex-1 bg-[var(--border-subtle)]" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {mode === 'signup' && (
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="inset-surface w-full rounded-xl py-2.5 pr-3 pl-9 text-sm text-white placeholder-slate-500 outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="inset-surface w-full rounded-xl py-2.5 pr-3 pl-9 text-sm text-white placeholder-slate-500 outline-none focus:border-[var(--border-strong)]"
                />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="inset-surface w-full rounded-xl py-2.5 pr-3 pl-9 text-sm text-white placeholder-slate-500 outline-none focus:border-[var(--border-strong)]"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-inset)] px-3 py-2 text-xs text-white">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-secondary w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
              >
                {loading ? 'Authenticating...' : mode === 'signin' ? 'Sign In with Email' : 'Create Account'}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-slate-400">
              {mode === 'signin' ? (
                <button onClick={() => setMode('signup')} className="hover:text-white hover:underline">
                  Need an account? Sign up
                </button>
              ) : (
                <button onClick={() => setMode('signin')} className="hover:text-white hover:underline">
                  Already registered? Sign in
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
